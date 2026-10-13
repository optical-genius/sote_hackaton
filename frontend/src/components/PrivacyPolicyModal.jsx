import React, { useState } from 'react';
import {
  X,
  ShieldCheck,
  Database,
  Cpu,
  Cookie,
  Lock,
  FileText,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Server
} from 'lucide-react';

export default function PrivacyPolicyModal ({
  isOpen,
  onClose,
  initialTab = 'gdpr',
  t,
  lang = 'fi'
}) {
  const [activeTab, setActiveTab] = useState(initialTab);

  // Sync initial tab when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  return (
    <div
      className="modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="privacy-modal-title"
    >
      <div
        className="privacy-modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="privacy-modal-header">
          <div className="privacy-header-brand">
            <div className="privacy-icon-badge">
              <ShieldCheck size={22} color="#0284c7" />
            </div>
            <div>
              <div className="privacy-header-sup">Länsi-Uudenmaan hyvinvointialue • Sopi</div>
              <h2 id="privacy-modal-title" className="privacy-modal-title">
                Tietosuoja, tietoturva ja tekoälyn periaatteet
              </h2>
            </div>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Sulje"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab navigation */}
        <div className="privacy-tabs-bar">
          <button
            type="button"
            className={`privacy-tab-btn ${activeTab === 'gdpr' ? 'active' : ''}`}
            onClick={() => setActiveTab('gdpr')}
          >
            <FileText size={16} />
            <span>Tietosuoja & GDPR</span>
          </button>
          <button
            type="button"
            className={`privacy-tab-btn ${activeTab === 'storage' ? 'active' : ''}`}
            onClick={() => setActiveTab('storage')}
          >
            <Database size={16} />
            <span>Tietojen säilytys & Kanta</span>
          </button>
          <button
            type="button"
            className={`privacy-tab-btn ${activeTab === 'ai' ? 'active' : ''}`}
            onClick={() => setActiveTab('ai')}
          >
            <Cpu size={16} />
            <span>Tekoäly (AI) oirekartoituksessa</span>
          </button>
          <button
            type="button"
            className={`privacy-tab-btn ${activeTab === 'cookies' ? 'active' : ''}`}
            onClick={() => setActiveTab('cookies')}
          >
            <Cookie size={16} />
            <span>Evästeet & oikeutesi</span>
          </button>
        </div>

        {/* Body content */}
        <div className="privacy-modal-body">
          {/* TAB 1: GDPR & Tietosuoja */}
          {activeTab === 'gdpr' && (
            <div className="privacy-tab-content">
              <div className="privacy-intro-card">
                <ShieldCheck size={20} color="#007a5a" style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <strong>Turvallista ja lainmukaista sosiaali- ja terveydenhuollon asiointia</strong>
                  <p>
                    Länsi-Uudenmaan hyvinvointialue (LUVN) käsittelee potilas- ja asiakastietoja EU:n yleisen tietosuoja-asetuksen (GDPR 2016/679), asiakastietolain (703/2023) ja potilaslain (785/1992) mukaisesti.
                  </p>
                </div>
              </div>

              <h4 className="privacy-section-heading">1. Rekisterinpitäjä ja yhteystiedot</h4>
              <p className="privacy-text">
                <strong>Rekisterinpitäjä:</strong> Länsi-Uudenmaan hyvinvointialue (LUVN)<br />
                <strong>Postiosoite:</strong> PL 10, 02033 Länsi-Uudenmaan hyvinvointialue<br />
                <strong>Tietosuojavastaava:</strong> tietosuoja@luvn.fi | Puhelin: 029 151 2000
              </p>

              <h4 className="privacy-section-heading">2. Käsittelyn tarkoitus ja oikeusperuste</h4>
              <p className="privacy-text">
                Käsittelemme esitietoja, jotta hoitotiimi voi valmistella vastaanoton, arvioida hoidon kiireellisyyden ja tarjota oikea-aikaista hoitoa.
              </p>
              <ul className="privacy-list">
                <li><strong>GDPR 6 artikla 1(c) ja 1(e):</strong> Lakisääteisen velvoitteen noudattaminen ja yleistä etua koskevan tehtävän suorittaminen (terveydenhuollon järjestäminen).</li>
                <li><strong>GDPR 9 artikla 2(h):</strong> Terveystietojen käsittely terveydenhuollon ja sosiaalihuollon palvelujen tarjoamista ja hoitoa varten terveydenhuollon ammattihenkilön valvonnassa.</li>
              </ul>

              <h4 className="privacy-section-heading">3. Käsiteltävät tiedot</h4>
              <div className="privacy-data-grid">
                <div className="privacy-data-pill">
                  <strong>Tunnistetiedot</strong>
                  <span>Suomi.fi-tunnistautuminen, nimi, henkilötunnus, puhelin, asuinkunta</span>
                </div>
                <div className="privacy-data-pill">
                  <strong>Esitiedot</strong>
                  <span>Käynnin syy, oirekuvaus, kipuasteikko, tarkentavat vastaukset</span>
                </div>
                <div className="privacy-data-pill">
                  <strong>Kanta-arkiston tiedot</strong>
                  <span>Aktiivinen lääkitys, vahvistetut pitkäaikaissairaudet, allergiat</span>
                </div>
                <div className="privacy-data-pill">
                  <strong>Loki- ja istuntotiedot</strong>
                  <span>Tunnistautumishetki, tiedonsiirron aikaleimat, käsittelijöiden roolit</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Tietojen säilytys & Kanta */}
          {activeTab === 'storage' && (
            <div className="privacy-tab-content">
              <div className="privacy-intro-card blue">
                <Database size={20} color="#0284c7" style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <strong>Valtakunnallinen Kanta-integraatio ja korkein tietoturvataso</strong>
                  <p>
                    Kaikki esitiedot tallennetaan ja suojataan Suomen kansallisten Kanta-palveluiden ja Valviran A-luokan potilastietojärjestelmävaatimusten mukaisesti.
                  </p>
                </div>
              </div>

              <h4 className="privacy-section-heading">1. Minne tiedot tallennetaan?</h4>
              <p className="privacy-text">
                Kun lähetät esitiedot, ne siirretään salattua yhteyttä pitkin Länsi-Uudenmaan hyvinvointialueen potilastietojärjestelmään ja liitetään Kanta-arkistoon (Potilastiedon arkisto ja Reseptikeskus).
              </p>

              <h4 className="privacy-section-heading">2. Tekninen suojaus ja salaus</h4>
              <div className="privacy-features-list">
                <div className="privacy-feature-item">
                  <Lock size={18} color="#007a5a" />
                  <div>
                    <strong>Päästä päähän salattu tiedonsiirto (TLS 1.3)</strong>
                    <p>Kaikki selaimesi ja palvelimen välinen liikenne on suojattu vahvalla salauksella.</p>
                  </div>
                </div>
                <div className="privacy-feature-item">
                  <Server size={18} color="#007a5a" />
                  <div>
                    <strong>Lepotilan salaus (AES-256)</strong>
                    <p>Tietokannat ja arkistoidut potilasasiakirjat ovat kryptografisesti suojattuja.</p>
                  </div>
                </div>
                <div className="privacy-feature-item">
                  <CheckCircle2 size={18} color="#007a5a" />
                  <div>
                    <strong>Roolipohjainen ammattilaispääsy</strong>
                    <p>Tietoihisi pääsevät käsiksi ainoastaan hoitoosi osallistuvat laillistetut terveydenhuollon ammattilaiset (lääkärit, hoitajat) toimikorttitunnisteella.</p>
                  </div>
                </div>
              </div>

              <h4 className="privacy-section-heading">3. Lakisääteiset säilytysajat</h4>
              <p className="privacy-text">
                Potilasasiakirjoja säilytetään Sosiaali- ja terveysministeriön asetuksen (94/2022) mukaisesti:
              </p>
              <ul className="privacy-list">
                <li><strong>Potilaskertomukset:</strong> 12 vuotta potilaan kuolemasta tai 120 vuotta potilaan syntymästä.</li>
                <li><strong>Esitietolomakkeen keskeneräiset luonnokset:</strong> Luonnokset poistuvat automaattisesti 24 tunnin kuluessa, ellei niitä vahvisteta ja lähetetä.</li>
              </ul>
            </div>
          )}

          {/* TAB 3: Tekoäly (AI) ja kysymysten generointi */}
          {activeTab === 'ai' && (
            <div className="privacy-tab-content">
              <div className="privacy-intro-card purple">
                <Cpu size={20} color="#7c3aed" style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <strong>Miten tekoäly käyttää tietojasi? (EU AI Act 50 artiklan ilmoitus)</strong>
                  <p>
                    Sopi hyödyntää tekoälyä (Medicus-malli) ainoastaan esitietojen tarkentamiseen ja hoitotiimin työn sujuvoittamiseen. Terveystietosi eivät koskaan päädy julkisille tekoäly-yhtiöille.
                  </p>
                </div>
              </div>

              <div className="privacy-guarantee-box">
                <div className="guarantee-title">
                  <CheckCircle2 size={18} color="#007a5a" />
                  <span>Kolme keskeistä tietosuojalupaustamme tekoälystä:</span>
                </div>
                <div className="guarantee-grid">
                  <div className="guarantee-card">
                    <strong>1. Ei tekoälyn koulutusta</strong>
                    <p>Oirekuvaustasi tai vastauksiasi <em>ei koskaan</em> käytetä ulkoisten tekoälymallien kouluttamiseen tai opettamiseen.</p>
                  </div>
                  <div className="guarantee-card">
                    <strong>2. Suljettu paikallinen laskenta</strong>
                    <p>Kysymysten päättely suoritetaan hyvinvointialueen omassa, suljetussa ja tietoturvallisessa laskentaympäristössä ilman ulkopuolisia rajapintoja.</p>
                  </div>
                  <div className="guarantee-card">
                    <strong>3. Ihminen tekee aina päätökset</strong>
                    <p>Tekoäly ei tee diagnooseja eikä määrää lääkkeitä. Hoitopäätöksen ja hoidon tarpeen arvioi aina laillistettu lääkäri tai hoitaja.</p>
                  </div>
                </div>
              </div>

              <h4 className="privacy-section-heading">Miksi tekoäly generoi tarkentavia kysymyksiä?</h4>
              <p className="privacy-text">
                Kun kirjoitat esimerkiksi <em>"Alaselkäkipu säteilee jalkaan"</em>, tekoälymalli tunnistaa oireen ja esittää lääketieteellisesti olennaisia tarkennuksia (kuten kivun voimakkuus tai varoittavat hermo-oireet). Näin hoitotiimi saa valmiiksi jäsennellyn kuvan tilanteestasi jo ennen käyntiä.
              </p>

              <div className="privacy-callout-warning">
                <AlertCircle size={16} color="#b45309" style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <strong>Vastaaminen on aina vapaaehtoista</strong>
                  <p>Voit halutessasi jättää vastaamatta mihin tahansa kysymykseen tai tarkentaa oireitasi omin sanoin.</p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Evästeet & Oikeudet */}
          {activeTab === 'cookies' && (
            <div className="privacy-tab-content">
              <div className="privacy-intro-card">
                <Cookie size={20} color="#0284c7" style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <strong>Evästeiden käyttö ja rekisteröidyn oikeudet</strong>
                  <p>
                    Käytämme ainoastaan palvelun toiminnalle ja turvallisuudelle välttämättömiä evästeitä sekä anonyymiä kehitysanalytiikkaa. Emme käytä mainosevästeitä.
                  </p>
                </div>
              </div>

              <h4 className="privacy-section-heading">1. Rekisteröidyn oikeudet (GDPR)</h4>
              <ul className="privacy-list">
                <li><strong>Tarkastusoikeus (15 art.):</strong> Sinulla on oikeus tarkastaa sinusta tallennetut tiedot OmaKannasta tai pyytämällä hyvinvointialueelta.</li>
                <li><strong>Oikeus tietojen oikaisemiseen (16 art.):</strong> Voit vaatia virheellisten tietojen korjaamista.</li>
                <li><strong>Lokitietojen tarkastusoikeus:</strong> Sinulla on oikeus saada tietää, kuka on katsonut potilastietojasi kahden edeltävän vuoden aikana.</li>
                <li><strong>Oikeus valittaa valvontaviranomaiselle:</strong> Jos koet, että tietosuojaasi on loukattu, voit kääntyä Tietosuojavaltuutetun puoleen (tietosuoja.fi).</li>
              </ul>

              <h4 className="privacy-section-heading">2. Evästesuostumuksen muuttaminen</h4>
              <p className="privacy-text">
                Voit milloin tahansa muuttaa antamaasi evästesuostumusta alla olevasta painikkeesta:
              </p>
              <div style={{ marginTop: 12 }}>
                <button
                  type="button"
                  className="cookie-btn cookie-btn-primary"
                  onClick={() => {
                    onClose();
                    window.dispatchEvent(new CustomEvent('hoivapolku_reopen_cookies'));
                  }}
                >
                  <Cookie size={16} />
                  <span>Avaa evästeasetukset ja muuta valintoja</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="privacy-modal-footer">
          <div className="privacy-footer-note">
            Länsi-Uudenmaan hyvinvointialue • Potilastietolain (703/2023) mukainen palvelu
          </div>
          <button type="button" className="btn-modal-done" onClick={onClose}>
            Sulje
          </button>
        </div>
      </div>
    </div>
  );
}
