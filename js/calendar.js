// ============================================================
//  IRON WILL — CALENDAR
//  Calendar rendering & interactions + Urge Heatmap
// ============================================================

import { state } from './state.js';
import { ds, pd, getToday, isFuture, isToday, MONTHS, DAYS } from './utils.js';
import { showToast } from './toast.js';

let calYear, calMonth;
let calendarInitialized = false;

export function initCalendar() {
  const now = new Date();
  calYear = now.getFullYear();
  calMonth = now.getMonth();

  if (calendarInitialized) return;
  calendarInitialized = true;

  // Day name headers
  const dn = document.getElementById('calDayNames');
  if (dn) dn.innerHTML = DAYS.map(d => `<div class="cal-dn">${d}</div>`).join('');

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

  document.getElementById('goTodayBtn')?.addEventListener('click', goToday);
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
    const status = (state.days || {})[dStr];
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
      c.style.cursor = 'pointer';
      c.addEventListener('click', () => handleCalClick(dStr));
    } else if (status) {
      c.title = `${status === 'clean' ? '✅ Clean' : '❌ Relapse'} — Locked`;
    }

    g.appendChild(c);
  }

  gridEl.appendChild(g);
  drawHeatmap();
}

function handleCalClick(dStr) {
  if (isFuture(dStr)) return;
  if ((state.days || {})[dStr]) {
    showToast('🔒 Day already recorded. Accountability is absolute.', 'warn');
    return;
  }
  if (!isToday(dStr)) {
    showToast('⚠️ Past days cannot be backdated. Stay present.', 'warn');
    return;
  }
  // Open daily check modal
  window.dispatchEvent(new CustomEvent('show-daily-check'));
}

/** Render 24-hour urge heatmap */
export function drawHeatmap() {
  const container = document.getElementById('heatmapGrid');
  if (!container) return;

  container.innerHTML = '';
  const hourlyCounts = Array(24).fill(0);
  (state.urges || []).forEach(u => {
    if (typeof u.hour === 'number' && u.hour >= 0 && u.hour < 24) {
      hourlyCounts[u.hour]++;
    }
  });

  const max = Math.max(...hourlyCounts, 1);

  // Set grid style if not defined
  container.style.display = 'grid';
  container.style.gridTemplateColumns = 'repeat(24, 1fr)';
  container.style.gap = '3px';
  container.style.margin = '10px 0';

  hourlyCounts.forEach((count, hour) => {
    const cell = document.createElement('div');
    cell.className = 'hm-cell';
    const intensity = count === 0 ? 0 : Math.min(1, 0.25 + (count / max) * 0.75);

    if (count > 0) {
      cell.style.background = `rgba(232, 64, 64, ${intensity})`;
      cell.style.boxShadow = `0 0 ${count * 3}px rgba(232, 64, 64, 0.4)`;
    } else {
      cell.style.background = 'rgba(255, 255, 255, 0.04)';
    }

    const ampm = hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`;

    const tooltip = document.createElement('div');
    tooltip.className = 'hm-tooltip';
    tooltip.textContent = `${ampm}: ${count} urge${count === 1 ? '' : 's'} resisted`;
    cell.appendChild(tooltip);

    container.appendChild(cell);
  });
}
