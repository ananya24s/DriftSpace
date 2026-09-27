<div align="center">

<img src="public/driftspace-mark.svg" alt="DriftSpace Logo" width="140"/>

# 🚀 DriftSpace

### A polished arcade space shooter built with **React**, **HTML5 Canvas**, and **Supabase**.

Destroy asteroid fields, grab retro power-ups, chain massive combos, survive increasingly difficult waves, battle up to 3 friends in online Versus, and climb the global leaderboard, on desktop or your phone.

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
- ⚡ 7 collectible 8-bit power-ups
- ❤️ Extra lives (up to 5)
- ⚔️ Online Versus for 2–4 pilots with room codes
- 📱 Fully playable on phones
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
- Built-in power-ups guide for new players
- Shared gameplay renderer
- Smooth warp transition into gameplay

---

## 🚀 Arcade Gameplay

Pilot your ship through increasingly dangerous asteroid fields while chasing the highest possible score.

Gameplay includes:

- Endless wave progression
- Dynamic difficulty scaling
- Three lives to start, with extra lives up to five
- Collectible power-ups
- Combo chain bonuses
- Floating score feedback
- Impact flash effects
- Debris shard particles
- Wave announcements
- Pause & resume support (keyboard or on-screen button)
- Game over summary screen

---

## ⚡ Power-Ups

Shoot asteroids to shake power-ups loose, then fly into one to collect it. Each pickup is a glowing 8-bit sprite that blinks before it vanishes, so grab it fast.

| | Power-Up | Effect |
|---|----------|--------|
| ❤️ | **+1 Life** | Adds an extra ship, up to 5. Already full? Bonus points instead. |
| 🛡️ | **Shield** | 8 seconds of armour. Asteroids that touch it are smashed. |
| ⚡ | **Rapid Fire** | Your blaster fires much faster for 10 seconds. |
| 🔱 | **Spread Shot** | Fires three bullets in a fan for 10 seconds. |
| ✖️ | **Score x2** | Every point, including chain bonuses, counts double for 10 seconds. |
| 💥 | **Nova Bomb** | Wipes out every asteroid on screen at once. |
| ⏳ | **Slow-Mo** | Asteroids crawl for 6 seconds while you move at full speed. |

Timed power-ups appear at the top of the screen with a block-by-block countdown bar. Collecting a power-up that's already active refreshes its timer, and several can run at once.

New players can open the **Power-Ups** guide from the title screen to see what every pickup does.

---

## ⚔️ Versus Multiplayer

Play live against 1–3 friends. Everyone flies their own ship in their own asteroid field, and you fight by sending asteroids at each other. The last pilot flying wins.

**How a match works**

1. **Host:** click **VERSUS** on the title screen, enter a pilot name and choose **HOST ROOM**. You get a code like `DRIFT-7K2`. Tap it to copy it, or on a phone use **SHARE CODE**.
2. **Join:** friends choose **JOIN ROOM** and type the code. Each pilot gets a slot and a colour in the lobby.
3. **Start:** once 2 or more pilots are in, the host presses **START**. Everyone gets the same 3-2-1 countdown.
4. **Fight:** your chain combos (and Nova Bombs) send asteroids to whoever is leading. They arrive in your colour with an **INCOMING** warning, so your rivals know who hit them.
5. **Survive:** run out of lives and you're out. You can watch the live standings until the round ends.
6. **Results:** everyone is ranked 1st to 4th, and the host can start the next round with **PLAY AGAIN**.

**Good to know**

- The bottom of the screen shows every rival's name, score and lives.
- A pilot who joins mid-round waits in the lobby and joins the next round.
- A pilot who disconnects is counted as out, and the match carries on.
- Pause is off in Versus, since the match is live for everyone.
- Versus scores never go on the global leaderboard.
- It runs on Supabase Realtime (Broadcast + Presence), so there's no game server and nothing is stored in the database.

---

## 🕹 Controls

| Key | Action |
|-----|--------|
| `W` / `↑` | Thrust |
| `S` / `↓` | Reverse thrust |
| `A` `D` / `←` `→` | Turn |
| `Space` / `Z` | Fire |
| `P` | Pause (solo) |
| `R` | Retry |

---

## 📱 Playing on a Phone

Every mode works on touch devices:

- **Controls:** a virtual joystick (steer and thrust) and a fire button appear during gameplay.
- **Pause:** in solo games, use the on-screen pause button under your score.
- **Orientation:** gameplay is played in landscape. The Versus lobby and results also work in portrait, which makes typing names and codes easier.
- **Sharing a room code:** use **SHARE CODE** to send it through the phone's share sheet (WhatsApp, Messages…) without leaving the game.
- **Switching apps briefly:** a pilot who switches apps in the lobby reconnects automatically when they come back. If the host drops out, the room waits 20 seconds for them.
- **Screen size:** all menus, the HUD, and the Versus screens adapt to short landscape screens.

---

## 🏆 Global Leaderboard

Compete against players around the world.

Features include:

- Live Supabase leaderboard
- Personal best tracking
- Duplicate score prevention
- Highlighted current player
- Animated leaderboard interface
- Solo runs only (Versus scores are kept off it)

---

## 🔊 Audio System

A centralized audio architecture powers every game state.

- Persistent mute preference
- Shared Audio Manager
- Menu & gameplay music
- Combo sound effects
- Synthesized chiptune power-up jingles and Versus countdown beeps (Web Audio API)
- Smooth music transitions

---

## 🎨 Consistent Visual Identity

Every major visual element is built around a single source of truth.

Shared assets include:

- Ship geometry
- Asteroid renderer
- Power-up pixel sprites (shared by the canvas, HUD and guide)
- Brand emblem
- HUD icons
- Gameplay rendering
- Menu rendering

This approach ensures complete visual consistency while minimizing duplicated rendering logic.

---


# 🏗 Project Architecture

```
src
│
├── components
│   ├── Menu.jsx              # Living title screen + pause screen
│   ├── PowerUpGuide.jsx      # Title-screen power-ups strip & guide
│   ├── GameCanvas.jsx        # Canvas host for the game loop
│   ├── HUD.jsx               # Score, lives, wave, active power-ups
│   ├── PixelIcon.jsx         # 8-bit power-up sprite (SVG)
│   ├── VersusLobby.jsx       # Host / join, pilot slots, countdown
│   ├── VersusHUD.jsx         # In-game rival chips & INCOMING warning
│   ├── VersusResult.jsx      # Spectating, rankings, play again
│   ├── versusStyles.js       # Shared styles for the versus screens
│   ├── Leaderboard.jsx
│   ├── ScoreSubmissionModal.jsx
│   ├── DeathScreen.jsx
│   ├── MobileControls.jsx
│   ├── PortraitOverlay.jsx
│   ├── AudioToggle.jsx
│   ├── DriftSpaceLogo.jsx
│   └── DriftSpaceMark.jsx
│
├── game
│   ├── useGameLoop.js        # Update / render loop, collisions, effects
│   ├── Ship.js
│   ├── Asteroid.js
│   ├── Bullet.js
│   ├── PowerUp.js            # Pickup entity (drop, drift, collect)
│   ├── powerUpGlyph.js       # Power-up definitions & pixel bitmaps
│   ├── Particle.js           # Particles, debris, flashes, popups, nova
│   ├── shipGlyph.js
│   ├── asteroidGlyph.js
│   └── constants.js          # Tuning values (incl. power-up rates)
│
├── assets
│   └── audio                 # AudioManager, music & SFX
│
├── hooks
│   ├── useHighScores.js
│   ├── useLeaderboard.js
│   └── useVersus.js          # Versus rooms, matches, attacks, rankings
│
├── services
│   ├── supabase.js           # Supabase client & leaderboard queries
│   └── versus.js             # Realtime room channel (Broadcast + Presence)
│
└── mobile.css                # Touch & short-screen layout rules
```

---

# ⚙️ Tech Stack

| Technology | Purpose |
|------------|---------|
| React | User Interface |
| HTML5 Canvas | Game Rendering |
| JavaScript (ES6+) | Gameplay Logic |
| CSS & inline styles | Styling |
| Framer Motion | UI Animation |
| Web Audio API | Chiptune Sound Effects |
| Vite | Build Tool |
| Supabase | Global Leaderboard |
| Supabase Realtime | Versus Multiplayer (Broadcast + Presence) |

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

Create a `.env` file with your Supabase project details. The same project powers the leaderboard and Versus. Realtime is on by default for new projects.

```
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-anon-key
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
- 🌌 New gameplay modes
- 🏅 Versus win counts & seasons
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
