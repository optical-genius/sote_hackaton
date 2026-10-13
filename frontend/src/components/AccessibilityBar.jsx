import React from 'react';
import { Eye, Type, BookOpen } from 'lucide-react';

export default function AccessibilityBar({
  highContrast,
  onToggleHighContrast,
  fontSize,
  onChangeFontSize,
  selkokieli,
  onToggleSelkokieli,
  t
}) {
  return (
    <div className="accessibility-bar" role="region" aria-label={t.accessibilityOptions}>
      <div className="accessibility-bar-inner">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, color: 'var(--text-muted)' }}>
          <Eye size={16} />
          <span>{t.accessibilityOptions}:</span>
        </div>

        <div className="a11y-controls">
          {/* High Contrast Toggle */}
          <button
            type="button"
            className={`a11y-toggle-btn ${highContrast ? 'active' : ''}`}
            onClick={onToggleHighContrast}
            aria-pressed={highContrast}
          >
            <Eye size={14} />
            {t.highContrast}
          </button>

          {/* Font Size Scaler */}
          <div style={{ display: 'flex', gap: '2px', background: 'white', border: '1px solid #94a3b8', borderRadius: '6px', padding: '2px' }}>
            <button
              type="button"
              onClick={() => onChangeFontSize('normal')}
              style={{
                border: 'none',
                background: fontSize === 'normal' ? 'var(--primary)' : 'transparent',
                color: fontSize === 'normal' ? 'white' : 'var(--text-main)',
                padding: '2px 8px',
                borderRadius: '4px',
                fontWeight: 700,
                fontSize: '0.8rem',
                minHeight: '28px',
                cursor: 'pointer'
              }}
              aria-label={t.fontSizeNormal}
              aria-pressed={fontSize === 'normal'}
            >
              A
            </button>
            <button
              type="button"
              onClick={() => onChangeFontSize('large')}
              style={{
                border: 'none',
                background: fontSize === 'large' ? 'var(--primary)' : 'transparent',
                color: fontSize === 'large' ? 'white' : 'var(--text-main)',
                padding: '2px 8px',
                borderRadius: '4px',
                fontWeight: 700,
                fontSize: '0.9rem',
                minHeight: '28px',
                cursor: 'pointer'
              }}
              aria-label={t.fontSizeLarge}
              aria-pressed={fontSize === 'large'}
            >
              A+
            </button>
            <button
              type="button"
              onClick={() => onChangeFontSize('xl')}
              style={{
                border: 'none',
                background: fontSize === 'xl' ? 'var(--primary)' : 'transparent',
                color: fontSize === 'xl' ? 'white' : 'var(--text-main)',
                padding: '2px 8px',
                borderRadius: '4px',
                fontWeight: 700,
                fontSize: '1rem',
                minHeight: '28px',
                cursor: 'pointer'
              }}
              aria-label={t.fontSizeExtraLarge}
              aria-pressed={fontSize === 'xl'}
            >
              A++
            </button>
          </div>

          {/* Selkokieli Mode Toggle */}
          <button
            type="button"
            className={`a11y-toggle-btn ${selkokieli ? 'active' : ''}`}
            onClick={onToggleSelkokieli}
            aria-pressed={selkokieli}
            style={{ borderColor: selkokieli ? '#d97706' : '#94a3b8', background: selkokieli ? '#fffbeb' : 'white', color: selkokieli ? '#b45309' : 'var(--text-main)' }}
          >
            <BookOpen size={14} />
            {t.selkokieliMode}
          </button>
        </div>
      </div>
    </div>
  );
}
