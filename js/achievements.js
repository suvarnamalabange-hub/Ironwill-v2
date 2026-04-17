// ============================================================
//  IRON WILL — ACHIEVEMENTS
//  Achievement vault logic & rendering
// ============================================================

import { state } from './state.js';
import { showToast } from './app.js';
import { habitStreakMax } from './habits.js';

export const ACHIEVEMENTS = [
  { id: 'day1',    icon: '🌅', name: 'First Dawn',      cond: s => s.totalClean >= 1 },
  { id: 'day3',    icon: '🔥', name: 'Ignition',        cond: s => s.curStreak >= 3 },
  { id: 'week1',   icon: '7️⃣', name: 'Week One',        cond: s => s.curStreak >= 7 },
  { id: 'week2',   icon: '🗓️', name: 'Fortnight',       cond: s => s.curStreak >= 14 },
  { id: 'month1',  icon: '🌙', name: 'Monk Month',      cond: s => s.curStreak >= 30 },
  { id: 'month2',  icon: '🔮', name: 'Deep Change',     cond: s => s.curStreak >= 60 },
  { id: 'month3',  icon: '💎', name: '90 Day Diamond',  cond: s => s.curStreak >= 90 },
  { id: 'year1',   icon: '👑', name: 'Ascended',        cond: s => s.curStreak >= 365 },
  { id: 'nourge',  icon: '🛡️', name: 'Urge Slayer',     cond: s => (s.urges || []).length >= 10 },
  { id: 'urge25',  icon: '💪', name: 'Urge Warrior',    cond: s => (s.urges || []).length >= 25 },
  { id: 'habit5',  icon: '⚡', name: 'Full Protocol',   cond: s => habitStreakMax() >= 5 },
  { id: 'habit14', icon: '🏆', name: 'Iron Protocol',   cond: s => habitStreakMax() >= 14 },
  { id: 'journal', icon: '📓', name: 'Self Aware',      cond: s => Object.keys(s.journals || {}).length >= 5 },
  { id: 'refl',    icon: '🔍', name: 'Analyst',         cond: s => Object.keys(s.reflections || {}).length >= 1 },
  { id: 'refl3',   icon: '🧩', name: 'Pattern Seeker',  cond: s => Object.keys(s.reflections || {}).length >= 3 },
  { id: 'oath',    icon: '⚔️', name: 'Oath Keeper',     cond: s => !!s.oath },
  { id: 'mood14',  icon: '😊', name: 'Self Monitor',    cond: s => Object.keys(s.moods || {}).length >= 14 },
  { id: 'xp500',   icon: '✨', name: 'XP Grinder',      cond: s => s.totalXP >= 500 },
  { id: 'xp2k',    icon: '🌟', name: 'XP Legend',       cond: s => s.totalXP >= 2000 },
  { id: 'clean20', icon: '🎯', name: '20 Clean',        cond: s => s.totalClean >= 20 },
];

export function checkAchievements() {
  if (!state.achievements) state.achievements = [];
  if (!state.newAch) state.newAch = [];

  let newlyUnlocked = false;

  ACHIEVEMENTS.forEach(a => {
    if (!state.achievements.includes(a.id) && a.cond(state)) {
      state.achievements.push(a.id);
      state.newAch.push(a.id);
      newlyUnlocked = true;
      showToast(`🏅 Achievement Unlocked: ${a.name}!`, 'ok');
    }
  });

  return newlyUnlocked;
}

export function renderAchievements() {
  const grid = document.getElementById('achGrid');
  if (!grid) return;

  grid.innerHTML = ACHIEVEMENTS.map(a => {
    const done = (state.achievements || []).includes(a.id);
    const isNew = (state.newAch || []).includes(a.id);
    return `<div class="ach-item ${done ? 'unlocked' : 'locked'}" title="${a.name}">
      ${isNew ? '<div class="ach-new"></div>' : ''}
      <span class="ach-ico">${a.icon}</span>
      <div class="ach-name">${a.name}</div>
    </div>`;
  }).join('');

  // Clear new badges after render
  if (state.newAch && state.newAch.length) {
    state.newAch = [];
  }
}
