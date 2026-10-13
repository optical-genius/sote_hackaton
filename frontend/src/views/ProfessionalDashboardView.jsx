import React, { useState, useEffect } from 'react';
import {
  Stethoscope,
  CheckCircle2,
  AlertTriangle,
  Copy,
  ExternalLink,
  MessageSquare,
  FileText,
  UserCheck,
  RefreshCw,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Loader2,
  ClipboardList,
  Activity,
  Brain,
  Eye,
  Code
} from 'lucide-react';
import { api } from '../services/api';

// ── Urgency colour config ─────────────────────────────────────────────────────
const URGENCY_STYLE = {
  red:    { bg: '#fff0f0', border: '#ef4444', dot: '#ef4444', text: '#991b1b' },
  yellow: { bg: '#fffbeb', border: '#f59e0b', dot: '#f59e0b', text: '#92400e' },
  green:  { bg: '#f0fdf4', border: '#22c55e', dot: '#22c55e', text: '#14532d' },
};

// ── Triage Card ───────────────────────────────────────────────────────────────
function TriageCard({ item }) {
  const style = URGENCY_STYLE[item.urgency] || URGENCY_STYLE.green;
  return (
    <div style={{
      background: style.bg,
      border: `1.5px solid ${style.border}`,
      borderRadius: '10px',
      padding: '12px 16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '4px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{
          width: 10, height: 10, borderRadius: '50%',
          background: style.dot, flexShrink: 0
        }} />
        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: style.text, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
          {item.badge}
        </span>
      </div>
      <p style={{ fontSize: '0.87rem', color: '#475569', margin: 0, paddingLeft: '18px' }}>
        {item.question_text}
      </p>
      <p style={{ fontSize: '0.95rem', fontWeight: 700, color: style.text, margin: 0, paddingLeft: '18px' }}>
        {item.urgency === 'red' ? '⚠️ ' : ''}{item.answer_label}
      </p>
    </div>
  );
}

// ── Markdown Inline Formatter ────────────────────────────────────────────────
function renderInline(text) {
  if (!text) return null;
  // Match **bold**, *italic*, `code`
  const regex = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
  const parts = text.split(regex);
  return parts.map((part, i) => {
    if (!part) return null;
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} style={{ fontWeight: 650, color: '#0f172a' }}>
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return (
        <em key={i} style={{ fontStyle: 'italic', color: '#475569' }}>
          {part.slice(1, -1)}
        </em>
      );
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code
          key={i}
          style={{
            background: '#e2e8f0',
            color: '#0f172a',
            padding: '2px 6px',
            borderRadius: '4px',
            fontSize: '0.85em',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace'
          }}
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}

// ── Human-Readable Clinical Markdown Renderer ────────────────────────────────
function ClinicalMarkdownRenderer({ content }) {
  if (!content) {
    return <div style={{ color: '#94a3b8', fontStyle: 'italic', padding: '16px' }}>Ei tiivistelmää saatavilla.</div>;
  }

  const lines = content.split('\n');
  let docTitle = '';
  const metaLines = [];
  const sections = [];
  let currentSection = null;
  let inMeta = false;

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const trimmed = raw.trim();

    if (!trimmed) continue;

    if (trimmed.startsWith('### ')) {
      docTitle = trimmed.replace(/^###\s+/, '');
      inMeta = true;
      continue;
    }

    if (trimmed === '---' || trimmed === '***') {
      inMeta = false;
      continue;
    }

    if (trimmed.startsWith('#### ')) {
      inMeta = false;
      const title = trimmed.replace(/^####\s+/, '');
      currentSection = { title, items: [] };
      sections.push(currentSection);
      continue;
    }

    if (inMeta) {
      metaLines.push(trimmed);
      continue;
    }

    if (currentSection) {
      const itemText = trimmed.replace(/^(\*|-)\s+/, '');
      currentSection.items.push(itemText);
    } else {
      metaLines.push(trimmed);
    }
  }

  const getSectionIcon = (title) => {
    const t = title.toLowerCase();
    if (t.includes('tulosyy') || t.includes('oire')) return <MessageSquare size={18} color="#0284c7" />;
    if (t.includes('triage') || t.includes('seulonta')) return <Activity size={18} color="#0284c7" />;
    if (t.includes('lääkitys') || t.includes('laake')) return <ClipboardList size={18} color="#0284c7" />;
    if (t.includes('allergia') || t.includes('riski')) return <AlertTriangle size={18} color="#e11d48" />;
    return <FileText size={18} color="#0284c7" />;
  };

  // Fallback for markdown without #### sections
  if (sections.length === 0) {
    return (
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
        {docTitle && (
          <h4 style={{ margin: '0 0 12px', fontSize: '1.2rem', color: '#0f172a', fontWeight: 700, borderBottom: '2px solid #0284c7', paddingBottom: '8px' }}>
            {docTitle}
          </h4>
        )}
        {metaLines.map((line, idx) => {
          const match = line.match(/^(\*|-)?\s*\*\*([^*]+)\*\*:\s*(.*)$/);
          if (match) {
            const [, , label, val] = match;
            return (
              <div key={idx} style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '2px',
                padding: '8px 12px',
                borderRadius: '6px',
                background: '#f8fafc',
                borderLeft: '3px solid #0284c7'
              }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>{label}</span>
                <span style={{ fontSize: '0.95rem', color: '#0f172a' }}>{renderInline(val)}</span>
              </div>
            );
          }
          return <div key={idx} style={{ fontSize: '0.95rem', color: '#1e293b' }}>{renderInline(line)}</div>;
        })}
      </div>
    );
  }

  return (
    <div style={{
      background: '#ffffff',
      border: '1px solid #e2e8f0',
      borderRadius: '12px',
      padding: '24px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      {/* Title Bar */}
      {docTitle && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '8px',
          borderBottom: '2px solid #0284c7',
          paddingBottom: '12px',
          marginBottom: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FileText size={22} color="#0284c7" />
            <h4 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: '#0f172a' }}>
              {docTitle}
            </h4>
          </div>
          <span style={{
            fontSize: '0.75rem',
            fontWeight: 700,
            padding: '4px 10px',
            borderRadius: '999px',
            background: '#e0f2fe',
            color: '#0369a1',
            textTransform: 'uppercase',
            letterSpacing: '0.4px'
          }}>
            LUVN Esitietokooste
          </span>
        </div>
      )}

      {/* Patient & Encounter Metadata Box */}
      {metaLines.length > 0 && (
        <div style={{
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          padding: '14px 18px',
          marginBottom: '20px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '12px 20px'
        }}>
          {metaLines.map((line, idx) => {
            const match = line.match(/^\*\*([^*]+)\*\*:\s*(.*)$/);
            if (match) {
              const [, label, val] = match;
              return (
                <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                    {label}
                  </span>
                  <span style={{ fontSize: '0.92rem', color: '#0f172a', fontWeight: 500 }}>
                    {renderInline(val)}
                  </span>
                </div>
              );
            }
            return (
              <div key={idx} style={{ fontSize: '0.92rem', color: '#334155' }}>
                {renderInline(line)}
              </div>
            );
          })}
        </div>
      )}

      {/* Content Sections */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {sections.map((section, sIdx) => {
          const isWarningSection = section.title.toLowerCase().includes('allergia') || section.title.toLowerCase().includes('riski');
          return (
            <div
              key={sIdx}
              style={{
                border: isWarningSection ? '1px solid #fecdd3' : '1px solid #e2e8f0',
                borderRadius: '8px',
                overflow: 'hidden',
                background: '#ffffff'
              }}
            >
              {/* Section Header */}
              <div style={{
                background: isWarningSection ? '#fff1f2' : '#f1f5f9',
                padding: '10px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontWeight: 700,
                fontSize: '0.98rem',
                color: isWarningSection ? '#9f1239' : '#1e293b',
                borderBottom: isWarningSection ? '1px solid #fecdd3' : '1px solid #e2e8f0'
              }}>
                {getSectionIcon(section.title)}
                <span>{section.title}</span>
              </div>

              {/* Section Items */}
              <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {section.items.map((item, iIdx) => {
                  const isRedFlag = item.includes('⚠️') || item.toLowerCase().includes('punais') || item.toLowerCase().includes('hälyttäv');
                  const match = item.match(/^\*\*([^*]+)\*\*:\s*(.*)$/);

                  if (match) {
                    const [, label, value] = match;
                    return (
                      <div
                        key={iIdx}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '3px',
                          padding: '8px 12px',
                          borderRadius: '6px',
                          background: isRedFlag ? '#fff1f2' : '#f8fafc',
                          borderLeft: isRedFlag ? '3.5px solid #e11d48' : '3.5px solid #0284c7'
                        }}
                      >
                        <span style={{
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          color: isRedFlag ? '#be123c' : '#64748b',
                          textTransform: 'uppercase',
                          letterSpacing: '0.4px'
                        }}>
                          {label}
                        </span>
                        <span style={{
                          fontSize: '0.95rem',
                          color: isRedFlag ? '#881337' : '#0f172a',
                          fontWeight: isRedFlag ? 600 : 400,
                          lineHeight: 1.5
                        }}>
                          {renderInline(value)}
                        </span>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={iIdx}
                      style={{
                        padding: '8px 12px',
                        borderRadius: '6px',
                        background: isRedFlag ? '#fff1f2' : '#f8fafc',
                        borderLeft: isRedFlag ? '3.5px solid #e11d48' : '3.5px solid #94a3b8',
                        fontSize: '0.92rem',
                        color: isRedFlag ? '#881337' : '#1e293b',
                        fontWeight: isRedFlag ? 600 : 400
                      }}
                    >
                      {renderInline(item)}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Versatile Clinical Markdown Viewer for EHR Notes & Social Care ───────────
function ClinicalMarkdownViewer({ content }) {
  if (!content) return null;

  const lines = content.split('\n');
  const elements = [];
  let currentList = null;

  const getSectionStyle = (title) => {
    const t = title.toLowerCase();
    if (t.includes('riski') || t.includes('allergia') || t.includes('varoitus')) {
      return { bg: '#fff7ed', border: '#f97316', text: '#c2410c', icon: '⚠️' };
    }
    if (t.includes('ratkaisu') || t.includes('myönnetty') || t.includes('päätös')) {
      return { bg: '#ecfdf5', border: '#059669', text: '#065f46', icon: '⚖️' };
    }
    if (t.includes('suunnitelma') || t.includes('hoito') || t.includes('palvelu')) {
      return { bg: '#f0fdf4', border: '#16a34a', text: '#15803d', icon: '📋' };
    }
    if (t.includes('status') || t.includes('nykytila') || t.includes('tulosyy') || t.includes('esitiedot')) {
      return { bg: '#eff6ff', border: '#2563eb', text: '#1d4ed8', icon: '🩺' };
    }
    if (t.includes('täydennettäv') || t.includes('puuttuu')) {
      return { bg: '#faf5ff', border: '#9333ea', text: '#7e22ce', icon: '📝' };
    }
    return { bg: '#f1f5f9', border: '#0284c7', text: '#0369a1', icon: '🔹' };
  };

  const flushList = () => {
    if (currentList && currentList.length > 0) {
      elements.push(
        <ul key={`ul-${elements.length}`} style={{
          margin: '6px 0 14px',
          paddingLeft: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px'
        }}>
          {currentList.map((item, idx) => {
            const kv = item.match(/^([A-Za-z0-9åäöÅÄÖ\s\-_/()]+?):\s*(.+)$/);
            return (
              <li key={idx} style={{ fontSize: '0.9rem', color: '#334155', lineHeight: 1.55 }}>
                {kv ? (
                  <>
                    <strong style={{ color: '#0f172a', fontWeight: 650 }}>{kv[1]}: </strong>
                    <span>{renderInline(kv[2])}</span>
                  </>
                ) : (
                  renderInline(item)
                )}
              </li>
            );
          })}
        </ul>
      );
      currentList = null;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const trimmed = raw.trim();

    if (!trimmed) {
      flushList();
      continue;
    }

    // Heading 1: # Title
    if (trimmed.startsWith('# ')) {
      flushList();
      const title = trimmed.replace(/^#\s+/, '');
      elements.push(
        <h3 key={`h1-${i}`} style={{
          fontSize: '1.2rem',
          fontWeight: 750,
          color: '#0f172a',
          margin: '18px 0 12px',
          paddingBottom: '8px',
          borderBottom: '2px solid #0284c7',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span>📄</span>
          <span>{title}</span>
        </h3>
      );
      continue;
    }

    // Heading 2: ## SECTION
    if (trimmed.startsWith('## ')) {
      flushList();
      const heading = trimmed.replace(/^##\s+/, '');
      const s = getSectionStyle(heading);
      elements.push(
        <div key={`h2-${i}`} style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          margin: '18px 0 8px',
          padding: '6px 12px',
          background: s.bg,
          borderLeft: `4px solid ${s.border}`,
          borderRadius: '4px'
        }}>
          <span style={{ fontSize: '0.95rem' }}>{s.icon}</span>
          <span style={{
            fontSize: '0.85rem',
            fontWeight: 750,
            color: s.text,
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            {heading}
          </span>
        </div>
      );
      continue;
    }

    // Heading 3: ### Subtitle
    if (trimmed.startsWith('### ')) {
      flushList();
      const sub = trimmed.replace(/^###\s+/, '');
      elements.push(
        <h4 key={`h3-${i}`} style={{
          fontSize: '0.98rem',
          fontWeight: 700,
          color: '#1e293b',
          margin: '12px 0 6px'
        }}>
          {sub}
        </h4>
      );
      continue;
    }

    // Heading 4: #### Small
    if (trimmed.startsWith('#### ')) {
      flushList();
      const sub = trimmed.replace(/^####\s+/, '');
      elements.push(
        <h5 key={`h4-${i}`} style={{
          fontSize: '0.9rem',
          fontWeight: 650,
          color: '#475569',
          margin: '8px 0 4px'
        }}>
          {sub}
        </h5>
      );
      continue;
    }

    // Horizontal Rule: --- or ***
    if (trimmed === '---' || trimmed === '***') {
      flushList();
      elements.push(
        <hr key={`hr-${i}`} style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '14px 0' }} />
      );
      continue;
    }

    // List item: - or * or •
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || trimmed.startsWith('• ')) {
      const itemText = trimmed.replace(/^[-*•]\s+/, '');
      if (!currentList) currentList = [];
      currentList.push(itemText);
      continue;
    }

    flushList();

    // Check if line is a clinical date log line, e.g. "2024-07-19: F41.9 Määrittämätön..."
    const dateMatch = trimmed.match(/^(\d{4}-\d{2}-\d{2}):\s*(.+)$/);
    if (dateMatch) {
      elements.push(
        <div key={`dt-${i}`} style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: '10px',
          margin: '5px 0',
          padding: '6px 10px',
          background: '#f8fafc',
          borderRadius: '6px',
          border: '1px solid #e2e8f0'
        }}>
          <code style={{
            fontWeight: 700,
            color: '#0369a1',
            fontSize: '0.82rem',
            background: '#e0f2fe',
            padding: '2px 6px',
            borderRadius: '4px'
          }}>
            {dateMatch[1]}
          </code>
          <span style={{ fontSize: '0.9rem', color: '#334155', lineHeight: 1.5 }}>
            {renderInline(dateMatch[2])}
          </span>
        </div>
      );
      continue;
    }

    // Regular paragraph
    elements.push(
      <p key={`p-${i}`} style={{
        margin: '6px 0',
        fontSize: '0.9rem',
        lineHeight: 1.6,
        color: '#334155'
      }}>
        {renderInline(trimmed)}
      </p>
    );
  }

  flushList();

  return (
    <div className="clinical-md-view" style={{ fontSize: '0.9rem', color: '#334155' }}>
      {elements}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function ProfessionalDashboardView({ targetSubmissionId, t }) {
  const [submissions, setSubmissions]     = useState([]);
  const [activeSubmission, setActiveSubmission] = useState(null);
  const [activeTab, setActiveTab]         = useState('triage');   // 'triage' | 'summary' | 'reconciliation'
  const [toastMessage, setToastMessage]   = useState(null);
  const [isLoading, setIsLoading]         = useState(true);

  // Medicus anamnesis state
  const [anamnesis, setAnamnesis]         = useState(null);
  const [anamnesisLoading, setAnamnesisLoading] = useState(false);

  // Summary panel collapse & view mode
  const [summaryExpanded, setSummaryExpanded] = useState(false);
  const [summaryViewMode, setSummaryViewMode] = useState('formatted'); // 'formatted' | 'raw'

  useEffect(() => {
    loadSubmissions();
  }, [targetSubmissionId]);

  // Reset anamnesis when switching submissions
  useEffect(() => {
    setAnamnesis(null);
    setSummaryExpanded(false);
  }, [activeSubmission?.submission_id]);

  const loadSubmissions = async () => {
    setIsLoading(true);
    try {
      const list = await api.getSubmissions();
      setSubmissions(list);
      if (targetSubmissionId) {
        const found = list.find(s => s.submission_id === targetSubmissionId);
        setActiveSubmission(found || list[list.length - 1]);
      } else if (list.length > 0) {
        setActiveSubmission(list[list.length - 1]);
      }
    } catch (err) {
      console.error('Failed to load submissions:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopySummary = () => {
    if (!activeSubmission) return;
    navigator.clipboard.writeText(activeSubmission.summary_markdown_fi);
    setToastMessage(t.copiedToast || 'Kopioitu leikepöydälle');
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleAction = async (actionType) => {
    if (!activeSubmission) return;
    try {
      const res = await api.performClinicalAction(activeSubmission.submission_id, actionType);
      setActiveSubmission(prev => ({ ...prev, validation_status: res.updated_validation_status }));
      setToastMessage(`Toimenpide suoritettu: ${actionType}`);
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  const handleGenerateAnamnesis = async () => {
    if (!activeSubmission) return;
    setAnamnesisLoading(true);
    setAnamnesis(null);
    try {
      const p = activeSubmission.patient_snapshot;
      const triage = activeSubmission.triage_structured || [];
      const meds = activeSubmission.summary_markdown_fi
        ?.match(/Käytössä olevat lääkkeet:\*\* (.+)/)?.[1]?.split(';').map(s => s.trim()) || [];
      const allergies = activeSubmission.summary_markdown_fi
        ?.match(/Allergiat:\*\* (.+)/)?.[1]?.split(';').map(s => s.trim()) || [];
      const painMatch = activeSubmission.summary_markdown_fi?.match(/Kipuasteikko.*?(\d+)\/10/);
      const painScale = painMatch ? parseInt(painMatch[1]) : null;
      const durationMatch = activeSubmission.summary_markdown_fi?.match(/Oireiden kesto:\*\* (.+?)(?:\n|$)/);
      const duration = durationMatch ? durationMatch[1].trim() : null;
      const reasonMatch = activeSubmission.summary_markdown_fi?.match(/Pääasiallinen syy:\*\* (.+?)(?:\n|$)/);
      const reason = reasonMatch ? reasonMatch[1].trim() : activeSubmission.patient_snapshot?.name || '';

      const res = await api.generateAnamnesis({
        submission_id: activeSubmission.submission_id,
        reason_for_visit: reason,
        symptom_duration: duration,
        pain_scale: painScale,
        triage_answers: triage,
        medications: meds,
        allergies: allergies,
        diagnoses: [],
        patient_age: p?.age ? parseInt(p.age) : null,
      });
      setAnamnesis(res.anamnesis);
    } catch (err) {
      console.error('Anamnesis generation failed:', err);
      setAnamnesis('Anamneesia ei voitu generoida tällä hetkellä. Tarkista yhteys lääkärijärjestelmään.');
    } finally {
      setAnamnesisLoading(false);
    }
  };

  if (isLoading && submissions.length === 0) {
    return (
      <div className="content-card" style={{ textAlign: 'center', padding: '60px' }}>
        <RefreshCw className="animate-spin" size={32} style={{ margin: '0 auto 16px', color: 'var(--primary)' }} />
        <p>Ladataan ammattilaisnäkymää...</p>
      </div>
    );
  }

  const p = activeSubmission?.patient_snapshot;
  const triageItems = activeSubmission?.triage_structured || [];
  const redTriageCount = triageItems.filter(t => t.urgency === 'red').length;

  const tabStyle = (tab) => ({
    border: 'none',
    background: 'transparent',
    borderBottom: activeTab === tab ? '3px solid var(--primary)' : '3px solid transparent',
    color: activeTab === tab ? 'var(--primary)' : 'var(--text-muted)',
    fontWeight: activeTab === tab ? 700 : 500,
    padding: '10px 18px',
    fontSize: '1rem',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  });

  return (
    <div>
      {/* Toast */}
      {toastMessage && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24,
          background: '#0f172a', color: 'white',
          padding: '12px 20px', borderRadius: '8px',
          boxShadow: 'var(--shadow-lg)', zIndex: 1000,
          display: 'flex', alignItems: 'center', gap: '8px'
        }}>
          <CheckCircle2 size={18} style={{ color: '#4ade80' }} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div style={{
        background: '#1e293b', color: 'white',
        padding: '18px 24px', borderRadius: 'var(--radius-lg)',
        marginBottom: '20px', display: 'flex',
        alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ background: '#0284c7', width: 44, height: 44, borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Stethoscope size={24} />
          </div>
          <div>
            <h2 style={{ color: 'white', fontSize: '1.4rem' }}>{t.profDashboardTitle}</h2>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>{t.profSubtitle}</p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>Valitse tapaus:</span>
          <select
            value={activeSubmission?.submission_id || ''}
            onChange={(e) => {
              const sel = submissions.find(s => s.submission_id === e.target.value);
              setActiveSubmission(sel);
            }}
            style={{
              padding: '6px 12px', borderRadius: '6px',
              background: '#334155', color: 'white',
              border: '1px solid #475569', fontWeight: 600
            }}
          >
            {submissions.map(sub => (
              <option key={sub.submission_id} value={sub.submission_id}>
                {sub.submission_id} — {sub.patient_snapshot?.name} ({sub.created_at})
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={loadSubmissions}
            style={{ background: '#334155', border: '1px solid #475569', color: 'white', borderRadius: '6px', padding: '6px 10px', display: 'flex', alignItems: 'center' }}
            title="Päivitä"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {activeSubmission ? (
        <>
          {/* Patient Banner */}
          <div className="user-role-card" style={{ borderLeft: '6px solid var(--primary)', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t.patientBanner}</span>
                <h3 style={{ fontSize: '1.3rem', marginTop: '2px' }}>{p?.name}</h3>
              </div>
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '0.95rem', alignItems: 'center' }}>
                <div><strong>{t.patientHetu}:</strong> <code>{p?.hetu}</code></div>
                <div><strong>{t.patientAge}:</strong> {p?.age} v</div>
                <div><strong>{t.patientMunicipality}:</strong> {p?.municipality}</div>
                {p?.scenario_tag && (
                  <div style={{ color: '#0284c7', fontWeight: 600 }}>
                    📋 {p.scenario_tag}
                  </div>
                )}
                {p?.social_care && (
                  <div style={{
                    color: '#047857',
                    background: '#ecfdf5',
                    border: '1px solid #a7f3d0',
                    padding: '3px 10px',
                    borderRadius: '6px',
                    fontWeight: 700,
                    fontSize: '0.85rem'
                  }}>
                    🏠 SOTE: {p.social_care.service} ({p.social_care.decision_outcome})
                  </div>
                )}
                {p?.acting_as === 'guardian' && (
                  <div style={{ color: '#b45309', fontWeight: 600 }}>
                    Valtuutettu: {p?.guardian_name}
                  </div>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="auth-badge" style={{ fontSize: '0.85rem' }}>
                <CheckCircle2 size={16} />
                {activeSubmission.validation_status}
              </span>
            </div>
          </div>

          {/* Red Flag Alerts */}
          {activeSubmission.red_flags?.length > 0 && (
            <div className="notice-box notice-warning" style={{ marginBottom: '20px' }}>
              <AlertTriangle size={22} style={{ flexShrink: 0, color: '#b45309' }} />
              <div>
                <strong style={{ display: 'block', marginBottom: '4px' }}>{t.redFlagsAlert}</strong>
                <ul style={{ paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  {activeSubmission.red_flags.map((rf, i) => (
                    <li key={i}>{rf}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Tabs */}
          <div style={{ display: 'flex', gap: '4px', borderBottom: '1px solid var(--border)', marginBottom: '20px', flexWrap: 'wrap' }}>
            <button type="button" onClick={() => setActiveTab('triage')} style={tabStyle('triage')}>
              <Activity size={16} />
              Potilaan triage-vastaukset
              {redTriageCount > 0 && (
                <span style={{ background: '#ef4444', color: 'white', borderRadius: '9999px', padding: '1px 7px', fontSize: '0.75rem', fontWeight: 700 }}>
                  {redTriageCount}
                </span>
              )}
            </button>
            <button type="button" onClick={() => setActiveTab('summary')} style={tabStyle('summary')}>
              <FileText size={16} />
              {t.tabSummary}
            </button>
            <button type="button" onClick={() => setActiveTab('history')} style={tabStyle('history')}>
              <ClipboardList size={16} />
              LUVN-käyntihistoria & labrat
              {p?.clinical_notes?.length > 0 && (
                <span style={{ background: '#0284c7', color: 'white', borderRadius: '9999px', padding: '1px 7px', fontSize: '0.75rem', fontWeight: 700 }}>
                  {p.clinical_notes.length}
                </span>
              )}
            </button>
            {p?.social_care && (
              <button type="button" onClick={() => setActiveTab('social')} style={tabStyle('social')}>
                <UserCheck size={16} />
                Sosiaalihuolto (SOTE)
                <span style={{ background: '#059669', color: 'white', borderRadius: '9999px', padding: '1px 7px', fontSize: '0.75rem', fontWeight: 700 }}>
                  Kotihoito
                </span>
              </button>
            )}
            <button type="button" onClick={() => setActiveTab('reconciliation')} style={tabStyle('reconciliation')}>
              {t.tabReconciliation}
              {activeSubmission.discrepancies?.length > 0 && (
                <span style={{ background: '#ef4444', color: 'white', borderRadius: '9999px', padding: '1px 6px', fontSize: '0.75rem', fontWeight: 700 }}>
                  {activeSubmission.discrepancies.length}
                </span>
              )}
            </button>
          </div>

          {/* ── TAB: Triage Answers (priority first) ── */}
          {activeTab === 'triage' && (
            <div>
              {/* 1. Patient's triage Q&A */}
              <div className="content-card" style={{ marginBottom: '20px' }}>
                <h3 style={{ fontSize: '1.15rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                  <ClipboardList size={20} />
                  Kliininen triage-seulonta — potilaan vastaukset
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '16px' }}>
                  Potilas vastasi seuraaviin kliinisiin kysymyksiin ennen vastaanottoa. Tiedot tallennettu hoitotiimille.
                </p>

                {triageItems.length > 0 ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '12px' }}>
                    {triageItems.map((item, idx) => (
                      <TriageCard key={item.question_id || idx} item={item} />
                    ))}
                  </div>
                ) : (
                  <div className="notice-box" style={{ color: 'var(--text-muted)' }}>
                    <ClipboardList size={18} />
                    <span>Triage-vastauksia ei tallennettu tälle esitiedolle (vanhempi lähetys).</span>
                  </div>
                )}
              </div>

              {/* 2. Medicus AI Anamnesis */}
              <div className="content-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
                  <div>
                    <h3 style={{ fontSize: '1.15rem', color: '#7c3aed', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Brain size={20} />
                      Tekoälyn generoima esitietotiivistelmä
                    </h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.87rem', marginTop: '4px', maxWidth: '520px' }}>
                      Medicus-malli koostaa potilaan tietojen perusteella kliinisen anamneesiluonnoksen lääkärille.
                      Tiedot perustuvat <strong>vain potilaan ilmoittamiin tietoihin</strong>.
                    </p>
                  </div>
                  {!anamnesis && (
                    <button
                      type="button"
                      onClick={handleGenerateAnamnesis}
                      disabled={anamnesisLoading}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        background: anamnesisLoading ? '#ede9fe' : '#7c3aed',
                        color: anamnesisLoading ? '#7c3aed' : 'white',
                        border: 'none', borderRadius: '8px',
                        padding: '10px 20px', fontWeight: 700,
                        fontSize: '0.95rem', cursor: anamnesisLoading ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s',
                      }}
                    >
                      {anamnesisLoading
                        ? <><Loader2 size={18} className="animate-spin" /> Generoidaan...</>
                        : <><Sparkles size={18} /> Generoi anamneesi</>
                      }
                    </button>
                  )}
                </div>

                {anamnesis ? (
                  <div>
                    <div style={{
                      background: '#faf5ff',
                      border: '1.5px solid #a78bfa',
                      borderRadius: '10px',
                      padding: '20px',
                      fontSize: '1rem',
                      lineHeight: 1.7,
                      color: '#1e1b4b',
                      whiteSpace: 'pre-wrap',
                    }}>
                      {anamnesis}
                    </div>
                    <div style={{ display: 'flex', gap: '10px', marginTop: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        ⚡ Generoitu Medicus-mallilla potilaan ilmoittamien tietojen pohjalta.
                        Tarkista ennen käyttöä.
                      </span>
                      <button
                        type="button"
                        onClick={() => { navigator.clipboard.writeText(anamnesis); setToastMessage('Anamneesi kopioitu'); setTimeout(() => setToastMessage(null), 2000); }}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: '6px', padding: '6px 12px', fontSize: '0.85rem', cursor: 'pointer' }}
                      >
                        <Copy size={14} /> Kopioi
                      </button>
                      <button
                        type="button"
                        onClick={() => setAnamnesis(null)}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: '6px', padding: '6px 12px', fontSize: '0.85rem', cursor: 'pointer' }}
                      >
                        <RefreshCw size={14} /> Uusi
                      </button>
                    </div>
                  </div>
                ) : !anamnesisLoading ? (
                  <div style={{
                    border: '2px dashed #c4b5fd',
                    borderRadius: '10px',
                    padding: '32px',
                    textAlign: 'center',
                    color: '#7c3aed',
                    fontSize: '0.95rem',
                  }}>
                    <Brain size={32} style={{ marginBottom: '8px', opacity: 0.5 }} />
                    <p style={{ margin: 0 }}>Paina «Generoi anamneesi» saadaksesi Medicus-mallilta<br />kliinisen tiivistelmän tästä esitiedosta.</p>
                  </div>
                ) : (
                  <div style={{
                    border: '2px dashed #c4b5fd',
                    borderRadius: '10px',
                    padding: '32px',
                    textAlign: 'center',
                    color: '#7c3aed',
                  }}>
                    <Loader2 size={32} className="animate-spin" style={{ marginBottom: '8px' }} />
                    <p style={{ margin: 0, fontSize: '0.95rem' }}>Medicus generoi anamneesia...</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── TAB: Full Clinical Summary ── */}
          {activeTab === 'summary' && (
            <div className="content-card" style={{ marginTop: 0 }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px',
                marginBottom: '18px'
              }}>
                <h3 style={{ fontSize: '1.2rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                  <FileText size={20} />
                  {t.clinicalSummaryTitle}
                </h3>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {/* View Mode Toggle */}
                  <div style={{
                    display: 'flex',
                    background: '#f1f5f9',
                    padding: '3px',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0'
                  }}>
                    <button
                      type="button"
                      onClick={() => setSummaryViewMode('formatted')}
                      style={{
                        border: 'none',
                        background: summaryViewMode === 'formatted' ? '#ffffff' : 'transparent',
                        color: summaryViewMode === 'formatted' ? '#0f172a' : '#64748b',
                        fontWeight: summaryViewMode === 'formatted' ? 600 : 500,
                        fontSize: '0.82rem',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        boxShadow: summaryViewMode === 'formatted' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                      title="Näytä muotoiltu kliininen näkymä"
                    >
                      <Eye size={14} />
                      <span>Muotoiltu</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSummaryViewMode('raw')}
                      style={{
                        border: 'none',
                        background: summaryViewMode === 'raw' ? '#ffffff' : 'transparent',
                        color: summaryViewMode === 'raw' ? '#0f172a' : '#64748b',
                        fontWeight: summaryViewMode === 'raw' ? 600 : 500,
                        fontSize: '0.82rem',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        boxShadow: summaryViewMode === 'raw' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                      title="Näytä raaka Markdown-lähdekoodi"
                    >
                      <Code size={14} />
                      <span>Markdown</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={handleCopySummary}
                    style={{ minHeight: '36px', fontSize: '0.88rem' }}
                    title="Kopioi teksti potilastietojärjestelmään"
                  >
                    <Copy size={16} />
                    <span>{t.btnCopySummary}</span>
                  </button>
                </div>
              </div>

              {summaryViewMode === 'formatted' ? (
                <ClinicalMarkdownRenderer content={activeSubmission.summary_markdown_fi} />
              ) : (
                <div style={{
                  background: '#f8fafc',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '24px',
                  fontSize: '0.92rem',
                  lineHeight: 1.65,
                  whiteSpace: 'pre-line',
                  fontFamily: 'monospace, sans-serif'
                }}>
                  {activeSubmission.summary_markdown_fi}
                </div>
              )}
            </div>
          )}

          {/* ── TAB: LUVN Clinical Notes & Labs History ── */}
          {activeTab === 'history' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Clinical Notes Card */}
              <div className="content-card">
                <h3 style={{ fontSize: '1.2rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <FileText size={20} />
                  Aikaisemmat LUVN-vastaanottokäynnit (Kanta-arkisto)
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '16px' }}>
                  Potilaan aikaisemmat käyntimerkinnät Länsi-Uudenmaan terveyskeskuksista (Veil.AI synteettinen LUVN-aineisto).
                </p>

                {p?.clinical_notes && p.clinical_notes.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {p.clinical_notes.map((note, idx) => (
                      <div key={idx} style={{
                        border: '1px solid #e2e8f0',
                        borderRadius: '10px',
                        overflow: 'hidden',
                        background: '#ffffff',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                      }}>
                        <div style={{
                          background: '#f8fafc',
                          padding: '12px 16px',
                          borderBottom: '1px solid #e2e8f0',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          gap: '8px'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.95rem' }}>
                              📅 {note.visit_date}
                            </span>
                            <span style={{
                              background: note.clinician_role === 'lääkäri' ? '#e0f2fe' : '#f0fdf4',
                              color: note.clinician_role === 'lääkäri' ? '#0369a1' : '#15803d',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              textTransform: 'uppercase'
                            }}>
                              {note.clinician_role}
                            </span>
                            {note.urgency && (
                              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                                • {note.urgency}
                              </span>
                            )}
                          </div>
                          {note.primary_diagnosis_code && (
                            <span style={{
                              background: '#f1f5f9',
                              color: '#334155',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '0.8rem',
                              fontWeight: 600
                            }}>
                              ICD-10: {note.primary_diagnosis_code}
                            </span>
                          )}
                        </div>
                        <div style={{
                          padding: '16px 20px',
                          background: '#ffffff'
                        }}>
                          <ClinicalMarkdownViewer content={note.note_text} />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="notice-box notice-info">
                    <span>Ei aiempia vastaanottokirjauksia tässä rekisteriotteessa.</span>
                  </div>
                )}
              </div>

              {/* Labs Card */}
              {p?.lab_results && p.lab_results.length > 0 && (
                <div className="content-card">
                  <h3 style={{ fontSize: '1.15rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <Activity size={20} />
                    Laboratoriotulokset (HUS / LUVN vastausarkisto)
                  </h3>
                  <table className="data-table" style={{ marginTop: '12px' }}>
                    <thead>
                      <tr>
                        <th>Tutkimus</th>
                        <th>Koodi</th>
                        <th>Tulos</th>
                        <th>Päivämäärä</th>
                      </tr>
                    </thead>
                    <tbody>
                      {p.lab_results.map((lab, lidx) => (
                        <tr key={lidx}>
                          <td style={{ fontWeight: 700 }}>{lab.test_name}</td>
                          <td><code>{lab.test_code}</code></td>
                          <td>
                            <strong style={{ color: '#0369a1' }}>{lab.numeric_value}</strong> {lab.unit}
                          </td>
                          <td>{lab.date || '2025'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ── TAB: Social Care & Home Care (SOTE Integration) ── */}
          {activeTab === 'social' && p?.social_care && (
            <div className="content-card">
              <div style={{
                background: '#ecfdf5',
                border: '1.5px solid #a7f3d0',
                borderRadius: '10px',
                padding: '16px 20px',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px'
              }}>
                <div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#047857', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Länsi-Uudenmaan sosiaalihuolto • SOTE-integraatio
                  </span>
                  <h3 style={{ fontSize: '1.3rem', color: '#065f46', margin: '4px 0 2px' }}>
                    {p.social_care.service}
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.9rem', color: '#047857' }}>
                    Palvelutehtävä: {p.social_care.service_task} • Päätöspäivä: {p.social_care.decision_date}
                  </p>
                </div>
                <span style={{
                  background: p.social_care.decision_outcome === 'Myönteinen' ? '#059669' : '#dc2626',
                  color: 'white',
                  padding: '6px 14px',
                  borderRadius: '9999px',
                  fontWeight: 700,
                  fontSize: '0.9rem'
                }}>
                  Päätös: {p.social_care.decision_outcome}
                </span>
              </div>

              {p.social_care.plan_text && (
                <div style={{ marginBottom: '20px' }}>
                  <h4 style={{ fontSize: '1.05rem', color: '#0f172a', marginBottom: '8px' }}>
                    📋 Hoito- ja toteuttamissuunnitelma (voimassa: {p.social_care.plan_date || 'toistaiseksi'} alkaen)
                  </h4>
                  <div style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '20px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                  }}>
                    <ClinicalMarkdownViewer content={p.social_care.plan_text} />
                  </div>
                </div>
              )}

              {p.social_care.decision_text && (
                <div>
                  <h4 style={{ fontSize: '1.05rem', color: '#0f172a', marginBottom: '8px' }}>
                    📄 Virallinen päätösluonnos
                  </h4>
                  <div style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '20px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                  }}>
                    <ClinicalMarkdownViewer content={p.social_care.decision_text} />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── TAB: Medication Reconciliation ── */}
          {activeTab === 'reconciliation' && (
            <div className="content-card" style={{ marginTop: 0 }}>
              <h3 style={{ fontSize: '1.2rem', marginBottom: '8px' }}>{t.diffTableTitle}</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: '16px' }}>
                Tekoäly vertasi Kanta-arkistosta haettua lääkelistaa ja potilaan vahvistamaa ajantasaista tilannetta.
              </p>

              {activeSubmission.discrepancies?.length > 0 ? (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>{t.thMedication}</th>
                      <th>Muutoksen tyyppi</th>
                      <th>{t.thNote}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeSubmission.discrepancies.map((disc, idx) => (
                      <tr key={idx}>
                        <td style={{ fontWeight: 700 }}>{disc.item}</td>
                        <td>
                          <span className="diff-badge-stopped">{disc.type}</span>
                        </td>
                        <td>{disc.details}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="notice-box notice-success">
                  <CheckCircle2 size={20} />
                  <span>Ei ristiriitoja Kanta-rekisterin ja potilaan vahvistamien lääkkeiden välillä.</span>
                </div>
              )}
            </div>
          )}

          {/* Action Bar */}
          <div style={{
            background: 'white', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)', padding: '16px 20px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            flexWrap: 'wrap', gap: '12px', marginTop: '20px'
          }}>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button type="button" className="btn-primary" onClick={() => handleAction('Otettu käsittelyyn vastaanotolla')}>
                <CheckCircle2 size={18} />
                <span>{t.btnTakeCase}</span>
              </button>
              <button type="button" className="btn-secondary" onClick={() => window.open('https://luvn.fi', '_blank')}>
                <ExternalLink size={16} />
                <span>{t.btnOpenEHR}</span>
              </button>
              <button type="button" className="btn-secondary" onClick={() => handleAction('Lähetetty tarkennuspyyntö potilaalle')}>
                <MessageSquare size={16} />
                <span>{t.btnRequestInfo}</span>
              </button>
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Id: <strong>{activeSubmission.submission_id}</strong>
            </div>
          </div>
        </>
      ) : (
        <div className="content-card">Ei valittua esitietopakettia.</div>
      )}
    </div>
  );
}
