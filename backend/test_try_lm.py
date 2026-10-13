import asyncio
import json
import re
import httpx

_BASE_URLS = ['http://192.168.65.254:1234/v1', 'http://host.docker.internal:1234/v1']
_API_KEY = "sk-lm-tia401iw:MRIY7W74tWqkZKbMaxVd"
_MODEL = "medicus"

_SYSTEM_PROMPT = """Olet kokenut suomalainen terveyskeskuslääkäri. Tehtäväsi on laatia potilaalle 2–4 tarkentavaa kysymystä suomeksi hänen oireidensa perusteella.

TÄRKEÄÄ:
- Kirjoita kysymykset SUOMEKSI, selkeästi ja empaattisesti.
- ÄLÄ KOSKAAN palauta sanaa "[kysymys]". Kirjoita aina oikea kysymyslause!
- Ensimmäinen kysymys (q1) mittaa kivun tai vaivan voimakkuutta (1-10).
- Toinen kysymys (q2) on turvakysymys (punainen lippu), joka kysyy vakavista oireista.
- Palauta VAIN puhdas JSON-objekti:
{"questions":[{"id":"q1","type":"pain_scale","badge":"Kivun voimakkuus","text":"Kuinka voimakasta kipu tai haitta on asteikolla 1–10?","options":[{"value":"1-3","label":"1–3 Lievää","color":"green"},{"value":"4-6","label":"4–6 Kohtalaista","color":"yellow"},{"value":"7-9","label":"7–9 Voimakasta","color":"orange"},{"value":"10","label":"10 Sietämätöntä","color":"red"}]},{"id":"q2","type":"red_flag","badge":"Turvakysymys","text":"Liittyykö oireeseen hengenahdistusta, säteilykipua tai äkillistä pahenemista?","options":[{"value":"no","label":"Ei ole oiretta","color":"green"},{"value":"mild","label":"Lievänä","color":"yellow"},{"value":"yes","label":"Kyllä, voimakkaana","color":"red"}],"red_flag_alert":"Vaatii tarvittaessa päivystysarvion."}],"triage_hint":"Oirekartoitus"}"""

def repair_and_extract(raw: str):
    # 1. Strip markdown fences
    s = raw
    if "```json" in s:
        s = s.split("```json", 1)[1].split("```", 1)[0].strip()
    elif "```" in s:
        s = s.split("```", 1)[1].split("```", 1)[0].strip()

    # Try direct parse first
    try:
        obj = json.loads(s)
        if "questions" in obj and len(obj["questions"]) > 0:
            return obj
    except Exception:
        pass

    # Fix double curly braces like ]}},
    s_fixed = re.sub(r'\]\s*\}\s*\}', ']}', s)
    s_fixed = re.sub(r',\s*([\]\}])', r'\1', s_fixed)
    try:
        obj = json.loads(s_fixed)
        if "questions" in obj and len(obj["questions"]) > 0:
            return obj
    except Exception:
        pass

    # Regex question object extractor
    # Find all { "id": "q...", ... }
    q_matches = re.finditer(r'\{\s*"id"\s*:\s*"q\d+"', s)
    questions = []
    starts = [m.start() for m in q_matches]
    for i, start in enumerate(starts):
        # end is before next start or closing of questions array
        chunk = s[start:]
        # find matching balance of braces
        depth = 0
        end_idx = None
        for idx, ch in enumerate(chunk):
            if ch == '{':
                depth += 1
            elif ch == '}':
                depth -= 1
                if depth == 0:
                    end_idx = idx + 1
                    break
        if end_idx:
            q_str = chunk[:end_idx]
            try:
                q_obj = json.loads(q_str)
                # Ensure options is populated
                if not q_obj.get("options") or len(q_obj["options"]) == 0:
                    q_obj["options"] = [
                        {"value": "no", "label": "Ei ole", "color": "green"},
                        {"value": "mild", "label": "Lievänä", "color": "yellow"},
                        {"value": "yes", "label": "Kyllä", "color": "red"}
                    ]
                questions.append(q_obj)
            except Exception as ex:
                pass
    if questions:
        return {"questions": questions, "triage_hint": "Oirekartoitus (Medicus AI)"}
    return None

async def test_symptom(symptom_text):
    user_prompt = (
        f"Potilaan oirekuvaus:\n\"{symptom_text}\"\n\n"
        "Laadi nyt 2–3 tarkentavaa kysymystä suomeksi JSON-muodossa juuri näihin oireisiin."
    )
    payload = {
        "model": _MODEL,
        "messages": [
            {"role": "system", "content": _SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt}
        ],
        "temperature": 0.2,
        "max_tokens": 700,
        "stream": False
    }
    headers = {
        "Authorization": f"Bearer {_API_KEY}",
        "Content-Type": "application/json"
    }
    client_timeout = httpx.Timeout(connect=2.0, read=30.0, write=5.0, pool=5.0)
    async with httpx.AsyncClient(timeout=client_timeout) as client:
        res = await client.post(f"{_BASE_URLS[0]}/chat/completions", json=payload, headers=headers)
        print("STATUS:", res.status_code)
        data = res.json()
        raw_content = data.get("choices", [{}])[0].get("message", {}).get("content", "").strip()
        print("RAW CONTENT LENGTH:", len(raw_content))
        
        parsed = repair_and_extract(raw_content)
        if parsed:
            print("SUCCESS! JSON parsed cleanly!")
            print("Triage hint:", parsed.get("triage_hint"))
            print("Questions count:", len(parsed.get("questions", [])))
            for q in parsed.get("questions", []):
                print(f"  [{q.get('id')}] {q.get('badge')}: {q.get('text')}")
                for opt in q.get("options", []):
                    print(f"      - {opt.get('label')}")
        else:
            print("Parse failed for:\n", raw_content)

async def main():
    await test_symptom("Alaselkäkipu säteilee oikeaan pakaraan jo 4 päivää, Burana ei auta riittävästi.")

if __name__ == '__main__':
    asyncio.run(main())
