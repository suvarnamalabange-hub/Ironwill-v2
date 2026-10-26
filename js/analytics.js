// ============================================================
//  IRON WILL — DEEP ANALYTICS ENGINE v3
//  SVG charts: streak timeline, monthly heatmap, radar, records
// ============================================================

import { state } from './state.js';
import { ds, pd, getToday, get7Days, DAYS, MONTHS } from './utils.js';

// ---- SVG HELPER ----
function svg(tag, attrs = {}) {
  const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
  Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
  return el;
}

// ---- GET N DAYS BACK ----
function getDaysBack(n) {
  const days = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    days.push(ds(d));
  }
  return days;
}

// ---- STREAK TIMELINE CHART ----
export function drawStreakTimeline() {
  const container = document.getElementById('streakTimeline');
  if (!container) return;

  const days = getDaysBack(90);
  const W = container.offsetWidth || 600;
  const H = 180;
  container.innerHTML = '';

  const svgEl = svg('svg', { viewBox: `0 0 ${W} ${H}`, width: W, height: H });
  svgEl.style.overflow = 'visible';

  const pL = 40, pR = 16, pT = 16, pB = 30;
  const cW = W - pL - pR, cH = H - pT - pB;

  // Compute streak data per day
  const streakData = [];
  let streak = 0;
  for (const d of days) {
    if (state.days[d] === 'clean') {
      streak++;
    } else if (state.days[d] === 'relapse') {
      streak = 0;
    }
    streakData.push(streak);
  }

  const max = Math.max(...streakData, 7);

  // Defs
  const defs = svg('defs');
  const areaGrad = svg('linearGradient', { id: 'stAreaGrad', x1: '0', y1: '0', x2: '0', y2: '1' });
  areaGrad.append(
    svg('stop', { offset: '0%', 'stop-color': 'rgba(34,197,94,0.35)' }),
    svg('stop', { offset: '100%', 'stop-color': 'rgba(34,197,94,0)' })
  );
  defs.append(areaGrad);
  svgEl.append(defs);

  // Grid
  const gridSteps = 4;
  for (let i = 0; i <= gridSteps; i++) {
    const y = pT + cH * (1 - i / gridSteps);
    svgEl.append(svg('line', {
      x1: pL, y1: y, x2: W - pR, y2: y,
      stroke: 'rgba(255,255,255,0.04)', 'stroke-width': '1'
    }));
    const label = svg('text', {
      x: pL - 6, y: y + 3,
      fill: '#5a5a8a', 'font-size': '9', 'font-family': 'JetBrains Mono, monospace',
      'text-anchor': 'end'
    });
    label.textContent = Math.round(max * i / gridSteps);
    svgEl.append(label);
  }

  // Points
  const step = cW / (days.length - 1);
  const pts = streakData.map((s, i) => ({
    x: pL + i * step,
    y: pT + cH * (1 - s / max)
  }));

  // Area
  const areaPath = `M ${pts[0].x} ${pts[0].y} ` +
    pts.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ') +
    ` L ${pts[pts.length - 1].x} ${pT + cH} L ${pts[0].x} ${pT + cH} Z`;
  const area = svg('path', { d: areaPath, fill: 'url(#stAreaGrad)', opacity: '0' });
  svgEl.append(area);

  // Line
  const linePath = `M ${pts[0].x} ${pts[0].y} ` + pts.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ');
  const totalLen = pts.reduce((sum, p, i) => {
    if (i === 0) return 0;
    return sum + Math.sqrt((p.x - pts[i - 1].x) ** 2 + (p.y - pts[i - 1].y) ** 2);
  }, 0);

  const line = svg('path', {
    d: linePath, fill: 'none',
    stroke: '#22c55e', 'stroke-width': '2',
    'stroke-linecap': 'round', 'stroke-linejoin': 'round',
    'stroke-dasharray': totalLen, 'stroke-dashoffset': totalLen
  });
  svgEl.append(line);

  // Relapse markers
  days.forEach((d, i) => {
    if (state.days[d] === 'relapse') {
      const marker = svg('circle', {
        cx: pts[i].x, cy: pT + cH, r: '3',
        fill: '#e84040', opacity: '0.7'
      });
      svgEl.append(marker);
    }
  });

  // Month labels
  let lastMonth = -1;
  days.forEach((d, i) => {
    const date = pd(d);
    if (date.getMonth() !== lastMonth) {
      lastMonth = date.getMonth();
      const label = svg('text', {
        x: pts[i].x, y: H - 6,
        fill: '#5a5a8a', 'font-size': '9',
        'font-family': 'Inter, sans-serif', 'text-anchor': 'middle'
      });
      label.textContent = MONTHS[date.getMonth()].substring(0, 3);
      svgEl.append(label);
    }
  });

  // Animate
  requestAnimationFrame(() => {
    line.style.transition = 'stroke-dashoffset 2s cubic-bezier(0.22,1,0.36,1)';
    line.setAttribute('stroke-dashoffset', '0');
    area.style.transition = 'opacity 1s ease 0.8s';
    area.setAttribute('opacity', '1');
  });

  container.appendChild(svgEl);
}

// ---- MONTHLY HEATMAP (LeetCode Activity Matrix) ----
export function drawMonthlyHeatmap() {
  const container = document.getElementById('monthlyHeatmap');
  if (!container) return;

  container.innerHTML = '';

  const numWeeks = 26; // 26 weekly columns (~6 months / 182 days)
  const today = new Date();
  const todayStr = ds(today);
  const todayDow = today.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat

  // Start date: Sunday, (numWeeks - 1) weeks ago
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - (numWeeks - 1) * 7 - todayDow);
  startDate.setHours(0, 0, 0, 0);

  // Collect days & stats in this range
  let cleanCount = 0;
  let recordedDays = 0;
  const daysMap = state.days || {};

  // Outer container
  const wrap = document.createElement('div');
  wrap.className = 'lc-heatmap-container';

  // 1. Header with Stats
  const header = document.createElement('div');
  header.className = 'lc-heatmap-header';

  // 2. Scroll wrapper
  const scrollWrap = document.createElement('div');
  scrollWrap.className = 'lc-heatmap-scroll';

  const board = document.createElement('div');
  board.className = 'lc-heatmap-board';

  // Months header row
  const monthsRow = document.createElement('div');
  monthsRow.className = 'lc-months-row';

  let lastMonth = -1;
  for (let w = 0; w < numWeeks; w++) {
    const weekDate = new Date(startDate);
    weekDate.setDate(startDate.getDate() + w * 7);
    const m = weekDate.getMonth();
    if (m !== lastMonth) {
      const lbl = document.createElement('span');
      lbl.className = 'lc-month-lbl';
      lbl.textContent = weekDate.toLocaleString('en-US', { month: 'short' });
      lbl.style.gridColumn = String(w + 1);
      monthsRow.appendChild(lbl);
      lastMonth = m;
    }
  }
  board.appendChild(monthsRow);

  // Grid body: Weekday labels + cells matrix
  const gridBody = document.createElement('div');
  gridBody.className = 'lc-grid-body';

  // Weekday column: Sun, Mon, Tue, Wed, Thu, Fri, Sat (with Mon, Wed, Fri emphasized)
  const daysCol = document.createElement('div');
  daysCol.className = 'lc-days-col';
  const dayNames = ['', 'Mon', '', 'Wed', '', 'Fri', ''];
  dayNames.forEach(name => {
    const s = document.createElement('span');
    s.textContent = name;
    daysCol.appendChild(s);
  });
  gridBody.appendChild(daysCol);

  // Cells grid: 7 rows high, flowing down columns (Sunday = row 0 ... Saturday = row 6)
  const cellsGrid = document.createElement('div');
  cellsGrid.className = 'lc-cells-grid';

  // Setup single tooltip in document
  let tooltip = document.getElementById('lcGlobalTooltip');
  if (!tooltip) {
    tooltip = document.createElement('div');
    tooltip.id = 'lcGlobalTooltip';
    tooltip.className = 'lc-tooltip';
    document.body.appendChild(tooltip);
  }

  // Iterate columns (weeks), then rows (days 0-6)
  for (let w = 0; w < numWeeks; w++) {
    for (let d = 0; d < 7; d++) {
      const cellDate = new Date(startDate);
      cellDate.setDate(startDate.getDate() + w * 7 + d);
      const dStr = ds(cellDate);

      const cell = document.createElement('div');
      cell.className = 'lc-cell';
      cell.dataset.date = dStr;

      const isFuture = cellDate > today;
      const isToday = dStr === todayStr;
      const status = daysMap[dStr];

      if (isToday) {
        cell.classList.add('today');
      }

      if (isFuture) {
        cell.classList.add('future');
      } else {
        if (status === 'clean') {
          cell.classList.add('clean');
          cleanCount++;
          recordedDays++;
        } else if (status === 'relapse') {
          cell.classList.add('relapse');
          recordedDays++;
        }
      }

      // Tooltip events
      cell.addEventListener('mouseenter', () => {
        if (isFuture) return;
        const formatted = cellDate.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        });
        const statusText = status === 'clean' ? 'Clean (Resisted)' : status === 'relapse' ? 'Relapse' : 'No record';
        const statusClass = status || 'unmarked';

        tooltip.innerHTML = `
          <div class="lc-tooltip-date">${formatted}</div>
          <div class="lc-tooltip-status ${statusClass}">${status === 'clean' ? '✓ ' : status === 'relapse' ? '✗ ' : ''}${statusText}</div>
        `;

        const rect = cell.getBoundingClientRect();
        tooltip.style.left = `${rect.left + rect.width / 2}px`;
        tooltip.style.top = `${rect.top}px`;
        tooltip.classList.add('visible');
      });

      cell.addEventListener('mouseleave', () => {
        tooltip.classList.remove('visible');
      });

      cellsGrid.appendChild(cell);
    }
  }

  gridBody.appendChild(cellsGrid);
  board.appendChild(gridBody);
  scrollWrap.appendChild(board);

  // Update Header with Clean Count & Resilience Rate
  const resilienceRate = recordedDays ? Math.round((cleanCount / recordedDays) * 100) : 100;
  header.innerHTML = `
    <div class="lc-heatmap-stats">
      <span class="stat-tag">Clean Days: <strong class="highlight-green">${cleanCount}</strong></span>
      <span class="stat-tag">Window: <strong>180 Days</strong></span>
      <span class="stat-tag">Resilience: <strong class="highlight-gold">${resilienceRate}%</strong></span>
    </div>
  `;

  // 3. Footer with Legend
  const footer = document.createElement('div');
  footer.className = 'lc-heatmap-footer';
  footer.innerHTML = `
    <div style="font-size:11px;color:var(--text-muted)">
      Hover over any square to view daily discipline record
    </div>
    <div class="lc-legend">
      <span>Unmarked</span>
      <span class="lc-legend-cell empty"></span>
      <span class="lc-legend-cell clean"></span>
      <span>Clean</span>
      <span class="lc-legend-cell relapse"></span>
      <span>Relapse</span>
    </div>
  `;

  wrap.appendChild(header);
  wrap.appendChild(scrollWrap);
  wrap.appendChild(footer);

  // Outer Wrapper with LeetCode Stats Breakdown Sidebar
  const outerWrapper = document.createElement('div');
  outerWrapper.className = 'lc-heatmap-wrapper';
  outerWrapper.appendChild(wrap);

  const sidebar = document.createElement('div');
  sidebar.className = 'lc-stats-sidebar';
  sidebar.innerHTML = `
    <div class="lc-stat-item">
      <span class="lc-stat-lbl">Active Clean Days</span>
      <span class="lc-stat-val green">${cleanCount}</span>
    </div>
    <div class="lc-stat-item">
      <span class="lc-stat-lbl">Current Streak</span>
      <span class="lc-stat-val gold">${state.streak || 0}d</span>
    </div>
    <div class="lc-stat-item">
      <span class="lc-stat-lbl">Best Streak</span>
      <span class="lc-stat-val">${state.longestStreak || 0}d</span>
    </div>
    <div class="lc-stat-item">
      <span class="lc-stat-lbl">Resilience Rate</span>
      <span class="lc-stat-val ${resilienceRate >= 80 ? 'green' : ''}">${resilienceRate}%</span>
    </div>
  `;
  outerWrapper.appendChild(sidebar);

  container.appendChild(outerWrapper);
}

// ---- RADAR CHART (Day-of-Week Vulnerability) ----
export function drawRadarChart() {
  const container = document.getElementById('radarChart');
  if (!container) return;

  const W = container.offsetWidth || 250;
  const H = 250;
  container.innerHTML = '';

  const svgEl = svg('svg', { viewBox: `0 0 ${W} ${H}`, width: W, height: H });

  const cx = W / 2, cy = H / 2, radius = Math.min(W, H) / 2 - 30;
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Count relapses by day of week
  const counts = Array(7).fill(0);
  Object.keys(state.reflections || {}).forEach(d => {
    counts[pd(d).getDay()]++;
  });
  // Also count urges by day
  const urgeCounts = Array(7).fill(0);
  (state.urges || []).forEach(u => {
    if (u.date) urgeCounts[pd(u.date).getDay()]++;
  });

  // Combine for vulnerability score
  const combined = counts.map((c, i) => c * 3 + urgeCounts[i]);
  const max = Math.max(...combined, 1);

  // Grid rings
  [0.25, 0.5, 0.75, 1].forEach(r => {
    const ring = svg('circle', {
      cx, cy, r: radius * r,
      fill: 'none', stroke: 'rgba(255,255,255,0.05)', 'stroke-width': '1'
    });
    svgEl.append(ring);
  });

  // Axis lines + labels
  for (let i = 0; i < 7; i++) {
    const angle = (Math.PI * 2 * i / 7) - Math.PI / 2;
    const x2 = cx + Math.cos(angle) * radius;
    const y2 = cy + Math.sin(angle) * radius;
    svgEl.append(svg('line', {
      x1: cx, y1: cy, x2, y2,
      stroke: 'rgba(255,255,255,0.06)', 'stroke-width': '1'
    }));
    const lx = cx + Math.cos(angle) * (radius + 16);
    const ly = cy + Math.sin(angle) * (radius + 16);
    const label = svg('text', {
      x: lx, y: ly + 3,
      fill: '#5a5a8a', 'font-size': '9',
      'font-family': 'Inter, sans-serif', 'text-anchor': 'middle'
    });
    label.textContent = dayNames[i];
    svgEl.append(label);
  }

  // Data polygon
  const points = combined.map((val, i) => {
    const angle = (Math.PI * 2 * i / 7) - Math.PI / 2;
    const r = (val / max) * radius;
    return `${cx + Math.cos(angle) * r},${cy + Math.sin(angle) * r}`;
  }).join(' ');

  if (combined.some(v => v > 0)) {
    svgEl.append(svg('polygon', {
      points,
      fill: 'rgba(232,64,64,0.15)',
      stroke: '#e84040',
      'stroke-width': '1.5',
      'stroke-linejoin': 'round',
      opacity: '0'
    }));

    // Dots
    combined.forEach((val, i) => {
      if (val > 0) {
        const angle = (Math.PI * 2 * i / 7) - Math.PI / 2;
        const r = (val / max) * radius;
        svgEl.append(svg('circle', {
          cx: cx + Math.cos(angle) * r,
          cy: cy + Math.sin(angle) * r,
          r: '3', fill: '#e84040'
        }));
      }
    });

    // Animate
    requestAnimationFrame(() => {
      const poly = svgEl.querySelector('polygon');
      if (poly) {
        poly.style.transition = 'opacity 0.8s ease 0.3s';
        poly.setAttribute('opacity', '1');
      }
    });
  }

  container.appendChild(svgEl);
}

// ---- PERSONAL RECORDS ----
export function computeRecords() {
  const s = state;
  const allDays = Object.keys(s.days).sort();
  if (!allDays.length) return null;

  // Best week (most clean days in any 7-day window)
  let bestWeekClean = 0, bestWeekStart = '';
  for (let i = 0; i <= allDays.length - 7; i++) {
    let clean = 0;
    for (let j = i; j < i + 7 && j < allDays.length; j++) {
      if (s.days[allDays[j]] === 'clean') clean++;
    }
    if (clean > bestWeekClean) {
      bestWeekClean = clean;
      bestWeekStart = allDays[i];
    }
  }

  // Best month (most clean days in any 30-day window)
  let bestMonthClean = 0;
  const daysList = getDaysBack(365);
  for (let i = 0; i <= daysList.length - 30; i++) {
    let clean = 0;
    for (let j = i; j < i + 30; j++) {
      if (s.days[daysList[j]] === 'clean') clean++;
    }
    if (clean > bestMonthClean) bestMonthClean = clean;
  }

  // Longest clean month streak
  let currentMonthStreak = 0, bestMonthStreak = 0;
  const months = {};
  allDays.forEach(d => {
    const key = d.substring(0, 7);
    if (!months[key]) months[key] = { clean: 0, total: 0 };
    months[key].total++;
    if (s.days[d] === 'clean') months[key].clean++;
  });

  // Total focus minutes
  const totalFocusMinutes = (s.focusSessions || []).reduce((sum, sess) => sum + (sess.duration || 0), 0);

  // Most productive day of week
  const dowClean = Array(7).fill(0);
  allDays.forEach(d => {
    if (s.days[d] === 'clean') dowClean[pd(d).getDay()]++;
  });
  const bestDOW = dowClean.indexOf(Math.max(...dowClean));

  return {
    longestStreak: s.longestStreak || 0,
    totalClean: s.totalClean || 0,
    totalXP: s.totalXP || 0,
    bestWeekClean,
    bestMonthClean,
    totalFocusMinutes,
    bestDOW: DAYS[bestDOW],
    totalUrgesDefeated: (s.urges || []).length,
    totalJournals: Object.keys(s.journals || {}).length,
    firstDay: allDays[0],
    daysTracked: allDays.length,
  };
}

export function renderRecords() {
  const container = document.getElementById('recordsBoard');
  if (!container) return;

  const records = computeRecords();
  if (!records) {
    container.innerHTML = '<div class="empty-state">Start tracking to see your records.</div>';
    return;
  }

  const items = [
    { icon: '🏆', label: 'Longest Streak', value: `${records.longestStreak} days`, color: 'var(--gold)' },
    { icon: '✅', label: 'Total Clean Days', value: records.totalClean, color: 'var(--green)' },
    { icon: '📅', label: 'Days Tracked', value: records.daysTracked, color: 'var(--blue)' },
    { icon: '🔥', label: 'Best Week', value: `${records.bestWeekClean}/7`, color: 'var(--amber)' },
    { icon: '📆', label: 'Best Month', value: `${records.bestMonthClean}/30`, color: 'var(--purple)' },
    { icon: '⚡', label: 'Urges Defeated', value: records.totalUrgesDefeated, color: 'var(--red)' },
    { icon: '🎯', label: 'Focus Minutes', value: records.totalFocusMinutes, color: 'var(--cyan)' },
    { icon: '💪', label: 'Best Day', value: records.bestDOW, color: 'var(--green)' },
  ];

  container.innerHTML = items.map(item => `
    <div class="record-card">
      <div class="record-icon">${item.icon}</div>
      <div class="record-value" style="color:${item.color}">${item.value}</div>
      <div class="record-label">${item.label}</div>
    </div>
  `).join('');
}

// ---- TREND INDICATORS ----
export function computeTrends() {
  const last7 = get7Days();
  const prev7 = [];
  const now = new Date();
  for (let i = 13; i >= 7; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    prev7.push(ds(d));
  }

  const cleanThis = last7.filter(d => state.days[d] === 'clean').length;
  const cleanPrev = prev7.filter(d => state.days[d] === 'clean').length;

  const urgeCounts = new Map();
  (state.urges || []).forEach(urge => urgeCounts.set(urge.date, (urgeCounts.get(urge.date) || 0) + 1));
  const urgesThis = last7.reduce((s, d) => s + (urgeCounts.get(d) || 0), 0);
  const urgesPrev = prev7.reduce((s, d) => s + (urgeCounts.get(d) || 0), 0);

  const moodsThis = last7.map(d => (state.moods || {})[d] || 0).filter(m => m > 0);
  const moodsPrev = prev7.map(d => (state.moods || {})[d] || 0).filter(m => m > 0);
  const avgMoodThis = moodsThis.length ? moodsThis.reduce((a, b) => a + b, 0) / moodsThis.length : 0;
  const avgMoodPrev = moodsPrev.length ? moodsPrev.reduce((a, b) => a + b, 0) / moodsPrev.length : 0;

  return {
    clean: { current: cleanThis, previous: cleanPrev, trend: cleanThis >= cleanPrev ? 'up' : 'down' },
    urges: { current: urgesThis, previous: urgesPrev, trend: urgesThis <= urgesPrev ? 'up' : 'down' },
    mood: { current: avgMoodThis.toFixed(1), previous: avgMoodPrev.toFixed(1), trend: avgMoodThis >= avgMoodPrev ? 'up' : 'down' },
  };
}

export function renderTrends() {
  const container = document.getElementById('trendIndicators');
  if (!container) return;

  const trends = computeTrends();

  const items = [
    { label: 'Clean Days', ...trends.clean, icon: '✅', goodTrend: 'up' },
    { label: 'Urges', ...trends.urges, icon: '⚡', goodTrend: 'up' },
    { label: 'Avg Mood', ...trends.mood, icon: '🧠', goodTrend: 'up' },
  ];

  container.innerHTML = items.map(item => {
    const isGood = item.trend === item.goodTrend;
    const arrow = item.trend === 'up' ? '↑' : '↓';
    const color = isGood ? 'var(--green)' : 'var(--red)';
    return `
      <div class="trend-card">
        <div class="trend-icon">${item.icon}</div>
        <div class="trend-value">${item.current}</div>
        <div class="trend-arrow" style="color:${color}">${arrow} vs ${item.previous}</div>
        <div class="trend-label">${item.label}</div>
      </div>
    `;
  }).join('');
}

// ---- RENDER ALL ANALYTICS ----
export function renderAnalytics() {
  drawStreakTimeline();
  drawMonthlyHeatmap();
  drawRadarChart();
  renderRecords();
  renderTrends();
}
