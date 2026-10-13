import React from 'react';
import CitizenHomeView from './CitizenHomeView';

export default function CitizenPortal({
  formResetKey = 0,
  activeTab,
  onNavigateTab,
  currentStep,
  onStepChange,
  patient,
  actingAs,
  selectedService,
  onSelectService,
  reasonForVisit,
  onChangeReason,
  medications,
  diagnoses,
  allergies,
  selkokieli,
  onToggleSelkokieli,
  currentLang,
  onJumpToProfessional,
  t
}) {
  // The citizen experience is now a unified single-page booking flow on "Koti".
  // The old multi-step tabs (asiakas, keskustelu, yhteenveto) are preserved as
  // navigation targets in the sidebar but the main experience is here.
  return (
    <div className="citizen-portal-root">
      <CitizenHomeView
        key={`${patient?.id || 'default'}-${formResetKey}`}
        patient={patient}
        actingAs={actingAs}
        selectedService={selectedService}
        onSelectService={onSelectService}
        reasonForVisit={reasonForVisit}
        onChangeReason={onChangeReason}
        medications={medications}
        diagnoses={diagnoses}
        allergies={allergies}
        t={t}
        lang={currentLang}
        onJumpToProfessional={onJumpToProfessional}
      />
    </div>
  );
}
