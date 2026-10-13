import React, { useState } from 'react';
import {
  Home,
  UserCheck,
  MessageSquare,
  FileText,
  Settings,
  Accessibility,
  Globe,
  ChevronDown,
  Check
} from 'lucide-react';

export default function Sidebar ({
  activeView = 'citizen',
  activeTab,
  onSelectTab,
  currentLang,
  onLangChange,
  fontSize,
  onChangeFontSize,
  onOpenAccessibility,
  t
}) {
  const [langMenuOpen, setLangMenuOpen] = useState(false);

  // In citizen view, keep navigation ultra-clean and distraction-free:
  // All intake steps happen on the single-page flow under "Ajanvaraus & Esitiedot"
  const navItems = activeView === 'citizen'
    ? [
      { id: 'koti', label: t?.navBooking || 'Ajanvaraus & Esitiedot', icon: Home },
      { id: 'asetukset', label: t?.navSettings || 'Asetukset & Esteettömyys', icon: Settings },
    ]
    : [
      { id: 'koti', label: t?.profDashboardTitle || 'Työpöytä', icon: Home },
      { id: 'asiakas', label: t?.patientBanner || 'Potilastiedot', icon: UserCheck },
      { id: 'yhteenveto', label: t?.tabSummary || 'Triage & Yhteenveto', icon: FileText },
      { id: 'asetukset', label: t?.navSettings || 'Asetukset', icon: Settings },
    ];

  const languages = [
    { code: 'fi', label: 'Suomi' },
    { code: 'sv', label: 'Svenska' },
    { code: 'en', label: 'English' },
  ];

  const isFontLarge = fontSize === 'large' || fontSize === 'xl';

  const handleToggleFont = (e) => {
    e.stopPropagation();
    if (onChangeFontSize) {
      onChangeFontSize(isFontLarge ? 'normal' : 'large');
    }
  };

  return (
    <aside className="hoiva-sidebar" aria-label="Päävalikko">
      {/* Brand Logo */}
      <div className="sidebar-brand">
        <div className="brand-logo-icon">
          {/* Sopi custom leafy heart SVG matching screenshot */}
          <svg width="28" height="28" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M16 29C16 29 4 21 4 13C4 8.5 7.5 5 12 5C14.5 5 16 6.5 16 6.5C16 6.5 17.5 5 20 5C24.5 5 28 8.5 28 13C28 21 16 29 16 29Z" fill="#0ea5e9" opacity="0.85" />
            <path d="M16 29C16 29 7 20 7 13.5C7 9.5 10 6.5 14 6.5C15.5 6.5 16 7.5 16 7.5C16 7.5 16.5 6.5 18 6.5C22 6.5 25 9.5 25 13.5C25 20 16 29 16 29Z" fill="#14b8a6" />
            <circle cx="12" cy="11" r="2.5" fill="#38bdf8" />
          </svg>
        </div>
        <div className="brand-text-group">
          <span className="brand-title">Sopi</span>
          <span className="brand-subtitle">Enemmän aikaa ihmiselle</span>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="sidebar-nav">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id || (activeTab === 'etusivu' && item.id === 'koti');
          return (
            <button
              key={item.id}
              type="button"
              className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
              onClick={() => onSelectTab(item.id)}
            >
              <Icon size={19} className="nav-icon" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Sidebar Footer Controls */}
      <div className="sidebar-footer">
        {/* Suurenna tekstiä with toggle switch matching mockup */}
        <div
          className="sidebar-font-scaler-row"
          onClick={onOpenAccessibility}
          title="Avaa esteettömyysasetukset tai suurenna tekstiä"
        >
          <div className="font-scaler-label-group">
            <Accessibility size={18} className="font-scaler-icon" />
            <span>{t?.scaleFont || 'Suurenna tekstiä'}</span>
          </div>
          <button
            type="button"
            className={`sidebar-toggle-switch ${isFontLarge ? 'on' : ''}`}
            onClick={handleToggleFont}
            role="switch"
            aria-checked={isFontLarge}
            aria-label="Suurenna tekstiä kytkin"
          >
            <span className="sidebar-toggle-thumb" />
          </button>
        </div>

        {/* Language Switcher */}
        <div className="lang-dropdown-wrapper">
          <button
            type="button"
            className="sidebar-footer-btn lang-btn"
            onClick={() => setLangMenuOpen(!langMenuOpen)}
            aria-expanded={langMenuOpen}
          >
            <Globe size={18} />
            <span>{languages.find(l => l.code === currentLang)?.label || 'Suomi'}</span>
            <ChevronDown size={14} style={{ marginLeft: 'auto', opacity: 0.7 }} />
          </button>

          {langMenuOpen && (
            <div className="lang-dropdown-menu">
              {languages.map(l => (
                <button
                  key={l.code}
                  type="button"
                  className={`lang-option ${currentLang === l.code ? 'selected' : ''}`}
                  onClick={() => {
                    onLangChange(l.code);
                    setLangMenuOpen(false);
                  }}
                >
                  <span>{l.label}</span>
                  {currentLang === l.code && <Check size={14} color="#0284c7" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
