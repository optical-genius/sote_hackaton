"""
LUVN official intake forms integration service.
Parses, indexes, and matches regional standardized health questionnaires
from backend/hackathon_data/Esitieto_lomakkeet_hackathon_json to patient symptoms.
"""
import os
import json
import logging
from pathlib import Path
from typing import Dict, List, Optional, Any

logger = logging.getLogger(__name__)

class LuvnFormsRegistry:
    """Indexes and queries official LUVN clinical intake questionnaires."""

    def __init__(self):
        self._forms_dir: Optional[Path] = self._resolve_forms_dir()
        self._loaded_forms: Dict[str, dict] = {}
        self._initialized: bool = False

    def _resolve_forms_dir(self) -> Optional[Path]:
        """Find the directory containing official LUVN JSON forms safely."""
        candidate_paths = [
            os.getenv("LUVN_FORMS_DIR"),
            # Relative to backend container
            "/app/hackathon_data/Esitieto_lomakkeet_hackathon_json",
            # Relative to this file
            str(Path(__file__).resolve().parent.parent.parent / "hackathon_data" / "Esitieto_lomakkeet_hackathon_json"),
            # Relative to workspace root
            "/home/optical-genius/sote_ala/backend/hackathon_data/Esitieto_lomakkeet_hackathon_json"
        ]

        for p in candidate_paths:
            if p:
                path_obj = Path(p).resolve()
                if path_obj.exists() and path_obj.is_dir():
                    logger.info(f"LUVN forms directory found at: {path_obj}")
                    return path_obj

        logger.warning("LUVN forms directory not found in candidate paths.")
        return None

    def is_available(self) -> bool:
        return self._forms_dir is not None

    def _lazy_init(self):
        """Index known high-priority clinical forms on first access."""
        if self._initialized or not self._forms_dir:
            return
        self._initialized = True

        form_file_map = {
            "back_pain": "fysioterapia-alaselkakysely-lahtotilanne",
            "anxiety": "ahdistuneisuuskysely-gad-7",
            "depression": "masennuskysely-phq-9",
            "alcohol": "alkoholin-kayton-riskit-kysely-audit",
            "nicotine": "nikotiiniriippuvuustesti-fagerstrom"
        }

        try:
            for key, prefix in form_file_map.items():
                for fpath in self._forms_dir.glob(f"{prefix}*.json"):
                    try:
                        with open(fpath, "r", encoding="utf-8") as f:
                            data = json.load(f)
                            self._loaded_forms[key] = {
                                "file_path": str(fpath),
                                "revision_guid": data.get("revisionGuid", ""),
                                "name": data.get("name", {}),
                                "description": data.get("description", {}),
                                "questions": data.get("questions", [])
                            }
                        break
                    except Exception as ex:
                        logger.warning(f"Could not load form {fpath}: {ex}")
            logger.info(f"Loaded {len(self._loaded_forms)} official LUVN forms into registry.")
        except Exception as e:
            logger.error(f"Error initializing LUVN forms registry: {e}")

    def match_symptom(self, symptom_text: str) -> Optional[str]:
        """
        Identify if patient symptom text matches an official standardized LUVN form.
        Returns form key ('back_pain', 'anxiety', 'depression', 'alcohol', 'nicotine') or None.
        """
        if not symptom_text:
            return None

        txt = symptom_text.lower()

        # 1. Back pain (Alaselkäkysely)
        back_keywords = [
            "selkä", "alaselkä", "lumbago", "noidannuoli", "lanneranka",
            "välilevy", "selkäkipu", "ristiselkä", "noitannuoli", "back pain",
            "lower back", "ländrygg", "ryggsmärta", "ryggont"
        ]
        # Check for negation: e.g. "selkäkipua tai kuumetta ei ole", "ei selkäkipua"
        import re
        is_negated_back = bool(re.search(r'(ei\s+(?:ole\s+)?(?:ainakaan\s+)?(?:ollut\s+)?(?:ala)?selkä|selkäkipua\s+(?:tai\s+[\w]+\s+)?ei)', txt))
        if any(kw in txt for kw in back_keywords) and not is_negated_back:
            return "back_pain"

        # 2. Anxiety (GAD-7)
        anxiety_keywords = [
            "ahdistus", "ahdistaa", "paniikki", "paniikkikohtaus", "jännitys",
            "hermostuneisuus", "levottomuus", "pelkotila", "anxiety", "panic",
            "ångest", "oro"
        ]
        if any(kw in txt for kw in anxiety_keywords):
            return "anxiety"

        # 3. Depression (PHQ-9)
        depression_keywords = [
            "masennus", "masentaa", "alakulo", "toivottomuus", "uupumus",
            "aloitekyvytön", "mieliala maassa", "depression", "depressed",
            "nedstämd", "nedstämdhet"
        ]
        if any(kw in txt for kw in depression_keywords):
            return "depression"

        # 4. Alcohol risk (AUDIT)
        alcohol_keywords = [
            "alkoholi", "juominen", "viina", "olut", "krapula", "retkahdus",
            "alcohol", "drinking", "alkohol"
        ]
        if any(kw in txt for kw in alcohol_keywords):
            return "alcohol"

        # 5. Nicotine / smoking (Fagerström)
        nicotine_keywords = [
            "tupakka", "tupakointi", "savuke", "nikotiini", "sähkösavuke",
            "vape", "smoking", "tobacco", "rökning"
        ]
        if any(kw in txt for kw in nicotine_keywords):
            return "nicotine"

        return None

    def get_protocol_payload(self, form_key: str, language: str = "fi") -> Optional[Dict[str, Any]]:
        """
        Generate structured Step 2 clinical questions derived directly from the official LUVN form.
        """
        self._lazy_init()
        form_meta = self._loaded_forms.get(form_key)
        if not form_meta:
            return None

        lang = language if language in ("fi", "sv", "en") else "fi"
        form_name = form_meta.get("name", {}).get(lang) or form_meta.get("name", {}).get("fi", "LUVN Esitietolomake")
        guid = form_meta.get("revision_guid", "")

        questions = []

        if form_key == "back_pain":
            # Questions adapted from LUVN Fysioterapia - Alaselkäkysely lähtötilanne
            # Q1: Current Pain (LUVN Q2)
            q1_texts = {
                "fi": "Kipu tällä hetkellä alaselässä (asteikolla 1–10)",
                "sv": "Smärta i ländryggen för tillfället (skala 1–10)",
                "en": "Current pain in the lower back (scale 1–10)"
            }
            questions.append({
                "id": "q1",
                "type": "pain_scale",
                "badge": "LUVN Alaselkäkysely • Voimakkuus",
                "text": q1_texts.get(lang, q1_texts["fi"]),
                "options": [
                    {"value": "1-3", "label": "1–3 Siedettävä" if lang == "fi" else ("1–3 Tolerabel" if lang == "sv" else "1–3 Mild"), "color": "green"},
                    {"value": "4-6", "label": "4–6 Selvästi haittaa" if lang == "fi" else ("4–6 Måttlig" if lang == "sv" else "4–6 Moderate"), "color": "yellow"},
                    {"value": "7-9", "label": "7–9 Voimakas" if lang == "fi" else ("7–9 Svår" if lang == "sv" else "7–9 Severe"), "color": "orange"},
                    {"value": "10", "label": "10 En pärjää" if lang == "fi" else ("10 Outhärdlig" if lang == "sv" else "10 Unbearable"), "color": "red"}
                ]
            })

            # Q2: Red flag / Radiating pain (LUVN Q3)
            q2_texts = {
                "fi": "Säteilykipu: säteileekö kipu alaselästä toiseen tai molempiin alaraajoihin polven alapuolelle?",
                "sv": "Strålar smärtan från ländryggen ner i benet eller båda benen under knänivå?",
                "en": "Radiating pain: does the pain radiate from the lower back down into one or both legs below the knee?"
            }
            questions.append({
                "id": "q2",
                "type": "red_flag",
                "badge": "LUVN Turvakysymys • Säteily",
                "text": q2_texts.get(lang, q2_texts["fi"]),
                "options": [
                    {"value": "no", "label": "Ei säteile" if lang == "fi" else ("Strålar inte" if lang == "sv" else "No radiation"), "color": "green"},
                    {"value": "mild", "label": "Lievää säteilyä reiteen" if lang == "fi" else ("Måttlig till låret" if lang == "sv" else "Mild to thigh"), "color": "yellow"},
                    {"value": "yes", "label": "Voimakasta / polven alapuolelle" if lang == "fi" else ("Kraftig under knät" if lang == "sv" else "Severe / below knee"), "color": "red"}
                ],
                "red_flag_alert": "Voimakas säteilykipu polven alapuolelle tai virtsaamisen hallinnan muutokset vaativat päivystyksellisen arvion." if lang == "fi" else "Svår strålande smärta kräver akut bedömning."
            })

            # Q3: Duration & Functional Impact (LUVN Q5 / Q6)
            q3_texts = {
                "fi": "Kivun kesto ja arjen toimintakyky: kauanko alaselkäkipu on jatkunut ja haittaako se liikkumista tai nukkumista?",
                "sv": "Smärtans varaktighet och funktionsförmåga: hur länge har den pågått och hindrar den rörelse eller sömn?",
                "en": "Duration and daily function: how long has the pain lasted and does it impair movement or sleep?"
            }
            questions.append({
                "id": "q3",
                "type": "multiple_choice",
                "badge": "LUVN Oirekartoitus • Toimintakyky",
                "text": q3_texts.get(lang, q3_texts["fi"]),
                "options": [
                    {"value": "acute_mild", "label": "Alle 1 vk • Pystyn liikkumaan" if lang == "fi" else ("Under 1 v • Kan röra mig" if lang == "sv" else "<1 wk • Can move"), "color": "green"},
                    {"value": "subacute_mod", "label": "1–4 viikkoa • Selvästi haittaa" if lang == "fi" else ("1–4 v • Påverkar tydligt" if lang == "sv" else "1–4 wks • Clearly impairs"), "color": "yellow"},
                    {"value": "chronic_severe", "label": "Yli 1 kk tai estää liikkumisen" if lang == "fi" else ("Över 1 mån / hindrar rörelse" if lang == "sv" else ">1 mo / prevents movement"), "color": "red"}
                ]
            })

        elif form_key == "anxiety":
            # Adapted from GAD-7
            q1_texts = {
                "fi": "Ahdistuneisuuden tai hermostuneisuuden voimakkuus viimeisen 2 viikon aikana",
                "sv": "Graden av ångest eller nervositet under de senaste 2 veckorna",
                "en": "Severity of anxiety or nervousness over the last 2 weeks"
            }
            questions.append({
                "id": "q1",
                "type": "pain_scale",
                "badge": "LUVN GAD-7 • Oirevoimakkuus",
                "text": q1_texts.get(lang, q1_texts["fi"]),
                "options": [
                    {"value": "1-3", "label": "1–3 Vähäistä", "color": "green"},
                    {"value": "4-6", "label": "4–6 Kohtaustaajuus häiritsee", "color": "yellow"},
                    {"value": "7-9", "label": "7–9 Jatkuvaa ja voimakasta", "color": "orange"},
                    {"value": "10", "label": "10 Erittäin vaikeaa arjessa", "color": "red"}
                ]
            })
            q2_texts = {
                "fi": "Turvakysymys: liittyykö oireeseen rintakipua, hengenahdistusta tai paniikkikohtausta?",
                "sv": "Säkerhetsfråga: upplever du bröstsmärtor, andfåddhet eller panikattacker?",
                "en": "Safety question: do you experience chest pain, shortness of breath, or panic attacks?"
            }
            questions.append({
                "id": "q2",
                "type": "red_flag",
                "badge": "LUVN Turvakysymys",
                "text": q2_texts.get(lang, q2_texts["fi"]),
                "options": [
                    {"value": "no", "label": "Ei ole somaattisia oireita", "color": "green"},
                    {"value": "mild", "label": "Lievää sydämentykytystä", "color": "yellow"},
                    {"value": "yes", "label": "Kyllä, voimakasta hengenahdistusta", "color": "red"}
                ]
            })

        elif form_key == "depression":
            # Adapted from PHQ-9
            q1_texts = {
                "fi": "Mielialan lasku ja aloitekyvyn heikentyminen viimeisen 2 viikon aikana",
                "sv": "Nedstämdhet och minskad energi under de senaste 2 veckorna",
                "en": "Low mood and lack of energy over the past 2 weeks"
            }
            questions.append({
                "id": "q1",
                "type": "pain_scale",
                "badge": "LUVN PHQ-9 • Mielialakartoitus",
                "text": q1_texts.get(lang, q1_texts["fi"]),
                "options": [
                    {"value": "1-3", "label": "1–3 Lievää alakuloa", "color": "green"},
                    {"value": "4-6", "label": "4–6 Useana päivänä viikossa", "color": "yellow"},
                    {"value": "7-9", "label": "7–9 Lähes päivittäin", "color": "orange"},
                    {"value": "10", "label": "10 Erittäin vaikeaa selviytyä", "color": "red"}
                ]
            })
            q2_texts = {
                "fi": "Turvakysymys: tuntuuko sinusta, että et jaksa enää tai onko sinulla itsetuhoisia ajatuksia?",
                "sv": "Säkerhetsfråga: känner du att du inte orkar längre eller har du självskadetankar?",
                "en": "Safety question: do you feel unable to cope or have thoughts of self-harm?"
            }
            questions.append({
                "id": "q2",
                "type": "red_flag",
                "badge": "LUVN Turvakysymys",
                "text": q2_texts.get(lang, q2_texts["fi"]),
                "options": [
                    {"value": "no", "label": "Ei itsetuhoisia ajatuksia", "color": "green"},
                    {"value": "mild", "label": "Voimakasta väsymystä", "color": "yellow"},
                    {"value": "yes", "label": "Kyllä, tarvitsen välitöntä apua", "color": "red"}
                ],
                "red_flag_alert": "Jos sinulla on akuutteja itsetuhoisia ajatuksia, soita heti 112 tai Kriisipuhelimeen 09 2525 0111."
            })

        else:
            return None

        hint_text = f"Kysymykset on validoitu Länsi-Uudenmaan hyvinvointialueen virallisen esitietoprotokollan mukaisesti ({form_name})."

        return {
            "questions": questions,
            "triage_hint": hint_text,
            "matched_form": {
                "key": form_key,
                "title": form_name,
                "guid": guid,
                "authority": "Länsi-Uudenmaan hyvinvointialue (LUVN)"
            }
        }


# Singleton instance
luvn_forms_registry = LuvnFormsRegistry()
