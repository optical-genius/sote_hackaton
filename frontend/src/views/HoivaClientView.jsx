import React, { useState, useRef, useEffect } from 'react';
import {
  User,
  Heart,
  Pill,
  Calendar,
  Users,
  CheckCircle2,
  AlertCircle,
  FileText,
  Utensils,
  Home,
  FileEdit,
  ChevronRight,
  MessageSquare,
  Mic,
  Send,
  ArrowRight,
  Sparkles,
  Square,
  Loader2,
  ChevronDown,
  Info
} from 'lucide-react';
import { api } from '../services/api';

export default function HoivaClientView ({
  patient,
  selkokieli,
  onToggleSelkokieli,
  onProceedToSummary,
  currentLang = 'fi',
  t
}) {
  // State for filled gaps
  const [dietaryInfo, setDietaryInfo] = useState('Gluteeniton ruokavalio');
  const [mobilityInfo, setMobilityInfo] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');

  // Active expanded item for accordion in verified info
  const [expandedSection, setExpandedSection] = useState(null);

  // Chat messages
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'bot',
      text: 'Hei, haluaisin vielä varmistaa muutaman asian, jotta saamme mahdollisimman tarkan kuvan tilanteestanne.\n\nOnko teillä erityisruokavalioita tai ruokarajoituksia?',
      time: '10:24'
    },
    {
      id: 2,
      sender: 'user',
      text: 'Minulla on gluteeniton ruokavalio.',
      time: '10:25'
    },
    {
      id: 3,
      sender: 'bot',
      text: 'Kiitos! Onko teillä käytössä apuvälineitä, kuten rollaattori tai pyörätuoli?',
      time: '10:26'
    }
  ]);

  const [inputText, setInputText] = useState('');
  const [quickReplies, setQuickReplies] = useState([
    'Kyllä, rollaattori',
    'Kyllä, pyörätuoli',
    'Ei apuvälineitä'
  ]);

  // Audio recording state (Whisper)
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [voiceError, setVoiceError] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const chatMessagesBoxRef = useRef(null);

  // Ensure window stays at the top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Scroll ONLY the inside of the chat container when messages change
  useEffect(() => {
    if (chatMessagesBoxRef.current) {
      chatMessagesBoxRef.current.scrollTop = chatMessagesBoxRef.current.scrollHeight;
    }
  }, [messages]);

  const triggerToast = (msg) => {
    setToastMessage(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  // Voice recording logic with Whisper API
  const startRecording = async () => {
    setVoiceError('');
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Selaimessa ei ole mikrofonitukea');
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());
        if (audioChunksRef.current.length === 0) {
          setIsRecording(false);
          return;
        }

        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setIsRecording(false);
        setIsTranscribing(true);

        try {
          const res = await api.transcribeAudio(audioBlob, currentLang);
          if (res && res.text) {
            setInputText(prev => prev ? `${prev} ${res.text}` : res.text);
          }
        } catch (err) {
          console.error('Whisper transcription error:', err);
          setVoiceError(err.message || 'Äänentallennuksen tekstitys epäonnistui');
        } finally {
          setIsTranscribing(false);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Microphone error:', err);
      setIsRecording(false);
      setVoiceError('Mikrofoniin ei saatu yhteyttä. Tarkista selaimen luvat.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  const handleToggleVoice = () => {
    if (isRecording) {
      stopRecording();
    } else if (!isTranscribing) {
      startRecording();
    }
  };

  // Send message in chat
  const handleSendMessage = (textToSend) => {
    const text = (textToSend || inputText).trim();
    if (!text) return;

    const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const newMsg = {
      id: Date.now(),
      sender: 'user',
      text: text,
      time: currentTime
    };

    setMessages(prev => [...prev, newMsg]);
    setInputText('');

    // Check if answering mobility aids
    const lower = text.toLowerCase();
    if (lower.includes('rollaattori') || lower.includes('pyörätuoli') || lower.includes('apuväline') || lower.includes('ei apuvälineitä')) {
      setMobilityInfo(text);
      setTimeout(() => {
        setMessages(prev => [
          ...prev,
          {
            id: Date.now() + 1,
            sender: 'bot',
            text: `Kiitos tiedosta! Kirjasin tiedon apuvälineistä: "${text}". Tiedot ovat nyt valmiina siirrettäväksi terveydenhuollon ammattilaiselle.`,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
        setQuickReplies([]);
      }, 700);
      return;
    }

    // Check if answering diet
    if (lower.includes('gluteeniton') || lower.includes('laktoositon') || lower.includes('kasvis') || lower.includes('allergia') || lower.includes('ruoka')) {
      setDietaryInfo(text);
      setTimeout(() => {
        setMessages(prev => [
          ...prev,
          {
            id: Date.now() + 1,
            sender: 'bot',
            text: `Kiitos tiedosta! Erityisruokavalio tallennettu: "${text}". Onko teillä käytössä liikkumisen apuvälineitä?`,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
        setQuickReplies(['Kyllä, rollaattori', 'Kyllä, pyörätuoli', 'Ei apuvälineitä']);
      }, 700);
      return;
    }

    // Default polite AI response
    setTimeout(() => {
      setMessages(prev => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: 'bot',
          text: `Kiitos vastauksestasi! Tieto on tallennettu esitietoihin.`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    }, 700);
  };

  // Trigger specific gap-filling question from left cards
  const handleAskClient = (topic) => {
    if (topic === 'diet') {
      setMessages(prev => [
        ...prev,
        {
          id: Date.now(),
          sender: 'bot',
          text: 'Tarkistetaan ruokavalio: Onko teillä ruoka-aineallergioita tai noudatatteko erityisruokavaliota (esim. gluteeniton, laktoositon)?',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
      setQuickReplies(['Gluteeniton', 'Laktoositon', 'Ei erityisruokavaliota']);
    } else if (topic === 'mobility') {
      setMessages(prev => [
        ...prev,
        {
          id: Date.now(),
          sender: 'bot',
          text: 'Onko teillä käytössä liikkumisen apuvälineitä kotona tai ulkona (esim. rollaattori, keppi, pyörätuoli)?',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
      setQuickReplies(['Kyllä, rollaattori', 'Kyllä, pyörätuoli', 'Ei apuvälineitä']);
    }
  };

  const missingGapsCount = (dietaryInfo ? 0 : 1) + (mobilityInfo ? 0 : 1);

  return (
    <div className="hoiva-client-container">
      {/* Toast Notification */}
      {showToast && (
        <div className="hoiva-toast">
          <CheckCircle2 size={18} color="#10b981" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* LEFT COLUMN: Verified, Pending, and Optional Info */}
      <div className="client-data-column">
        {/* Patient Greeting & Photo Card */}
        <div className="patient-greeting-card">
          <div className="greeting-avatar-circle">
            <User size={30} color="#0284c7" />
          </div>

          <div className="greeting-text-block">
            <h2>Hei Maija,</h2>
            <div className="greeting-subtitle">Tässä on asiakkaan valmiit esitiedot.</div>
            <p className="greeting-description">
              Olemme hakeneet tiedot potilastietojärjestelmästä ja aiemmista käynneistä.
              Tarkista, että tiedot ovat oikein. Voit muuttaa tai täydentää puuttuvia tietoja.
            </p>
          </div>

          <div className="patient-profile-pill">
            <span className="client-id-badge">Asiakas #45872</span>
            <div className="patient-photo-wrap">
              <img
                src="/images/aino_virtanen.jpg"
                alt="Aino Virtanen"
                className="patient-photo"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
            </div>
            <div className="patient-name-label">
              <strong>{patient?.first_name || 'Matti'} {patient?.last_name || 'Virtanen'}</strong>
              <span>{patient?.masked_hetu || patient?.hetu || ''} • {patient?.municipality || 'LUVN'} ({patient?.age || 69} v)</span>
            </div>
          </div>
        </div>

        {/* SECTION 1: Varmistetut tiedot */}
        <div className="section-card">
          <div className="section-card-header">
            <div className="section-title-wrap">
              <span className="status-icon-circle green">
                <CheckCircle2 size={16} />
              </span>
              <h3>Varmistetut tiedot</h3>
            </div>
            <span className="badge-pill green">Valmiina</span>
          </div>

          <div className="data-row-list">
            {/* Henkilötiedot */}
            <div
              className={`data-row ${expandedSection === 'person' ? 'expanded' : ''}`}
              onClick={() => setExpandedSection(expandedSection === 'person' ? null : 'person')}
            >
              <div className="row-icon-circle blue">
                <User size={18} />
              </div>
              <div className="row-info-wrap">
                <div className="row-title">Henkilötiedot</div>
                <div className="row-subtitle">Nimi, kotikunta, hetu</div>
              </div>
              <div className="row-value-text">
                {patient?.first_name || 'Matti'} {patient?.last_name || 'Virtanen'} • {patient?.municipality || 'LUVN'} ({patient?.age || 69} v)
              </div>
              <ChevronRight size={18} className="row-arrow" />
            </div>

            {/* Perussairaudet */}
            <div
              className={`data-row ${expandedSection === 'diag' ? 'expanded' : ''}`}
              onClick={() => setExpandedSection(expandedSection === 'diag' ? null : 'diag')}
            >
              <div className="row-icon-circle purple">
                <Heart size={18} />
              </div>
              <div className="row-info-wrap">
                <div className="row-title">Perussairaudet</div>
                <div className="row-subtitle">Diagnoosit, riskitekijät</div>
              </div>
              <div className="row-value-text">
                {patient?.diagnoses && patient.diagnoses.length > 0
                  ? patient.diagnoses.map(d => `${d.code} ${d.title_fi}`).join(', ')
                  : 'Ei diagnosoituja perussairauksia'}
              </div>
              <ChevronRight size={18} className="row-arrow" />
            </div>

            {/* Lääkitys */}
            <div
              className={`data-row ${expandedSection === 'med' ? 'expanded' : ''}`}
              onClick={() => setExpandedSection(expandedSection === 'med' ? null : 'med')}
            >
              <div className="row-icon-circle green-pill">
                <Pill size={18} />
              </div>
              <div className="row-info-wrap">
                <div className="row-title">Lääkitys</div>
                <div className="row-subtitle">Ajantasainen lääkitys ja allergiat</div>
              </div>
              <div className="row-value-text">
                {patient?.medications && patient.medications.length > 0
                  ? patient.medications.map(m => `${m.name} ${m.dosage}`).join(', ')
                  : 'Ei säännöllistä reseptilääkitystä'}
              </div>
              <ChevronRight size={18} className="row-arrow" />
            </div>

            {/* Aiemmat käynnit */}
            <div
              className={`data-row ${expandedSection === 'visits' ? 'expanded' : ''}`}
              onClick={() => setExpandedSection(expandedSection === 'visits' ? null : 'visits')}
            >
              <div className="row-icon-circle grey">
                <Calendar size={18} />
              </div>
              <div className="row-info-wrap">
                <div className="row-title">Aiemmat käynnit (Kanta-arkisto)</div>
                <div className="row-subtitle">Viimeisimmät vastaanotot ja merkinnät</div>
              </div>
              <div className="row-value-text">
                {patient?.clinical_notes && patient.clinical_notes.length > 0
                  ? `${patient.clinical_notes[0].visit_date} • ${patient.clinical_notes[0].clinician_role} (${patient.clinical_notes[0].primary_diagnosis_code || 'Vastaanotto'})`
                  : 'Ei aiempia vastaanottokirjauksia'}
              </div>
              <ChevronRight size={18} className="row-arrow" />
            </div>

            {/* Sosiaalihuolto & Kotihoito (SOTE) */}
            {patient?.social_care && (
              <div
                className={`data-row ${expandedSection === 'social' ? 'expanded' : ''}`}
                onClick={() => setExpandedSection(expandedSection === 'social' ? null : 'social')}
                style={{ background: '#ecfdf5', borderColor: '#a7f3d0' }}
              >
                <div className="row-icon-circle green">
                  <Home size={18} />
                </div>
                <div className="row-info-wrap">
                  <div className="row-title" style={{ color: '#047857' }}>Sosiaalihuolto (SOTE-integraatio)</div>
                  <div className="row-subtitle" style={{ color: '#065f46' }}>{patient.social_care.service_task} • {patient.social_care.decision_date}</div>
                </div>
                <div className="row-value-text" style={{ color: '#047857', fontWeight: 650 }}>
                  🏠 {patient.social_care.service} ({patient.social_care.decision_outcome})
                </div>
                <ChevronRight size={18} className="row-arrow" />
              </div>
            )}

            {/* Yhteyshenkilöt */}
            <div
              className={`data-row ${expandedSection === 'contacts' ? 'expanded' : ''}`}
              onClick={() => setExpandedSection(expandedSection === 'contacts' ? null : 'contacts')}
            >
              <div className="row-icon-circle purple-users">
                <Users size={18} />
              </div>
              <div className="row-info-wrap">
                <div className="row-title">Yhteyshenkilöt ja asiointioikeus</div>
                <div className="row-subtitle">Omaiset ja tukihenkilöt</div>
              </div>
              <div className="row-value-text">
                {patient?.guardian_name
                  ? `Valtuutettu: ${patient.guardian_name} (Suomi.fi-valtuutus)`
                  : 'Itseasiointi • Ei erillistä asiointivaltuutusta'}
              </div>
              <ChevronRight size={18} className="row-arrow" />
            </div>
          </div>
        </div>

        {/* SECTION 2: Täydennettävät tiedot */}
        <div className="section-card">
          <div className="section-card-header">
            <div className="section-title-wrap">
              <span className="status-icon-circle orange">
                <AlertCircle size={16} />
              </span>
              <h3>Täydennettävät tiedot</h3>
            </div>
            <span className={`badge-pill ${missingGapsCount === 0 ? 'green' : 'orange'}`}>
              {missingGapsCount === 0 ? 'Täydennetty' : `${missingGapsCount} puuttuu`}
            </span>
          </div>

          <div className="data-row-list">
            {/* Ruokavalio */}
            <div className="data-row gap-row">
              <div className="row-icon-circle orange-soft">
                <Utensils size={18} />
              </div>
              <div className="row-info-wrap">
                <div className="row-title">Ruokavalio ja erityisruokavaliot</div>
                <div className="row-subtitle">Allergiat, ruokarajoitukset, mieltymykset</div>
              </div>
              {dietaryInfo ? (
                <span className="row-value-badge green">
                  ✓ {dietaryInfo}
                </span>
              ) : (
                <>
                  <span className="row-value-badge orange">Puuttuu</span>
                  <button
                    type="button"
                    className="action-btn-outline"
                    onClick={() => handleAskClient('diet')}
                  >
                    Kysy asiakkaalta →
                  </button>
                </>
              )}
            </div>

            {/* Kotiympäristö ja apuvälineet */}
            <div className="data-row gap-row">
              <div className="row-icon-circle orange-soft">
                <Home size={18} />
              </div>
              <div className="row-info-wrap">
                <div className="row-title">Kotiympäristö ja apuvälineet</div>
                <div className="row-subtitle">Asunto, asumismuoto, apuvälineet</div>
              </div>
              {mobilityInfo ? (
                <span className="row-value-badge green">
                  ✓ {mobilityInfo}
                </span>
              ) : (
                <>
                  <span className="row-value-badge orange">Puuttuu</span>
                  <button
                    type="button"
                    className="action-btn-outline"
                    onClick={() => handleAskClient('mobility')}
                  >
                    Kysy asiakkaalta →
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* SECTION 3: Lisätietoja (vapaaehtoinen) */}
        <div className="section-card">
          <div className="section-card-header">
            <div className="section-title-wrap">
              <span className="status-icon-circle purple-soft">
                <FileText size={16} />
              </span>
              <h3>Lisätietoja (vapaaehtoinen)</h3>
            </div>
          </div>

          <div className="data-row-list">
            <div className="data-row gap-row">
              <div className="row-icon-circle purple-soft">
                <FileEdit size={18} />
              </div>
              <div className="row-info-wrap">
                <div className="row-title">Muita huomioita</div>
                <div className="row-subtitle">Esim. toiveet, aiemmat kokemukset, tärkeät asiat</div>
              </div>
              {additionalNotes ? (
                <span className="row-value-badge green">✓ {additionalNotes}</span>
              ) : (
                <button
                  type="button"
                  className="action-btn-outline"
                  onClick={() => {
                    const note = prompt('Kirjoita vapaaehtoinen lisähuomio hoitajalle/lääkärille:');
                    if (note) {
                      setAdditionalNotes(note);
                      triggerToast('Lisätieto tallennettu esitietoihin');
                    }
                  }}
                >
                  Lisää tietoja →
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: Interactive AI Chat + Confirmation Card */}
      <div className="client-chat-column">
        {/* Chat Assistant Card */}
        <div className="chat-assistant-card">
          <div className="chat-card-header">
            <div className="chat-header-title-wrap">
              <div className="chat-icon-circle">
                <MessageSquare size={18} />
              </div>
              <div>
                <h4>Keskustele asiakkaan kanssa</h4>
                <p>Voit kysyä puuttuvia tietoja luonnollisella kielellä.</p>
              </div>
            </div>

            {/* Selkokieli Dropdown Button */}
            <button
              type="button"
              className={`selkokieli-pill ${selkokieli ? 'active' : ''}`}
              onClick={onToggleSelkokieli}
              title="Selkokielitila (helppolukuinen kieli)"
            >
              <span className="selkokieli-label-text">
                {selkokieli && <span className="selko-check-icon">✓</span>}
                Selkokieli
              </span>
              <ChevronDown size={14} className="selko-caret" />
            </button>
          </div>

          {/* Messages Feed */}
          <div className="chat-messages-box" ref={chatMessagesBoxRef}>
            {messages.map((msg) => {
              const isBot = msg.sender === 'bot';
              return (
                <div key={msg.id} className={`chat-message-row ${isBot ? 'bot' : 'user'}`}>
                  {isBot && (
                    <div className="bot-avatar-badge" aria-hidden="true">
                      {/* Bot robot icon */}
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="11" width="18" height="10" rx="2" />
                        <circle cx="12" cy="5" r="2" />
                        <path d="M12 7v4" />
                        <line x1="8" y1="16" x2="8" y2="16" />
                        <line x1="16" y1="16" x2="16" y2="16" />
                      </svg>
                    </div>
                  )}

                  <div className={`chat-bubble-new ${isBot ? 'bot-bubble' : 'user-bubble'}`}>
                    <div className="chat-bubble-content">{msg.text}</div>
                    <div className="chat-bubble-time">{msg.time}</div>
                  </div>

                  {!isBot && (
                    <div className="user-avatar-badge" aria-hidden="true">
                      <User size={16} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Quick Reply Suggestions */}
          {quickReplies.length > 0 && (
            <div className="quick-chips-bar">
              {quickReplies.map((reply, i) => (
                <button
                  key={i}
                  type="button"
                  className="quick-chip-button"
                  onClick={() => handleSendMessage(reply)}
                >
                  {reply}
                </button>
              ))}
            </div>
          )}

          {/* Input Bar with Whisper Microphone in Single Pill Container */}
          <div className="chat-input-wrapper">
            <div className="chat-input-container">
              {/* Whisper Microphone Button */}
              <button
                type="button"
                className={`chat-mic-btn ${isRecording ? 'recording' : ''}`}
                onClick={handleToggleVoice}
                disabled={isTranscribing}
                title={isRecording ? 'Lopeta nauhoitus' : (isTranscribing ? 'Whisper tekstittää...' : 'Puhu mikrofonille')}
                aria-label="Puhu mikrofonille"
              >
                {isTranscribing ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : isRecording ? (
                  <Square size={16} fill="currentColor" />
                ) : (
                  <Mic size={18} />
                )}
              </button>

              <div className="chat-input-divider" aria-hidden="true" />

              <input
                type="text"
                className="chat-text-input"
                placeholder="Kirjoita viesti..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              />

              <button
                type="button"
                className="chat-send-btn"
                onClick={() => handleSendMessage()}
                disabled={!inputText.trim()}
                aria-label="Lähetä viesti"
              >
                <ArrowRight size={18} />
              </button>
            </div>

            {/* Voice Status Indicator */}
            {(isRecording || isTranscribing || voiceError) && (
              <div className="voice-status-line">
                {isRecording && (
                  <>
                    <span className="pulse-red-dot" />
                    <span>Nauhoitetaan puhetta... Klikkaa mikrofonia lopettaaksesi</span>
                  </>
                )}
                {isTranscribing && (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Whisper käsittelee puhetta...</span>
                  </>
                )}
                {voiceError && !isRecording && !isTranscribing && (
                  <span style={{ color: '#b91c1c' }}>{voiceError}</span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Confirmation & Handoff Card */}
        <div className="handoff-card">
          <div className="handoff-card-top">
            <div className="handoff-icon-circle">
              <FileText size={22} color="#0284c7" />
            </div>
            <div className="handoff-text">
              <h5>Valmis vahvistettavaksi?</h5>
              <p>Kun kaikki tiedot on tarkistettu ja täydennetty, voit siirtää ne ammattilaiselle.</p>
            </div>
          </div>

          <div className="handoff-actions">
            <button
              type="button"
              className="btn-handoff-submit"
              onClick={() => {
                triggerToast('Esitiedot lähetetty terveydenhuollon ammattilaiselle!');
                if (onProceedToSummary) onProceedToSummary();
              }}
            >
              <span>Vahvista ja lähetä</span>
              <ArrowRight size={18} />
            </button>

            <button
              type="button"
              className="btn-handoff-draft"
              onClick={() => triggerToast('Luonnos tallennettu onnistuneesti!')}
            >
              Tallenna luonnos
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
