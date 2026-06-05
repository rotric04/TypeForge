/**
 * TypeForge AI — Accessibility Control Panel
 * Floating persistent panel with font, motion, contrast, focus controls
 * All settings persist to localStorage and apply via <html> classes
 */

'use strict';

const A11Y_KEY = 'tf_a11y';

const DEFAULTS = {
  fontSize:    'normal',   // 'small' | 'normal' | 'large' | 'xlarge'
  motion:      'full',     // 'full' | 'reduced' | 'none'
  contrast:    'normal',   // 'normal' | 'high'
  focusRing:   'normal',   // 'normal' | 'fat' | 'off'
  dyslexia:    false,
  darkMode:    true,
};

const FONT_SCALES = { small: '0.9', normal: '1', large: '1.12', xlarge: '1.25' };

// ── Load / Save ────────────────────────────────────────────────────
function load() {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(A11Y_KEY) || '{}') };
  } catch { return { ...DEFAULTS }; }
}
function save(settings) {
  localStorage.setItem(A11Y_KEY, JSON.stringify(settings));
}

// ── Apply settings to <html> ───────────────────────────────────────
function apply(settings) {
  const html = document.documentElement;

  // Font size
  html.style.setProperty('--a11y-font-scale', FONT_SCALES[settings.fontSize] || '1');

  // Motion
  html.classList.toggle('a11y-reduce-motion', settings.motion !== 'full');

  // Contrast
  html.classList.toggle('a11y-high-contrast', settings.contrast === 'high');

  // Focus ring
  html.classList.remove('a11y-no-focus', 'a11y-fat-focus');
  if (settings.focusRing === 'off') html.classList.add('a11y-no-focus');
  if (settings.focusRing === 'fat') html.classList.add('a11y-fat-focus');

  // Dyslexia font
  html.classList.toggle('a11y-dyslexia', settings.dyslexia);
}

// ── Panel HTML ─────────────────────────────────────────────────────
function buildPanel(settings) {
  const panel = document.createElement('div');
  panel.id = 'a11y-panel';
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-label', 'Accessibility settings');
  panel.innerHTML = `
    <button class="a11y-trigger" id="a11y-trigger" aria-expanded="false" aria-controls="a11y-controls" title="Accessibility settings">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/>
        <path d="M15.54 8.46a5 5 0 0 1 0 7.07M8.46 8.46a5 5 0 0 0 0 7.07"/>
      </svg>
    </button>
    <div class="a11y-controls" id="a11y-controls" aria-hidden="true">
      <div class="a11y-header">
        <span class="a11y-title">Accessibility</span>
        <button class="a11y-close" id="a11y-close" aria-label="Close accessibility panel">✕</button>
      </div>

      <!-- Font Size -->
      <div class="a11y-section">
        <div class="a11y-section-label">Text Size</div>
        <div class="a11y-btn-group" role="group" aria-label="Text size">
          <button class="a11y-btn ${settings.fontSize === 'small'  ? 'active' : ''}" data-font="small"  title="Small">A<sup>−</sup></button>
          <button class="a11y-btn ${settings.fontSize === 'normal' ? 'active' : ''}" data-font="normal" title="Normal">A</button>
          <button class="a11y-btn ${settings.fontSize === 'large'  ? 'active' : ''}" data-font="large"  title="Large">A<sup>+</sup></button>
          <button class="a11y-btn ${settings.fontSize === 'xlarge' ? 'active' : ''}" data-font="xlarge" title="Extra large" style="font-size:1.1em;">A⁺⁺</button>
        </div>
      </div>

      <!-- Motion -->
      <div class="a11y-section">
        <div class="a11y-section-label">Animations</div>
        <div class="a11y-btn-group" role="group" aria-label="Animation level">
          <button class="a11y-btn ${settings.motion === 'full'    ? 'active' : ''}" data-motion="full"    title="Full animations">Full</button>
          <button class="a11y-btn ${settings.motion === 'reduced' ? 'active' : ''}" data-motion="reduced" title="Reduced motion">Reduced</button>
          <button class="a11y-btn ${settings.motion === 'none'    ? 'active' : ''}" data-motion="none"    title="No animations">None</button>
        </div>
      </div>

      <!-- Contrast -->
      <div class="a11y-section">
        <div class="a11y-section-label">Contrast</div>
        <div class="a11y-btn-group" role="group" aria-label="Contrast level">
          <button class="a11y-btn ${settings.contrast === 'normal' ? 'active' : ''}" data-contrast="normal" title="Normal contrast">Normal</button>
          <button class="a11y-btn ${settings.contrast === 'high'   ? 'active' : ''}" data-contrast="high"   title="High contrast">High ✦</button>
        </div>
      </div>

      <!-- Focus Ring -->
      <div class="a11y-section">
        <div class="a11y-section-label">Focus Indicator</div>
        <div class="a11y-btn-group" role="group" aria-label="Focus ring style">
          <button class="a11y-btn ${settings.focusRing === 'normal' ? 'active' : ''}" data-focus="normal" title="Normal focus ring">Normal</button>
          <button class="a11y-btn ${settings.focusRing === 'fat'    ? 'active' : ''}" data-focus="fat"    title="Bold focus ring">Bold</button>
          <button class="a11y-btn ${settings.focusRing === 'off'    ? 'active' : ''}" data-focus="off"    title="Hide focus ring">Off</button>
        </div>
      </div>

      <!-- Dyslexia Font -->
      <div class="a11y-section">
        <label class="a11y-toggle-row">
          <div>
            <div class="a11y-section-label" style="margin-bottom:2px;">Dyslexia-Friendly Font</div>
            <div style="font-size:11px;color:var(--text-4);">Uses OpenDyslexic typeface</div>
          </div>
          <div class="a11y-toggle ${settings.dyslexia ? 'on' : ''}" id="a11y-dyslexia-toggle" role="switch" aria-checked="${settings.dyslexia}" tabindex="0">
            <div class="a11y-toggle-knob"></div>
          </div>
        </label>
      </div>

      <!-- Reset -->
      <button class="a11y-reset-btn" id="a11y-reset">Reset to defaults</button>
    </div>
  `;
  return panel;
}

// ── Styles ─────────────────────────────────────────────────────────
function injectStyles() {
  if (document.getElementById('a11y-styles')) return;
  const style = document.createElement('style');
  style.id = 'a11y-styles';
  style.textContent = `
    #a11y-panel {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: var(--z-a11y, 500);
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 12px;
    }
    .a11y-trigger {
      width: 48px; height: 48px;
      border-radius: 50%;
      background: rgba(10,10,24,0.9);
      border: 1px solid rgba(255,255,255,0.12);
      color: var(--text-2, #a8a8c4);
      cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 4px 20px rgba(0,0,0,0.5);
      backdrop-filter: blur(16px);
      transition: transform 0.2s, border-color 0.2s, color 0.2s;
    }
    .a11y-trigger:hover {
      transform: scale(1.1);
      border-color: rgba(0,201,167,0.4);
      color: var(--teal, #00c9a7);
    }
    .a11y-controls {
      background: rgba(10,10,22,0.97);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 20px;
      padding: 20px;
      width: 280px;
      box-shadow: 0 8px 40px rgba(0,0,0,0.7);
      backdrop-filter: blur(40px);
      transition: opacity 0.25s, transform 0.25s;
    }
    .a11y-controls[aria-hidden="true"] {
      opacity: 0; pointer-events: none; transform: translateY(10px) scale(0.97);
    }
    .a11y-controls[aria-hidden="false"] {
      opacity: 1; pointer-events: all; transform: none;
    }
    .a11y-header {
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: 16px;
    }
    .a11y-title { font-weight: 600; font-size: 14px; color: var(--text-1, #f2f2f8); }
    .a11y-close {
      background: none; border: none; color: var(--text-3, #686888);
      cursor: pointer; font-size: 14px; width: 24px; height: 24px;
      border-radius: 50%; display: flex; align-items: center; justify-content: center;
      transition: background 0.15s, color 0.15s;
    }
    .a11y-close:hover { background: rgba(255,255,255,0.08); color: var(--text-1, #f2f2f8); }
    .a11y-section { margin-bottom: 16px; }
    .a11y-section-label {
      font-size: 11px; font-weight: 600; text-transform: uppercase;
      letter-spacing: 0.08em; color: var(--text-4, #3e3e60);
      margin-bottom: 8px;
    }
    .a11y-btn-group { display: flex; gap: 6px; flex-wrap: wrap; }
    .a11y-btn {
      padding: 6px 12px;
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: var(--r-sm, 4px);
      color: var(--text-3, #686888);
      font-size: 12px; font-weight: 500; cursor: pointer;
      font-family: inherit;
      transition: all 0.15s;
    }
    .a11y-btn:hover { background: rgba(255,255,255,0.08); color: var(--text-1, #f2f2f8); }
    .a11y-btn.active {
      background: rgba(0,201,167,0.15);
      border-color: rgba(0,201,167,0.4);
      color: var(--teal, #00c9a7);
    }
    .a11y-toggle-row {
      display: flex; align-items: center; justify-content: space-between;
      cursor: pointer;
    }
    .a11y-toggle {
      width: 40px; height: 22px;
      background: rgba(255,255,255,0.08);
      border-radius: 999px;
      border: 1px solid rgba(255,255,255,0.1);
      position: relative; cursor: pointer;
      transition: background 0.25s;
    }
    .a11y-toggle.on { background: var(--teal, #00c9a7); border-color: var(--teal, #00c9a7); }
    .a11y-toggle-knob {
      position: absolute; top: 2px; left: 2px;
      width: 16px; height: 16px;
      border-radius: 50%; background: #fff;
      box-shadow: 0 1px 4px rgba(0,0,0,0.4);
      transition: transform 0.25s cubic-bezier(0.34,1.56,0.64,1);
    }
    .a11y-toggle.on .a11y-toggle-knob { transform: translateX(18px); }
    .a11y-reset-btn {
      width: 100%; padding: 8px;
      background: none; border: 1px solid rgba(255,255,255,0.06);
      border-radius: var(--r-sm, 4px); color: var(--text-4, #3e3e60);
      font-size: 11px; cursor: pointer; font-family: inherit;
      transition: all 0.15s; margin-top: 4px;
    }
    .a11y-reset-btn:hover { border-color: rgba(255,255,255,0.15); color: var(--text-2, #a8a8c4); }
    @media (max-width: 480px) {
      #a11y-panel { bottom: 16px; right: 16px; }
      .a11y-controls { width: calc(100vw - 32px); }
    }
  `;
  document.head.appendChild(style);
}

// ── Init ───────────────────────────────────────────────────────────
export function initAccessibility() {
  let settings = load();
  apply(settings);
  injectStyles();

  const panel = buildPanel(settings);
  document.body.appendChild(panel);

  const trigger   = document.getElementById('a11y-trigger');
  const controls  = document.getElementById('a11y-controls');
  const closeBtn  = document.getElementById('a11y-close');
  let isOpen = false;

  function togglePanel(open) {
    isOpen = open ?? !isOpen;
    controls.setAttribute('aria-hidden', !isOpen);
    trigger.setAttribute('aria-expanded', isOpen);
  }

  trigger.addEventListener('click', () => togglePanel());
  closeBtn.addEventListener('click', () => togglePanel(false));

  // Close on outside click
  document.addEventListener('click', (e) => {
    if (isOpen && !panel.contains(e.target)) togglePanel(false);
  });

  // Font size
  panel.querySelectorAll('[data-font]').forEach(btn => {
    btn.addEventListener('click', () => {
      settings.fontSize = btn.dataset.font;
      panel.querySelectorAll('[data-font]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      apply(settings);
      save(settings);
    });
  });

  // Motion
  panel.querySelectorAll('[data-motion]').forEach(btn => {
    btn.addEventListener('click', () => {
      settings.motion = btn.dataset.motion;
      panel.querySelectorAll('[data-motion]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      apply(settings);
      save(settings);
    });
  });

  // Contrast
  panel.querySelectorAll('[data-contrast]').forEach(btn => {
    btn.addEventListener('click', () => {
      settings.contrast = btn.dataset.contrast;
      panel.querySelectorAll('[data-contrast]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      apply(settings);
      save(settings);
    });
  });

  // Focus ring
  panel.querySelectorAll('[data-focus]').forEach(btn => {
    btn.addEventListener('click', () => {
      settings.focusRing = btn.dataset.focus;
      panel.querySelectorAll('[data-focus]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      apply(settings);
      save(settings);
    });
  });

  // Dyslexia toggle
  const dyslexiaToggle = document.getElementById('a11y-dyslexia-toggle');
  function handleDyslexia() {
    settings.dyslexia = !settings.dyslexia;
    dyslexiaToggle.classList.toggle('on', settings.dyslexia);
    dyslexiaToggle.setAttribute('aria-checked', settings.dyslexia);
    apply(settings);
    save(settings);
  }
  dyslexiaToggle.addEventListener('click', handleDyslexia);
  dyslexiaToggle.addEventListener('keydown', e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); handleDyslexia(); } });

  // Reset
  document.getElementById('a11y-reset').addEventListener('click', () => {
    settings = { ...DEFAULTS };
    save(settings);
    // Rebuild panel
    panel.remove();
    document.getElementById('a11y-styles')?.remove();
    initAccessibility();
  });
}

// Auto-init if not a module context
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAccessibility);
  } else {
    initAccessibility();
  }
}
