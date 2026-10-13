import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import TopHeader from './components/TopHeader';
import AccessibilityModal from './components/AccessibilityModal';
import CookieConsentBanner from './components/CookieConsentBanner';
import Footer from './components/Footer';
import PrivacyPolicyModal from './components/PrivacyPolicyModal';
import CitizenPortal from './views/citizen/CitizenPortal';
import DoctorPortal from './views/doctor/DoctorPortal';
import { translations } from './i18n/translations';
import { api } from './services/api';

export default function App() {
  // Localization (persisted in localStorage)
  const [lang, setLang] = useState(() => {
    try {
      return localStorage.getItem('luvn_lang') || 'fi';
    } catch {
      return 'fi';
    }
  });
  const t = translations[lang] || translations.fi;

  // Font size calculation by age:
  // < 40 -> 'normal' (pienin / standardi 16px)
  // 40..55 -> 'large' (keskikokoinen 19px)
  // > 55 -> 'xl' (suurin 22px)
  const getFontSizeByAge = (age) => {
    const numAge = Number(age);
    if (!numAge || numAge < 40) return 'normal';
    if (numAge <= 55) return 'large';
    return 'xl';
  };

  // Accessibility (persisted in localStorage)
  const [highContrast, setHighContrast] = useState(() => {
    try {
      return localStorage.getItem('luvn_highContrast') === 'true';
    } catch {
      return false;
    }
  });

  // Track if user explicitly selected a font size preference
  const [userFontSizePref, setUserFontSizePref] = useState(() => {
    try {
      return localStorage.getItem('luvn_userSelectedFontSize') || null;
    } catch {
      return null;
    }
  });

  const [fontSize, setFontSize] = useState(() => {
    try {
      const savedUserChoice = localStorage.getItem('luvn_userSelectedFontSize');
      if (savedUserChoice) return savedUserChoice;
      const saved = localStorage.getItem('luvn_fontSize');
      return saved || 'xl'; // Default for initial elderly patient (77v Aino) is xl
    } catch {
      return 'xl';
    }
  }); // 'normal' | 'large' | 'xl'

  // Handler when user manually changes font size (saves preference to localStorage)
  const handleUserChangeFontSize = (newSize) => {
    setFontSize(newSize);
    setUserFontSizePref(newSize);
    try {
      localStorage.setItem('luvn_userSelectedFontSize', newSize);
      localStorage.setItem('luvn_fontSize', newSize);
    } catch (e) {
      console.warn('Could not save user font preference', e);
    }
  };

  const [selkokieli, setSelkokieli] = useState(() => {
    try {
      return localStorage.getItem('luvn_selkokieli') === 'true';
    } catch {
      return false;
    }
  });

  const [isA11yOpen, setIsA11yOpen] = useState(false);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
  const [privacyModalTab, setPrivacyModalTab] = useState('gdpr');

  const handleOpenPrivacyTab = (tab = 'gdpr') => {
    setPrivacyModalTab(tab);
    setIsPrivacyOpen(true);
  };

  useEffect(() => {
    const handleOpenPrivacy = (e) => {
      const tab = e.detail || 'gdpr';
      handleOpenPrivacyTab(tab);
    };
    window.addEventListener('hoivapolku_open_privacy', handleOpenPrivacy);
    return () => window.removeEventListener('hoivapolku_open_privacy', handleOpenPrivacy);
  }, []);

  // Navigation State
  // activeView: 'citizen' | 'doctor' | 'professional'
  const [activeView, setActiveView] = useState('citizen');
  // activeTab: 'koti' | 'asiakas' | 'keskustelu' | 'yhteenveto' | 'asetukset'
  const [activeTab, setActiveTab] = useState('koti');
  // Stepper: 1 (Tarkista tiedot), 2 (Täydennä puuttuvat), 3 (Vahvista)
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedSubmissionId, setSelectedSubmissionId] = useState(null);

  // Patient and role data
  const [patients, setPatients] = useState([]);
  const [currentPatient, setCurrentPatient] = useState(null);
  const [actingAs, setActingAs] = useState('self');

  // Form working state
  const [selectedService, setSelectedService] = useState('yleislaakari');
  const [reasonForVisit, setReasonForVisit] = useState('');
  const [medications, setMedications] = useState([]);
  const [diagnoses, setDiagnoses] = useState([]);
  const [allergies, setAllergies] = useState([]);
  const [filledSymptomData, setFilledSymptomData] = useState({});
  const [formResetKey, setFormResetKey] = useState(0);

  // Persist language
  useEffect(() => {
    try {
      localStorage.setItem('luvn_lang', lang);
    } catch (e) {
      console.warn('Could not save lang to localStorage', e);
    }
  }, [lang]);

  // Apply and persist high contrast
  useEffect(() => {
    document.body.classList.toggle('high-contrast', highContrast);
    try {
      localStorage.setItem('luvn_highContrast', String(highContrast));
    } catch (e) {
      console.warn('Could not save highContrast to localStorage', e);
    }
  }, [highContrast]);

  // Apply and persist font size
  useEffect(() => {
    const sizeMap = {
      normal: '16px',
      large: '19px',
      xl: '22px'
    };
    const targetSize = sizeMap[fontSize] || '16px';
    document.documentElement.style.fontSize = targetSize;

    document.documentElement.classList.remove('font-large', 'font-xl');
    document.body.classList.remove('font-large', 'font-xl');
    if (fontSize === 'large') {
      document.documentElement.classList.add('font-large');
      document.body.classList.add('font-large');
    }
    if (fontSize === 'xl') {
      document.documentElement.classList.add('font-xl');
      document.body.classList.add('font-xl');
    }

    try {
      localStorage.setItem('luvn_fontSize', fontSize);
    } catch (e) {
      console.warn('Could not save fontSize to localStorage', e);
    }
  }, [fontSize]);

  // Apply and persist selkokieli mode
  useEffect(() => {
    document.body.classList.toggle('selkokieli-mode', selkokieli);
    try {
      localStorage.setItem('luvn_selkokieli', String(selkokieli));
    } catch (e) {
      console.warn('Could not save selkokieli to localStorage', e);
    }
  }, [selkokieli]);

  // Load initial synthetic patients from backend
  useEffect(() => {
    loadPatients();
  }, []);

  const loadPatients = async () => {
    try {
      const data = await api.getPatients();
      setPatients(data);
      if (data.length > 0) {
        // Default to Matti Virtanen (patient-1, 56v, back pain) or first
        const target = data.find(p => p.id === 'patient-1') || data[0];
        initPatient(target);
      }
    } catch (err) {
      console.error('Failed to load patients:', err);
    }
  };

  const deduplicateMeds = (meds) => {
    if (!Array.isArray(meds)) return [];
    const map = new Map();
    for (const m of meds) {
      if (!m) continue;
      const atcMatch = (m.indication || '').match(/ATC:\s*([A-Za-z0-9]+)/i) || (m.name || '').match(/\(([A-Za-z0-9]+)\)/);
      const key = atcMatch && atcMatch[1]
        ? atcMatch[1].trim().toUpperCase()
        : (m.name || '').trim().toLowerCase();
      if (!key) continue;
      if (!map.has(key)) {
        map.set(key, { ...m });
      } else {
        const existing = map.get(key);
        if (m.is_active && !existing.is_active) {
          existing.is_active = true;
          if (m.schedule) existing.schedule = m.schedule;
        }
        if (m.dosage && !existing.dosage) {
          existing.dosage = m.dosage;
        }
      }
    }
    return Array.from(map.values());
  };

  const deduplicateDiags = (diags) => {
    if (!Array.isArray(diags)) return [];
    const seen = new Set();
    return diags.filter(d => {
      const key = (d.code || d.title_fi || '').trim().toUpperCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  const initPatient = (patient) => {
    setCurrentPatient(patient);
    setMedications(patient.medications ? deduplicateMeds(patient.medications) : []);
    setDiagnoses(patient.diagnoses ? deduplicateDiags(patient.diagnoses) : []);
    setAllergies(patient.allergies ? patient.allergies.map(a => ({ ...a })) : []);
    setActingAs(patient.has_guardian_access ? 'guardian' : 'self');
    const defaultReasons = {
      'patient-1': "Alaselkäkipu säteilee oikeaan pakaraan jo 4 päivää, Burana ei auta riittävästi.",
      'patient-2': "Olkapään ja nivelten kipu pahentunut viikon aikana, kävely ja nostaminen vaikeutunut.",
      'patient-3': "Kova kurkkukipu ja kuume (38.4°C) kestäneet 2 päivää, nieleminen sattuu.",
      'patient-4': "Voimakas väsymys, palelu ja painon nousu jatkunut useita viikkoja."
    };
    setReasonForVisit(defaultReasons[patient?.id] || "Alaselkäkipu säteilee oikeaan pakaraan jo 4 päivää, Burana ei auta riittävästi.");
    setFilledSymptomData({});

    // Determine font size:
    // If the user has explicitly selected a preferred font size in localStorage, respect that.
    // Otherwise, calculate default by age: <40 -> 'normal', 40-55 -> 'large', >55 -> 'xl'.
    try {
      const userChoice = localStorage.getItem('luvn_userSelectedFontSize');
      if (userChoice) {
        setFontSize(userChoice);
      } else if (patient && patient.age !== undefined) {
        const ageDefault = getFontSizeByAge(patient.age);
        setFontSize(ageDefault);
      }
    } catch (err) {
      console.warn('Error applying age-based font size:', err);
    }
  };

  const handleSelectPatientId = (id) => {
    const p = patients.find(item => item.id === id);
    if (p) {
      initPatient(p);
      setFormResetKey(prev => prev + 1);
      const subMap = {
        'patient-1': 'LUVN-2026-98124',
        'patient-2': 'LUVN-2026-98125',
        'patient-3': 'LUVN-2026-98126'
      };
      if (subMap[id]) {
        setSelectedSubmissionId(subMap[id]);
      }
      if (activeView === 'citizen') {
        setActiveTab('koti');
        setCurrentStep(1);
      }
    }
  };

  // View Switcher (Doctor vs Citizen)
  const handleViewChange = (newView) => {
    setActiveView(newView);
    if (newView === 'citizen') {
      setActiveTab('koti');
      setCurrentStep(1);
    } else {
      // When switching to professional view, take them straight to the structured summary desk
      setActiveTab('yhteenveto');
    }
  };

  // Navigation handlers
  const handleJumpToProfessional = (subId) => {
    if (subId) setSelectedSubmissionId(subId);
    setActiveView('doctor');
    setActiveTab('yhteenveto');
  };

  const handleSidebarTabSelect = (tabId) => {
    setActiveTab(tabId);
    if (tabId === 'asetukset') {
      setIsA11yOpen(true);
      return;
    }
    if (tabId === 'asiakas') {
      setCurrentStep(1);
    } else if (tabId === 'keskustelu') {
      setCurrentStep(2);
    } else if (tabId === 'yhteenveto') {
      setCurrentStep(3);
    }
  };

  const handleStepChange = (stepNum) => {
    setCurrentStep(stepNum);
    if (stepNum === 1) {
      setActiveTab('asiakas');
    } else if (stepNum === 2) {
      setActiveTab('keskustelu');
    } else if (stepNum === 3) {
      setActiveTab('yhteenveto');
    }
  };

  const isDoctorRole = activeView === 'doctor' || activeView === 'professional';

  // Compute realistic user identity to avoid authorization mismatch bugs:
  // 1. In Doctor View: Maija Korhonen (Sairaanhoitaja)
  // 2. In Citizen View:
  //    - If actingAs === 'guardian': Maija Korhonen (Valtuutettu omaishoitaja) acting for Aino Virtanen
  //    - If actingAs === 'self': Matti Virtanen (Itseasiointi) acting for himself!
  let displayUserName = 'Maija Korhonen';
  let displayUserRole = 'Sairaanhoitaja / Tiimi 2';
  let displayUserInitials = 'MK';

  if (!isDoctorRole) {
    if (actingAs === 'guardian') {
      displayUserName = currentPatient?.guardian_name || 'Maija Korhonen';
      displayUserRole = 'Valtuutettu omaishoitaja';
      displayUserInitials = 'MK';
    } else {
      displayUserName = currentPatient ? `${currentPatient.first_name} ${currentPatient.last_name}` : 'Matti Virtanen';
      displayUserRole = 'Asiakas (itseasiointi)';
      displayUserInitials = currentPatient ? `${currentPatient.first_name[0]}${currentPatient.last_name[0]}` : 'MV';
    }
  }

  return (
    <div className="hoiva-app-layout">
      {/* HoivaPolku Left Navigation Sidebar */}
      <Sidebar
        activeView={activeView}
        activeTab={activeTab}
        onSelectTab={handleSidebarTabSelect}
        currentLang={lang}
        onLangChange={setLang}
        fontSize={fontSize}
        onChangeFontSize={handleUserChangeFontSize}
        onOpenAccessibility={() => setIsA11yOpen(true)}
        t={t}
      />

      {/* Main App Content Area */}
      <div className="hoiva-main-area">
        {/* Top Header */}
        <TopHeader
          currentStep={currentStep}
          onStepChange={handleStepChange}
          showStepper={false}
          activeView={activeView}
          onViewChange={handleViewChange}
          actingAs={actingAs}
          onActingAsChange={setActingAs}
          patients={patients}
          currentPatient={currentPatient}
          onSelectPatient={handleSelectPatientId}
          userRole={displayUserRole}
          userName={displayUserName}
          userInitials={displayUserInitials}
          t={t}
        />

        {/* Dynamic Main Body Content: cleanly separated between CitizenPortal and DoctorPortal */}
        <main className="hoiva-content-body">
          {activeView === 'citizen' ? (
            <CitizenPortal
              formResetKey={formResetKey}
              activeTab={activeTab}
              onNavigateTab={setActiveTab}
              currentStep={currentStep}
              onStepChange={handleStepChange}
              patient={currentPatient}
              actingAs={actingAs}
              selectedService={selectedService}
              onSelectService={setSelectedService}
              reasonForVisit={reasonForVisit}
              onChangeReason={setReasonForVisit}
              filledSymptomData={filledSymptomData}
              onUpdateFilledData={setFilledSymptomData}
              medications={medications}
              diagnoses={diagnoses}
              allergies={allergies}
              selkokieli={selkokieli}
              onToggleSelkokieli={() => setSelkokieli(!selkokieli)}
              currentLang={lang}
              onJumpToProfessional={handleJumpToProfessional}
              t={t}
            />
          ) : (
            <DoctorPortal
              activeTab={activeTab}
              onNavigateTab={setActiveTab}
              currentStep={currentStep}
              onStepChange={handleStepChange}
              patient={currentPatient}
              patients={patients}
              onSelectPatientId={handleSelectPatientId}
              selectedService={selectedService}
              reasonForVisit={reasonForVisit}
              filledSymptomData={filledSymptomData}
              onUpdateFilledData={setFilledSymptomData}
              selkokieli={selkokieli}
              onToggleSelkokieli={() => setSelkokieli(!selkokieli)}
              currentLang={lang}
              selectedSubmissionId={selectedSubmissionId}
              onSelectSubmissionId={setSelectedSubmissionId}
              onOpenPrivacy={() => handleOpenPrivacyTab('gdpr')}
              t={t}
            />
          )}
        </main>
        
        {/* LUVN Healthcare Site Footer with GDPR, Storage & AI details */}
        <Footer
          onOpenPrivacyTab={handleOpenPrivacyTab}
          onOpenAccessibility={() => setIsA11yOpen(true)}
          t={t}
        />
      </div>

      {/* Accessible Esteettömyys Modal */}
      <AccessibilityModal
        isOpen={isA11yOpen}
        onClose={() => setIsA11yOpen(false)}
        highContrast={highContrast}
        onToggleHighContrast={() => setHighContrast(!highContrast)}
        fontSize={fontSize}
        onChangeFontSize={handleUserChangeFontSize}
        selkokieli={selkokieli}
        onToggleSelkokieli={() => setSelkokieli(!selkokieli)}
      />

      {/* Comprehensive GDPR, Data Storage & AI Usage Information Modal */}
      <PrivacyPolicyModal
        isOpen={isPrivacyOpen}
        onClose={() => setIsPrivacyOpen(false)}
        initialTab={privacyModalTab}
        t={t}
        lang={lang}
      />

      {/* GDPR / Kanta Healthcare Cookie Consent Banner */}
      <CookieConsentBanner t={t} />
    </div>
  );
}

