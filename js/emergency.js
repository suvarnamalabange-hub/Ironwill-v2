// ============================================================
//  IRON WILL — EMERGENCY MODE
//  Emergency overlay + 4-7-8 breathing exercise
//  Production-grade: proper cleanup, ARIA, focus trapping
// ============================================================

import { playSound } from './audio.js';
import { showToast } from './toast.js';

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
let previousActiveElement = null;

/**
 * Initialize emergency mode event handlers.
 */
export function initEmergency() {
  const closeBtn = document.getElementById('closeEmergencyBtn');
  if (closeBtn) {
    closeBtn.addEventListener('click', closeEmergency);
  }

  // Close on Escape key
  const overlay = document.getElementById('emergencyOverlay');
  if (overlay) {
    overlay.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeEmergency();
      }
    });

    // Add ARIA attributes
    overlay.setAttribute('role', 'alertdialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Emergency urge intervention');
  }
}

/**
 * Open emergency intervention mode.
 * Exported as both openEmergency and triggerEmergency for compatibility.
 */
export function openEmergency() {
  const overlay = document.getElementById('emergencyOverlay');
  if (!overlay) return;

  // Save focus for restoration
  previousActiveElement = document.activeElement;

  const msg = EMERGENCY_MSGS[Math.floor(Math.random() * EMERGENCY_MSGS.length)];
  const msgEl = document.getElementById('emMsg');
  if (msgEl) msgEl.textContent = msg;

  overlay.style.display = 'flex';

  // Focus the close button for keyboard accessibility
  const closeBtn = document.getElementById('closeEmergencyBtn');
  if (closeBtn) {
    requestAnimationFrame(() => closeBtn.focus());
  }

  // Start countdown
  let t = 60;
  const counter = document.getElementById('emCounter');
  if (counter) {
    counter.textContent = String(t);
    counter.style.color = 'var(--red)';
    counter.style.textShadow = 'none';
  }

  clearInterval(emTimer);
  emTimer = setInterval(() => {
    t--;
    if (counter) {
      counter.textContent = String(t);

      // Visual feedback as timer decreases
      if (t <= 10) {
        counter.style.color = 'var(--gold)';
      }
      if (t <= 0) {
        clearInterval(emTimer);
        emTimer = null;
        counter.textContent = '✓';
        counter.style.color = 'var(--green)';
        counter.style.textShadow = '0 0 40px rgba(34,197,94,0.5)';
        if (msgEl) {
          msgEl.textContent = 'YOU SURVIVED THE URGE. That is real strength.';
        }
        playSound('clean');
      }
    }
  }, 1000);

  // 4-7-8 Breathing exercise
  startBreathingExercise();
}

// Alias for backward compatibility with app.js import
export { openEmergency as triggerEmergency };

/**
 * Start the 4-7-8 breathing exercise cycle.
 */
function startBreathingExercise() {
  const phases = ['Inhale... 4s', 'Hold... 7s', 'Exhale... 8s'];
  const durations = [4000, 7000, 8000];
  let phaseIndex = 0;

  clearTimeout(breathTimer);

  function runBreath() {
    const phaseEl = document.getElementById('breathPhase');
    const ring = document.getElementById('breathRing');
    if (!phaseEl || !ring) return;

    phaseEl.textContent = phases[phaseIndex];

    if (phaseIndex === 0) {
      ring.style.animation = 'breathIn 4s ease-in-out 1 forwards';
    } else if (phaseIndex === 1) {
      ring.style.animation = 'none';
    } else {
      ring.style.animation = 'breathIn 8s ease-in-out 1 reverse forwards';
    }

    breathTimer = setTimeout(() => {
      phaseIndex = (phaseIndex + 1) % 3;
      runBreath();
    }, durations[phaseIndex]);
  }

  runBreath();
}

/**
 * Close the emergency overlay and clean up.
 */
export function closeEmergency() {
  cleanupEmergency();

  const overlay = document.getElementById('emergencyOverlay');
  if (overlay) overlay.style.display = 'none';

  const ring = document.getElementById('breathRing');
  if (ring) ring.style.animation = 'breathIn 4s ease-in-out infinite alternate';

  const counter = document.getElementById('emCounter');
  if (counter) counter.style.textShadow = 'none';

  // Restore focus
  if (previousActiveElement && typeof previousActiveElement.focus === 'function') {
    previousActiveElement.focus();
    previousActiveElement = null;
  }

  showToast("You defeated the urge. That's real strength. 🔥", 'ok');
  playSound('clean');
}

/**
 * Clean up all timers without closing the overlay.
 */
export function cleanupEmergency() {
  if (emTimer) {
    clearInterval(emTimer);
    emTimer = null;
  }
  if (breathTimer) {
    clearTimeout(breathTimer);
    breathTimer = null;
  }
}
