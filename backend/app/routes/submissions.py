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
