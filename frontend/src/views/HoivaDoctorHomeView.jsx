import React, { useState } from 'react';
import { 
  User, 
  MessageSquare, 
  FileText, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  Heart, 
  Sun, 
  BarChart3, 
  Zap, 
  Search, 
  HelpCircle, 
  ShieldCheck, 
  ChevronRight,
  Send
} from 'lucide-react';

export default function HoivaDoctorHomeView({
  onNavigateToClient,
  onNavigateToChat,
  onNavigateToSummary,
  onOpenPrivacy,
  patients = [],
  t
}) {
  const [selectedPatientId, setSelectedPatientId] = useState(null);

  const todayPatients = [
    {
      id: 'patient-1',
      submissionId: 'LUVN-2026-98124',
      initials: 'MV',
      name: 'Matti Virtanen',
      age: 69,
      living: 'Kotona asuminen (Ingå)',
      badge: '📋 LUVN Alaselkäkysely',
      status: 'ready',
      statusLabel: 'Valmiit esitiedot (Kipu 7/10)',
      time: '08:30',
      actionLabel: 'Avaa kooste'
    },
    {
      id: 'patient-2',
      submissionId: 'LUVN-2026-98125',
      initials: 'JK',
      name: 'Juhani Korhonen',
      age: 69,
      living: 'Kotihoito (Raasepori)',
      badge: '🏠 SOTE: Kotihoitopäätös',
      status: 'ready',
      statusLabel: 'SOTE-integraatio • Nivelkipu',
      time: '09:15',
      actionLabel: 'Avaa kooste'
    },
    {
      id: 'patient-3',
      submissionId: 'LUVN-2026-98126',
      initials: 'AL',
      name: 'Aino Lehtonen',
      age: 32,
      living: 'Itseasiointi (Espoo)',
      badge: '⚠️ Ampisilliiniallergia',
      status: 'ready',
      statusLabel: 'Valmiit esitiedot • Infektio',
      time: '10:30',
      actionLabel: 'Avaa kooste'
    },
    {
      id: 'patient-4',
      submissionId: null,
      initials: 'MM',
      name: 'Marja Mäkinen',
      age: 65,
      living: 'Kotona asuminen (Espoo)',
      badge: 'Kilpirauhasen vajaatoiminta',
      status: 'missing',
      statusLabel: 'Puuttuu oirekartoitus',
      time: '13:00',
      actionLabel: 'Täydennä'
    }
  ];

  return (
    <div className="doctor-dashboard-container">
      {/* LEFT / CENTER MAIN COLUMN */}
      <div className="doctor-main-column">
        
        {/* HERO GREETING BANNER */}
        <section className="doctor-hero-banner" aria-label="Tervetulotoivotus">
          <div className="hero-banner-content">
            <h1 className="hero-banner-title">
              Hei Maija,<br />
              tervetuloa takaisin!
            </h1>
            <p className="hero-banner-desc">
              Tänään sinulla on 3 asiakasta. Autamme sinua saamaan nopeasti valmiit esitiedot ja 
              ehdotamme puuttuvia tietoja, jotta voit keskittyä tärkeimpään – asiakkaaseen.
            </p>
          </div>

          <div className="hero-banner-visual">
            <div className="hero-nurse-card">
              <img 
                src="/images/nurse_hero.jpg" 
                alt="Maija Korhonen, Sairaanhoitaja" 
                className="hero-nurse-img"
              />
              <div className="hero-handwritten-note">
                <span>Yhdessä parempaa hoitoa ♡</span>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION: NOPEA ALKU (QUICK START) */}
        <section className="doctor-section" aria-labelledby="nopea-alku-heading">
          <div className="section-heading-group">
            <h2 id="nopea-alku-heading" className="section-main-title">Nopea alku</h2>
            <p className="section-sub-title">Tarkista tänään tärkeimmät asiat tai jatka kesken jääneeseen.</p>
          </div>

          <div className="quick-start-grid">
            {/* Action Card 1: Uusi asiakas */}
            <div className="quick-action-card">
              <div className="quick-card-icon-wrap blue-bg">
                <User size={22} color="#0284c7" />
              </div>
              <h3 className="quick-card-title">Uusi asiakas</h3>
              <p className="quick-card-desc">Aloita uuden asiakkaan palvelutarpeen arviointi.</p>
              <button 
                type="button" 
                className="quick-card-btn btn-blue"
                onClick={() => onNavigateToClient && onNavigateToClient()}
              >
                <span>Aloita</span>
                <ArrowRight size={16} />
              </button>
            </div>

            {/* Action Card 2: Keskustele asiakkaan kanssa */}
            <div className="quick-action-card">
              <div className="quick-card-icon-wrap green-bg">
                <MessageSquare size={22} color="#059669" />
              </div>
              <h3 className="quick-card-title">Keskustele asiakkaan kanssa</h3>
              <p className="quick-card-desc">Täydennä puuttuvia tietoja luonnollisella kielellä.</p>
              <button 
                type="button" 
                className="quick-card-btn btn-emerald"
                onClick={() => onNavigateToChat && onNavigateToChat()}
              >
                <span>Avaa keskustelu</span>
                <ArrowRight size={16} />
              </button>
            </div>

            {/* Action Card 3: Tarkista valmiit tiedot */}
            <div className="quick-action-card">
              <div className="quick-card-icon-wrap purple-bg">
                <FileText size={22} color="#7c3aed" />
              </div>
              <h3 className="quick-card-title">Tarkista valmiit tiedot</h3>
              <p className="quick-card-desc">Katso ja vahvista asiakkaan ennakkotiedot ennen asiantuntijalle lähettämistä.</p>
              <button 
                type="button" 
                className="quick-card-btn btn-purple"
                onClick={() => onNavigateToSummary && onNavigateToSummary()}
              >
                <span>Näytä tiedot</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </section>

        {/* SECTION: TÄNÄÄN (TODAY'S PATIENT QUEUE) */}
        <section className="doctor-section" aria-labelledby="tanaan-heading">
          <div className="section-header-flex">
            <h2 id="tanaan-heading" className="section-main-title">Tänään</h2>
            <button 
              type="button" 
              className="section-link-btn"
              onClick={() => onNavigateToClient && onNavigateToClient()}
            >
              <span>Näytä kaikki</span>
              <ArrowRight size={16} />
            </button>
          </div>

          <div className="today-patients-list">
            {todayPatients.map((p) => {
              const isReady = p.status === 'ready';
              return (
                <div key={p.id} className="today-patient-row">
                  <div className={`patient-initials-badge ${p.initials.toLowerCase()}`}>
                    {p.initials}
                  </div>

                  <div className="patient-meta-info">
                    <div className="patient-meta-name" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span>{p.name}</span>
                      {p.badge && (
                        <span style={{
                          fontSize: '0.72rem',
                          fontWeight: 650,
                          background: p.badge.includes('SOTE') ? '#ecfdf5' : (p.badge.includes('⚠️') ? '#fef3c7' : '#e0f2fe'),
                          color: p.badge.includes('SOTE') ? '#047857' : (p.badge.includes('⚠️') ? '#b45309' : '#0369a1'),
                          border: `1px solid ${p.badge.includes('SOTE') ? '#a7f3d0' : (p.badge.includes('⚠️') ? '#fde68a' : '#bae6fd')}`,
                          padding: '2px 8px',
                          borderRadius: '4px'
                        }}>
                          {p.badge}
                        </span>
                      )}
                    </div>
                    <div className="patient-meta-details">{p.age} v • {p.living}</div>
                  </div>

                  <div className="patient-status-col">
                    <span className={`patient-status-pill ${isReady ? 'ready' : 'missing'}`}>
                      {isReady ? (
                        <>
                          <CheckCircle2 size={13} className="pill-icon" />
                          <span>{p.statusLabel}</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle size={13} className="pill-icon" />
                          <span>{p.statusLabel}</span>
                        </>
                      )}
                    </span>
                  </div>

                  <div className="patient-time-col">
                    {p.time}
                  </div>

                  <div className="patient-action-col">
                    <button 
                      type="button" 
                      className="patient-row-btn"
                      onClick={() => {
                        if (p.submissionId && onNavigateToSummary) {
                          onNavigateToSummary(p.submissionId, p.id);
                        } else if (onNavigateToClient) {
                          onNavigateToClient(p.id);
                        }
                      }}
                    >
                      <span>{p.actionLabel}</span>
                      <ArrowRight size={15} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

      </div>

      {/* RIGHT WIDGETS COLUMN */}
      <aside className="doctor-widgets-column" aria-label="Oheistiedot ja pikatoiminnot">
        
        {/* WIDGET 1: TÄRKEÄÄ TÄNÄÄN */}
        <div className="widget-card widget-notice-card">
          <div className="widget-notice-header">
            <span className="notice-heart-icon">
              <Heart size={16} fill="currentColor" />
            </span>
            <h4>Tärkeää tänään</h4>
          </div>
          <p className="widget-notice-body">
            Muista tarkistaa, että kaikki asiakkaan lääkitystiedot ovat ajan tasalla ennen lähettämistä.
          </p>
          <a 
            href="#laakitysohje" 
            className="widget-notice-link"
            onClick={(e) => {
              e.preventDefault();
              alert('Lääkitystietojen tarkistusohje:\n1. Varmista annostus ja reseptin voimassaolo Kanta-arkistosta.\n2. Kysy asiakkaalta/omaiselta itsehoitolääkkeistä ja luontaistuotteista.');
            }}
          >
            <span>Lue lisää</span>
            <ArrowRight size={14} />
          </a>
        </div>

        {/* WIDGET 2: WEATHER */}
        <div className="widget-card widget-weather-card">
          <div className="weather-icon-wrap">
            <Sun size={28} className="weather-sun-icon" />
          </div>
          <div className="weather-info-text">
            <div className="weather-city">Helsinki</div>
            <div className="weather-condition">Selkeää</div>
          </div>
          <div className="weather-temp">+12°C</div>
        </div>

        {/* WIDGET 3: PÄIVÄN YHTEENVETO */}
        <div className="widget-card">
          <div className="widget-card-title-row">
            <BarChart3 size={18} color="#475569" />
            <h4>Päivän yhteenveto</h4>
          </div>
          <div className="stats-metric-grid">
            <div className="stat-metric-col">
              <div className="stat-number">4</div>
              <div className="stat-label">Asiakasta</div>
            </div>
            <div className="stat-divider" />
            <div className="stat-metric-col">
              <div className="stat-number">3</div>
              <div className="stat-label">Valmiina</div>
            </div>
            <div className="stat-divider" />
            <div className="stat-metric-col">
              <div className="stat-number">1</div>
              <div className="stat-label">Täydennettävää</div>
            </div>
          </div>
        </div>

        {/* WIDGET 4: PIKATOIMINNOT */}
        <div className="widget-card">
          <div className="widget-card-title-row">
            <Zap size={18} color="#0284c7" />
            <h4>Pikatoiminnot</h4>
          </div>
          <div className="quick-actions-menu">
            <button 
              type="button" 
              className="quick-action-item"
              onClick={() => {
                const query = prompt('Kirjoita asiakkaan nimi tai henkilötunnus:');
                if (query && onNavigateToClient) onNavigateToClient();
              }}
            >
              <div className="action-item-left">
                <Search size={16} />
                <span>Etsi asiakas</span>
              </div>
              <ChevronRight size={16} className="action-item-arrow" />
            </button>

            <button 
              type="button" 
              className="quick-action-item"
              onClick={() => alert('Viesti tiimille:\nHoitotiimin sisäinen viestintäkanava on avattu.')}
            >
              <div className="action-item-left">
                <MessageSquare size={16} />
                <span>Lähetä viesti tiimille</span>
              </div>
              <ChevronRight size={16} className="action-item-arrow" />
            </button>

            <button 
              type="button" 
              className="quick-action-item"
              onClick={() => alert('HoivaPolku - Tuki ja ohjeet:\nKäyttötuki palvelee ma-pe klo 08-16 puh. 029 123 4567')}
            >
              <div className="action-item-left">
                <HelpCircle size={16} />
                <span>Ohje ja tuki</span>
              </div>
              <ChevronRight size={16} className="action-item-arrow" />
            </button>
          </div>
        </div>

        {/* WIDGET 5: TIETOSUOJA JA SUOSTUMUKSET */}
        <div 
          className="widget-card widget-privacy-card" 
          onClick={onOpenPrivacy}
          role="button"
          tabIndex={0}
        >
          <div className="privacy-card-icon">
            <ShieldCheck size={20} color="#0284c7" />
          </div>
          <div className="privacy-card-text">
            <h5>Tietosuoja ja suostumukset</h5>
            <p>Hallinnoi käyttöoikeuksia ja suostumuksia.</p>
          </div>
          <ChevronRight size={18} className="action-item-arrow" />
        </div>

      </aside>
    </div>
  );
}
