import React, { useState } from 'react';
import { Bell, ChevronDown, Check, UserCheck, Stethoscope, Users, Shield, Accessibility } from 'lucide-react';

export default function TopHeader({
  currentStep = 1,
  onStepChange,
  showStepper = false,
  activeView,
  onViewChange,
  actingAs,
  onActingAsChange,
  patients = [],
  currentPatient,
  onSelectPatient,
  onOpenAccessibility,
  userRole = 'Sairaanhoitaja',
  userName = 'Maija Korhonen',
  userInitials = 'MK',
  t
}) {
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [hasUnreadNotification, setHasUnreadNotification] = useState(true);

  const isGuardianActing = activeView === 'citizen' && actingAs === 'guardian' && currentPatient;

  return (
    <header className="hoiva-top-header">
      {/* Mobile Brand Logo (visible on <= 768px when sidebar is hidden) */}
      <div className="header-mobile-brand">
        <svg width="24" height="24" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M16 29C16 29 4 21 4 13C4 8.5 7.5 5 12 5C14.5 5 16 6.5 16 6.5C16 6.5 17.5 5 20 5C24.5 5 28 8.5 28 13C28 21 16 29 16 29Z" fill="#0ea5e9" opacity="0.85" />
          <path d="M16 29C16 29 7 20 7 13.5C7 9.5 10 6.5 14 6.5C15.5 6.5 16 7.5 16 7.5C16 7.5 16.5 6.5 18 6.5C22 6.5 25 9.5 25 13.5C25 20 16 29 16 29Z" fill="#14b8a6" />
          <circle cx="12" cy="11" r="2.5" fill="#38bdf8" />
        </svg>
        <span className="mobile-brand-title">Sopi</span>
      </div>

      {/* Left/Center: View Switcher (Asiakasnäkymä vs Ammattilaisnäkymä) */}
      <div className="header-view-switch-group">
        <div className="view-mode-toggle" role="group" aria-label="Näkymän valinta">
          <button
            type="button"
            className={`view-toggle-btn ${activeView === 'citizen' ? 'active' : ''}`}
            onClick={() => onViewChange && onViewChange('citizen')}
          >
            <UserCheck size={16} />
            <span className="toggle-label-full">{t?.demoSwitchAsiakas || 'Asiakasnäkymä'}</span>
            <span className="toggle-label-short">Asiakas</span>
          </button>
          <button
            type="button"
            className={`view-toggle-btn ${activeView === 'doctor' || activeView === 'professional' ? 'active' : ''}`}
            onClick={() => onViewChange && onViewChange('doctor')}
          >
            <Stethoscope size={16} />
            <span className="toggle-label-full">{t?.demoSwitchAmmattilainen || 'Ammattilaisnäkymä'}</span>
            <span className="toggle-label-short">Lääkäri</span>
          </button>
        </div>

        {/* Guardian Authorization Banner if acting on behalf of someone */}
        {isGuardianActing && (
          <div className="header-guardian-badge" title="Suomi.fi-valtuutettu puolesta-asiointi">
            <Shield size={14} className="shield-icon" />
            <span>
              {t?.actingForLabel || 'Asioit valtuutettuna henkilön puolesta:'} <strong>{currentPatient.first_name} {currentPatient.last_name}</strong>
            </span>
          </div>
        )}
      </div>

      {/* Right Controls */}
      <div className="header-actions">
        {/* Mobile Accessibility Button */}
        {onOpenAccessibility && (
          <button
            type="button"
            className="header-icon-btn mobile-a11y-btn"
            aria-label="Esteettömyys ja tekstikoko"
            onClick={onOpenAccessibility}
            title="Esteettömyys (tekstin koko & kontrasti)"
          >
            <Accessibility size={18} />
          </button>
        )}

        {/* Notification Bell */}
        <button
          type="button"
          className="header-icon-btn notification-btn"
          aria-label="Ilmoitukset"
          onClick={() => setHasUnreadNotification(false)}
        >
          <Bell size={20} />
          {hasUnreadNotification && <span className="notification-dot" />}
        </button>

        {/* User Profile Dropdown Pill */}
        <div className="user-profile-wrapper">
          <button
            type="button"
            className="user-profile-pill"
            onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
            aria-expanded={profileDropdownOpen}
          >
            <div className="avatar-circle">
              {userInitials}
            </div>
            <div className="user-info-text">
              <span className="user-name">{userName}</span>
              <span className="user-role">{userRole}</span>
            </div>
            <ChevronDown size={14} className="dropdown-caret" />
          </button>

          {profileDropdownOpen && (
            <div className="profile-dropdown-menu">
              <div className="dropdown-section-title">Vaihda näkymää:</div>
              <button
                type="button"
                className={`dropdown-item ${activeView === 'citizen' ? 'selected' : ''}`}
                onClick={() => {
                  onViewChange('citizen');
                  setProfileDropdownOpen(false);
                }}
              >
                <UserCheck size={16} />
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: 600 }}>Asiakasnäkymä (Omaishoitaja / Potilas)</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {actingAs === 'guardian'
                      ? `Asioi valtuutettuna henkilön ${currentPatient?.first_name || 'potilaan'} puolesta`
                      : `Itseasiointi (${userName})`}
                  </div>
                </div>
              </button>

              <button
                type="button"
                className={`dropdown-item ${activeView === 'doctor' || activeView === 'professional' ? 'selected' : ''}`}
                onClick={() => {
                  onViewChange('doctor');
                  setProfileDropdownOpen(false);
                }}
              >
                <Stethoscope size={16} />
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: 600 }}>Ammattilaisnäkymä (Espoonlahti Tiimi 2)</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Työpöytä, jäsennelty esitietokooste ja lääkelista</div>
                </div>
              </button>

              <div className="dropdown-divider" />
              <div className="dropdown-section-title">Vaihda potilasta (Demo):</div>
              {patients.map(p => (
                <button
                  key={p.id}
                  type="button"
                  className={`dropdown-item ${currentPatient?.id === p.id ? 'selected' : ''}`}
                  onClick={() => {
                    onSelectPatient(p.id);
                    setProfileDropdownOpen(false);
                  }}
                >
                  <Users size={15} />
                  <div style={{ textAlign: 'left', flex: 1 }}>
                    <div style={{ fontWeight: 600 }}>{p.first_name} {p.last_name} ({p.age}v)</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      {p.has_guardian_access ? 'Omaishoitaja Maija asioi valtuutettuna' : `Itseasiointi (${p.first_name} itse)`}
                    </div>
                  </div>
                  {currentPatient?.id === p.id && <Check size={14} style={{ color: '#0284c7' }} />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
