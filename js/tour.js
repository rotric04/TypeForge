/**
 * TypeForge AI — Guided Tour System
 * Spotlight overlay with step-by-step feature walkthrough.
 * Shows only once per user (stored in localStorage as tf_tour_done).
 */

'use strict';

const TOUR_KEY = 'tf_tour_done';
const TOUR_VERSION = '1'; // bump to re-show tour after major UI changes

// ── CSS injected once ──────────────────────────────────────────────
const TOUR_CSS = `
#tf-tour-overlay {
  position: fixed;
  inset: 0;
  z-index: 9000;
  pointer-events: none;
}
#tf-tour-overlay.active {
  pointer-events: all;
}
#tf-tour-backdrop {
  position: absolute;
  inset: 0;
  background: rgba(4, 4, 14, 0.82);
  backdrop-filter: blur(2px);
  -webkit-backdrop-filter: blur(2px);
  transition: opacity 0.35s ease;
}
#tf-tour-spotlight {
  position: absolute;
  border-radius: 16px;
  box-shadow: 0 0 0 4000px rgba(4, 4, 14, 0.82);
  border: 2px solid rgba(232, 115, 74, 0.7);
  box-shadow:
    0 0 0 4000px rgba(4, 4, 14, 0.82),
    0 0 0 4px rgba(232, 115, 74, 0.2),
    0 0 30px rgba(232, 115, 74, 0.4);
  transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  pointer-events: none;
}
#tf-tour-tooltip {
  position: absolute;
  background: linear-gradient(135deg, rgba(13,13,30,0.98), rgba(17,17,40,0.98));
  border: 1px solid rgba(232, 115, 74, 0.35);
  border-radius: 20px;
  padding: 20px 24px;
  min-width: 260px;
  max-width: 320px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.7), 0 0 40px rgba(232,115,74,0.15);
  transition: all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
  font-family: 'Inter', system-ui, sans-serif;
  z-index: 9001;
}
.tf-tour-step-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: rgba(232,115,74,0.15);
  border: 1px solid rgba(232,115,74,0.3);
  border-radius: 999px;
  padding: 3px 10px;
  font-size: 11px;
  font-weight: 600;
  color: #f0956e;
  letter-spacing: 0.05em;
  margin-bottom: 10px;
}
.tf-tour-title {
  font-family: 'Satoshi', 'Inter', system-ui, sans-serif;
  font-size: 16px;
  font-weight: 700;
  color: #f2f2f8;
  margin-bottom: 6px;
  line-height: 1.3;
}
.tf-tour-desc {
  font-size: 13px;
  color: #a8a8c4;
  line-height: 1.6;
  margin-bottom: 16px;
}
.tf-tour-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
.tf-tour-skip {
  font-size: 12px;
  color: #686888;
  cursor: pointer;
  background: none;
  border: none;
  padding: 0;
  transition: color 0.15s;
}
.tf-tour-skip:hover { color: #a8a8c4; }
.tf-tour-btns {
  display: flex;
  gap: 8px;
}
.tf-tour-btn {
  font-size: 13px;
  font-weight: 600;
  padding: 8px 16px;
  border-radius: 10px;
  border: none;
  cursor: pointer;
  transition: all 0.15s;
}
.tf-tour-btn-next {
  background: linear-gradient(135deg, #e8734a, #f05c6e);
  color: #fff;
  box-shadow: 0 4px 16px rgba(232,115,74,0.35);
}
.tf-tour-btn-next:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(232,115,74,0.5);
}
.tf-tour-btn-prev {
  background: rgba(255,255,255,0.06);
  color: #a8a8c4;
  border: 1px solid rgba(255,255,255,0.09);
}
.tf-tour-btn-prev:hover {
  background: rgba(255,255,255,0.10);
  color: #f2f2f8;
}
.tf-tour-dots {
  display: flex;
  gap: 5px;
  align-items: center;
}
.tf-tour-dot {
  width: 5px; height: 5px;
  border-radius: 50%;
  background: rgba(255,255,255,0.15);
  transition: all 0.2s;
}
.tf-tour-dot.active {
  background: #e8734a;
  width: 16px;
  border-radius: 3px;
}
@media (max-width: 600px) {
  #tf-tour-tooltip {
    min-width: 220px;
    max-width: calc(100vw - 32px);
    padding: 16px 18px;
  }
  .tf-tour-title { font-size: 15px; }
  .tf-tour-desc  { font-size: 12px; }
}
`;

// ── Tour Steps Definition ──────────────────────────────────────────
// target: CSS selector to highlight. null = center modal (no spotlight)
const DEFAULT_STEPS = [
  {
    target: null,
    title: '👋 Welcome to TypeForge AI!',
    desc: "Let's take a 30-second tour to show you the key features. You can skip at any time.",
    wide: true,
  },
  {
    target: '#mode-selector, .mode-tabs, [data-mode], .mode-btn:first-child',
    title: '⌨️ Choose Your Mode',
    desc: 'Switch between Classic typing, Developer code snippets, Speed sprints, and more. Each mode trains different skills.',
    position: 'bottom',
  },
  {
    target: '#timer-select, .duration-select, [id*="timer"], .timer-control',
    title: '⏱️ Set Your Duration',
    desc: 'Train in 15s, 30s, 60s, or custom sessions. Shorter sessions for warm-ups, longer for deep focus.',
    position: 'bottom',
  },
  {
    target: '#header-xp-fill, .xp-bar, #header-xp-text, [id*="xp"]',
    title: '⭐ Your XP & Level',
    desc: 'Every session earns XP. Level up to unlock achievements and track your long-term progress on the dashboard.',
    position: 'bottom',
  },
  {
    target: '#typing-area, #text-display, .typing-area, [id*="typing"]',
    title: '🎯 The Typing Arena',
    desc: 'Type the displayed text as fast and accurately as possible. Errors flash red — fix them or keep going.',
    position: 'top',
  },
  {
    target: null,
    title: '🚀 You\'re Ready!',
    desc: 'Your results are saved automatically after each session. Check your Dashboard for analytics and Achievements for badges. Happy typing!',
    wide: true,
    isLast: true,
  },
];

// ── Main Tour Class ────────────────────────────────────────────────
class TypeForgeTour {
  constructor(steps = DEFAULT_STEPS) {
    this.steps = steps;
    this.currentStep = 0;
    this.overlay = null;
    this.spotlight = null;
    this.tooltip = null;
    this.resizeObserver = null;
    this._styleEl = null;
  }

  /** Check if tour has already been seen */
  static hasBeenSeen() {
    try {
      return localStorage.getItem(TOUR_KEY) === TOUR_VERSION;
    } catch { return false; }
  }

  /** Mark tour as completed */
  static markSeen() {
    try { localStorage.setItem(TOUR_KEY, TOUR_VERSION); } catch {}
  }

  /** Start the tour (call this from page JS) */
  start() {
    if (TypeForgeTour.hasBeenSeen()) return;
    this._injectStyles();
    this._buildDOM();
    this._show(0);
  }

  /** Force-start ignoring seen state (for replay) */
  forceStart() {
    this._injectStyles();
    this._buildDOM();
    this._show(0);
  }

  _injectStyles() {
    if (this._styleEl) return;
    this._styleEl = document.createElement('style');
    this._styleEl.textContent = TOUR_CSS;
    document.head.appendChild(this._styleEl);
  }

  _buildDOM() {
    // Remove existing if any
    this._cleanup();

    // Overlay
    this.overlay = document.createElement('div');
    this.overlay.id = 'tf-tour-overlay';

    // Spotlight cutout
    this.spotlight = document.createElement('div');
    this.spotlight.id = 'tf-tour-spotlight';

    // Tooltip card
    this.tooltip = document.createElement('div');
    this.tooltip.id = 'tf-tour-tooltip';

    this.overlay.appendChild(this.spotlight);
    this.overlay.appendChild(this.tooltip);
    document.body.appendChild(this.overlay);

    // Keyboard navigation
    this._onKey = (e) => {
      if (e.key === 'ArrowRight' || e.key === 'Enter') this._next();
      if (e.key === 'ArrowLeft') this._prev();
      if (e.key === 'Escape') this._end();
    };
    document.addEventListener('keydown', this._onKey);
  }

  _show(stepIndex) {
    this.currentStep = stepIndex;
    const step = this.steps[stepIndex];
    const isFirst = stepIndex === 0;
    const isLast = step.isLast || stepIndex === this.steps.length - 1;

    // Render tooltip content
    this.tooltip.innerHTML = `
      <div class="tf-tour-step-badge">
        <span>✦</span>
        <span>${isLast ? 'All done!' : `Step ${stepIndex + 1} of ${this.steps.length}`}</span>
      </div>
      <div class="tf-tour-title">${step.title}</div>
      <div class="tf-tour-desc">${step.desc}</div>
      <div class="tf-tour-actions">
        <button class="tf-tour-skip" id="tf-skip-btn">Skip tour</button>
        <div class="tf-tour-dots">
          ${this.steps.map((_, i) => `<div class="tf-tour-dot${i === stepIndex ? ' active' : ''}"></div>`).join('')}
        </div>
        <div class="tf-tour-btns">
          ${!isFirst ? `<button class="tf-tour-btn tf-tour-btn-prev" id="tf-prev-btn">← Back</button>` : ''}
          <button class="tf-tour-btn tf-tour-btn-next" id="tf-next-btn">
            ${isLast ? '🎉 Let\'s go!' : 'Next →'}
          </button>
        </div>
      </div>
    `;

    // Wire buttons
    this.tooltip.querySelector('#tf-skip-btn').addEventListener('click', () => this._end());
    this.tooltip.querySelector('#tf-next-btn').addEventListener('click', () =>
      isLast ? this._end() : this._next()
    );
    const prevBtn = this.tooltip.querySelector('#tf-prev-btn');
    if (prevBtn) prevBtn.addEventListener('click', () => this._prev());

    // Position spotlight + tooltip
    if (step.target) {
      const el = document.querySelector(step.target);
      if (el) {
        this.overlay.classList.add('active');
        this.spotlight.style.display = 'block';
        this._positionSpotlight(el, step);
        this._positionTooltip(el, step);
      } else {
        // Target not found — show as center modal
        this._showCenter(step);
      }
    } else {
      this._showCenter(step);
    }
  }

  _positionSpotlight(el, step) {
    const pad = 10;
    const rect = el.getBoundingClientRect();
    this.spotlight.style.left   = `${rect.left - pad}px`;
    this.spotlight.style.top    = `${rect.top - pad}px`;
    this.spotlight.style.width  = `${rect.width + pad * 2}px`;
    this.spotlight.style.height = `${rect.height + pad * 2}px`;
  }

  _positionTooltip(el, step) {
    const pad = 16;
    const rect = el.getBoundingClientRect();
    const tw = this.tooltip.offsetWidth || 300;
    const th = this.tooltip.offsetHeight || 200;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let top, left;
    const position = step.position || 'bottom';

    if (position === 'bottom' || rect.bottom + th + pad < vh) {
      top  = rect.bottom + pad + 10;
    } else {
      top  = rect.top - th - pad - 10;
    }

    // Horizontal: center on element, clamp to viewport
    left = rect.left + rect.width / 2 - tw / 2;
    left = Math.max(16, Math.min(left, vw - tw - 16));

    this.tooltip.style.top  = `${top}px`;
    this.tooltip.style.left = `${left}px`;
    this.tooltip.style.transform = 'none';
  }

  _showCenter(step) {
    // No spotlight: dim whole page and center the tooltip
    this.spotlight.style.display = 'none';
    this.overlay.classList.add('active');

    const tw = step.wide ? Math.min(360, window.innerWidth - 32) : 300;
    this.tooltip.style.minWidth = `${tw}px`;
    this.tooltip.style.top  = '50%';
    this.tooltip.style.left = '50%';
    this.tooltip.style.transform = 'translate(-50%, -50%)';
  }

  _next() {
    if (this.currentStep < this.steps.length - 1) {
      this._show(this.currentStep + 1);
    } else {
      this._end();
    }
  }

  _prev() {
    if (this.currentStep > 0) {
      this._show(this.currentStep - 1);
    }
  }

  _end() {
    TypeForgeTour.markSeen();
    this._cleanup();
  }

  _cleanup() {
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
    }
    if (this._onKey) {
      document.removeEventListener('keydown', this._onKey);
      this._onKey = null;
    }
  }
}

// ── Public API ─────────────────────────────────────────────────────
export const tour = new TypeForgeTour();

/** Start tour if not yet seen (call on typing page load after auth) */
export function startTourIfNew() {
  // Slight delay so page renders first
  setTimeout(() => tour.start(), 1200);
}

/** Force restart the tour (for Settings / Help button) */
export function restartTour() {
  localStorage.removeItem(TOUR_KEY);
  setTimeout(() => tour.forceStart(), 100);
}

export default tour;
