const API_BASE = '/api';

export const api = {
  async getPatients() {
    const res = await fetch(`${API_BASE}/patients`);
    if (!res.ok) throw new Error('Failed to fetch patients');
    return res.json();
  },

  async getPatient(id) {
    const res = await fetch(`${API_BASE}/patients/${id}`);
    if (!res.ok) throw new Error('Failed to fetch patient');
    return res.json();
  },

  async prefillForm(payload) {
    const res = await fetch(`${API_BASE}/form/prefill`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Failed to prefill form');
    return res.json();
  },

  async getNextQuestion(payload) {
    const res = await fetch(`${API_BASE}/form/next-question`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Failed to get question');
    return res.json();
  },

  async extractEntities(payload) {
    const res = await fetch(`${API_BASE}/form/extract`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Failed to extract entities');
    return res.json();
  },

  async submitPrevisit(payload) {
    const res = await fetch(`${API_BASE}/submissions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Failed to submit previsit');
    return res.json();
  },

  async getSubmissions() {
    const res = await fetch(`${API_BASE}/submissions`);
    if (!res.ok) throw new Error('Failed to fetch submissions');
    return res.json();
  },

  async getSubmission(id) {
    const res = await fetch(`${API_BASE}/submissions/${id}`);
    if (!res.ok) throw new Error('Failed to fetch submission');
    return res.json();
  },

  async performClinicalAction(id, action) {
    const res = await fetch(`${API_BASE}/submissions/${id}/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action })
    });
    if (!res.ok) throw new Error('Failed to perform action');
    return res.json();
  },

  async transcribeAudio(audioBlob, language = 'fi') {
    const formData = new FormData();
    formData.append('file', audioBlob, 'audio_recording.webm');
    formData.append('language', language);
    const res = await fetch(`${API_BASE}/transcribe`, {
      method: 'POST',
      body: formData
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Äänentallennuksen tekstitys epäonnistui');
    }
    return res.json();
  },

  /**
   * Analyze symptom text via LM Studio (medicus model) to get
   * 2 context-aware clinical follow-up questions.
   * Falls back to rule engine if LM Studio unavailable.
   */
  async analyzeSymptom(symptomText, medications = [], language = 'fi') {
    const res = await fetch(`${API_BASE}/ai/analyze-symptom`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        symptom_text: symptomText,
        medications: medications,
        language: language
      })
    });
    if (!res.ok) throw new Error('AI analysis failed');
    return res.json();
  },

  async checkAiHealth() {
    const res = await fetch(`${API_BASE}/ai/health`);
    return res.json();
  },

  /**
   * Generate a clinical anamnesis text for the doctor view,
   * based on patient data and structured triage answers.
   */
  async generateAnamnesis(payload) {
    const res = await fetch(`${API_BASE}/ai/generate-anamnesis`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Anamnesis generation failed');
    return res.json();
  }
};
