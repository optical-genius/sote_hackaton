import React, { useState, useEffect } from 'react';
import {
  Cookie,
  ShieldCheck,
  Sliders,
  Check,
  ChevronDown,
  ChevronUp,
  Lock,
  Info
} from 'lucide-react';

export const COOKIE_STORAGE_KEY = 'luvn_cookie_consent';

export default function CookieConsentBanner ({ t, onConsentChange }) {
  // Check localStorage on mount
  const [consent, setConsent] = useState(() => {
    try {
      const stored = localStorage.getItem(COOKIE_STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch (e) {
      return null;
    }
  });

  const [showDetails, setShowDetails] = useState(false);
  const [analyticsAllowed, setAnalyticsAllowed] = useState(true);
  const [isClosing, setIsClosing] = useState(false);

  // Listen to external request to re-open cookie banner (e.g. from accessibility or settings)
  useEffect(() => {
    const handleReopen = () => {
      setConsent(null);
      setShowDetails(true);
      setIsClosing(false);
    };
    window.addEventListener('hoivapolku_reopen_cookies', handleReopen);
    return () => window.removeEventListener('hoivapolku_reopen_cookies', handleReopen);
  }, []);

  // If already consented and not reopening, don't show
  if (consent && !isClosing) {
    return null;
  }

  const saveAndClose = (data) => {
    try {
      localStorage.setItem(COOKIE_STORAGE_KEY, JSON.stringify(data));
    } catch (err) {
      console.warn('Could not save cookie consent to localStorage', err);
    }
    setIsClosing(true);
    setTimeout(() => {
      setConsent(data);
      setIsClosing(false);
      if (onConsentChange) onConsentChange(data);
    }, 280);
  };

  const handleAcceptAll = () => {
    saveAndClose({
      necessary: true,
      analytics: true,
      functional: true,
      timestamp: new Date().toISOString()
    });
  };

  const handleAcceptNecessary = () => {
    saveAndClose({
      necessary: true,
      analytics: false,
      functional: false,
      timestamp: new Date().toISOString()
    });
  };

  const handleSaveCustom = () => {
    saveAndClose({
      necessary: true,
      analytics: analyticsAllowed,
      functional: true,
      timestamp: new Date().toISOString()
    });
  };

  return (
    <div
      className={`cookie-consent-overlay ${isClosing ? 'cookie-closing' : ''}`}
      role="region"
      aria-label={t?.cookieTitle || 'Evästeet ja tietosuoja'}
    >
      <div className="cookie-consent-card">
        {/* Header */}
        <div className="cookie-header">
          <div className="cookie-icon-wrapper">
            <Cookie size={24} className="cookie-icon" />
          </div>
          <div className="cookie-title-area">
            <div className="cookie-badge-row">
              <span className="cookie-compliance-badge">
                <ShieldCheck size={13} style={{ display: 'inline', marginRight: 4 }} />
                {t?.cookieBadgeGdpr || 'EU GDPR & Kanta-yhteensopiva'}
              </span>
            </div>
            <h3 className="cookie-title">
              {t?.cookieTitle || 'Evästeet ja tietosuoja Sopi-palvelussa'}
            </h3>
          </div>
        </div>

        {/* Body Text */}
        <p className="cookie-desc">
          {t?.cookieDesc || 'Käytämme evästeitä varmistaaksemme turvallisen Suomi.fi-tunnistautumisen, Kanta-yhteyden ja saavutettavuusvalintojen säilymisen. Emme koskaan luovuta terveystietojasi kaupallisiin tarkoituksiin tai mainontaan.'}
        </p>

        {/* Detailed categories accordion */}
        {showDetails && (
          <div className="cookie-details-panel">
            {/* Essential Cookies */}
            <div className="cookie-category-item">
              <div className="cookie-cat-header">
                <div className="cookie-cat-title-row">
                  <Lock size={15} color="#0284c7" />
                  <span className="cookie-cat-name">
                    {t?.cookieNecessaryTitle || 'Välttämättömät evästeet (pakolliset)'}
                  </span>
                </div>
                <span className="cookie-locked-badge">
                  {t?.cookieAlwaysActive || 'Aina käytössä'}
                </span>
              </div>
              <p className="cookie-cat-desc">
                {t?.cookieNecessaryDesc || 'Turvallinen istunto, Suomi.fi-tunnistautuminen ja saavutettavuusvalinnat. Palvelu ei toimi ilman näitä.'}
              </p>
            </div>

            {/* Analytics & Service Development */}
            <div className="cookie-category-item">
              <div className="cookie-cat-header">
                <div className="cookie-cat-title-row">
                  <Sliders size={15} color="#007a5a" />
                  <span className="cookie-cat-name">
                    {t?.cookieAnalyticsTitle || 'Palvelun kehitys ja oirekartoituksen laatu'}
                  </span>
                </div>
                <label className="cookie-toggle-label">
                  <input
                    type="checkbox"
                    className="cookie-toggle-checkbox"
                    checked={analyticsAllowed}
                    onChange={(e) => setAnalyticsAllowed(e.target.checked)}
                  />
                  <span className="cookie-toggle-slider" />
                </label>
              </div>
              <p className="cookie-cat-desc">
                {t?.cookieAnalyticsDesc || 'Anonyymit käyttötiedot asiointipolkujen ja tekoälypohjaisen oirekartoituksen parantamiseksi ilman henkilötietoja.'}
              </p>
            </div>

            {/* Privacy note */}
            <div className="cookie-legal-note">
              <Info size={14} style={{ minWidth: 14, marginTop: 2 }} />
              <span>{t?.cookieNoticePrivacy || 'Länsi-Uudenmaan hyvinvointialue noudattaa EU:n tietosuoja-asetusta ja potilaslakia.'}</span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="cookie-actions-row">
          <button
            type="button"
            className="cookie-btn cookie-btn-toggle"
            onClick={() => setShowDetails(!showDetails)}
          >
            {showDetails ? (
              <>
                <ChevronUp size={15} />
                <span>{t?.cookieBtnHideSettings || 'Piilota asetukset'}</span>
              </>
            ) : (
              <>
                <ChevronDown size={15} />
                <span>{t?.cookieBtnCustomize || 'Muokkaa asetuksia'}</span>
              </>
            )}
          </button>

          <div className="cookie-btn-group-right">
            {showDetails && (
              <button
                type="button"
                className="cookie-btn cookie-btn-save"
                onClick={handleSaveCustom}
              >
                <Check size={15} />
                <span>{t?.cookieBtnSaveCustom || 'Tallenna valinnat'}</span>
              </button>
            )}

            <button
              type="button"
              className="cookie-btn cookie-btn-outline"
              onClick={handleAcceptNecessary}
            >
              {t?.cookieBtnNecessaryOnly || 'Vain välttämättömät'}
            </button>

            <button
              type="button"
              className="cookie-btn cookie-btn-primary"
              onClick={handleAcceptAll}
            >
              {t?.cookieBtnAcceptAll || 'Hyväksy kaikki'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
