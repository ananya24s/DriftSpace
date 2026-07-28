<div align="center">

<img src="driftspace-mark.svg" width="140"/>

# 🚀 DriftSpace

### A polished arcade space shooter built with **React**, **HTML5 Canvas**, and **Supabase**.

Destroy asteroid fields, chain combos, survive increasingly difficult waves, and compete with players around the world on a real-time global leaderboard.

### 🎮 Live Demo
## https://drift-space.vercel.app/

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?logo=javascript&logoColor=black)
![Canvas](https://img.shields.io/badge/HTML5-Canvas-E34F26?logo=html5&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-Backend-3ECF8E?logo=supabase&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-Build-646CFF?logo=vite&logoColor=white)

</div>

---

# ✨ Overview

DriftSpace is a modern browser-based arcade shooter inspired by the simplicity of classic space games while embracing modern presentation and polish.

Instead of a static title screen and basic gameplay loop, DriftSpace focuses on creating a cohesive experience—from the moment the menu loads until the final score is submitted.

Every visual element shares the same design language, every transition is animated, and every gameplay interaction is designed to provide satisfying feedback.

---

# 🎥 Gameplay

> *(Replace these with your own screenshots or GIFs.)*

| Living Menu | Gameplay |
|------------|-----------|
| ![](screenshots/menu.png) | ![](screenshots/gameplay.png) |

| Leaderboard | Death Screen |
|-------------|--------------|
| ![](screenshots/leaderboard.png) | ![](screenshots/death.png) |

---

# 🚀 Features

## 🌌 Living Title Screen

Unlike traditional menus, DriftSpace begins before the player even presses **Launch**.

- Autonomous AI-piloted ship
- Camera drift
- Animated asteroid field
- Real global pilot ticker
- Dynamic background simulation
- Seamless warp transition into gameplay

---

## 🎮 Arcade Gameplay

Survive endless asteroid waves while maximizing your score.

Features include:

- 🚀 Three-life system
- 🌊 Endless wave progression
- 🎯 Dynamic difficulty scaling
- 💥 Floating score popups
- ⚡ Combo chain bonuses
- ✨ Impact flashes
- 🪨 Debris shard effects
- ⏸ Pause system
- ☠ Game over screen

---

## 🏆 Global Leaderboard

Compete against players around the world.

- Live Supabase leaderboard
- Personal best tracking
- Duplicate score prevention
- Highlighted player runs
- Global pilot rankings

---

## 🔊 Audio

Centralized audio management powers every game state.

- Persistent mute preference
- Shared Audio Manager
- Menu music
- Gameplay music
- Combo audio cues
- Smooth music transitions

---

## 🎨 Consistent Visual Identity

Every major visual element shares the same source of truth.

- Ship geometry
- Asteroid renderer
- HUD icons
- Brand emblem
- Logo
- Gameplay renderer

This keeps every screen visually consistent while reducing duplicated rendering logic.

---

# 🏗 Architecture

```
src
│
├── components
│   ├── Menu
│   ├── HUD
│   ├── Leaderboard
│   ├── DeathScreen
│   ├── PauseScreen
│   └── AudioToggle
│
├── game
│   ├── entities
│   ├── rendering
│   ├── systems
│   ├── particles
│   └── effects
│
├── audio
│
├── hooks
│
├── utils
│
└── assets
```

---

# ⚙ Tech Stack

| Technology | Purpose |
|------------|---------|
| React | UI |
| HTML5 Canvas | Rendering |
| JavaScript | Game Logic |
| Vite | Development & Build |
| Supabase | Global Leaderboard |
| CSS Modules | Styling |

---

# 🎯 Gameplay Highlights

### Living Menu

The menu is rendered using the same systems as gameplay, creating a continuous world rather than a static screen.

---

### Shared Rendering

Ship geometry and asteroid rendering are defined once and reused across:

- Gameplay
- HUD
- Menu
- Branding
- Logo

---

### Modern Arcade Feedback

Every action provides visual feedback.

- Floating scores
- Combo bonuses
- Screen polish
- Wave announcements
- Animated life indicators
- Explosion effects

---

# ⚡ Performance

Designed with performance in mind.

- RequestAnimationFrame game loop
- Shared rendering pipeline
- No unnecessary per-frame allocations
- Reduced-motion accessibility support
- Efficient particle systems

---

# 🚀 Getting Started

Clone the repository

```bash
git clone https://github.com/ananya24s/DriftSpace.git
```

Install dependencies

```bash
npm install
```

Run locally

```bash
npm run dev
```

Build for production

```bash
npm run build
```

---

# 🛣 Future Plans

- 👾 Enemy ships
- 🛰 New asteroid behaviors
- ⚔ Boss encounters
- ⚡ Power-ups
- 🌌 Additional game modes

---

# 👩‍💻 Author

**Ananya Singh**

Computer Science Undergraduate

GitHub: https://github.com/ananya24s

LinkedIn: https://www.linkedin.com/in/ananya-singh-94496b343/

---

<div align="center">

### ⭐ If you enjoyed DriftSpace, consider giving the repository a star!

Made with ☕, React, Canvas, and a love for arcade games.

</div>
