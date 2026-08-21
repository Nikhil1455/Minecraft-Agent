# 🎮 Minecraft Autonomous AI Agent (Node.js)

[![Node.js](https://img.shields.io/badge/Node.js-v18+-green.svg)](https://nodejs.org)
[![Mineflayer](https://img.shields.io/badge/Mineflayer-v4.23-blue.svg)](https://github.com/PrismarineJS/mineflayer)
[![License](https://img.shields.io/badge/License-MIT-orange.svg)](LICENSE)
[![Dashboard](https://img.shields.io/badge/WebUI-Express%20%2B%20WebSockets-purple.svg)](http://localhost:3000)

**An intelligent, autonomous AI Minecraft character that physically walks, explores, perceives her environment, and acts on her own free will!**

Built with **Node.js, Mineflayer, Pathfinder, and Multi-LLM AI Brain** (supporting Groq, Google Gemini, and Local Ollama/LM Studio). Includes a stunning real-time **Web Control Dashboard**.

---

## ✨ Features

### 🧠 **Autonomous "Free Will" AI Mind**
- **Periodic Decision Loop**: When idle, the agent periodically scans her surroundings, updates her internal mood/thought, and acts autonomously (exploring, building shelter, gathering wood/ores, following master, resting, defending).
- **Interactive Chat**: Responds in natural conversation when players talk to her in-game or via the Web UI.
- **Multi-LLM Support**:
  - ⚡ **Groq API**: Ultra-fast inference (e.g. `llama-3.3-70b-versatile`)
  - ♊ **Google Gemini API**: Advanced Google AI reasoning
  - 🦙 **Local LLMs**: Free & private via Ollama (`llama3.2`) or LM Studio

### 🚶 **Real Physical Movement & Pathfinder**
- ✅ **3D Terrain Pathfinding**: Uses `mineflayer-pathfinder` to walk, jump, navigate around obstacles, and swim.
- ✅ **Player Follow**: Follows master player smoothly across terrain.
- ✅ **Resource Mining & Block Placement**: Digs blocks, gathers items, and builds structures.
- ✅ **Survival Mechanics**: Eats food when hungry, auto-respawns on death, defends against threats.

### 👁️ **360° Environmental Perception**
- Continuously tracks position $(x, y, z)$, health, food, time of day, weather, held item, inventory.
- Detects nearby entities (players, hostile mobs, animals, dropped items) with exact distances.
- Identifies nearby blocks of interest (trees, ores, crafting tables, chests, water, lava).

### 🌐 **Modern Web Control Dashboard**
- Dark-themed glassmorphism interface at `http://localhost:3000`.
- **Live Perception Monitor**: Health/food bars, position, time/weather, nearby mobs/ores list, inventory grid.
- **AI Mind Monitor**: Displays active goal, internal thought stream, and thinking indicator.
- **Interactive Chat**: Chat with the agent directly from your browser.
- **Quick Action Grid**: One-click actions (Set Day, Set Night, Clear Weather, Heal, Give Diamond, Follow, Wander, Build House, Stop).
- **Settings Panel**: Update server IP, port, username, AI provider, API key, model, and toggle Free Will mode live!

---

## 🚀 Quick Start

### 1. Prerequisites
- **Node.js** v18.0.0 or higher
- **Minecraft Server** (Vanilla, Paper, Spigot, or Forge)

### 2. Installation

```bash
# Clone the repository
git clone https://github.com/your-username/Minecraft-Agent.git
cd Minecraft-Agent

# Install Node.js dependencies
npm install
```

### 3. Launching the Agent & Dashboard

```bash
# Start the AI Agent & Web Dashboard
npm start
```

Open your browser and navigate to **`http://localhost:3000`**!

---

## 🔧 Server Setup & Configuration

### Step 1: Minecraft Server Configuration

In your `server.properties`:

```properties
# Server port (default: 25565)
server-port=25565

# Offline mode (online-mode=false allows bot to join without Mojang auth)
online-mode=false

# Optional: Enable RCON for instant admin actions
enable-rcon=true
rcon.port=25575
rcon.password=YourSecurePassword123
```

### Step 2: Configure AI Provider in Dashboard

1. Open `http://localhost:3000`.
2. Scroll to **Connection & AI Settings**.
3. Select your AI Provider:
   - **Groq**: Get a free API key at [console.groq.com](https://console.groq.com/keys). Set Model to `llama-3.3-70b-versatile`.
   - **Google Gemini**: Get an API key at [makersuite.google.com](https://makersuite.google.com/). Set Model to `gemini-1.5-flash`.
   - **Local (Ollama)**: Install Ollama (`ollama pull llama3.2`) and set Base URL to `http://localhost:11434/v1`.
4. Click **Save AI Settings**.
5. Click **🔌 Connect Bot**.

---

## 📁 Repository Structure

```
Minecraft-Agent/
├── package.json            # Node.js manifest & dependencies
├── config.json             # Saved server, RCON & AI configuration
├── README.md               # Documentation
├── public/                 # Web Dashboard Frontend
│   ├── index.html          # Dashboard HTML structure
│   ├── style.css           # Catppuccin dark glassmorphism styles
│   └── app.js              # Real-time WebSocket dashboard client
└── src/                    # Backend Source Code
    ├── index.js            # Main application entry point
    ├── bot/
    │   ├── agentBot.js     # Mineflayer bot connection & event handler
    │   ├── perception.js   # 360° environmental context engine
    │   ├── actions.js      # Pathfinder & physical action controller
    │   └── rcon.js         # RCON administrative client
    ├── ai/
    │   └── brain.js        # Autonomous mind tick loop & multi-LLM dispatcher
    └── server/
        └── webServer.js    # Express REST API & WebSocket server
```

---

## 🕹️ In-Game Controls & Chat Commands

You can interact with the agent either in **Minecraft Chat** or through the **Web Dashboard**:

| Command / Chat Input | Action Executed |
|----------------------|-----------------|
| `"Follow me"` | Bot uses 3D pathfinding to follow you. |
| `"Wander around"` | Bot explores nearby terrain. |
| `"Mine oak_log"` | Bot locates nearest oak log and digs it. |
| `"Build a house"` | Bot constructs a house at target position. |
| `"Stop"` | Halts all pathfinding and movement. |
| `"Eat"` | Eats food from inventory. |

---

## 🤝 Contributing

Contributions are welcome! Suggested areas for improvement:
- Crafting recipe decision engine
- Advanced combat/PvP strategies using `mineflayer-pvp`
- Multi-bot swarm co-operation

---

## 📄 License

MIT License - feel free to customize and modify!
