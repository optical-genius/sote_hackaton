import React, { useState, useEffect, useRef } from 'react';
import { Bot, User, CheckCircle2, HelpCircle, Send, Mic, ArrowRight, ArrowLeft, Sparkles, Loader2, Square } from 'lucide-react';
import { api } from '../services/api';

export default function SymptomChatView({
  reasonForVisit,
  filledData,
  onUpdateFilledData,
  onProceed,
  onBack,
  currentLang,
  actingAs,
  selectedService,
  t
}) {
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'bot',
      text: t.assistantGreeting,
      time: '09:00'
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [voiceError, setVoiceError] = useState('');
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const [lastExtractedNotice, setLastExtractedNotice] = useState(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, currentQuestion]);

  // Fetch initial question based on current state
  useEffect(() => {
    fetchNextQuestion();
  }, [currentLang]);

  const fetchNextQuestion = async (updatedData = filledData) => {
    setIsLoading(true);
    try {
      const q = await api.getNextQuestion({
        language: currentLang,
        service_id: selectedService,
        current_reason: reasonForVisit,
        filled_fields: updatedData,
        acting_as: actingAs
      });
      setCurrentQuestion(q);
      if (!q.is_completed) {
        setMessages(prev => [
          ...prev,
          {
            id: Date.now(),
            sender: 'bot',
            text: q.question_text,
            tip: q.selkokieli_tip,
            target_field: q.target_field
          }
        ]);
      } else {
        setMessages(prev => [
          ...prev,
          {
            id: Date.now(),
            sender: 'bot',
            text: q.question_text,
            isCompleted: true
          }
        ]);
      }
    } catch (err) {
      console.error('Error fetching question:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (textToSend) => {
    const text = (textToSend || inputText).trim();
    if (!text) return;

    // Add user message
    const userMsg = {
      id: Date.now(),
      sender: 'user',
      text: text
    };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);

    try {
      // Call backend to extract structured entities
      const extraction = await api.extractEntities({
        user_input: text,
        target_field: currentQuestion ? currentQuestion.target_field : null,
        language: currentLang,
        current_data: filledData
      });

      // Update state with newly extracted data
      const updated = { ...filledData, ...extraction.extracted_fields };
      onUpdateFilledData(updated);

      if (extraction.feedback_message) {
        setLastExtractedNotice(extraction.feedback_message);
        setTimeout(() => setLastExtractedNotice(null), 4500);
      }

      // Fetch the next question with the updated data
      await fetchNextQuestion(updated);
    } catch (err) {
      console.error('Error during extraction:', err);
    } finally {
      setIsLoading(false);
    }
  };

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
          setVoiceError(err.message || t.voiceError);
        } finally {
          setIsTranscribing(false);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Microphone error:', err);
      setIsRecording(false);
      setVoiceError(t.voiceError);
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

  const isFormComplete = filledData.symptom_duration && filledData.pain_scale !== undefined;

  return (
    <div className="content-card">
      <div className="card-title-group">
        <h2>{t.screen3Title}</h2>
        <p>{t.screen3Subtitle}</p>
      </div>

      <div className="chat-layout">
        {/* Left Column: Structured Form Live Tracker */}
        <div className="form-tracker-card">
          <h3 style={{ fontSize: '1.1rem', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={18} style={{ color: 'var(--primary)' }} />
            {t.formProgressTitle}
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {/* Field 1: Reason */}
            <div className={`tracker-item ${reasonForVisit ? 'filled' : ''}`}>
              {reasonForVisit ? <CheckCircle2 size={18} style={{ color: 'var(--success)' }} /> : <HelpCircle size={18} style={{ color: 'var(--text-muted)' }} />}
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>{t.fieldReason}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px' }}>
                  {reasonForVisit || '—'}
                </div>
              </div>
            </div>

            {/* Field 2: Duration */}
            <div className={`tracker-item ${filledData.symptom_duration ? 'filled' : ''} ${currentQuestion?.target_field === 'symptom_duration' ? 'highlight' : ''}`}>
              {filledData.symptom_duration ? <CheckCircle2 size={18} style={{ color: 'var(--success)' }} /> : <HelpCircle size={18} style={{ color: 'var(--text-muted)' }} />}
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>{t.fieldDuration}</div>
                <div style={{ fontSize: '0.85rem', color: filledData.symptom_duration ? 'var(--success)' : 'var(--text-muted)', fontWeight: filledData.symptom_duration ? 600 : 400 }}>
                  {filledData.symptom_duration || 'Odottaa vastausta'}
                </div>
              </div>
            </div>

            {/* Field 3: Pain scale */}
            <div className={`tracker-item ${filledData.pain_scale !== undefined ? 'filled' : ''} ${currentQuestion?.target_field === 'pain_scale' ? 'highlight' : ''}`}>
              {filledData.pain_scale !== undefined ? <CheckCircle2 size={18} style={{ color: 'var(--success)' }} /> : <HelpCircle size={18} style={{ color: 'var(--text-muted)' }} />}
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>{t.fieldPain}</div>
                <div style={{ fontSize: '0.85rem', color: filledData.pain_scale !== undefined ? 'var(--success)' : 'var(--text-muted)', fontWeight: filledData.pain_scale !== undefined ? 600 : 400 }}>
                  {filledData.pain_scale !== undefined ? `${filledData.pain_scale} / 10` : 'Odottaa arviota'}
                </div>
              </div>
            </div>

            {/* Field 4: Accompanying Symptoms */}
            <div className={`tracker-item ${filledData.accompanying_symptoms && filledData.accompanying_symptoms.length > 0 ? 'filled' : ''} ${currentQuestion?.target_field === 'accompanying_symptoms' ? 'highlight' : ''}`}>
              {filledData.accompanying_symptoms && filledData.accompanying_symptoms.length > 0 ? <CheckCircle2 size={18} style={{ color: 'var(--success)' }} /> : <HelpCircle size={18} style={{ color: 'var(--text-muted)' }} />}
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>{t.fieldAccompanying}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {filledData.accompanying_symptoms?.join(', ') || 'Ei määritelty'}
                </div>
              </div>
            </div>

            {/* Field 5: Daily impact */}
            <div className={`tracker-item ${filledData.impact_on_daily_life ? 'filled' : ''} ${currentQuestion?.target_field === 'impact_on_daily_life' ? 'highlight' : ''}`}>
              {filledData.impact_on_daily_life ? <CheckCircle2 size={18} style={{ color: 'var(--success)' }} /> : <HelpCircle size={18} style={{ color: 'var(--text-muted)' }} />}
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>{t.fieldImpact}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {filledData.impact_on_daily_life || 'Ei määritelty'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: AI Assistant Chat */}
        <div className="chat-container">
          {/* Header */}
          <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--border)', background: '#f8fafc', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Bot size={18} />
            </div>
            <div>
              <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{t.assistantBadge}</span>
              <span style={{ marginLeft: '8px', fontSize: '0.75rem', background: '#e0f2fe', color: '#0369a1', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                Selkokieli AI
              </span>
            </div>
          </div>

          {/* Messages */}
          <div className="chat-messages">
            {messages.map(m => (
              <div key={m.id} className={`chat-bubble ${m.sender}`}>
                <div>{m.text}</div>
                {m.tip && (
                  <div className="selko-highlight" style={{ marginTop: '8px', fontSize: '0.85rem', color: '#78350f' }}>
                    💡 {m.tip}
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="chat-bubble bot" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontStyle: 'italic', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Avustaja miettii...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Entity Extraction Live Feedback Notice */}
          {lastExtractedNotice && (
            <div style={{ background: '#f0fdf4', borderTop: '1px solid #86efac', padding: '8px 18px', fontSize: '0.85rem', color: '#166534', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={16} />
              <span>{t.aiParsedNotice} <strong>{lastExtractedNotice}</strong></span>
            </div>
          )}

          {/* Dynamic Quick Reply Chips */}
          {currentQuestion && currentQuestion.quick_replies && currentQuestion.quick_replies.length > 0 && !currentQuestion.is_completed && (
            <div style={{ padding: '8px 18px', background: '#f8fafc', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '6px', overflowX: 'auto' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', fontWeight: 600 }}>
                {t.quickRepliesLabel}
              </span>
              {currentQuestion.quick_replies.map((reply, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSendMessage(reply)}
                  style={{
                    background: 'white',
                    border: '1px solid var(--border)',
                    borderRadius: '9999px',
                    padding: '4px 12px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    color: 'var(--primary)'
                  }}
                >
                  {reply}
                </button>
              ))}
            </div>
          )}

          {/* Input Bar */}
          <div className="chat-input-bar">
            <input
              type="text"
              className="chat-input"
              placeholder={t.messageInputPlaceholder}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            />

            <button
              type="button"
              className={`mic-btn ${isRecording ? 'recording' : ''}`}
              onClick={handleToggleVoice}
              disabled={isTranscribing}
              title={isRecording ? t.voiceListening : (isTranscribing ? t.voiceTranscribing : t.voiceInputBtn)}
              aria-label={isRecording ? t.voiceListening : t.voiceInputBtn}
            >
              {isTranscribing ? (
                <Loader2 size={18} className="animate-spin" />
              ) : isRecording ? (
                <Square size={16} fill="currentColor" />
              ) : (
                <Mic size={18} />
              )}
            </button>

            <button
              type="button"
              className="btn-primary"
              onClick={() => handleSendMessage()}
              style={{ minHeight: 'var(--min-touch-target)', padding: '0 16px' }}
              disabled={!inputText.trim()}
            >
              <Send size={18} />
            </button>
          </div>

          {(isRecording || isTranscribing || voiceError) && (
            <div style={{ padding: '8px 18px', borderTop: '1px solid var(--border)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px', background: isRecording ? '#fff1f2' : isTranscribing ? 'var(--primary-light)' : '#fef2f2', color: isRecording ? '#b91c1c' : isTranscribing ? 'var(--primary)' : '#b91c1c', fontWeight: 600 }}>
              {isRecording && (
                <>
                  <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', backgroundColor: '#ef4444' }} />
                  <span>{t.voiceListening}</span>
                </>
              )}
              {isTranscribing && (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>{t.voiceTranscribing}</span>
                </>
              )}
              {voiceError && !isRecording && !isTranscribing && (
                <span>{voiceError}</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Navigation Buttons */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '28px' }}>
        <button type="button" className="btn-secondary" onClick={onBack}>
          <ArrowLeft size={18} />
          <span>Takaisin</span>
        </button>

        <button
          type="button"
          className="btn-primary"
          onClick={onProceed}
          disabled={!isFormComplete}
        >
          <span>{t.btnProceedToSummary}</span>
          <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
}
