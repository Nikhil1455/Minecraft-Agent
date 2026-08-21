import mineflayer from 'mineflayer';
import pkg from 'mineflayer-pathfinder';
const { pathfinder, Movements } = pkg;
import { PerceptionEngine } from './perception.js';
import { ActionController } from './actions.js';

export class AgentBot {
  constructor(rconService = null) {
    this.bot = null;
    this.perception = null;
    this.actions = null;
    this.rcon = rconService;
    this.isConnected = false;
    this.config = null;
    this.onChatCallback = null;
    this.onStatusCallback = null;
    this.onLogCallback = null;
  }

  log(msg) {
    console.log(`[Bot] ${msg}`);
    if (this.onLogCallback) {
      this.onLogCallback(msg);
    }
  }

  connect(config) {
    this.config = config;
    this.log(`Connecting to Minecraft server at ${config.host}:${config.port} as '${config.username}'...`);

    const botOptions = {
      host: config.host || 'localhost',
      port: parseInt(config.port, 10) || 25565,
      username: config.username || 'AI_Alex',
      auth: config.auth || 'offline'
    };

    if (config.version) {
      botOptions.version = config.version;
    }

    try {
      this.bot = mineflayer.createBot(botOptions);

      // Attach Plugins
      this.bot.loadPlugin(pathfinder);

      this.perception = new PerceptionEngine(this.bot, config.masterName || 'Player');
      this.actions = new ActionController(this.bot, this.rcon);

      // Event Listeners
      this.bot.on('spawn', async () => {
        this.isConnected = true;
        this.log(`✅ ${this.bot.username} spawned in world successfully!`);

        // Setup pathfinder movements
        const mcData = this.bot.registry || (await import('minecraft-data')).default(this.bot.version);
        const defaultMovements = new Movements(this.bot, mcData);
        defaultMovements.canDig = true;
        defaultMovements.allow1by1tunnels = true;
        this.bot.pathfinder.setMovements(defaultMovements);

        if (this.onStatusCallback) {
          this.onStatusCallback('connected');
        }
      });

      this.bot.on('chat', (username, message) => {
        if (username === this.bot.username) return;
        this.log(`💬 Chat <${username}>: ${message}`);
        if (this.onChatCallback) {
          this.onChatCallback(username, message);
        }
      });

      this.bot.on('whisper', (username, message) => {
        this.log(`🔒 Whisper from <${username}>: ${message}`);
        if (this.onChatCallback) {
          this.onChatCallback(username, message);
        }
      });

      this.bot.on('health', () => {
        if (this.bot.health < 6) {
          this.log(`⚠️ Warning: Low Health! (${Math.round(this.bot.health)}/20)`);
          this.actions.eatFood();
        }
      });

      this.bot.on('death', () => {
        this.log(`💀 Bot died! Auto-respawning in 2 seconds...`);
        setTimeout(() => {
          if (this.bot) this.bot.respawn();
        }, 2000);
      });

      this.bot.on('kicked', (reason) => {
        this.isConnected = false;
        this.log(`🔴 Kicked from server: ${reason}`);
        if (this.onStatusCallback) this.onStatusCallback('disconnected');
      });

      this.bot.on('error', (err) => {
        this.log(`❌ Bot Error: ${err.message}`);
      });

      this.bot.on('end', (reason) => {
        this.isConnected = false;
        this.log(`🔴 Disconnected from server (${reason || 'closed'}).`);
        if (this.onStatusCallback) this.onStatusCallback('disconnected');
      });

    } catch (err) {
      this.isConnected = false;
      this.log(`❌ Failed to create bot: ${err.message}`);
      throw err;
    }
  }

  disconnect() {
    if (this.bot) {
      this.bot.quit();
      this.bot = null;
    }
    this.isConnected = false;
    this.log('Disconnected bot.');
  }

  getSnapshot() {
    if (!this.perception) return { status: 'disconnected' };
    return this.perception.getSnapshot();
  }
}
