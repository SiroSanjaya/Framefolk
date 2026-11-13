import React from "react";
import {
  ArrowRight,
  AudioLines,
  Captions,
  Clapperboard,
  Download,
  Image,
  LockKeyhole,
  LogIn,
  Mic2,
  WandSparkles,
} from "lucide-react";

const PublicLanding = ({ onSignIn, onStart, supabaseConfigured }) => (
  <main className="landing-page">
    <header className="landing-nav">
      <a className="landing-brand" href="#top" aria-label="Framefolk beranda">
        <span className="brand-mark"><Clapperboard size={18} /></span>
        <span>framefolk<span className="brand-dot">.</span></span>
      </a>
      <nav className="landing-links" aria-label="Navigasi landing page">
        <a href="#cara-kerja">Cara kerja</a>
        <a href="#fitur">Fitur</a>
        <a href="#catatan">Catatan</a>
      </nav>
      <div className="landing-nav-actions">
        {supabaseConfigured ? (
          <>
            <button type="button" className="button button-quiet button-small" onClick={onSignIn}>
              <LogIn size={14} /> Masuk
            </button>
            <button type="button" className="button button-primary button-small" onClick={onStart}>
              Mulai bikin video <ArrowRight size={14} />
            </button>
          </>
        ) : (
          <span className="landing-account-status"><LockKeyhole size={13} /> Akun segera tersedia</span>
        )}
      </div>
    </header>

    <section className="landing-hero" id="top">
      <div className="landing-hero-copy">
        <div className="landing-eyebrow"><WandSparkles size={14} /> STUDIO VIDEO DARI PROMPT</div>
        <h1>Ide kamu,<br /><em>jadi video.</em></h1>
        <p className="landing-lead">
          Tulis cerita atau tempel naskah. Framefolk bantu menyusun adegan, mencari visual,
          membuat voice dan subtitle, lalu menyiapkan preview untuk kamu edit dan export sendiri.
        </p>
        <div className="landing-hero-actions">
          <button
            type="button"
            className="button button-primary landing-primary-cta"
            onClick={onStart}
            disabled={!supabaseConfigured}
          >
            {supabaseConfigured ? "Mulai bikin video" : "Studio sedang disiapkan"}
            <ArrowRight size={16} />
          </button>
          <a className="landing-secondary-cta" href="#cara-kerja">Lihat cara kerjanya</a>
        </div>
        {!supabaseConfigured && (
          <p className="landing-setup-note" role="status">
            Halaman studio bisa dilihat tanpa akun. Login akan aktif setelah layanan akun Framefolk disiapkan.
          </p>
        )}
        <div className="landing-trust-line">
          <span><CheckMark /> Bisa pakai prompt sendiri</span>
          <span><CheckMark /> Edit sebelum export</span>
        </div>
      </div>

      <div className="landing-showcase" aria-label="Gambaran workspace Framefolk">
        <div className="landing-showcase-window">
          <div className="landing-window-bar">
            <span className="landing-window-dots"><i /><i /><i /></span>
            <span>FRAMEFOLK WORKSPACE</span>
            <span className="landing-window-status"><i /> PREVIEW</span>
          </div>
          <div className="landing-workspace">
            <div className="landing-workspace-sidebar">
              <span className="landing-sidebar-label">PROMPT CERITA</span>
              <strong>Ide sederhana,<br />cerita berkarakter.</strong>
              <div className="landing-prompt-lines"><i /><i /><i /></div>
              <span className="landing-step-chip"><WandSparkles size={12} /> DIOLAH AI</span>
            </div>
            <div className="landing-video-preview">
              <div className="landing-preview-top"><span>ADEGAN 01</span><span>9:16</span></div>
              <div className="landing-preview-art">
                <div className="landing-art-orbit" />
                <div className="landing-art-person"><span /><i /><b /></div>
                <div className="landing-preview-title">CERITA<br /><em>DIMULAI.</em></div>
                <div className="landing-caption">“Awalnya aku kira…”</div>
              </div>
              <div className="landing-preview-bottom"><span>LIVE PREVIEW</span><span>00:04 / 00:15</span></div>
            </div>
          </div>
          <div className="landing-workspace-timeline">
            <span>TIMELINE</span>
            <i /><i /><i /><i />
            <b><AudioLines size={13} /> VOICE + SUBTITLE</b>
          </div>
        </div>
        <small className="landing-showcase-caption">Gambaran workspace — hasilnya tetap bisa kamu ubah.</small>
      </div>
    </section>

    <section className="landing-process" id="cara-kerja">
      <div className="landing-section-heading">
        <span className="landing-eyebrow">DARI IDE SAMPAI FILE</span>
        <h2>Satu tempat. Kamu tetap pegang kendali.</h2>
      </div>
      <div className="landing-process-grid">
        <article className="landing-process-card">
          <span className="landing-card-number">01</span>
          <WandSparkles size={19} />
          <h3>Kasih prompt atau naskah</h3>
          <p>AI mengembangkan ide jadi alur dan beat adegan. Kalau sudah punya naskah, Framefolk bisa mempertahankan kata-katamu.</p>
        </article>
        <article className="landing-process-card">
          <span className="landing-card-number">02</span>
          <div className="landing-card-icons"><Image size={18} /><Mic2 size={18} /><Captions size={18} /></div>
          <h3>Visual, voice, subtitle</h3>
          <p>Cari visual stock di dalam studio, buat voice-over, dan sinkronkan subtitle. Hasilnya bisa ditinjau sebelum export.</p>
        </article>
        <article className="landing-process-card">
          <span className="landing-card-number">03</span>
          <Clapperboard size={19} />
          <h3>Preview, edit, export</h3>
          <p>Remotion menyusun gerak dan adegan. Kamu yang memeriksa hasil, mengubah detail, lalu mengunduh MP4 saat siap.</p>
        </article>
      </div>
    </section>

    <section className="landing-features" id="fitur">
      <div>
        <span className="landing-eyebrow">BUKAN SEKADAR PROMPT KELUARAN</span>
        <h2>Yang kamu butuhkan untuk menyelesaikan video.</h2>
      </div>
      <div className="landing-feature-list">
        <div><span><AudioLines size={16} /></span><p><strong>Voice dan timing kata</strong><small>Audio voice-over dan alignment subtitle tampil di timeline.</small></p></div>
        <div><span><Image size={16} /></span><p><strong>Visual di dalam app</strong><small>Gunakan stock yang ditemukan Framefolk atau upload aset milikmu.</small></p></div>
        <div><span><Download size={16} /></span><p><strong>Export tetap keputusanmu</strong><small>Preview dan edit dahulu. MP4 baru dibuat saat kamu menekan export.</small></p></div>
      </div>
    </section>

    <footer className="landing-footer" id="catatan">
      <a className="landing-brand" href="#top">
        <span className="brand-mark"><Clapperboard size={16} /></span>
        <span>framefolk<span className="brand-dot">.</span></span>
      </a>
      <p>AI membantu cerita dan treatment. Visual stock/foto adalah gambar diam; Remotion yang menganimasikan dan menyusun video.</p>
      {supabaseConfigured && (
        <button type="button" className="landing-footer-login" onClick={onSignIn}>
          Sudah punya akun? Masuk <ArrowRight size={13} />
        </button>
      )}
    </footer>
  </main>
);

const CheckMark = () => <span className="landing-check" aria-hidden="true">✓</span>;

export default PublicLanding;
