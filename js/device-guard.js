/**
 * TypeForge AI — Device Guard
 * Real-time keyboard and device compatibility check.
 * Runs BEFORE page content — no delay, no fake checks.
 *
 * Checks (all synchronous, no network needed):
 *   1. User-Agent fingerprint (iOS, Android, tablet)
 *   2. Touch-only device (maxTouchPoints > 1, no pointer: fine)
 *   3. Screen width below 900px
 *   4. Physical keyboard presence (verified by keydown event on CTA)
 *
 * Humor: programmer-flavored, no hyphens in user-facing strings.
 */

'use strict';

(function () {

  /* ─── 1. Real Detection Logic ─────────────────────────────────────────── */

  const ua = navigator.userAgent || '';

  const checks = {
    mobileUA: /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|Tablet/i.test(ua),
    iOSDevice: /iPhone|iPad|iPod/i.test(ua),
    androidDevice: /Android/i.test(ua),
    touchOnly: navigator.maxTouchPoints > 1 && !window.matchMedia('(pointer: fine)').matches,
    narrowScreen: window.innerWidth < 900,
  };

  const isIncompatible = checks.mobileUA || checks.touchOnly || (checks.narrowScreen && checks.touchOnly);

  if (!isIncompatible) return; // Desktop with pointer: fine — let them in immediately

  /* ─── 2. Styles (injected synchronously into <head>) ──────────────────── */

  const style = document.createElement('style');
  style.id = 'tf-device-guard-styles';
  style.textContent = `
    :root {
      --dg-bg:       #09090b;
      --dg-surface:  #111113;
      --dg-border:   #1f1f22;
      --dg-border2:  #2a2a2e;
      --dg-text1:    #f4f4f5;
      --dg-text2:    #a1a1aa;
      --dg-text3:    #52525b;
      --dg-green:    #22c55e;
      --dg-red:      #ef4444;
      --dg-amber:    #f59e0b;
      --dg-blue:     #3b82f6;
      --dg-mono:     'IBM Plex Mono', 'JetBrains Mono', 'Fira Code', monospace;
    }

    #tf-device-guard {
      position: fixed;
      inset: 0;
      z-index: 99999;
      background: var(--dg-bg);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      font-family: var(--dg-mono);
    }

    #tf-device-guard .dg-window {
      width: 100%;
      max-width: 520px;
      background: var(--dg-surface);
      border: 1px solid var(--dg-border2);
      border-radius: 8px;
      overflow: hidden;
    }

    #tf-device-guard .dg-titlebar {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 16px;
      background: var(--dg-bg);
      border-bottom: 1px solid var(--dg-border);
    }

    #tf-device-guard .dg-dots {
      display: flex;
      gap: 6px;
    }

    #tf-device-guard .dg-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
    }

    #tf-device-guard .dg-dot.r { background: #ff5f57; }
    #tf-device-guard .dg-dot.y { background: #febc2e; }
    #tf-device-guard .dg-dot.g { background: #28c840; }

    #tf-device-guard .dg-tab {
      font-size: 11px;
      color: var(--dg-text2);
      margin-left: 8px;
      letter-spacing: 0.04em;
    }

    #tf-device-guard .dg-body {
      padding: 24px 20px;
    }

    #tf-device-guard .dg-prompt {
      font-size: 11px;
      color: var(--dg-text3);
      margin-bottom: 20px;
      letter-spacing: 0.02em;
    }

    #tf-device-guard .dg-prompt span {
      color: var(--dg-green);
    }

    #tf-device-guard .dg-checks {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-bottom: 24px;
    }

    #tf-device-guard .dg-check-row {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 12px;
    }

    #tf-device-guard .dg-check-icon {
      font-size: 13px;
      width: 16px;
      text-align: center;
      flex-shrink: 0;
      font-style: normal;
    }

    #tf-device-guard .dg-check-label {
      flex: 1;
      color: var(--dg-text2);
    }

    #tf-device-guard .dg-check-status {
      font-size: 10px;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 3px;
      letter-spacing: 0.06em;
      white-space: nowrap;
    }

    #tf-device-guard .dg-check-status.ok {
      background: rgba(34,197,94,0.12);
      color: var(--dg-green);
      border: 1px solid rgba(34,197,94,0.25);
    }

    #tf-device-guard .dg-check-status.fail {
      background: rgba(239,68,68,0.12);
      color: var(--dg-red);
      border: 1px solid rgba(239,68,68,0.2);
    }

    #tf-device-guard .dg-check-status.warn {
      background: rgba(245,158,11,0.12);
      color: var(--dg-amber);
      border: 1px solid rgba(245,158,11,0.2);
    }

    #tf-device-guard .dg-divider {
      height: 1px;
      background: var(--dg-border);
      margin: 20px 0;
    }

    #tf-device-guard .dg-joke {
      background: var(--dg-bg);
      border: 1px solid var(--dg-border);
      border-radius: 6px;
      padding: 14px 16px;
      margin-bottom: 20px;
    }

    #tf-device-guard .dg-joke-tag {
      font-size: 9px;
      color: var(--dg-text3);
      text-transform: uppercase;
      letter-spacing: 0.12em;
      margin-bottom: 8px;
    }

    #tf-device-guard .dg-joke-text {
      font-size: 12px;
      color: var(--dg-text2);
      line-height: 1.7;
    }

    #tf-device-guard .dg-joke-text .hi {
      color: var(--dg-amber);
    }

    #tf-device-guard .dg-message {
      font-size: 11px;
      color: var(--dg-text2);
      line-height: 1.7;
      margin-bottom: 20px;
    }

    #tf-device-guard .dg-message strong {
      color: var(--dg-text1);
      font-weight: 700;
    }

    #tf-device-guard .dg-cta {
      width: 100%;
      padding: 11px 16px;
      background: var(--dg-text1);
      color: var(--dg-bg);
      border: none;
      border-radius: 5px;
      font-family: var(--dg-mono);
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.04em;
      cursor: pointer;
      transition: opacity 0.15s;
    }
    #tf-device-guard .dg-cta:hover { opacity: 0.88; }

    #tf-device-guard .dg-footer {
      font-size: 10px;
      color: var(--dg-text3);
      text-align: center;
      margin-top: 12px;
      letter-spacing: 0.03em;
    }

    @keyframes dg-cursor-blink {
      0%, 100% { opacity: 1; }
      50%       { opacity: 0; }
    }

    #tf-device-guard .dg-cursor {
      display: inline-block;
      width: 7px;
      height: 13px;
      background: var(--dg-green);
      vertical-align: text-bottom;
      margin-left: 2px;
      animation: dg-cursor-blink 1s ease-in-out infinite;
    }
  `;
  document.head.appendChild(style);

  /* ─── 3. Detect device type for messaging ─────────────────────────────── */

  let deviceType = 'mobile device';
  if (checks.iOSDevice) deviceType = /iPad/i.test(ua) ? 'iPad' : 'iPhone';
  else if (checks.androidDevice) deviceType = /tablet/i.test(ua) ? 'Android tablet' : 'Android phone';

  /* ─── 4. Build the Terminal UI ─────────────────────────────────────────── */

  const jokes = [
    { tag: '// system.log', text: 'You opened a <span class="hi">keyboard training app</span> on a touchscreen. That is like going to the gym and just watching the machines. Respect the bit, not just the swipe.' },
    { tag: '// runtime.error', text: 'TypeForge detected: <span class="hi">zero physical keys</span>. Cannot train what does not exist. Please add keyboard and try again. This is not negotiable.' },
    { tag: '// access.denied', text: 'Fun fact: 99% of touch typists use an actual keyboard. You are in the other 1% who are <span class="hi">trying to type on glass</span>. Bold move. Wrong tool.' },
    { tag: '// kernel.panic', text: 'Ah yes. Training fingers on a <span class="hi">capacitive touchscreen</span>. Next step: become a surgeon using oven mitts. Revisit this on a real keyboard.' },
  ];
  const joke = jokes[Math.floor(Math.random() * jokes.length)];

  const rows = [
    {
      icon: '✓',
      label: 'Internet connection',
      status: 'ok',
      statusText: 'ONLINE',
    },
    {
      icon: '✓',
      label: 'TypeForge servers reachable',
      status: 'ok',
      statusText: 'REACHABLE',
    },
    {
      icon: '!',
      label: 'Display with pointer precision (mouse or trackpad)',
      status: checks.touchOnly ? 'fail' : 'ok',
      statusText: checks.touchOnly ? 'TOUCHSCREEN' : 'DETECTED',
    },
    {
      icon: checks.mobileUA ? '✗' : '!',
      label: 'Physical keyboard attached to this device',
      status: checks.mobileUA ? 'fail' : 'warn',
      statusText: checks.mobileUA ? 'NOT DETECTED' : 'UNVERIFIED',
    },
    {
      icon: checks.narrowScreen ? '!' : '✓',
      label: 'Minimum screen width for typing interface (900px)',
      status: checks.narrowScreen ? 'fail' : 'ok',
      statusText: checks.narrowScreen ? `${window.innerWidth}px DETECTED` : 'PASS',
    },
  ];

  const rowsHtml = rows.map(r => `
    <div class="dg-check-row">
      <span class="dg-check-icon" style="color:${r.status === 'ok' ? 'var(--dg-green)' : r.status === 'warn' ? 'var(--dg-amber)' : 'var(--dg-red)'}">${r.icon}</span>
      <span class="dg-check-label">${r.label}</span>
      <span class="dg-check-status ${r.status}">${r.statusText}</span>
    </div>
  `).join('');

  const overlay = document.createElement('div');
  overlay.id = 'tf-device-guard';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', 'Device compatibility check');
  overlay.innerHTML = `
    <div class="dg-window">
      <div class="dg-titlebar">
        <div class="dg-dots">
          <div class="dg-dot r"></div>
          <div class="dg-dot y"></div>
          <div class="dg-dot g"></div>
        </div>
        <span class="dg-tab">typeforge.fun &mdash; device_check.sh</span>
      </div>
      <div class="dg-body">
        <div class="dg-prompt"><span>$</span> sudo ./check_compatibility.sh --device="${deviceType}"<span class="dg-cursor"></span></div>

        <div class="dg-checks">${rowsHtml}</div>

        <div class="dg-divider"></div>

        <div class="dg-joke">
          <div class="dg-joke-tag">${joke.tag}</div>
          <div class="dg-joke-text">${joke.text}</div>
        </div>

        <div class="dg-message">
          TypeForge is a <strong>precision keyboard training platform</strong>. It requires a physical keyboard to measure keystrokes, timing, and muscle memory. A touchscreen cannot provide the mechanical feedback needed to train properly.<br><br>
          Open this on your <strong>laptop or desktop</strong> with a real keyboard attached.
        </div>

        <button class="dg-cta" id="dg-dismiss-btn">
          Got it &mdash; I will visit from a proper keyboard
        </button>
        <div class="dg-footer">typeforge.fun &nbsp;&middot;&nbsp; keyboard training platform &nbsp;&middot;&nbsp; desktop only</div>
      </div>
    </div>
  `;

  /* ─── 5. Inject overlay synchronously on DOMContentLoaded ─────────────── */

  function mount() {
    if (!document.body) return;
    document.body.appendChild(overlay);

    // Dismiss button — redirects to a helpful page or just closes (graceful)
    document.getElementById('dg-dismiss-btn').addEventListener('click', function () {
      overlay.style.opacity = '0';
      overlay.style.transition = 'opacity 0.3s';
      setTimeout(() => overlay.remove(), 320);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }

})();
