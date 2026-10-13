"""
LM Studio service — connects to locally running medicus model
via OpenAI-compatible API to generate context-aware clinical
follow-up questions for the citizen intake form.
"""
import os
import re
import json
import logging
import httpx
from typing import List, Optional, Dict, Any

logger = logging.getLogger(__name__)

# Priority candidate URLs: explicit environment variable (EC2/dev stage) takes top priority,
# followed by Docker host gateway and local discovery for LM Studio.
def _get_base_urls() -> List[str]:
    env_urls = [
        (os.getenv("MEDICUS_API_URL") or "").strip(),
        (os.getenv("LM_STUDIO_BASE_URL") or "").strip(),
        (os.getenv("LM_STUDIO_BASE_URL_DOCKER") or "").strip(),
    ]
    candidates = [u for u in env_urls if u]

    # Local fallback candidates (for LM Studio / Docker / WSL / local ports)
    candidates.extend([
        "http://host.docker.internal:1234/v1",
        "http://127.0.0.1:8000/v1",
        "http://localhost:8000/v1",
        "http://127.0.0.1:11434/v1",
        "http://localhost:11434/v1",
        "http://127.0.0.1:1234/v1",
        "http://localhost:1234/v1",
        "http://172.19.16.1:1234/v1",
        "http://172.20.160.1:1234/v1",
        "http://192.168.65.254:1234/v1",
    ])
    try:
        with open("/proc/net/route") as f:
            for line in f.readlines()[1:]:
                fields = line.strip().split()
                if fields[1] == "00000000":
                    import struct, socket
                    gw = socket.inet_ntoa(struct.pack("<L", int(fields[2], 16)))
                    candidates.append(f"http://{gw}:1234/v1")
                    break
    except Exception:
        pass

    seen = set()
    result = []
    for c in candidates:
        if c and c not in seen:
            seen.add(c)
            result.append(c)
    return result

_BASE_URLS = _get_base_urls()
_API_KEY = os.getenv("MEDICUS_API_KEY") or os.getenv("LM_STUDIO_API_KEY", "")
_MODEL = os.getenv("MEDICUS_MODEL") or os.getenv("LM_STUDIO_MODEL", "medicus")

# ---------------------------------------------------------------------------
# SYSTEM PROMPT — direct clinical instructions without placeholder brackets
# ---------------------------------------------------------------------------
_SYSTEM_PROMPT = """Olet kokenut suomalainen terveyskeskuslääkäri. Laadi potilaalle 2–3 tarkentavaa kliinistä kysymystä SUOMEKSI hänen oireidensa perusteella.

SÄÄNNÖT:
1. Kysymysten TÄYTYY liittyä juuri potilaan ilmoittamiin oireisiin. Älä kysy irrallisia oireita muista elimistä.
2. q1: mittaa oireen tai kivun voimakkuutta (asteikko 1-10). Sovita kysymysteksti kuvattuun oireeseen.
3. q2: turvakysymys (red flag) — kysy juuri tälle vaivalle tyypillisistä vaaranmerkeistä:
   - Virtsatieoireet: kuume (yli 38°C), selkä-/kylkikipu tai vilunväristykset (munuaisaltaan tulehdus).
   - Selkäkipu: virtsaamisvaikeus, ulosteenpidätyskyvyttömyys, nivusalueen tai alaraajojen puutuminen.
   - Hengitystie / kurkkukipu: hengenahdistus, nielemisvaikeus tai korkea kuume.
   - Rintakipu: säteily vasempaan käteen/leukaan, hengenahdistus tai kylmä hiki.
4. q3 (valinnainen): oireen kehittyminen tai kesto (esim. pahentunut / pysynyt samana).
5. Vaihtoehdoissa oltava aina "color"-kenttä: green/yellow/orange/red.
6. Palauta VAIN kelvollinen JSON-objekti, ei muuta tekstiä.

ESIMERKKI:
{"questions":[{"id":"q1","type":"pain_scale","badge":"Oireiden voimakkuus","text":"Kuinka paljon oire haittaa vointiasi asteikolla 1–10?","options":[{"value":"1-3","label":"1–3 Lievää","color":"green"},{"value":"4-6","label":"4–6 Selvästi haittaa","color":"yellow"},{"value":"7-9","label":"7–9 Voimakasta","color":"orange"},{"value":"10","label":"10 Sietämätöntä","color":"red"}]},{"id":"q2","type":"red_flag","badge":"Turvakysymys • Vaaranmerkit","text":"Onko sinulla korkeaa kuumetta tai voimakasta yleisvoinnin laskua?","options":[{"value":"no","label":"Ei vaaranmerkkejä","color":"green"},{"value":"mild","label":"Lievää lämpöilyä","color":"yellow"},{"value":"yes","label":"Kyllä, voimakasta oireilua","color":"red"}],"red_flag_alert":"Voimakkaat yleisoireet vaativat välitöntä hoitoarviota."}],"triage_hint":"Kliininen oirekartoitus"}"""

# ---------------------------------------------------------------------------
# VALIDATION & SANITIZATION — per-question validation to keep good LLM outputs
# ---------------------------------------------------------------------------
_PLACEHOLDER_PATTERNS = [
    r"kysymys tässä",
    r"oireessa on tärkeä kliininen punainen lippu",
    r"mitä arvioit kipua koskevan",
    r"lyhyt sisäinen kliininen huomio",
    r"kirjoita tähän oirekuvaan",
    r"triage_hint.*potilaalle",
    r"\[badge\]",
    r"\[kysymys\]",
    r"\[ei-vaihtoehto\]",
    r"\[lievästi\]",
    r"\[kyllä-vaihtoehto\]",
    r"\[varoitus",
    r"\[oirekohtainen",
    r"\[lyhyt",
]

def _options_valid(options: list) -> bool:
    """Check that options list is valid and has meaningful labels."""
    if not options or not isinstance(options, list):
        return False
    for opt in options:
        if not isinstance(opt, dict):
            return False
        label = (opt.get("label") or "").strip()
        if not label or len(label) < 2:
            return False
        if label.startswith("[") and label.endswith("]"):
            return False
    return True

# Verbatim templates to reject
_TEMPLATE_EXACT_TEXTS = [
    "kuinka paljon oire haittaa vointiasi asteikolla 1–10",
    "onko sinulla korkeaa kuumetta tai voimakasta yleisvoinnin laskua",
    "liittyykö oireeseen hengenahdistusta, säteilykipua tai äkillistä pahenemista",
    "mitä tulee tehdä",
]

def _is_valid_single_question(q: Dict[str, Any], symptom_text: str) -> bool:
    """Validate a single question from LLM output."""
    text = (q.get("text") or "").strip()
    badge = (q.get("badge") or "").strip()

    if not text or len(text) < 12:
        return False

    lower_text = text.lower()
    lower_badge = badge.lower()

    # Accept valid clinical questions from Medicus model

    # Reject gibberish / mixed-case artifacts (e.g. "haSTEVA")
    if re.search(r'[a-zäöå][A-Z]{3,}', text):
        return False

    # Reject asking patient to decide doctor's treatment
    if any(w in lower_text for w in ["mitä tulee tehdä", "lomautus lääkkeistä", "uusi resepti", "hoitomenetelmä"]):
        return False

    # Check for bracket placeholders
    for pattern in _PLACEHOLDER_PATTERNS:
        if re.search(pattern, lower_text) or re.search(pattern, lower_badge):
            return False

    # Check options validity
    options = q.get("options") or []
    if not _options_valid(options):
        return False

    # Check for topic mismatch in question text or options
    symptom_lower = (symptom_text or "").lower()
    has_back_context = any(w in symptom_lower for w in ["selkä", "pakara", "ischias", "iskias"])
    has_uti_context = any(w in symptom_lower for w in ["virtsatessa", "virtsatie", "virts", "vessassa", "kirvellä", "samea"])
    has_fever_context = any(w in symptom_lower for w in ["kuume", "kurkku", "särkee", "huono olo", "yskä", "lämpö"])

    opts_text = " ".join((opt.get("label") or "") + " " + str(opt.get("value") or "") for opt in options).lower()

    if has_uti_context and not has_back_context:
        # UTI patient shouldn't get unrelated questions about throat, breathing, heart, or sciatica
        if any(kw in lower_text or kw in opts_text for kw in ["kurkku", "hengenahdistus", "rintakipu", "iskias"]):
            return False

    if has_fever_context and not has_back_context:
        if any(kw in lower_text or kw in opts_text for kw in ["selkäkipu", "nivusalue", "iskias"]):
            return False

    # Sanitize red_flag_alert if model hallucinated unrelated terms
    alert = q.get("red_flag_alert")
    if alert:
        lower_alert = alert.lower()
        if has_uti_context and any(kw in lower_alert for kw in ["hengitys", "rintakipu"]):
            q["red_flag_alert"] = "Korkea kuume tai voimakas kylkikipu voi viitata munuaisaltaan tulehdukseen — ota yhteys päivystykseen (116 117)."

    return True

def _sanitize_and_filter_response(
    result: Dict[str, Any],
    symptom_text: str,
    medications: Optional[List[str]] = None
) -> Optional[Dict[str, Any]]:
    """
    Sanitize and filter questions individually. If LLM produced >= 1 valid questions,
    keep them and supplement from clinical rules up to 3 questions, ensuring
    Medicus AI is successfully utilized.
    """
    raw_questions = result.get("questions", [])
    if not isinstance(raw_questions, list):
        return None

    valid_questions = []
    seen_texts = set()

    for q in raw_questions:
        if not isinstance(q, dict):
            continue
        text = (q.get("text") or "").strip().lower()
        if text in seen_texts:
            continue
        if _is_valid_single_question(q, symptom_text):
            valid_questions.append(dict(q))
            seen_texts.add(text)

    # If we got at least 1 valid question from Medicus, accept and supplement up to 3!
    if len(valid_questions) >= 1:
        # Re-number IDs sequentially
        for idx, q in enumerate(valid_questions):
            q["id"] = f"q{idx + 1}"

        # If less than 3 questions, supplement from clean clinical fallback
        if len(valid_questions) < 3:
            try:
                fallback_data = _rule_based_fallback(symptom_text, medications)
                for fb_q in fallback_data.get("questions", []):
                    fb_text = (fb_q.get("text") or "").strip().lower()
                    if fb_text not in seen_texts:
                        fb_q_copy = dict(fb_q)
                        fb_q_copy["id"] = f"q{len(valid_questions) + 1}"
                        valid_questions.append(fb_q_copy)
                        seen_texts.add(fb_text)
                        if len(valid_questions) >= 3:
                            break
            except Exception as e:
                logger.warning(f"Error supplementing questions: {e}")

        # Limit to 4 questions max
        valid_questions = valid_questions[:4]

        return {
            "questions": valid_questions,
            "triage_hint": result.get("triage_hint") or "Tekoälyavustaja (Medicus AI) — esitietolomake",
            "source": "lm_studio_medicus"
        }

    return None


def _repair_and_parse_json(content: str) -> Optional[Dict[str, Any]]:
    """Clean and repair common LLM JSON syntax anomalies, extracting question objects."""
    s = content.strip()

    # Extract block inside ```json ... ``` or outermost { ... }
    m = re.search(r'```(?:json)?\s*(\{[\s\S]*?\})\s*```', s)
    if m:
        s = m.group(1).strip()
    else:
        start = s.find('{')
        end = s.rfind('}')
        if start != -1 and end > start:
            s = s[start:end+1].strip()

    # 1. Try direct parse
    try:
        obj = json.loads(s)
        if isinstance(obj, dict) and "questions" in obj and len(obj["questions"]) >= 1:
            return obj
    except Exception:
        pass

    # 2. Fix trailing commas and double curly braces (common in Gemma-2 outputs)
    s_fixed = re.sub(r'\]\s*\}\s*\}', ']}', s)
    s_fixed = re.sub(r'\]\s*\}\s*,', ']},', s_fixed)
    s_fixed = re.sub(r'\}\s*\]\s*\}\s*,', ']},', s_fixed)
    s_fixed = re.sub(r',\s*([\]\}])', r'\1', s_fixed)
    try:
        obj = json.loads(s_fixed)
        if isinstance(obj, dict) and "questions" in obj and len(obj["questions"]) >= 1:
            return obj
    except Exception:
        pass

    # 3. Robust regex extractor for individual question objects
    q_matches = list(re.finditer(r'\{\s*"id"\s*:\s*"q\d+"', s))
    questions = []
    for m in q_matches:
        start = m.start()
        depth = 0
        end_idx = None
        for idx in range(start, len(s)):
            if s[idx] == '{':
                depth += 1
            elif s[idx] == '}':
                depth -= 1
                if depth == 0:
                    end_idx = idx + 1
                    break
        if end_idx:
            q_chunk = s[start:end_idx]
            q_chunk = re.sub(r',\s*([\]\}])', r'\1', q_chunk)
            try:
                q_obj = json.loads(q_chunk)
                if q_obj.get("text"):
                    opts = q_obj.get("options") or []
                    if not opts:
                        q_obj["options"] = [
                            {"value": "no", "label": "Ei oiretta", "color": "green"},
                            {"value": "mild", "label": "Lievänä", "color": "yellow"},
                            {"value": "yes", "label": "Kyllä, voimakkaana", "color": "red"}
                        ]
                    questions.append(q_obj)
            except Exception:
                pass

    if len(questions) >= 2:
        return {
            "questions": questions[:6],
            "triage_hint": "Tekoälyavustaja (Medicus AI) — esitietolomake",
            "source": "lm_studio_medicus"
        }

    return None


async def _try_lm_studio(symptom_text: str, medications: List[str] = None) -> Optional[Dict[str, Any]]:
    """Try to reach LM Studio and get AI-generated clinical questions."""
    meds_context = ""
    if medications:
        meds_context = f"\n\nPotilaan Kanta-lääkelista (käytä tietoa tarvittaessa): {', '.join(medications[:5])}"

    user_prompt = (
        f"Potilaan oirekuvaus:\n\"{symptom_text}\"{meds_context}\n\n"
        "Laadi nyt 2–4 kliinistä lisäkysymystä JSON-muodossa tarpeen mukaan (vähintään 2, enintään 4). "
        "Muista: kysymystekstien TÄYTYY viitata juuri näihin oireisiin."
    )

    active_model = (os.getenv("MEDICUS_MODEL") or os.getenv("LM_STUDIO_MODEL") or _MODEL or "medicus").strip()
    payload = {
        "model": active_model,
        "messages": [
            {"role": "system", "content": _SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt}
        ],
        "temperature": 0.1,
        "max_tokens": 800,
        "stream": False
    }

    req_headers = {"Content-Type": "application/json"}
    api_key = (os.getenv("MEDICUS_API_KEY") or os.getenv("LM_STUDIO_API_KEY") or _API_KEY or "").strip()
    if api_key:
        req_headers["Authorization"] = f"Bearer {api_key}"

    base_urls = _get_base_urls()
    for base_url in base_urls:
        try:
            client_timeout = httpx.Timeout(connect=3.0, read=60.0, write=5.0, pool=5.0)
            async with httpx.AsyncClient(timeout=client_timeout) as client:
                response = await client.post(
                    f"{base_url}/chat/completions",
                    json=payload,
                    headers=req_headers
                )
                if response.status_code == 200:
                    data = response.json()
                    raw_content = data["choices"][0]["message"]["content"].strip()
                    logger.info(f"LM Studio raw response ({len(raw_content)} chars): {raw_content[:200]}")
                    parsed = _repair_and_parse_json(raw_content)

                    if not parsed:
                        logger.warning(f"LM Studio JSON repair failed to parse: {raw_content}")
                    else:
                        sanitized = _sanitize_and_filter_response(parsed, symptom_text, medications)
                        if not sanitized:
                            logger.warning(f"LM Studio failed sanitization: {parsed}")
                            break
                        else:
                            logger.info(f"LM Studio (medicus) responded successfully from {base_url} with {len(sanitized.get('questions', []))} questions")
                            return sanitized
                else:
                    logger.warning(f"LM Studio returned {response.status_code} from {base_url}")
        except httpx.TimeoutException:
            logger.warning(f"LM Studio timeout at {base_url}")
        except httpx.ConnectError:
            logger.warning(f"LM Studio unreachable at {base_url}")
        except Exception as e:
            logger.warning(f"LM Studio error: {e}")

    return None


def _rule_based_fallback(symptom_text: str, medications: List[str] = None) -> Dict[str, Any]:
    """
    Deterministic fallback when LM Studio is unavailable or returned bad output.
    Generates 2 to 6 questions dynamically based on clinical necessity:
    - Base: Q1 (severity/pain 1-10) + Q2 (primary red flag)
    - Targeted additions (max 6 total):
      * Throat / hydration issues (swallowing ability)
      * Severe headache + fever (neck stiffness / meningismus check)
      * Cough / respiratory (wheezing / pleuritic pain)
      * Neurological / radiation (leg weakness / sciatica)
      * Medication effect (Burana/Panadol response)
      * Timeline / progression (symptom trend)
    """
    lower = (symptom_text or "").lower()
    med_names = [m.lower() for m in (medications or [])]

    # Detect categories and triggers
    is_back = any(w in lower for w in ["selkä", "pakara", "säteilee", "lanne", "ischias", "iskias", "selkäkipu"])
    is_joint = any(w in lower for w in ["polvi", "lonkka", "nivel", "jalka", "nilkka", "ranne", "olkapää", "väänsin", "turvoksissa"])
    is_cardio = any(w in lower for w in ["rintakipu", "hengenahdistus", "sydän"])
    is_infection = any(w in lower for w in ["kuume", "lämpö", "flunssa", "kurkku", "yskä", "särkee", "huono olo", "heikko", "voimaton"])
    is_neuro = any(w in lower for w in ["puutu", "pistely", "heikkous", "tasapaino", "huimaus"])
    is_bp = any(w in lower for w in ["verenpaine", "heitto", "paine"])
    is_uti = any(w in lower for w in ["virtsatessa", "virtsatie", "virtsatulehdus", "kirvellä", "kirvelee", "vessassa", "samea", "virtsaa", "tihentynyt", "virtsaaminen"])

    has_throat = any(w in lower for w in ["kurkku", "niele", "nielu", "kurkkukipu", "nieleminen"])
    has_headache = any(w in lower for w in ["päänsärky", "päätä", "jyskyttää", "päässä", "särky päässä"])
    has_cough = any(w in lower for w in ["yskä", "yski", "yskää", "keuhko", "limaa"])
    has_med_mention = any(w in lower for w in ["burana", "panadol", "parasetamol", "ibuprofeen", "särkylääke", "lääke"]) or any("burana" in m or "ibuprofeeni" in m for m in med_names)

    # ── Q1: Severity / pain scale (1-10)
    if is_uti:
        q1_text = "Kuinka paljon virtsavaivat haittaavat arkeasi asteikolla 1–10?"
        q1_badge = "Oireiden voimakkuus"
        q1_options = [
            {"value": "1-3", "label": "1–3 Lieviä, pärjään", "color": "green"},
            {"value": "4-6", "label": "4–6 Selvästi haittaa arkea", "color": "yellow"},
            {"value": "7-9", "label": "7–9 Voimakasta kipua ja haittaa", "color": "orange"},
            {"value": "10", "label": "10 Sietämätön kipu", "color": "red"},
        ]
    elif is_infection:
        q1_text = "Kuinka voimakkaaksi arvioisit yleisen olosi ja kuumeen haitan asteikolla 1–10?"
        q1_badge = "Voinnin voimakkuus"
        q1_options = [
            {"value": "1-3", "label": "1–3 Siedettävä", "color": "green"},
            {"value": "4-6", "label": "4–6 Selvästi huono olo", "color": "yellow"},
            {"value": "7-9", "label": "7–9 Todella huono", "color": "orange"},
            {"value": "10", "label": "10 En pärjää kotona", "color": "red"},
        ]
    elif is_back or is_joint:
        q1_text = "Kuinka kovaa kipu on juuri nyt asteikolla 1–10?"
        q1_badge = "Kivun voimakkuus"
        q1_options = [
            {"value": "1-3", "label": "1–3 Lievä", "color": "green"},
            {"value": "4-6", "label": "4–6 Kohtalainen", "color": "yellow"},
            {"value": "7-9", "label": "7–9 Kova", "color": "orange"},
            {"value": "10", "label": "10 Sietämätön", "color": "red"},
        ]
    else:
        q1_text = "Kuinka voimakkaaksi arvioisit vaivasi asteikolla 1–10?"
        q1_badge = "Oireiden voimakkuus"
        q1_options = [
            {"value": "1-3", "label": "1–3 Lievä", "color": "green"},
            {"value": "4-6", "label": "4–6 Kohtalainen", "color": "yellow"},
            {"value": "7-9", "label": "7–9 Kova", "color": "orange"},
            {"value": "10", "label": "10 Sietämätön", "color": "red"},
        ]

    q1 = {
        "id": "q1",
        "type": "pain_scale",
        "badge": q1_badge,
        "text": q1_text,
        "options": q1_options,
    }

    # ── Q2: Core primary red flag question
    if is_uti:
        q2 = {
            "id": "q2",
            "type": "red_flag",
            "badge": "Turvakysymys • Munuaiset",
            "text": "Onko sinulla kuumetta (yli 38°C), vilunväristyksiä tai kipua selässä vyötärön korkeudella?",
            "options": [
                {"value": "no", "label": "Ei kuumetta eikä selkäkipua", "color": "green"},
                {"value": "mild", "label": "Lievää lämpöilyä (alle 38°C)", "color": "yellow"},
                {"value": "yes", "label": "Kyllä, kuumetta tai kylkikipua", "color": "red"},
            ],
            "red_flag_alert": "Kuume + virtsavaivat voi viitata munuaisaltaan tulehdukseen (pyelonefriitti) — ota yhteys päivystykseen.",
        }
    elif is_infection:
        q2 = {
            "id": "q2",
            "type": "red_flag",
            "badge": "Tärkeä turvakysymys • Infektio",
            "text": "Onko sinulla hengenahdistusta tai onko hengittäminen muuttunut raskaaksi tai tiheäksi?",
            "options": [
                {"value": "no", "label": "Ei, hengitän normaalisti", "color": "green"},
                {"value": "mild", "label": "Hengitys on hieman tiheää", "color": "yellow"},
                {"value": "yes", "label": "Kyllä, hengittäminen vaikeutunut", "color": "red"},
            ],
            "red_flag_alert": "Vaikeutunut hengitys kuumeen yhteydessä vaatii päivystysarvion. Soita 116 117.",
        }
    elif is_back:
        q2 = {
            "id": "q2",
            "type": "red_flag",
            "badge": "Tärkeä turvakysymys • Selkäkipu",
            "text": "Onko jalkoihin tai nivusalueelle tullut puutumista, tai onko virtsaaminen muuttunut?",
            "options": [
                {"value": "no", "label": "Ei, kaikki normaalia", "color": "green"},
                {"value": "partial", "label": "Lievää puutumista jaloissa", "color": "yellow"},
                {"value": "yes", "label": "Kyllä, selvästi", "color": "red"},
            ],
            "red_flag_alert": "Nivusalueen puutuminen tai virtsaamisvaikeus selkäkivun yhteydessä voi olla vakava tila — soita 116 117 heti.",
        }
    elif is_joint:
        q2 = {
            "id": "q2",
            "type": "red_flag",
            "badge": "Tärkeä turvakysymys • Liikuntakyky",
            "text": "Pystytkö varaamaan painoa kipeytyneelle jalalle ja kävelemään lyhyen matkan?",
            "options": [
                {"value": "full", "label": "Kyllä, täysin", "color": "green"},
                {"value": "partial", "label": "Vain osittain / kivuliaasti", "color": "yellow"},
                {"value": "none", "label": "En pysty lainkaan", "color": "red"},
            ],
            "red_flag_alert": None,
        }
    elif is_cardio:
        q2 = {
            "id": "q2",
            "type": "red_flag",
            "badge": "Tärkeä turvakysymys • HÄTÄTILANNE",
            "text": "Onko rintakipu pahentunut viimeisen tunnin aikana tai liittyykö siihen hengenahdistusta tai kylmää hikeä?",
            "options": [
                {"value": "no", "label": "Ei, tilanne vakaa", "color": "green"},
                {"value": "yes", "label": "Kyllä, pahenee tai muita oireita", "color": "red"},
            ],
            "red_flag_alert": "Äkillinen rintakipu + hengenahdistus voi olla sydäninfarkti. Soita 112 HETI!",
        }
    elif is_bp:
        q2 = {
            "id": "q2",
            "type": "red_flag",
            "badge": "Tärkeä turvakysymys • Verenpaine",
            "text": "Liittyykö huimaukseen tai verenpaineeseen kovaa päänsärkyä, näköhäiriöitä tai puutumista?",
            "options": [
                {"value": "no", "label": "Ei muita oireita", "color": "green"},
                {"value": "mild", "label": "Lieviä liitännäisoireita", "color": "yellow"},
                {"value": "yes", "label": "Kyllä, selvästi", "color": "red"},
            ],
            "red_flag_alert": "Korkea verenpaine + neurologiset oireet vaatii välitöntä arviota — soita 116 117.",
        }
    elif is_neuro:
        q2 = {
            "id": "q2",
            "type": "red_flag",
            "badge": "Tärkeä turvakysymys • Neurologinen",
            "text": "Tuliko puutuminen tai heikkous äkillisesti (alle tunnissa) vai hitaasti päivien aikana?",
            "options": [
                {"value": "slow", "label": "Kehittynyt hitaasti", "color": "green"},
                {"value": "sudden", "label": "Tuli äkillisesti", "color": "red"},
            ],
            "red_flag_alert": "Äkillinen puutuminen tai lihasheikkous voi viitata aivohalvaukseen — soita 112 heti!",
        }
    else:
        q2 = {
            "id": "q2",
            "type": "red_flag",
            "badge": "Tärkeä turvakysymys",
            "text": "Liittyykö vaivaan kuumetta yli 38°C, hengenahdistusta tai tajunnan muutoksia?",
            "options": [
                {"value": "no", "label": "Ei muita oireita", "color": "green"},
                {"value": "mild", "label": "Lieviä liitännäisoireita", "color": "yellow"},
                {"value": "yes", "label": "Kyllä, selvästi", "color": "red"},
            ],
            "red_flag_alert": None,
        }

    questions = [q1, q2]

    # ── UTI-specific follow-ups
    if is_uti:
        questions.append({
            "id": f"q{len(questions)+1}",
            "type": "multiple_choice",
            "badge": "Virtsan laatu",
            "text": "Onko virtsassasi verta tai onko se erityisen sameaa tai pahanhajuista?",
            "options": [
                {"value": "normal", "label": "Normaalia virtsaa, ei verta", "color": "green"},
                {"value": "cloudy", "label": "Sameaa ja/tai pahanhajuista", "color": "yellow"},
                {"value": "blood", "label": "Virtsassa on verta", "color": "red"},
            ],
            "red_flag_alert": "Verivirtsaisuus vaatii lääkärin arvion.",
        })
        questions.append({
            "id": f"q{len(questions)+1}",
            "type": "multiple_choice",
            "badge": "Aiemmat infektiot",
            "text": "Onko sinulla ollut aiemmin virtsatietulehduksia viimeisen vuoden aikana?",
            "options": [
                {"value": "no", "label": "Ei, tämä on ensimmäinen", "color": "green"},
                {"value": "once", "label": "Kyllä, kerran tai pari", "color": "yellow"},
                {"value": "recurrent", "label": "Kyllä, useamman kerran", "color": "orange"},
            ],
            "red_flag_alert": None,
        })

    # ── Q3..Q6: Dynamic conditional follow-ups (only when clinically indicated, max 6 total)
    # 1. Throat / Swallowing / Hydration risk (tonsillitis, peritonsillar abscess)
    if has_throat and len(questions) < 6:
        questions.append({
            "id": f"q{len(questions)+1}",
            "type": "red_flag",
            "badge": "Nieleminen ja nesteytys",
            "text": "Pystytkö nielemään nesteitä ja huolehtimaan juomisesta kurkkukivusta huolimatta?",
            "options": [
                {"value": "ok", "label": "Kyllä, juominen onnistuu", "color": "green"},
                {"value": "hard", "label": "Vaivoin / nieleminen sattuu kovasti", "color": "yellow"},
                {"value": "cannot_swallow", "label": "En pysty nielemään edes vettä tai sylkeä", "color": "red"},
            ],
            "red_flag_alert": "Kyvyttömyys niellä nesteitä tai sylkeä vaatii välitöntä päivystysarviota (116 117).",
        })

    # 2. Headache + Fever / Infection (rule out meningitis / intracranial pressure)
    if has_headache and is_infection and len(questions) < 6:
        questions.append({
            "id": f"q{len(questions)+1}",
            "type": "red_flag",
            "badge": "Päänsärky ja niskan jäykkyys",
            "text": "Liittyykö päänsärkyyn voimakasta niskan jäykkyyttä (vaikea painaa leukaa rintaan) tai häikäisevää valonarkuutta?",
            "options": [
                {"value": "no", "label": "Ei niskaoireita tai valonarkuutta", "color": "green"},
                {"value": "mild_stiff", "label": "Lievää lihasjännitystä niskassa", "color": "yellow"},
                {"value": "severe_stiff", "label": "Kyllä, leuan painaminen rintaan tekee kipeää", "color": "red"},
            ],
            "red_flag_alert": "Kuume + kova päänsärky + niskajäykkyys vaatii välittömän päivystysarvion — soita 116 117 tai 112!",
        })

    # 3. Cough / Respiratory complications (rule out pneumonia / bronchitis)
    if has_cough and len(questions) < 6:
        questions.append({
            "id": f"q{len(questions)+1}",
            "type": "red_flag",
            "badge": "Yskä ja hengitystiet",
            "text": "Liittyykö yskään hengityksen vinkumista, pistävää rintakipua syvään hengittäessä tai runsasta limaa?",
            "options": [
                {"value": "dry", "label": "Ei, tavallinen kuiva yskä", "color": "green"},
                {"value": "mucus", "label": "Runsaasti limaa / lievää rohinaa", "color": "yellow"},
                {"value": "sharp_pain", "label": "Kyllä, pistävää kipua tai vinkunaa", "color": "red"},
            ],
            "red_flag_alert": "Pistävä rintakipu kuumeen yhteydessä voi viitata keuhkokuumeeseen — ota yhteys päivystykseen.",
        })

    # 4. Medication efficacy check (Burana / Panadol)
    if has_med_mention and len(questions) < 6:
        questions.append({
            "id": f"q{len(questions)+1}",
            "type": "medication",
            "badge": "Lääkityksen teho",
            "text": "Miten ottamasi kuume- tai särkylääke (kuten Burana tai Panadol) on vaikuttanut vointiisi?",
            "options": [
                {"value": "helped", "label": "Laski lämpöä ja helpotti oloa", "color": "green"},
                {"value": "little", "label": "Laski vain vähän / olo edelleen heikko", "color": "yellow"},
                {"value": "none", "label": "Ei ole auttanut lainkaan", "color": "orange"},
                {"value": "not_taken", "label": "En ole vielä ottanut lääkettä", "color": "yellow"},
            ],
            "red_flag_alert": None,
        })

    # 5. Symptom trend / duration (if only 2 questions so far, provide general timeline)
    if len(questions) < 3:
        questions.append({
            "id": f"q{len(questions)+1}",
            "type": "duration",
            "badge": "Oireiden kehitys",
            "text": "Mihin suuntaan vointisi on kehittynyt viimeisen vuorokauden aikana?",
            "options": [
                {"value": "improving", "label": "Olo on alkanut hieman helpottaa", "color": "green"},
                {"value": "stable", "label": "Pysynyt suurin piirtein samana", "color": "yellow"},
                {"value": "worsening", "label": "Olo huononee jatkuvasti", "color": "red"},
            ],
            "red_flag_alert": None,
        })

    # Ensure strictly capped at 6
    questions = questions[:6]

    triage_hint = (
        f"Virtsatieoireiden kliininen arvio ({len(questions)} kysymystä)" if is_uti else
        f"Kattava infektio- ja turvallisuusseulonta suoritettu ({len(questions)} kysymystä)" if is_infection else
        f"Selkäkivun ja neurologisten oireiden seulonta ({len(questions)} kysymystä)" if is_back else
        f"Liikuntakyvyn ja vamman kliininen seulonta ({len(questions)} kysymystä)" if is_joint else
        f"Kardiologinen hätätilanteen arviointi ({len(questions)} kysymystä)" if is_cardio else
        f"Neurologinen oirekartoitus ({len(questions)} kysymystä)" if is_neuro else
        f"Kliininen oirekartoitus ({len(questions)} kysymystä)"
    )

    return {"questions": questions, "triage_hint": triage_hint, "source": "rule_engine"}


async def get_clinical_questions(
    symptom_text: str,
    medications: List[str] = None,
    language: str = "fi"
) -> Dict[str, Any]:
    """
    Primary entry point:
    1. Check for official LUVN validated protocol (Alaselkäkysely, GAD-7, PHQ-9, AUDIT, Fagerström)
    2. Try LM Studio (medicus) — validates quality before accepting
    3. Fall back to rule-based engine if LM Studio is unavailable or returns bad output
    """
    if not symptom_text or len(symptom_text.strip()) < 5:
        return _rule_based_fallback("oireita ei kuvattu", medications)

    # 1. ALWAYS TRY LM STUDIO (medicus) FIRST
    result = await _try_lm_studio(symptom_text, medications)
    if result:
        result["source"] = "lm_studio_medicus"
        return result

    # 2. Fallback to official LUVN clinical protocols if matched
    try:
        from .luvn_forms import luvn_forms_registry
        matched_key = luvn_forms_registry.match_symptom(symptom_text)
        if matched_key:
            protocol_payload = luvn_forms_registry.get_protocol_payload(matched_key, language=language)
            if protocol_payload:
                protocol_payload["source"] = "luvn_official_protocol"
                logger.info(f"Matched official LUVN intake protocol: {matched_key}")
                return protocol_payload
    except Exception as e:
        logger.warning(f"Error checking LUVN forms registry: {e}")

    # 3. Fallback to rule engine
    logger.info("Using rule-based fallback for clinical questions")
    return _rule_based_fallback(symptom_text, medications)


# ---------------------------------------------------------------------------
# GENERATE DOCTOR ANAMNESIS
# ---------------------------------------------------------------------------
_ANAMNESIS_SYSTEM_PROMPT = """Olet kokenut lääketieteellinen kirjaamisasiantuntija. Kirjoitat potilaasta lyhyen kliinisen esitietotiivistelmän kolmannessa persoonassa lääkärille luettavaksi.

Säännöt:
- Kirjoita 3–5 kappaletta, yhteensä 100–250 sanaa.
- Käytä kolmatta persoonaa: "Potilas hakeutuu...", "Hän kuvaa...", "Oirekuvaan liittyy..."
- Kirjoita selkeällä kliinisellä suomella, lyhyesti ja ammattimaisesti.
- ÄLÄ toista potilaan sanoja suoraan — muotoile faktat kliinisiksi havainnoiksi.
- ÄLÄ keksi tietoja joita ei ole annettu.
- ÄLÄ kirjoita otsikoita, listoja tai suosituksia — pelkkää juoksevaa tekstiä.
- Palauta VAIN anamneesin teksti. Ei tervehdyksiä, ei selityksiä."""


async def generate_doctor_anamnesis(
    reason_for_visit: str,
    symptom_duration: Optional[str],
    pain_scale: Optional[int],
    triage_answers: List[Dict[str, Any]],
    medications: List[str],
    allergies: List[str],
    diagnoses: List[str],
    patient_age: Optional[int],
) -> str:
    """
    Generate a concise clinical anamnesis text for the doctor view,
    powered by medicus model with deterministic fallback.
    """
    # Build structured input
    triage_text = "\n".join(
        f"- {t.get('badge', '')}: {t.get('answer_label', '')}"
        for t in triage_answers
    ) or "Ei triage-vastauksia."

    meds_text = ", ".join(medications) if medications else "Ei säännöllistä lääkitystä"
    allergies_text = ", ".join(allergies) if allergies else "Ei tunnettuja allergioita"
    diagnoses_text = ", ".join(diagnoses) if diagnoses else "Ei kirjattuja diagnooseja"

    user_content = f"""Potilaan tiedot:
Ikä: {patient_age or 'Ei tiedossa'} v
Tulosyy: {reason_for_visit}
Oireiden kesto: {symptom_duration or 'Ei tiedossa'}
Kipuasteikko: {pain_scale if pain_scale is not None else 'Ei arvioitu'}/10

Triage-seulonta:
{triage_text}

Lääkitys: {meds_text}
Allergiat: {allergies_text}
Diagnoosit kannassa: {diagnoses_text}

Laadi kliininen anamneesi."""

    # Always build the deterministic note — it's clean and based only on submitted data.
    # The local medicus model consistently hallucinates clinical details, so we skip it
    # for anamnesis generation and rely on the structured builder instead.
    logger.info("[anamnesis] Using deterministic clinical builder (medicus skipped for accuracy)")
    return _build_fallback_anamnesis(
        reason_for_visit, symptom_duration, pain_scale,
        triage_answers, medications, allergies, diagnoses, patient_age
    )






def _build_fallback_anamnesis(
    reason_for_visit: str,
    symptom_duration: Optional[str],
    pain_scale: Optional[int],
    triage_answers: List[Dict[str, Any]],
    medications: List[str],
    allergies: List[str],
    diagnoses: List[str],
    patient_age: Optional[int],
) -> str:
    """Deterministic clinical-style anamnesis that always produces clean Finnish output."""
    age_str = f"{patient_age}-vuotias" if patient_age else "iältään ei kirjattu"
    duration_str = symptom_duration or "lyhyen ajan"

    # Clean casual patient language from reason_for_visit
    reason_clean = reason_for_visit.strip().rstrip(".")
    # Remove common casual Finnish openings
    for opener in ["Moi! ", "Moi, ", "Hei! ", "Hei, ", "Moi ", "Hei "]:
        if reason_clean.startswith(opener):
            reason_clean = reason_clean[len(opener):]
            break
    # Capitalize first letter
    reason_clean = reason_clean[0].upper() + reason_clean[1:] if reason_clean else reason_clean

    # Opening: why patient is here
    para1 = (
        f"Potilas ({age_str}) hakeutuu vastaanotolle {duration_str} jatkuneiden oireiden vuoksi. "
        f"Pääasiallisena vaivana potilas kuvaa: {reason_clean}."
    )

    # Triage answers summary
    triage_parts = []
    for ta in triage_answers:
        badge = ta.get("badge", "")
        label = ta.get("answer_label", "")
        if badge and label:
            triage_parts.append(f"{badge.lower()}: {label.lower()}")

    if triage_parts:
        triage_str = "; ".join(triage_parts)
        para2 = (
            f"Esitietotriagessa potilas ilmoittaa seuraavaa: {triage_str}."
        )
    else:
        para2 = "Esitietotriagea ei ole tallennettu tähän esitietoon."

    # Pain scale
    if pain_scale is not None:
        if pain_scale <= 3:
            pain_qualifier = "lievänä (NRS {}/10)".format(pain_scale)
        elif pain_scale <= 6:
            pain_qualifier = "kohtalaisena (NRS {}/10)".format(pain_scale)
        elif pain_scale <= 8:
            pain_qualifier = "voimakkaana (NRS {}/10)".format(pain_scale)
        else:
            pain_qualifier = "erittäin voimakkaana (NRS {}/10), potilas kokee kotiselviytymisen vaikeaksi".format(pain_scale)
        para3 = f"Potilas arvioi yleisen vointinsa ja oiretaakkansa {pain_qualifier}."
    else:
        para3 = ""

    # Medications
    if medications:
        meds_str = ", ".join(medications)
        para4 = f"Käytössä oleva lääkitys: {meds_str}."
    else:
        para4 = "Säännöllistä lääkitystä ei ilmoitettu."

    # Allergies
    if allergies:
        allergy_str = ", ".join(allergies)
        para5 = f"Tiedossa olevat allergiat ja yliherkkyyksiä: {allergy_str}."
    else:
        para5 = "Potilas ei raportoi tunnettuja lääkeaineallergioita."

    parts = [para1, para2]
    if para3:
        parts.append(para3)
    parts.extend([para4, para5])

    return " ".join(parts)
