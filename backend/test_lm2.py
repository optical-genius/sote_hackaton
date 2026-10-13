import asyncio
from app.services.lm_studio import get_clinical_questions

async def main():
    symptoms = [
        "Kova päänsärky ja huimausta",
        "Polvikipu pahentunut viikon aikana",
        "Alaselkäkipu säteilee pakaraan"
    ]
    for s in symptoms:
        print(f"\n--- Testing symptom: '{s}' ---")
        res = await get_clinical_questions(s)
        print("Source:", res.get("source"))
        print("Questions:", len(res.get("questions", [])))
        for q in res.get("questions", []):
            print("  *", q.get("badge"), ":", q.get("text"))

if __name__ == '__main__':
    asyncio.run(main())
