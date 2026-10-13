import React from 'react';
import { X, Eye, Type, BookOpen, Check } from 'lucide-react';

export default function AccessibilityModal({
  isOpen,
  onClose,
  highContrast,
  onToggleHighContrast,
  fontSize,
  onChangeFontSize,
  selkokieli,
  onToggleSelkokieli
}) {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="a11y-title">
      <div className="a11y-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="a11y-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="a11y-icon-box">
              <Eye size={20} color="#0284c7" />
            </div>
            <div>
              <h3 id="a11y-title" style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>Esteettömyysasetukset</h3>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>Mukauta näkymää omien tarpeidesi mukaan</p>
            </div>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Sulje">
            <X size={20} />
          </button>
        </div>

        <div className="a11y-modal-body">
          {/* Font Size Scaler */}
          <div className="a11y-setting-row">
            <div>
              <div className="setting-label">Tekstin koko</div>
              <div className="setting-desc">Suurenna tekstin ja painikkeiden kokoa</div>
            </div>
            <div className="font-scaler-group">
              <button
                type="button"
                className={`font-btn ${fontSize === 'normal' ? 'active' : ''}`}
                onClick={() => onChangeFontSize('normal')}
              >
                A
              </button>
              <button
                type="button"
                className={`font-btn ${fontSize === 'large' ? 'active' : ''}`}
                onClick={() => onChangeFontSize('large')}
              >
                A+
              </button>
              <button
                type="button"
                className={`font-btn ${fontSize === 'xl' ? 'active' : ''}`}
                onClick={() => onChangeFontSize('xl')}
              >
                A++
              </button>
            </div>
          </div>

          {/* High Contrast */}
          <div className="a11y-setting-row">
            <div>
              <div className="setting-label">Korkea kontrasti</div>
              <div className="setting-desc">Tehostaa reunojen ja tekstien näkyvyyttä (WCAG AAA)</div>
            </div>
            <button
              type="button"
              className={`toggle-switch-btn ${highContrast ? 'on' : ''}`}
              onClick={onToggleHighContrast}
              role="switch"
              aria-checked={highContrast}
            >
              <span className="toggle-thumb" />
            </button>
          </div>

          {/* Selkokieli */}
          <div className="a11y-setting-row">
            <div>
              <div className="setting-label">Selkokielitila</div>
              <div className="setting-desc">Yksinkertaisempi rakenne, korostetut ohjeet ja väljempi asettelu</div>
            </div>
            <button
              type="button"
              className={`toggle-switch-btn ${selkokieli ? 'on' : ''}`}
              onClick={onToggleSelkokieli}
              role="switch"
              aria-checked={selkokieli}
            >
              <span className="toggle-thumb" />
            </button>
          </div>

          {/* Eväste- ja tietosuoja-asetukset */}
          <div className="a11y-setting-row" style={{ paddingTop: 14, borderTop: '1px solid #e2e8f0' }}>
            <div>
              <div className="setting-label">Evästeet ja tietosuoja</div>
              <div className="setting-desc">Tarkastele tai muuta evästesuostumustasi</div>
            </div>
            <button
              type="button"
              className="cookie-btn cookie-btn-outline"
              style={{ fontSize: '0.8rem', padding: '6px 12px' }}
              onClick={() => {
                onClose();
                window.dispatchEvent(new CustomEvent('hoivapolku_reopen_cookies'));
              }}
            >
              Muokkaa evästeitä
            </button>
          </div>
        </div>

        <div className="a11y-modal-footer">
          <button type="button" className="btn-modal-done" onClick={onClose}>
            Valmis
          </button>
        </div>
      </div>
    </div>
  );
}
