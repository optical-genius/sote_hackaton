from typing import List, Optional
from pydantic import BaseModel, Field

class MedicationItem(BaseModel):
    id: str
    name: str
    dosage: str
    schedule: str = "1 krt/pvä"
    is_active: bool = True
    indication: Optional[str] = None
    started_year: Optional[int] = None
    user_status_changed: bool = False

class DiagnosisItem(BaseModel):
    code: str
    title_fi: str
    title_sv: str
    title_en: str
    diagnosed_year: int
    is_relevant_for_visit: bool = False

class AllergyItem(BaseModel):
    allergen: str
    reaction: str
    severity: str = "Kohtalainen"  # Lievä, Kohtalainen, Vakava

class ClinicalNoteItem(BaseModel):
    visit_id: Optional[str] = None
    visit_date: str
    clinician_role: str
    contact_type: Optional[str] = None
    urgency: Optional[str] = None
    primary_diagnosis_code: Optional[str] = None
    note_text: str

class SocialCareRecord(BaseModel):
    subject_id: Optional[str] = None
    service: str
    service_task: str
    decision_id: Optional[str] = None
    decision_outcome: str
    decision_date: str
    decision_text: Optional[str] = None
    plan_date: Optional[str] = None
    plan_text: Optional[str] = None

class LabResultItem(BaseModel):
    test_code: str
    test_name: str
    numeric_value: Optional[str] = None
    unit: Optional[str] = None
    date: Optional[str] = None
    flag: Optional[str] = None

class PatientProfile(BaseModel):
    id: str
    first_name: str
    last_name: str
    masked_hetu: str  # e.g., "140568-***Y"
    age: int
    gender: str
    municipality: str  # Espoo, Kirkkonummi, Lohja, Kauniainen (LUVN area)
    phone: str
    email: str
    preferred_language: str = "fi"  # fi, sv, en
    has_guardian_access: bool = False
    guardian_name: Optional[str] = None
    guardian_relationship: Optional[str] = None
    medications: List[MedicationItem] = Field(default_factory=list)
    diagnoses: List[DiagnosisItem] = Field(default_factory=list)
    allergies: List[AllergyItem] = Field(default_factory=list)
    recent_visits: List[str] = Field(default_factory=list)
    clinical_notes: List[ClinicalNoteItem] = Field(default_factory=list)
    social_care: Optional[SocialCareRecord] = None
    lab_results: List[LabResultItem] = Field(default_factory=list)
    scenario_tag: Optional[str] = None
