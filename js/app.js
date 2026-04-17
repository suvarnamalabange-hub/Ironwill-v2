// ============================================================
//  IRON WILL — MAIN APP CONTROLLER
//  Init, event wiring, state coordination
// ============================================================

import { state, initState, exportState, saveNow } from './state.js';
import { ds, pd, getToday, isToday, isFuture, animNum, get7Days, esc, debounce, DAYS } from './utils.js';
import { initCalendar, renderCalendar, goToday } from './calendar.js';
import { drawUrgeBar, drawMoodChart, drawUrgeSparkline, initChartObserver } from './charts.js';
import { renderHabits, HABITS, habitStreakMax } from './habits.js';
import { saveJournal, renderJournal } from './journal.js';
import { checkAchievements, renderAchievements, ACHIEVEMENTS } from './achievements.js';
import { initEmergency, closeEmergency } from './emergency.js';
import { initParticles, triggerParticles } from './particles.js';
import { playSound } from './audio.js';

// ---- CONSTANTS ----
const RANKS = [
  { name: 'CIVILIAN',   icon: '🧑', xp: 0,     sub: 'The journey begins. Most men never start.' },
  { name: 'INITIATE',   icon: '🥋', xp: 100,   sub: 'You chose discipline. That alone separates you.' },
  { name: 'SOLDIER',    icon: '⚔️', xp: 300,   sub: 'You have tasted real resistance. Keep fighting.' },
  { name: 'WARRIOR',    icon: '🛡️', xp: 700,   sub: 'Urges bend to your will. You are building armor.' },
  { name: 'IRON WILL',  icon: '🔱', xp: 1500,  sub: 'Few reach this. Fewer sustain it. You are rare.' },
  { name: 'TITAN',      icon: '⚡', xp: 3000,  sub: 'You are the standard. Others look up to you.' },
  { name: 'LEGEND',     icon: '🦁', xp: 5000,  sub: 'Elite. Unbreakable. A living proof of discipline.' },
  { name: 'ASCENDED',   icon: '👑', xp: 10000, sub: 'You have conquered yourself. The highest victory.' },
];

const BENEFITS = [
  { day: 1,   title: 'Mental Clarity',      desc: 'Brain fog starts lifting. You feel more present.' },
  { day: 3,   title: 'Energy Surge',        desc: 'Testosterone begins rising. More vitality.' },
  { day: 5,   title: 'Better Sleep',        desc: 'Deeper, more restorative sleep cycles.' },
  { day: 7,   title: 'Confidence Boost',    desc: 'Week-1 testosterone spike. Eye contact feels natural.' },
  { day: 14,  title: 'Social Magnetism',    desc: 'Others notice something different about you.' },
  { day: 21,  title: 'Laser Focus',         desc: 'Deep work becomes natural. Distraction fades.' },
  { day: 30,  title: 'Identity Shift',      desc: 'You are no longer the same person. Monk mode unlocked.' },
  { day: 45,  title: 'Emotional Mastery',   desc: 'You respond instead of react. Calm under fire.' },
  { day: 60,  title: 'Peak Creativity',     desc: 'Creative energy surges. Ideas flow effortlessly.' },
  { day: 90,  title: 'Full Rewire',         desc: 'Neural pathways rebuilt. The old you is gone.' },
  { day: 120, title: 'Natural Confidence',  desc: 'Confidence is automatic, not performed.' },
  { day: 180, title: 'Life Transformation', desc: 'Career, relationships, physique — all upgraded.' },
  { day: 365, title: 'The Ascended',        desc: 'A year. You are proof that anything is possible.' },
];

const QUOTES = [
  { text: 'You either control your urges or they control your life.', author: 'Iron Will' },
  { text: 'Weak men chase pleasure. Strong men build discipline.', author: 'Iron Will' },
  { text: 'Every time you resist, you become harder to break.', author: 'Unknown' },
  { text: 'The pain of discipline is nothing compared to the pain of regret.', author: 'Iron Will' },
  { text: 'Your future self is watching your choices right now.', author: 'Iron Will' },
  { text: 'Champions are made in moments when they want to quit most.', author: 'Iron Will' },
  { text: 'You are not your urges. You are your decisions.', author: 'Iron Will' },
  { text: 'The body achieves what the mind believes.', author: 'Napoleon Hill' },
  { text: 'Do not pray for an easy life. Pray for the strength to endure a difficult one.', author: 'Bruce Lee' },
  { text: 'Discipline is the bridge between goals and accomplishment.', author: 'Jim Rohn' },
  { text: 'The successful warrior is the average man, with laser-like focus.', author: 'Bruce Lee' },
  { text: 'Self-control is strength. Calmness is mastery.', author: 'James Allen' },
  { text: 'Every moment of resistance is a deposit into your future self.', author: 'Iron Will' },
  { text: 'Hard times create strong men. Strong men create easy times.', author: 'Michael Hopf' },
  { text: 'Your only competition is the man you were yesterday.', author: 'Iron Will' },
];

// ---- MODULE STATE ----
let qIdx = Math.floor(Math.random() * QUOTES.length);
let prevRankIdx = 0;
let toastTimer = null;

// ---- TOAST ----
export function showToast(msg, type = 'ok') {
  const t = document.getElementById('toast');
  if (!t) return;
  t.innerHTML = msg;
  t.className = `toast ${type}`;
  t.style.display = 'flex';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    t.classList.add('closing');
    setTimeout(() => { t.style.display = 'none'; t.classList.remove('closing'); }, 250);
  }, 3500);
}

// ---- RECALCULATE ----
function recalc() {
  const today = getToday();
  const all = Object.keys(state.days).sort();
  let totalClean = 0, totalRelapses = 0;
  let streak = 0, longest = 0;

  if (all.length) {
    const start = pd(all[0]);
    const end = new Date(today);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const k = ds(d);
      if (state.days[k] === 'clean') {
        streak++;
        totalClean++;
        if (streak > longest) longest = streak;
      } else if (state.days[k] === 'relapse') {
        streak = 0;
        totalRelapses++;
      }
    }
  }

  // Current streak going back from today
  let curStreak = 0;
  for (let d = new Date(today); ; d.setDate(d.getDate() - 1)) {
    if (state.days[ds(d)] === 'clean') curStreak++;
    else break;
    if (d <= pd(all[0] || today)) break;
  }

  // XP calculation
  let totalXP = 0;
  for (const k of Object.keys(state.days)) {
    if (state.days[k] === 'clean') {
      totalXP += 50;
      if (curStreak >= 7) totalXP += 20;
      if (curStreak >= 30) totalXP += 30;
    }
  }
  // Habit XP
  if (state.habitLog) {
    for (const date of Object.keys(state.habitLog)) {
      const h = state.habitLog[date] || {};
      totalXP += Object.values(h).filter(Boolean).length * 10;
    }
  }
  // Urge resist XP
  totalXP += (state.urges || []).length * 5;
  // Journal XP
  totalXP += Object.keys(state.journals || {}).length * 15;

  // Update state (batched — proxy handles notification)
  state.totalClean = totalClean;
  state.totalRelapses = totalRelapses;
  state.curStreak = curStreak;
  state.longestStreak = Math.max(longest, state.longestStreak || 0);
  state.totalXP = totalXP;
}

// ---- RANK ----
function rankIdx() {
  const xp = state.totalXP || 0;
  let ri = 0;
  for (let i = RANKS.length - 1; i >= 0; i--) {
    if (xp >= RANKS[i].xp) { ri = i; break; }
  }
  return ri;
}

function updateRank() {
  const ri = rankIdx();
  const r = RANKS[ri];
  const nextR = RANKS[ri + 1];
  const xp = state.totalXP || 0;
  const startXP = r.xp;
  const endXP = nextR ? nextR.xp : r.xp + 1;
  const pct = nextR ? Math.min(100, Math.round(((xp - startXP) / (endXP - startXP)) * 100)) : 100;

  const el = (id) => document.getElementById(id);
  el('rankTitle').textContent = r.name;
  el('rankIcon').textContent = r.icon;
  document.querySelector('.rank-sub').textContent = r.sub;
  el('xpBar').style.width = pct + '%';
  el('xpCurrent').textContent = xp + ' XP';
  el('xpNext').textContent = nextR ? `→ ${nextR.xp} XP for ${nextR.name}` : '✨ Max Rank Achieved';

  // Level up?
  if (ri > prevRankIdx) {
    setTimeout(() => showLevelUp(r), 800);
    prevRankIdx = ri;
  }
}

function showLevelUp(r) {
  document.getElementById('lvlIco').textContent = r.icon;
  document.getElementById('lvlRank').textContent = r.name;
  document.getElementById('levelUpOverlay').style.display = 'flex';
  triggerParticles(window.innerWidth / 2, window.innerHeight / 2, '#f5c842', 120);
  playSound('levelup');
}

function closeLevelUp() {
  document.getElementById('levelUpOverlay').style.display = 'none';
}

// ---- STATS ----
function updateStats() {
  animNum(document.getElementById('sCurStreak'), state.curStreak || 0);
  animNum(document.getElementById('sLongStreak'), state.longestStreak || 0);
  animNum(document.getElementById('sTotalClean'), state.totalClean || 0);
  animNum(document.getElementById('sTotalRel'), state.totalRelapses || 0);
  animNum(document.getElementById('sTotalXP'), state.totalXP || 0);

  // Power score
  const power = Math.floor((state.totalXP || 0) * (1 + (state.curStreak || 0) * 0.02));
  animNum(document.getElementById('powerScore'), power);

  // Rank stats
  const marked = Object.keys(state.days).length;
  const winRate = marked ? Math.round((state.totalClean / marked) * 100) : 0;
  document.getElementById('rs1').textContent = state.totalClean || 0;
  document.getElementById('rs2').textContent = winRate + '%';
  document.getElementById('rs3').textContent = (state.urges || []).length;

  // Analytics bars
  document.getElementById('cleanRateLbl').textContent = winRate + '%';
  setTimeout(() => {
    document.getElementById('cleanRateBar').style.width = winRate + '%';
  }, 300);

  const totalHabitDays = Object.values(state.habitLog || {}).length;
  const filledDays = Object.values(state.habitLog || {}).filter(h => Object.values(h || {}).some(Boolean)).length;
  const hr = totalHabitDays ? Math.round((filledDays / totalHabitDays) * 100) : 0;
  document.getElementById('habitRateLbl').textContent = hr + '%';
  setTimeout(() => {
    document.getElementById('habitRateBar').style.width = hr + '%';
  }, 400);
}

// ---- RINGS ----
function renderRings() {
  const str = state.curStreak || 0;
  const circ = 238.76;

  [
    [7, 'ring7', 'ring7pct', 'ring7day'],
    [30, 'ring30', 'ring30pct', 'ring30day'],
    [90, 'ring90', 'ring90pct', 'ring90day']
  ].forEach(([goal, rid, pid, did]) => {
    const pct = Math.min(100, Math.round((str / goal) * 100));
    const offset = circ - (circ * pct / 100);
    const el = document.getElementById(rid);
    if (el) {
      setTimeout(() => { el.style.strokeDashoffset = offset; }, 200);
    }
    const pctEl = document.getElementById(pid);
    if (pctEl) pctEl.textContent = pct + '%';
    const dayEl = document.getElementById(did);
    if (dayEl) dayEl.textContent = `${Math.min(str, goal)}/${goal}`;
  });
}

// ---- BENEFITS ----
function renderBenefits() {
  const streak = state.curStreak || 0;
  const list = document.getElementById('benefitsList');
  if (!list) return;

  list.innerHTML = BENEFITS.map((b, i) => {
    const unlocked = streak > b.day;
    const active = streak === b.day || (i > 0 && streak >= BENEFITS[i - 1].day && streak < b.day);
    const cls = unlocked ? 'unlocked' : active ? 'active' : '';
    return `<div class="benefit-item">
      ${i < BENEFITS.length - 1 ? '<div class="b-line"></div>' : ''}
      <div class="b-dot ${cls}"></div>
      <div class="b-content">
        <div class="b-day ${cls ? cls + '-lbl' : ''}">${unlocked ? '✓ ' : active ? '▶ ' : ''}Day ${b.day}</div>
        <div class="b-title" style="color:${unlocked ? 'var(--green)' : active ? 'var(--gold)' : 'var(--text-100)'}">${b.title}</div>
        <div class="b-desc">${b.desc}</div>
      </div>
    </div>`;
  }).join('');
}

// ---- HEATMAP ----
function renderHeatmap() {
  const grid = document.getElementById('heatmapGrid');
  if (!grid) return;
  const counts = Array(24).fill(0);
  (state.urges || []).forEach(u => { if (u.hour !== undefined) counts[u.hour]++; });
  const max = Math.max(...counts, 1);

  grid.innerHTML = counts.map((c, i) => {
    const pct = c / max;
    const r = Math.round(232 * pct);
    const g = Math.round(64 * pct);
    const bg = c > 0 ? `rgba(${r},${g},64,${0.12 + pct * 0.7})` : '';
    return `<div class="hm-cell" style="${bg ? `background:${bg}` : ''}" title="${i}:00 — ${c} urge${c !== 1 ? 's' : ''}">
      <div class="hm-tooltip">${i}:00 — ${c} urges</div>
    </div>`;
  }).join('');
}

// ---- URGE SECTION ----
function renderUrgeSection() {
  const today = getToday();
  const todayUrges = (state.urges || []).filter(u => u.date === today);
  const countEl = document.getElementById('urgeCountToday');
  if (countEl) countEl.textContent = `${todayUrges.length} urge${todayUrges.length !== 1 ? 's' : ''} logged today`;

  const log = document.getElementById('urgeLogList');
  if (!log) return;
  if (!todayUrges.length) { log.innerHTML = ''; return; }

  log.innerHTML = [...todayUrges].reverse().slice(0, 5).map(u => {
    const t = new Date(u.ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    return `<div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid rgba(255,255,255,0.04);font-size:11px;color:var(--text-muted)">
      <span>⚡ Urge</span><span>${t}</span>
    </div>`;
  }).join('');
}

function logUrge() {
  const today = getToday();
  if (!state.urges) state.urges = [];
  state.urges.push({ ts: Date.now(), date: today, hour: new Date().getHours() });

  renderUrgeSection();
  updateStats();
  updateRank();
  renderHeatmap();
  showToast('Urge logged. Awareness + breath = victory.', 'warn');
  playSound('urge');
  drawUrgeSparkline();
  drawUrgeBar();
}

// ---- MOOD ----
function renderMoodSection() {
  const today = getToday();
  const mood = (state.moods || {})[today];
  if (mood) {
    const emojis = ['', '😣', '😞', '😐', '😊', '🤩'];
    const labels = ['', 'Terrible', 'Bad', 'Neutral', 'Good', 'Amazing'];
    const result = document.getElementById('moodResult');
    if (result) result.textContent = `Today's mood: ${emojis[mood]} ${labels[mood]}`;
    document.querySelectorAll('.mood-btn').forEach(b => {
      b.classList.toggle('selected', parseInt(b.dataset.mood) === mood);
    });
  }
}

function logMood(val) {
  const today = getToday();
  if (!state.moods) state.moods = {};
  state.moods[today] = val;
  renderMoodSection();
  renderCalendar();
  const labels = ['', 'Terrible', 'Bad', 'Neutral', 'Good', 'Amazing'];
  showToast(`Mood logged: ${labels[val]}`, 'info');
  drawMoodChart();
}

// ---- REFLECTIONS ----
function saveRefl() {
  const trig = document.getElementById('trigInp')?.value.trim();
  const feel = document.getElementById('feelInp')?.value.trim();
  const plan = document.getElementById('planInp')?.value.trim();
  if (!trig || !feel) { showToast('Fill in both fields. Honesty heals.', 'warn'); return; }

  const today = getToday();
  if (!state.reflections) state.reflections = {};
  state.reflections[today] = { trig, feel, plan, date: today };
  renderAll();
  document.getElementById('reflModal').style.display = 'none';
  showToast('Reflection saved. Awareness is the first step. 💪', 'ok');
}

function renderReflections() {
  const list = document.getElementById('reflList');
  if (!list) return;
  const keys = Object.keys(state.reflections || {}).sort().reverse();
  if (!keys.length) {
    list.innerHTML = '<div class="empty-state">No relapses recorded. Keep going. 💪</div>';
    return;
  }
  list.innerHTML = keys.slice(0, 8).map(k => {
    const r = state.reflections[k];
    const d = pd(k).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return `<div class="reflection-item">
      <div class="ref-date">${d}</div>
      <div class="ref-trigger">⚡ ${esc(r.trig)}</div>
      <div class="ref-feel">💭 ${esc(r.feel)}</div>
      ${r.plan ? `<div style="font-size:var(--fs-xs);color:var(--blue);margin-top:3px">📋 ${esc(r.plan)}</div>` : ''}
    </div>`;
  }).join('');
}

// ---- WEEK CELLS & REPORT ----
function renderWeekCells() {
  const days = get7Days();
  const grid = document.getElementById('weekCells');
  if (!grid) return;
  const letters = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const today = getToday();

  grid.innerHTML = days.map(d => {
    const st = state.days[d];
    const todayFlag = isToday(d);
    const dow = pd(d).getDay();
    let bg = 'rgba(255,255,255,0.04)', color = 'var(--text-muted)';
    if (st === 'clean') { bg = 'rgba(34,197,94,0.15)'; color = 'var(--green)'; }
    if (st === 'relapse') { bg = 'rgba(232,64,64,0.15)'; color = 'var(--red)'; }
    const brd = todayFlag ? '1px solid rgba(245,200,66,0.45)' : '1px solid transparent';
    return `<div style="aspect-ratio:1;border-radius:var(--rad-sm);background:${bg};border:${brd};display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:9px;font-weight:700;color:${color};gap:2px">
      <span>${letters[dow]}</span>
      <span style="font-size:8px">${st === 'clean' ? '✓' : st === 'relapse' ? '✗' : '·'}</span>
    </div>`;
  }).join('');
}

function renderWeekReport() {
  const days = get7Days();
  let clean = 0, rel = 0, urges = 0, journals = 0, habits = 0;

  days.forEach(d => {
    if (state.days[d] === 'clean') clean++;
    if (state.days[d] === 'relapse') rel++;
    urges += (state.urges || []).filter(u => u.date === d).length;
    if (state.journals && Object.values(state.journals).some(j => j.date === d)) journals++;
    const hl = (state.habitLog || {})[d] || {};
    habits += Object.values(hl).filter(Boolean).length;
  });

  const total = clean + rel;
  const pct = total ? (clean / total) * 100 : 0;
  let grade = '—', gc = 'var(--text-muted)';
  if (total > 0) {
    if (pct === 100) { grade = 'A+'; gc = 'var(--gold)'; }
    else if (pct >= 85) { grade = 'A'; gc = 'var(--green)'; }
    else if (pct >= 70) { grade = 'B'; gc = 'var(--blue)'; }
    else if (pct >= 55) { grade = 'C'; gc = 'var(--amber)'; }
    else if (pct >= 40) { grade = 'D'; gc = 'var(--red)'; }
    else { grade = 'F'; gc = 'var(--red)'; }
  }

  const gradeEl = document.getElementById('weekGrade');
  if (gradeEl) {
    gradeEl.textContent = grade;
    gradeEl.style.color = gc;
  }

  const rows = document.getElementById('weekReportRows');
  if (rows) {
    rows.innerHTML = [
      ['Clean Days', clean + '/7'],
      ['Relapses', rel],
      ['Urges Fought', urges],
      ['Journal Entries', journals],
      ['Habit Completions', habits],
      ['Win Rate', total ? Math.round(pct) + '%' : '—'],
    ].map(([l, v]) => `<div class="report-row"><span class="report-lbl">${l}</span><span class="report-val">${v}</span></div>`).join('');
  }
}

// ---- PATTERN ANALYSIS ----
function renderPatternAnalysis() {
  const panel = document.getElementById('patternAnalysis');
  if (!panel) return;

  const relapses = Object.entries(state.reflections || {});
  const allDays = Object.keys(state.days);
  if (allDays.length < 5) {
    panel.innerHTML = '<div class="empty-state">Log more days to see patterns emerge.</div>';
    return;
  }

  const dowCounts = Array(7).fill(0);
  relapses.forEach(([d]) => { dowCounts[pd(d).getDay()]++; });
  const maxDOW = dowCounts.indexOf(Math.max(...dowCounts));
  const triggers = relapses.map(([, r]) => r.trig || '').join(' ').toLowerCase();
  const topTriggers = ['stress', 'boredom', 'loneliness', 'tired', 'night', 'social'].filter(t => triggers.includes(t));
  const avgStreak = allDays.length / Math.max(1, (state.totalRelapses || 0) + 1);

  panel.innerHTML = `
    <div style="margin-bottom:var(--sp-3)">
      <div style="font-size:var(--fs-xs);color:var(--text-muted);text-transform:uppercase;letter-spacing:var(--ls-wide);margin-bottom:var(--sp-1)">Risk Day</div>
      <div style="font-size:var(--fs-base);font-weight:var(--fw-semibold);color:var(--red)">${DAYS[maxDOW]}s are your most vulnerable day</div>
    </div>
    <div style="margin-bottom:var(--sp-3)">
      <div style="font-size:var(--fs-xs);color:var(--text-muted);text-transform:uppercase;letter-spacing:var(--ls-wide);margin-bottom:var(--sp-1)">Avg Streak Before Relapse</div>
      <div style="font-size:var(--fs-base);font-weight:var(--fw-semibold);color:var(--gold)">${Math.round(avgStreak)} days</div>
    </div>
    ${topTriggers.length ? `<div>
      <div style="font-size:var(--fs-xs);color:var(--text-muted);text-transform:uppercase;letter-spacing:var(--ls-wide);margin-bottom:var(--sp-2)">Identified Triggers</div>
      <div style="display:flex;flex-wrap:wrap;gap:6px">${topTriggers.map(t => `<span style="padding:3px 10px;background:rgba(232,64,64,0.08);border:1px solid rgba(232,64,64,0.18);border-radius:var(--rad-xs);font-size:var(--fs-xs);color:var(--red)">${t}</span>`).join('')}</div>
    </div>` : ''}
  `;
}

// ---- RISK BADGE ----
function updateRiskBadge() {
  const h = new Date().getHours();
  const urgesRecent = (state.urges || []).filter(u => Date.now() - u.ts < 3600000).length;
  const badge = document.getElementById('riskBadge');
  if (!badge) return;

  let risk = 'low';
  if (h >= 22 || h <= 5) risk = 'high';
  else if (h >= 18 && h < 22) risk = 'med';
  if (urgesRecent >= 2) risk = 'high';

  badge.className = 'risk-indicator';
  if (risk === 'low') { badge.classList.add('risk-low'); badge.innerHTML = '🟢 Low Risk'; }
  if (risk === 'med') { badge.classList.add('risk-med'); badge.innerHTML = '🟡 Moderate Risk'; }
  if (risk === 'high') { badge.classList.add('risk-high'); badge.innerHTML = '🔴 High Risk — Stay Vigilant'; }
}

// ---- OATH ----
function showOath() {
  if (state.oath) {
    document.getElementById('oathInput').value = state.oath;
  }
  document.getElementById('oathOverlay').style.display = 'flex';
}

function closeOath() {
  document.getElementById('oathOverlay').style.display = 'none';
}

function takeOath() {
  const txt = document.getElementById('oathInput')?.value.trim();
  if (!txt) { showToast('Write your oath first.', 'warn'); return; }
  state.oath = txt;
  state.oathDate = getToday();
  closeOath();
  renderOath();
  recalc();
  checkAchievements();
  renderAchievements();
  triggerParticles(window.innerWidth / 2, window.innerHeight / 2, '#f5c842', 80);
  showToast('⚔️ Oath sworn. This is your contract with yourself.', 'ok');
}

function renderOath() {
  const disp = document.getElementById('oathDisplay');
  const cta = document.getElementById('oathCta');
  if (!disp || !cta) return;

  if (state.oath) {
    disp.style.display = 'block';
    cta.style.display = 'none';
    document.getElementById('oathDisplayText').textContent = state.oath;
    const d = pd(state.oathDate || getToday()).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    document.getElementById('oathDisplayDate').textContent = `Sworn on ${d}`;
  } else {
    disp.style.display = 'none';
    cta.style.display = 'block';
  }
}

// ---- DAILY CHECK ----
function showDailyCheck() {
  const now = new Date();
  const d = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  const sub = document.getElementById('dailyCheckSub');
  if (sub) {
    sub.innerHTML = `<strong style="color:var(--gold)">${d}</strong><br><br>Did you stay clean today?<br><span style="font-size:var(--fs-xs);color:var(--text-muted)">Warriors don't hide from the truth.</span>`;
  }
  document.getElementById('dailyCheckModal').style.display = 'flex';
}

function markDay(status) {
  const today = getToday();
  document.getElementById('dailyCheckModal').style.display = 'none';
  state.days[today] = status;
  recalc();

  if (status === 'clean') {
    playSound('clean');
    triggerParticles(window.innerWidth / 2, 200, '#22c55e', 60);
    showToast(`✅ Clean day logged! Streak: ${state.curStreak} days 🔥`, 'ok');
    if ([7, 30, 90, 365].includes(state.curStreak)) {
      setTimeout(() => showToast(`🏆 ${state.curStreak}-DAY MILESTONE! You are extraordinary.`, 'ok'), 1500);
      triggerParticles(window.innerWidth / 2, window.innerHeight / 2, '#f5c842', 100);
    }
  } else {
    playSound('relapse');
    showToast('Day logged. Every fall is a lesson. Rise.', 'err');
    setTimeout(() => { document.getElementById('reflModal').style.display = 'flex'; }, 600);
  }

  renderAll();
}

function checkDailyStatus() {
  const today = getToday();
  if (!state.days[today]) {
    setTimeout(showDailyCheck, 700);
  }
  renderMoodSection();
}

// ---- NIGHT WARNING ----
function checkNightWarning() {
  const h = new Date().getHours();
  if (h >= 22 || h <= 4) {
    setTimeout(() => showToast('🌙 High-risk hours (10pm–5am). Stay strong.', 'warn'), 2000);
  }
}

// ---- QUOTE ----
function showQuote() {
  const q = QUOTES[qIdx];
  const el = document.getElementById('quoteTxt');
  const auth = document.getElementById('quoteAuthor');
  if (el) el.textContent = q.text;
  if (auth) auth.textContent = '— ' + q.author;
}

function nextQuote() {
  qIdx = (qIdx + 1) % QUOTES.length;
  const q = QUOTES[qIdx];
  const el = document.getElementById('quoteTxt');
  if (el) {
    el.style.opacity = '0';
    el.style.transition = 'opacity 0.3s';
    setTimeout(() => {
      el.textContent = q.text;
      el.style.opacity = '1';
    }, 300);
  }
  const auth = document.getElementById('quoteAuthor');
  if (auth) auth.textContent = '— ' + q.author;
}

// ---- RENDER ALL ----
function renderAll() {
  recalc();
  checkAchievements();
  updateStats();
  updateRank();
  renderCalendar();
  renderHabits();
  renderBenefits();
  renderAchievements();
  renderReflections();
  renderJournal();
  renderUrgeSection();
  renderWeekCells();
  renderWeekReport();
  renderHeatmap();
  renderRings();
  renderPatternAnalysis();
  updateRiskBadge();

  setTimeout(() => {
    drawUrgeBar();
    drawMoodChart();
    drawUrgeSparkline();
  }, 100);
}

// ---- WIRE EVENTS ----
function wireEvents() {
  // Global event delegation
  document.addEventListener('click', (e) => {
    const target = e.target;

    // Urge button
    if (target.closest('.urge-big-btn')) { logUrge(); return; }

    // Mood buttons
    const moodBtn = target.closest('.mood-btn');
    if (moodBtn) { logMood(parseInt(moodBtn.dataset.mood)); return; }

    // Quote refresh
    if (target.closest('#quoteRefreshBtn')) { nextQuote(); return; }

    // Journal save
    if (target.closest('#journalSaveBtn')) { saveJournal(); return; }

    // Oath buttons
    if (target.closest('#showOathBtn') || target.closest('#oathCtaBtn')) { showOath(); return; }
    if (target.closest('#closeOathBtn')) { closeOath(); return; }
    if (target.closest('#takeOathBtn')) { takeOath(); return; }

    // Mark day
    if (target.closest('#markCleanBtn')) { markDay('clean'); return; }
    if (target.closest('#markRelapseBtn')) { markDay('relapse'); return; }

    // Save reflection
    if (target.closest('#saveReflBtn')) { saveRefl(); return; }

    // Close emergency
    if (target.closest('#closeEmergencyBtn')) { closeEmergency(); return; }

    // Level up
    if (target.closest('#closeLevelUpBtn')) { closeLevelUp(); return; }

    // Go today
    if (target.closest('#goTodayBtn')) { goToday(); return; }

    // Export
    if (target.closest('#exportBtn')) {
      exportState();
      showToast('Data exported. Keep a backup.', 'info');
      return;
    }
  });

  // Custom events
  window.addEventListener('show-daily-check', showDailyCheck);
  window.addEventListener('state-changed', () => {
    recalc();
    updateStats();
    updateRank();
    checkAchievements();
    renderAchievements();
  });

  // Risk badge auto-update
  setInterval(updateRiskBadge, 60000);
}

// ---- INIT ----
export async function init() {
  // Initialize state from IndexedDB/localStorage
  await initState();
  prevRankIdx = rankIdx();

  // Initialize sub-modules
  initParticles();
  initCalendar();
  initEmergency();
  initChartObserver();

  // Wire all events
  wireEvents();

  // Initial render
  showQuote();
  renderAll();
  renderOath();
  checkDailyStatus();
  checkNightWarning();

  // Register service worker
  if ('serviceWorker' in navigator) {
    try {
      await navigator.serviceWorker.register('./sw.js');
    } catch (e) {
      console.log('SW registration skipped:', e.message);
    }
  }

  console.log('%c⚔️ IRON WILL — WARRIOR SYSTEM v2.0', 'color:#f5c842;font-size:16px;font-weight:bold;');
  console.log('%cDark Glassmorphism Edition', 'color:#5a5a8a;font-size:11px;');
}

// Boot
init();
