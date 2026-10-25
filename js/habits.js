// ============================================================
//  IRON WILL — HABITS v3
//  Custom habits, categories, and deep tracking
// ============================================================

import { state } from './state.js';
import { getToday, ds, pd, uid, esc } from './utils.js';
import { showToast } from './toast.js';
import { playSound } from './audio.js';

export const DEFAULT_HABITS = [
  { id: 'exercise',    icon: '🏋️', name: 'Exercise',        cat: 'afternoon' },
  { id: 'meditation',  icon: '🧘', name: 'Meditation',      cat: 'morning' },
  { id: 'cold_shower', icon: '🚿', name: 'Cold Shower',     cat: 'morning' },
  { id: 'reading',     icon: '📚', name: 'Reading',          cat: 'evening' },
  { id: 'no_social',   icon: '📵', name: 'No Social Media',  cat: 'all' },
];

export function getHabits() {
  return [...DEFAULT_HABITS, ...(state.customHabits || [])];
}

export function renderHabits() {
  const dashboardList = document.getElementById('habitList');
  const arsenalList = document.getElementById('habitListAll');

  const today = getToday();
  const todayLog = (state.habitLog || {})[today] || {};
  const habits = getHabits();

  if (dashboardList) dashboardList.innerHTML = '';
  if (arsenalList) arsenalList.innerHTML = '';

  habits.forEach(h => {
    const done = !!todayLog[h.id];
    const streak = habitStreak(h.id);
    const catLabel = (h.cat || 'all').toUpperCase();

    // Dashboard version (interactive daily checklist)
    if (dashboardList) {
      const row = document.createElement('div');
      row.className = 'habit-row';
      row.dataset.id = h.id;
      row.innerHTML = `
        <div class="habit-left">
          <span class="habit-icon">${esc(h.icon || '🔥')}</span>
          <div>
            <div class="habit-name">${esc(h.name)}</div>
            <div class="habit-streak">${streak > 0 ? `🔥 ${streak} day streak` : 'Not started today'}</div>
          </div>
        </div>
        <div class="habit-actions">
          <button class="habit-toggle ${done ? 'on' : ''}" data-id="${esc(h.id)}" role="switch" aria-checked="${done}" aria-label="Mark ${esc(h.name)} complete"></button>
        </div>
      `;

      const toggleBtn = row.querySelector('.habit-toggle');
      if (toggleBtn) {
        toggleBtn.addEventListener('click', () => toggleHabit(h.id));
      }
      dashboardList.appendChild(row);
    }

    // Arsenal version (habit management with categories and delete buttons)
    if (arsenalList) {
      const row = document.createElement('div');
      row.className = 'habit-row';
      row.dataset.id = h.id;
      row.innerHTML = `
        <div class="habit-left">
          <span class="habit-icon">${esc(h.icon || '🔥')}</span>
          <div>
            <div class="habit-name">${esc(h.name)} <span class="jcard-cat" style="font-size:9px;padding:2px 6px">${catLabel}</span></div>
            <div class="habit-streak">${streak > 0 ? `🔥 ${streak} day streak` : 'Ready to start'}</div>
          </div>
        </div>
        <div class="habit-actions">
          ${h.isCustom ? `<button class="habit-delete-btn" data-id="${esc(h.id)}" title="Delete habit" aria-label="Delete ${esc(h.name)}">🗑️</button>` : ''}
          <button class="habit-toggle ${done ? 'on' : ''}" data-id="${esc(h.id)}" role="switch" aria-checked="${done}" aria-label="Mark ${esc(h.name)} complete"></button>
        </div>
      `;

      const toggleBtn = row.querySelector('.habit-toggle');
      if (toggleBtn) {
        toggleBtn.addEventListener('click', () => toggleHabit(h.id));
      }

      const delBtn = row.querySelector('.habit-delete-btn');
      if (delBtn) {
        delBtn.addEventListener('click', () => deleteHabit(h.id));
      }
      arsenalList.appendChild(row);
    }
  });
}

function toggleHabit(id) {
  const today = getToday();
  if (!state.habitLog) state.habitLog = {};
  if (!state.habitLog[today]) state.habitLog[today] = {};

  const prev = !!state.habitLog[today][id];
  state.habitLog[today][id] = !prev;

  if (!prev) {
    const habit = getHabits().find(h => h.id === id);
    state.totalXP += 10;
    showToast(`+10 XP — ${habit?.name || 'Habit'} complete! 💪`, 'ok');
    playSound('toggle');
  }

  renderHabits();
  window.dispatchEvent(new CustomEvent('state-changed'));
}

export function addCustomHabit(name, icon, cat) {
  if (typeof name !== 'string' || name.trim().length < 1 || name.trim().length > 80) {
    showToast('Habit name must be between 1 and 80 characters.', 'warn');
    return false;
  }
  if (!['morning', 'afternoon', 'evening', 'all'].includes(cat)) {
    cat = 'all';
  }
  if (!state.customHabits) state.customHabits = [];
  const newHabit = {
    id: uid(),
    name: name.trim(),
    icon: typeof icon === 'string' && icon.trim().length <= 8 ? icon.trim() : '🔥',
    cat,
    isCustom: true,
    ts: Date.now()
  };
  state.customHabits.push(newHabit);
  renderHabits();
  showToast('Custom habit added! ⚔️', 'ok');
  return true;
}

function deleteHabit(id) {
  if (!confirm('Are you sure you want to delete this habit?')) return;
  state.customHabits = (state.customHabits || []).filter(h => h.id !== id);
  renderHabits();
  showToast('Habit deleted.', 'info');
  window.dispatchEvent(new CustomEvent('state-changed'));
}

export function habitStreak(id) {
  let streak = 0;
  const cursor = pd(getToday());
  const now = new Date();

  while (true) {
    const k = ds(cursor);
    if ((state.habitLog || {})[k]?.[id]) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
    // Limit to 365 days
    if (cursor < new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())) break;
  }
  return streak;
}

export function habitStreakMax() {
  let max = 0;
  const habits = getHabits();
  habits.forEach(h => {
    const s = habitStreak(h.id);
    if (s > max) max = s;
  });
  return max;
}
