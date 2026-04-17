// ============================================================
//  IRON WILL — EMERGENCY MODE
//  Emergency overlay + 4-7-8 breathing exercise
// ============================================================

import { playSound } from './audio.js';
import { showToast } from './app.js';

const EMERGENCY_MSGS = [
  'This urge will pass in 3 minutes. Your streak will last forever.',
  'Breathe. This discomfort is temporary. Your identity as a warrior is permanent.',
  'One decision — right now — determines who you are. Choose the warrior.',
  'The urge is lying. It promises pleasure and delivers shame.',
  'Close your eyes. Think of day 90. That man is built in THIS moment.',
  'You have survived every urge before this one. 100% survival rate.',
  'What would the version of you with a 90-day streak do right now?',
  'Pain of discipline — minutes. Pain of relapse — days. Choose wisely.',
  'Feel it. Name it. Let it pass. You are the observer, not the urge.',
  'Ten deep breaths. That is all that stands between you and victory.',
];

let emTimer = null;
let breathTimer = null;

export function initEmergency() {
  const btn = document.getElementById('emergencyBtn');
  if (btn) {
    btn.addEventListener('click', openEmergency);
  }
}

function openEmergency() {
  const overlay = document.getElementById('emergencyOverlay');
  if (!overlay) return;

  const msg = EMERGENCY_MSGS[Math.floor(Math.random() * EMERGENCY_MSGS.length)];
  document.getElementById('emMsg').textContent = msg;
  overlay.style.display = 'flex';

  let t = 60;
  const counter = document.getElementById('emCounter');
  counter.textContent = t;
  counter.style.color = 'var(--red)';

  clearInterval(emTimer);
  emTimer = setInterval(() => {
    t--;
    counter.textContent = t;

    // Visual feedback as timer decreases
    if (t <= 10) {
      counter.style.color = 'var(--gold)';
    }
    if (t <= 0) {
      clearInterval(emTimer);
      counter.textContent = '✓';
      counter.style.color = 'var(--green)';
      counter.style.textShadow = '0 0 40px rgba(34,197,94,0.5)';
      document.getElementById('emMsg').textContent =
        'YOU SURVIVED THE URGE. That is real strength.';
      playSound('clean');
    }
  }, 1000);

  // 4-7-8 Breathing exercise
  const phases = ['Inhale... 4s', 'Hold... 7s', 'Exhale... 8s'];
  const durations = [4000, 7000, 8000];
  let pi = 0;

  clearTimeout(breathTimer);

  function runBreath() {
    const phaseEl = document.getElementById('breathPhase');
    const ring = document.getElementById('breathRing');
    if (!phaseEl || !ring) return;

    phaseEl.textContent = phases[pi];

    if (pi === 0) {
      ring.style.animation = 'breathIn 4s ease-in-out 1 forwards';
    } else if (pi === 1) {
      ring.style.animation = 'none';
    } else {
      ring.style.animation = 'breathIn 8s ease-in-out 1 reverse forwards';
    }

    breathTimer = setTimeout(() => {
      pi = (pi + 1) % 3;
      runBreath();
    }, durations[pi]);
  }

  runBreath();
}

export function closeEmergency() {
  clearInterval(emTimer);
  clearTimeout(breathTimer);

  const overlay = document.getElementById('emergencyOverlay');
  if (overlay) overlay.style.display = 'none';

  const ring = document.getElementById('breathRing');
  if (ring) ring.style.animation = 'breathIn 4s ease-in-out infinite alternate';

  const counter = document.getElementById('emCounter');
  if (counter) counter.style.textShadow = 'none';

  showToast("You defeated the urge. That's real strength. 🔥", 'ok');
  playSound('clean');
}

export function cleanupEmergency() {
  clearInterval(emTimer);
  clearTimeout(breathTimer);
}
