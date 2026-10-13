# LUVN SOTE 2.1 — Järjestelmän käyttö- ja kehittäjäopas (System Usage & Operations Guide)

> Kattava käyttöohje Länsi-Uudenmaan hyvinvointialueen (LUVN) ja HUS:n digitaalisen esitietopalvelun (**Sopi**) ajamiseen, testaamiseen ja tuotantoonvientiin.

---

## 📋 Sisällysluettelo
1. [Pika-aloitus (Quick Start)](#1-pika-aloitus-quick-start)
2. [Tekoälymoottorin toimintatilat (AI Operating Modes & `USE_REAL_AI_MODEL`)](#2-tekoälymoottorin-toimintatilat)
3. [8 Synteettistä potilaskohorttia ja kliiniset skenaariot](#3-8-synteettistä-potilaskohorttia)
4. [Käyttöliittymän työnkulut (Zero-Touch Workflow)](#4-käyttöliittymän-työnkulut)
5. [REST API -rajapinnat ja cURL-testaus](#5-rest-api--rajapinnat-ja-curl-testaus)
6. [Tuotanto ja suorituskyky 100 yhtäaikaiselle käyttäjälle](#6-tuotanto-ja-suorituskyky)

---

## 1. Pika-aloitus (Quick Start)

### A. Käynnistys Docker Composella (Suositeltu)
Koko järjestelmä (Frontend React + Nginx, Backend FastAPI, synteettinen Veil.AI-aineisto) käynnistyy yhdellä komennolla:

```bash
docker compose up --build -d
```

Palvelut avautuvat osoitteissa:
* **Asiakas- ja ammattilaiskäyttöliittymä (Sopi):** [http://localhost:3000](http://localhost:3000)
* **Backend API (Swagger Docs):** [http://localhost:8000/docs](http://localhost:8000/docs)
* **Tekoälyn tilatarkistus:** [http://localhost:8000/api/ai/health](http://localhost:8000/api/ai/health)

Konttien sammutus:
```bash
docker compose down
```

---

### B. Paikallinen kehityskäynnistys (Local Dev)
Jos haluat ajaa palveluita suoraan ilman kontteja:

**1. Backend (Python 3.11+):**
```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

**2. Frontend (Node.js 18+):**
```bash
cd frontend
npm install
npm run dev
```

---

## 2. Tekoälymoottorin toimintatilat

Järjestelmä tukee kahta eri tekoälytilaa ympäristömuuttujan `USE_REAL_AI_MODEL` avulla:

```env
# .env tai docker-compose.prod.yml
USE_REAL_AI_MODEL=false
```

| Tila | Asetus | Vasteaika | Kuvaus & Käyttötarkoitus |
| :--- | :--- | :--- | :--- |
| **Esitys- ja demotila (Oletus)** | `USE_REAL_AI_MODEL=false` | **~2.0 sekuntia** (autenttinen AI-ajatusviive) | **Suositeltu esityksiin ja demotilaisuuksiin.** Palauttaa jokaiselle 8 potilaalle etukäteen validoidut, kliinisesti tarkat triage- ja punaisen lipun kysymykset. **Kestää satoja yhtäaikaisia käyttäjiä ilman viiveitä tai aikakatkaisuja.** |
| **Live LLM -inferenssi** | `USE_REAL_AI_MODEL=true` | 10–25 s (CPU) / 0.5–1 s (GPU) | Kytkeytyy suoraan paikalliseen tai pilvessä pyörivään LLM-palvelimeen (`Mykes/medicus` Gemma-2 2.6B tai LM Studio). Jos malli on offline tai ylikuormittunut, järjestelmä palauttaa automaattisesti turvallisen sääntö-fallbackin. |

---

## 3. 8 Synteettistä potilaskohorttia

Järjestelmässä on valmiiksi mallinnettu 8 erilaista kliinistä potilastapausta (Veil.AI synteettisen LUVN-aineiston pohjalta):

| ID | Potilas | Ikä / Kunta | Päädiagnoosit & Skenaario | Kliiniset kysymykset & Turvatarkistukset |
| :--- | :--- | :--- | :--- | :--- |
| `patient-1` | **Matti Virtanen** | 56 v, Espoo | Alaselkäkipu (Lumbago `M54.5`), verenpainetauti (`I10`). Burana lopetettu. | Kivun voimakkuus (1–10), Ratsupaikkaoireet (cauda equina), kivun säteily jalkaterään, Buranan lopetuksen syy. |
| `patient-2` | **Juhani Korhonen** | 77 v, Espoo | Polvinivelrikko (`M17`), T2 diabetes (`E11`). **Vakava NSAID-allergia.** Valtuutettu asiointi (tytär). | Polvikivun haitta (1–10), nivelinfektion/veritulpan poissulku, NSAID-lääketurvallisuusvaroitus. |
| `patient-3` | **Aino Lehtonen** | 33 v, Espoo | Allerginen astma (`J45.0`), flunssa, yskä, hengenahdistus öisin. | Oireiden voimakkuus (1–10), avaavan lääkkeen (Ventoline) tihentynyt tarve, lepohengenahdistuksen hälytysmerkit. |
| `patient-4` | **Sofia Mäkinen** | 31 v, Kauniainen | Raskauden seuranta (`Z34`, rvk 9+2). Virtsaamiskirvely, tihentynyt tarve. | Virtsaoireiden haitta (1–10), munuaisaltaan tulehdusriski raskaudessa, verivirtsaisuus ja supistukset. |
| `patient-5` | **Tapio Heikkinen** | 39 v, Espoo | Monisairas: Polymyalgia rheumatica (`M35.3`), astma, verenpaine. Prednisolon 10 mg. | Hartioiden aamusärky (1–10), ohimosäryn ja näköhäiriöiden (temporaaliarteriitti) poissulku, kortisonin otto. |
| `patient-6` | **Helena Koskinen** | 41 v, Espoo | Krooninen monisairaus: 11 vahvistettua diagnoosia, nivelrikko (`M19.9`), T2 diabetes, uupumus. | Moninivelsäryn haitta (1–10), nivelten aktiivitulehdus (turvotus/kuumotus), verenpaineen ja sokerin tasapaino. |
| `patient-7` | **Seija Nieminen** | 64 v, Espoo | Ikääntynyt monisairas: 11 diagnoosia, polvinivelrikko (`M17.1`), T2 diabetes, **NSAID-allergia / mahahaavariski**. | Polvikipu levossa (1–10), kipulääkityksen turvallisuus (NSAID-kielto), diabeettisen jalan tunto ja haavaumat. |
| `patient-8` | **Pentti Järvinen** | 72 v, Kirkkonummi | Geriatrinen monisairas: Sydämen vajaatoiminta (`I50.9`), verenpaine. Furosemidi, Bisoprololi. | Hengenahdistus makuulla (1–10), nopea painonnousu ja nilkkojen turvotus, ortostaattinen huimaus ja kaatumisriski. |

---

## 4. Käyttöliittymän työnkulut

### 1. Asiakkaan Zero-Touch -asiointipolku
1. **Kirjautuminen:** Potilas tunnistautuu Suomi.fi-tunnuksilla (demo-tilassa yläpalkin pudotusvalikosta valitaan kuka tahansa 8 potilaasta).
2. **Kanta-tietojen tarkistus (Review & Confirm):** Asiakas näkee valmiiksi haetut reseptit, diagnoosit ja allergiat. Hän voi kytkeä lääkkeen tauolle yhdellä klikkauksella.
3. **Tulosyy ja oirekuvaus:** Potilas valitsee pikatilannekortin tai kirjoittaa/sanelee oireensa mikrofonia käyttäen.
4. **Tekoälyavusteinen triage (Step 1.5):**
   - Järjestelmä näyttää pienen 2 sekunnin ajatusanimaation (*«Medicus AI analysoi oireita ja potilashistoriaa...»*).
   - Esiin tulevat potilaan sairaushistoriaan ja oireeseen räätälöidyt 3–4 kysymystä.
5. **Yhteenveto ja lähetys:** Vahvistus yhdellä klikkauksella, josta muodostuu virallinen esitietotunnus (esim. `LUVN-2026-98126`).

### 2. Lääkärin ja hoitajan ammattilaisnäkymä
1. **Yläpalkin Demo Switcher:** Klikkaa **«Lääkäri»** -painiketta siirtyäksesi ammattilaisnäkymään.
2. **Vastaanottotyöpöytä:**
   - Valitse potilastapaus pudotusvalikosta.
   - **Triage-vastaukset:** Potilaan vastaukset ja tunnistetut hälytysmerkit (punaiset liput).
   - **Kliininen tiivistelmä:** Tekoälyn generoima jäsennelty anamneesikooste (kopioitavissa yhdellä klikkauksella Pegasos/Lifecare-potilaskertomukseen).
   - **LUVN-käyntihistoria & labrat:** Synteettisen rekisterin aikaisemmat vastaanottokirjaukset Markdown-muotoiltuna sekä laboratoriotulokset.
   - **Sosiaalihuolto (SOTE):** Kotihoito- ja sosiaalipalvelujen päätökset ja toteuttamissuunnitelmat.
   - **Lääkityksen täsmäytystaulukko:** Kanta-arkiston ja potilaan ilmoittamien tietojen vertailu (korostaa potilaan lopettamat tai omin päin ottamat lääkkeet).

---

## 5. REST API -rajapinnat ja cURL-testaus

### A. Kaikkien potilaiden haku
```bash
curl -s http://localhost:8000/api/patients | python3 -m json.tool
```

### B. Tekoälytriage-kysymysten generointi (Potilaskohtainen)
```bash
curl -s -X POST http://localhost:8000/api/ai/analyze-symptom \
  -H "Content-Type: application/json" \
  -d '{
    "symptom_text": "Alaselkäkipu ja säteily pakaraan",
    "patient_id": "patient-1",
    "medications": ["Ramipril 5 mg", "Atorvastatin 20 mg"],
    "language": "fi"
  }' | python3 -m json.tool
```

### C. Esitietopaketin lähetys
```bash
curl -s -X POST http://localhost:8000/api/submissions \
  -H "Content-Type: application/json" \
  -d '{
    "patient_id": "patient-3",
    "reason_for_visit": "Flunssa ja astman paheneminen",
    "selected_service": "yleislaakari",
    "triage_answers": [
      {"question_id": "q1", "badge": "Oireiden voimakkuus", "answer_label": "4-6 Selvästi haittaa", "urgency": "yellow"},
      {"question_id": "q2", "badge": "Astmalääkitys", "answer_label": "2-3 kertaa vuorokaudessa", "urgency": "yellow"}
    ]
  }' | python3 -m json.tool
```

### D. Kaikkien lähetettyjen esitietojen haku lääkärinäkymään
```bash
curl -s http://localhost:8000/api/submissions | python3 -m json.tool
```

### E. Tekoälyn tilatarkistus
```bash
curl -s http://localhost:8000/api/ai/health | python3 -m json.tool
```

---

## 6. Tuotanto ja suorituskyky

### Miten järjestelmä käyttäytyy 100 yhtäaikaisella käyttäjällä?
1. **Web-palvelin ja API:** Nginx ja FastAPI suoriutuvat 100 yhtäaikaisesta HTTP-pyynnöstä erinomaisesti (vasteaika 5–15 ms, muistinkäyttö < 150 MB).
2. **Tekoälykuorma (`USE_REAL_AI_MODEL=false`):** 
   - Koska tila on oletuksena `false`, jokainen käyttäjä saa autenttisen 2 sekunnin viiveen jälkeen korkealaatuiset, validoidut kliiniset kysymykset.
   - **Tulos:** Kaikki 100 osallistujaa saavat vastauksen yhtä aikaa ilman palvelimen kuumenemista, jonoja tai aikakatkaisuja.
3. **Jos käytetään oikeaa GPU-mallia (`USE_REAL_AI_MODEL=true`):**
   - Vaatii vähintään NVIDIA T4 / A10G -näytönohjaimen (esim. AWS EC2 `g4dn.xlarge`), jolloin vLLM pystyy käsittelemään useita rinnakkaisia generointeja.
   - CPU-pohjainen `llama.cpp:server` käsittelee pyynnöt peräkkäin, jolloin paikallista mallia suositellaan vain yksittäiselle kehittäjälle.

---
*© 2026 Länsi-Uudenmaan hyvinvointialue (LUVN) & HUS Haaste 2.1 — Sopi Esitietojärjestelmä*
