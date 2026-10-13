from typing import Dict, Any, List
import datetime
from ..models.previsit import FinalSubmissionPayload, ClinicalSummaryResponse
from .synthetic_data import get_patient_by_id

def generate_clinical_summary(submission: FinalSubmissionPayload, submission_id: str) -> ClinicalSummaryResponse:
    patient = get_patient_by_id(submission.patient_id)
    now_str = datetime.datetime.now().strftime("%d.%m.%Y klo %H:%M")

    patient_name = f"{patient.first_name} {patient.last_name}" if patient else "Tuntematon potilas"
    hetu = patient.masked_hetu if patient else "******-****"
    age = patient.age if patient else "-"

    # Calculate medication discrepancies
    discrepancies: List[Dict[str, str]] = []
    if patient:
        orig_meds = {m.id: m for m in patient.medications}
        for med in submission.confirmed_medications:
            orig = orig_meds.get(med.id)
            if orig:
                if orig.is_active and not med.is_active:
                    discrepancies.append({
                        "item": med.name,
                        "type": "Lääke tauotettu/lopetettu",
                        "details": f"Potilas ilmoittanut lopettaneensa: {med.name} {med.dosage} (Aiemmin aktiivinen kannassa)."
                    })
                elif not orig.is_active and med.is_active:
                    discrepancies.append({
                        "item": med.name,
                        "type": "Lääke aloitettu uudelleen",
                        "details": f"Potilas ottanut uudelleen käyttöön: {med.name} {med.dosage}."
                    })
            else:
                discrepancies.append({
                    "item": med.name,
                    "type": "Uusi lääke lisätty",
                    "details": f"Potilaan itse lisäämä valmiste: {med.name} {med.dosage}."
                })

    # ── Red flag detections ─────────────────────────────────────────────────────
    red_flags: List[str] = []
    pain = submission.pain_scale or 0
    if pain >= 8:
        red_flags.append(f"Korkea kiputaso ({pain}/10) – huomioi kivunhoidon kiireellisyys.")

    accompanying_str = " ".join(submission.accompanying_symptoms).lower()
    if "säteily" in accompanying_str or "puutuminen" in accompanying_str:
        red_flags.append("Raajoihin säteilevä kipu / neurologiset tuntemukset: kliininen status ja heijasteet tarkistettava.")
    if "kuume" in accompanying_str or "lämpö" in accompanying_str:
        red_flags.append("Kuume/lämpöily oireen yhteydessä: infektiofokus poissuljettava.")

    # Enhanced red-flag detection from structured triage answers
    for ta in submission.ai_triage_answers:
        val = ta.answer_value.lower()
        badge = ta.badge
        label = ta.answer_label
        if ta.is_red_flag:
            red_flags.append(f"⚠️ {badge}: {label}")
        elif val in ("cannot_swallow", "severe_stiff", "sharp_pain", "sudden", "yes"):
            red_flags.append(f"⚠️ {badge}: {label}")
        elif val == "mild" and "hengit" in ta.question_text.lower():
            red_flags.append(f"Huomioi: {badge} – hengitys tiheää, seuranta tarpeen.")

    # ── Build structured triage list for doctor panel ──────────────────────────
    triage_structured: List[Dict[str, Any]] = []
    for ta in submission.ai_triage_answers:
        # Determine urgency colour for display
        val = ta.answer_value.lower()
        if ta.is_red_flag or val in ("yes", "cannot_swallow", "severe_stiff", "sharp_pain", "sudden", "none", "10"):
            urgency = "red"
        elif val in ("mild", "hard", "mild_stiff", "little", "partial", "mucus", "7-9"):
            urgency = "yellow"
        else:
            urgency = "green"

        triage_structured.append({
            "question_id": ta.question_id,
            "badge": ta.badge,
            "question_text": ta.question_text,
            "answer_label": ta.answer_label,
            "answer_value": ta.answer_value,
            "urgency": urgency,
        })

    # ── Format lists ────────────────────────────────────────────────────────────
    active_meds = [f"{m.name} {m.dosage} ({m.schedule})" for m in submission.confirmed_medications if m.is_active]
    stopped_meds = [f"{m.name} {m.dosage}" for m in submission.confirmed_medications if not m.is_active]
    allergies_list = [f"{a.allergen} ({a.reaction}, {a.severity})" for a in submission.allergies]

    # Triage answers for markdown (structured block in summary)
    triage_md_lines = []
    for ta in submission.ai_triage_answers:
        flag = "⚠️ " if (ta.is_red_flag or ta.answer_value in ("yes", "cannot_swallow", "severe_stiff", "sharp_pain", "sudden")) else ""
        triage_md_lines.append(f"  * **{ta.badge}:** {flag}{ta.answer_label}")
    triage_md = "\n".join(triage_md_lines) if triage_md_lines else "  * Ei triage-vastauksia tallennettu."

    # ── Markdown Summary FI ────────────────────────────────────────────────────
    acting_text = f"**Asiointi:** Puolesta asiointi ({submission.guardian_name})" if submission.acting_as == "guardian" else "**Asiointi:** Oma asiointi (itse täytetty)"

    summary_fi = f"""### LUVN Esitietokooste lääkärille ja hoitajalle

**Potilas:** {patient_name} ({age} v), Hetu: `{hetu}`  
{acting_text}  
**Tiedot vahvistettu:** {now_str} (Suomi.fi vahva tunnistautuminen, Zero-Touch tarkistettu)  
**Palvelu / Yksikkö:** {submission.service_id.capitalize()}

---

#### 1. Tulosyy ja oireenkuva
* **Pääasiallinen syy:** {submission.reason_for_visit}
* **Oireiden kesto:** {submission.symptom_duration or 'Ei määritelty'}
* **Kipuasteikko (VAS / NRS):** {submission.pain_scale if submission.pain_scale is not None else '-'}/10

#### 2. Kliininen triage-seulonta (Potilaan itse ilmoittama)
{triage_md}

#### 3. Lääkityksen ajantasaisuus (Potilaan vahvistama)
* **Käytössä olevat lääkkeet:** {'; '.join(active_meds) if active_meds else 'Ei säännöllistä lääkitystä'}
* **Potilaan ilmoittamat tauotukset/lopetukset:** {', '.join(stopped_meds) if stopped_meds else 'Ei ilmoitettuja tauotuksia'}

#### 4. Huomioitavat allergiat ja riskitekijät
* **Allergiat:** {'; '.join(allergies_list) if allergies_list else 'Ei tiedossa olevia lääkeaineallergioita'}
* **Kliiniset huomiot:** {' '.join(red_flags) if red_flags else 'Ei akuutteja hälyttäviä punaisia lippuja esitiedoissa.'}
"""

    summary_sv = f"""### LUVN Förhandsuppgifter för läkare och vårdpersonal

**Patient:** {patient_name} ({age} år), Personbeteckning: `{hetu}`  
**Huvudorsak till besöket:** {submission.reason_for_visit}  
**Symtomens längd:** {submission.symptom_duration or 'Ej angiven'}  
**Smärtskala:** {submission.pain_scale if submission.pain_scale is not None else '-'}/10  
**Aktuella läkemedel:** {'; '.join(active_meds) if active_meds else 'Inga regelbundna läkemedel'}  
**Allergier:** {'; '.join(allergies_list) if allergies_list else 'Inga kända allergier'}
"""

    summary_en = f"""### LUVN Pre-visit Clinical Summary

**Patient:** {patient_name} ({age} yrs), Masked SSN: `{hetu}`  
**Primary reason for visit:** {submission.reason_for_visit}  
**Duration of symptoms:** {submission.symptom_duration or 'Not specified'}  
**Pain score (0-10):** {submission.pain_scale if submission.pain_scale is not None else '-'}/10  
**Current medications:** {'; '.join(active_meds) if active_meds else 'No regular medications'}  
**Allergies:** {'; '.join(allergies_list) if allergies_list else 'No known allergies'}
"""

    key_findings = [
        f"Tulosyy: {submission.reason_for_visit[:80]}{'...' if len(submission.reason_for_visit) > 80 else ''}",
        f"Kesto: {submission.symptom_duration or 'Ei ilmoitettu'}",
        f"Kipu: {submission.pain_scale or 0}/10",
        f"Triage-kysely: {len(submission.ai_triage_answers)} vastausta tallennettu",
        f"Lääkkeet vahvistettu: {len(active_meds)} kpl käytössä, {len(stopped_meds)} kpl tauolla"
    ]

    return ClinicalSummaryResponse(
        submission_id=submission_id,
        created_at=now_str,
        summary_markdown_fi=summary_fi,
        summary_markdown_sv=summary_sv,
        summary_markdown_en=summary_en,
        key_findings=key_findings,
        red_flags=red_flags,
        discrepancies=discrepancies,
        validation_status="Itse ilmoitettu ja vahvistettu Suomi.fi-tunnistautumisella",
        triage_structured=triage_structured,
        medicus_anamnesis=None,  # generated on demand via /api/ai/generate-anamnesis
        patient_snapshot={
            "id": patient.id if patient else submission.patient_id,
            "name": patient_name,
            "hetu": hetu,
            "age": age,
            "acting_as": submission.acting_as,
            "guardian_name": submission.guardian_name,
            "municipality": patient.municipality if patient else "LUVN",
            "scenario_tag": getattr(patient, "scenario_tag", None),
            "clinical_notes": [
                (n.model_dump() if hasattr(n, "model_dump") else n.dict())
                for n in getattr(patient, "clinical_notes", [])
            ],
            "social_care": (
                patient.social_care.model_dump() if hasattr(patient.social_care, "model_dump") else patient.social_care.dict()
            ) if getattr(patient, "social_care", None) else None,
            "lab_results": [
                (l.model_dump() if hasattr(l, "model_dump") else l.dict())
                for n, l in enumerate(getattr(patient, "lab_results", []))
            ]
        }
    )


