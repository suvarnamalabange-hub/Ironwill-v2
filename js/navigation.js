// ============================================================
//  IRON WILL — DUAL NAVIGATION ENGINE (Desktop + Mobile)
//  Desktop top bar + Mobile bottom dock + Hotkeys [1-5]
// ============================================================

import { state } from './state.js';

export const TABS = [
  { id: 'dashboard', icon: '🏠', label: 'Dashboard', short: 'Home', key: '1' },
  { id: 'calendar',  icon: '📅', label: 'Calendar',  short: 'Cal',  key: '2' },
  { id: 'analytics', icon: '📊', label: 'Analytics', short: 'Stats',key: '3' },
  { id: 'journal',   icon: '📓', label: 'Journal',   short: 'Logs', key: '4' },
  { id: 'arsenal',   icon: '⚔️', label: 'Arsenal',   short: 'Vault',key: '5' },
];

let activeTab = 'dashboard';
let onTabChange = null;

export function initNavigation(tabChangeCallback) {
  onTabChange = tabChangeCallback;

  // 1. Render Mobile Bottom Nav
  const bnav = document.getElementById('bottomNav');
  if (bnav) {
    bnav.innerHTML = TABS.map(t => `
      <button class="bnav-tab ${t.id === activeTab ? 'active' : ''}" data-tab="${t.id}" aria-label="${t.label}">
        <span class="bnav-icon">${t.icon}</span>
        <span class="bnav-label">${t.short || t.label}</span>
      </button>
    `).join('');

    bnav.addEventListener('click', (e) => {
      const tab = e.target.closest('.bnav-tab');
      if (tab) switchTab(tab.dataset.tab);
    });
  }

  // 2. Render Desktop Top Nav
  const dnav = document.getElementById('desktopNav');
  if (dnav) {
    dnav.innerHTML = TABS.map(t => `
      <button class="dnav-tab ${t.id === activeTab ? 'active' : ''}" data-tab="${t.id}" aria-label="${t.label} (Hotkey: ${t.key})">
        <span class="dnav-icon">${t.icon}</span>
        <span class="dnav-label">${t.label}</span>
        <kbd class="dnav-key">${t.key}</kbd>
      </button>
    `).join('');

    dnav.addEventListener('click', (e) => {
      const tab = e.target.closest('.dnav-tab');
      if (tab) switchTab(tab.dataset.tab);
    });
  }

  // 3. Desktop Hotkeys (1-5)
  window.addEventListener('keydown', (e) => {
    // Ignore when typing in inputs or textareas
    const tag = document.activeElement?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || document.activeElement?.isContentEditable) {
      return;
    }
    // Only number keys 1-5
    const tabMatch = TABS.find(t => t.key === e.key);
    if (tabMatch && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      switchTab(tabMatch.id);
    }
  });

  // 4. Hash Routing
  const hash = window.location.hash.slice(1);
  if (hash && TABS.find(t => t.id === hash)) {
    switchTab(hash, false);
  } else {
    switchTab(state.activeTab || 'dashboard', false);
  }

  window.addEventListener('hashchange', () => {
    const h = window.location.hash.slice(1);
    if (h && TABS.find(t => t.id === h) && h !== activeTab) {
      switchTab(h, false);
    }
  });

  // Global window exposure for tests and integrations
  if (typeof window !== 'undefined') {
    window.switchTab = switchTab;
  }
}

export function switchTab(tabId, updateHash = true) {
  if (tabId === activeTab && document.querySelector(`.tab-section.active`)) return;

  const prev = activeTab;
  activeTab = tabId;
  state.activeTab = tabId;

  // Update both mobile & desktop active states
  document.querySelectorAll('.bnav-tab, .dnav-tab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabId);
  });

  // Animate sections
  const sections = document.querySelectorAll('.tab-section');
  const direction = getDirection(prev, tabId);

  sections.forEach(sec => {
    if (sec.dataset.tab === tabId) {
      sec.classList.add('active');
      sec.classList.remove('exit-left', 'exit-right');
      sec.style.animation = direction === 'right'
        ? 'tabSlideInRight 0.35s cubic-bezier(0.22,1,0.36,1) both'
        : 'tabSlideInLeft 0.35s cubic-bezier(0.22,1,0.36,1) both';
    } else if (sec.classList.contains('active') || sec.dataset.tab === prev) {
      sec.classList.remove('active');
      sec.style.animation = direction === 'right'
        ? 'tabSlideOutLeft 0.25s cubic-bezier(0.22,1,0.36,1) both'
        : 'tabSlideOutRight 0.25s cubic-bezier(0.22,1,0.36,1) both';
    } else {
      sec.classList.remove('active');
      sec.style.animation = '';
    }
  });

  // Update hash
  if (updateHash) {
    history.replaceState(null, '', '#' + tabId);
  }

  // Scroll to top
  window.scrollTo({ top: 0, behavior: 'smooth' });

  // Notify callback
  if (onTabChange) onTabChange(tabId);
}

function getDirection(from, to) {
  const fromIdx = TABS.findIndex(t => t.id === from);
  const toIdx = TABS.findIndex(t => t.id === to);
  return toIdx >= fromIdx ? 'right' : 'left';
}

export function getActiveTab() {
  return activeTab;
}
