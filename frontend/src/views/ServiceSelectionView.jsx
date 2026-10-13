import React, { useState, useRef } from 'react';
import { Stethoscope, Activity, HeartHandshake, Baby, Mic, ArrowRight, Sparkles, Loader2, Square } from 'lucide-react';
import { api } from '../services/api';

export default function ServiceSelectionView({
  selectedService,
  onSelectService,
  reasonForVisit,
  onChangeReason,
  onContinue,
  t,
  lang = 'fi'
}) {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [voiceError, setVoiceError] = useState('');
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const services = [
    {
      id: 'yleislaakari',
      title: t.serviceYleislaakari,
      desc: t.serviceYleislaakariDesc,
      icon: Stethoscope
    },
    {
      id: 'fysioterapia',
      title: t.serviceFysio,
      desc: t.serviceFysioDesc,
      icon: Activity
    },
    {
      id: 'sosiaalipalvelut',
      title: t.serviceSosio,
      desc: t.serviceSosioDesc,
      icon: HeartHandshake
    },
    {
      id: 'neuvola',
      title: t.serviceNeuvola,
      desc: t.serviceNeuvolaDesc,
      icon: Baby
    }
  ];

  const quickChips = [
    { text: t.chipBackPain, service: 'yleislaakari' },
    { text: t.chipKnee, service: 'fysioterapia' },
    { text: t.chipCough, service: 'yleislaakari' },
    { text: t.chipPregnancy, service: 'neuvola' }
  ];

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
          const res = await api.transcribeAudio(audioBlob, lang);
          if (res && res.text) {
            onChangeReason(prev => prev ? `${prev} ${res.text}` : res.text);
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

  const handleSelectChip = (chip) => {
    onChangeReason(chip.text);
    onSelectService(chip.service);
  };

  return (
    <div className="content-card">
      <div className="card-title-group">
        <h2>{t.screen1Title}</h2>
        <p>{t.screen1Subtitle}</p>
      </div>

      {/* Service Direction Grid */}
      <div style={{ marginBottom: '24px' }}>
        <label style={{ display: 'block', fontWeight: 700, marginBottom: '12px', fontSize: '1.05rem' }}>
          {t.selectService}
        </label>

        <div className="service-grid">
          {services.map(s => {
            const Icon = s.icon;
            const isSelected = selectedService === s.id;
            return (
              <button
                key={s.id}
                type="button"
                className={`service-card-btn ${isSelected ? 'selected' : ''}`}
                onClick={() => onSelectService(s.id)}
                aria-pressed={isSelected}
              >
                <div className="service-card-header">
                  <div style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    background: isSelected ? 'var(--primary)' : '#e2e8f0',
                    color: isSelected ? 'white' : 'var(--text-main)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Icon size={20} />
                  </div>
                  <span>{s.title}</span>
                </div>
                <p>{s.desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Quick selection chips */}
      <div style={{ marginBottom: '20px' }}>
        <span style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-muted)' }}>
          {t.quickChipsLabel}
        </span>
        <div className="chips-container">
          {quickChips.map((chip, idx) => (
            <button
              key={idx}
              type="button"
              className="chip-btn"
              onClick={() => handleSelectChip(chip)}
            >
              <Sparkles size={14} style={{ color: 'var(--primary)' }} />
              {chip.text}
            </button>
          ))}
        </div>
      </div>

      {/* Free text input + Microphone dictation */}
      <div style={{ marginBottom: '28px' }}>
        <label htmlFor="reason-textarea" style={{ display: 'block', fontWeight: 700, marginBottom: '8px', fontSize: '1.05rem' }}>
          {t.reasonInputLabel}
        </label>
        
        <div style={{ position: 'relative' }}>
          <textarea
            id="reason-textarea"
            rows={4}
            value={reasonForVisit}
            onChange={(e) => onChangeReason(e.target.value)}
            placeholder={t.reasonPlaceholder}
            style={{
              width: '100%',
              padding: '16px',
              paddingRight: '60px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)',
              fontSize: '1.05rem',
              fontFamily: 'inherit',
              lineHeight: 1.5,
              resize: 'vertical'
            }}
          />

          <button
            type="button"
            className={`mic-btn ${isRecording ? 'recording' : ''}`}
            onClick={handleToggleVoice}
            disabled={isTranscribing}
            title={isRecording ? t.voiceListening : (isTranscribing ? t.voiceTranscribing : t.voiceInputBtn)}
            aria-label={isRecording ? t.voiceListening : t.voiceInputBtn}
            style={{
              position: 'absolute',
              right: 12,
              bottom: 16
            }}
          >
            {isTranscribing ? (
              <Loader2 size={20} className="animate-spin" />
            ) : isRecording ? (
              <Square size={16} fill="currentColor" />
            ) : (
              <Mic size={20} />
            )}
          </button>
        </div>

        {isRecording && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px', color: '#b91c1c', fontSize: '0.9rem', fontWeight: 600 }}>
            <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', backgroundColor: '#ef4444' }} />
            {t.voiceListening}
          </div>
        )}

        {isTranscribing && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px', color: 'var(--primary)', fontSize: '0.9rem', fontWeight: 600 }}>
            <Loader2 size={16} className="animate-spin" />
            {t.voiceTranscribing}
          </div>
        )}

        {voiceError && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px', color: '#b91c1c', fontSize: '0.85rem' }}>
            {voiceError}
          </div>
        )}
      </div>

      {/* Action Button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button
          type="button"
          className="btn-primary"
          onClick={onContinue}
          disabled={!reasonForVisit.trim()}
        >
          <span>{t.btnContinueToPrefill}</span>
          <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
}
