// ============================================================
//  IRON WILL — JOURNAL v3
//  Advanced entries management with search & categories
// ============================================================

import { state } from './state.js';
import { getToday, pd, esc, formatDate } from './utils.js';
import { showToast } from './toast.js';
import { debounce } from './utils.js';

let searchQuery = '';
let filterCategory = 'all';

export function saveJournal() {
  const input = document.getElementById('journalInput');
  const catSelect = document.getElementById('journalCategory');
  if (!input) return;

  const txt = input.value.trim();
  if (!txt) {
    showToast('Write something first.', 'warn');
    return;
  }

  const today = getToday();
  if (!state.journals) state.journals = {};
  
  const category = catSelect ? catSelect.value : 'reflection';
  const key = today + '_' + Date.now();
  
  state.journals[key] = { 
    text: txt, 
    date: today, 
    ts: Date.now(),
    category: category,
    wordCount: txt.split(/\s+/).length
  };

  input.value = '';
  state.totalXP += 15;
  renderJournal();
  renderJournalFull(); // Render the full page if active
  showToast('Journal entry saved. +15 XP 📓', 'ok');
  window.dispatchEvent(new CustomEvent('state-changed'));
}

export function initJournalFilters() {
  const searchInput = document.getElementById('journalSearch');
  const catFilter = document.getElementById('journalFilterCat');

  if (searchInput) {
    const updateSearch = debounce((e) => {
      searchQuery = e.target.value.toLowerCase();
      renderJournalFull();
    }, 250);
    searchInput.addEventListener('input', updateSearch);
  }

  if (catFilter) {
    catFilter.addEventListener('change', (e) => {
      filterCategory = e.target.value;
      renderJournalFull();
    });
  }
}

/** Dashboard snippet rendering */
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
    const d = formatDate(e.date);
    const truncated = esc(e.text).substring(0, 120);
    const more = e.text.length > 120 ? '…' : '';
    const catIcon = getCategoryIcon(e.category);
    
    return `<div class="journal-entry">
      <div class="journal-header">
        <span class="journal-date">${d}</span>
        <span class="journal-cat-tag">${catIcon} ${e.category || 'Note'}</span>
      </div>
      <div class="journal-text">${truncated}${more}</div>
    </div>`;
  }).join('');
}

/** Full tab rendering with search and filters */
export function renderJournalFull() {
  const list = document.getElementById('fullJournalList');
  if (!list) return;

  let entries = Object.values(state.journals || {})
    .sort((a, b) => b.ts - a.ts);

  // Apply filters
  if (searchQuery) {
    entries = entries.filter(e => e.text.toLowerCase().includes(searchQuery));
  }
  if (filterCategory !== 'all') {
    entries = entries.filter(e => (e.category || 'reflection') === filterCategory);
  }

  // Update Stats
  const statsEl = document.getElementById('journalStats');
  if (statsEl) {
    const totalWords = entries.reduce((s, e) => s + (e.wordCount || 0), 0);
    statsEl.innerHTML = `
      <div class="jstat-item"><strong>${entries.length}</strong> Entries</div>
      <div class="jstat-item"><strong>${totalWords}</strong> Words</div>
    `;
  }

  if (!entries.length) {
    list.innerHTML = `<div class="empty-state">${searchQuery || filterCategory !== 'all' ? 'No entries match your filters.' : 'Your journal is empty.'}</div>`;
    return;
  }

  list.innerHTML = entries.map(e => {
    const d = formatDate(e.date, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    const catIcon = getCategoryIcon(e.category);
    
    return `<div class="journal-card-full">
      <div class="jcard-header">
        <div class="jcard-meta">
          <span class="jcard-cat">${catIcon} ${e.category || 'Reflection'}</span>
          <span class="jcard-date">${d}</span>
        </div>
        <div class="jcard-words">${e.wordCount || 0} words</div>
      </div>
      <div class="jcard-body">${esc(e.text).replace(/\n/g, '<br>')}</div>
    </div>`;
  }).join('');
}

function getCategoryIcon(cat) {
  const icons = {
    reflection: '💭',
    gratitude: '🙏',
    victory: '🏆',
    struggle: '⚔️',
    note: '📝'
  };
  return icons[cat] || '📝';
}
