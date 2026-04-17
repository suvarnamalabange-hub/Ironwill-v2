// ============================================================
//  IRON WILL — PARTICLES
//  requestAnimationFrame-optimized particle system
// ============================================================

let canvas, ctx;
let particles = [];
let animFrame = null;

export function initParticles() {
  canvas = document.getElementById('particleCanvas');
  if (!canvas) return;
  ctx = canvas.getContext('2d');
  resize();
  window.addEventListener('resize', resize);
}

function resize() {
  if (!canvas) return;
  canvas.width = window.innerWidth * devicePixelRatio;
  canvas.height = window.innerHeight * devicePixelRatio;
  canvas.style.width = window.innerWidth + 'px';
  canvas.style.height = window.innerHeight + 'px';
  ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
}

export function triggerParticles(x, y, color, count = 60) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 2 + Math.random() * 8;
    const size = 2 + Math.random() * 6;
    particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - Math.random() * 2,
      life: 1,
      decay: 0.008 + Math.random() * 0.018,
      size,
      color,
      rotation: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 0.2,
      shape: Math.random() > 0.6 ? 'star' : 'circle'
    });
  }
  if (!animFrame) loop();
}

function drawStar(cx, cy, r, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = 'currentColor';
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const angle = (i * Math.PI * 2) / 5 - Math.PI / 2;
    const outerX = cx + Math.cos(angle) * r;
    const outerY = cy + Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(outerX, outerY);
    else ctx.lineTo(outerX, outerY);
    const innerAngle = angle + Math.PI / 5;
    const innerX = cx + Math.cos(innerAngle) * r * 0.4;
    const innerY = cy + Math.sin(innerAngle) * r * 0.4;
    ctx.lineTo(innerX, innerY);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function loop() {
  if (!ctx) return;
  const w = window.innerWidth;
  const h = window.innerHeight;
  ctx.clearRect(0, 0, w, h);

  particles = particles.filter(p => {
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.12; // gravity
    p.vx *= 0.99; // friction
    p.life -= p.decay;
    p.rotation += p.spin;

    const alpha = Math.max(0, p.life);
    const s = p.size * p.life;

    if (p.shape === 'star') {
      ctx.fillStyle = p.color;
      drawStar(p.x, p.y, s, alpha);
    } else {
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, s, 0, Math.PI * 2);
      ctx.fill();
    }

    return p.life > 0;
  });

  ctx.globalAlpha = 1;

  if (particles.length > 0) {
    animFrame = requestAnimationFrame(loop);
  } else {
    animFrame = null;
    ctx.clearRect(0, 0, w, h);
  }
}

export function cleanupParticles() {
  if (animFrame) {
    cancelAnimationFrame(animFrame);
    animFrame = null;
  }
  particles = [];
  window.removeEventListener('resize', resize);
}
