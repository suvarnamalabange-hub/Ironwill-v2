// ============================================================
//  IRON WILL — JOURNAL
//  Journal entries management
// ============================================================

import { state } from './state.js';
import { getToday, pd, esc } from './utils.js';
import { showToast } from './app.js';

export function saveJournal() {
  const input = document.getElementById('journalInput');
  if (!input) return;

  const txt = input.value.trim();
  if (!txt) {
    showToast('Write something first.', 'warn');
    return;
  }

  const today = getToday();
  if (!state.journals) state.journals = {};
  const key = today + '_' + Date.now();
  state.journals[key] = { text: txt, date: today, ts: Date.now() };

  input.value = '';
  renderJournal();
  showToast('Journal entry saved. +15 XP 📓', 'ok');
  window.dispatchEvent(new CustomEvent('state-changed'));
}

export function renderJournal() {
  const list = document.getElementById('journalList');
  if (!list) return;

  const entries = Object.values(state.journals || {})
    .sort((a, b) => b.ts - a.ts)
    .slice(0, 5);

  if (!entries.length) {
    list.innerHTML = '<div class="empty-state">No entries yet. Write your first.</div>';
    return;
  }

  list.innerHTML = entries.map(e => {
    const d = pd(e.date).toLocaleDateString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric'
    });
    const truncated = esc(e.text).substring(0, 200);
    const more = e.text.length > 200 ? '…' : '';
    return `<div class="journal-entry">
      <div class="journal-date">${d}</div>
      <div class="journal-text">${truncated}${more}</div>
    </div>`;
  }).join('');
}
