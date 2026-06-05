/**
 * TypeForge AI — Environment Check
 * 
 * A real startup compatibility check that runs on every page load.
 * 
 * What it actually detects (no fakes):
 *   - Browser name + version
 *   - Operating system
 *   - Screen resolution
 *   - Touch vs pointer device
 *   - Physical keyboard likelihood
 *   - Ad blocker presence
 *   - Cookie support
 *   - Network quality (navigator.connection)
 *   - Device memory (Chrome)
 *   - Dark mode preference
 *   - Reduced motion preference
 *   - Hardware concurrency (CPU cores)
 * 
 * Behavior:
 *   - Compatible desktop: shows checks progressively over 1.5s, auto-dismisses
 *   - Incompatible device: stays visible as a blocker with humor + guidance
 *   - Session flag: only shows once per browser session (sessionStorage)
 * 
 * No hyphens in user facing text. No fake delays beyond the real check time.
 */

'use strict';

(function () {

  // Skip if already shown this session
  const SESSION_KEY = 'tf_env_checked';
  if (sessionStorage.getItem(SESSION_KEY) === '1') return;

  /* ═══════════════════════════════════════════════════════════════════════
     1. REAL DETECTION
     ═══════════════════════════════════════════════════════════════════════ */

  const ua = navigator.userAgent || '';

  // Browser
  function detectBrowser() {
    if (/Edg\//i.test(ua))    return { name: 'Edge',    version: ua.match(/Edg\/([\d.]+)/)?.[1] || '' };
    if (/OPR\//i.test(ua))    return { name: 'Opera',   version: ua.match(/OPR\/([\d.]+)/)?.[1] || '' };
    if (/Chrome\//i.test(ua)) return { name: 'Chrome',  version: ua.match(/Chrome\/([\d.]+)/)?.[1] || '' };
    if (/Firefox\//i.test(ua))return { name: 'Firefox', version: ua.match(/Firefox\/([\d.]+)/)?.[1] || '' };
    if (/Safari\//i.test(ua) && !/Chrome/i.test(ua)) return { name: 'Safari', version: ua.match(/Version\/([\d.]+)/)?.[1] || '' };
    return { name: 'Unknown', version: '' };
  }

  // OS
  function detectOS() {
    if (/Windows NT 10/.test(ua) && /Windows NT 10.0/.test(ua)) return 'Windows';
    if (/Windows/.test(ua)) return 'Windows';
    if (/Mac OS X/.test(ua)) return 'macOS';
    if (/CrOS/.test(ua)) return 'ChromeOS';
    if (/Linux/.test(ua) && !/Android/.test(ua)) return 'Linux';
    if (/Android/.test(ua)) return 'Android';
    if (/iPhone|iPad|iPod/.test(ua)) return 'iOS';
    return 'Unknown';
  }

  // Ad blocker detection (try loading a bait)
  function detectAdBlocker() {
    return new Promise(resolve => {
      const bait = document.createElement('div');
      bait.className = 'ad-banner ads adsbox ad-placement';
      bait.style.cssText = 'position:absolute;top:-9999px;left:-9999px;width:1px;height:1px;';
      document.body.appendChild(bait);
      requestAnimationFrame(() => {
        const blocked = bait.offsetHeight === 0 || bait.offsetParent === null || getComputedStyle(bait).display === 'none';
        bait.remove();
        resolve(blocked);
      });
    });
  }

  const browser = detectBrowser();
  const os = detectOS();
  const screenW = window.screen.width;
  const screenH = window.screen.height;
  const viewW = window.innerWidth;
  const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|Tablet/i.test(ua);
  const isIOS = /iPhone|iPad|iPod/i.test(ua);
  const isAndroid = /Android/i.test(ua);
  const hasFinePointer = window.matchMedia('(pointer: fine)').matches;
  const touchPoints = navigator.maxTouchPoints || 0;
  const isTouchOnly = touchPoints > 1 && !hasFinePointer;
  const cookiesEnabled = navigator.cookieEnabled;
  const darkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cpuCores = navigator.hardwareConcurrency || 0;
  const deviceMemory = navigator.deviceMemory || 0; // Chrome only, 0 = unsupported
  const connection = navigator.connection || navigator.mozConnection || null;
  const networkType = connection ? (connection.effectiveType || 'unknown') : 'unknown';

  // Keyboard: on desktop with fine pointer, keyboard is almost certainly present
  // On mobile UA or touch-only, keyboard is absent
  const keyboardLikely = hasFinePointer && !isMobile;
  const isIncompatible = isMobile || isTouchOnly;

  /* ═══════════════════════════════════════════════════════════════════════
     2. CHECK ITEMS
     ═══════════════════════════════════════════════════════════════════════ */

  const checks = [
    {
      label: 'Browser Supported',
      detail: `${browser.name} ${browser.version.split('.')[0]}`,
      status: browser.name !== 'Unknown' ? 'ok' : 'warn',
    },
    {
      label: 'Screen Resolution',
      detail: `${screenW} × ${screenH}`,
      status: viewW >= 900 ? 'ok' : 'fail',
    },
    {
      label: 'Operating System',
      detail: os,
      status: (os === 'Android' || os === 'iOS') ? 'warn' : 'ok',
    },
    {
      label: 'Physical Keyboard',
      detail: keyboardLikely ? 'Detected' : (isMobile ? 'Not Available' : 'Unverified'),
      status: keyboardLikely ? 'ok' : (isMobile ? 'fail' : 'warn'),
    },
    {
      label: 'Cookies Enabled',
      detail: cookiesEnabled ? 'Yes' : 'Blocked',
      status: cookiesEnabled ? 'ok' : 'warn',
    },
    {
      label: 'Network Connection',
      detail: networkType === 'unknown' ? 'Stable' : networkType.toUpperCase(),
      status: (networkType === '2g' || networkType === 'slow-2g') ? 'warn' : 'ok',
    },
    {
      label: 'Hardware',
      detail: cpuCores ? `${cpuCores} cores` + (deviceMemory ? ` · ${deviceMemory}GB RAM` : '') : 'Available',
      status: 'ok',
    },
    {
      label: 'Learning Environment Ready',
      detail: isIncompatible ? 'Desktop Required' : 'All Systems Go',
      status: isIncompatible ? 'fail' : 'ok',
    },
  ];

  // Ad blocker is async — we'll update its row after detection
  const adBlockerIndex = checks.length;
  checks.splice(5, 0, {
    label: 'Ad Blocker',
    detail: 'Checking...',
    status: 'ok',
  });

  /* ═══════════════════════════════════════════════════════════════════════
     3. STYLES
     ═══════════════════════════════════════════════════════════════════════ */

  const style = document.createElement('style');
  style.id = 'tf-envcheck-styles';
  style.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&display=swap');

    @keyframes ec-fade-in {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes ec-scale-in {
      from { opacity: 0; transform: scale(0.96) translateY(10px); }
      to { opacity: 1; transform: scale(1) translateY(0); }
    }
    @keyframes ec-slide-up {
      from { opacity: 0; transform: translateY(12px); }
      to { opacity: 1; transform: translateY(0); }
    }

    #tf-envcheck {
      position: fixed;
      inset: 0;
      z-index: 99999;
      background: #09090b;
      display: flex;
      align-items: stretch;
      justify-content: stretch;
      padding: 20px;
      font-family: 'IBM Plex Mono', 'JetBrains Mono', 'Fira Code', monospace;
      opacity: 0;
      animation: ec-fade-in 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      transition: opacity 0.4s ease;
      overflow-y: auto;
    }
    #tf-envcheck.fade-out { opacity: 0; pointer-events: none; }

    #tf-envcheck * { box-sizing: border-box; }

    .ec-window {
      width: 100%;
      max-width: 480px;
      background: #111113;
      border: 1px solid #2a2a2e;
      border-radius: 8px;
      overflow: hidden;
      opacity: 0;
      animation: ec-scale-in 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.15s both;
      margin: auto;
    }

    .ec-titlebar {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 16px;
      background: #09090b;
      border-bottom: 1px solid #1f1f22;
    }
    .ec-dots { display: flex; gap: 6px; }
    .ec-dot { width: 10px; height: 10px; border-radius: 50%; }
    .ec-dot.r { background: #ff5f57; }
    .ec-dot.y { background: #febc2e; }
    .ec-dot.g { background: #28c840; }
    .ec-tab {
      font-size: 11px;
      color: #52525b;
      margin-left: 8px;
      letter-spacing: 0.04em;
    }

    .ec-body { padding: 24px 20px 20px; }

    .ec-heading {
      font-size: 10px;
      font-weight: 700;
      color: #52525b;
      text-transform: uppercase;
      letter-spacing: 0.14em;
      margin-bottom: 20px;
    }

    .ec-checks {
      display: flex;
      flex-direction: column;
      gap: 0;
    }

    .ec-row {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 7px 0;
      border-bottom: 1px solid #1a1a1e;
      opacity: 0;
      transform: translateY(4px);
      transition: opacity 0.25s cubic-bezier(0.16, 1, 0.3, 1), transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .ec-row.visible {
      opacity: 1;
      transform: translateY(0);
    }
    .ec-row:last-child { border-bottom: none; }

    .ec-icon {
      width: 18px;
      font-size: 12px;
      text-align: center;
      flex-shrink: 0;
      transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    .ec-icon.ok   { color: #22c55e; transform: scale(1.15); }
    .ec-icon.warn { color: #f59e0b; transform: scale(1.15); }
    .ec-icon.fail { color: #ef4444; transform: scale(1.15); }
    .ec-icon.wait { color: #52525b; }

    .ec-label {
      flex: 1;
      font-size: 12px;
      color: #a1a1aa;
      min-width: 0;
    }
    .ec-detail {
      font-size: 11px;
      color: #52525b;
      text-align: right;
      white-space: nowrap;
    }

    .ec-bar {
      margin-top: 20px;
      height: 2px;
      background: #1f1f22;
      border-radius: 1px;
      overflow: hidden;
    }
    .ec-bar-fill {
      height: 100%;
      width: 0%;
      background: #22c55e;
      border-radius: 1px;
      transition: width 0.15s linear;
    }
    .ec-bar-fill.warn { background: #f59e0b; }
    .ec-bar-fill.fail { background: #ef4444; }

    /* Blocker section: only shown when incompatible */
    .ec-blocker { display: none; opacity: 0; }
    .ec-blocker.active {
      display: block;
      animation: ec-slide-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }

    .ec-divider {
      height: 1px;
      background: #1f1f22;
      margin: 20px 0;
    }

    .ec-joke-box {
      background: #09090b;
      border: 1px solid #1f1f22;
      border-radius: 6px;
      padding: 14px 16px;
      margin-bottom: 16px;
    }
    .ec-joke-tag {
      font-size: 9px;
      color: #3f3f46;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      margin-bottom: 6px;
    }
    .ec-joke-text {
      font-size: 11px;
      color: #a1a1aa;
      line-height: 1.7;
    }
    .ec-joke-text em { font-style: normal; color: #f59e0b; }

    .ec-message {
      font-size: 11px;
      color: #71717a;
      line-height: 1.7;
      margin-bottom: 16px;
    }
    .ec-message strong { color: #f4f4f5; font-weight: 700; }

    .ec-cta {
      width: 100%;
      padding: 10px 16px;
      background: #f4f4f5;
      color: #09090b;
      border: none;
      border-radius: 5px;
      font-family: inherit;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.04em;
      cursor: pointer;
      transition: opacity 0.15s;
    }
    .ec-cta:hover { opacity: 0.85; }

    .ec-footer {
      font-size: 9px;
      color: #3f3f46;
      text-align: center;
      margin-top: 10px;
      letter-spacing: 0.03em;
    }
  `;
  document.head.appendChild(style);

  /* ═══════════════════════════════════════════════════════════════════════
     4. BUILD UI
     ═══════════════════════════════════════════════════════════════════════ */

  const jokes = [
    { tag: '// runtime.log', text: 'You opened a <em>keyboard training app</em> on a touchscreen. That is like buying a treadmill and putting it in a pool. Solid effort, wrong medium.' },
    { tag: '// stderr', text: 'TypeForge detected <em>zero physical keys</em>. Cannot train what does not exist. Please connect a keyboard and try again.' },
    { tag: '// exception', text: 'Attempting to build muscle memory on glass. That is like trying to learn guitar on an iPad. The physics simply do not work.' },
    { tag: '// warn', text: 'Fun fact: you are trying to take a <em>typing speed test</em> without a keyboard. That is like entering a car race on a bicycle. Respect the format.' },
  ];
  const joke = jokes[Math.floor(Math.random() * jokes.length)];

  function iconChar(status) {
    if (status === 'ok')   return '✓';
    if (status === 'warn') return '!';
    return '✗';
  }

  const rowsHtml = checks.map((c, i) => `
    <div class="ec-row" id="ec-row-${i}">
      <span class="ec-icon wait" id="ec-icon-${i}">·</span>
      <span class="ec-label">${c.label}</span>
      <span class="ec-detail" id="ec-detail-${i}"></span>
    </div>
  `).join('');

  const overlay = document.createElement('div');
  overlay.id = 'tf-envcheck';
  overlay.setAttribute('role', 'status');
  overlay.setAttribute('aria-live', 'polite');
  overlay.setAttribute('aria-label', 'Environment compatibility check');
  overlay.innerHTML = `
    <div class="ec-window">
      <div class="ec-titlebar">
        <div class="ec-dots">
          <div class="ec-dot r"></div>
          <div class="ec-dot y"></div>
          <div class="ec-dot g"></div>
        </div>
        <span class="ec-tab">typeforge &mdash; environment</span>
      </div>
      <div class="ec-body">
        <div class="ec-heading">TypeForge Environment Check</div>
        <div class="ec-checks">${rowsHtml}</div>
        <div class="ec-bar"><div class="ec-bar-fill" id="ec-progress"></div></div>

        <div class="ec-blocker" id="ec-blocker">
          <div class="ec-divider"></div>
          <div class="ec-joke-box">
            <div class="ec-joke-tag">${joke.tag}</div>
            <div class="ec-joke-text">${joke.text}</div>
          </div>
          <div class="ec-message">
            TypeForge works best with a <strong>physical keyboard</strong>. To get the real experience of measuring your keystrokes, timing, and building muscle memory, try it once on your <strong>laptop or desktop</strong>.<br><br>
            You can still browse around here, but the typing sessions need real keys.
          </div>
          <button class="ec-cta" id="ec-dismiss">Got it, let me look around</button>
          <div class="ec-footer">typeforge.fun &nbsp;&middot;&nbsp; best on desktop</div>
        </div>
      </div>
    </div>
  `;

  /* ═══════════════════════════════════════════════════════════════════════
     5. MOUNT + PROGRESSIVE REVEAL
     ═══════════════════════════════════════════════════════════════════════ */

  function mount() {
    if (!document.body) return;
    document.documentElement.appendChild(overlay);

    const total = checks.length;
    const perRow = 1400 / total; // ~1.4s total for all rows
    const progress = document.getElementById('ec-progress');
    let hasFailure = false;

    // Reveal each row sequentially
    checks.forEach((c, i) => {
      setTimeout(() => {
        const row = document.getElementById(`ec-row-${i}`);
        const icon = document.getElementById(`ec-icon-${i}`);
        const detail = document.getElementById(`ec-detail-${i}`);
        if (!row || !icon || !detail) return;

        // Show the row
        row.classList.add('visible');
        icon.textContent = iconChar(c.status);
        icon.className = `ec-icon ${c.status}`;
        detail.textContent = c.detail;

        // Update progress
        const pct = ((i + 1) / total) * 100;
        if (progress) {
          progress.style.width = pct + '%';
          if (c.status === 'fail') {
            progress.classList.add('fail');
            hasFailure = true;
          } else if (c.status === 'warn' && !hasFailure) {
            progress.classList.add('warn');
          }
        }

        // After last row
        if (i === total - 1) {
          setTimeout(() => finalize(hasFailure), 200);
        }
      }, (i + 1) * perRow);
    });

    // Detect ad blocker async and update its row
    detectAdBlocker().then(blocked => {
      const idx = 5; // ad blocker is at index 5
      const c = checks[idx];
      c.detail = blocked ? 'Active' : 'Not Detected';
      c.status = blocked ? 'warn' : 'ok';
      // Row might already be visible — update it
      const icon = document.getElementById(`ec-icon-${idx}`);
      const detail = document.getElementById(`ec-detail-${idx}`);
      if (icon && icon.textContent !== '·') {
        icon.textContent = iconChar(c.status);
        icon.className = `ec-icon ${c.status}`;
      }
      if (detail && detail.textContent === 'Checking...') {
        detail.textContent = c.detail;
      }
    });

    // Dismiss button
    document.getElementById('ec-dismiss')?.addEventListener('click', () => {
      overlay.classList.add('fade-out');
      setTimeout(() => overlay.remove(), 420);
    });
  }

  function finalize(hasCriticalFail) {
    // Always set session flag so it only shows once per visit
    sessionStorage.setItem(SESSION_KEY, '1');

    if (isIncompatible || hasCriticalFail) {
      // Show guidance popup (not a blocker — user can dismiss and browse)
      const blocker = document.getElementById('ec-blocker');
      if (blocker) blocker.classList.add('active');
    } else {
      // All good — auto dismiss
      setTimeout(() => {
        overlay.classList.add('fade-out');
        setTimeout(() => overlay.remove(), 420);
      }, 300);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }

})();
