with open('public/app.html', 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Update the CSS for the banner and controls
old_css_marker = '<style id="wf-aesthetic-banner">'
new_css = """<style id="wf-aesthetic-banner">
/* ===== AESTHETIC FINANCIAL FREEDOM HERO BANNER (CLEAN & STATIC) ===== */
.financial-hero-banner {
  position: relative;
  border-radius: 24px;
  overflow: hidden;
  margin-bottom: 26px;
  background: #eef5eb;
  border: 1px solid rgba(81, 128, 89, 0.18);
  box-shadow: 0 10px 30px rgba(35, 75, 45, 0.06);
  min-height: 200px;
  display: flex;
  align-items: center;
}

body.dark-mode .financial-hero-banner {
  background: #18231a;
  border-color: rgba(90, 160, 105, 0.25);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
}

.hero-banner-backdrop {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}

.hero-banner-img {
  position: absolute;
  right: 0;
  top: 0;
  height: 100%;
  width: auto;
  max-width: 62%;
  object-fit: cover;
  object-position: right center;
  opacity: 1;
  transform: none !important;
  transition: none !important;
  user-select: none;
  pointer-events: none;
}

/* NO ANIMATION / MOVEMENT ON HOVER */
.financial-hero-banner:hover .hero-banner-img {
  transform: none !important;
}

.hero-banner-gradient {
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, 
    #eef5eb 0%, 
    #eef5eb 32%, 
    rgba(238, 245, 235, 0.94) 45%, 
    rgba(238, 245, 235, 0.5) 60%, 
    rgba(238, 245, 235, 0.05) 80%, 
    transparent 100%);
}

body.dark-mode .hero-banner-gradient {
  background: linear-gradient(90deg, 
    #18231a 0%, 
    #18231a 32%, 
    rgba(24, 35, 26, 0.94) 45%, 
    rgba(24, 35, 26, 0.5) 60%, 
    rgba(24, 35, 26, 0.05) 80%, 
    transparent 100%);
}

.hero-banner-content {
  position: relative;
  z-index: 2;
  width: 100%;
  padding: 28px 36px;
  display: flex;
  align-items: center;
  justify-content: flex-start;
}

.hero-banner-left {
  max-width: 480px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 12px;
}

.hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border-radius: 999px;
  background: rgba(53, 104, 75, 0.12);
  border: 1px solid rgba(53, 104, 75, 0.18);
}

body.dark-mode .hero-badge {
  background: rgba(90, 175, 115, 0.16);
  border-color: rgba(90, 175, 115, 0.25);
}

.hero-sparkle {
  font-size: 0.9rem;
}

.hero-eyebrow {
  font-family: var(--font-display, system-ui);
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.8px;
  text-transform: uppercase;
  color: var(--green, #35684b);
}

body.dark-mode .hero-eyebrow {
  color: #7ecc90;
}

.hero-title {
  font-family: var(--font-display, system-ui);
  font-size: 1.85rem;
  font-weight: 800;
  letter-spacing: -0.6px;
  line-height: 1.25;
  margin: 0;
  color: var(--text, #18261a);
}

.hero-subtitle {
  margin: 0;
  font-size: 0.88rem;
  line-height: 1.55;
  color: var(--muted, #5f6e62);
  max-width: 420px;
}

.hero-action-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 6px;
}

.hero-catat-btn {
  height: 44px;
  padding: 0 20px;
  border-radius: 12px;
  font-size: 0.9rem;
  font-weight: 700;
  white-space: nowrap;
  box-shadow: 0 6px 18px rgba(53, 104, 75, 0.22);
  background: var(--green, #35684b);
  color: #ffffff;
  border: none;
  cursor: pointer;
}

.hero-stat-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(53, 104, 75, 0.14);
  font-size: 0.76rem;
  font-weight: 700;
  color: var(--text, #202820);
}

body.dark-mode .hero-stat-pill {
  background: rgba(30, 42, 33, 0.85);
  border-color: rgba(90, 175, 115, 0.2);
  color: #e5eee5;
}

.stat-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #35684b;
}

@media(max-width: 860px) {
  .hero-banner-content {
    padding: 22px 18px;
  }
  .hero-banner-img {
    max-width: 100%;
    opacity: 0.28;
  }
  .hero-banner-gradient {
    background: linear-gradient(180deg, rgba(238,245,235,0.95) 0%, rgba(238,245,235,0.9) 100%);
  }
  body.dark-mode .hero-banner-gradient {
    background: linear-gradient(180deg, rgba(24,35,26,0.95) 0%, rgba(24,35,26,0.9) 100%);
  }
}
</style>"""

import re
text = re.sub(r'<style id="wf-aesthetic-banner">.*?</style>', new_css, text, flags=re.DOTALL)

# 2. Update the banner HTML so that button is on the LEFT side, completely off "Financial Freedom"
new_banner_html = """        <section class="financial-hero-banner" id="financialHeroBanner">
          <div class="hero-banner-backdrop">
            <img src="/images/financial-freedom-banner.jpg" alt="Financial Freedom Illustration" class="hero-banner-img" />
            <div class="hero-banner-gradient"></div>
          </div>
          <div class="hero-banner-content">
            <div class="hero-banner-left">
              <div class="hero-badge">
                <span class="hero-sparkle">✨</span>
                <span class="hero-eyebrow" id="greetingEyebrow">FINANCIAL FREEDOM · SAGE WELLNESS</span>
              </div>
              <h1 class="hero-title" id="greetingTitle">
                Selamat Datang di WiseFinance <span class="wave">🌿</span>
              </h1>
              <p class="hero-subtitle">
                Pelan-pelan saja. Jaga kebutuhan, dana darurat, dan keinginanmu tetap seimbang menuju kebebasan finansial.
              </p>
              <div class="hero-action-row">
                <button class="button button-primary hero-catat-btn" id="addTransactionTop">
                  <span class="button-plus">＋</span> Catat transaksi
                </button>
                <div class="hero-stat-pill">
                  <span class="stat-dot"></span>
                  <span>100% Terarah</span>
                </div>
              </div>
            </div>
          </div>
        </section>"""

text = re.sub(r'<section class="financial-hero-banner".*?</section>', new_banner_html, text, flags=re.DOTALL)

# 3. Clean up the topbar completely: remove the sun icon, remove the profile button/pill
clean_topbar = """<header class="topbar">
        <div class="topbar-left">
          <button class="icon-button menu-trigger" id="menuTrigger" aria-label="Buka menu navigasi"><svg viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h16"/></svg></button>
          <div class="breadcrumb"><span>Workspace</span><span class="crumb-slash">/</span><strong id="currentPageLabel">Dashboard</strong></div>
        </div>
        <div class="topbar-actions">
          <div class="date-pill"><span class="status-dot"></span><span id="todayLabel">Kamis, 22 Oktober 2026</span></div>
          <button class="icon-button calculator-trigger" id="topCalculatorButton" aria-label="Buka kalkulator" title="Kalkulator"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8 11h2m4 0h2M8 15h2m4 0h2M8 18h2m4 0h2"/></svg></button>
        </div>
      </header>"""

text = re.sub(r'<header class="topbar">.*?</header>', clean_topbar, text, flags=re.DOTALL)

with open('public/app.html', 'w', encoding='utf-8') as f:
    f.write(text)

print("Updated public/app.html successfully!")

