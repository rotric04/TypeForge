/**
 * Lightweight motion — lazy-loads anime.js only when needed
 */
const REDUCED =
  window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
  document.documentElement.classList.contains('a11y-reduce-motion');

document.documentElement.classList.add('tf-js');

let animeLib = null;

async function getAnime() {
  if (REDUCED) return null;
  if (animeLib) return animeLib;
  if (window.anime) {
    animeLib = window.anime;
    return animeLib;
  }
  try {
    await new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/animejs/3.2.2/anime.min.js';
      s.async = true;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
    animeLib = window.anime;
    return animeLib;
  } catch {
    return null;
  }
}

export function initScrollReveal(root = document) {
  const nodes = root.querySelectorAll('.tf-reveal, .bento-item, .session-card');
  nodes.forEach((el) => el.classList.add('tf-reveal-pending'));

  const show = (el) => {
    el.classList.remove('tf-reveal-pending');
    el.classList.add('tf-reveal-visible');
  };

  if (REDUCED || typeof IntersectionObserver === 'undefined') {
    nodes.forEach(show);
    return;
  }

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          show(e.target);
          io.unobserve(e.target);
        }
      });
    },
    { threshold: 0.08, rootMargin: '40px' }
  );
  nodes.forEach((el) => io.observe(el));

  setTimeout(() => nodes.forEach(show), 1200);
}

export async function animateCounters(selector = '[data-counter]') {
  const els = document.querySelectorAll(selector);
  els.forEach((el) => {
    const end = parseFloat(el.dataset.counter || '0');
    const suffix = el.dataset.suffix || '';
    el.textContent = Math.round(end) + suffix;
  });

  const anime = await getAnime();
  if (!anime) return;

  els.forEach((el) => {
    const end = parseFloat(el.dataset.counter || '0');
    const suffix = el.dataset.suffix || '';
    anime({
      targets: el,
      innerHTML: [0, end],
      round: 1,
      duration: 1400,
      easing: 'easeOutExpo',
      update() {
        el.textContent = el.innerHTML + suffix;
      },
    });
  });
}

export async function animateChartLine(pathSelector) {
  const path = document.querySelector(pathSelector);
  if (!path || REDUCED) return;
  const anime = await getAnime();
  if (!anime) return;
  try {
    const length = path.getTotalLength();
    path.style.strokeDasharray = length;
    path.style.strokeDashoffset = length;
    anime({
      targets: path,
      strokeDashoffset: [length, 0],
      duration: 1600,
      easing: 'easeInOutQuart',
      delay: 200,
    });
  } catch { /* svg not ready */ }
}

export async function staggerHeatmap(selector = '.heatmap-cell') {
  const cells = document.querySelectorAll(selector);
  cells.forEach((c) => {
    c.style.opacity = '1';
  });
  const anime = await getAnime();
  if (!anime || REDUCED) return;
  anime({
    targets: cells,
    scale: [0.85, 1],
    opacity: [0.4, 1],
    delay: anime.stagger(8),
    duration: 400,
    easing: 'easeOutBack',
  });
}
