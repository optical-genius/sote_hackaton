"""
LUVN synthetic data loader service.
Ingests, indexes, and serves patient data from official LUVN 2024-2026 synthetic cohorts
(clinical tables, clinical-notes, social-notes, medications, and labs).
"""
import os
import json
import logging
from pathlib import Path
from typing import Dict, List, Optional, Any
from ..models.patient import (
    PatientProfile,
    MedicationItem,
    DiagnosisItem,
    AllergyItem,
    ClinicalNoteItem,
    SocialCareRecord,
    LabResultItem
)

logger = logging.getLogger(__name__)

# Common ICD-10 Finnish/Swedish/English dictionary
ICD10_TITLES: Dict[str, Dict[str, str]] = {
    "M54.5": {
        "fi": "Alaselkäkipu (Lumbago)",
        "sv": "Ländryggsmärta",
        "en": "Low back pain"
    },
    "M54.2": {
        "fi": "Niskakipu",
        "sv": "Nacksmärta",
        "en": "Cervicalgia (Neck pain)"
    },
    "M25.5": {
        "fi": "Nivelkipu (Artalgia)",
        "sv": "Ledvärk",
        "en": "Pain in joint"
    },
    "M17.9": {
        "fi": "Polvinivelrikko",
        "sv": "Knäartros",
        "en": "Gonarthrosis, unspecified"
    },
    "J06.9": {
        "fi": "Määrittämätön akuutti ylähengitystieinfektio",
        "sv": "Akut övre luftvägsinfektion, ospecificerad",
        "en": "Acute upper respiratory infection"
    },
    "F41.9": {
        "fi": "Määrittämätön ahdistuneisuushäiriö",
        "sv": "Ångestsyndrom, ospecificerat",
        "en": "Anxiety disorder, unspecified"
    },
    "F32.9": {
        "fi": "Määrittämätön masennustila",
        "sv": "Depressiv episod, ospecificerad",
        "en": "Depressive episode, unspecified"
    },
    "I10": {
        "fi": "Essentiaalinen verenpainetauti",
        "sv": "Essentiell hypertoni",
        "en": "Essential hypertension"
    },
    "E78.0": {
        "fi": "Puhdas hyperkolesterolemia",
        "sv": "Ren hyperkolesterolemi",
        "en": "Pure hypercholesterolaemia"
    },
    "E11.9": {
        "fi": "Tyypin 2 diabetes ilman lisäsairauksia",
        "sv": "Typ 2-diabetes utan komplikationer",
        "en": "Type 2 diabetes mellitus without complications"
    },
    "E03.9": {
        "fi": "Määrittämätön kilpirauhasen vajaatoiminta",
        "sv": "Hypotyreos, ospecificerad",
        "en": "Hypothyroidism, unspecified"
    },
    "R10.4": {
        "fi": "Muu ja määrittämätön vatsakipu",
        "sv": "Annan och ospecificerad buksmärta",
        "en": "Other and unspecified abdominal pain"
    },
    "S61.9": {
        "fi": "Ranteen ja käden määrittämätön avohaava",
        "sv": "Öppet sår på handled och hand, ospecificerat",
        "en": "Open wound of wrist and hand, unspecified"
    },
}

# Curated demographic bindings for showcase profiles
CURATED_PATIENT_METADATA: Dict[str, Dict[str, Any]] = {
    "SYN-ASI-1000000584": {
        "alias_id": "patient-1",
        "first_name": "Matti",
        "last_name": "Virtanen",
        "phone": "+358 40 123 4567",
        "email": "matti.virtanen@esimerkki.fi",
        "scenario_tag": "Alaselkäkipu (Lumbago) & Verenpaine",
        "allergies": []
    },
    "SYN-ASI-1000000831": {
        "alias_id": "patient-2",
        "first_name": "Juhani",
        "last_name": "Korhonen",
        "phone": "+358 40 234 5678",
        "email": "juhani.korhonen@esimerkki.fi",
        "scenario_tag": "Kotihoito & Nivelkipu (SOTE-integraatio)",
        "allergies": []
    },
    "SYN-ASI-1000003685": {
        "alias_id": "patient-3",
        "first_name": "Aino",
        "last_name": "Lehtonen",
        "phone": "+358 50 345 6789",
        "email": "aino.lehtonen@esimerkki.fi",
        "scenario_tag": "Akuutti hengitystieinfektio & Flunssa",
        "allergies": [
            AllergyItem(allergen="Ampisilliini", reaction="Iho-oireet ja nokkosihottuma", severity="Kohtalainen")
        ]
    },
    "SYN-ASI-1000011960": {
        "alias_id": "patient-4",
        "first_name": "Marja",
        "last_name": "Mäkinen",
        "phone": "+358 45 456 7890",
        "email": "marja.makinen@esimerkki.fi",
        "scenario_tag": "Alaselkäkipu & Kilpirauhasen vajaatoiminta",
        "allergies": []
    }
}


class LuvnDataLoader:
    """Manages loading, parsing and caching of LUVN synthetic data cohorts."""

    def __init__(self):
        self._cache_file: Path = Path(__file__).resolve().parent / "curated_luvn_cache.json"
        self._profile_cache: Dict[str, PatientProfile] = {}
        self._initialized: bool = False

    def is_available(self) -> bool:
        return self._cache_file.exists()

    def _lazy_init(self):
        """Load and build profiles from cached JSON data."""
        if self._initialized:
            return
        self._initialized = True

        if not self._cache_file.exists():
            logger.warning(f"LUVN cache file not found at {self._cache_file}")
            return

        try:
            with open(self._cache_file, "r", encoding="utf-8") as f:
                raw_data = json.load(f)
            self._build_profiles(raw_data)
            logger.info(f"Loaded {len(self._profile_cache)} LUVN patient profiles successfully.")
        except Exception as e:
            logger.error(f"Error loading LUVN cache: {e}", exc_info=True)

    def _build_profiles(self, raw_data: Dict[str, List[dict]]):
        """Assemble typed PatientProfile objects from raw tables."""
        # 1. Demographics by asiakas_id
        asiakas_map = {r["asiakas_id"]: r for r in raw_data.get("asiakas", [])}

        # 2. Medications by asiakas_id
        # Deduplicate per patient so each distinct medication appears only once,
        # preserving active status and standard dosage.
        ATC_STANDARD_DOSAGES = {
            "C08CA01": "5 mg",          # Amlodipiini
            "N02BE01": "500 mg - 1 g",  # Parasetamoli
            "H03AA01": "100 µg",        # Levotyroksiininatrium
            "M02AA15": "11.6 mg/g",     # Diklofenaakki
            "R01AD09": "50 µg/annos",   # Mometasoni
            "C09AA05": "5 mg",          # Ramipriili
            "C10AA05": "20 mg",         # Atorvastatiini
            "A10BA02": "500 mg",        # Metformiini
            "M01AE01": "600 mg",        # Ibuprofeeni
        }

        meds_by_subj: Dict[str, List[MedicationItem]] = {}
        meds_map_by_subj: Dict[str, Dict[str, MedicationItem]] = {}

        for row in raw_data.get("laakitys", []):
            subj = row.get("asiakas_id")
            if not subj:
                continue

            end_date = row.get("laakitys_paattymispvm") or ""
            start_date = row.get("laakitys_aloituspvm") or ""
            start_yr = int(start_date[:4]) if len(start_date) >= 4 else 2024
            active = (not end_date) or (end_date >= "2026-01-01")

            kaytto = (row.get("laakkeen_kayttotapa") or "").upper()
            schedule = "Säännöllinen" if ("SÄÄNNÖLL" in kaytto or "SAANNOLL" in kaytto) else "Tarvittaessa"
            substance = (row.get("vaikuttava_aine") or "Lääke").capitalize().strip()
            atc = (row.get("atc_koodi") or "").strip().upper()
            med_name = f"{substance} ({atc})" if atc else substance
            dosage = ATC_STANDARD_DOSAGES.get(atc, "")

            key = atc if atc else substance.lower()

            if subj not in meds_map_by_subj:
                meds_map_by_subj[subj] = {}

            if key not in meds_map_by_subj[subj]:
                meds_map_by_subj[subj][key] = MedicationItem(
                    id=f"med-{row.get('laakitys_avain', key)}",
                    name=med_name,
                    dosage=dosage,
                    schedule=schedule,
                    is_active=active,
                    indication=f"ATC: {atc}" if atc else None,
                    started_year=start_yr
                )
            else:
                existing = meds_map_by_subj[subj][key]
                # If any prescription renewal is active, maintain active status
                if active:
                    existing.is_active = True
                    existing.schedule = schedule
                if dosage and not existing.dosage:
                    existing.dosage = dosage

        for subj, m_dict in meds_map_by_subj.items():
            meds_by_subj[subj] = list(m_dict.values())

        # 3. Diagnoses by asiakas_id
        dx_by_subj: Dict[str, List[DiagnosisItem]] = {}
        seen_codes: Dict[str, set] = {}
        for row in raw_data.get("diagnoosi", []):
            subj = row.get("asiakas_id")
            code = row.get("icd10_id")
            if not subj or not code:
                continue
            if subj not in seen_codes:
                seen_codes[subj] = set()
                dx_by_subj[subj] = []
            if code not in seen_codes[subj]:
                seen_codes[subj].add(code)
                titles = ICD10_TITLES.get(code, {
                    "fi": f"Diagnoosi {code}",
                    "sv": f"Diagnos {code}",
                    "en": f"Diagnosis {code}"
                })
                timestamp = row.get("diagnoosi_aikaleima") or "2024"
                diagnosed_year = int(timestamp[:4])
                is_relevant = code in ("M54.5", "J06.9", "M25.5")

                dx_by_subj[subj].append(DiagnosisItem(
                    code=code,
                    title_fi=titles["fi"],
                    title_sv=titles["sv"],
                    title_en=titles["en"],
                    diagnosed_year=diagnosed_year,
                    is_relevant_for_visit=is_relevant
                ))

        # 4. Clinical notes by asiakas_id
        notes_by_subj: Dict[str, List[ClinicalNoteItem]] = {}
        for row in raw_data.get("clinical_notes", []):
            subj = row.get("subject_id")
            if not subj:
                continue
            if subj not in notes_by_subj:
                notes_by_subj[subj] = []
            notes_by_subj[subj].append(ClinicalNoteItem(
                visit_id=row.get("visit_id"),
                visit_date=str(row.get("visit_date", "")),
                clinician_role=row.get("clinician_role", "lääkäri"),
                contact_type=row.get("contact_type"),
                urgency=row.get("urgency"),
                primary_diagnosis_code=row.get("primary_diagnosis_code"),
                note_text=row.get("note_text", "")
            ))

        # 5. Social notes by asiakas_id
        social_by_subj: Dict[str, SocialCareRecord] = {}
        for row in raw_data.get("social_notes", []):
            subj = row.get("subject_id")
            if not subj:
                continue
            social_by_subj[subj] = SocialCareRecord(
                subject_id=subj,
                service=row.get("service", ""),
                service_task=row.get("service_task", ""),
                decision_id=row.get("decision_id"),
                decision_outcome=row.get("decision_outcome", ""),
                decision_date=str(row.get("decision_date", "")),
                decision_text=row.get("decision_text"),
                plan_date=str(row.get("plan_date")) if row.get("plan_date") else None,
                plan_text=row.get("plan_text")
            )

        # 6. Labs by asiakas_id
        labs_by_subj: Dict[str, List[LabResultItem]] = {}
        for row in raw_data.get("labs", []):
            subj = row.get("asiakas_id")
            if not subj:
                continue
            unit = ""
            info = row.get("TulokseenLiittyvaInfokentta") or ""
            if "unit=" in info:
                unit = info.split("unit=")[-1].strip()

            if subj not in labs_by_subj:
                labs_by_subj[subj] = []
            labs_by_subj[subj].append(LabResultItem(
                test_code=str(row.get("PaatutkimuksenNro", "")),
                test_name=str(row.get("PaatutkimuksenLyhenne", "")),
                numeric_value=str(row.get("NumeerinenTutkimustulos", "")),
                unit=unit,
                date=f"2025-0{row.get('NaytteenottoaikaPaiva', 1):02d}-15" if row.get('NaytteenottoaikaPaiva') else None
            ))

        # 7. Build Curated PatientProfiles
        current_year = 2026
        for subj_id, meta in CURATED_PATIENT_METADATA.items():
            demo = asiakas_map.get(subj_id, {})
            birth_year = demo.get("syntymavuosi") or (current_year - 55)
            age = current_year - birth_year
            gender = "Mies" if demo.get("sukupuoli") == "MIES" else "Nainen"
            municipality = demo.get("kotikunta") or "Espoo"
            masked_hetu = f"1405{str(birth_year)[2:]}-***{'Y' if gender == 'Mies' else 'X'}"

            # Ensure patient-1 demo has at least 1 stopped medication for UI review demo
            meds = meds_by_subj.get(subj_id, [])
            if meta["alias_id"] == "patient-1":
                has_inactive = any(not m.is_active for m in meds)
                if not has_inactive:
                    meds.append(MedicationItem(
                        id="med-burana-stopped",
                        name="Burana (Ibuprofeeni)",
                        dosage="600 mg",
                        schedule="Tarvittaessa 1-3 krt/vrk",
                        is_active=False,
                        indication="Tilapäinen lihas- ja nivelkipu",
                        started_year=2024
                    ))

            profile = PatientProfile(
                id=meta["alias_id"],
                first_name=meta["first_name"],
                last_name=meta["last_name"],
                masked_hetu=masked_hetu,
                age=age,
                gender=gender,
                municipality=municipality,
                phone=meta["phone"],
                email=meta["email"],
                preferred_language="fi",
                has_guardian_access=False,
                medications=meds,
                diagnoses=dx_by_subj.get(subj_id, []),
                allergies=meta.get("allergies", []),
                clinical_notes=notes_by_subj.get(subj_id, []),
                social_care=social_by_subj.get(subj_id),
                lab_results=labs_by_subj.get(subj_id, []),
                scenario_tag=meta.get("scenario_tag")
            )

            self._profile_cache[meta["alias_id"]] = profile
            self._profile_cache[subj_id] = profile

    def get_patient(self, patient_id: str) -> Optional[PatientProfile]:
        """Retrieve patient profile by alias (patient-1) or synthetic ID (SYN-ASI-...)."""
        self._lazy_init()
        return self._profile_cache.get(patient_id)

    def get_all_patients(self) -> List[PatientProfile]:
        """Return all curated demonstration patients."""
        self._lazy_init()
        aliases = ["patient-1", "patient-2", "patient-3", "patient-4"]
        return [self._profile_cache[alias] for alias in aliases if alias in self._profile_cache]


# Singleton instance
luvn_data_loader = LuvnDataLoader()
