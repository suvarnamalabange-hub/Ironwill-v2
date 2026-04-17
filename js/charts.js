// ============================================================
//  IRON WILL — SVG CHARTS
//  Animated SVG data visualizations replacing Canvas
// ============================================================

import { state } from './state.js';
import { get7Days, pd, getToday } from './utils.js';

// ---- HELPERS ----
function get7DayUrges() {
  return get7Days().map(d => (state.urges || []).filter(u => u.date === d).length);
}

function get7DayMoods() {
  return get7Days().map(d => (state.moods || {})[d] || 0);
}

function svgEl(tag, attrs = {}) {
  const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
  Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
  return el;
}

// ---- URGE BAR CHART (SVG) ----
export function drawUrgeBar() {
  const container = document.getElementById('urgeBarChart');
  if (!container) return;

  const W = container.offsetWidth || 400;
  const H = 140;

  container.innerHTML = '';
  const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, width: W, height: H });
  svg.style.overflow = 'visible';

  const days = get7Days();
  const counts = get7DayUrges();
  const max = Math.max(...counts, 3);
  const pL = 30, pR = 12, pT = 10, pB = 28;
  const cW = W - pL - pR, cH = H - pT - pB;

  // Defs for gradient
  const defs = svgEl('defs');
  const grad = svgEl('linearGradient', { id: 'urgeBarGrad', x1: '0', y1: '0', x2: '0', y2: '1' });
  const stop1 = svgEl('stop', { offset: '0%', 'stop-color': 'rgba(232,64,64,0.9)' });
  const stop2 = svgEl('stop', { offset: '100%', 'stop-color': 'rgba(192,32,32,0.3)' });
  grad.append(stop1, stop2);
  // Glow filter
  const filter = svgEl('filter', { id: 'barGlow', x: '-50%', y: '-50%', width: '200%', height: '200%' });
  const feGauss = svgEl('feGaussianBlur', { stdDeviation: '3', result: 'blur' });
  const feMerge = svgEl('feMerge');
  const fmn1 = svgEl('feMergeNode', { in: 'blur' });
  const fmn2 = svgEl('feMergeNode', { in: 'SourceGraphic' });
  feMerge.append(fmn1, fmn2);
  filter.append(feGauss, feMerge);
  defs.append(grad, filter);
  svg.append(defs);

  // Grid lines
  [0, 0.5, 1].forEach(r => {
    const y = pT + cH * (1 - r);
    const line = svgEl('line', {
      x1: pL, y1: y, x2: W - pR, y2: y,
      stroke: 'rgba(255,255,255,0.05)', 'stroke-width': '1'
    });
    svg.append(line);

    const label = svgEl('text', {
      x: pL - 6, y: y + 3,
      fill: '#5a5a8a', 'font-size': '9', 'font-family': 'JetBrains Mono, monospace',
      'text-anchor': 'end'
    });
    label.textContent = Math.round(max * r);
    svg.append(label);
  });

  const gap = cW / days.length;
  const barWidth = gap * 0.45;
  const today = getToday();
  const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  counts.forEach((c, i) => {
    const x = pL + i * gap + gap / 2 - barWidth / 2;
    const barH = cH * (c / max);
    const y = pT + cH - barH;
    const isT = days[i] === today;

    if (barH > 0) {
      const rect = svgEl('rect', {
        x, y: pT + cH, width: barWidth, height: 0,
        rx: '4', fill: 'url(#urgeBarGrad)',
        opacity: isT ? '1' : '0.6',
        filter: isT && c > 0 ? 'url(#barGlow)' : ''
      });
      svg.append(rect);

      // Animate bar growing
      requestAnimationFrame(() => {
        rect.style.transition = `all 0.8s cubic-bezier(0.22,1,0.36,1) ${i * 80}ms`;
        rect.setAttribute('y', y);
        rect.setAttribute('height', barH);
      });

      // Value label
      if (c > 0) {
        const valText = svgEl('text', {
          x: pL + i * gap + gap / 2, y: y - 6,
          fill: '#e84040', 'font-size': '10', 'font-weight': 'bold',
          'font-family': 'Inter, sans-serif', 'text-anchor': 'middle',
          opacity: '0'
        });
        valText.textContent = c;
        svg.append(valText);
        requestAnimationFrame(() => {
          valText.style.transition = `opacity 0.5s ease ${i * 80 + 400}ms`;
          valText.setAttribute('opacity', '1');
        });
      }
    }

    // Day label
    const dayText = svgEl('text', {
      x: pL + i * gap + gap / 2, y: H - 8,
      fill: isT ? '#f5c842' : '#5a5a8a',
      'font-size': '10', 'font-family': 'Inter, sans-serif',
      'text-anchor': 'middle', 'font-weight': isT ? '700' : '400'
    });
    dayText.textContent = dayLabels[pd(days[i]).getDay()];
    svg.append(dayText);
  });

  container.appendChild(svg);
}

// ---- MOOD LINE CHART (SVG) ----
export function drawMoodChart() {
  const container = document.getElementById('moodChart');
  if (!container) return;

  const W = container.offsetWidth || 300;
  const H = 120;

  container.innerHTML = '';
  const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, width: W, height: H });
  svg.style.overflow = 'visible';

  const days = get7Days();
  const moods = get7DayMoods();
  const pL = 12, pR = 12, pT = 12, pB = 22;
  const cW = W - pL - pR, cH = H - pT - pB;

  // Defs
  const defs = svgEl('defs');
  const areaGrad = svgEl('linearGradient', { id: 'moodAreaGrad', x1: '0', y1: '0', x2: '0', y2: '1' });
  areaGrad.append(
    svgEl('stop', { offset: '0%', 'stop-color': 'rgba(59,130,246,0.3)' }),
    svgEl('stop', { offset: '100%', 'stop-color': 'rgba(59,130,246,0)' })
  );
  const lineGlow = svgEl('filter', { id: 'moodGlow' });
  lineGlow.append(svgEl('feGaussianBlur', { stdDeviation: '2', result: 'blur' }));
  const merge = svgEl('feMerge');
  merge.append(svgEl('feMergeNode', { in: 'blur' }), svgEl('feMergeNode', { in: 'SourceGraphic' }));
  lineGlow.append(merge);
  defs.append(areaGrad, lineGlow);
  svg.append(defs);

  const validPts = moods.map((m, i) => {
    if (m <= 0) return null;
    return { x: pL + i * (cW / 6), y: pT + cH * (1 - (m - 1) / 4), mood: m };
  }).filter(Boolean);

  if (validPts.length > 1) {
    // Area fill
    const areaPath = `M ${validPts[0].x} ${validPts[0].y} ` +
      validPts.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ') +
      ` L ${validPts[validPts.length - 1].x} ${pT + cH} L ${validPts[0].x} ${pT + cH} Z`;

    const area = svgEl('path', {
      d: areaPath, fill: 'url(#moodAreaGrad)', opacity: '0'
    });
    svg.append(area);

    // Line
    const linePath = `M ${validPts[0].x} ${validPts[0].y} ` +
      validPts.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ');

    const totalLength = validPts.reduce((sum, p, i) => {
      if (i === 0) return 0;
      const prev = validPts[i - 1];
      return sum + Math.sqrt((p.x - prev.x) ** 2 + (p.y - prev.y) ** 2);
    }, 0);

    const line = svgEl('path', {
      d: linePath, fill: 'none',
      stroke: '#3b82f6', 'stroke-width': '2.5',
      'stroke-linecap': 'round', 'stroke-linejoin': 'round',
      'stroke-dasharray': totalLength,
      'stroke-dashoffset': totalLength,
      filter: 'url(#moodGlow)'
    });
    svg.append(line);

    // Dots
    const moodEmojis = ['', '😣', '😞', '😐', '😊', '🤩'];
    validPts.forEach((p, i) => {
      const dot = svgEl('circle', {
        cx: p.x, cy: p.y, r: '4',
        fill: '#3b82f6', stroke: '#0a0a1e', 'stroke-width': '2',
        opacity: '0'
      });
      svg.append(dot);

      // Mood emoji above dot
      const emoji = svgEl('text', {
        x: p.x, y: p.y - 10,
        'font-size': '10', 'text-anchor': 'middle', opacity: '0'
      });
      emoji.textContent = moodEmojis[p.mood];
      svg.append(emoji);

      requestAnimationFrame(() => {
        dot.style.transition = `opacity 0.4s ease ${600 + i * 100}ms`;
        dot.setAttribute('opacity', '1');
        emoji.style.transition = `opacity 0.4s ease ${700 + i * 100}ms`;
        emoji.setAttribute('opacity', '0.8');
      });
    });

    // Animate line drawing
    requestAnimationFrame(() => {
      line.style.transition = 'stroke-dashoffset 1.2s cubic-bezier(0.22,1,0.36,1)';
      line.setAttribute('stroke-dashoffset', '0');
      area.style.transition = 'opacity 0.8s ease 0.6s';
      area.setAttribute('opacity', '1');
    });
  }

  // Day labels
  const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  days.forEach((d, i) => {
    const label = svgEl('text', {
      x: pL + i * (cW / 6), y: H - 5,
      fill: '#5a5a8a', 'font-size': '9',
      'font-family': 'Inter, sans-serif', 'text-anchor': 'middle'
    });
    label.textContent = dayLabels[pd(d).getDay()];
    svg.append(label);
  });

  container.appendChild(svg);
}

// ---- URGE SPARKLINE (SVG) ----
export function drawUrgeSparkline() {
  const container = document.getElementById('urgeSparkline');
  if (!container) return;

  const W = container.offsetWidth || 300;
  const H = 90;

  container.innerHTML = '';
  const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, width: W, height: H });
  svg.style.overflow = 'visible';

  const days = get7Days();
  const counts = get7DayUrges();
  const max = Math.max(...counts, 1);
  const pL = 8, pR = 8, pT = 8, pB = 18;
  const cW = W - pL - pR, cH = H - pT - pB;
  const step = cW / (days.length - 1);

  // Defs
  const defs = svgEl('defs');
  const grad = svgEl('linearGradient', { id: 'sparkGrad', x1: '0', y1: '0', x2: '0', y2: '1' });
  grad.append(
    svgEl('stop', { offset: '0%', 'stop-color': 'rgba(232,64,64,0.25)' }),
    svgEl('stop', { offset: '100%', 'stop-color': 'rgba(232,64,64,0)' })
  );
  defs.append(grad);
  svg.append(defs);

  const pts = counts.map((c, i) => ({
    x: pL + i * step,
    y: pT + cH * (1 - c / max)
  }));

  // Area
  const areaD = `M ${pts[0].x} ${pts[0].y} ` +
    pts.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ') +
    ` L ${pts[pts.length - 1].x} ${pT + cH} L ${pts[0].x} ${pT + cH} Z`;
  const area = svgEl('path', { d: areaD, fill: 'url(#sparkGrad)', opacity: '0' });
  svg.append(area);

  // Line
  const lineD = `M ${pts[0].x} ${pts[0].y} ` +
    pts.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ');
  const totalLen = pts.reduce((sum, p, i) => {
    if (i === 0) return 0;
    const prev = pts[i - 1];
    return sum + Math.sqrt((p.x - prev.x) ** 2 + (p.y - prev.y) ** 2);
  }, 0);
  const line = svgEl('path', {
    d: lineD, fill: 'none',
    stroke: '#e84040', 'stroke-width': '1.5',
    'stroke-linecap': 'round', 'stroke-linejoin': 'round',
    'stroke-dasharray': totalLen, 'stroke-dashoffset': totalLen
  });
  svg.append(line);

  // Dots
  pts.forEach((p, i) => {
    if (counts[i] > 0) {
      const dot = svgEl('circle', {
        cx: p.x, cy: p.y, r: '2.5',
        fill: '#e84040', opacity: '0'
      });
      svg.append(dot);
      requestAnimationFrame(() => {
        dot.style.transition = `opacity 0.3s ease ${500 + i * 60}ms`;
        dot.setAttribute('opacity', '1');
      });
    }
  });

  // Day labels
  days.forEach((d, i) => {
    const label = svgEl('text', {
      x: pL + i * step, y: H - 4,
      fill: '#5a5a8a', 'font-size': '8',
      'font-family': 'Inter, sans-serif', 'text-anchor': 'middle'
    });
    label.textContent = pd(d).getDate();
    svg.append(label);
  });

  // Animate
  requestAnimationFrame(() => {
    line.style.transition = 'stroke-dashoffset 1s cubic-bezier(0.22,1,0.36,1)';
    line.setAttribute('stroke-dashoffset', '0');
    area.style.transition = 'opacity 0.6s ease 0.5s';
    area.setAttribute('opacity', '1');
  });

  container.appendChild(svg);
}

// ---- RESIZE OBSERVER ----
let resizeObserver = null;

export function initChartObserver() {
  const targets = ['urgeBarChart', 'moodChart', 'urgeSparkline']
    .map(id => document.getElementById(id))
    .filter(Boolean);

  if (!targets.length) return;

  let debounceTimer;
  resizeObserver = new ResizeObserver(() => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      drawUrgeBar();
      drawMoodChart();
      drawUrgeSparkline();
    }, 150);
  });

  targets.forEach(el => resizeObserver.observe(el));
}

export function cleanupCharts() {
  resizeObserver?.disconnect();
}
