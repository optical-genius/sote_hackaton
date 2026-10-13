import React from 'react';
import {
  ShieldCheck,
  Database,
  Cpu,
  Cookie,
  Eye,
  Phone,
  Heart,
  ExternalLink,
  Lock,
  CheckCircle2
} from 'lucide-react';

export default function Footer ({ onOpenPrivacyTab, onOpenAccessibility, t }) {
  const handleOpenPrivacy = (tab) => {
    if (onOpenPrivacyTab) {
      onOpenPrivacyTab(tab);
    }
  };

  const handleOpenCookies = () => {
    window.dispatchEvent(new CustomEvent('hoivapolku_reopen_cookies'));
  };

  return (
    <footer className="hoiva-site-footer" role="contentinfo" aria-label="Sivuston alatunniste">
      <div className="footer-main-container">
        {/* Top summary row with trust badges */}
        <div className="footer-trust-banner">
          <div className="footer-trust-item">
            <ShieldCheck size={18} color="#007a5a" />
            <span>EU GDPR & Asiakastietolaki (703/2023)</span>
          </div>
          <div className="footer-trust-item">
            <Lock size={18} color="#0284c7" />
            <span>Kanta-arkisto & Suomi.fi-tunnistautuminen</span>
          </div>
          <div className="footer-trust-item">
            <Cpu size={18} color="#7c3aed" />
            <span>EU AI Act Art. 50 — Suljettu tekoälylaskenta</span>
          </div>
        </div>

        {/* Footer Navigation Columns */}
        <div className="footer-columns-grid">
          {/* Col 1: LUVN & Brand */}
          <div className="footer-col brand-col">
            <div className="footer-brand-title">
              <div className="footer-brand-icon">
                <Heart size={16} fill="white" color="white" />
              </div>
              <span>Sopi</span>
            </div>
            <p className="footer-brand-desc">
              Länsi-Uudenmaan hyvinvointialueen digitaalinen esitieto- ja oirekartoituspalvelu. Auttaa hoitotiimiä valmistautumaan käyntiisi ja nopeuttaa hoitoon pääsyä.
            </p>
            <div className="footer-emergency-box">
              <Phone size={14} color="#dc2626" />
              <span>Hätätilanteessa soita aina <strong>112</strong> tai Päivystysapu <strong>116 117</strong></span>
            </div>
          </div>

          {/* Col 2: Data Protection & GDPR */}
          <div className="footer-col">
            <h4 className="footer-col-title">
              <ShieldCheck size={16} color="#0284c7" />
              <span>Tietosuoja ja potilasoikeudet</span>
            </h4>
            <ul className="footer-links-list">
              <li>
                <button type="button" className="footer-link-btn" onClick={() => handleOpenPrivacy('gdpr')}>
                  Tietosuojaseloste ja GDPR
                </button>
              </li>
              <li>
                <button type="button" className="footer-link-btn" onClick={() => handleOpenPrivacy('storage')}>
                  Tietojen säilytys ja Kanta-arkisto
                </button>
              </li>
              <li>
                <button type="button" className="footer-link-btn" onClick={() => handleOpenPrivacy('gdpr')}>
                  Rekisteröidyn oikeudet & lokivalvonta
                </button>
              </li>
              <li>
                <a
                  href="https://tietosuoja.fi"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="footer-external-link"
                >
                  <span>Tietosuojavaltuutetun toimisto</span>
                  <ExternalLink size={12} />
                </a>
              </li>
            </ul>
          </div>

          {/* Col 3: AI & Question Generation */}
          <div className="footer-col">
            <h4 className="footer-col-title">
              <Cpu size={16} color="#7c3aed" />
              <span>Tekoäly (AI) ja tietoturva</span>
            </h4>
            <ul className="footer-links-list">
              <li>
                <button type="button" className="footer-link-btn" onClick={() => handleOpenPrivacy('ai')}>
                  Miten tekoäly käyttää tietojasi?
                </button>
              </li>
              <li>
                <button type="button" className="footer-link-btn" onClick={() => handleOpenPrivacy('ai')}>
                  Medicus-malli (ei ulkoista koulutusta)
                </button>
              </li>
              <li>
                <button type="button" className="footer-link-btn" onClick={() => handleOpenPrivacy('ai')}>
                  EU AI Act Art. 50 läpinäkyvyys
                </button>
              </li>
              <li>
                <button type="button" className="footer-link-btn" onClick={() => handleOpenPrivacy('ai')}>
                  Suljettu paikallinen laskentaympäristö
                </button>
              </li>
            </ul>
          </div>

          {/* Col 4: Cookies & Accessibility */}
          <div className="footer-col">
            <h4 className="footer-col-title">
              <Cookie size={16} color="#007a5a" />
              <span>Evästeet ja esteettömyys</span>
            </h4>
            <ul className="footer-links-list">
              <li>
                <button type="button" className="footer-link-btn" onClick={handleOpenCookies}>
                  Evästeasetukset (muuta valintoja)
                </button>
              </li>
              <li>
                <button type="button" className="footer-link-btn" onClick={() => handleOpenPrivacy('cookies')}>
                  Evästeiden käyttötarkoitukset
                </button>
              </li>
              <li>
                <button type="button" className="footer-link-btn" onClick={onOpenAccessibility}>
                  Saavutettavuus ja esteettömyys
                </button>
              </li>
              <li>
                <a
                  href="https://www.kanta.fi"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="footer-external-link"
                >
                  <span>Kanta.fi potilastiedot</span>
                  <ExternalLink size={12} />
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom copyright bar */}
        <div className="footer-bottom-bar">
          <div className="footer-copyright-text">
            © 2026 Länsi-Uudenmaan hyvinvointialue (LUVN). Kaikki oikeudet pidätetään.
          </div>
          <div className="footer-security-notice">
            Potilastiedot on suojattu salauksella. Palvelu noudattaa Valviran ja Kanta-palvelujen A-luokan vaatimuksia.
          </div>
        </div>
      </div>
    </footer>
  );
}
