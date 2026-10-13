"""
AI clinical questions endpoint — powered by LM Studio (medicus model)
with rule-based fallback for offline/unreachable scenarios.
"""
from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from ..services.lm_studio import get_clinical_questions, generate_doctor_anamnesis

router = APIRouter(prefix="/api/ai", tags=["AI Clinical Assistant"])


class AnalyzeSymptomRequest(BaseModel):
    symptom_text: str
    patient_id: Optional[str] = None
    medications: Optional[List[str]] = []
    language: Optional[str] = "fi"


class GenerateAnamnesisRequest(BaseModel):
    submission_id: str
    reason_for_visit: str
    symptom_duration: Optional[str] = None
    pain_scale: Optional[int] = None
    triage_answers: List[Dict[str, Any]] = []
    medications: List[str] = []
    allergies: List[str] = []
    diagnoses: List[str] = []
    patient_age: Optional[int] = None


@router.post("/analyze-symptom")
async def analyze_symptom(req: AnalyzeSymptomRequest):
    """
    Analyze a patient's symptom description and return 2-6 context-aware
    clinical follow-up questions.
    Prioritizes official LUVN validated protocols (Alaselkäkysely, GAD-7, PHQ-9),
    then LM Studio medicus model, and finally deterministic rule-based fallback.
    """
    result = await get_clinical_questions(
        symptom_text=req.symptom_text,
        medications=req.medications or [],
        language=req.language or "fi"
    )
    return result


@router.post("/generate-anamnesis")
async def generate_anamnesis(req: GenerateAnamnesisRequest):
    """
    Generate a preliminary clinical anamnesis for the doctor
    based on patient symptom description and triage answers.
    Powered by LM Studio medicus model with structured fallback.
    """
    anamnesis = await generate_doctor_anamnesis(
        reason_for_visit=req.reason_for_visit,
        symptom_duration=req.symptom_duration,
        pain_scale=req.pain_scale,
        triage_answers=req.triage_answers,
        medications=req.medications,
        allergies=req.allergies,
        diagnoses=req.diagnoses,
        patient_age=req.patient_age,
    )
    return {"submission_id": req.submission_id, "anamnesis": anamnesis}


@router.get("/health")
async def ai_health():
    """Check Medicus / LM Studio connectivity."""
    import httpx
    from ..services.lm_studio import _get_base_urls, _MODEL, _API_KEY

    base_urls = _get_base_urls()

    for url in base_urls:
        try:
            async with httpx.AsyncClient(timeout=4.0) as client:
                headers = {"Authorization": f"Bearer {_API_KEY}"} if _API_KEY else {}
                r = await client.get(
                    f"{url}/models",
                    headers=headers
                )
                if r.status_code == 200:
                    return {
                        "medicus_status": "online",
                        "url": url,
                        "model": _MODEL,
                        "models_available": r.json()
                    }
        except Exception:
            continue

    return {"medicus_status": "offline", "fallback": "rule_engine_active"}


