# ⚔️ Iron Will — Warrior Discipline System

A production-grade, offline-first discipline and habit tracking Progressive Web Application (PWA). Built for self-mastery, tracking streaks, managing urges, and ascending through warrior ranks with responsive desktop and mobile support.

---

## ⚡ Features

- **🛡️ Warrior Rank & XP Progression**: Ascend from *Civilian* to *Titan of Will* with dynamic XP tracking and animated counters.
- **📅 7-Column Responsive Calendar**: Full month interactive calendar with streak markers, relapse accountability, and a 24-hour urge intensity heatmap.
- **📊 Advanced Analytics**: 90-day streak history graphs, 180-day resilience grids, and a 7-day vulnerability radar chart.
- **⚔️ Arsenal Vault**: Unlocked achievement badges with holographic shimmer, habit management protocols, and warrior oath pledges.
- **🎯 Focus Timer & Protocols**: Pomodoro work/break timer with audio cues and interactive daily check-in modal.
- **🆘 Emergency Protocol**: Breathing pacer with animated ring and emergency survival countdown.
- **📱 Dual Responsive Navigation**:
  - Floating top navigation bar with hotkeys (`[1]` - `[5]`) for Desktop.
  - Ergonomic bottom dock for mobile and tablet devices (`< 960px`).
- **🌐 Offline-First PWA**: Service Worker caching, web app manifest, and automatic state synchronization via localStorage.

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [Python 3.10+](https://www.python.org/) (optional, for Selenium regression testing)

### Running Locally
```bash
# Start the local development server
node server.js
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Automated Testing

Automated Selenium testing suite verifies all core layout grids and responsiveness:

```bash
# Install selenium (if not already installed)
pip install selenium

# Run the end-to-end test suite
python selenium_test.py
```

---

## 📂 Project Structure

```
Ironwill/
├── css/
│   ├── animations.css    # Keyframe transitions & holographic shimmers
│   ├── base.css          # Core reset, canvas particles & typography
│   ├── components.css    # 7-column calendar, badges, cards, buttons & forms
│   ├── layout.css        # Responsive desktop grid & mobile dock rules
│   ├── tokens.css        # Design tokens, color system & CSS variables
│   └── utilities.css     # Spacing, helpers & responsive utilities
├── icons/                # PWA app icons (192x192, 512x512)
├── js/
│   ├── achievements.js   # Achievement badges & unlock logic
│   ├── analytics.js      # SVG charts (radar, streak timeline, heatmap)
│   ├── app.js            # App orchestrator & lifecycle initialization
│   ├── audio.js          # Web Audio API sound synthesizers
│   ├── calendar.js       # 7-column calendar engine & urge heatmap
│   ├── emergency.js      # Emergency protocol & breathing guide
│   ├── focus.js          # Focus timer module
│   ├── habits.js         # Daily protocol & custom habit manager
│   ├── journal.js        # Journal entries, filtering & reflection logs
│   ├── navigation.js     # Dual desktop/mobile navigation engine & hotkeys
│   ├── particles.js      # Floating canvas background particles
│   ├── state.js          # Reactive state management with proxy store
│   ├── toast.js          # Accessible toast notifications
│   └── utils.js          # Date formatters, sanitization & number animations
├── index.html            # Main application shell
├── manifest.json         # PWA Manifest configuration
├── server.js             # Zero-dependency local Node.js server
├── sw.js                 # Service Worker for offline resilience
└── selenium_test.py      # Automated Selenium test suite
```

---

## 📜 License

MIT License. Designed and engineered for self-mastery.
