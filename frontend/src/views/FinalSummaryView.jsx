import React, { useState } from 'react';
import { CheckCircle2, ShieldCheck, FileText, Send, ArrowLeft, ArrowRight, Stethoscope, Clock, AlertTriangle } from 'lucide-react';
import { api } from '../services/api';

export default function FinalSummaryView({
  patient,
  actingAs,
  selectedService,
  reasonForVisit,
  filledData,
  medications,
  diagnoses,
  allergies,
  currentLang,
  onBack,
  onViewProfessional,
  t
}) {
  const [consent1, setConsent1] = useState(true);
  const [consent2, setConsent2] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState(null);

  const activeMeds = medications.filter(m => m.is_active);
  const stoppedMeds = medications.filter(m => !m.is_active);
  const relevantDiags = diagnoses.filter(d => d.is_relevant_for_visit);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const payload = {
        patient_id: patient.id,
        acting_as: actingAs,
        guardian_name: actingAs === 'guardian' ? patient.guardian_name : null,
        service_id: selectedService,
        language: currentLang,
        reason_for_visit: reasonForVisit,
        symptom_duration: filledData.symptom_duration || null,
        pain_scale: filledData.pain_scale !== undefined ? filledData.pain_scale : null,
        accompanying_symptoms: filledData.accompanying_symptoms || [],
        impact_on_daily_life: filledData.impact_on_daily_life || null,
        confirmed_medications: medications,
        confirmed_diagnoses: diagnoses,
        allergies: allergies,
        consent_given: consent1 && consent2,
        ai_assisted_structuring: true
      };

      const result = await api.submitPrevisit(payload);
      setSubmissionResult(result);
    } catch (err) {
      console.error('Submission error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Success State Screen
  if (submissionResult) {
    return (
      <div className="content-card" style={{ textAlign: 'center', padding: '48px 24px' }}>
        <div style={{
          width: 72,
          height: 72,
          borderRadius: '50%',
          backgroundColor: '#dcfce7',
          color: '#15803d',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px'
        }}>
          <CheckCircle2 size={44} />
        </div>

        <h2 style={{ fontSize: '1.8rem', color: '#166534', marginBottom: '8px' }}>
          {t.successTitle}
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', maxWidth: '600px', margin: '0 auto 24px' }}>
          {t.successSub}
        </p>

        {/* Reference Code Box */}
        <div style={{
          background: '#f8fafc',
          border: '2px dashed var(--primary)',
          borderRadius: 'var(--radius-md)',
          padding: '16px 24px',
          display: 'inline-block',
          marginBottom: '32px'
        }}>
          <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
            {t.referenceCode}
          </span>
          <span style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--primary)', letterSpacing: '1px' }}>
            {submissionResult.submission_id}
          </span>
        </div>

        {/* Next Steps Guidance */}
        <div style={{ maxWidth: '640px', margin: '0 auto 36px', textAlign: 'left', background: 'white', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '24px' }}>
          <h3 style={{ fontSize: '1.2rem', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={20} style={{ color: 'var(--primary)' }} />
            {t.nextStepsTitle}
          </h3>
          <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '1rem', color: 'var(--text-main)' }}>
            <li>{t.stepNext1}</li>
            <li>{t.stepNext2}</li>
            <li>Tiedot on tallennettu Kanta-yhteensopivaan muotoon ja suojattu salauksella.</li>
          </ul>
        </div>

        {/* Call to action for Hackathon Demo: Jump to Doctor View */}
        <button
          type="button"
          className="btn-primary"
          onClick={() => onViewProfessional(submissionResult.submission_id)}
          style={{ fontSize: '1.1rem', padding: '14px 28px' }}
        >
          <Stethoscope size={20} />
          <span>{t.btnViewProfessional}</span>
          <ArrowRight size={20} />
        </button>
      </div>
    );
  }

  // Pre-submission Review Screen
  return (
    <div className="content-card">
      <div className="card-title-group">
        <h2>{t.screen4Title}</h2>
        <p>{t.screen4Subtitle}</p>
      </div>

      {/* Structured Summary Package Card */}
      <div style={{ background: '#f8fafc', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '24px', marginBottom: '24px' }}>
        <h3 style={{ fontSize: '1.2rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary)' }}>
          <FileText size={20} />
          {t.summaryCardTitle}
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
          {/* Reason & Symptoms */}
          <div style={{ background: 'white', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <h4 style={{ fontSize: '0.95rem', color: 'var(--text-muted)', marginBottom: '8px' }}>Tulosyy ja oireet</h4>
            <p style={{ fontWeight: 700, fontSize: '1.05rem', marginBottom: '8px' }}>{reasonForVisit}</p>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-main)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div>Kesto: <strong>{filledData.symptom_duration || 'Ei määritelty'}</strong></div>
              <div>Kipuaste: <strong>{filledData.pain_scale !== undefined ? `${filledData.pain_scale}/10` : 'Ei arviota'}</strong></div>
              {filledData.accompanying_symptoms && filledData.accompanying_symptoms.length > 0 && (
                <div>Liitännäisoireet: <strong>{filledData.accompanying_symptoms.join(', ')}</strong></div>
              )}
              {filledData.impact_on_daily_life && (
                <div>Arjen haitta: <strong>{filledData.impact_on_daily_life}</strong></div>
              )}
            </div>
          </div>

          {/* Confirmed Medications */}
          <div style={{ background: 'white', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <h4 style={{ fontSize: '0.95rem', color: 'var(--text-muted)', marginBottom: '8px' }}>Vahvistettu lääkitys ({activeMeds.length} kpl)</h4>
            <ul style={{ paddingLeft: '18px', fontSize: '0.9rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {activeMeds.map(m => (
                <li key={m.id}>
                  <strong>{m.name}</strong> {m.dosage} ({m.schedule})
                </li>
              ))}
              {stoppedMeds.map(m => (
                <li key={m.id} style={{ color: '#b91c1c', textDecoration: 'line-through' }}>
                  {m.name} {m.dosage} (Potilas ilmoittanut tauon/lopetuksen)
                </li>
              ))}
            </ul>
          </div>

          {/* Diagnoses & Allergies */}
          <div style={{ background: 'white', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <h4 style={{ fontSize: '0.95rem', color: 'var(--text-muted)', marginBottom: '8px' }}>Käyntiin liittyvät taustatiedot</h4>
            {relevantDiags.length > 0 && (
              <div style={{ marginBottom: '8px' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Diagnoosit: </span>
                <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{relevantDiags.map(d => d.title_fi).join(', ')}</span>
              </div>
            )}
            <div>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Allergiat: </span>
              {allergies.length > 0 ? (
                <span style={{ fontWeight: 600, fontSize: '0.9rem', color: '#b45309' }}>
                  {allergies.map(a => `${a.allergen} (${a.reaction})`).join(', ')}
                </span>
              ) : (
                <span style={{ fontSize: '0.9rem' }}>Ei merkittyjä allergioita</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Informed Consent Section */}
      <div style={{ background: 'var(--cta-light)', border: '1px solid #9de3c8', borderRadius: 'var(--radius-md)', padding: '20px', marginBottom: '28px' }}>
        <h3 style={{ fontSize: '1.1rem', color: '#166534', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShieldCheck size={20} />
          {t.consentTitle}
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer', fontSize: '0.95rem' }}>
            <input
              type="checkbox"
              checked={consent1}
              onChange={(e) => setConsent1(e.target.checked)}
              style={{ width: 20, height: 20, marginTop: 2 }}
            />
            <span>{t.consentCheckbox1}</span>
          </label>

          <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer', fontSize: '0.95rem' }}>
            <input
              type="checkbox"
              checked={consent2}
              onChange={(e) => setConsent2(e.target.checked)}
              style={{ width: 20, height: 20, marginTop: 2 }}
            />
            <span>{t.consentCheckbox2}</span>
          </label>
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button type="button" className="btn-secondary" onClick={onBack}>
          <ArrowLeft size={18} />
          <span>Takaisin</span>
        </button>

        {/* btn-cta: Von Restorff — the single most consequential action in the entire flow */}
        <button
          type="button"
          className="btn-cta"
          onClick={handleSubmit}
          disabled={!consent1 || !consent2 || isSubmitting}
        >
          <Send size={18} />
          <span>{isSubmitting ? 'Lähetetään...' : t.btnSubmitPrevisit}</span>
        </button>
      </div>
    </div>
  );
}
