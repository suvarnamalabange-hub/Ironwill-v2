// ============================================================
//  IRON WILL — HABITS
//  Habit tracking, toggles, streaks
// ============================================================

import { state } from './state.js';
import { getToday, ds } from './utils.js';
import { showToast } from './app.js';
import { playSound } from './audio.js';

export const HABITS = [
  { id: 'exercise',    icon: '🏋️', name: 'Exercise',        sub: 'Physical training' },
  { id: 'meditation',  icon: '🧘', name: 'Meditation',      sub: '10+ min mindfulness' },
  { id: 'cold_shower', icon: '🚿', name: 'Cold Shower',     sub: 'Mental toughness' },
  { id: 'reading',     icon: '📚', name: 'Reading',          sub: '30+ min learning' },
  { id: 'no_social',   icon: '📵', name: 'No Social Media',  sub: 'Digital detox' },
];

export function renderHabits() {
  const list = document.getElementById('habitList');
  if (!list) return;

  const today = getToday();
  const todayHabits = (state.habitLog || {})[today] || {};

  list.innerHTML = HABITS.map(h => {
    const done = !!todayHabits[h.id];
    const streak = habitStreak(h.id);
    return `<div class="habit-row">
      <div class="habit-left">
        <span class="habit-icon">${h.icon}</span>
        <div>
          <div class="habit-name">${h.name}</div>
          <div class="habit-streak">${streak > 0 ? `🔥 ${streak} day streak` : 'Not started'}</div>
        </div>
      </div>
      <div class="habit-toggle ${done ? 'on' : ''}" data-habit-id="${h.id}" role="switch" aria-checked="${done}" tabindex="0"></div>
    </div>`;
  }).join('');

  // Event delegation
  list.querySelectorAll('.habit-toggle').forEach(toggle => {
    toggle.addEventListener('click', () => {
      toggleHabit(toggle.dataset.habitId);
    });
    toggle.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleHabit(toggle.dataset.habitId);
      }
    });
  });
}

function toggleHabit(id) {
  const today = getToday();
  if (!state.habitLog) state.habitLog = {};
  if (!state.habitLog[today]) state.habitLog[today] = {};

  const prev = state.habitLog[today][id];
  state.habitLog[today][id] = !prev;

  if (!prev) {
    const habit = HABITS.find(h => h.id === id);
    showToast(`+10 XP — ${habit?.name} done! 💪`, 'ok');
    playSound('toggle');
  }

  // Re-render
  renderHabits();
  window.dispatchEvent(new CustomEvent('state-changed'));
}

export function habitStreak(id) {
  let streak = 0;
  const now = new Date();
  const today = getToday();

  for (let d = new Date(today); ; d.setDate(d.getDate() - 1)) {
    const k = ds(d);
    if ((state.habitLog || {})[k]?.[id]) {
      streak++;
    } else {
      break;
    }
    // Safety: don't go back more than a year
    const limit = new Date(now);
    limit.setFullYear(limit.getFullYear() - 1);
    if (d < limit) break;
  }
  return streak;
}

export function habitStreakMax() {
  let max = 0;
  if (!state.habitLog) return 0;
  const dates = Object.keys(state.habitLog).sort();
  let streak = 0;
  for (let i = 0; i < dates.length; i++) {
    const h = state.habitLog[dates[i]];
    if (h && Object.values(h).some(v => v)) streak++;
    else streak = 0;
    if (streak > max) max = streak;
  }
  return max;
}
