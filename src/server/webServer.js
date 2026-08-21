import express from 'express';
import http from 'http';
import { WebSocketServer } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class WebServer {
  constructor(agentBot, aiBrain, rconService, configManager) {
    this.agentBot = agentBot;
    this.aiBrain = aiBrain;
    this.rcon = rconService;
    this.configManager = configManager;

    this.app = express();
    this.server = http.createServer(this.app);
    this.wss = new WebSocketServer({ server: this.server });
    this.clients = new Set();
  }

  start(port = 3000) {
    // Serve static files from /public
    const publicPath = path.join(__dirname, '../../public');
    this.app.use(express.static(publicPath));
    this.app.use(express.json());

    // REST APIs
    this.app.get('/api/status', (req, res) => {
      res.json({
        bot: this.agentBot.getSnapshot(),
        ai: {
          provider: this.aiBrain.provider,
          model: this.aiBrain.model,
          lastThought: this.aiBrain.lastThought,
          currentGoal: this.aiBrain.currentGoal,
          autonomousMode: this.aiBrain.autonomousMode
        },
        rcon: {
          connected: this.rcon ? this.rcon.isConnected : false
        }
      });
    });

    // WebSocket Handlers
    this.wss.on('connection', (ws) => {
      this.clients.add(ws);
      console.log('[Web UI] Client connected');

      // Send initial state snapshot
      this.sendToClient(ws, {
        type: 'INIT_STATE',
        config: this.configManager.config,
        snapshot: this.agentBot.getSnapshot(),
        aiState: {
          lastThought: this.aiBrain.lastThought,
          currentGoal: this.aiBrain.currentGoal,
          autonomousMode: this.aiBrain.autonomousMode
        }
      });

      ws.on('message', async (message) => {
        try {
          const data = JSON.parse(message);
          await this.handleClientMessage(ws, data);
        } catch (err) {
          console.error('[Web UI] WS Error:', err.message);
        }
      });

      ws.on('close', () => {
        this.clients.delete(ws);
        console.log('[Web UI] Client disconnected');
      });
    });

    // Bind log listeners to broadcast to WS
    this.agentBot.onLogCallback = (logMsg) => {
      this.broadcast({ type: 'LOG', text: logMsg, timestamp: new Date().toLocaleTimeString() });
    };

    this.agentBot.onChatCallback = (username, message) => {
      this.broadcast({ type: 'CHAT', username, message, timestamp: new Date().toLocaleTimeString() });
      // Feed chat to AI Brain if connected
      if (this.agentBot.isConnected && username !== this.agentBot.bot?.username) {
        this.aiBrain.think(`<${username}> says: ${message}`);
      }
    };

    // Periodic perception & brain state broadcast (every 1.5s)
    setInterval(() => {
      if (this.clients.size > 0) {
        this.broadcast({
          type: 'SNAPSHOT',
          snapshot: this.agentBot.getSnapshot(),
          aiState: {
            lastThought: this.aiBrain.lastThought,
            currentGoal: this.aiBrain.currentGoal,
            autonomousMode: this.aiBrain.autonomousMode,
            isThinking: this.aiBrain.isThinking
          },
          rconConnected: this.rcon ? this.rcon.isConnected : false
        });
      }
    }, 1500);

    this.server.listen(port, () => {
      console.log(`\n==================================================`);
      console.log(`🚀 Minecraft AI Agent Web Dashboard Running!`);
      console.log(`🌐 Open http://localhost:${port} in your web browser`);
      console.log(`==================================================\n`);
    });
  }

  async handleClientMessage(ws, data) {
    const { action, payload } = data;

    switch (action) {
      case 'CONNECT_BOT':
        try {
          this.configManager.config.server = { ...this.configManager.config.server, ...payload };
          this.configManager.save();
          this.agentBot.connect(payload);
          this.sendToClient(ws, { type: 'NOTIFICATION', level: 'info', text: 'Connecting to Minecraft server...' });
        } catch (e) {
          this.sendToClient(ws, { type: 'NOTIFICATION', level: 'error', text: `Connection error: ${e.message}` });
        }
        break;

      case 'DISCONNECT_BOT':
        this.agentBot.disconnect();
        this.sendToClient(ws, { type: 'NOTIFICATION', level: 'warn', text: 'Bot disconnected.' });
        break;

      case 'CONNECT_RCON':
        try {
          this.configManager.config.rcon = { ...this.configManager.config.rcon, ...payload };
          this.configManager.save();
          await this.rcon.connect(payload.host, payload.port, payload.password);
          this.sendToClient(ws, { type: 'NOTIFICATION', level: 'success', text: 'RCON Connected successfully!' });
        } catch (e) {
          this.sendToClient(ws, { type: 'NOTIFICATION', level: 'error', text: `RCON Connection failed: ${e.message}` });
        }
        break;

      case 'DISCONNECT_RCON':
        await this.rcon.disconnect();
        this.sendToClient(ws, { type: 'NOTIFICATION', level: 'warn', text: 'RCON Disconnected.' });
        break;

      case 'UPDATE_AI':
        this.configManager.config.ai = { ...this.configManager.config.ai, ...payload };
        this.configManager.save();
        this.aiBrain.configure(payload);
        this.sendToClient(ws, { type: 'NOTIFICATION', level: 'success', text: 'AI Configuration updated!' });
        break;

      case 'SEND_CHAT':
        if (!payload.text) return;
        this.broadcast({ type: 'CHAT', username: 'You (Dashboard)', message: payload.text, timestamp: new Date().toLocaleTimeString() });
        const aiResponse = await this.aiBrain.think(payload.text);
        if (aiResponse.thought) {
          this.broadcast({ type: 'AI_THOUGHT', thought: aiResponse.thought });
        }
        break;

      case 'TOGGLE_AUTONOMOUS':
        const newMode = !this.aiBrain.autonomousMode;
        this.configManager.config.ai.autonomousMode = newMode;
        this.configManager.save();
        this.aiBrain.configure({ ...this.configManager.config.ai, autonomousMode: newMode });
        this.sendToClient(ws, { type: 'NOTIFICATION', level: 'info', text: `Autonomous Free Will Mode ${newMode ? 'ENABLED' : 'DISABLED'}` });
        break;

      case 'QUICK_ACTION':
        await this.handleQuickAction(ws, payload.type, payload.cmd);
        break;

      default:
        console.warn('[Web UI] Unknown WS action:', action);
    }
  }

  async handleQuickAction(ws, type, cmd) {
    if (!this.agentBot.isConnected && type !== 'rcon') {
      this.sendToClient(ws, { type: 'NOTIFICATION', level: 'error', text: 'Bot must be connected to execute in-game actions.' });
      return;
    }

    const actions = this.agentBot.actions;
    const master = this.aiBrain.masterName || 'Player';

    switch (type) {
      case 'time_day':
        if (this.rcon && this.rcon.isConnected) await this.rcon.sendCommand('time set day');
        else if (actions) actions.say('/time set day');
        this.sendToClient(ws, { type: 'NOTIFICATION', level: 'info', text: 'Set time to Day' });
        break;

      case 'time_night':
        if (this.rcon && this.rcon.isConnected) await this.rcon.sendCommand('time set night');
        else if (actions) actions.say('/time set night');
        this.sendToClient(ws, { type: 'NOTIFICATION', level: 'info', text: 'Set time to Night' });
        break;

      case 'weather_clear':
        if (this.rcon && this.rcon.isConnected) await this.rcon.sendCommand('weather clear');
        else if (actions) actions.say('/weather clear');
        this.sendToClient(ws, { type: 'NOTIFICATION', level: 'info', text: 'Cleared weather' });
        break;

      case 'heal_master':
        if (this.rcon && this.rcon.isConnected) await this.rcon.sendCommand(`effect give ${master} regeneration 5 2`);
        else if (actions) actions.say(`/effect give ${master} regeneration 5 2`);
        this.sendToClient(ws, { type: 'NOTIFICATION', level: 'info', text: `Healed player ${master}` });
        break;

      case 'give_diamond':
        if (this.rcon && this.rcon.isConnected) await this.rcon.sendCommand(`give ${master} diamond 10`);
        else if (actions) actions.say(`/give ${master} diamond 10`);
        this.sendToClient(ws, { type: 'NOTIFICATION', level: 'info', text: `Gave diamonds to ${master}` });
        break;

      case 'follow_me':
        if (actions) await actions.followPlayer(master);
        this.sendToClient(ws, { type: 'NOTIFICATION', level: 'info', text: `Started following ${master}` });
        break;

      case 'wander':
        if (actions) await actions.wanderAround();
        this.sendToClient(ws, { type: 'NOTIFICATION', level: 'info', text: 'Started wandering around' });
        break;

      case 'stop':
        if (actions) await actions.stopMovement();
        this.sendToClient(ws, { type: 'NOTIFICATION', level: 'info', text: 'Stopped movement' });
        break;

      case 'build_house':
        if (actions && this.agentBot.bot?.entity) {
          const pos = this.agentBot.bot.entity.position;
          await actions.buildStructure('house', pos.x + 5, pos.y, pos.z + 5);
        }
        this.sendToClient(ws, { type: 'NOTIFICATION', level: 'info', text: 'Started house construction' });
        break;

      case 'custom_rcon':
        if (this.rcon && this.rcon.isConnected) {
          const res = await this.rcon.sendCommand(cmd);
          this.sendToClient(ws, { type: 'NOTIFICATION', level: 'info', text: `RCON Response: ${res}` });
        } else {
          this.sendToClient(ws, { type: 'NOTIFICATION', level: 'error', text: 'RCON is not connected.' });
        }
        break;

      default:
        console.warn('Unknown quick action:', type);
    }
  }

  sendToClient(ws, data) {
    if (ws && ws.readyState === 1) {
      ws.send(JSON.stringify(data));
    }
  }

  broadcast(data) {
    const payload = JSON.stringify(data);
    for (const ws of this.clients) {
      if (ws.readyState === 1) {
        ws.send(payload);
      }
    }
  }
}
