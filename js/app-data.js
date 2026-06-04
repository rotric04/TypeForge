/**
 * Shared app data helpers — profile, history, analytics, badges
 */
import API from './api.js';

export function displayName(user, profile) {
  const fromProfile = profile?.username || profile?.email?.split('@')[0];
  const fromClerk = user?.firstName || user?.name || user?.username;
  return fromProfile || fromClerk || 'Typist';
}

export async function loadProfileAndHistory() {
  let profile = {};
  let history = [];

  try {
    profile = await API.getUserProfile();
  } catch {
    profile = {
      xp: parseInt(localStorage.getItem('tf_xp') || '0', 10),
      level: parseInt(localStorage.getItem('tf_level') || '1', 10),
      total_sessions: parseInt(localStorage.getItem('tf_sessions') || '0', 10),
      best_wpm: 0,
      weak_keys: [],
    };
    try {
      const stats = JSON.parse(localStorage.getItem('tf_key_stats') || '{}');
      profile.weak_keys = Object.keys(stats)
        .filter((k) => k.trim())
        .sort((a, b) => (stats[b].misses || 0) - (stats[a].misses || 0))
        .slice(0, 5);
    } catch { /* ignore */ }
  }

  try {
    history = await API.getHistory(60, 0);
    if (!history?.length) {
      history = JSON.parse(localStorage.getItem('tf_session_history') || '[]');
    }
  } catch {
    history = JSON.parse(localStorage.getItem('tf_session_history') || '[]');
  }

  if (!profile.best_wpm && history.length) {
    profile.best_wpm = Math.max(...history.map((s) => s.wpm || 0));
  }

  return { profile, history };
}

export async function loadDashboardAnalytics() {
  try {
    return await API.getDashboardAnalytics();
  } catch {
    return null;
  }
}

export function xpToNextLevel(level, xp) {
  const lvl = Math.max(1, level || 1);
  const xpPrev = (lvl - 1) * 500;
  const xpNext = lvl * 500;
  const cap = xpNext - xpPrev;
  const inLevel = Math.max(0, (xp || 0) - xpPrev);
  return { cap, inLevel, pct: Math.min(100, cap > 0 ? (inLevel / cap) * 100 : 0) };
}

export function personalizeBadge(ach, name) {
  const short = (name || 'You').split(' ')[0];
  const copy = { ...ach };
  if (ach.id === 'first_session') {
    copy.name = `${short}'s First Flight`;
    copy.desc = `Welcome aboard, ${short}. Your journey starts with one session.`;
  } else if (ach.id === 'xp_500') {
    copy.desc = `${short}, you just crossed 500 XP. Momentum is real.`;
  } else if (ach.id === 'level_5') {
    copy.name = `${short} · Rising Star`;
  }
  return copy;
}

export const NEXT_BADGE_HINTS = [
  { id: 'first_session', icon: '🚀', name: 'First Flight', hint: 'Complete your first session' },
  { id: 'wpm_50', icon: '🔥', name: 'Half Century', hint: 'Hit 50 WPM in one run' },
  { id: 'acc_95', icon: '🎯', name: 'Sharp Eyes', hint: 'Reach 95% accuracy' },
  { id: 'sessions_10', icon: '🌱', name: 'Getting Started', hint: 'Finish 10 sessions' },
  { id: 'xp_500', icon: '✨', name: 'XP Spark', hint: 'Earn 500 total XP' },
];
