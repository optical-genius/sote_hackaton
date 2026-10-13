from fastapi import APIRouter, HTTPException
from typing import List
from ..models.patient import PatientProfile
from ..services.synthetic_data import get_all_patients, get_patient_by_id

router = APIRouter(prefix="/api/patients", tags=["Patients"])

@router.get("", response_model=List[PatientProfile])
async def list_patients():
    """Retrieve list of synthetic patient profiles (Veil.AI mock data)."""
    return get_all_patients()

@router.get("/{patient_id}", response_model=PatientProfile)
async def get_patient(patient_id: str):
    """Retrieve single patient profile by ID."""
    patient = get_patient_by_id(patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Potilasprofiilia ei löytynyt.")
    return patient
