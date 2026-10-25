// ============================================================
//  IRON WILL — FOCUS TIMER v3
//  Pomodoro timer, session logging, and deep focus mode
// ============================================================

import { state } from './state.js';
import { showToast } from './toast.js';
import { playSound } from './audio.js';
import { triggerParticles } from './particles.js';

let timerInterval = null;
let timeLeft = 0;
let isRunning = false;
let currentMode = 'work'; // 'work' or 'break'

export function initFocus() {
  const startBtn = document.getElementById('startFocusBtn');
  const stopBtn = document.getElementById('stopFocusBtn');
  const modeBtns = document.querySelectorAll('.focus-mode-btn');

  if (startBtn) startBtn.addEventListener('click', toggleTimer);
  if (stopBtn) stopBtn.addEventListener('click', stopTimer);

  modeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      setMode(btn.dataset.mode);
    });
  });

  resetTimer();
}

function setMode(mode) {
  if (isRunning) {
    if (!confirm('Switching modes will reset the current timer. Continue?')) return;
  }
  currentMode = mode;
  document.querySelectorAll('.focus-mode-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === mode);
  });
  resetTimer();
}

function resetTimer() {
  pauseTimer();
  const mins = currentMode === 'work' 
    ? (state.settings?.focusDuration || 25) 
    : (state.settings?.breakDuration || 5);
  timeLeft = mins * 60;
  updateDisplay();
}

function toggleTimer() {
  if (isRunning) {
    pauseTimer();
  } else {
    startTimer();
  }
}

function startTimer() {
  if (isRunning) return;
  isRunning = true;
  document.getElementById('startFocusBtn').textContent = '⏸ PAUSE';
  document.getElementById('focusCard').classList.add('timer-running');
  
  timerInterval = setInterval(() => {
    timeLeft--;
    updateDisplay();
    if (timeLeft <= 0) {
      completeSession();
    }
  }, 1000);
}

function pauseTimer() {
  isRunning = false;
  clearInterval(timerInterval);
  document.getElementById('startFocusBtn').textContent = '▶ START';
  document.getElementById('focusCard').classList.remove('timer-running');
}

function stopTimer() {
  pauseTimer();
  const mins = currentMode === 'work'
    ? (state.settings?.focusDuration || 25)
    : (state.settings?.breakDuration || 5);
  timeLeft = mins * 60;
  updateDisplay();
}

function updateDisplay() {
  const display = document.getElementById('focusTimerDisplay');
  if (!display) return;
  
  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  const timeStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  display.textContent = timeStr;
  
  // Update browser tab title if needed
  if (isRunning) {
    document.title = `[${timeStr}] Iron Will`;
  } else {
    document.title = 'Iron Will — Warrior Discipline System';
  }
}

function completeSession() {
  stopTimer();
  playSound('clean');
  triggerParticles(window.innerWidth / 2, window.innerHeight / 2, currentMode === 'work' ? '#3b82f6' : '#22c55e', 80);

  if (currentMode === 'work') {
    const duration = state.settings?.focusDuration || 25;
    state.totalXP += 25;
    if (!state.focusSessions) state.focusSessions = [];
    state.focusSessions.push({
      ts: Date.now(),
      duration: duration,
      type: 'work'
    });
    showToast(`Focus session complete! +25 XP 💪`, 'ok');
  } else {
    showToast('Break finished. Ready for focus?', 'info');
  }

  // Auto-switch mode
  setMode(currentMode === 'work' ? 'break' : 'work');
  
  if (state.settings?.autoStartBreak) {
    startTimer();
  }
}

export function toggleFocusOverlay() {
  const overlay = document.getElementById('focusOverlay');
  if (!overlay) return;
  
  const isShown = overlay.style.display === 'flex';
  overlay.style.display = isShown ? 'none' : 'flex';
  
  if (!isShown) {
    // Entering focus mode
    document.getElementById('overlayTimerDisplay').textContent = document.getElementById('focusTimerDisplay').textContent;
    // We can sync them via observers or just simple interval
  }
}
