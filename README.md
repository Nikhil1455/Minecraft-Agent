# Minecraft-Agent
An open source agent for Minecraft which uses pure python instead of node.js to avoid scripting errors, the bot supports both local and cloud LLM API
# 🎮 Minecraft Agent - AI-Powered Minecraft Assistant

[![Python](https://img.shields.io/badge/Python-3.8+-blue.svg)](https://python.org)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![RCON](https://img.shields.io/badge/Protocol-RCON-orange.svg)](https://wiki.vg/RCON)

**A powerful Minecraft bot that connects to your server via RCON (Pure Python - NO Node.js required!)**

This agent can build structures, manage inventory, control weather/time, chat with players, and execute any command - all controlled through a beautiful GUI or Python scripts!

---

## ✨ Features

### 🤖 **AI Integration** (Optional)
- **Gemini API** - Google's advanced language model
- **Groq API** - Ultra-fast inference
- **Local LLMs** - Ollama, LM Studio (privacy-focused, free!)
- Smart decision-making for complex tasks

### 🎮 **Real Minecraft Control**
- ✅ **Pure Python RCON Client** - No Node.js, no npm, no scripting issues!
- ✅ Build houses and structures automatically
- ✅ Teleport players and entities
- ✅ Give items to players
- ✅ Control time and weather
- ✅ Chat with players on the server
- ✅ Execute any Minecraft command
- ✅ Action logging to .txt files
- ✅ Beautiful graphical interface

### 💾 **Memory & Logging**
- Remembers player preferences
- Logs all actions with timestamps
- Saves configuration automatically

---

## 🚀 Quick Start

### Method 1: Using the GUI (Recommended)

```bash
# Run the graphical interface
python minecraft_gui_rcon.py
```

### Method 2: Using Python Script

```python
from minecraft_real_bot import MinecraftPythonBot

bot = MinecraftPythonBot()
bot.connect("localhost", 25575, "your_rcon_password")
bot.chat("Hello world!")
bot.build_house(100, 64, 100)
bot.disconnect()
```

---

## 📋 Requirements

### For RCON Bot (Main Feature):
- **Python 3.8+** (no additional packages needed!)
- **Minecraft Server** with RCON enabled
- **NO Node.js required!**

### For AI Features (Optional):
- `pip install google-generativeai` (for Gemini)
- `pip install groq` (for Groq)
- Or use local LLMs (free!)

---

## 🔧 Setting Up RCON on Your Minecraft Server

### Step 1: Edit server.properties

Open your `server.properties` file and add/modify these lines:

```properties
# Enable RCON
enable-rcon=true

# Set a strong password (CHANGE THIS!)
rcon.password=YourSecurePassword123

# RCON port (default: 25575)
rcon.port=25575

# Allow RCON from localhost (or set to false for remote)
rcon.ip=0.0.0.0

# Max retry attempts
max-rcon-retries=3
```

### Step 2: Restart Your Server

Restart your Minecraft server for changes to take effect.

### Step 3: Configure Firewall (if connecting remotely)

Make sure port `25575` (or your custom RCON port) is open in your firewall.

---

## 🎨 Using the GUI

### Launch the Application

```bash
python minecraft_gui_rcon.py
```

### Interface Overview

The GUI has three main sections:

#### 1. **Server Configuration** 🔧
- **Server IP**: Your Minecraft server address (e.g., `localhost`, `play.hypixel.net`)
- **RCON Port**: RCON port from server.properties (default: `25575`)
- **RCON Password**: Password you set in server.properties
- **Bot Username**: Name for the bot in logs

#### 2. **Bot Actions** ⚡
- **💬 Chat**: Send messages to server chat
- **🏠 Build House**: Automatically construct buildings
- **🎁 Give Item**: Give items to players
- **🌅 Set Time**: Change time of day
- **⛅ Set Weather**: Control weather
- **📋 Get Players**: List online players
- **📜 Custom Command**: Execute any Minecraft command

#### 3. **Activity Log** 📋
- Real-time log of all bot actions
- Color-coded messages (success, error, warning)
- Timestamps for each action

---

## 📖 Detailed Usage Examples

### Example 1: Connect and Chat

```python
from minecraft_real_bot import MinecraftPythonBot

bot = MinecraftPythonBot()

# Connect to server
if bot.connect("localhost", 25575, "mypassword"):
    bot.chat("Hello everyone! I'm the agent!")
    bot.disconnect()
```

### Example 2: Build a House

```python
from minecraft_real_bot import MinecraftPythonBot

bot = MinecraftPythonBot()
bot.connect("localhost", 25575, "mypassword")

# Build a 5x7 house at coordinates (100, 64, 100)
bot.build_house(
    x=100, y=64, z=100,
    width=5, length=7, height=4,
    wall_block="oak_planks",
    floor_block="cobblestone"
)

bot.disconnect()
```

### Example 3: Manage Server

```python
from minecraft_real_bot import MinecraftPythonBot

bot = MinecraftPythonBot()
bot.connect("localhost", 25575, "mypassword")

# Set time to day
bot.set_time("day")

# Clear weather
bot.set_weather("clear")

# Give diamonds to player
bot.give_item("Steve", "diamond", 64)

# Get list of players
players = bot.get_players()
print(f"Online players: {players}")

# Execute custom command
response = bot.execute_command("gamemode creative")
print(response)

bot.disconnect()
```

### Example 4: Advanced Building

```python
from minecraft_real_bot import MinecraftPythonBot

bot = MinecraftPythonBot()
bot.connect("localhost", 25575, "mypassword")

# Build multiple structures
locations = [
    (100, 64, 100),
    (150, 64, 100),
    (200, 64, 100)
]

for x, y, z in locations:
    bot.build_house(x, y, z, width=6, length=8, height=5)
    bot.chat(f"House built at {x}, {y}, {z}!")

bot.disconnect()
```

---

## 🤖 AI Integration (Optional)

The agent can optionally use AI to make intelligent decisions about what actions to take.

### Setup AI Provider

#### Option 1: Google Gemini API

1. Get API key from https://makersuite.google.com/app/apikey
2. Free tier: 15 million tokens/month!

```python
from minecraft_agent import MinecraftAgent

agent = MinecraftAgent()
agent.configure_api(
    provider="gemini",
    api_key="YOUR_GEMINI_API_KEY"
)
```

#### Option 2: Groq API

1. Get API key from https://console.groq.com/keys
2. Extremely fast inference!

```python
from minecraft_agent import MinecraftAgent

agent = MinecraftAgent()
agent.configure_api(
    provider="groq",
    api_key="YOUR_GROQ_API_KEY"
)
```

#### Option 3: Local LLM (Free & Private!)

Using Ollama:

```bash
# Install Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# Pull a model
ollama pull llama3.2
```

```python
from minecraft_agent import MinecraftAgent

agent = MinecraftAgent()
agent.configure_api(
    provider="local",
    base_url="http://localhost:11434",
    model_name="llama3.2"
)
```

Using LM Studio:

```python
agent.configure_api(
    provider="local",
    base_url="http://localhost:1234/v1",
    model_name="your-local-model"
)
```

---

## 🎯 Available Commands

### Movement & Teleportation
- `teleport(x, y, z, target=None)` - Teleport to coordinates

### Building
- `set_block(x, y, z, block_type)` - Place single block
- `fill_blocks(x1, y1, z1, x2, y2, z2, block)` - Fill region
- `build_house(x, y, z, width, length, height, ...)` - Build structure

### Inventory
- `give_item(player, item, amount)` - Give items

### Server Management
- `set_time(time_value)` - Set time (day, night, noon, etc.)
- `set_weather(weather)` - Set weather (clear, rain, thunder)
- `get_players()` - Get online players list

### Communication
- `chat(message)` - Send chat message

### Custom
- `execute_command(command)` - Run any Minecraft command

---

## 📝 Logging

All actions are automatically logged to `bot_actions.log`:

```
[2024-01-15 14:30:25] CONNECT: Connected to localhost:25575
[2024-01-15 14:30:30] CHAT: Hello everyone!
[2024-01-15 14:30:35] BUILD_HOUSE: At 100,64,100
[2024-01-15 14:30:40] SET_TIME: day
[2024-01-15 14:30:45] DISCONNECT: Disconnected from server
```

---

## ❓ Troubleshooting

### "Connection refused" Error

**Problem**: Can't connect to server via RCON

**Solutions**:
1. Make sure RCON is enabled in server.properties
2. Check that rcon.password matches exactly
3. Verify server is running
4. Check firewall settings (port 25575)
5. Try using `localhost` instead of `127.0.0.1`

### "Authentication failed" Error

**Problem**: Wrong RCON password

**Solutions**:
1. Double-check password in server.properties
2. Restart server after changing password
3. Ensure no extra spaces in password

### GUI Won't Start

**Problem**: tkinter not available

**Solutions**:
```bash
# Ubuntu/Debian
sudo apt-get install python3-tk

# Windows/Mac
# tkinter comes with Python by default
# Reinstall Python if missing
```

### Commands Not Working In-Game

**Problem**: Bot connects but commands don't execute

**Solutions**:
1. Make sure bot has appropriate permissions (op status if needed)
2. Check server logs for errors
3. Verify command syntax is correct

---

## 🆚 RCON vs Mineflayer

| Feature | RCON (This Bot) | Mineflayer |
|---------|----------------|------------|
| **Installation** | ✅ Pure Python | ❌ Requires Node.js |
| **Scripting Issues** | ✅ None | ❌ Common on Windows |
| **Setup Complexity** | ✅ Simple | ❌ Complex |
| **Command Execution** | ✅ All commands | ✅ All commands |
| **Movement Control** | ⚠️ Via teleport | ✅ Full pathfinding |
| **Block Interaction** | ⚠️ Via setblock/fill | ✅ Individual blocks |
| **Performance** | ✅ Fast | ⚠️ Moderate |

**Recommendation**: Use RCON for simple automation, building, and server management. Use Mineflayer only if you need fine-grained movement control.

---

## 📁 File Structure

```
minecraft-agent/
├── minecraft_real_bot.py    # Pure Python RCON bot
├── minecraft_gui_rcon.py    # Beautiful GUI application
├── minecraft_agent.py       # AI integration layer
├── minecraft_agent_gui.py   # AI configuration GUI
├── README.md                # This file
├── bot_actions.log          # Auto-generated action log
├── rcon_agent_config.json   # Auto-saved GUI config
└── agent_memory.json        # AI memory storage
```

---

## 🎓 Learning Resources

- [RCON Protocol Specification](https://wiki.vg/RCON)
- [Minecraft Commands Reference](https://minecraft.wiki/w/Commands)
- [Server.properties Guide](https://minecraft.wiki/w/Server.properties)
- [Ollama Setup Guide](https://ollama.ai/)

---

## 🤝 Contributing

Contributions welcome! Ideas:
- More building templates (castles, towers, bridges)
- Advanced pathfinding integration
- Multi-bot coordination
- Web interface
- Discord bot integration

---

## 📄 License

MIT License - Feel free to use and modify!

---

## 💬 Support

Having issues? Check:
1. Server logs for RCON errors
2. Firewall settings
3. This README's troubleshooting section

For AI-related questions, consult the respective API documentation.

---

**Enjoy your automated Minecraft adventures! 🎮✨**
