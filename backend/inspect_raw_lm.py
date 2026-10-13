import asyncio
import httpx
from app.services.lm_studio import _MODEL, _API_KEY

BETTER_PROMPT = """Olet kokenut suomalainen terveyskeskuslääkäri. Tehtäväsi on laatia potilaalle 2–4 tarkentavaa kysymystä suomeksi hänen oireidensa perusteella.

TÄRKEÄÄ:
- Kirjoita kysymykset SUOMEKSI, selkeästi ja empaattisesti.
- ÄLÄ KOSKAAN palauta sanaa "[kysymys]". Kirjoita aina oikea kysymyslause!
- Ensimmäinen kysymys (q1) mittaa kivun tai vaivan voimakkuutta (1-10).
- Toinen kysymys (q2) on turvakysymys (punainen lippu), joka kysyy vakavista oireista.
- Palauta VAIN puhdas JSON-objekti ilman mitään selityksiä tai markdown-koodia.

Esimerkki hyvästä JSON-vastauksesta päänsärkyyn:
{
  "questions": [
    {
      "id": "q1",
      "type": "pain_scale",
      "badge": "Kivun voimakkuus",
      "text": "Kuinka voimakasta päänsärky on asteikolla 1–10?",
      "options": [
        {"value": "1-3", "label": "1–3 Lievää", "color": "green"},
        {"value": "4-6", "label": "4–6 Kohtalaista", "color": "yellow"},
        {"value": "7-9", "label": "7–9 Voimakasta", "color": "orange"},
        {"value": "10", "label": "10 Sietämätöntä", "color": "red"}
      ]
    },
    {
      "id": "q2",
      "type": "red_flag",
      "badge": "Turvakysymys",
      "text": "Liittyykö päänsärkyyn niskajäykkyyttä, kuumetta tai näköhäiriöitä?",
      "options": [
        {"value": "no", "label": "Ei mitään näistä", "color": "green"},
        {"value": "mild", "label": "Lievää huimausta", "color": "yellow"},
        {"value": "yes", "label": "Kyllä, voimakkaana", "color": "red"}
      ],
      "red_flag_alert": "Äkillinen raju päänsärky ja niskajäykkyys vaatii päivystysarvion."
    }
  ],
  "triage_hint": "Päänsärkyoireen kartoitus"
}"""

async def main():
    url = 'http://host.docker.internal:1234/v1/chat/completions'
    symptom = "Polvi vääntyi eilen lenkillä, nyt turvoksissa ja astuminen sattuu"
    user_prompt = f"Potilaan oirekuvaus:\n\"{symptom}\"\n\nLaadi nyt 2–3 tarkentavaa kysymystä suomeksi JSON-muodossa juuri tähän polvioireeseen."
    
    payload = {
        'model': _MODEL,
        'messages': [
            {'role': 'system', 'content': BETTER_PROMPT},
            {'role': 'user', 'content': user_prompt}
        ],
        'temperature': 0.2,
        'max_tokens': 800,
        'stream': False
    }
    headers = {
        'Authorization': f'Bearer {_API_KEY}',
        'Content-Type': 'application/json'
    }
    async with httpx.AsyncClient(timeout=30.0) as client:
        res = await client.post(url, json=payload, headers=headers)
        data = res.json()
        raw = data['choices'][0]['message']['content']
        print("=== BETTER PROMPT LM STUDIO OUTPUT ===")
        print(raw)

if __name__ == '__main__':
    asyncio.run(main())
