import React from 'react';
import HoivaDoctorHomeView from '../HoivaDoctorHomeView';
import HoivaClientView from '../HoivaClientView';
import SymptomChatView from '../SymptomChatView';
import ProfessionalDashboardView from '../ProfessionalDashboardView';

export default function DoctorPortal({
  activeTab,
  onNavigateTab,
  currentStep,
  onStepChange,
  patient,
  patients = [],
  onSelectPatientId,
  selectedService,
  reasonForVisit,
  filledSymptomData,
  onUpdateFilledData,
  selkokieli,
  onToggleSelkokieli,
  currentLang,
  selectedSubmissionId,
  onSelectSubmissionId,
  onOpenPrivacy,
  t
}) {
  return (
    <div className="doctor-portal-root">
      {/* Tab: Koti (Doctor Hero Dashboard with Patients Queue and Quick Actions) */}
      {activeTab === 'koti' && (
        <HoivaDoctorHomeView
          onNavigateToClient={(patientId) => {
            if (patientId && onSelectPatientId) onSelectPatientId(patientId);
            onNavigateTab('asiakas');
            onStepChange(1);
          }}
          onNavigateToChat={() => {
            onNavigateTab('keskustelu');
          }}
          onNavigateToSummary={(subId, patientId) => {
            if (patientId && onSelectPatientId) onSelectPatientId(patientId);
            if (subId && onSelectSubmissionId) onSelectSubmissionId(subId);
            onNavigateTab('yhteenveto');
            onStepChange(3);
          }}
          onOpenPrivacy={onOpenPrivacy}
          patients={patients}
          t={t}
        />
      )}

      {/* Tab: Asiakkaan tiedot (Clinical Review of Selected Patient) */}
      {activeTab === 'asiakas' && (
        <HoivaClientView
          patient={patient}
          selkokieli={selkokieli}
          onToggleSelkokieli={onToggleSelkokieli}
          onProceedToSummary={() => {
            onNavigateTab('yhteenveto');
            onStepChange(3);
          }}
          currentLang={currentLang}
          t={t}
        />
      )}

      {/* Tab: Keskustelu (Communication & Interview) */}
      {activeTab === 'keskustelu' && (
        <div style={{ maxWidth: '1100px', margin: '24px auto', padding: '0 20px' }}>
          <SymptomChatView
            reasonForVisit={reasonForVisit}
            filledData={filledSymptomData}
            onUpdateFilledData={onUpdateFilledData}
            onProceed={() => {
              onNavigateTab('yhteenveto');
              onStepChange(3);
            }}
            onBack={() => {
              onNavigateTab('koti');
            }}
            currentLang={currentLang}
            actingAs="professional"
            selectedService={selectedService}
            t={t}
          />
        </div>
      )}

      {/* Tab: Yhteenveto (Professional Clinical Dashboard / Triage Desk) */}
      {activeTab === 'yhteenveto' && (
        <div style={{ padding: '24px' }}>
          <ProfessionalDashboardView
            targetSubmissionId={selectedSubmissionId}
            t={t}
          />
        </div>
      )}
    </div>
  );
}
