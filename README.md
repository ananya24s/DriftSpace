<div align="center">

<img src="public/driftspace-mark.svg" alt="DriftSpace Logo" width="140"/>

# 🚀 DriftSpace

### A polished arcade space shooter built with **React**, **HTML5 Canvas**, and **Supabase**.

Destroy asteroid fields, chain massive combos, survive increasingly difficult waves, and climb the global leaderboard in a modern browser-based arcade experience.

<br>

### 🎮 Play Live

# **https://drift-space.vercel.app/**

<br>

![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![HTML5 Canvas](https://img.shields.io/badge/HTML5-Canvas-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-Backend-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-Build-646CFF?style=for-the-badge&logo=vite&logoColor=white)

</div>

---

# ✨ Overview

DriftSpace is a modern browser-based arcade space shooter inspired by the timeless simplicity of classic arcade games while embracing modern presentation, polished animations, and responsive gameplay.

Rather than relying on a static menu and minimal visual feedback, DriftSpace creates a complete experience from the moment the application loads. A living title screen, seamless gameplay transitions, satisfying combat feedback, and a real-time global leaderboard work together to make every run feel engaging.

The project was built with a strong emphasis on clean architecture, reusable rendering systems, and consistent visual identity, making it both an enjoyable game and a showcase of modern frontend engineering.

---

# 🌟 Highlights

- 🚀 Living animated title screen
- 🎯 Endless arcade gameplay
- 💥 Combo chain bonus system
- 🌊 Dynamic wave progression
- 🛸 Three-life system
- ✨ Floating score popups
- 💥 Explosion polish & debris effects
- 🏆 Global leaderboard powered by Supabase
- 🎵 Persistent audio system
- 🎨 Shared rendering architecture
- ⚡ Optimized HTML5 Canvas rendering
- 🕹 Modern pixel arcade aesthetic

---

# 🎮 Core Features

## 🌌 Living Title Screen

Unlike traditional static menus, DriftSpace begins before the player even presses **Launch**.

Features include:

- Autonomous AI-piloted spacecraft
- Dynamic camera drift
- Animated asteroid field
- Real-time global pilot ticker
- Shared gameplay renderer
- Smooth warp transition into gameplay

---

## 🚀 Arcade Gameplay

Pilot your ship through increasingly dangerous asteroid fields while chasing the highest possible score.

Gameplay includes:

- Endless wave progression
- Dynamic difficulty scaling
- Three-life system
- Combo chain bonuses
- Floating score feedback
- Impact flash effects
- Debris shard particles
- Wave announcements
- Pause & resume support
- Game over summary screen

---

## 🏆 Global Leaderboard

Compete against players around the world.

Features include:

- Live Supabase leaderboard
- Personal best tracking
- Duplicate score prevention
- Highlighted current player
- Animated leaderboard interface

---

## 🔊 Audio System

A centralized audio architecture powers every game state.

- Persistent mute preference
- Shared Audio Manager
- Menu & gameplay music
- Combo sound effects
- Smooth music transitions

---

## 🎨 Consistent Visual Identity

Every major visual element is built around a single source of truth.

Shared assets include:

- Ship geometry
- Asteroid renderer
- Brand emblem
- HUD icons
- Gameplay rendering
- Menu rendering

This approach ensures complete visual consistency while minimizing duplicated rendering logic.

---

# 🖼 Screenshots

> Replace these placeholders with actual screenshots from your project.

| Living Menu | Gameplay |
|--------------|-----------|
| ![](screenshots/menu.png) | ![](screenshots/gameplay.png) |

| Leaderboard | Death Screen |
|--------------|--------------|
| ![](screenshots/leaderboard.png) | ![](screenshots/death.png) |

---

# 🏗 Project Architecture

```
src
│
├── components
│   ├── Menu
│   ├── HUD
│   ├── Leaderboard
│   ├── DeathScreen
│   ├── PauseScreen
│   ├── AudioToggle
│   └── ScorePopup
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
├── assets
│
└── styles
```

---

# ⚙️ Tech Stack

| Technology | Purpose |
|------------|---------|
| React | User Interface |
| HTML5 Canvas | Game Rendering |
| JavaScript (ES6+) | Gameplay Logic |
| CSS Modules | Styling |
| Vite | Build Tool |
| Supabase | Global Leaderboard & Backend |

---

# ⚡ Performance

DriftSpace is designed with performance as a priority.

- RequestAnimationFrame game loop
- Shared rendering pipeline
- Minimal runtime allocations
- Efficient particle system
- Reusable geometry rendering
- Accessibility support for reduced motion
- Smooth animations across game states

---

# 🚀 Getting Started

Clone the repository.

```bash
git clone https://github.com/ananya24s/DriftSpace.git
```

Navigate into the project.

```bash
cd DriftSpace
```

Install dependencies.

```bash
npm install
```

Run the development server.

```bash
npm run dev
```

Build for production.

```bash
npm run build
```

---

# 🔮 Future Improvements

While the core experience is complete, planned gameplay expansions include:

- 👾 Enemy spacecraft
- 🛰 Additional asteroid behaviors
- ⚔ Boss encounters
- ⚡ Power-ups
- 🌌 New gameplay modes
- 📈 Expanded player statistics

---

# 👩‍💻 Author

## Ananya Singh

Computer Science Undergraduate

- GitHub: https://github.com/ananya24s
- Live Demo: https://drift-space.vercel.app/

---

<div align="center">

### ⭐ If you enjoyed DriftSpace, consider starring the repository!

Thank you for checking out DriftSpace.

</div>
