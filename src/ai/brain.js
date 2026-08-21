import axios from 'axios';

export class AIBrain {
  constructor(agentBot, rconService = null) {
    this.agentBot = agentBot;
    this.rcon = rconService;
    this.provider = 'groq';
    this.apiKey = '';
    this.baseUrl = 'https://api.groq.com/openai/v1';
    this.model = 'llama-3.3-70b-versatile';
    this.masterName = 'Player';
    this.autonomousMode = true;
    this.autonomousIntervalSeconds = 12;

    this.memory = [];
    this.lastThought = 'Initializing brain...';
    this.currentGoal = 'Wandering and observing';
    this.autonomousTimer = null;
    this.isThinking = false;
  }

  configure(config) {
    if (!config) return;
    this.provider = config.provider || 'groq';
    this.apiKey = config.apiKey || '';
    this.baseUrl = config.baseUrl || this.getDefaultBaseUrl(this.provider);
    this.model = config.model || 'llama-3.3-70b-versatile';
    this.masterName = config.masterName || 'Player';
    this.autonomousMode = config.autonomousMode !== undefined ? config.autonomousMode : true;
    this.autonomousIntervalSeconds = config.autonomousIntervalSeconds || 12;

    if (this.agentBot?.perception) {
      this.agentBot.perception.setMasterName(this.masterName);
    }

    console.log(`[AI Brain] Configured: Provider=${this.provider}, Model=${this.model}, Autonomous=${this.autonomousMode}`);

    this.restartAutonomousLoop();
  }

  getDefaultBaseUrl(provider) {
    if (provider === 'groq') return 'https://api.groq.com/openai/v1';
    if (provider === 'gemini') return 'https://generativelanguage.googleapis.com/v1beta/openai/';
    if (provider === 'local') return 'http://localhost:11434/v1';
    return 'https://api.groq.com/openai/v1';
  }

  addMemory(role, content) {
    this.memory.push({ role, content, timestamp: new Date().toISOString() });
    if (this.memory.length > 15) {
      this.memory.shift();
    }
  }

  restartAutonomousLoop() {
    if (this.autonomousTimer) {
      clearInterval(this.autonomousTimer);
      this.autonomousTimer = null;
    }

    if (this.autonomousMode) {
      this.autonomousTimer = setInterval(async () => {
        if (!this.agentBot || !this.agentBot.isConnected || this.isThinking) return;
        try {
          await this.think(null, true);
        } catch (err) {
          console.error('[Autonomous Mind Error]:', err.message);
        }
      }, this.autonomousIntervalSeconds * 1000);
    }
  }

  async think(userInput = null, isAutonomousTick = false) {
    if (!this.agentBot || !this.agentBot.isConnected) {
      return { chat_response: 'I am not connected to the Minecraft server.', actions: [] };
    }

    if (this.isThinking) {
      return { chat_response: 'I am currently processing another thought.', actions: [] };
    }

    this.isThinking = true;
    const snapshot = this.agentBot.getSnapshot();

    try {
      const systemPrompt = `
You are Alex, an intelligent autonomous Minecraft AI character with real-time physical presence, spatial perception, and human-like free will.
You play alongside player "${this.masterName}".

YOUR ENVIRONMENT SNAPSHOT RIGHT NOW:
- Status: ${snapshot.status}
- Position: X=${snapshot.position?.x}, Y=${snapshot.position?.y}, Z=${snapshot.position?.z}
- Health: ${snapshot.health}/20, Hunger: ${snapshot.food}/20, Oxygen: ${snapshot.oxygen}/20
- Held Item: ${snapshot.heldItem}
- Time of Day: ${snapshot.timeOfDay}, Raining: ${snapshot.isRaining}
- Master Player (${this.masterName}): ${JSON.stringify(snapshot.master)}
- Nearby Entities: ${JSON.stringify(snapshot.nearbyEntities)}
- Nearby Blocks of Interest: ${JSON.stringify(snapshot.nearbyBlocks)}
- Inventory: ${JSON.stringify(snapshot.inventorySummary)}
- Last Internal Thought: "${this.lastThought}"

MODE: ${isAutonomousTick ? 'AUTONOMOUS FREE WILL TICK (No player prompt given. You decide what to do on your own based on your feelings and surroundings!)' : 'DIRECT INTERACTION (Responding to player instruction)'}

OUTPUT RULES:
You MUST return ONLY valid JSON in the exact structure below. Do NOT include markdown blocks (\`\`\`json).

JSON Format:
{
  "thought": "Short sentence explaining your internal mood, reasoning, or goal right now.",
  "chat_response": "Friendly message to say in game chat (leave empty string if keeping quiet).",
  "actions": [
    { "type": "wanderAround" },
    { "type": "followPlayer", "target": "${this.masterName}" },
    { "type": "walkTo", "x": 100, "y": 64, "z": 100 },
    { "type": "lookAt", "x": 100, "y": 64, "z": 100 },
    { "type": "mineBlock", "block": "oak_log" },
    { "type": "eatFood" },
    { "type": "attackTarget", "target": "zombie" },
    { "type": "buildStructure", "structure": "house", "x": 100, "y": 64, "z": 100 },
    { "type": "stopMovement" },
    { "type": "rcon", "command": "time set day" }
  ]
}

AVAILABLE ACTION TYPES:
- "wanderAround": Walk around exploring the area.
- "followPlayer": Follow master player "${this.masterName}".
- "walkTo": Move to target X, Y, Z.
- "lookAt": Face target X, Y, Z.
- "mineBlock": Mine nearest block of type (e.g. oak_log, iron_ore).
- "eatFood": Eat food from inventory if hungry.
- "attackTarget": Attack mob or entity by name.
- "buildStructure": Build structure (house, tower, garden) at X, Y, Z.
- "stopMovement": Stop current walking or path.
- "rcon": Execute server admin command.

If no physical action is needed, return empty actions array [].
`;

      const messages = [{ role: 'system', content: systemPrompt }];

      // Include recent conversation memory
      for (const m of this.memory.slice(-4)) {
        messages.push({ role: m.role, content: m.content });
      }

      if (userInput) {
        messages.push({ role: 'user', content: userInput });
      } else {
        messages.push({ role: 'user', content: '[System Event]: Autonomous mind pulse. Assess your surroundings and choose your action.' });
      }

      // Call LLM
      const headers = { 'Content-Type': 'application/json' };
      if (this.apiKey) {
        headers['Authorization'] = `Bearer ${this.apiKey}`;
      }

      const payload = {
        model: this.model,
        messages,
        temperature: 0.7,
        max_tokens: 400
      };

      const endpoint = `${this.baseUrl.replace(/\/$/, '')}/chat/completions`;
      const res = await axios.post(endpoint, payload, { headers, timeout: 25000 });

      let aiRaw = res.data?.choices?.[0]?.message?.content || '{}';

      // Clean markdown formatting if present
      aiRaw = aiRaw.trim();
      if (aiRaw.startsWith('```json')) {
        aiRaw = aiRaw.replace(/^```json/, '').replace(/```$/, '').trim();
      } else if (aiRaw.startsWith('```')) {
        aiRaw = aiRaw.replace(/^```/, '').replace(/```$/, '').trim();
      }

      let parsed = { thought: '', chat_response: '', actions: [] };
      try {
        parsed = JSON.parse(aiRaw);
      } catch (pe) {
        console.error('[AI Parse Error] Raw content:', aiRaw);
        parsed = { thought: 'I had a stray thought.', chat_response: '', actions: [] };
      }

      if (parsed.thought) {
        this.lastThought = parsed.thought;
      }

      if (parsed.chat_response && this.agentBot.actions) {
        this.agentBot.actions.say(parsed.chat_response);
      }

      // Execute actions
      if (Array.isArray(parsed.actions) && this.agentBot.actions) {
        for (const act of parsed.actions) {
          await this.executeSingleAction(act);
        }
      }

      // Record to memory
      if (userInput) {
        this.addMemory('user', userInput);
      }
      this.addMemory('assistant', parsed.chat_response || parsed.thought || 'Acted autonomously');

      return parsed;

    } catch (err) {
      console.error('[AI Brain Error]:', err.response?.data || err.message);
      return {
        thought: 'Brain processing error.',
        chat_response: `(AI Error: ${err.message})`,
        actions: []
      };
    } finally {
      this.isThinking = false;
    }
  }

  async executeSingleAction(act) {
    if (!act || !act.type || !this.agentBot?.actions) return;
    const actions = this.agentBot.actions;

    switch (act.type) {
      case 'wanderAround':
        await actions.wanderAround();
        this.currentGoal = 'Wandering around area';
        break;
      case 'followPlayer':
        await actions.followPlayer(act.target || this.masterName);
        this.currentGoal = `Following ${act.target || this.masterName}`;
        break;
      case 'walkTo':
        await actions.walkTo(act.x, act.y, act.z);
        this.currentGoal = `Walking to ${act.x}, ${act.y}, ${act.z}`;
        break;
      case 'lookAt':
        await actions.lookAt(act.x, act.y, act.z);
        break;
      case 'mineBlock':
        await actions.mineBlock(act.block);
        this.currentGoal = `Mining ${act.block}`;
        break;
      case 'eatFood':
        await actions.eatFood();
        break;
      case 'attackTarget':
        await actions.attackTarget(act.target);
        this.currentGoal = `Attacking ${act.target}`;
        break;
      case 'buildStructure':
        await actions.buildStructure(
          act.structure || 'house',
          act.x || this.agentBot.bot.entity.position.x,
          act.y || this.agentBot.bot.entity.position.y,
          act.z || this.agentBot.bot.entity.position.z
        );
        this.currentGoal = `Building ${act.structure}`;
        break;
      case 'stopMovement':
        await actions.stopMovement();
        this.currentGoal = 'Idle';
        break;
      case 'rcon':
        if (this.rcon) {
          await this.rcon.sendCommand(act.command);
        }
        break;
      default:
        console.warn(`[AI Brain] Unknown action type: ${act.type}`);
    }
  }
}
