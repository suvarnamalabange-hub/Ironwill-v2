// ============================================================
//  IRON WILL — UTILITIES
//  Date helpers, debounce, escape, formatters
// ============================================================

export const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
export const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

/** Date → 'YYYY-MM-DD' */
export function ds(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

/** 'YYYY-MM-DD' → Date */
export function pd(s) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Get today's date string */
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

/** Escape HTML entities */
export function esc(s) {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

/** Debounce function */
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

/** Animate a number counter */
export function animNum(el, target, duration = 800) {
  const start = parseInt(el.textContent) || 0;
  if (start === target) return;

  const diff = target - start;
  const startTime = performance.now();

  function step(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    // Ease out cubic
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(start + diff * eased);
    if (progress < 1) requestAnimationFrame(step);
  }

  requestAnimationFrame(step);
}

/** Get last 7 days as date strings */
export function get7Days() {
  const days = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    days.push(ds(d));
  }
  return days;
}

/** Format date for display */
export function formatDate(dateStr, options) {
  const defaults = { weekday: 'short', month: 'short', day: 'numeric' };
  return pd(dateStr).toLocaleDateString('en-US', options || defaults);
}

/** Clamp a value between min and max */
export function clamp(val, min, max) {
  return Math.min(Math.max(val, min), max);
}

/** Generate unique ID */
let _idCounter = 0;
export function uid() {
  return `iw_${Date.now()}_${++_idCounter}`;
}
