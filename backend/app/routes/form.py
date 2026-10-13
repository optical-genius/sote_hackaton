from fastapi import APIRouter, HTTPException
from typing import Dict, Any
from ..models.previsit import (
    PrevisitDraftRequest,
    GapQuestionRequest,
    GapQuestionResponse,
    ExtractEntitiesRequest,
    ExtractEntitiesResponse,
    FinalSubmissionPayload,
    ClinicalSummaryResponse
)
from ..services.synthetic_data import get_patient_by_id
from ..services.llm_engine import llm_engine
from ..services.summary_generator import generate_clinical_summary

router = APIRouter(prefix="/api/form", tags=["Form & AI Orchestrator"])

@router.post("/prefill")
async def prefill_form(req: PrevisitDraftRequest):
    """
    Synthesize draft pre-visit form:
    Pulls synthetic EHR data (meds, chronic diagnoses, allergies)
    and merges with visit context.
    """
    patient = get_patient_by_id(req.patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Potilasta ei löytynyt.")

    return {
        "patient": patient,
        "service_id": req.service_id,
        "initial_reason": req.initial_reason,
        "acting_as": req.acting_as,
        "status": "ready_for_review"
    }

@router.post("/next-question", response_model=GapQuestionResponse)
async def get_next_gap_question(req: GapQuestionRequest):
    """
    Conversational gap-filling: Identifies what mandatory information
    is still missing from the pre-visit form and generates a friendly,
    accessible Selkokieli question with contextual quick-reply buttons.
    """
    return llm_engine.determine_next_question(
        service_id=req.service_id,
        current_reason=req.current_reason,
        filled_fields=req.filled_fields,
        language=req.language,
        acting_as=req.acting_as
    )

@router.post("/extract", response_model=ExtractEntitiesResponse)
async def extract_entities(req: ExtractEntitiesRequest):
    """
    Entity extraction: Parses free text or voice speech transcript
    into structured clinical fields (duration, pain scale, accompanying symptoms, daily impact).
    """
    return llm_engine.extract_entities_from_message(
        user_input=req.user_input,
        target_field=req.target_field,
        language=req.language,
        current_data=req.current_data
    )
