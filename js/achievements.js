// ============================================================
//  IRON WILL — ACHIEVEMENTS v3
//  Achievement vault with categories & expanded milestones
// ============================================================

import { state } from './state.js';
import { showToast } from './toast.js';
import { habitStreakMax } from './habits.js';

export const ACHIEVEMENTS = [
  // Discipline (Streaks)
  { id: 'day1',    icon: '🌅', name: 'First Dawn',      cat: 'discipline', cond: s => s.totalClean >= 1 },
  { id: 'day3',    icon: '🔥', name: 'Ignition',        cat: 'discipline', cond: s => s.curStreak >= 3 },
  { id: 'week1',   icon: '7️⃣', name: 'Week One',        cat: 'discipline', cond: s => s.curStreak >= 7 },
  { id: 'week2',   icon: '🗓️', name: 'Fortnight',       cat: 'discipline', cond: s => s.curStreak >= 14 },
  { id: 'month1',  icon: '🌙', name: 'Monk Month',      cat: 'discipline', cond: s => s.curStreak >= 30 },
  { id: 'month2',  icon: '🔮', name: 'Deep Change',     cat: 'discipline', cond: s => s.curStreak >= 60 },
  { id: 'month3',  icon: '💎', name: '90 Day Diamond',  cat: 'discipline', cond: s => s.curStreak >= 90 },
  { id: 'year1',   icon: '👑', name: 'Ascended',        cat: 'discipline', cond: s => s.curStreak >= 365 },
  
  // Resistance (Urges)
  { id: 'nourge',  icon: '🛡️', name: 'Urge Slayer',     cat: 'resistance', cond: s => (s.urges || []).length >= 10 },
  { id: 'urge25',  icon: '💪', name: 'Urge Warrior',    cat: 'resistance', cond: s => (s.urges || []).length >= 25 },
  { id: 'urge100', icon: '☄️', name: 'The Unstoppable', cat: 'resistance', cond: s => (s.urges || []).length >= 100 },
  
  // Consistency (Habits)
  { id: 'habit5',  icon: '⚡', name: 'Full Protocol',   cat: 'consistency', cond: s => habitStreakMax() >= 5 },
  { id: 'habit14', icon: '🏆', name: 'Iron Protocol',   cat: 'consistency', cond: s => habitStreakMax() >= 14 },
  { id: 'habit30', icon: '🏵️', name: 'Atomic Power',    cat: 'consistency', cond: s => habitStreakMax() >= 30 },
  
  // Mindfulness (Journal/Reflection)
  { id: 'journal', icon: '📓', name: 'Self Aware',      cat: 'mindfulness', cond: s => Object.keys(s.journals || {}).length >= 5 },
  { id: 'journal50', icon: '📜', name: 'Philosopher',   cat: 'mindfulness', cond: s => Object.keys(s.journals || {}).length >= 50 },
  { id: 'refl',    icon: '🔍', name: 'Analyst',         cat: 'mindfulness', cond: s => Object.keys(s.reflections || {}).length >= 1 },
  { id: 'refl10',  icon: '🧩', name: 'Master Mind',     cat: 'mindfulness', cond: s => Object.keys(s.reflections || {}).length >= 10 },
  { id: 'oath',    icon: '⚔️', name: 'Oath Keeper',     cat: 'mindfulness', cond: s => !!s.oath },
  { id: 'mood30',  icon: '😊', name: 'Inner Peace',     cat: 'mindfulness', cond: s => Object.keys(s.moods || {}).length >= 30 },

  // Growth (XP/Focus)
  { id: 'xp500',   icon: '✨', name: 'XP Grinder',      cat: 'growth', cond: s => s.totalXP >= 500 },
  { id: 'xp2k',    icon: '🌟', name: 'XP Legend',       cat: 'growth', cond: s => s.totalXP >= 2000 },
  { id: 'xp10k',   icon: '🌌', name: 'Titan of Will',   cat: 'growth', cond: s => s.totalXP >= 10000 },
  { id: 'focus1',  icon: '🎯', name: 'Deep Work',       cat: 'growth', cond: s => (s.focusSessions || []).length >= 1 },
  { id: 'focus25', icon: '🧿', name: 'Laser Beam',      cat: 'growth', cond: s => (s.focusSessions || []).length >= 25 },
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
  const container = document.getElementById('achGrid'); // Dashboard
  const fullGrid = document.getElementById('fullAchGrid'); // Arsenal Tab
  
  if (!container && !fullGrid) return;

  const html = ACHIEVEMENTS.map(a => {
    const done = (state.achievements || []).includes(a.id);
    const isNew = (state.newAch || []).includes(a.id);
    return `<div class="ach-item ${done ? 'unlocked' : 'locked'}" title="${a.name}">
      ${isNew ? '<div class="ach-new"></div>' : ''}
      <span class="ach-ico">${a.icon}</span>
      <div class="ach-name">${a.name}</div>
    </div>`;
  }).join('');

  if (container) container.innerHTML = html;
  if (fullGrid) fullGrid.innerHTML = html;

  // Clear new badges after render
  if (state.newAch && state.newAch.length) {
    state.newAch = [];
  }
}
