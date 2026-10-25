// ============================================================
//  IRON WILL — UTILITIES
//  Date helpers, debounce, escape, formatters, animations
// ============================================================

import { triggerParticles } from './particles.js';

export const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
export const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

/** Date → 'YYYY-MM-DD' */
export function ds(d) {
  const date = d instanceof Date ? d : new Date(d);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/** 'YYYY-MM-DD' → Date in local time */
export function pd(s) {
  if (!s || typeof s !== 'string') return new Date();
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Get today's date string in YYYY-MM-DD */
export function getToday() {
  return ds(new Date());
}

/** Check if date string is in the future */
export function isFuture(s) {
  return s > getToday();
}

/** Check if date string is today */
export function isToday(s) {
  return s === getToday();
}

/** Escape HTML entities safely */
export function esc(s) {
  if (s === null || s === undefined) return '';
  const str = String(s);
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/** Debounce function execution */
export function debounce(fn, ms = 300) {
  let timer;
  return function(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), ms);
  };
}

/** Throttle using requestAnimationFrame */
export function rafThrottle(fn) {
  let ticking = false;
  return function(...args) {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      fn.apply(this, args);
      ticking = false;
    });
  };
}

const activeNumberAnimations = new WeakMap();

/** Animate a numeric counter with cancellation of overlapping animations */
export function animateNum(elOrId, target, duration = 400) {
  const el = typeof elOrId === 'string' ? document.getElementById(elOrId) : elOrId;
  if (!el) return;

  const numericTarget = Math.max(0, Math.round(Number(target) || 0));
  const currentVal = parseInt(el.textContent, 10);
  const start = Number.isFinite(currentVal) ? currentVal : 0;

  if (start === numericTarget) {
    el.textContent = String(numericTarget);
    return;
  }

  // Cancel any running animation on this element
  if (activeNumberAnimations.has(el)) {
    cancelAnimationFrame(activeNumberAnimations.get(el));
    activeNumberAnimations.delete(el);
  }

  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || duration <= 0) {
    el.textContent = String(numericTarget);
    return;
  }

  const diff = numericTarget - start;
  const startTime = performance.now();

  function step(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const nextVal = Math.max(0, Math.round(start + diff * eased));
    el.textContent = String(nextVal);

    if (progress < 1) {
      const animId = requestAnimationFrame(step);
      activeNumberAnimations.set(el, animId);
    } else {
      el.textContent = String(numericTarget);
      activeNumberAnimations.delete(el);
    }
  }

  const initialAnimId = requestAnimationFrame(step);
  activeNumberAnimations.set(el, initialAnimId);
}

/** Get last N days as date strings */
export function getDays(count) {
  const days = [];
  const now = new Date();
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    days.push(ds(d));
  }
  return days;
}

export function get7Days() {
  return getDays(7);
}

export function get30Days() {
  return getDays(30);
}

export function get90Days() {
  return getDays(90);
}

/** Clamp a value between min and max */
export function clamp(val, min, max) {
  return Math.min(Math.max(val, min), max);
}

/** Generate unique ID with crypto fallback */
export function uid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID().slice(0, 8);
  }
  return Math.random().toString(36).substring(2, 10);
}

/** Format date key or Date object into human-readable string */
export function formatDate(date, options = { month: 'short', day: 'numeric', weekday: 'short' }) {
  const d = typeof date === 'string' ? pd(date) : date;
  return d.toLocaleDateString('en-US', options);
}

/** Trigger confetti celebration particles */
export function triggerConfetti() {
  const W = window.innerWidth;
  const H = window.innerHeight;
  triggerParticles(W * 0.2, H * 0.5, '#f5c842', 40);
  triggerParticles(W * 0.8, H * 0.5, '#3b82f6', 40);
  triggerParticles(W * 0.5, H * 0.3, '#22c55e', 60);
}
