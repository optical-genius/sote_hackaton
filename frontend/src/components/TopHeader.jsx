import React, { useState } from 'react';
import { Bell, ChevronDown, Check, UserCheck, Stethoscope, Users, Shield } from 'lucide-react';

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
      {/* Left/Center: View Switcher (Asiakasnäkymä vs Ammattilaisnäkymä) */}
      <div className="header-view-switch-group">
        <div className="view-mode-toggle" role="group" aria-label="Näkymän valinta">
          <button
            type="button"
            className={`view-toggle-btn ${activeView === 'citizen' ? 'active' : ''}`}
            onClick={() => onViewChange && onViewChange('citizen')}
          >
            <UserCheck size={16} />
            <span>{t?.demoSwitchAsiakas || 'Asiakasnäkymä'}</span>
          </button>
          <button
            type="button"
            className={`view-toggle-btn ${activeView === 'doctor' || activeView === 'professional' ? 'active' : ''}`}
            onClick={() => onViewChange && onViewChange('doctor')}
          >
            <Stethoscope size={16} />
            <span>{t?.demoSwitchAmmattilainen || 'Ammattilaisnäkymä'}</span>
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
        {/* Notification Bell */}
        <button
          type="button"
          className="header-icon-btn"
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
                      {p.has_guardian_access ? 'Omaishoitaja Maija asioi valtuutettuna' : 'Itseasiointi (Matti itse)'}
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
