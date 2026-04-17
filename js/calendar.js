// ============================================================
//  IRON WILL — CALENDAR
//  Calendar rendering & interactions
// ============================================================

import { state } from './state.js';
import { ds, pd, getToday, isFuture, isToday, MONTHS, DAYS } from './utils.js';
import { showToast } from './app.js';

let calYear, calMonth;

export function initCalendar() {
  const now = new Date();
  calYear = now.getFullYear();
  calMonth = now.getMonth();

  // Day name headers
  const dn = document.getElementById('calDayNames');
  if (dn) {
    dn.innerHTML = DAYS.map(d => `<div class="cal-dn">${d}</div>`).join('');
  }

  // Nav buttons
  document.getElementById('prevM')?.addEventListener('click', () => {
    calMonth--;
    if (calMonth < 0) { calMonth = 11; calYear--; }
    renderCalendar();
  });

  document.getElementById('nextM')?.addEventListener('click', () => {
    calMonth++;
    if (calMonth > 11) { calMonth = 0; calYear++; }
    renderCalendar();
  });
}

export function goToday() {
  const now = new Date();
  calYear = now.getFullYear();
  calMonth = now.getMonth();
  renderCalendar();
}

export function renderCalendar() {
  const monthEl = document.getElementById('calMonth');
  const gridEl = document.getElementById('calGrid');
  if (!monthEl || !gridEl) return;

  monthEl.textContent = `${MONTHS[calMonth]} ${calYear}`;
  gridEl.innerHTML = '';

  const g = document.createElement('div');
  g.className = 'cal-grid-7';

  const firstDay = new Date(calYear, calMonth, 1).getDay();
  const totalDays = new Date(calYear, calMonth + 1, 0).getDate();
  const today = getToday();

  // Empty cells before first day
  for (let i = 0; i < firstDay; i++) {
    const c = document.createElement('div');
    c.className = 'cal-cell empty';
    g.appendChild(c);
  }

  // Day cells
  for (let d = 1; d <= totalDays; d++) {
    const dStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const status = state.days[dStr];
    const mood = (state.moods || {})[dStr];
    const future = isFuture(dStr);
    const todayFlag = isToday(dStr);

    const c = document.createElement('div');
    c.className = 'cal-cell';
    if (future) c.classList.add('future');
    if (todayFlag) c.classList.add('today');
    if (status === 'clean') c.classList.add('clean', 'locked');
    if (status === 'relapse') c.classList.add('relapse', 'locked');

    const moodEmoji = mood ? ['', '😣', '😞', '😐', '😊', '🤩'][mood] : '';

    c.innerHTML = `
      <span class="c-num">${d}</span>
      <span class="c-ico">${status === 'clean' ? '✓' : status === 'relapse' ? '✗' : ''}</span>
      <span class="c-mood">${moodEmoji}</span>
    `;

    if (!future && !status) {
      c.addEventListener('click', () => handleCalClick(dStr));
    } else if (status) {
      c.title = `${status === 'clean' ? '✅ Clean' : '❌ Relapse'} — Locked`;
    }

    g.appendChild(c);
  }

  gridEl.appendChild(g);
}

function handleCalClick(dStr) {
  if (isFuture(dStr)) return;
  if (state.days[dStr]) {
    showToast('🔒 Day already marked. No editing. Stay accountable.', 'warn');
    return;
  }
  if (!isToday(dStr)) {
    showToast('⚠️ Past days can only be marked on the day itself.', 'warn');
    return;
  }
  // Trigger daily check modal
  window.dispatchEvent(new CustomEvent('show-daily-check'));
}
