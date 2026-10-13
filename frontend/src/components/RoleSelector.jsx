import React from 'react';
import { ShieldCheck, User, Users, ChevronDown } from 'lucide-react';

export default function RoleSelector({
  patients,
  currentPatient,
  onSelectPatient,
  actingAs,
  onToggleActingAs,
  t
}) {
  if (!currentPatient) return null;

  return (
    <div className="user-role-card">
      <div className="user-identity">
        <div style={{
          width: 44,
          height: 44,
          borderRadius: '50%',
          backgroundColor: actingAs === 'guardian' ? '#fef3c7' : '#e0f2fe',
          color: actingAs === 'guardian' ? '#92400e' : '#0369a1',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 700
        }}>
          {actingAs === 'guardian' ? <Users size={22} /> : <User size={22} />}
        </div>

        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>
              {currentPatient.first_name} {currentPatient.last_name}
            </span>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              ({currentPatient.age} v, {currentPatient.municipality})
            </span>
            <span className="auth-badge">
              <ShieldCheck size={14} />
              {t.suomiFiAuth}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            <span>Hetu: <strong>{currentPatient.masked_hetu}</strong></span>
            {actingAs === 'guardian' && currentPatient.guardian_name && (
              <span style={{ color: '#b45309', fontWeight: 600 }}>
                • {t.actingForLabel} {currentPatient.guardian_name}
              </span>
            )}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        {/* Toggle between Oma asiointi and Asiointi toisen puolesta */}
        {currentPatient.has_guardian_access && (
          <div className="role-switcher-pill">
            <button
              type="button"
              onClick={() => onToggleActingAs('self')}
              style={{
                border: 'none',
                background: actingAs === 'self' ? 'var(--primary)' : 'transparent',
                color: actingAs === 'self' ? 'white' : 'var(--text-main)',
                padding: '4px 10px',
                borderRadius: '6px',
                fontWeight: 600,
                fontSize: '0.85rem',
                minHeight: '32px',
                cursor: 'pointer'
              }}
            >
              {t.actingSelf}
            </button>
            <button
              type="button"
              onClick={() => onToggleActingAs('guardian')}
              style={{
                border: 'none',
                background: actingAs === 'guardian' ? '#b45309' : 'transparent',
                color: actingAs === 'guardian' ? 'white' : 'var(--text-main)',
                padding: '4px 10px',
                borderRadius: '6px',
                fontWeight: 600,
                fontSize: '0.85rem',
                minHeight: '32px',
                cursor: 'pointer'
              }}
            >
              {t.actingGuardian}
            </button>
          </div>
        )}

        {/* Synthetic Patient Profile Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <label htmlFor="patient-select" style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            {t.switchPatient}:
          </label>
          <select
            id="patient-select"
            value={currentPatient.id}
            onChange={(e) => onSelectPatient(e.target.value)}
            style={{
              padding: '6px 10px',
              borderRadius: '6px',
              border: '1px solid var(--border)',
              background: 'white',
              fontSize: '0.9rem',
              fontWeight: 600,
              minHeight: '36px'
            }}
          >
            {patients.map(p => (
              <option key={p.id} value={p.id}>
                {p.first_name} {p.last_name} ({p.age}v - {p.municipality})
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
