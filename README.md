# LUVN SOTE 2.1 — Asiakkaan valmiit esitiedot asioinnissa (Ready Pre-Information for Client Care)

> Ratkaisu Länsi-Uudenmaan hyvinvointialueen (LUVN) ja HUS:n haasteeseen **2.1: Asiakkaan valmiit esitiedot asioinnissa**.

Tämä ratkaisu perustuu **Zero-Touch** -periaatteeseen: **«Подтверждение вместо ввода» (Review & Confirm)**. Palvelujen käyttäjän ei tarvitse syöttää uudelleen jo järjestelmissä olevia tietoja (reseptit, diagnoosit, allergiat). Puuttuvat kliiniset esitiedot kerätään tekoälyavusteisesti vuorovaikutteisessa dialogissa saavutettavalla selkokielellä, ja ammattilaiselle muodostetaan strukturoitu kliininen tiivistelmä sekä lääkityksen täsmäytys.

---

## 🌟 Tärkeimmät ominaisuudet ja näyttö haasteen kriteereihin

### 1. Vaikuttavuus (30% - Impact & Value)
* **Zero-Touch -esitäyttö:** Potilaan tiedot (Veil.AI synteettinen LUVN-kanta / Kanta-arkisto) haetaan valmiiksi. Vahvistus yhdellä klikkauksella.
* **Ammattilaisen aikasäästö (5–8 min per käynti):** Lääkäri tai hoitaja näkee vastaanoton alussa strukturoidun yhteenvedon ja lääkityksen täsmäytystaulukon (erot Kannan ja potilaan ilmoituksen välillä).
* **Kliininen turvallisuus (Human-in-the-Loop):** Tekoäly ei aseta diagnoosia, vaan jäsentelee tietoa. Sisäänrakennettu hälytysmerkkien tunnistus (Red Flags, esim. ratsupaikkaoireyhtymä tai rintakipu).

### 2. Vastuullisuus ja saavutettavuus (15% - Vastuullisuus & Saavutettavuus)
* **WCAG 2.1 AA -yhteensopivuus:** Vähintään 48x48 px kosketuspinnat, selkeät kontrastit.
* **Saavutettavuustyökalut (A11y Bar):** 
  - Korkean kontrastin tila (High Contrast Mode).
  - Tekstikoon skaalaus (Normaali, A+, A++).
  - **Selkokieli-tila (Plain Language):** Yksinkertaistetut ilmaisut ja opastukset ilman vaikeaa lääketieteellistä jargonia.
* **Kolmikielisyys (FI / SV / EN):** Nopea vaihto suomen, ruotsin ja englannin välillä tilan säilyttäen.
* **Suomi.fi -valtuudet (Asiointi toisen puolesta):** Selkeä roolierottelu ja mandaatin osoitus (esim. ikääntyneen vanhemman puolesta asiointi).

### 3. Tekninen toteutus ja arkkitehtuuri (20%)
* **Backend:** Python (FastAPI, Pydantic Structured Outputs, HTTPX).
* **Frontend:** React + Vite, komponenttipohjainen moderni käyttöliittymä, Nginx.
* **Kontitus:** Kaikki palvelut Docker-kontteina, käynnistys yhdellä komennolla `docker-compose up --build`.

---

## 🖥️ Toteutetut näkymät ja käyttäjäpolku

1. **Palvelun ja syyn valinta (Palvelun ja syyn valinta):**
   - Palvelualueen valinta (Yleislääkäri, Fysioterapia, Sosiaalipalvelut, Neuvola).
   - Vapaa tekstinsyöttö ja puhesyötön simulointi mikrofoni-ikonilla.
   - Pikatilannekortit ja Suomi.fi-tunnistautumisen tila (maskattu hetu `140568-***Y`).

2. **Omien tietojen tarkistus — Zero-Touch (Omien tietojen tarkistus):**
   - Lääkityslista interaktiivisilla tilakytkimillä (*Käytössä* / *Tauolla/Lopetettu*) sekä mahdollisuus lisätä uusi valmiste.
   - Pitkäaikaissairauksien ja diagnoosien merkitseminen käyntiin liittyviksi.
   - Allergiat ja rajoitteet.
   - Yhden klikkauksen vahvistus: *«Tiedot ovat ajan tasalla»*.

3. **Tekoälyavusteinen oirekartoitus (Tekoälyavusteinen oirekartoitus):**
   - Kaksipalstainen näkymä: vasemmalla lomakkeen reaaliaikainen edistymisseuranta (Tulosyy, Kesto, Kipuaste 0-10, Liitännäisoireet, Arjen haitta).
   - Oikealla selkokielinen avustajakeskustelu dynaamisilla pikavastauspainikkeilla (Quick Replies).
   - Reaaliaikainen entiteettien erottelu: käyttäjän vastaus jäsennetään ja lomakkeen kenttä syttyy vihreäksi.

4. **Yhteenveto ja suostumus (Yhteenveto ja suostumus):**
   - Strukturoitu kooste ennen lähetystä.
   - Tietosuojan ja tekoälykäytön suostumuslaatikot (GDPR & SOTE-laki).
   - Onnistumisen tila, virallinen vahvistustunnus (esim. `LUVN-2026-98124`) ja toimintaohjeet.

5. **Ammattilaisen koontinäkymä (Ammattilaisen koontinäkymä):**
   - Vaihdettavissa yläpalkin Demo Switcherillä milloin tahansa.
   - Potilaan profiili ja vahvistusstatus (*Itse ilmoitettu ja vahvistettu Suomi.fi-tunnisteella*).
   - Tekoälyn generoima esitietotiivistelmä kliinikolle (kopioitavissa yhdellä painikkeella potilaskertomukseen).
   - Lääkityksen vertailutaulukko (Kanta vs. Potilaan ilmoitus), joka korostaa potilaan lopettamat lääkkeet.
   - Kliiniset pikatoiminnot (*Ota käsittelyyn*, *Avaa Lifecare/Pegasos*, *Pyydä lisätietoja*).

---

## 🚀 Käynnistysohjeet (Docker & Docker Compose)

### 1. Käynnistys Docker Composella
```bash
docker-compose up --build
```

Käynnistyksen jälkeen palvelut ovat käytettävissä:
* **Frontend (Asiakas- ja ammattilaisliittymä):** [http://localhost:3000](http://localhost:3000)
* **Backend API (FastAPI Swagger Docs):** [http://localhost:8000/docs](http://localhost:8000/docs)
* **API Terveystarkistus:** [http://localhost:8000/health](http://localhost:8000/health)

### 2. Valinnaiset ympäristömuuttujat (.env)
Sovellus toimii **täysin ilman ulkoisia API-avaimia** laadukkaalla sisäänrakennetulla kliinisellä sääntö- ja kielimoottorilla. Haluttaessa ulkoinen LLM voidaan kytkeä:
```bash
OPENAI_API_KEY=your-openai-api-key
# tai
GEMINI_API_KEY=your-gemini-api-key
```

---

## 👥 Valmiit synteettiset testiprofiilit (Veil.AI)

Sovelluksessa voi vaihtaa suoraan käyttöliittymästä esimerkkipotilaan profiilia:
1. **Matti Virtanen (56 v, Espoo):** Alaselkäkipu, verenpainetauti, lääkityksenä Ramipril, Atorvastatin, Burana.
2. **Aino Korhonen (78 v, Kirkkonummi):** Polven nivelrikko, eteisvärinä, asiointi tyttären (Leena) puolesta valtuutuksella, lääkityksenä Marevan, Metoprolol, Panadol Forte.
3. **Jari Nieminen (42 v, Lohja):** Allerginen astma, pitkittynyt yskä, Salbutamol, penisilliiniallergia.
4. **Sofia Mäkinen (31 v, Kauniainen):** Raskausajan neuvolaseuranta, monivitamiini, rautalisä.
