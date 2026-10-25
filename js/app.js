// ============================================================
//  IRON WILL — WARRIOR DISCIPLINE SYSTEM v3
//  Main Controller & Orchestrator
// ============================================================

import { state, initState, exportState, importState, getDataStats, saveNow } from './state.js';
import { getToday, ds, pd, get7Days, get30Days, get90Days, animateNum, triggerConfetti } from './utils.js';
import { renderCalendar, initCalendar, goToday, drawHeatmap } from './calendar.js';
import { renderHabits, addCustomHabit } from './habits.js';
import { renderJournal, saveJournal, initJournalFilters, renderJournalFull } from './journal.js';
import { renderAchievements, checkAchievements } from './achievements.js';
import { initEmergency, triggerEmergency } from './emergency.js';
import { initParticles, triggerParticles } from './particles.js';
import { initAudio, playSound } from './audio.js';

// V3 NEW MODULES
import { initNavigation, switchTab, getActiveTab } from './navigation.js';
import { renderAnalytics } from './analytics.js';
import { initFocus } from './focus.js';
import { initToast, showToast } from './toast.js';

// ---- CONSTANTS ----
const RANKS = [
  { xp: 0,     title: 'CIVILIAN',   icon: '🧑', sub: 'Begin your transformation.' },
  { xp: 100,   title: 'RECRUIT',    icon: '🛡️', sub: 'The first step is the hardest.' },
  { xp: 300,   title: 'SOLDIER',    icon: '⚔️', sub: 'Consistency is your weapon.' },
  { xp: 750,   title: 'WARRIOR',    icon: '🦁', sub: 'Strength found in discipline.' },
  { xp: 1500,  title: 'KNIGHT',     icon: '🏰', sub: 'A protector of your own mind.' },
  { xp: 3000,  title: 'COMMANDER',  icon: '🦅', sub: 'Mastery over the self.' },
  { xp: 6000,  title: 'VETERAN',    icon: '🐉', sub: 'A legend in the making.' },
  { xp: 12000, title: 'TITAN',      icon: '🌌', sub: 'Ascended beyond the ordinary.' }
];

const BENEFITS = [
  { day: 1,  txt: 'Dopamine receptors begin to reset.' },
  { day: 3,  txt: 'Brain fog begins to lift. Mental clarity improves.' },
  { day: 7,  txt: 'Testosterone levels spike. Energy surges.' },
  { day: 14, txt: 'Increased motivation. Anxiety levels drop.' },
  { day: 30, txt: 'New neural pathways forming. Habit is locking in.' },
  { day: 60, txt: 'Social confidence greatly increased. Eye contact is natural.' },
  { day: 90, txt: 'The "Flatline" ends. Full reboot accomplished.' },
  { day: 180, txt: 'Discipline is now your default state of being.' },
  { day: 365, txt: 'Complete transformation. You are a new person.' }
];

// ---- INITIALIZATION ----
document.addEventListener('DOMContentLoaded', async () => {
  try {
    initToast();
    await initState();
    initParticles();
    initAudio();
    initEmergency();
    initFocus();
    initJournalFilters();
    initNavigation((tabId) => {
      renderTabContent(tabId);
    });

    // Wire global event handlers
    wireEvents();
    installGlobalErrorHandlers();
    initModalFocusTraps();
    registerServiceWorker();

    // Initial check and renders
    checkDaily();
    recalc();
    renderAll();

    // Check achievements periodically
    window.achievementInterval = setInterval(checkAchievements, 10000);

    // Initial render for active tab
    renderTabContent(getActiveTab());

  } catch (err) {
    console.error('App init failed:', err);
    showToast('Iron Will could not finish loading. Refresh to try again.', 'error', 6000);
  }
});

function installGlobalErrorHandlers() {
  window.addEventListener('error', (event) => {
    console.error('Unhandled application error:', event.error || event.message);
  });
  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
  });
  window.addEventListener('storage-error', () => {
    showToast('Storage is full. Export a backup and clear old data.', 'error', 6000);
  });
  window.addEventListener('beforeunload', saveNow);
  window.addEventListener('pagehide', saveNow);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') saveNow();
  });
}

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('./sw.js').then(registration => {
    if (registration.waiting) showToast('A new Iron Will version is ready. Reload to update.', 'info', 6000);
    registration.addEventListener('updatefound', () => {
      const worker = registration.installing;
      worker?.addEventListener('statechange', () => {
        if (worker.state === 'installed' && navigator.serviceWorker.controller) {
          showToast('A new Iron Will version is ready. Reload to update.', 'info', 6000);
        }
      });
    });
  }).catch(error => console.error('Service worker registration failed:', error));
}

function initModalFocusTraps() {
  document.querySelectorAll('[role="dialog"], [role="alertdialog"]').forEach(dialog => {
    dialog.addEventListener('keydown', event => {
      if (event.key !== 'Tab') return;
      const focusable = [...dialog.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )].filter(element => !element.disabled && element.offsetParent !== null);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });
  });
}

/** Re-render whenever state changes */
window.addEventListener('state-changed', () => {
  recalc();
  renderAll();
});

function wireEvents() {
  // Check-in
  document.getElementById('markCleanBtn')?.addEventListener('click', () => markDay('clean'));
  document.getElementById('markRelapseBtn')?.addEventListener('click', () => markDay('relapse'));
  
  // Dashboard
  document.querySelector('.urge-big-btn')?.addEventListener('click', logUrge);
  document.getElementById('emergencyBtn')?.addEventListener('click', triggerEmergency);
  
  // Calendar: Go to today & modal triggers
  document.getElementById('goTodayBtn')?.addEventListener('click', goToday);
  window.addEventListener('show-daily-check', checkDaily);

  // Journal
  document.getElementById('journalSaveBtn')?.addEventListener('click', saveJournal);
  
  // Reflection modal
  document.getElementById('saveReflBtn')?.addEventListener('click', () => {
    const today = getToday();
    if (!state.reflections) state.reflections = {};
    state.reflections[today] = {
      trigger: document.getElementById('trigInp').value.trim(),
      feeling: document.getElementById('feelInp').value.trim(),
      plan: document.getElementById('planInp').value.trim(),
      ts: Date.now()
    };
    state.totalXP += 10;
    document.getElementById('reflModal').style.display = 'none';
    showToast('Reflection saved. Rising stronger. +10 XP 🛡️', 'ok');
    recalc();
    renderAll();
  });
  
  // Arsenal: Custom Habit
  document.getElementById('addHabitBtn')?.addEventListener('click', () => {
    const nameInput = document.getElementById('customHabitName');
    const iconInput = document.getElementById('customHabitIcon');
    const catSelect = document.getElementById('customHabitCat');
    const name = nameInput.value.trim();
    const icon = iconInput.value.trim() || '🔥';
    const cat = catSelect.value;
    if (name) {
      if (addCustomHabit(name, icon, cat)) {
        nameInput.value = '';
        iconInput.value = '';
        renderAll();
      }
    } else {
      showToast('Enter a habit name.', 'warn');
    }
  });

  // Arsenal: Oath
  document.getElementById('showOathBtn')?.addEventListener('click', () => {
    document.getElementById('oathOverlay').style.display = 'flex';
    document.getElementById('oathInput').value = state.oath || '';
    document.getElementById('oathInput').focus();
  });

  document.getElementById('takeOathBtn')?.addEventListener('click', () => {
    const vow = document.getElementById('oathInput').value.trim();
    if (vow) {
      state.oath = vow;
      state.oathDate = getToday();
      state.totalXP += 50;
      showToast('The oath is taken. Live by it. +50 XP ⚔️', 'ok');
      playSound('clean');
      document.getElementById('oathOverlay').style.display = 'none';
      renderAll();
    } else {
      showToast('Write your oath before submitting.', 'warn');
    }
  });

  document.getElementById('closeOathBtn')?.addEventListener('click', () => {
    document.getElementById('oathOverlay').style.display = 'none';
  });

  // Settings: Data
  document.getElementById('exportBtn')?.addEventListener('click', exportState);
  document.getElementById('importFile')?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const text = await file.text();
    if (!confirm('Import this backup? Existing entries are preserved and new entries are merged.')) {
      e.target.value = '';
      return;
    }
    const res = importState(text);
    if (res.success) {
      showToast('Data imported successfully. Reloading...', 'ok');
      setTimeout(() => location.reload(), 1200);
    } else {
      showToast('Import failed. Invalid file.', 'error');
    }
  });

  // Modal close: Level Up
  document.getElementById('closeLevelUpBtn')?.addEventListener('click', () => {
    document.getElementById('levelUpOverlay').style.display = 'none';
  });
}

// ---- LOGIC ----

function checkDaily() {
  const today = getToday();
  const modal = document.getElementById('dailyCheckModal');
  if (!state.days[today]) {
    const sub = document.getElementById('dailyCheckSub');
    if (sub) sub.textContent = `It is ${pd(today).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}. Report your status.`;
    if (modal) modal.style.display = 'flex';
  } else if (modal) {
    modal.style.display = 'none';
  }
}

function markDay(status) {
  const today = getToday();
  const prevStatus = state.days[today];
  state.days[today] = status;
  document.getElementById('dailyCheckModal').style.display = 'none';

  if (status === 'clean') {
    if (prevStatus !== 'clean') {
      state.totalXP += 20;
    }
    showToast('Victory reported. +20 XP 🔥', 'ok');
    playSound('clean');
    triggerParticles(window.innerWidth / 2, window.innerHeight / 2, '#22c55e');
  } else {
    showToast('The fall is not the end. Rise again.', 'warn');
    playSound('relapse');
    document.getElementById('reflModal').style.display = 'flex';
  }
  
  recalc();
  renderAll();
}

function logUrge() {
  const today = getToday();
  const hour = new Date().getHours();
  if (!state.urges) state.urges = [];
  state.urges.push({ ts: Date.now(), date: today, hour: hour });
  if (state.urges.length > 1000) state.urges.splice(0, state.urges.length - 1000);
  state.totalXP += 5;
  showToast('Urge resisted and logged. +5 XP 🛡️', 'info');
  playSound('toggle');
  renderAll();
}

/** Robust core stats & streak calculation */
function recalc() {
  const days = state.days || {};

  // Compute clean and relapse counts
  let cleanCount = 0;
  let relapseCount = 0;
  for (const status of Object.values(days)) {
    if (status === 'clean') cleanCount++;
    else if (status === 'relapse') relapseCount++;
  }
  state.totalClean = cleanCount;
  state.totalRelapses = relapseCount;

  // Compute current consecutive streak backwards from today (or yesterday)
  let streak = 0;
  const cursor = new Date();
  const todayKey = ds(cursor);
  const todayStatus = days[todayKey];

  if (todayStatus === 'clean') {
    streak = 1;
    cursor.setDate(cursor.getDate() - 1);
  } else if (todayStatus === 'relapse') {
    streak = 0;
  } else {
    // Today unmarked yet, check yesterday
    cursor.setDate(cursor.getDate() - 1);
  }

  if (todayStatus !== 'relapse') {
    while (true) {
      const k = ds(cursor);
      if (days[k] === 'clean') {
        streak++;
        cursor.setDate(cursor.getDate() - 1);
      } else {
        break;
      }
    }
  }

  // Compute longest streak historically
  const sortedDays = Object.keys(days).sort();
  let maxStreak = 0;
  let currentRun = 0;
  let previousDay = null;

  for (const dayKey of sortedDays) {
    if (days[dayKey] === 'clean') {
      if (previousDay) {
        const diff = Math.round((pd(dayKey) - pd(previousDay)) / (1000 * 60 * 60 * 24));
        if (diff === 1) {
          currentRun++;
        } else {
          currentRun = 1;
        }
      } else {
        currentRun = 1;
      }
      previousDay = dayKey;
      if (currentRun > maxStreak) maxStreak = currentRun;
    } else {
      currentRun = 0;
      previousDay = null;
    }
  }

  state.curStreak = streak;
  state.longestStreak = Math.max(maxStreak, streak, state.longestStreak || 0);

  // Check rank up
  const oldRank = RANKS.findLast(r => (state.totalXP - 50) >= r.xp)?.title;
  const newRank = RANKS.findLast(r => state.totalXP >= r.xp) || RANKS[0];
  
  if (oldRank && newRank.title !== oldRank && state.totalXP > 0) {
    setTimeout(() => showLevelUp(newRank), 600);
  }
}

function showLevelUp(rank) {
  const overlay = document.getElementById('levelUpOverlay');
  if (!overlay) return;
  document.getElementById('lvlIco').textContent = rank.icon;
  document.getElementById('lvlRank').textContent = rank.title;
  overlay.style.display = 'flex';
  playSound('clean');
  triggerConfetti();
}

// ---- RENDERING ----

/** Global render: updates persistent headers and active tab */
function renderAll() {
  // Risk Badge
  const riskBadge = document.getElementById('riskBadge');
  const last7 = get7Days();
  const relapses = last7.filter(d => state.days[d] === 'relapse').length;
  const urges = (state.urges || []).filter(u => last7.includes(u.date)).length;
  
  if (riskBadge) {
    if (relapses > 0 || urges > 3) {
      riskBadge.textContent = '🔴 High Risk';
      riskBadge.className = 'risk-indicator risk-high';
    } else if (urges > 1) {
      riskBadge.textContent = '🟡 Moderate Risk';
      riskBadge.className = 'risk-indicator risk-med';
    } else {
      riskBadge.textContent = '🟢 Low Risk';
      riskBadge.className = 'risk-indicator risk-low';
    }
  }

  // Header Power Score
  const powerVal = Math.max(0, state.curStreak * 10 + state.totalClean * 5 - state.totalRelapses * 10);
  animateNum('powerScore', powerVal);

  // Re-render currently active tab
  renderTabContent(getActiveTab());
}

/** Tab-specific rendering */
function renderTabContent(tabId) {
  switch (tabId) {
    case 'dashboard':
      renderDashboard();
      break;
    case 'calendar':
      initCalendar();
      renderCalendar();
      drawHeatmap();
      break;
    case 'analytics':
      renderAnalytics();
      break;
    case 'journal':
      renderJournal();
      renderJournalFull();
      break;
    case 'arsenal':
      renderArsenal();
      break;
  }
}

function renderDashboard() {
  // Rank Strip
  const rank = RANKS.findLast(r => state.totalXP >= r.xp) || RANKS[0];
  const nextRank = RANKS[RANKS.indexOf(rank) + 1];
  
  const rankIcon = document.getElementById('rankIcon');
  const rankTitle = document.getElementById('rankTitle');
  if (rankIcon) rankIcon.textContent = rank.icon;
  if (rankTitle) {
    rankTitle.textContent = rank.title;
    if (rankTitle.nextElementSibling) rankTitle.nextElementSibling.textContent = rank.sub;
  }
  
  const xpBar = document.getElementById('xpBar');
  const xpCurrent = document.getElementById('xpCurrent');
  const xpNext = document.getElementById('xpNext');

  if (nextRank) {
    const progress = Math.min(100, Math.max(0, ((state.totalXP - rank.xp) / (nextRank.xp - rank.xp)) * 100));
    if (xpBar) xpBar.style.width = `${progress}%`;
    if (xpCurrent) xpCurrent.textContent = `${state.totalXP} XP`;
    if (xpNext) xpNext.textContent = `→ ${nextRank.xp - state.totalXP} XP to ${nextRank.title}`;
  } else {
    if (xpBar) xpBar.style.width = '100%';
    if (xpCurrent) xpCurrent.textContent = `${state.totalXP} XP`;
    if (xpNext) xpNext.textContent = 'MAX RANK ACHIEVED';
  }

  animateNum('rs1', state.totalClean);
  animateNum('rs3', (state.urges || []).length);
  
  animateNum('sCurStreak', state.curStreak);
  animateNum('sLongStreak', state.longestStreak);
  animateNum('sTotalXP', state.totalXP);

  const todayUrges = (state.urges || []).filter(u => u.date === getToday()).length;
  const urgeCountEl = document.getElementById('urgeCountToday');
  if (urgeCountEl) {
    urgeCountEl.textContent = `${todayUrges} urge${todayUrges === 1 ? '' : 's'} today`;
  }

  renderHabits();
  renderProgressRings();
}

function renderProgressRings() {
  const rings = [
    { id: 'ring7',  pctId: 'ring7pct',  days: 7 },
    { id: 'ring30', pctId: 'ring30pct', days: 30 },
    { id: 'ring90', pctId: 'ring90pct', days: 90 }
  ];

  rings.forEach(r => {
    const range = r.days === 7 ? get7Days() : (r.days === 30 ? get30Days() : get90Days());
    const cleanCount = range.filter(d => state.days[d] === 'clean').length;
    const pct = Math.round((cleanCount / r.days) * 100);
    
    const ring = document.getElementById(r.id);
    if (ring) {
      const circ = 2 * Math.PI * 38;
      ring.style.strokeDashoffset = circ - (pct / 100) * circ;
    }
    const pctEl = document.getElementById(r.pctId);
    if (pctEl) pctEl.textContent = `${pct}%`;
  });
}

function renderArsenal() {
  renderAchievements();
  renderHabits();
  
  // Oath
  const oathText = document.getElementById('oathDisplayText');
  const oathCta = document.getElementById('oathCta');
  const oathDisplay = document.getElementById('oathDisplay');

  if (state.oath) {
    if (oathText) oathText.textContent = state.oath;
    const oathSig = document.getElementById('oathDisplayDate');
    if (oathSig) oathSig.textContent = `Sworn on ${state.oathDate || getToday()}`;
    if (oathCta) oathCta.style.display = 'none';
    if (oathDisplay) oathDisplay.style.display = 'block';
  } else {
    if (oathDisplay) oathDisplay.style.display = 'none';
    if (oathCta) oathCta.style.display = 'block';
  }

  // Benefits
  const benList = document.getElementById('benefitsList');
  if (benList) {
    benList.innerHTML = BENEFITS.map(b => {
      const unlocked = state.curStreak >= b.day;
      return `<div class="benefit-item ${unlocked ? 'unlocked' : 'locked'}">
        <div class="ben-day">Day ${b.day}</div>
        <div class="ben-txt">${b.txt}</div>
      </div>`;
    }).join('');
  }

  // Data Stats
  const statsEl = document.getElementById('dataStats');
  if (statsEl) {
    const stats = getDataStats();
    statsEl.innerHTML = `
      Tracked Days: ${stats.totalDays}<br>
      Journal Entries: ${stats.totalJournals}<br>
      Urges Defeated: ${stats.totalUrges}<br>
      Focus Sessions: ${stats.totalFocusSessions}<br>
      Database Size: ${(stats.dataSize / 1024).toFixed(1)} KB
    `;
  }
}
