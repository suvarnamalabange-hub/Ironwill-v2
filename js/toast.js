// ============================================================
//  IRON WILL — TOAST NOTIFICATION SYSTEM
//  Standalone toast to avoid circular dependencies
// ============================================================

/** @type {HTMLElement|null} */
let toastEl = null;
let toastTimer = null;
let toastHideTimer = null;

/**
 * Initialize toast element reference.
 * Call once after DOM is ready.
 */
export function initToast() {
  toastEl = document.getElementById('toast');
  // Add ARIA attributes for accessibility
  if (toastEl) {
    toastEl.setAttribute('role', 'alert');
    toastEl.setAttribute('aria-live', 'assertive');
    toastEl.setAttribute('aria-atomic', 'true');
  }
}

/**
 * Show a toast notification.
 * @param {string} msg - Message to display
 * @param {'info'|'ok'|'warn'|'error'} [type='info'] - Toast type
 * @param {number} [duration=3000] - Duration in ms before auto-hide
 */
export function showToast(msg, type = 'info', duration = 3000) {
  if (!toastEl) {
    toastEl = document.getElementById('toast');
    if (!toastEl) {
      console.warn('[Toast] Toast element not found');
      return;
    }
  }

  // Clear existing timers
  clearTimeout(toastTimer);
  clearTimeout(toastHideTimer);

  // Set content and styles
  toastEl.textContent = msg;
  toastEl.className = `toast toast-${type} show`;
  toastEl.style.display = 'block';

  // Auto-hide
  toastTimer = setTimeout(() => {
    toastEl.classList.remove('show');
    toastEl.classList.add('closing');
    toastHideTimer = setTimeout(() => {
      toastEl.style.display = 'none';
      toastEl.classList.remove('closing');
    }, 300);
  }, duration);
}
