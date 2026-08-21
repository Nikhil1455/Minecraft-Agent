import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { RconService } from './bot/rcon.js';
import { AgentBot } from './bot/agentBot.js';
import { AIBrain } from './ai/brain.js';
import { WebServer } from './server/webServer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const configPath = path.join(__dirname, '../config.json');

class ConfigManager {
  constructor(filePath) {
    this.filePath = filePath;
    this.config = this.load();
  }

  load() {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf8');
        return JSON.parse(raw);
      }
    } catch (e) {
      console.error('[Config] Failed to read config file:', e.message);
    }
    return {
      server: { host: 'localhost', port: 25565, username: 'AI_Alex', auth: 'offline' },
      rcon: { enabled: false, host: 'localhost', port: 25575, password: '' },
      ai: { provider: 'groq', apiKey: '', baseUrl: 'https://api.groq.com/openai/v1', model: 'llama-3.3-70b-versatile', masterName: 'Player', autonomousMode: true, autonomousIntervalSeconds: 12 },
      web: { port: 3000 }
    };
  }

  save() {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(this.config, null, 2), 'utf8');
    } catch (e) {
      console.error('[Config] Failed to save config file:', e.message);
    }
  }
}

async function main() {
  console.log(`==================================================`);
  console.log(`🤖 Initializing Node.js Autonomous AI Minecraft Agent`);
  console.log(`==================================================`);

  const configManager = new ConfigManager(configPath);
  const rconService = new RconService();
  const agentBot = new AgentBot(rconService);
  const aiBrain = new AIBrain(agentBot, rconService);

  // Configure AI Brain
  aiBrain.configure(configManager.config.ai);

  // Start Web Server
  const webServer = new WebServer(agentBot, aiBrain, rconService, configManager);
  const webPort = configManager.config.web?.port || 3000;
  webServer.start(webPort);

  // Auto-connect RCON if enabled in config
  if (configManager.config.rcon?.enabled && configManager.config.rcon?.password) {
    try {
      await rconService.connect(
        configManager.config.rcon.host,
        configManager.config.rcon.port,
        configManager.config.rcon.password
      );
    } catch (e) {
      console.warn('[RCON Auto-connect] Could not connect automatically:', e.message);
    }
  }

  // Graceful Shutdown
  const shutdown = async () => {
    console.log('\nShutting down Minecraft AI Agent...');
    agentBot.disconnect();
    await rconService.disconnect();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch(err => {
  console.error('Fatal initialization error:', err);
  process.exit(1);
});
