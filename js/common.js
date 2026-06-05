/**
 * TypeForge AI — Common Utilities & Shared Logic
 * Upgraded with GSAP, ScrollTrigger, and Lenis for cinematic experience.
 */

// ── Smooth Scrolling (Lenis) ─────────────────────────────────────────────────
export async function initLenis() {
  const { default: Lenis } = await import('https://esm.sh/@studio-freight/lenis@1.0.29');

  const lenis = new Lenis({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    direction: 'vertical',
    gestureDirection: 'vertical',
    smooth: true,
    mouseMultiplier: 1,
    smoothTouch: false,
    touchMultiplier: 2,
    infinite: false,
  });

  function raf(time) {
    lenis.raf(time);
    requestAnimationFrame(raf);
  }
  requestAnimationFrame(raf);

  // Sync Lenis with GSAP ScrollTrigger
  try {
    const { default: ScrollTrigger } = await import('https://esm.sh/gsap@3.12.2/ScrollTrigger.js');
    const { default: gsap } = await import('https://esm.sh/gsap@3.12.2');
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => {
      lenis.raf(time * 1000);
    });
    gsap.ticker.lagSmoothing(0, 0);
  } catch (e) {
    console.warn("Lenis-GSAP sync failed:", e);
  }
}

// ── GSAP Scroll-based Reveal ────────────────────────────────────────────────
export async function initReveal() {
  const elements = document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-scale');
  if (!elements.length) return;
  
  const { default: gsap } = await import('https://esm.sh/gsap@3.12.2');
  const { default: ScrollTrigger } = await import('https://esm.sh/gsap@3.12.2/ScrollTrigger.js');
  
  gsap.registerPlugin(ScrollTrigger);
  
  elements.forEach((el) => {
    // Disable CSS transitions so GSAP can take full control without lag
    el.style.transition = 'none';
    
    const delay = parseInt(el.dataset.delay || 0) / 1000;
    let x = 0, y = 40, scale = 1;
    
    if (el.classList.contains('reveal-left')) { x = -60; y = 0; }
    else if (el.classList.contains('reveal-right')) { x = 60; y = 0; }
    else if (el.classList.contains('reveal-scale')) { y = 0; scale = 0.8; }
    
    gsap.set(el, { opacity: 0, x, y, scale });
    
    gsap.to(el, {
      scrollTrigger: {
        trigger: el,
        start: 'top 85%',
        toggleActions: 'play none none none'
      },
      opacity: 1,
      x: 0,
      y: 0,
      scale: 1,
      duration: 0.8,
      ease: 'power3.out',
      delay: delay
    });
  });
}

// ── Navbar Scroll Behavior ───────────────────────────────────────────────────
export function initNavbar() {
  const navbar = document.querySelector('.navbar');
  if (!navbar) return;
  const toggle = navbar.querySelector('.nav-hamburger');
  const drawer = document.querySelector('.nav-drawer');

  const onScroll = () => {
    navbar.classList.toggle('scrolled', window.scrollY > 20);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  if (toggle && drawer) {
    toggle.addEventListener('click', () => {
      toggle.classList.toggle('open');
      drawer.classList.toggle('open');
    });
    // Close on outside click
    document.addEventListener('click', (e) => {
      if (!navbar.contains(e.target) && !drawer.contains(e.target)) {
        toggle.classList.remove('open');
        drawer.classList.remove('open');
      }
    });
  }

  // Active link highlighting
  const links = document.querySelectorAll('.navbar-links a, .nav-drawer a');
  links.forEach(link => {
    if (link.href === window.location.href) link.classList.add('active');
  });
}

// ── Counter Animation ────────────────────────────────────────────────────────
export function animateCounter(el, from, to, duration = 2000, suffix = '') {
  const start = performance.now();
  const update = (time) => {
    const elapsed = time - start;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3); // ease-out-cubic
    const value = Math.round(from + (to - from) * eased);
    el.textContent = value.toLocaleString() + suffix;
    if (progress < 1) requestAnimationFrame(update);
  };
  requestAnimationFrame(update);
}

export function initCounters() {
  const counters = document.querySelectorAll('[data-counter]');
  if (!counters.length) return;
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const to = parseFloat(el.dataset.counter);
        const suffix = el.dataset.suffix || '';
        animateCounter(el, 0, to, 2200, suffix);
        observer.unobserve(el);
      }
    });
  }, { threshold: 0.5 });
  counters.forEach(el => observer.observe(el));
}

// ── Toast System ─────────────────────────────────────────────────────────────
let toastContainer = null;
function getToastContainer() {
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.className = 'toast-container';
    document.body.appendChild(toastContainer);
  }
  return toastContainer;
}

export function showToast({ title, desc = '', type = 'info', duration = 4000 }) {
  const icons = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };
  const container = getToastContainer();
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <div class="toast-icon">${icons[type] || icons.info}</div>
    <div class="toast-content">
      <div class="toast-title">${title}</div>
      ${desc ? `<div class="toast-desc">${desc}</div>` : ''}
    </div>
  `;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('exit');
    toast.addEventListener('animationend', () => toast.remove());
  }, duration);
}

// ── Modal System ─────────────────────────────────────────────────────────────
export function openModal(modalId) {
  const overlay = document.getElementById(modalId);
  if (!overlay) return;
  overlay.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  // Close on backdrop click
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal(modalId);
  }, { once: true });
}
export function closeModal(modalId) {
  const overlay = document.getElementById(modalId);
  if (!overlay) return;
  overlay.classList.add('hidden');
  document.body.style.overflow = '';
}

// ── Local Storage Helper ─────────────────────────────────────────────────────
export const storage = {
  get: (key, fallback = null) => {
    try { return JSON.parse(localStorage.getItem(`tf_${key}`)) ?? fallback; }
    catch { return fallback; }
  },
  set: (key, value) => {
    try { localStorage.setItem(`tf_${key}`, JSON.stringify(value)); }
    catch {}
  },
  remove: (key) => localStorage.removeItem(`tf_${key}`),
};

// ── XP Pop Animation ─────────────────────────────────────────────────────────
export function showXPPop(amount, x, y) {
  const el = document.createElement('div');
  el.className = 'xp-pop';
  el.textContent = `+${amount} XP`;
  el.style.left = `${x}px`;
  el.style.top  = `${y}px`;
  document.body.appendChild(el);
  el.addEventListener('animationend', () => el.remove());
}

// ── Clamp ────────────────────────────────────────────────────────────────────
export const clamp = (val, min, max) => Math.min(Math.max(val, min), max);

// ── Format Time ─────────────────────────────────────────────────────────────
export function formatTime(seconds) {
  if (seconds >= 60) return `${Math.floor(seconds/60)}m ${seconds%60}s`;
  return `${seconds}s`;
}

// ── Format WPM ──────────────────────────────────────────────────────────────
export function formatWPM(wpm) {
  if (wpm >= 150) return { label: 'Legendary', color: 'var(--gold)' };
  if (wpm >= 100) return { label: 'Expert',    color: 'var(--mint)' };
  if (wpm >= 70)  return { label: 'Advanced',  color: 'var(--brand-light)' };
  if (wpm >= 50)  return { label: 'Intermediate', color: 'var(--sky)' };
  return { label: 'Beginner', color: 'var(--text-2)' };
}

// ── Typing DNA Archetype Generator ──────────────────────────────────────────
export function getArchetype(stats) {
  const { wpm, accuracy, consistency, focusScore } = stats;
  if (wpm >= 120 && accuracy >= 98) return { name: 'Ghost Fingers',    icon: 'GHST.FING', desc: 'Speed and precision incarnate' };
  if (accuracy >= 99)               return { name: 'Precision Builder', icon: 'PRC.BUILD', desc: 'Every keystroke intentional' };
  if (wpm >= 100)                   return { name: 'Velocity Crafter',  icon: 'SPD.CRAFT', desc: 'Built for pure speed' };
  if (consistency >= 90)            return { name: 'Rhythm Seeker',     icon: 'RHY.SEEK',  desc: 'Steady, flowing cadence' };
  if (focusScore >= 85)             return { name: 'Code Monk',         icon: 'CODE.MONK', desc: 'Deep focus, zero distraction' };
  if (wpm >= 70)                    return { name: 'Typing Architect',  icon: 'TYP.ARCH',  desc: 'Building speed with care' };
  if (accuracy >= 95)               return { name: 'Syntax Hunter',     icon: 'SYNT.HNT',  desc: 'Hunting errors before they land' };
  return { name: 'Keyboard Wanderer', icon: 'KBD.WNDR', desc: 'Exploring the keys' };
}

// ── Canvas Chart Helpers ─────────────────────────────────────────────────────
export function drawLineChart(canvas, data, options = {}) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const { width, height } = canvas;
  const {
    color = '#7c6ff7',
    fillColor = 'rgba(124,111,247,0.1)',
    lineWidth = 2.5,
    showDots = true,
    dotColor = '#a99fff',
    dotRadius = 4,
    padding = 24,
    gridColor = 'rgba(255,255,255,0.04)',
    gridLines = 5,
  } = options;

  ctx.clearRect(0, 0, width, height);

  if (!data || data.length < 2) return;
  const min = Math.min(...data) * 0.9;
  const max = Math.max(...data) * 1.1;
  const range = max - min || 1;
  const plotW = width - padding * 2;
  const plotH = height - padding * 2;

  const xOf = (i) => padding + (i / (data.length - 1)) * plotW;
  const yOf = (v) => padding + plotH - ((v - min) / range) * plotH;

  // Grid lines
  ctx.strokeStyle = gridColor;
  ctx.lineWidth = 1;
  for (let i = 0; i <= gridLines; i++) {
    const y = padding + (i / gridLines) * plotH;
    ctx.beginPath(); ctx.moveTo(padding, y); ctx.lineTo(width - padding, y); ctx.stroke();
  }

  // Fill
  ctx.beginPath();
  ctx.moveTo(xOf(0), yOf(data[0]));
  for (let i = 1; i < data.length; i++) {
    const xc = (xOf(i - 1) + xOf(i)) / 2;
    ctx.bezierCurveTo(xc, yOf(data[i-1]), xc, yOf(data[i]), xOf(i), yOf(data[i]));
  }
  ctx.lineTo(xOf(data.length - 1), height - padding);
  ctx.lineTo(xOf(0), height - padding);
  ctx.closePath();
  ctx.fillStyle = fillColor;
  ctx.fill();

  // Line
  ctx.beginPath();
  ctx.moveTo(xOf(0), yOf(data[0]));
  for (let i = 1; i < data.length; i++) {
    const xc = (xOf(i - 1) + xOf(i)) / 2;
    ctx.bezierCurveTo(xc, yOf(data[i-1]), xc, yOf(data[i]), xOf(i), yOf(data[i]));
  }
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineJoin = 'round';
  ctx.stroke();

  // Dots
  if (showDots) {
    data.forEach((v, i) => {
      ctx.beginPath();
      ctx.arc(xOf(i), yOf(v), dotRadius, 0, Math.PI * 2);
      ctx.fillStyle = dotColor;
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });
  }
}

export function drawBarChart(canvas, data, labels, options = {}) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const { width, height } = canvas;
  const {
    barColor = 'rgba(124,111,247,0.6)',
    barColorHover = 'rgba(124,111,247,0.9)',
    padding = 24,
    gap = 6,
    labelColor = 'rgba(160,160,200,0.7)',
    fontSize = 10,
  } = options;

  ctx.clearRect(0, 0, width, height);
  if (!data || !data.length) return;

  const max = Math.max(...data) * 1.1 || 1;
  const plotH = height - padding * 2 - 20;
  const barW = (width - padding * 2 - gap * (data.length - 1)) / data.length;

  data.forEach((v, i) => {
    const x = padding + i * (barW + gap);
    const barH = (v / max) * plotH;
    const y = padding + plotH - barH;

    // Rounded top bar
    const r = Math.min(4, barW / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + barW - r, y);
    ctx.quadraticCurveTo(x + barW, y, x + barW, y + r);
    ctx.lineTo(x + barW, y + barH);
    ctx.lineTo(x, y + barH);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    ctx.fillStyle = barColor;
    ctx.fill();

    // Label
    if (labels && labels[i]) {
      ctx.fillStyle = labelColor;
      ctx.font = `${fontSize}px Inter, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(labels[i], x + barW / 2, height - 6);
    }
  });
}

// ── Circular Ring Progress ────────────────────────────────────────────────────
export function drawRing(svgEl, pct, color, bgColor = 'rgba(255,255,255,0.06)') {
  if (!svgEl) return;
  const r = 26;
  const circ = 2 * Math.PI * r;
  const dash = ((pct / 100) * circ).toFixed(2);
  svgEl.innerHTML = `
    <circle cx="30" cy="30" r="${r}" stroke="${bgColor}" stroke-width="4" fill="none"/>
    <circle cx="30" cy="30" r="${r}" stroke="${color}" stroke-width="4" fill="none"
      stroke-linecap="round"
      stroke-dasharray="${dash} ${circ}"
      style="transition: stroke-dasharray 1s cubic-bezier(0.16,1,0.3,1)"/>
  `;
}

// ── DPI-aware Canvas ─────────────────────────────────────────────────────────
export function initHiDPICanvas(canvas, w, h) {
  const dpr = window.devicePixelRatio || 1;
  canvas.width  = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width  = w + 'px';
  canvas.style.height = h + 'px';
  canvas.getContext('2d').scale(dpr, dpr);
}

// ── Debounce ─────────────────────────────────────────────────────────────────
export function debounce(fn, ms = 300) {
  let timer;
  return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), ms); };
}

// ── Page Transition ──────────────────────────────────────────────────────────
export function initPageTransition() {
  document.body.classList.add('animate-page-enter');
  
  // Clean up the animation class once done to remove transform rules.
  // This fixes containing block bugs that offset position: fixed elements on scroll.
  document.body.addEventListener('animationend', (e) => {
    if (e.animationName === 'page-enter') {
      document.body.classList.remove('animate-page-enter');
    }
  }, { once: true });

  document.querySelectorAll('a[href]').forEach(link => {
    const url = new URL(link.href, window.location.origin);
    if (url.origin !== window.location.origin) return;
    link.addEventListener('click', (e) => {
      // Allow modifier keys
      if (e.ctrlKey || e.metaKey || e.shiftKey) return;
      // Don't handle hash links or same-page links
      if (link.hash && url.pathname === window.location.pathname) return;
    });
  });
}

// ── Particles ────────────────────────────────────────────────────────────────
export function createParticle(x, y, color = 'var(--brand)') {
  const particle = document.createElement('div');
  particle.style.cssText = `
    position: fixed;
    left: ${x}px; top: ${y}px;
    width: 6px; height: 6px;
    border-radius: 50%;
    background: ${color};
    pointer-events: none;
    z-index: 9999;
    --dx: ${(Math.random() - 0.5) * 60}px;
    --dy: ${(Math.random() - 0.5) * 60}px;
    animation: particle-drift 0.8s ease-out forwards;
  `;
  document.body.appendChild(particle);
  particle.addEventListener('animationend', () => particle.remove());
}

// ── Cookie Consent Banner ───────────────────────────────────────────────────
export function initCookieConsent() {
  if (storage.get('cookie_consent')) return;

  setTimeout(() => {
    const banner = document.createElement('div');
    banner.className = 'cookie-banner';
    banner.innerHTML = `
      <div class="cookie-header">
        <span>🍪</span> Cookies & Analytics
      </div>
      <div class="cookie-body">
        We use lightweight keystroke telemetry cookies to analyze your typing DNA patterns and secure sessions. By using TypeForge, you agree to our policies.
      </div>
      <div class="cookie-actions">
        <button class="btn btn-primary btn-sm" id="cookie-accept-all" style="font-size: 12px; padding: 6px 14px;">Accept All</button>
        <button class="btn btn-outline btn-sm" id="cookie-essential" style="font-size: 12px; padding: 6px 14px; border-color: rgba(255,255,255,0.15);">Essential Only</button>
      </div>
    `;
    document.body.appendChild(banner);

    // Fade in
    requestAnimationFrame(() => banner.classList.add('visible'));

    const closeBanner = (consentType) => {
      storage.set('cookie_consent', consentType);
      banner.classList.remove('visible');
      banner.addEventListener('transitionend', () => banner.remove());
    };

    document.getElementById('cookie-accept-all')?.addEventListener('click', () => closeBanner('accepted'));
    document.getElementById('cookie-essential')?.addEventListener('click', () => closeBanner('essential'));
  }, 1500);
}

// ── Automated Motivational Tip Toast ─────────────────────────────────────────
export function initMotivationalPopup() {
  // Only show on main site, not inside active typing tests to avoid distraction
  if (window.location.pathname.includes('/app/typing')) return;

  const tips = [
    { title: "Wrist Position", desc: "Keep your wrists elevated! Resting them on the desk or a wrist rest can limit movement speed and cause fatigue.", icon: "WRST" },
    { title: "Did You Know?", desc: "The longest word typed using only the left hand on QWERTY is 'Stewardesses'. 'Skepticisms' is the longest for the right hand!", icon: "INFO" },
    { title: "Accuracy First", desc: "Speed is a byproduct of muscle memory and accuracy. Focus on slow, clean accuracy and speed will naturally follow.", icon: "ACCR" },
    { title: "Rhythm & Flow", desc: "Relax your shoulders and breathe. A steady rhythm is always faster and cleaner than bursts of fast typing followed by mistakes.", icon: "FLOW" },
    { title: "Layout History", desc: "The QWERTY layout was created in 1873 to prevent typewriter mechanical bars from jamming by separating common letter pairs.", icon: "HIST" },
    { title: "Typing Challenge", desc: "Try running a 1-minute test aiming for 100% accuracy. Go as slow as needed to build error-free memory paths!", icon: "GOAL" }
  ];

  setTimeout(() => {
    const selected = tips[Math.floor(Math.random() * tips.length)];
    const toast = document.createElement('div');
    toast.className = 'tip-toast';
    toast.innerHTML = `
      <div class="tip-icon">${selected.icon}</div>
      <div class="tip-content">
        <div class="tip-title">${selected.title}</div>
        <div class="tip-desc">${selected.desc}</div>
      </div>
      <div class="tip-close" id="tip-close-btn">&times;</div>
    `;
    document.body.appendChild(toast);

    // Slide in
    requestAnimationFrame(() => toast.classList.add('visible'));

    const dismissToast = () => {
      toast.classList.remove('visible');
      toast.addEventListener('transitionend', () => toast.remove());
    };

    document.getElementById('tip-close-btn')?.addEventListener('click', dismissToast);

    // Auto-dismiss after 8 seconds
    setTimeout(() => {
      if (toast.parentNode) dismissToast();
    }, 8000);
  }, 5000);
}

// ── Performance & Memory Management (PerformanceManager) ────────────────────
export const PerformanceManager = {
  activeObservers: [],
  
  /**
   * Initialize memory management, passive listeners, and lazy animations.
   */
  init() {
    this.setupPassiveScroll();
    this.setupAnimationSuspender();
    this.setupIdleGarbageCollector();
  },

  /**
   * Set up passive scroll listeners on window and document body.
   */
  setupPassiveScroll() {
    window.addEventListener('touchstart', () => {}, { passive: true });
    window.addEventListener('touchmove', () => {}, { passive: true });
  },

  /**
   * Observe heavy animated sections and pause CSS/JS animations when off-screen.
   */
  setupAnimationSuspender() {
    const targets = document.querySelectorAll(
      '.aurora-container, .keyboard-scene, .dna-card, .timeline, .features-grid, .badges-showcase'
    );
    if (!targets.length) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        const el = e.target;
        if (e.isIntersecting) {
          el.style.animationPlayState = 'running';
          el.querySelectorAll('*').forEach(child => {
            child.style.animationPlayState = 'running';
          });
        } else {
          el.style.animationPlayState = 'paused';
          el.querySelectorAll('*').forEach(child => {
            child.style.animationPlayState = 'paused';
          });
        }
      });
    }, { threshold: 0.05 });

    targets.forEach(t => {
      observer.observe(t);
      this.activeObservers.push({ observer, element: t });
    });
  },

  /**
   * Prunes cached data and detached DOM nodes periodically during idle times.
   */
  setupIdleGarbageCollector() {
    const gcInterval = 30000; // Run GC every 30 seconds
    const runGC = () => {
      // 1. Prune local typing caches if they exceed max capacity (e.g. typing session arrays)
      if (window.state && Array.isArray(window.state.keystrokeLog) && window.state.keystrokeLog.length > 500) {
        // Keep only the last 200 items in memory to free heap
        window.state.keystrokeLog = window.state.keystrokeLog.slice(-200);
      }
      
      // 2. Perform global DOM leak collection (search for orphan nodes or cleanup timers)
      const orphanCount = this.cleanupOrphans();
      if (orphanCount > 0) {
        console.debug(`[TypeForge GC] Cleared ${orphanCount} orphan elements.`);
      }
    };

    if ('requestIdleCallback' in window) {
      setInterval(() => {
        requestIdleCallback(runGC, { timeout: 2000 });
      }, gcInterval);
    } else {
      setInterval(runGC, gcInterval);
    }
  },

  /**
   * Find and destroy elements that were left in document.body but disconnected from key trees
   */
  cleanupOrphans() {
    let cleared = 0;
    // Find all temporary dynamic nodes that should have been self-removed
    document.querySelectorAll('.toast, .xp-pop, .particle').forEach(el => {
      // If they're not in transition and are invisible or stuck, remove them
      const style = window.getComputedStyle(el);
      if (style.opacity === '0' || el.classList.contains('exit') || style.display === 'none') {
        el.remove();
        cleared++;
      }
    });
    return cleared;
  }
};

// ── Init All ─────────────────────────────────────────────────────────────────
export function initCommon() {
  initLenis();
  initNavbar();
  initReveal();
  initCounters();
  initPageTransition();
  initCookieConsent();
  initMotivationalPopup();
  PerformanceManager.init();
}

// Auto-init if DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCommon);
} else {
  initCommon();
}
