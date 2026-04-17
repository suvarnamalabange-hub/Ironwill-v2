// ============================================================
//  IRON WILL — WEB AUDIO
//  Sound effects using Web Audio API
// ============================================================

let audioCtx = null;

function getCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioCtx;
}

export function playSound(type) {
  try {
    const ctx = getCtx();
    const t = ctx.currentTime;

    if (type === 'clean') {
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
    }

    else if (type === 'relapse') {
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
    }

    else if (type === 'urge') {
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
    }

    else if (type === 'levelup') {
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
    }

    else if (type === 'toggle') {
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
    }
  } catch(e) {
    // Silent fail — audio is non-critical
  }
}
