// ============================================================
//  IRON WILL — WEB AUDIO
//  Sound effects using Web Audio API
//  Production-grade: lazy init, proper cleanup, error handling
// ============================================================

/** @type {AudioContext|null} */
let audioCtx = null;

/** @type {boolean} */
let audioEnabled = true;

/**
 * Initialize the audio system.
 * Creates the AudioContext lazily on first user interaction
 * to comply with browser autoplay policies.
 */
export function initAudio() {
  // AudioContext requires user gesture to start in most browsers.
  // We create it lazily in getCtx(), but set up a one-time
  // interaction listener to resume suspended contexts.
  const resumeAudio = () => {
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
    // Remove after first interaction
    document.removeEventListener('click', resumeAudio);
    document.removeEventListener('touchstart', resumeAudio);
    document.removeEventListener('keydown', resumeAudio);
  };

  document.addEventListener('click', resumeAudio, { once: true });
  document.addEventListener('touchstart', resumeAudio, { once: true });
  document.addEventListener('keydown', resumeAudio, { once: true });
}

/**
 * Get or create the AudioContext.
 * @returns {AudioContext|null}
 */
function getCtx() {
  if (!audioEnabled) return null;
  if (!audioCtx) {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) {
        audioEnabled = false;
        return null;
      }
      audioCtx = new AudioCtx();
    } catch (e) {
      audioEnabled = false;
      return null;
    }
  }
  return audioCtx;
}

/**
 * Play a sound effect by type.
 * @param {'clean'|'relapse'|'urge'|'levelup'|'toggle'} type - Sound type
 */
export function playSound(type) {
  // Check reduced motion preference — some users associate reduced motion
  // with a desire for fewer sensory stimuli
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

  try {
    const ctx = getCtx();
    if (!ctx) return;
    const t = ctx.currentTime;

    switch (type) {
      case 'clean': {
        // Ascending arpeggio — victory feel
        const notes = [440, 660, 880, 1100];
        notes.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, t + i * 0.08);
          gain.gain.setValueAtTime(0.08, t + i * 0.08);
          gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.08 + 0.4);
          osc.start(t + i * 0.08);
          osc.stop(t + i * 0.08 + 0.4);
        });
        break;
      }

      case 'relapse': {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(200, t);
        osc.frequency.exponentialRampToValueAtTime(50, t + 0.6);
        gain.gain.setValueAtTime(0.04, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
        osc.start(t);
        osc.stop(t + 0.6);
        break;
      }

      case 'urge': {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'square';
        osc.frequency.setValueAtTime(300, t);
        osc.frequency.exponentialRampToValueAtTime(200, t + 0.15);
        gain.gain.setValueAtTime(0.025, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
        osc.start(t);
        osc.stop(t + 0.2);
        break;
      }

      case 'levelup': {
        const notes = [261, 329, 392, 523, 659];
        notes.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.type = 'sine';
          osc.frequency.value = freq;
          const st = t + i * 0.1;
          gain.gain.setValueAtTime(0.08, st);
          gain.gain.exponentialRampToValueAtTime(0.001, st + 0.5);
          osc.start(st);
          osc.stop(st + 0.5);
        });
        break;
      }

      case 'toggle': {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, t);
        osc.frequency.exponentialRampToValueAtTime(1200, t + 0.05);
        gain.gain.setValueAtTime(0.03, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
        osc.start(t);
        osc.stop(t + 0.1);
        break;
      }
    }
  } catch (e) {
    // Silent fail — audio is non-critical
  }
}

/**
 * Clean up audio resources.
 */
export function cleanupAudio() {
  if (audioCtx) {
    audioCtx.close().catch(() => {});
    audioCtx = null;
  }
}
