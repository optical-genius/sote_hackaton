import React from 'react';
import { ShieldCheck, UserCheck, Stethoscope, Globe } from 'lucide-react';

export default function Header({ 
  currentLang, 
  onLangChange, 
  activeView, 
  onViewChange, 
  t 
}) {
  return (
    <header className="top-nav">
      <div className="top-nav-inner">
        {/* Brand */}
        <div className="brand-section">
          <div className="brand-logo-badge" aria-hidden="true">
            LU
          </div>
          <div className="brand-text">
            <h1>{t.appTitle}</h1>
            <p>{t.regionName}</p>
          </div>
        </div>

        {/* Navigation & Controls */}
        <div className="nav-actions">
          {/* Demo View Switcher */}
          <div className="demo-switcher" role="radiogroup" aria-label="Näkymän valinta">
            <button
              type="button"
              className={`demo-btn ${activeView !== 'professional' ? 'active' : ''}`}
              onClick={() => onViewChange('citizen')}
              aria-pressed={activeView !== 'professional'}
            >
              <UserCheck size={16} />
              {t.demoSwitchAsiakas}
            </button>
            <button
              type="button"
              className={`demo-btn ${activeView === 'professional' ? 'active' : ''}`}
              onClick={() => onViewChange('professional')}
              aria-pressed={activeView === 'professional'}
            >
              <Stethoscope size={16} />
              {t.demoSwitchAmmattilainen}
            </button>
          </div>

          {/* Language Switcher */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#f1f5f9', borderRadius: '8px', padding: '3px 6px', border: '1px solid var(--border)' }}>
            <Globe size={15} style={{ color: 'var(--text-muted)' }} />
            {['fi', 'sv', 'en'].map(lang => (
              <button
                key={lang}
                type="button"
                onClick={() => onLangChange(lang)}
                style={{
                  border: 'none',
                  background: currentLang === lang ? 'var(--primary)' : 'transparent',
                  color: currentLang === lang ? '#ffffff' : 'var(--text-main)',
                  fontWeight: currentLang === lang ? '700' : '500',
                  borderRadius: '4px',
                  padding: '4px 8px',
                  fontSize: '0.85rem',
                  minHeight: '28px',
                  cursor: 'pointer'
                }}
                aria-label={`Vaihda kieleksi ${lang.toUpperCase()}`}
              >
                {lang.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}
