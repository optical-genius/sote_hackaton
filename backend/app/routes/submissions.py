from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any
import uuid
import datetime
from ..models.previsit import FinalSubmissionPayload, ClinicalSummaryResponse, MedicationItem, DiagnosisItem, AllergyItem
from ..services.summary_generator import generate_clinical_summary

router = APIRouter(prefix="/api/submissions", tags=["Submissions & Professional View"])

# In-memory storage for active demo session
SUBMISSIONS_STORE: Dict[str, ClinicalSummaryResponse] = {}

# Seed initial completed submissions for demo showcase
def _seed_initial_submission():
    from ..models.previsit import TriageAnswer
    # 1. Matti Virtanen (Alaselkäkipu & LUVN Alaselkäkysely)
    id1 = "LUVN-2026-98124"
    sub1 = FinalSubmissionPayload(
        patient_id="patient-1",
        acting_as="self",
        service_id="fysio",
        language="fi",
        reason_for_visit="Alaselkä kipeytyi 4 päivää sitten nostaessa. Kipu säteilee pakaraan ja alaraajaan, särkylääke ei auta riittävästi.",
        symptom_duration="4 päivää",
        pain_scale=7,
        accompanying_symptoms=["Säteilykipu alaraajaan", "Liikkumisen vaikeutuminen"],
        ai_triage_answers=[
            TriageAnswer(
                question_id="q1",
                badge="LUVN Alaselkäkysely • Voimakkuus",
                question_text="Kipu tällä hetkellä alaselässä (asteikolla 1–10)",
                answer_value="7-9",
                answer_label="7–9 Voimakas",
                is_red_flag=False
            ),
            TriageAnswer(
                question_id="q2",
                badge="LUVN Turvakysymys • Säteily",
                question_text="Säteilykipu: säteileekö kipu alaselästä toiseen tai molempiin alaraajoihin polven alapuolelle?",
                answer_value="mild",
                answer_label="Lievää säteilyä reiteen",
                is_red_flag=False
            ),
            TriageAnswer(
                question_id="q3",
                badge="LUVN Oirekartoitus • Toimintakyky",
                question_text="Kivun kesto ja arjen toimintakyky: kauanko alaselkäkipu on jatkunut ja haittaako se liikkumista tai nukkumista?",
                answer_value="subacute_mod",
                answer_label="1–4 viikkoa • Selvästi haittaa",
                is_red_flag=False
            )
        ],
        impact_on_daily_life="Vaikeuttaa kumartumista, sukkien pukemista ja autolla ajoa.",
        confirmed_medications=[
            MedicationItem(
                id="med-1",
                name="Amlodipiini (C08CA01)",
                dosage="5 mg",
                schedule="1 tabletti aamuisin",
                is_active=True,
                indication="Verenpainetauti",
                started_year=2023
            ),
            MedicationItem(
                id="med-burana-stopped",
                name="Burana (Ibuprofeeni)",
                dosage="600 mg",
                schedule="Tarvittaessa",
                is_active=False,
                indication="Potilas ilmoitti lopettaneensa tehon puutteen vuoksi",
                started_year=2024,
                user_status_changed=True
            )
        ],
        confirmed_diagnoses=[
            DiagnosisItem(
                code="M54.5",
                title_fi="Alaselkäkipu (Lumbago)",
                title_sv="Ländryggsmärta",
                title_en="Low back pain",
                diagnosed_year=2024,
                is_relevant_for_visit=True
            ),
            DiagnosisItem(
                code="I10",
                title_fi="Essentiaalinen verenpainetauti",
                title_sv="Essentiell hypertoni",
                title_en="Essential hypertension",
                diagnosed_year=2022,
                is_relevant_for_visit=False
            )
        ],
        allergies=[],
        consent_given=True,
        ai_assisted_structuring=True
    )
    SUBMISSIONS_STORE[id1] = generate_clinical_summary(sub1, id1)

    # 2. Juhani Korhonen (Nivelkipu + Säännöllinen kotihoito / SOTE-integraatio)
    id2 = "LUVN-2026-98125"
    sub2 = FinalSubmissionPayload(
        patient_id="patient-2",
        acting_as="self",
        service_id="yleislaakari",
        language="fi",
        reason_for_visit="Olkapään ja nivelten kipu pahentunut. Kotihoidon hoitaja suositteli lääkärin arviota särkylääkkeen ja toimintakyvyn tarkistamiseksi.",
        symptom_duration="3 viikkoa",
        pain_scale=6,
        accompanying_symptoms=["Niveljäykkyys", "Yläraajan liikerajoitus"],
        ai_triage_answers=[
            TriageAnswer(
                question_id="q1",
                badge="Voinnin voimakkuus",
                question_text="Kivun voimakkuus asteikolla 1–10",
                answer_value="4-6",
                answer_label="4–6 Selvästi haittaa arjessa",
                is_red_flag=False
            ),
            TriageAnswer(
                question_id="q2",
                badge="Turvakysymys",
                question_text="Liittyykö oireeseen nivelten kuumotusta tai yleisoireita?",
                answer_value="no",
                answer_label="Ei kuumotusta tai kuumetta",
                is_red_flag=False
            )
        ],
        impact_on_daily_life="Pukeutuminen ja yläkaapeille kurottaminen vaikeutunut. Kotihoito auttaa aamutoimissa.",
        confirmed_medications=[
            MedicationItem(
                id="med-1",
                name="Diklofenaakki (M02AA15)",
                dosage="Geeli 2-3 krt/pvä",
                schedule="Tarvittaessa",
                is_active=True,
                indication="Nivelkipu",
                started_year=2025
            )
        ],
        confirmed_diagnoses=[
            DiagnosisItem(
                code="M25.5",
                title_fi="Nivelkipu (Artalgia)",
                title_sv="Ledvärk",
                title_en="Pain in joint",
                diagnosed_year=2025,
                is_relevant_for_visit=True
            )
        ],
        allergies=[],
        consent_given=True,
        ai_assisted_structuring=True
    )
    SUBMISSIONS_STORE[id2] = generate_clinical_summary(sub2, id2)

    # 3. Aino Lehtonen (Ylähengitystieinfektio + Ampisilliiniallergia)
    id3 = "LUVN-2026-98126"
    sub3 = FinalSubmissionPayload(
        patient_id="patient-3",
        acting_as="self",
        service_id="yleislaakari",
        language="fi",
        reason_for_visit="Kova kurkkukipu ja kuume (38.4°C) kestäneet 2 päivää. Nielemiskipu vaikeuttaa syömistä.",
        symptom_duration="2 päivää",
        pain_scale=6,
        accompanying_symptoms=["Kuume", "Nielemiskipu", "Kurkkukipu"],
        ai_triage_answers=[
            TriageAnswer(
                question_id="q1",
                badge="Voinnin voimakkuus",
                question_text="Kivun voimakkuus asteikolla 1–10",
                answer_value="4-6",
                answer_label="4–6 Nielemiskipu voimakasta",
                is_red_flag=False
            ),
            TriageAnswer(
                question_id="q2",
                badge="LUVN Turvakysymys • Hengitys",
                question_text="Onko hengitysvaikeutta tai vaikeutta avata suuta?",
                answer_value="no",
                answer_label="Ei hengenahdistusta, suu aukeaa normaalisti",
                is_red_flag=False
            )
        ],
        impact_on_daily_life="Pois töistä sairauden vuoksi, nesteiden nauttiminen onnistuu.",
        confirmed_medications=[],
        confirmed_diagnoses=[
            DiagnosisItem(
                code="J06.9",
                title_fi="Akuutti ylähengitystieinfektio",
                title_sv="Akut övre luftvägsinfektion",
                title_en="Acute upper respiratory infection",
                diagnosed_year=2025,
                is_relevant_for_visit=True
            )
        ],
        allergies=[
            AllergyItem(
                allergen="Ampisilliini (Penissilliiniryhmä)",
                reaction="Urtikaria ja hengenahdistus",
                severity="Vaikea"
            )
        ],
        consent_given=True,
        ai_assisted_structuring=True
    )
    SUBMISSIONS_STORE[id3] = generate_clinical_summary(sub3, id3)

    # 4. Marja Mäkinen (Alaselkäkipu & Kilpirauhasen vajaatoiminta)
    id4 = "LUVN-2026-98127"
    sub4 = FinalSubmissionPayload(
        patient_id="patient-4",
        acting_as="self",
        service_id="yleislaakari",
        language="fi",
        reason_for_visit="Pitkittynyt alaselkäkipu ja yleinen väsymys. Thyroxin-lääkityksen annostus ja verikokeet (TSH) kaipaavat tarkistusta.",
        symptom_duration="Yli kuukausi",
        pain_scale=5,
        accompanying_symptoms=["Aamujäykkyys", "Uupumus"],
        ai_triage_answers=[
            TriageAnswer(
                question_id="q1",
                badge="LUVN Oirekartoitus",
                question_text="Selkäkivun haittaavuus arjessa",
                answer_value="moderate",
                answer_label="Haittaa kävelyä ja nostamista",
                is_red_flag=False
            ),
            TriageAnswer(
                question_id="q2",
                badge="Turvakysymys",
                question_text="Onko raajojen puutumista tai suolen/rakon toimintahäiriöitä?",
                answer_value="no",
                answer_label="Ei tuntohäiriöitä tai sulkijalihasoireita",
                is_red_flag=False
            )
        ],
        impact_on_daily_life="Puutarhatyöt ja pidemmät kävelylenkit jääneet väliin kivun vuoksi.",
        confirmed_medications=[
            MedicationItem(
                id="med-thyroxin",
                name="Thyroxin (Levotyroksiini)",
                dosage="100 µg",
                schedule="1 tabletti aamuisin tyhjään mahaan",
                is_active=True,
                indication="Kilpirauhasen vajaatoiminta",
                started_year=2021
            )
        ],
        confirmed_diagnoses=[
            DiagnosisItem(
                code="E03.9",
                title_fi="Hypotyreoosi (Kilpirauhasen vajaatoiminta)",
                title_sv="Hypotyreos",
                title_en="Hypothyroidism",
                diagnosed_year=2021,
                is_relevant_for_visit=True
            ),
            DiagnosisItem(
                code="M54.5",
                title_fi="Alaselkäkipu",
                title_sv="Ländryggssmärta",
                title_en="Low back pain",
                diagnosed_year=2025,
                is_relevant_for_visit=True
            )
        ],
        allergies=[],
        consent_given=True,
        ai_assisted_structuring=True
    )
    SUBMISSIONS_STORE[id4] = generate_clinical_summary(sub4, id4)

    # 5. Tapio Heikkinen (Polymyalgia, verenpaine, astma - 9 diagnoosia, 9 lääkettä)
    id5 = "LUVN-2026-98128"
    sub5 = FinalSubmissionPayload(
        patient_id="patient-5",
        acting_as="self",
        service_id="yleislaakari",
        language="fi",
        reason_for_visit="Voimakas aamujäykkyys ja lihassärky hartioissa ja lonkissa (Polymyalgia epäily/paheneminen). Myös astman hengenahdistusta rasituksessa.",
        symptom_duration="3 viikkoa",
        pain_scale=6,
        accompanying_symptoms=["Lihassärky hartioissa ja lonkissa", "Aamujäykkyys > 1h", "Hengenahdistus rasituksessa"],
        ai_triage_answers=[
            TriageAnswer(
                question_id="q1",
                badge="LUVN Reuma / Lihasoirekysely",
                question_text="Aamujäykkyyden kesto ja sijainti",
                answer_value="over_1h",
                answer_label="Yli 1 tunti, symmetrisesti hartioissa ja reisissä",
                is_red_flag=False
            ),
            TriageAnswer(
                question_id="q2",
                badge="Turvakysymys • Temporaaliartriitti",
                question_text="Onko ohimopäänsärkyä, leukakipua pureskeltaessa tai näköhäiriöitä?",
                answer_value="no",
                answer_label="Ei ohimosärkyä tai näköoireita",
                is_red_flag=False
            ),
            TriageAnswer(
                question_id="q3",
                badge="Astman hoitotasapaino",
                question_text="Avaavan astmalääkkeen käyttötiheys",
                answer_value="often",
                answer_label="Avaavaa tarvittu 3–4 krt viikossa rasituksessa",
                is_red_flag=False
            )
        ],
        impact_on_daily_life="Pukeminen ja aamulla sängystä nouseminen hyvin hidasta kivun ja kankeuden vuoksi.",
        confirmed_medications=[
            MedicationItem(
                id="med-5-1",
                name="Prednisolon (H02AB06)",
                dosage="10 mg",
                schedule="Aamuisin",
                is_active=True,
                indication="Polymyalgia rheumatica",
                started_year=2024
            ),
            MedicationItem(
                id="med-5-2",
                name="Ramipriili (C09AA05)",
                dosage="5 mg",
                schedule="1 tabletti aamuisin",
                is_active=True,
                indication="Verenpainetauti",
                started_year=2023
            ),
            MedicationItem(
                id="med-5-3",
                name="Symbicort (Budesonidi/Formoteroli)",
                dosage="160/4.5 µg",
                schedule="1 inhalaatio 2 krt/vrk",
                is_active=True,
                indication="Astma",
                started_year=2022
            ),
            MedicationItem(
                id="med-5-4",
                name="Ventoline (Salbutamoli)",
                dosage="0.1 mg/annos",
                schedule="Tarvittaessa 1-2 inhalaatiota",
                is_active=True,
                indication="Astman kohtauslääke",
                started_year=2022
            ),
            MedicationItem(
                id="med-5-5",
                name="Atorvastatiini (C10AA05)",
                dosage="20 mg",
                schedule="Iltaisin",
                is_active=True,
                indication="Hyperkolesterolemia",
                started_year=2023
            )
        ],
        confirmed_diagnoses=[
            DiagnosisItem(
                code="M35.3",
                title_fi="Polymyalgia rheumatica",
                title_sv="Polymyalgia rheumatica",
                title_en="Polymyalgia rheumatica",
                diagnosed_year=2024,
                is_relevant_for_visit=True
            ),
            DiagnosisItem(
                code="J45.9",
                title_fi="Määrittämätön astma",
                title_sv="Astma, ospecificerad",
                title_en="Asthma, unspecified",
                diagnosed_year=2022,
                is_relevant_for_visit=True
            ),
            DiagnosisItem(
                code="I10",
                title_fi="Essentiaalinen verenpainetauti",
                title_sv="Essentiell hypertoni",
                title_en="Essential hypertension",
                diagnosed_year=2023,
                is_relevant_for_visit=False
            )
        ],
        allergies=[
            AllergyItem(
                allergen="Sulfonamidit (Trimetopriimi-sulfa)",
                reaction="Laaja allerginen ihottuma ja kasvojen turvotus",
                severity="Kohtalainen"
            )
        ],
        consent_given=True,
        ai_assisted_structuring=True
    )
    SUBMISSIONS_STORE[id5] = generate_clinical_summary(sub5, id5)

    # 6. Helena Koskinen (Krooninen monisairaus: 11 diagnoosia, 7 lääkettä)
    id6 = "LUVN-2026-98129"
    sub6 = FinalSubmissionPayload(
        patient_id="patient-6",
        acting_as="self",
        service_id="yleislaakari",
        language="fi",
        reason_for_visit="Nivelkivut useissa nivelissä, uupumus ja kohonnut verenpaine kotiseurannassa (155/95). Lääkehoidon kokonaisarviointi ja laboratoriovastaukset.",
        symptom_duration="1 kuukausi",
        pain_scale=6,
        accompanying_symptoms=["Useiden nivelten särky", "Kohonnut verenpaine kotona", "Jatkuva uupumus"],
        ai_triage_answers=[
            TriageAnswer(
                question_id="q1",
                badge="Kroonisen taudin seuranta",
                question_text="Verenpainearvot kotiseurannassa viimeisen viikon ajalta",
                answer_value="150-160/90-95",
                answer_label="155/95 mmHg keskiarvo (koholla)",
                is_red_flag=False
            ),
            TriageAnswer(
                question_id="q2",
                badge="Turvakysymys • Verenpaine",
                question_text="Onko rintakipua, hengenahdistusta tai kovaa äkillistä päänsärkyä?",
                answer_value="no",
                answer_label="Ei rintakipua tai äkillistä päänsärkyä",
                is_red_flag=False
            ),
            TriageAnswer(
                question_id="q3",
                badge="Lääkehoidon toteutuminen",
                question_text="Onko säännöllinen lääkitys toteutunut ohjeen mukaan?",
                answer_value="mostly",
                answer_label="Kyllä, mutta nesteenpoistolääkkeen annosta mietitty",
                is_red_flag=False
            )
        ],
        impact_on_daily_life="Uupumus haittaa työpäivistä palautumista. Sorminivelten jäykkyys vaikeuttaa näppäimistöllä työskentelyä.",
        confirmed_medications=[
            MedicationItem(
                id="med-6-1",
                name="Amlodipiini (C08CA01)",
                dosage="5 mg",
                schedule="1 tabletti aamuisin",
                is_active=True,
                indication="Verenpainetauti",
                started_year=2023
            ),
            MedicationItem(
                id="med-6-2",
                name="Losartaani (C09CA01)",
                dosage="50 mg",
                schedule="1 tabletti aamuisin",
                is_active=True,
                indication="Verenpainetauti",
                started_year=2023
            ),
            MedicationItem(
                id="med-6-3",
                name="Hydroklooritiatsidi (C03AA03)",
                dosage="12.5 mg",
                schedule="1 tabletti aamuisin",
                is_active=True,
                indication="Verenpainetauti / Nesteenpoisto",
                started_year=2024
            ),
            MedicationItem(
                id="med-6-4",
                name="Metformiini (A10BA02)",
                dosage="500 mg",
                schedule="1 tabletti 2 krt/vrk",
                is_active=True,
                indication="Tyypin 2 diabetes",
                started_year=2024
            ),
            MedicationItem(
                id="med-6-5",
                name="Parasetamoli (N02BE01)",
                dosage="1 g",
                schedule="Tarvittaessa 1-3 krt/vrk",
                is_active=True,
                indication="Nivelkipu",
                started_year=2023
            )
        ],
        confirmed_diagnoses=[
            DiagnosisItem(
                code="I10",
                title_fi="Essentiaalinen verenpainetauti",
                title_sv="Essentiell hypertoni",
                title_en="Essential hypertension",
                diagnosed_year=2023,
                is_relevant_for_visit=True
            ),
            DiagnosisItem(
                code="E11.9",
                title_fi="Tyypin 2 diabetes ilman lisäsairauksia",
                title_sv="Icke-insulinberoende diabetes mellitus",
                title_en="Type 2 diabetes mellitus",
                diagnosed_year=2024,
                is_relevant_for_visit=True
            ),
            DiagnosisItem(
                code="M19.9",
                title_fi="Nivelrikko (Artroosi)",
                title_sv="Artros",
                title_en="Osteoarthritis",
                diagnosed_year=2023,
                is_relevant_for_visit=True
            )
        ],
        allergies=[],
        consent_given=True,
        ai_assisted_structuring=True
    )
    SUBMISSIONS_STORE[id6] = generate_clinical_summary(sub6, id6)

    # 7. Seija Nieminen (Ikääntynyt monisairas: 11 diagnoosia, 7 lääkettä, Burana/NSAID allergia)
    id7 = "LUVN-2026-98130"
    sub7 = FinalSubmissionPayload(
        patient_id="patient-7",
        acting_as="self",
        service_id="yleislaakari",
        language="fi",
        reason_for_visit="Polven nivelrikon kipu pahentunut portaissa kulkiessa. Ibuprofeeni/Burana aiheuttaa vaikeaa närästystä ja vatsakipua, joten tarvitaan turvallinen kivunhoitosuunnitelma.",
        symptom_duration="2 kuukautta",
        pain_scale=7,
        accompanying_symptoms=["Polven rasituskipu", "Turvotus polvinivelessä kävelyn jälkeen"],
        ai_triage_answers=[
            TriageAnswer(
                question_id="q1",
                badge="LUVN Nivelrikkokysely",
                question_text="Kivun luonne ja liikuntakyky",
                answer_value="stairs_pain",
                answer_label="Kipu pahinta portaissa ja levossa kävelyn jälkeen",
                is_red_flag=False
            ),
            TriageAnswer(
                question_id="q2",
                badge="Lääkehaitta / Turvakysymys",
                question_text="Onko ilmennyt mustia ulosteita tai vakavaa ylävatsakipua?",
                answer_value="no",
                answer_label="Ei verenvuoto-oireita, vain närästystä Buranasta",
                is_red_flag=False
            )
        ],
        impact_on_daily_life="Kaupassakäynti vaikeutunut, liikkuminen kotona rajoittunutta kivun vuoksi.",
        confirmed_medications=[
            MedicationItem(
                id="med-7-1",
                name="Metformiini (A10BA02)",
                dosage="1000 mg",
                schedule="1 tabletti 2 krt/vrk aterioilla",
                is_active=True,
                indication="Tyypin 2 diabetes",
                started_year=2022
            ),
            MedicationItem(
                id="med-7-2",
                name="Bisoprololi (C07AB07)",
                dosage="5 mg",
                schedule="1 tabletti aamuisin",
                is_active=True,
                indication="Verenpainetauti ja rytmihäiriötaipumus",
                started_year=2021
            ),
            MedicationItem(
                id="med-7-3",
                name="Atorvastatiini (C10AA05)",
                dosage="20 mg",
                schedule="1 tabletti iltaisin",
                is_active=True,
                indication="Dyslipidemia",
                started_year=2021
            ),
            MedicationItem(
                id="med-7-4",
                name="Parasetamoli (N02BE01)",
                dosage="1 g",
                schedule="Tarvittaessa max 3 krt/vrk",
                is_active=True,
                indication="Nivelrikkokipu (ensisijainen särkylääke)",
                started_year=2023
            ),
            MedicationItem(
                id="med-burana-allergy-7",
                name="Burana (Ibuprofeeni)",
                dosage="600 mg",
                schedule="Lopetettu haittavaikutuksen vuoksi",
                is_active=False,
                indication="Aiheutti vaikeaa ylävatsakipua (NSAID-haitta)",
                started_year=2024,
                user_status_changed=True
            )
        ],
        confirmed_diagnoses=[
            DiagnosisItem(
                code="M17.1",
                title_fi="Ensisijainen polvinivelrikko (Gonartroosi)",
                title_sv="Primär artros i knäled",
                title_en="Primary gonarthrosis",
                diagnosed_year=2023,
                is_relevant_for_visit=True
            ),
            DiagnosisItem(
                code="E11.9",
                title_fi="Tyypin 2 diabetes",
                title_sv="Icke-insulinberoende diabetes mellitus",
                title_en="Type 2 diabetes mellitus",
                diagnosed_year=2022,
                is_relevant_for_visit=True
            ),
            DiagnosisItem(
                code="I10",
                title_fi="Essentiaalinen verenpainetauti",
                title_sv="Essentiell hypertoni",
                title_en="Essential hypertension",
                diagnosed_year=2021,
                is_relevant_for_visit=False
            )
        ],
        allergies=[
            AllergyItem(
                allergen="Tulehduskipulääkkeet (NSAID / Ibuprofeeni)",
                reaction="Vaikea ylävatsakipu, dyspepsia ja närästys",
                severity="Kohtalainen"
            )
        ],
        consent_given=True,
        ai_assisted_structuring=True
    )
    SUBMISSIONS_STORE[id7] = generate_clinical_summary(sub7, id7)

    # 8. Pentti Järvinen (Geriatrinen monilääkitys: 8 diagnoosia, 6 aktiivista lääkettä, huimaus)
    id8 = "LUVN-2026-98131"
    sub8 = FinalSubmissionPayload(
        patient_id="patient-8",
        acting_as="self",
        service_id="yleislaakari",
        language="fi",
        reason_for_visit="Aamuhuimausta ja kaatumisen pelkoa sängystä noustessa. Kotihoidon hoitaja mittasi matalan verenpaineen (ortostatismi) ja pyysi lääkityksen arviota.",
        symptom_duration="2 viikkoa",
        pain_scale=4,
        accompanying_symptoms=["Asentohuimaus pystyyn noustessa", "Uupumus", "Tasapainon epävarmuus"],
        ai_triage_answers=[
            TriageAnswer(
                question_id="q1",
                badge="LUVN Geriatrinen kartoitus",
                question_text="Huimauksen ilmeneminen",
                answer_value="postural",
                answer_label="Pystyyn noustessa ja aamuisin lääkkeiden jälkeen",
                is_red_flag=False
            ),
            TriageAnswer(
                question_id="q2",
                badge="Turvakysymys • Tajuttomuus",
                question_text="Onko esiintynyt tajunnanmenetystä tai kaatumisia?",
                answer_value="close_call",
                answer_label="Horjahtanut seinään, ei varsinaista tajuttomuutta",
                is_red_flag=False
            )
        ],
        impact_on_daily_life="Ulkona liikkuminen ilman tukea arveluttaa kaatumispelon vuoksi.",
        confirmed_medications=[
            MedicationItem(
                id="med-8-1",
                name="Ramipriili (C09AA05)",
                dosage="5 mg",
                schedule="1 tabletti aamuisin",
                is_active=True,
                indication="Verenpainetauti ja sydämen vajaatoiminnan esto",
                started_year=2020
            ),
            MedicationItem(
                id="med-8-2",
                name="Furosemidi (C03CA01)",
                dosage="20 mg",
                schedule="1 tabletti aamuisin",
                is_active=True,
                indication="Nesteenpoistolääke",
                started_year=2021
            ),
            MedicationItem(
                id="med-8-3",
                name="Bisoprololi (C07AB07)",
                dosage="2.5 mg",
                schedule="1 tabletti aamuisin",
                is_active=True,
                indication="Sydämen rytmihäiriöt",
                started_year=2020
            ),
            MedicationItem(
                id="med-8-4",
                name="Atorvastatiini (C10AA05)",
                dosage="20 mg",
                schedule="1 tabletti iltaisin",
                is_active=True,
                indication="Hyperkolesterolemia",
                started_year=2019
            ),
            MedicationItem(
                id="med-8-5",
                name="Metformiini (A10BA02)",
                dosage="500 mg",
                schedule="1 tabletti 2 krt/vrk",
                is_active=True,
                indication="Tyypin 2 diabetes",
                started_year=2022
            ),
            MedicationItem(
                id="med-8-6",
                name="Mirtatsapiini (N06AX11)",
                dosage="15 mg",
                schedule="1 tabletti iltaisin unettomuuteen",
                is_active=True,
                indication="Unettomuus / mieliala",
                started_year=2023
            )
        ],
        confirmed_diagnoses=[
            DiagnosisItem(
                code="I10",
                title_fi="Essentiaalinen verenpainetauti",
                title_sv="Essentiell hypertoni",
                title_en="Essential hypertension",
                diagnosed_year=2019,
                is_relevant_for_visit=True
            ),
            DiagnosisItem(
                code="I50.9",
                title_fi="Sydämen vajaatoiminta",
                title_sv="Hjärtsvikt",
                title_en="Heart failure",
                diagnosed_year=2021,
                is_relevant_for_visit=True
            ),
            DiagnosisItem(
                code="E11.9",
                title_fi="Tyypin 2 diabetes",
                title_sv="Icke-insulinberoende diabetes mellitus",
                title_en="Type 2 diabetes mellitus",
                diagnosed_year=2022,
                is_relevant_for_visit=False
            ),
            DiagnosisItem(
                code="R42",
                title_fi="Huimaus ja heitehuimaus",
                title_sv="Yrsel",
                title_en="Dizziness and giddiness",
                diagnosed_year=2026,
                is_relevant_for_visit=True
            )
        ],
        allergies=[],
        consent_given=True,
        ai_assisted_structuring=True
    )
    SUBMISSIONS_STORE[id8] = generate_clinical_summary(sub8, id8)

_seed_initial_submission()

@router.post("", response_model=ClinicalSummaryResponse)
async def submit_previsit(payload: FinalSubmissionPayload):
    """
    Final submission of verified pre-visit information.
    Generates structured doctor summary, checks discrepancies with EHR baseline,
    and stores in the professional registry.
    """
    sub_id = f"LUVN-2026-{uuid.uuid4().hex[:5].upper()}"
    summary = generate_clinical_summary(payload, sub_id)
    SUBMISSIONS_STORE[sub_id] = summary
    return summary

@router.get("", response_model=List[ClinicalSummaryResponse])
async def list_submissions():
    """List all submissions for professional care team dashboard."""
    return list(SUBMISSIONS_STORE.values())

@router.get("/{submission_id}", response_model=ClinicalSummaryResponse)
async def get_submission(submission_id: str):
    """Retrieve detailed submission and clinical brief by ID."""
    sub = SUBMISSIONS_STORE.get(submission_id)
    if not sub:
        raise HTTPException(status_code=404, detail="Esitietopakettia ei löytynyt.")
    return sub

@router.post("/{submission_id}/action")
async def perform_clinical_action(submission_id: str, action: Dict[str, str]):
    """Update clinical status (e.g., 'otettu_kasittelyyn', 'kuittaus')."""
    sub = SUBMISSIONS_STORE.get(submission_id)
    if not sub:
        raise HTTPException(status_code=404, detail="Esitietopakettia ei löytynyt.")
    
    act_type = action.get("action", "acknowledged")
    sub.validation_status = f"Käsitelty: {act_type} ({datetime.datetime.now().strftime('%H:%M')})"
    return {"status": "ok", "updated_validation_status": sub.validation_status}
