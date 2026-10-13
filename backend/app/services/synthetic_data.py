from typing import List, Optional, Dict
from ..models.patient import PatientProfile, MedicationItem, DiagnosisItem, AllergyItem

SYNTHETIC_PATIENTS: Dict[str, PatientProfile] = {
    "patient-1": PatientProfile(
        id="patient-1",
        first_name="Matti",
        last_name="Virtanen",
        masked_hetu="140568-***Y",
        age=56,
        gender="Mies",
        municipality="Espoo",
        phone="+358 40 123 4567",
        email="matti.virtanen@esimerkki.fi",
        preferred_language="fi",
        has_guardian_access=False,
        medications=[
            MedicationItem(
                id="med-1",
                name="Ramipril",
                dosage="5 mg",
                schedule="1 tabletti aamuisin",
                is_active=True,
                indication="Verenpainetauti",
                started_year=2021
            ),
            MedicationItem(
                id="med-2",
                name="Atorvastatin",
                dosage="20 mg",
                schedule="1 tabletti iltaisin",
                is_active=True,
                indication="Hyperkolesterolemia",
                started_year=2022
            ),
            MedicationItem(
                id="med-3",
                name="Burana (Ibuprofeeni)",
                dosage="600 mg",
                schedule="Tarvittaessa 1-3 krt/vrk kivunhoitoon",
                is_active=False,   # Demo: patient has indicated they stopped using this
                indication="Tilapäinen lihas- ja nivelkipu",
                started_year=2023
            ),
        ],
        diagnoses=[
            DiagnosisItem(
                code="I10",
                title_fi="Essentiaalinen verenpainetauti",
                title_sv="Hypertoni",
                title_en="Essential Hypertension",
                diagnosed_year=2021,
                is_relevant_for_visit=False
            ),
            DiagnosisItem(
                code="E78.0",
                title_fi="Puhdas hyperkolesterolemia",
                title_sv="Ren hyperkolesterolemi",
                title_en="Hypercholesterolemia",
                diagnosed_year=2022,
                is_relevant_for_visit=False
            ),
            DiagnosisItem(
                code="M54.5",
                title_fi="Alaselkäkipu (Lumbago)",
                title_sv="Ländryggsmärta",
                title_en="Low back pain",
                diagnosed_year=2024,
                is_relevant_for_visit=True
            ),
        ],
        allergies=[
            AllergyItem(allergen="Penisilliini", reaction="Nokkosihottuma (urtikaria)", severity="Kohtalainen")
        ],
        recent_visits=[
            "2025-11-12: Terveyskeskuslääkäri, Tapiola (Vuosikontrolli)",
            "2024-05-18: Fysioterapeutti, Matinkylä (Selkäkuntoutus)"
        ]
    ),
    "patient-2": PatientProfile(
        id="patient-2",
        first_name="Aino",
        last_name="Virtanen",
        masked_hetu="120348-***A",
        age=77,
        gender="Nainen",
        municipality="Espoo",
        phone="+358 50 987 6543",
        email="aino.virtanen@esimerkki.fi",
        preferred_language="fi",
        has_guardian_access=True,
        guardian_name="Maija Korhonen (Omaishoitaja / Tytär)",
        guardian_relationship="Omaishoitaja",
        medications=[
            MedicationItem(
                id="med-10",
                name="Metformiini",
                dosage="500 mg",
                schedule="1 tabletti aamuin ja illoin aterian yhteydessä",
                is_active=True,
                indication="Diabetes 2",
                started_year=2018
            ),
            MedicationItem(
                id="med-11",
                name="Ramipriili",
                dosage="5 mg",
                schedule="1 tabletti aamuisin",
                is_active=True,
                indication="Verenpainetauti",
                started_year=2019
            ),
            MedicationItem(
                id="med-12",
                name="Atorvastatiini",
                dosage="20 mg",
                schedule="1 tabletti iltaisin",
                is_active=True,
                indication="Kolesterolilääke",
                started_year=2021
            )
        ],
        diagnoses=[
            DiagnosisItem(
                code="E11",
                title_fi="Tyypin 2 diabetes",
                title_sv="Typ 2-diabetes",
                title_en="Type 2 diabetes mellitus",
                diagnosed_year=2018,
                is_relevant_for_visit=False
            ),
            DiagnosisItem(
                code="I10",
                title_fi="Verenpainetauti",
                title_sv="Hypertoni",
                title_en="Essential Hypertension",
                diagnosed_year=2019,
                is_relevant_for_visit=False
            ),
            DiagnosisItem(
                code="M17",
                title_fi="Polven nivelrikko (Gonartroosi)",
                title_sv="Knäledsartros",
                title_en="Knee osteoarthritis",
                diagnosed_year=2020,
                is_relevant_for_visit=True
            ),
            DiagnosisItem(
                code="M81",
                title_fi="Osteoporoosi",
                title_sv="Osteoporos",
                title_en="Osteoporosis",
                diagnosed_year=2022,
                is_relevant_for_visit=False
            )
        ],
        allergies=[
            AllergyItem(allergen="Tulehduskipulääkkeet (NSAID)", reaction="Mahakipu ja verenvuotoriski Marevanin kanssa", severity="Vakava")
        ],
        recent_visits=[
            "Kardiologia 12.02.2025",
            "2024-09-14: Terveyskeskuslääkäri, Tapiola"
        ]
    ),
    "patient-3": PatientProfile(
        id="patient-3",
        first_name="Jari",
        last_name="Nieminen",
        masked_hetu="050882-***A",
        age=42,
        gender="Mies",
        municipality="Lohja",
        phone="+358 45 444 3322",
        email="jari.nieminen@esimerkki.fi",
        preferred_language="fi",
        has_guardian_access=False,
        medications=[
            MedicationItem(
                id="med-21",
                name="Ventoline Diskus (Salbutamoli)",
                dosage="0.2 mg/annos",
                schedule="Tarvittaessa 1-2 inhalaatiota hengenahdistukseen",
                is_active=True,
                indication="Astma",
                started_year=2015
            ),
            MedicationItem(
                id="med-22",
                name="Flutiform (Flutikasoni/Formoteroli)",
                dosage="125/5 mikrog",
                schedule="2 inhalaatiota 2 krt/vrk säännöllisesti",
                is_active=True,
                indication="Astman ylläpitohoito",
                started_year=2020
            )
        ],
        diagnoses=[
            DiagnosisItem(
                code="J45.0",
                title_fi="Allerginen astma",
                title_sv="Allergisk astma",
                title_en="Allergic asthma",
                diagnosed_year=2015,
                is_relevant_for_visit=True
            )
        ],
        allergies=[
            AllergyItem(allergen="Koivun siitepöly", reaction="Nuha, silmäoireet", severity="Lievä"),
            AllergyItem(allergen="Kissa / Eläinpöly", reaction="Hengenahdistus, vinkuna", severity="Kohtalainen")
        ],
        recent_visits=[
            "2025-04-12: Astmakontrolli ja PEF-seuranta, Lohjan sairaala"
        ]
    ),
    "patient-4": PatientProfile(
        id="patient-4",
        first_name="Sofia",
        last_name="Mäkinen",
        masked_hetu="190393-***B",
        age=31,
        gender="Nainen",
        municipality="Kauniainen",
        phone="+358 40 555 7788",
        email="sofia.makinen@esimerkki.fi",
        preferred_language="sv",
        has_guardian_access=False,
        medications=[
            MedicationItem(
                id="med-31",
                name="Multivita Raskaus ja Imetys",
                dosage="1 tabletti",
                schedule="Päivittäin",
                is_active=True,
                indication="Ravitsemuslisä",
                started_year=2025
            ),
            MedicationItem(
                id="med-32",
                name="Obsidan (Rautalisä)",
                dosage="100 mg",
                schedule="Joka toinen päivä tyhjään mahaan",
                is_active=True,
                indication="Matala ferritiini",
                started_year=2026
            )
        ],
        diagnoses=[
            DiagnosisItem(
                code="Z34",
                title_fi="Normaalin raskauden seuranta",
                title_sv="Övervakning av normal graviditet",
                title_en="Supervision of normal pregnancy",
                diagnosed_year=2026,
                is_relevant_for_visit=True
            )
        ],
        allergies=[],
        recent_visits=[
            "2026-02-14: Äitiysneuvola, Kauniainen (Ensikäynti rvk 9+2)"
        ]
    )
}

def get_all_patients() -> List[PatientProfile]:
    try:
        from .luvn_loader import luvn_data_loader
        if luvn_data_loader.is_available():
            luvn_list = luvn_data_loader.get_all_patients()
            if luvn_list:
                return luvn_list
    except Exception:
        pass
    return list(SYNTHETIC_PATIENTS.values())

def get_patient_by_id(patient_id: str) -> Optional[PatientProfile]:
    try:
        from .luvn_loader import luvn_data_loader
        if luvn_data_loader.is_available():
            p = luvn_data_loader.get_patient(patient_id)
            if p:
                return p
    except Exception:
        pass
    return SYNTHETIC_PATIENTS.get(patient_id)
