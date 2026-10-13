import React, { useState } from 'react';
import { Pill, CheckCircle2, AlertCircle, Plus, Info, ArrowRight, ArrowLeft } from 'lucide-react';

export default function ZeroTouchValidationView({
  medications,
  onToggleMedicationStatus,
  onAddMedication,
  diagnoses,
  onToggleDiagnosisRelevant,
  allergies,
  onConfirm,
  onBack,
  t
}) {
  const [showAddMedModal, setShowAddMedModal] = useState(false);
  const [newMedName, setNewMedName] = useState('');
  const [newMedDose, setNewMedDose] = useState('');

  const handleAddMed = (e) => {
    e.preventDefault();
    if (!newMedName.trim()) return;
    onAddMedication({
      id: `custom-med-${Date.now()}`,
      name: newMedName.trim(),
      dosage: newMedDose.trim() || 'Tarvittaessa',
      schedule: 'Itsehoito / Oma ilmoitus',
      is_active: true,
      indication: 'Potilaan itse lisäämä',
      user_status_changed: true
    });
    setNewMedName('');
    setNewMedDose('');
    setShowAddMedModal(false);
  };

  return (
    <div className="content-card">
      <div className="card-title-group">
        <h2>{t.screen2Title}</h2>
        <p>{t.screen2Subtitle}</p>
      </div>

      {/* Zero-Touch Banner */}
      <div className="notice-box notice-info">
        <Info size={22} style={{ flexShrink: 0, marginTop: 2 }} />
        <div>
          <strong>Zero-Touch Esitäyttö:</strong> {t.bannerNotice}
        </div>
      </div>

      {/* 1. Medications Card */}
      <div className="section-warm" style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Pill size={20} style={{ color: 'var(--primary)' }} />
            <h3 style={{ fontSize: '1.2rem' }}>{t.medicationsCard}</h3>
          </div>

          <button
            type="button"
            className="btn-secondary"
            onClick={() => setShowAddMedModal(true)}
            style={{ fontSize: '0.9rem', minHeight: '38px', padding: '6px 14px' }}
          >
            <Plus size={16} />
            {t.medAddBtn}
          </button>
        </div>

        {/* Modal for adding medication */}
        {showAddMedModal && (
          <div style={{
            background: 'white',
            border: '2px solid var(--primary)',
            borderRadius: 'var(--radius-md)',
            padding: '16px',
            marginBottom: '16px',
            boxShadow: 'var(--shadow-md)'
          }}>
            <h4 style={{ marginBottom: '10px' }}>{t.medAddBtn}</h4>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '10px' }}>
              <input
                type="text"
                placeholder="Lääkkeen nimi (esim. Parasetamoli)"
                value={newMedName}
                onChange={(e) => setNewMedName(e.target.value)}
                style={{ flex: 1, padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border)' }}
              />
              <input
                type="text"
                placeholder="Annostus (esim. 500 mg tarvittaessa)"
                value={newMedDose}
                onChange={(e) => setNewMedDose(e.target.value)}
                style={{ flex: 1, padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border)' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button type="button" className="btn-secondary" onClick={() => setShowAddMedModal(false)} style={{ minHeight: '36px' }}>Peruuta</button>
              <button type="button" className="btn-primary" onClick={handleAddMed} style={{ minHeight: '36px' }}>Tallenna</button>
            </div>
          </div>
        )}

        {/* Medications List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {medications.map(med => (
            <div
              key={med.id}
              style={{
                background: med.is_active ? 'white' : '#f1f5f9',
                border: `1px solid ${med.is_active ? 'var(--border)' : '#cbd5e1'}`,
                borderRadius: 'var(--radius-sm)',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px'
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontWeight: 700, fontSize: '1.05rem', textDecoration: med.is_active ? 'none' : 'line-through', color: med.is_active ? 'var(--text-main)' : 'var(--text-muted)' }}>
                    {med.name} {med.dosage}
                  </span>
                  {med.user_status_changed && (
                    <span style={{ fontSize: '0.75rem', background: '#fef3c7', color: '#92400e', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                      Muokattu
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {med.schedule} {med.indication ? `• Syy: ${med.indication}` : ''}
                </div>
              </div>

              {/* Status Switcher */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                  type="button"
                  onClick={() => onToggleMedicationStatus(med.id, true)}
                  style={{
                    border: 'none',
                    background: med.is_active ? 'var(--success)' : '#e2e8f0',
                    color: med.is_active ? 'white' : 'var(--text-muted)',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    minHeight: '36px',
                    cursor: 'pointer'
                  }}
                  aria-pressed={med.is_active}
                >
                  {t.medActive}
                </button>
                <button
                  type="button"
                  onClick={() => onToggleMedicationStatus(med.id, false)}
                  style={{
                    border: 'none',
                    background: !med.is_active ? '#dc2626' : '#e2e8f0',
                    color: !med.is_active ? 'white' : 'var(--text-muted)',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    minHeight: '36px',
                    cursor: 'pointer'
                  }}
                  aria-pressed={!med.is_active}
                >
                  {t.medStopped}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Chronic Conditions & Diagnoses */}
      <div style={{ marginBottom: '28px', background: '#f8fafc', padding: '20px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
        <h3 style={{ fontSize: '1.2rem', marginBottom: '4px' }}>{t.diagnosesCard}</h3>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '14px' }}>{t.diagnosesHint}</p>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
          {diagnoses.map(diag => (
            <button
              key={diag.code}
              type="button"
              onClick={() => onToggleDiagnosisRelevant(diag.code)}
              style={{
                border: `2px solid ${diag.is_relevant_for_visit ? 'var(--primary)' : 'var(--border)'}`,
                background: diag.is_relevant_for_visit ? 'var(--primary-light)' : 'white',
                color: 'var(--text-main)',
                padding: '10px 14px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                textAlign: 'left'
              }}
              aria-pressed={diag.is_relevant_for_visit}
            >
              <div style={{
                width: 20,
                height: 20,
                borderRadius: '4px',
                border: '2px solid var(--primary)',
                background: diag.is_relevant_for_visit ? 'var(--primary)' : 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '12px'
              }}>
                {diag.is_relevant_for_visit && '✓'}
              </div>
              <div>
                <span style={{ fontWeight: 600 }}>{diag.title_fi}</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: '6px' }}>({diag.code})</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* 3. Allergies & Warnings */}
      <div style={{ marginBottom: '32px', background: '#f8fafc', padding: '20px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
        <h3 style={{ fontSize: '1.2rem', marginBottom: '12px' }}>{t.allergiesCard}</h3>
        {allergies.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {allergies.map((all, i) => (
              <div
                key={i}
                style={{
                  background: 'white',
                  border: '1px solid #fed7aa',
                  borderRadius: 'var(--radius-sm)',
                  padding: '10px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}
              >
                <AlertCircle size={18} style={{ color: '#ea580c' }} />
                <span style={{ fontWeight: 700 }}>{all.allergen}</span>
                <span style={{ color: 'var(--text-muted)' }}>— {all.reaction}</span>
                <span style={{ marginLeft: 'auto', fontSize: '0.8rem', background: '#ffedd5', color: '#9a3412', padding: '2px 8px', borderRadius: '9999px', fontWeight: 600 }}>
                  {all.severity}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>Ei merkittyjä lääkeaine- tai ruoka-aineallergioita.</p>
        )}
      </div>

      {/* Buttons */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <button type="button" className="btn-secondary" onClick={onBack}>
          <ArrowLeft size={18} />
          <span>Takaisin</span>
        </button>

        {/* btn-cta: Von Restorff Effect — emerald green CTA breaks from the blue palette.
            Signals to the user that this is the single most important confirm action. */}
        <button type="button" className="btn-cta" onClick={onConfirm}>
          <CheckCircle2 size={18} />
          <span>{t.btnConfirmData}</span>
          <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
}
