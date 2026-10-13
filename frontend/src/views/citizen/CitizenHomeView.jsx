import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  AlertTriangle,
  PhoneCall,
  Shield,
  MapPin,
  Clock,
  Mic,
  Square,
  Loader2,
  Sparkles,
  CheckCircle2,
  Send,
  Pill,
  Heart,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Check,
  Plus,
  RotateCcw,
  X,
  Stethoscope,
  Edit3,
  Database,
} from 'lucide-react';
import { api } from '../../services/api';

// ─── STEP CONSTANTS ──────────────────────────────────────────────────────────
const STEPS = {
  SYMPTOM: 'symptom',      // Step 1: Describe complaint
  AI_QS: 'ai_questions',   // Step 1.5: AI clarifying questions
  KANTA: 'kanta',          // Step 2: Review Kanta data
  CONSENT: 'consent',      // Step 3: Confirm & send
};

// ─── COLOR HELPERS ───────────────────────────────────────────────────────────
const OPTION_COLORS = {
  green: { bg: '#f0fdf4', border: '#16a34a', text: '#15803d', activeBg: '#16a34a', activeText: '#fff' },
  yellow: { bg: '#fffbeb', border: '#d97706', text: '#b45309', activeBg: '#d97706', activeText: '#fff' },
  orange: { bg: '#fff7ed', border: '#ea580c', text: '#c2410c', activeBg: '#ea580c', activeText: '#fff' },
  red: { bg: '#fef2f2', border: '#dc2626', text: '#b91c1c', activeBg: '#dc2626', activeText: '#fff' },
};

function OptionBtn ({ opt, selected, onClick }) {
  const c = OPTION_COLORS[opt.color] || OPTION_COLORS.green;
  const isActive = selected === opt.value;
  return (
    <button
      type="button"
      onClick={() => onClick(opt.value)}
      style={{
        flex: '1 1 140px',
        minHeight: '52px',
        padding: '10px 16px',
        borderRadius: '10px',
        border: `2px solid ${isActive ? c.activeBg : c.border}`,
        background: isActive ? c.activeBg : c.bg,
        color: isActive ? c.activeText : c.text,
        fontWeight: 700,
        fontSize: '0.95rem',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      }}
      aria-pressed={isActive}
    >
      {isActive && <Check size={16} style={{ flexShrink: 0 }} />}
      <span>{opt.label}</span>
    </button>
  );
}

// ─── STEP HEADER (collapsed summary or active header) ────────────────────────
function StepHeader ({ num, title, summary, isActive, isDone, onClick }) {
  return (
    <div
      className={`accordion-step-header ${isActive ? 'active' : ''} ${isDone ? 'done' : ''}`}
      onClick={!isActive && isDone ? onClick : undefined}
      role={isDone && !isActive ? 'button' : undefined}
      tabIndex={isDone && !isActive ? 0 : undefined}
      onKeyDown={isDone && !isActive ? (e) => e.key === 'Enter' && onClick() : undefined}
      aria-label={isDone && !isActive ? `Muokkaa: ${title}` : undefined}
    >
      <div className="accordion-step-num-circle">
        {isDone && !isActive
          ? <CheckCircle2 size={20} color="#15803d" />
          : <span>{num}</span>
        }
      </div>
      <div className="accordion-step-header-text">
        <div className="accordion-step-title">{title}</div>
        {isDone && !isActive && summary && (
          <div className="accordion-step-summary">{summary}</div>
        )}
      </div>
      {isDone && !isActive && (
        <div className="accordion-step-edit-hint">
          <Edit3 size={14} />
          <span>Muokkaa</span>
        </div>
      )}
      {isActive && <ChevronUp size={18} className="accordion-chevron" />}
    </div>
  );
}

// ─── PROGRESS BAR ────────────────────────────────────────────────────────────
function ProgressBar ({ current, total }) {
  const pct = Math.round((current / total) * 100);
  return (
    <div className="accordion-progress-wrap" aria-label={`Vaihe ${current} / ${total}`}>
      <div className="accordion-progress-labels">
        <span>Vaihe {current} / {total}</span>
        <span>{pct}% valmis</span>
      </div>
      <div className="accordion-progress-track">
        <div
          className="accordion-progress-fill"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ─── CLINICAL REASON CHIPS BUILDER (DYNAMIC FROM KANTA HISTORY) ─────────────
function getPersonalizedSymptomChips(patient, diagnoses = [], medications = [], t) {
  const chips = [];
  const seenTexts = new Set();

  const addChip = (text, service = 'yleislaakari', isKanta = true) => {
    if (!text || seenTexts.has(text)) return;
    seenTexts.add(text);
    chips.push({ text, service, isKanta });
  };

  const dxCodes = (diagnoses || []).map(d => (d.code || '').toUpperCase());
  const dxTitles = (diagnoses || []).map(d => (d.title_fi || '').toLowerCase());
  const medNames = (medications || []).map(m => (m.name || m.indication || '').toLowerCase());

  // 1. Respiratory / Asthma
  if (dxCodes.some(c => c.startsWith('J45')) || medNames.some(m => m.includes('ventoline') || m.includes('flutiform') || m.includes('astma'))) {
    addChip('Astmaoireiden paheneminen, hengenahdistus tai yöllinen yskä', 'yleislaakari');
  }

  // 2. Hypertension / Cardiovascular
  if (dxCodes.some(c => c.startsWith('I10') || c.startsWith('I11')) || medNames.some(m => m.includes('ramipril') || m.includes('amlodipiini') || m.includes('verenpaine'))) {
    addChip('Verenpaineen nousu tai heittely, aamupäänsärky ja huimaus', 'yleislaakari');
  }

  // 3. Diabetes
  if (dxCodes.some(c => c.startsWith('E11')) || medNames.some(m => m.includes('metformiini') || m.includes('diabetes'))) {
    addChip('Verensokeriarvojen heittely tai jalkaterän pistely', 'yleislaakari');
  }

  // 4. Back pain / Sciatica
  if (dxCodes.some(c => c.startsWith('M54')) || dxTitles.some(t => t.includes('selkä') || t.includes('lumbago'))) {
    addChip('Alaselkäkipu säteilee pakaraan tai alaraajaan', 'yleislaakari');
  }

  // 5. Joint osteoarthritis (Knee / Hip)
  if (dxCodes.some(c => c.startsWith('M17') || c.startsWith('M16') || c.startsWith('M19')) || dxTitles.some(t => t.includes('nivelrikko') || t.includes('polvi'))) {
    addChip('Nivelrikon kipu pahentunut ja liikkuminen vaikeutunut', 'fysioterapia');
  }

  // 6. Fibromyalgia / Polymyalgia / Chronic widespread pain
  if (dxCodes.some(c => c.startsWith('M79')) || dxTitles.some(t => t.includes('fibromyalgia') || t.includes('lihassärky'))) {
    addChip('Laaja-alainen lihas- ja nivelkipu sekä voimakas aamujäykkyys', 'yleislaakari');
  }

  // 7. Thyroid / Hypothyroidism
  if (dxCodes.some(c => c.startsWith('E03')) || medNames.some(m => m.includes('thyroxin') || m.includes('kilpirauhanen'))) {
    addChip('Voimakas uupumus, palelu ja turvotus', 'yleislaakari');
  }

  // 8. Acute infection / Throat / Flu (like Aino Lehtonen scenario)
  if (patient?.first_name === 'Aino' || dxTitles.some(t => t.includes('infektio') || t.includes('flunssa'))) {
    addChip('Kova kurkkukipu, nielemiskipu ja kuume (38.4°C)', 'yleislaakari');
    addChip('Flunssaoireet, poskiontelo- ja otsasärky', 'yleislaakari');
  }

  // 9. Polypharmacy (multiple active medications)
  const activeMeds = (medications || []).filter(m => m.is_active !== false);
  if (activeMeds.length >= 4) {
    addChip('Reseptien uusiminen ja monilääkityksen haittavaikutusarvio', 'yleislaakari');
  }

  // Fallback defaults if fewer than 4 chips
  const defaults = [
    { text: t?.chip1 || 'Alaselkäkipu säteilee pakaraan, 4 päivää', service: 'yleislaakari', isKanta: false },
    { text: t?.chip2 || 'Polven kipu ja kävely vaikeutunut sauvoilla', service: 'fysioterapia', isKanta: false },
    { text: t?.chip3 || 'Korkea kuume ja heikotus', service: 'yleislaakari', isKanta: false },
    { text: t?.chip4 || 'Verenpaineen heittely ja huimaus', service: 'yleislaakari', isKanta: false }
  ];

  for (const d of defaults) {
    if (chips.length >= 4) break;
    addChip(d.text, d.service, d.isKanta);
  }

  return chips.slice(0, 4);
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────
export default function CitizenHomeView ({
  patient,
  actingAs,
  selectedService,
  onSelectService,
  reasonForVisit,
  onChangeReason,
  medications = [],
  diagnoses = [],
  allergies = [],
  t,
  lang = 'fi',
  onJumpToProfessional,
}) {
  const patientName = patient ? `${patient.first_name} ${patient.last_name}` : 'Matti Virtanen';
  const patientAge = patient?.age || 56;
  const isGuardian = actingAs === 'guardian';

  // ── Active accordion step
  const [activeStep, setActiveStep] = useState(STEPS.SYMPTOM);
  const [completedSteps, setCompletedSteps] = useState(new Set());

  // ── Voice recording
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [voiceError, setVoiceError] = useState('');
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  // ── AI questions & LUVN protocols
  const [aiQuestions, setAiQuestions] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiAnswers, setAiAnswers] = useState({});  // { q1: 'value', q2: 'value' }
  const [aiSource, setAiSource] = useState(null); // 'lm_studio_medicus' | 'rule_engine' | 'luvn_official_protocol'
  const [matchedForm, setMatchedForm] = useState(null);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0); // one-at-a-time navigation

  // Deduplication helpers to ensure each distinct medication/diagnosis is only shown once
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

  // ── Kanta local edits
  const [localMeds, setLocalMeds] = useState(() => deduplicateMeds(medications));
  const [localDiags, setLocalDiags] = useState(() => deduplicateDiags(diagnoses));
  const [isAddingMed, setIsAddingMed] = useState(false);
  const [newMedName, setNewMedName] = useState('');
  const [newMedDosage, setNewMedDosage] = useState('');

  // ── Consent & submission
  const [consent1, setConsent1] = useState(true);
  const [consent2, setConsent2] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState(null);

  // Sync Kanta data and reset form state when patient changes
  useEffect(() => { setLocalMeds(deduplicateMeds(medications)); }, [medications]);
  useEffect(() => { setLocalDiags(deduplicateDiags(diagnoses)); }, [diagnoses]);

  useEffect(() => {
    setActiveStep(STEPS.SYMPTOM);
    setCompletedSteps(new Set());
    setAiQuestions(null);
    setAiAnswers({});
    setAiSource(null);
    setMatchedForm(null);
    setCurrentQuestionIdx(0);
    setSubmissionResult(null);
    setIsSubmitting(false);
  }, [patient?.id]);

  // ── Step progress calculation
  const ORDERED_STEPS = [STEPS.SYMPTOM, STEPS.AI_QS, STEPS.KANTA, STEPS.CONSENT];
  const stepNum = { [STEPS.SYMPTOM]: 1, [STEPS.AI_QS]: 2, [STEPS.KANTA]: 3, [STEPS.CONSENT]: 4 };
  const TOTAL_STEPS = 4;

  const currentStepNum = stepNum[activeStep] || 1;
  const isStepDone = (s) => completedSteps.has(s);

  const advanceTo = useCallback((nextStep, prevStep) => {
    if (prevStep) setCompletedSteps(prev => new Set([...prev, prevStep]));
    setActiveStep(nextStep);
    // Smooth scroll to form card top
    setTimeout(() => {
      document.querySelector('.accordion-form-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
  }, []);

  // ── Fetch AI questions when moving from step 1 → 1.5
  const fetchAiQuestions = useCallback(async () => {
    if (!reasonForVisit.trim()) return;
    setAiLoading(true);
    try {
      const medNames = localMeds.filter(m => m.is_active).map(m => `${m.name} ${m.dosage}`);
      const result = await api.analyzeSymptom(reasonForVisit, medNames, lang);
      setAiQuestions(result.questions || []);
      setAiSource(result.source);
      setMatchedForm(result.matched_form || null);
      setCurrentQuestionIdx(0); // always start from q1
    } catch (err) {
      console.warn('AI questions failed, using built-in:', err);
      setAiQuestions(null); // Will show inline fallback
    } finally {
      setAiLoading(false);
    }
  }, [reasonForVisit, localMeds, lang]);

  // ── Voice
  const startRecording = async () => {
    setVoiceError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      mr.ondataavailable = e => { if (e.data?.size > 0) audioChunksRef.current.push(e.data); };
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        if (!audioChunksRef.current.length) { setIsRecording(false); return; }
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setIsRecording(false);
        setIsTranscribing(true);
        try {
          const res = await api.transcribeAudio(blob, lang);
          if (res?.text) onChangeReason(prev => prev ? `${prev} ${res.text}` : res.text);
        } catch (err) {
          setVoiceError(err.message || 'Tekstitys epäonnistui');
        } finally {
          setIsTranscribing(false);
        }
      };
      mr.start();
      setIsRecording(true);
    } catch {
      setIsRecording(false);
      setVoiceError('Mikrofoniin ei saatu yhteyttä. Tarkista selaimen luvat.');
    }
  };
  const stopRecording = () => { if (mediaRecorderRef.current?.state !== 'inactive') mediaRecorderRef.current.stop(); };
  const handleToggleVoice = () => { if (isRecording) stopRecording(); else if (!isTranscribing) startRecording(); };

  // ── Kanta med toggles
  const handleToggleMed = (id) => setLocalMeds(prev => prev.map(m => m.id === id ? { ...m, is_active: !m.is_active } : m));
  const handleAddMed = (e) => {
    e.preventDefault();
    if (!newMedName.trim()) return;
    const cleanName = newMedName.trim();
    setLocalMeds(prev => {
      const existingIdx = prev.findIndex(m => m.name.toLowerCase() === cleanName.toLowerCase());
      if (existingIdx !== -1) {
        return prev.map((m, idx) => idx === existingIdx ? { ...m, is_active: true } : m);
      }
      return [...prev, {
        id: `med-custom-${Date.now()}`,
        name: cleanName,
        dosage: newMedDosage.trim() || 'tarvittaessa',
        schedule: 'Itse ilmoitettu lisäys',
        is_active: true,
        customAdded: true
      }];
    });
    setNewMedName(''); setNewMedDosage(''); setIsAddingMed(false);
  };

  // ── AI Questions completeness
  const allAiAnswered = Boolean(aiQuestions && aiQuestions.length >= 2 && aiQuestions.every(q => Boolean(aiAnswers[q.id])));
  const answeredAiCount = aiQuestions ? aiQuestions.filter(q => Boolean(aiAnswers[q.id])).length : 0;

  // ── Submit
  const handleSubmit = async () => {
    if (!reasonForVisit.trim()) return;
    setIsSubmitting(true);
    try {
      const q1Ans = aiAnswers.q1 || '';
      const accomp = [];
      const aiTriageAnswers = [];

      aiQuestions?.forEach(q => {
        const ans = aiAnswers[q.id];
        if (!ans) return;
        const opt = q.options?.find(o => o.value === ans);
        const optLabel = opt ? opt.label : ans;
        const isRed = opt?.color === 'red' || ans === 'yes' || ans === 'none'
          || ans === 'cannot_swallow' || ans === 'severe_stiff' || ans === 'sharp_pain';

        // Legacy accompanying_symptoms for backward compat
        if (isRed) {
          accomp.push(`⚠️ ${q.badge}: ${optLabel}`);
        } else if (q.id !== 'q1') {
          accomp.push(`${q.badge}: ${optLabel}`);
        }

        // Structured triage answer for new doctor panel
        aiTriageAnswers.push({
          question_id: q.id,
          badge: q.badge || '',
          question_text: q.text || '',
          answer_value: ans,
          answer_label: optLabel,
          is_red_flag: isRed,
        });
      });

      const result = await api.submitPrevisit({
        patient_id: patient?.id || 'patient-1',
        acting_as: actingAs,
        guardian_name: actingAs === 'guardian' ? (patient?.guardian_name || 'Maija Korhonen') : null,
        service_id: selectedService,
        language: lang,
        reason_for_visit: reasonForVisit,
        symptom_duration: '4 päivää',
        pain_scale: q1Ans ? parseInt(q1Ans.split('-')[0]) || null : null,
        accompanying_symptoms: accomp,
        ai_triage_answers: aiTriageAnswers,
        impact_on_daily_life: 'Kerrottu esitietolomakkeessa',
        confirmed_medications: localMeds,
        confirmed_diagnoses: localDiags,
        allergies: allergies || [],
        consent_given: consent1 && consent2,
        ai_assisted_structuring: true,
      });
      setSubmissionResult(result);
    } catch (err) {
      console.error('Submission error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };


  // AI triage removed for MDR compliance — no automated urgency/routing shown to users

  // ── STEP 1 & 2 summaries (collapsed)
  const step1Summary = reasonForVisit ? `"${reasonForVisit.substring(0, 70)}${reasonForVisit.length > 70 ? '…' : ''}"` : '';
  const hasRedFlag = Boolean(aiQuestions?.some(q => {
    const ans = aiAnswers[q.id];
    const opt = q.options?.find(o => o.value === ans);
    return opt?.color === 'red' || ans === 'yes' || ans === 'none' || ans === 'cannot_swallow' || ans === 'severe_stiff' || ans === 'sharp_pain';
  }));
  // step2Summary only visible after step 1 is done (completedSteps contains SYMPTOM)
  const step2Summary = completedSteps.has(STEPS.SYMPTOM) && answeredAiCount > 0
    ? `Oirekartoitus: vastattu ${answeredAiCount}/${aiQuestions?.length || 2} • ${hasRedFlag ? '⚠️ Turvallisuusriski huomioitu' : 'Ei akuutteja punaisia lippuja'}`
    : '';
  const step3Summary = `${localMeds.filter(m => m.is_active).length} lääkettä vahvistettu`;

  // ─── SUCCESS STATE ──────────────────────────────────────────────────────────
  if (submissionResult) {
    return (
      <div className="citizen-home-container">
        <div className="booking-success-card">
          <div className="success-icon-circle"><CheckCircle2 size={48} /></div>
          <h2 className="success-title">{t?.bookingSuccessTitle || 'Esitiedot lähetetty!'}</h2>
          <p className="success-subtitle">{t?.bookingSuccessSubtitle || 'Espoonlahden hoitotiimi käsittelee tiedot pian.'}</p>
          <div className="success-ref-box">
            <span className="success-ref-label">{t?.refNumberLabel || 'Viitenumero'}</span>
            <span className="success-ref-code">{submissionResult.submission_id}</span>
          </div>
          <div className="success-next-steps">
            <h3><Clock size={18} /> {t?.whatNextTitle || 'Mitä tapahtuu seuraavaksi?'}</h3>
            <ul>
              <li>{t?.whatNext1 || 'Hoitotiimi vastaa 1–3 arkipäivän kuluessa OmaKanta- tai Lunna-viestillä tai puhelimitse.'}</li>
              <li>{t?.whatNext2 || 'Tekoäly on koonnut lääkärille valmiin kliinisen esitietokoosteen.'}</li>
              <li>{t?.whatNext3 || 'Tiedot on suojattu salauksella (Kanta-yhteensopiva muoto).'}</li>
            </ul>
          </div>
          {onJumpToProfessional && (
            <button
              type="button"
              className="btn-citizen-proceed"
              style={{ margin: '8px auto 0', display: 'inline-flex', gap: '8px' }}
              onClick={() => onJumpToProfessional(submissionResult.submission_id)}
            >
              <Stethoscope size={18} />
              <span>{t?.btnJumpDemo || 'Katso ammattilaisnäkymä (demo)'}</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  // ─── MAIN ACCORDION FORM ────────────────────────────────────────────────────
  return (
    <div className="citizen-home-container">

      {/* Emergency banner */}
      <aside className="emergency-alert-card" role="alert" style={{ marginTop: '10px' }}>
        <div className="emergency-alert-icon-box">
          <AlertTriangle size={22} className="alert-red-icon" />
        </div>
        <div className="emergency-alert-text">
          <h2 className="emergency-alert-title">{t?.emergencyTitle || 'Hätätilanne? Soita 112 tai 116 117'}</h2>
          <p className="emergency-alert-desc">
            {t?.emergencyDesc || 'Äkillinen rintakipu, hengenahdistus, halvausoireilu tai tajuttomuus → soita heti.'}
          </p>
        </div>
        <div className="emergency-action-buttons">
          <a href="tel:112" className="btn-call-emergency btn-call-112"><PhoneCall size={15} /><span>112</span></a>
          <a href="tel:116117" className="btn-call-emergency btn-call-116117"><PhoneCall size={15} /><span>116 117</span></a>
        </div>
      </aside>

      {/* Patient greeting card */}
      <section className="patient-home-greeting-card" aria-label="Tervetulotoivotus">
        <div className="patient-home-greeting-left">
          <div className="patient-kanta-badge">
            <Shield size={13} className="badge-shield-icon" />
            <span>
              {isGuardian
                ? (t?.suomiFiGuardianBadge || 'Suomi.fi-valtuus • Kanta yhdistetty • Valtuutettu asiointi')
                : (t?.suomiFiKantaBadge || 'Suomi.fi tunnistautuminen • Kanta-arkisto yhdistetty')}
            </span>
          </div>
          <h1 className="patient-home-title">
            {isGuardian
              ? (t?.welcomeGreetingGuardian?.replace('{guardian}', 'Maija').replace('{name}', patientName) || `Hei Maija! Asioit valtuutettuna henkilön ${patientName} puolesta.`)
              : (t?.welcomeGreeting?.replace('{name}', patient?.first_name || 'Matti') || `Hei ${patient?.first_name || 'Matti'}, tervetuloa!`)}
          </h1>
          <p className="patient-home-subtitle">
            {isGuardian
              ? (t?.welcomeSubtitleGuardian?.replace('{name}', patientName).replace('{age}', patientAge) || <><strong>{patientName} ({patientAge} v)</strong> — esitiedot lähetetään hänen puolestaan.</>)
              : (t?.welcomeSubtitle || 'Kerro vaivasi alla — tekoäly ja hoitotiimi huolehtivat ohjauksesta.')}
          </p>
          <div className="assigned-health-center-box">
            <div className="center-info-row">
              <MapPin size={14} color="#0284c7" />
              <span><strong>{t?.assignedCenter || 'Oma terveysasema:'}</strong> {t?.assignedCenterName || 'Espoonlahden terveysasema, Tiimi 2'}</span>
            </div>
            <div className="center-info-row secondary">
              <Clock size={13} color="#64748b" />
              <span>{t?.assignedCenterAddr || 'Merikansantie 4, 02320 Espoo • Arkisin 08–16'}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Progress bar */}
      <ProgressBar current={currentStepNum} total={TOTAL_STEPS} />

      {/* ═══════════════ ACCORDION FORM ═══════════════ */}
      <div className="accordion-form-card">

        {/* ──────────── STEP 1: Kerro oireesi ──────────── */}
        <div className={`accordion-step ${activeStep === STEPS.SYMPTOM ? 'is-active' : ''} ${isStepDone(STEPS.SYMPTOM) ? 'is-done' : ''}`}>
          <StepHeader
            num="1"
            title={t?.step1Title || 'Kerro oireesi tai käynnin syy'}
            summary={step1Summary}
            isActive={activeStep === STEPS.SYMPTOM}
            isDone={isStepDone(STEPS.SYMPTOM)}
            onClick={() => setActiveStep(STEPS.SYMPTOM)}
          />

          {activeStep === STEPS.SYMPTOM && (
            <div className="accordion-step-body">
              <p className="accordion-step-hint">
                {t?.step1Hint || 'Kerro omin sanoin tai valitse alla olevista esimerkeistä — tekoäly ja hoitotiimi ohjaavat sinut oikeaan paikkaan.'}
              </p>

              {/* Quick chips with Kanta personalization */}
              {(() => {
                const chips = getPersonalizedSymptomChips(patient, diagnoses, medications, t);
                const hasKantaCustomized = chips.some(c => c.isKanta);
                return (
                  <div style={{ marginBottom: 14 }}>
                    {hasKantaCustomized && (
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '6px', 
                        fontSize: '0.78rem', 
                        color: '#0284c7', 
                        fontWeight: 600, 
                        marginBottom: '6px' 
                      }}>
                        <Database size={13} />
                        <span>Ehdotukset Kanta-sairauskertomuksesi ja lääkityksesi perusteella:</span>
                      </div>
                    )}
                    <div className="chips-container-grid">
                      {chips.map((chip, i) => (
                        <button key={i} type="button"
                          className={`clinical-chip-btn ${reasonForVisit === chip.text ? 'active' : ''}`}
                          onClick={() => { onChangeReason(chip.text); onSelectService(chip.service); }}
                        >
                          {chip.text}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* EU AI Act Art. 50 — AI disclosure notice */}
              <div className="ai-disclosure-notice" role="note" aria-label="Tekoälyilmoitus">
                <span className="ai-badge-pill"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }}><path d="M12 2a5 5 0 0 1 5 5v2a5 5 0 0 1-10 0V7a5 5 0 0 1 5-5z" /><path d="M2 17c0-3 2.5-5 5-5h10c2.5 0 5 2 5 5" /></svg>Tekoäly (AI)</span>
                <span className="ai-disclosure-text">{t?.aiDisclosure || 'Tekoälyavustaja auttaa esitietojen kokoamisessa. Asioit tekoälyavustajan kanssa — et lääkärin tai hoitajan.'}</span>
                <button
                  type="button"
                  onClick={() => window.dispatchEvent(new CustomEvent('hoivapolku_open_privacy', { detail: 'ai' }))}
                  style={{
                    marginLeft: 'auto',
                    background: 'none',
                    border: 'none',
                    color: '#0284c7',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    padding: '2px 6px',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {t?.btnLearnAiPrivacy || 'Miten tekoäly käyttää tietojasi?'}
                </button>
              </div>

              {/* Textarea + voice */}
              <div className="textarea-container">
                <textarea
                  id="reason-textarea"
                  rows={4}
                  className="clinical-symptom-textarea"
                  placeholder={t?.placeholderReason || 'Tai kirjoita omin sanoin, esim. «Alaselkäkipu on säteillyt pakaraan jo 4 päivää, Burana ei auta.»'}
                  value={reasonForVisit}
                  onChange={e => onChangeReason(e.target.value)}
                />
                <div className="textarea-bottom-toolbar">
                  <button type="button"
                    className={`btn-voice-dictate ${isRecording ? 'recording' : ''}`}
                    onClick={handleToggleVoice}
                    disabled={isTranscribing}
                    title="Puhu mikrofonille (Whisper large-v3-turbo)"
                  >
                    {isTranscribing ? <><Loader2 size={15} className="animate-spin" /><span>{t?.voiceTranscribingBtn || 'Tekstitetään...'}</span></>
                      : isRecording ? <><Square size={13} fill="currentColor" /><span>{t?.voiceStop || 'Lopeta'}</span></>
                        : <><Mic size={15} /><span>{t?.voiceDictate || 'Sanele puheella'}</span></>}
                  </button>
                  <span className="character-counter">
                    {reasonForVisit ? (t?.charCounterText?.replace('{count}', reasonForVisit.length) || `${reasonForVisit.length} merkkiä`) : (t?.charCounterEmpty || 'Puhu tai kirjoita')}
                  </span>
                </div>
              </div>

              {voiceError && <div className="voice-error-text" role="alert">{voiceError}</div>}

              {/* AI triage card removed — MDR compliance (no automated urgency/routing displayed to patients) */}

              <div className="accordion-step-actions">
                <button
                  type="button"
                  className="btn-citizen-proceed"
                  disabled={!reasonForVisit.trim()}
                  onClick={async () => {
                    advanceTo(STEPS.AI_QS, STEPS.SYMPTOM);
                    await fetchAiQuestions();
                  }}
                >
                  <span>{t?.btnContinue || 'Jatka'}</span>
                  <ChevronRight size={18} />
                </button>
                {!reasonForVisit.trim() && (
                  <p className="submit-hint-text" style={{ marginTop: 8, textAlign: 'left' }}>
                    {t?.step1RequiredHint || 'Kirjoita tai sanelee oirekuvaus ensin.'}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ──────────── STEP 2: AI Clarifying Questions ──────────── */}
        <div className={`accordion-step ${activeStep === STEPS.AI_QS ? 'is-active' : ''} ${isStepDone(STEPS.AI_QS) ? 'is-done' : ''}`}>
          <StepHeader
            num="2"
            title={t?.step2Title || 'Tekoäly kysyy tarkentavia kysymyksiä'}
            summary={step2Summary}
            isActive={activeStep === STEPS.AI_QS}
            isDone={isStepDone(STEPS.AI_QS)}
            onClick={() => setActiveStep(STEPS.AI_QS)}
          />

          {activeStep === STEPS.AI_QS && (
            <div className="accordion-step-body">
              {aiLoading ? (
                <div className="ai-loading-block">
                  <Loader2 size={28} className="animate-spin" style={{ color: '#0284c7' }} />
                  <p>{t?.step2Analyzing || 'Analysoidaan oirekuvausta kliinisen mallin avulla…'}</p>
                  <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                    {t?.step2AnalyzingSub || 'Tarkistetaan mahdolliset lisäkysymykset ja turvallisuustekijät…'}
                  </p>
                </div>
              ) : aiQuestions && aiQuestions.length >= 2 ? (
                <div className="ai-gap-questions-card">
                  {aiSource && (
                    <div className="ai-source-badge" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Sparkles size={12} />
                        <span>
                          {aiSource === 'luvn_official_protocol'
                            ? `LUVN-esitietoprotokolla: ${matchedForm?.title || 'Virallinen oirekysely'}`
                            : aiSource === 'lm_studio_medicus'
                              ? (t?.aiSourceMedicus || 'Tekoälyavustaja (Medicus AI) — esitietolomake')
                              : (t?.aiSourceFallback || 'Tekoälyavustaja — esitietolomake')}
                        </span>
                        <button
                          type="button"
                          onClick={() => window.dispatchEvent(new CustomEvent('hoivapolku_open_privacy', { detail: 'ai' }))}
                          style={{
                            marginLeft: 8,
                            background: 'none',
                            border: 'none',
                            color: '#0284c7',
                            fontSize: '0.74rem',
                            textDecoration: 'underline',
                            cursor: 'pointer',
                            padding: 0
                          }}
                        >
                          Tietosuoja & AI
                        </button>
                      </div>
                      <span style={{ fontSize: '0.78rem', fontWeight: 600, color: allAiAnswered ? '#059669' : '#0284c7' }}>
                        {allAiAnswered
                          ? (t?.allAnswered || '✓ Kaikkiin vastattu')
                          : (t?.answeredCount?.replace('{current}', answeredAiCount).replace('{total}', aiQuestions.length) || `Vastattu: ${answeredAiCount} / ${aiQuestions.length}`)}
                      </span>
                    </div>
                  )}

                  {matchedForm && (
                    <div style={{
                      fontSize: '0.76rem',
                      color: '#0369a1',
                      background: '#f0f9ff',
                      border: '1px solid #bae6fd',
                      borderRadius: '8px',
                      padding: '6px 12px',
                      marginBottom: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      lineHeight: 1.4
                    }}>
                      <span>📋</span>
                      <span>
                        <strong>Länsi-Uusimaa (LUVN):</strong> Kysymykset noudattavat virallista alueellista esitietoprotokollaa (Protokolla-ID: {matchedForm.guid ? matchedForm.guid.slice(0, 8) + '…' : 'LUVN-STD'}).
                      </span>
                    </div>
                  )}

                  {/* ONE-AT-A-TIME question display */}
                  {(() => {
                    const safeIdx = Math.min(Math.max(0, currentQuestionIdx), aiQuestions.length - 1);
                    const q = aiQuestions[safeIdx];
                    if (!q) return null;
                    const isAnswered = Boolean(aiAnswers[q.id]);

                    const handleAnswer = (val) => {
                      setAiAnswers(prev => ({ ...prev, [q.id]: val }));
                      // Auto-advance to next unanswered question after short delay
                      if (safeIdx < aiQuestions.length - 1) {
                        setTimeout(() => {
                          setCurrentQuestionIdx(idx => Math.min(aiQuestions.length - 1, idx + 1));
                        }, 380);
                      }
                    };

                    return (
                      <div key={q.id} className="ai-question-box ai-question-single">
                        {/* Progress dots */}
                        <div className="ai-question-progress-dots">
                          {aiQuestions.map((_, i) => (
                            <button
                              key={i}
                              type="button"
                              className={`ai-dot ${aiAnswers[aiQuestions[i].id] ? 'answered' : ''
                                } ${i === safeIdx ? 'active' : ''}`}
                              onClick={() => setCurrentQuestionIdx(i)}
                              aria-label={`Kysymys ${i + 1}`}
                            />
                          ))}
                          <span className="ai-dot-counter">{safeIdx + 1} / {aiQuestions.length}</span>
                        </div>

                        <div className="ai-question-title-row">
                          <span className={`ai-question-badge ${q.type === 'red_flag' ? 'red-flag' : ''}`}>
                            {q.type === 'pain_scale' ? '📊 ' : '🚩 '}{q.badge}
                          </span>
                          <span className="ai-question-text">{q.text}</span>
                        </div>

                        <div className="ai-options-row">
                          {q.options.map(opt => (
                            <OptionBtn
                              key={opt.value}
                              opt={opt}
                              selected={aiAnswers[q.id]}
                              onClick={handleAnswer}
                            />
                          ))}
                        </div>

                        {/* Red flag alert */}
                        {q.red_flag_alert && (aiAnswers[q.id] === 'yes' || aiAnswers[q.id] === 'none' || aiAnswers[q.id] === 'cannot_swallow' || aiAnswers[q.id] === 'severe_stiff' || aiAnswers[q.id] === 'sharp_pain') && (
                          <div className="red-flag-immediate-alert">
                            <AlertTriangle size={20} color="#b91c1c" style={{ flexShrink: 0 }} />
                            <div>
                              <strong>{t?.emergencyNotice || 'Päivystyksellinen huomio:'}</strong>
                              <p>{q.red_flag_alert}</p>
                            </div>
                          </div>
                        )}

                        {/* Kanta medication cross-reference */}
                        {q.type === 'red_flag' && aiAnswers.q1 && localMeds.filter(m => m.is_active && /burana|ibuprofen/i.test(m.name)).length > 0 && (
                          <div className="kanta-cross-ref-hint">
                            <Pill size={13} />
                            <span>
                              Lääkelistallasi on <strong>Burana</strong> — oletko ottanut sitä? Onko siitä ollut apua?
                            </span>
                            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                              {['Kyllä, ei auta', 'En ole ottanut', 'On auttanut'].map(opt => (
                                <button key={opt} type="button"
                                  className="kanta-action-pill-btn"
                                  style={{
                                    background: aiAnswers.burana === opt ? '#0284c7' : undefined,
                                    color: aiAnswers.burana === opt ? 'white' : undefined,
                                  }}
                                  onClick={() => setAiAnswers(prev => ({ ...prev, burana: opt }))}
                                >{opt}</button>
                              ))}
                            </div>
                          </div>
                        )}

                        {isAnswered && (
                          <div className="ai-answered-badge">
                            <Check size={13} />
                            <span>{t?.answeredSavedBadge || 'Vastattu — tallennetaan hoitotiimin esitietoihin'}</span>
                          </div>
                        )}

                        {/* Navigation between questions */}
                        <div className="ai-question-nav">
                          {safeIdx > 0 && (
                            <button
                              type="button"
                              className="btn-ai-nav-prev"
                              onClick={() => setCurrentQuestionIdx(idx => Math.max(0, idx - 1))}
                            >
                              ← {t?.btnPrev || 'Edellinen'}
                            </button>
                          )}
                          {safeIdx < aiQuestions.length - 1 && (
                            <button
                              type="button"
                              className="btn-ai-nav-next"
                              disabled={!isAnswered}
                              onClick={() => setCurrentQuestionIdx(idx => Math.min(aiQuestions.length - 1, idx + 1))}
                            >
                              {t?.btnNext || 'Seuraava'} →
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })()}


                  <div className="accordion-step-actions">
                    <button
                      type="button"
                      className="btn-citizen-proceed"
                      disabled={!allAiAnswered}
                      onClick={() => advanceTo(STEPS.KANTA, STEPS.AI_QS)}
                    >
                      <span>{t?.btnContinue || 'Jatka'}</span>
                      <ChevronRight size={18} />
                    </button>
                    {!allAiAnswered && (
                      <p className="submit-hint-text" style={{ marginTop: 8, textAlign: 'left' }}>
                        {t?.answerAllPrompt?.replaceAll('{total}', aiQuestions.length).replace('{current}', answeredAiCount) || `Vastaa kaikkiin ${aiQuestions.length} tarkentavaan kysymykseen jatkaaksesi (${answeredAiCount}/${aiQuestions.length} vastattu).`}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="ai-loading-block">
                  <p style={{ color: '#64748b' }}>{t?.noQuestionsFallback || 'Kysymyksiä ei voitu ladata. Voit jatkaa suoraan.'}</p>
                  <button
                    type="button"
                    className="btn-citizen-proceed"
                    onClick={() => advanceTo(STEPS.KANTA, STEPS.AI_QS)}
                    style={{ marginTop: 12 }}
                  >
                    <span>{t?.btnContinue || 'Jatka'}</span><ChevronRight size={18} />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ──────────── STEP 3: Kanta tiedot ──────────── */}
        <div className={`accordion-step ${activeStep === STEPS.KANTA ? 'is-active' : ''} ${isStepDone(STEPS.KANTA) ? 'is-done' : ''}`}>
          <StepHeader
            num="3"
            title={t?.step3Title || 'Tarkista lääkityksesi ja diagnoosisi (Kanta)'}
            summary={step3Summary}
            isActive={activeStep === STEPS.KANTA}
            isDone={isStepDone(STEPS.KANTA)}
            onClick={() => setActiveStep(STEPS.KANTA)}
          />

          {activeStep === STEPS.KANTA && (
            <div className="accordion-step-body">
              <p className="accordion-step-hint">
                {t?.step3Hint || 'Tiedot on haettu Kanta-arkistostasi. Merkitse jos et enää käytä jotain lääkettä, tai lisää uusi.'}
              </p>

              {/* Medications */}
              <div className="kanta-summary-item" style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, padding: 10 }}>
                  <div className="kanta-icon-circle green-pill" style={{ width: 34, height: 34, minWidth: 34 }}>
                    <Pill size={15} />
                  </div>
                  <div>
                    <div className="kanta-item-title">{t?.medicationTitle || 'Lääkitys'}</div>
                    <div className="kanta-item-sub">
                      {t?.medActiveCount?.replace('{count}', localMeds.filter(m => m.is_active).length) || `${localMeds.filter(m => m.is_active).length} aktiivista`}
                      {localMeds.some(m => !m.is_active) && ` • ${t?.medStoppedCount?.replace('{count}', localMeds.filter(m => !m.is_active).length) || `${localMeds.filter(m => !m.is_active).length} lopetettu`}`}
                    </div>
                  </div>
                  <span className="kanta-status-badge green" style={{ marginLeft: 'auto' }}>{t?.badgeKantaVerified || '✓ Kanta'}</span>
                </div>

                {localMeds.map(m => (
                  <div key={m.id} className={`kanta-med-row ${!m.is_active ? 'is-stopped' : ''}`}>
                    <div className="kanta-med-info">
                      <div className="kanta-med-name">{m.name}{m.dosage && m.dosage !== m.schedule ? ` ${m.dosage}` : ''}</div>
                      <div className="kanta-med-sub">{m.schedule || 'Säännöllinen'}</div>
                    </div>
                    <div className="kanta-med-actions">
                      {!m.is_active ? (
                        <>
                          <span className="kanta-stopped-badge">{t?.badgeStopped || 'Lopetettu'}</span>
                          <button type="button" className="kanta-action-pill-btn restore" onClick={() => handleToggleMed(m.id)}>
                            <RotateCcw size={11} style={{ display: 'inline', marginRight: 3 }} />{t?.btnRestore || 'Palauta'}
                          </button>
                        </>
                      ) : (
                        <>
                          {m.customAdded
                            ? <span className="kanta-custom-badge">{t?.badgeCustomAdded || 'Itse lisätty'}</span>
                            : <span className="kanta-status-badge green" style={{ fontSize: '0.7rem' }}>{t?.badgeKantaVerified || '✓ Kanta'}</span>}
                          <button type="button" className="kanta-action-pill-btn stop" onClick={() => handleToggleMed(m.id)}>
                            <X size={11} style={{ display: 'inline', marginRight: 3 }} />{t?.btnDontUse || 'En käytä'}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}

                <div className="kanta-add-section">
                  {!isAddingMed ? (
                    <button type="button" className="kanta-add-btn" onClick={() => setIsAddingMed(true)}>
                      <Plus size={14} /><span>{t?.btnAddMed || 'Lisää lääke tai luontaistuote'}</span>
                    </button>
                  ) : (
                    <form onSubmit={handleAddMed} className="kanta-inline-add-form">
                      <input type="text" placeholder={t?.medNamePlaceholder || 'Lääkkeen nimi'} className="kanta-inline-input"
                        value={newMedName} onChange={e => setNewMedName(e.target.value)} autoFocus />
                      <input type="text" placeholder={t?.medDosagePlaceholder || 'Annos (esim. 20 µg)'} className="kanta-inline-input"
                        value={newMedDosage} onChange={e => setNewMedDosage(e.target.value)} />
                      <button type="submit" className="kanta-inline-submit-btn">{t?.btnSave || 'Tallenna'}</button>
                      <button type="button" className="kanta-inline-cancel-btn"
                        onClick={() => { setIsAddingMed(false); setNewMedName(''); setNewMedDosage(''); }}>{t?.btnCancel || 'Peruuta'}</button>
                    </form>
                  )}
                </div>
              </div>

              {/* Diagnoses summary */}
              <div className="kanta-summary-item no-expand" style={{ marginBottom: 16 }}>
                <div className="kanta-expand-left">
                  <div className="kanta-icon-circle purple" style={{ width: 34, height: 34, minWidth: 34 }}><Heart size={15} /></div>
                  <div>
                    <div className="kanta-item-title">{t?.diagnosesTitle || 'Perussairaudet'}</div>
                    <div className="kanta-item-sub">
                      {localDiags.slice(0, 2).map(d => lang === 'sv' ? (d.title_sv || d.title_fi) : (d.title_fi)).join(' • ') || (t?.noneRecorded || 'Ei kirjattuja')}
                    </div>
                  </div>
                </div>
                <span className="kanta-status-badge green">{t?.badgeKantaVerified || '✓ Kanta'}</span>
              </div>

              {/* Allergies */}
              {allergies?.length > 0 && (
                <div className="kanta-summary-item no-expand" style={{ marginBottom: 16 }}>
                  <div className="kanta-expand-left">
                    <div className="kanta-icon-circle orange-soft" style={{ width: 34, height: 34, minWidth: 34 }}>
                      <AlertTriangle size={15} />
                    </div>
                    <div>
                      <div className="kanta-item-title">{t?.allergiesTitle || 'Allergiat'}</div>
                      <div className="kanta-item-sub">{allergies.map(a => a.allergen).join(', ')}</div>
                    </div>
                  </div>
                  <span className="kanta-status-badge green">{t?.badgeKantaVerified || '✓ Kanta'}</span>
                </div>
              )}

              <div className="accordion-step-actions">
                <button type="button" className="btn-citizen-proceed"
                  onClick={() => advanceTo(STEPS.CONSENT, STEPS.KANTA)}>
                  <span>{t?.btnContinue || 'Jatka'}</span><ChevronRight size={18} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ──────────── STEP 4: Vahvista & Lähetä ──────────── */}
        <div className={`accordion-step ${activeStep === STEPS.CONSENT ? 'is-active' : ''} ${isStepDone(STEPS.CONSENT) ? 'is-done' : ''}`}>
          <StepHeader
            num="4"
            title={t?.step4Title || 'Vahvista ja lähetä'}
            summary={t?.step4Summary || 'Esitiedot lähetetään hoitotiimille'}
            isActive={activeStep === STEPS.CONSENT}
            isDone={isStepDone(STEPS.CONSENT)}
            onClick={() => setActiveStep(STEPS.CONSENT)}
          />

          {activeStep === STEPS.CONSENT && (
            <div className="accordion-step-body">
              {/* Mini summary of collected data */}
              <div className="consent-summary-box">
                <h3>{t?.summaryTitle || 'Yhteenveto lähettävistä tiedoista'}</h3>
                <div className="consent-summary-row">
                  <span className="cs-label">{t?.labelAilment || 'Vaiva:'}</span>
                  <span className="cs-value">"{reasonForVisit.substring(0, 60)}{reasonForVisit.length > 60 ? '…' : ''}"</span>
                </div>
                {aiAnswers.q1 && (
                  <div className="consent-summary-row">
                    <span className="cs-label">{t?.labelCondition || 'Kiputaso:'}</span>
                    <span className="cs-value">
                      {/* Convert range "7-9" to midpoint for clinical readability */}
                      {(() => {
                        const raw = aiAnswers.q1 || '';
                        if (raw.includes('-')) {
                          const parts = raw.split('-').map(Number);
                          const mid = Math.round((parts[0] + parts[1]) / 2);
                          return `${mid} / 10`;
                        }
                        return `${raw} / 10`;
                      })()}
                    </span>
                  </div>
                )}
                {aiQuestions && aiQuestions.length > 1 && (
                  <div className="consent-summary-row">
                    <span className="cs-label">{t?.labelClarifications || 'Tarkentavat tiedot:'}</span>
                    <span className="cs-value">{t?.clarificationsAnswered?.replace('{current}', answeredAiCount).replace('{total}', aiQuestions.length) || `${answeredAiCount} / ${aiQuestions.length} kysymykseen vastattu`}</span>
                  </div>
                )}
                <div className="consent-summary-row">
                  <span className="cs-label">{t?.medicationTitle || 'Lääkitys'}:</span>
                  <span className="cs-value">{t?.labelMedsConfirmed?.replace('{count}', localMeds.filter(m => m.is_active).length) || `${localMeds.filter(m => m.is_active).length} lääkettä vahvistettu`}</span>
                </div>
                {localMeds.some(m => !m.is_active) && (
                  <div className="consent-summary-row">
                    <span className="cs-label">{t?.labelStopped || 'Lopetettu:'}</span>
                    <span className="cs-value cs-stopped">
                      {localMeds.filter(m => !m.is_active).map(m => m.name).join(', ')}
                    </span>
                  </div>
                )}
              </div>

              <div className="consent-block">
                <label className="consent-label">
                  <input type="checkbox" checked={consent1} onChange={e => setConsent1(e.target.checked)} />
                  <span>{t?.consentText1 || 'Vahvistan, että tiedot ovat oikein ja annan luvan niiden käyttöön terveydenhuollon tarkoituksiin.'}</span>
                </label>
                <label className="consent-label">
                  <input type="checkbox" checked={consent2} onChange={e => setConsent2(e.target.checked)} />
                  <span>{t?.consentText2 || 'Hyväksyn tietojen siirron Kanta-arkistoon ja LUVN:n potilastietojärjestelmään.'}</span>
                </label>
              </div>

              <button
                type="button"
                className="btn-citizen-proceed btn-submit-main"
                onClick={handleSubmit}
                disabled={!consent1 || !consent2 || isSubmitting}
              >
                {isSubmitting
                  ? <><Loader2 size={18} className="animate-spin" /><span>{t?.submitting || 'Lähetetään…'}</span></>
                  : <><Send size={18} /><span>{t?.btnSubmitMain || 'Lähetä esitiedot hoitotiimille'}</span></>}
              </button>

              <div className="submit-process-timing-note">
                <Clock size={15} style={{ flexShrink: 0, color: '#0284c7' }} />
                <span>{t?.timingNote || 'Hoitotiimi vastaa 1–3 arkipäivän kuluessa OmaKanta- tai Lunna-viestillä tai puhelimitse.'}</span>
              </div>
            </div>
          )}
        </div>

      </div>{/* /accordion-form-card */}
    </div>
  );
}
