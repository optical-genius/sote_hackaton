# Medicus-mallin (Mykes/medicus) käyttöönotto AWS EC2 g4dn.xlarge -instanssilla

Malli Hugging Facessa: [Mykes/medicus](https://huggingface.co/Mykes/medicus)  
- **Pohja-arkkitehtuuri:** Google Gemma-2 2.6B (`Gemma2ForCausalLM`)
- **Tiedostomuodot:** Safetensors (FP16/BF16) ja GGUF (Q4_K_M, Q8_0, F16)
- **Mallin koko:** ~1.6 Gt (Q4_K_M) – ~5.2 Gt (FP16)
- **VRAM-muistinkulutus:** ~2.5–3.5 Gt (NVIDIA Tesla T4 16 Gt -kortilla jää runsaasti vapaata kapasiteettia)

---

## 1. EC2-instanssin käynnistäminen AWS-konsolissa

1. **Instanssityyppi:** `g4dn.xlarge` (4 vCPU, 16 Gt RAM, 1 × NVIDIA T4 16 Gt VRAM).
2. **AMI (käyttöjärjestelmäkuva):**  
   Valitse **Deep Learning OSS Nvidia Driver AMI GPU (Ubuntu 22.04)**  
   *(sisältää valmiiksi asennetut NVIDIA-ajurit ja CUDA-kirjastot)*.
3. **Tallennustila (EBS):**  
   Vähintään **80–100 Gt `gp3`**.
4. **Security Group (palomuuri):**
   - Portti `22` (SSH) — pääsy omasta IP-osoitteestasi.
   - Portti `8001` (Medicus API) — pääsy sovelluspalvelimelta tai kehityskoneeltasi.
   - Portit `3000` ja `8000` — mikäli käyttöliittymä ja taustajärjestelmä ajetaan samalla instanssilla.

---

## 2. Mallin käyttöönotto EC2:lla yhdellä komennolla

Ota SSH-yhteys instanssiin:
```bash
ssh -i oma-avain.pem ubuntu@<EC2_JULKINEN_IP>
```

Kloonaa repositorio tai kopioi skripti palvelimelle:
```bash
cd sote_ala/deploy
chmod +x setup_ec2_g4dn.sh
./setup_ec2_g4dn.sh
```

Skripti suorittaa automaattisesti seuraavat vaiheet:
1. Tarkistaa NVIDIA GPU:n ja CUDA-tuen (`nvidia-smi`).
2. Asentaa ja konfiguroi Dockerin sekä NVIDIA Container Toolkitin.
3. Käynnistää `vLLM`-kontin `Mykes/medicus`-mallilla porttiin **8001** (malli ladataan automaattisesti Hugging Facesta).
4. Varmistaa `/v1/models`-rajapinnan toiminnan.

### Vaihtoehtoinen manuaalinen käynnistys Docker Composella:
```bash
docker compose -f deploy/docker-compose.medicus.yml up -d
```

---

## 3. Mallin testaaminen EC2:lla

Tarkista rajapinnan tila ja malliluettelo:
```bash
curl http://localhost:8001/v1/models
```

Suorita testikysely suomeksi:
```bash
curl http://localhost:8001/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "medicus",
    "messages": [
      {"role": "user", "content": "Potilaalla on kova alaselkäkipu, joka heijastuu pakaraan. Laadi 2 tarkentavaa kliinistä kysymystä."}
    ],
    "temperature": 0.2
  }'
```

---

## 4. Vaihtaminen paikallisen (LM Studio) ja EC2 Dev-Stagen välillä

Sovelluksen `.env`-tiedosto tukee **kaksivaiheista toimintamallia**:

### Tila 1: Paikallinen kehitys (LM Studio)
Jätä `MEDICUS_API_URL` tyhjäksi:
```env
LM_STUDIO_BASE_URL=http://host.docker.internal:1234/v1
LM_STUDIO_MODEL=medicus
MEDICUS_API_URL=
```
Taustajärjestelmä hakee mallin automaattisesti paikallisesta LM Studio -instanssista (portti 1234).

### Tila 2: EC2 Dev-Stage
Määritä käynnistetyn palvelimen osoite:
```env
# Jos taustajärjestelmä ja malli ajetaan samalla EC2-instanssilla:
MEDICUS_API_URL=http://localhost:8001/v1
MEDICUS_MODEL=medicus

# Tai jos paikallinen taustajärjestelmä ottaa yhteyden etäpalvelimeen:
# MEDICUS_API_URL=http://<EC2_JULKINEN_IP>:8001/v1
```
`MEDICUS_API_URL`-asetuksella on korkein prioriteetti, ja se ohittaa paikallisen LM Studion.
