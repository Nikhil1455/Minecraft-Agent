import pkg from 'mineflayer-pathfinder';
const { goals } = pkg;
const { GoalNear, GoalBlock, GoalFollow, GoalXZ } = goals;

export class ActionController {
  constructor(bot, rconService = null) {
    this.bot = bot;
    this.rcon = rconService;
    this.currentTask = 'idle';
  }

  setRcon(rconService) {
    this.rcon = rconService;
  }

  say(message) {
    if (!this.bot) return;
    try {
      this.bot.chat(message);
      console.log(`[BOT CHAT] ${this.bot.username}: ${message}`);
    } catch (e) {
      console.error('[Action Error] say:', e.message);
    }
  }

  async stopMovement() {
    if (!this.bot || !this.bot.pathfinder) return;
    try {
      this.bot.pathfinder.setGoal(null);
      this.bot.clearControlStates();
      this.currentTask = 'idle';
    } catch (e) {
      console.error('[Action Error] stopMovement:', e.message);
    }
  }

  async walkTo(x, y, z, range = 1) {
    if (!this.bot || !this.bot.pathfinder) return false;
    try {
      this.currentTask = `walking to ${x}, ${y}, ${z}`;
      const goal = new GoalNear(x, y, z, range);
      this.bot.pathfinder.setGoal(goal);
      return true;
    } catch (e) {
      console.error('[Action Error] walkTo:', e.message);
      return false;
    }
  }

  async followPlayer(username, distance = 3) {
    if (!this.bot || !this.bot.pathfinder) return false;
    try {
      const target = this.bot.players[username]?.entity;
      if (!target) {
        this.say(`I can't see ${username} right now.`);
        return false;
      }
      this.currentTask = `following ${username}`;
      const goal = new GoalFollow(target, distance);
      this.bot.pathfinder.setGoal(goal, true);
      return true;
    } catch (e) {
      console.error('[Action Error] followPlayer:', e.message);
      return false;
    }
  }

  async wanderAround() {
    if (!this.bot || !this.bot.pathfinder || !this.bot.entity) return false;
    try {
      const pos = this.bot.entity.position;
      const dx = (Math.random() - 0.5) * 24;
      const dz = (Math.random() - 0.5) * 24;
      const targetX = Math.round(pos.x + dx);
      const targetZ = Math.round(pos.z + dz);
      this.currentTask = `wandering to ${targetX}, ${targetZ}`;
      const goal = new GoalXZ(targetX, targetZ);
      this.bot.pathfinder.setGoal(goal);
      return true;
    } catch (e) {
      console.error('[Action Error] wanderAround:', e.message);
      return false;
    }
  }

  async lookAt(x, y, z) {
    if (!this.bot || !this.bot.lookAt) return;
    try {
      const Vec3 = (await import('vec3')).Vec3;
      await this.bot.lookAt(new Vec3(x, y, z));
    } catch (e) {
      console.error('[Action Error] lookAt:', e.message);
    }
  }

  async mineBlock(blockName) {
    if (!this.bot) return false;
    try {
      const mcData = this.bot.registry || (await import('minecraft-data')).default(this.bot.version);
      const blockType = mcData.blocksByName[blockName];
      if (!blockType) {
        this.say(`Unknown block type: ${blockName}`);
        return false;
      }

      const targetBlock = this.bot.findBlock({
        matching: blockType.id,
        maxDistance: 16
      });

      if (!targetBlock) {
        this.say(`I couldn't find any ${blockName} nearby.`);
        return false;
      }

      this.currentTask = `mining ${blockName}`;
      this.bot.pathfinder.setGoal(new GoalBlock(targetBlock.position.x, targetBlock.position.y, targetBlock.position.z));
      await this.bot.dig(targetBlock);
      this.say(`Finished mining ${blockName}!`);
      this.currentTask = 'idle';
      return true;
    } catch (e) {
      console.error('[Action Error] mineBlock:', e.message);
      return false;
    }
  }

  async eatFood() {
    if (!this.bot || !this.bot.inventory) return false;
    try {
      const foodItems = ['cooked_beef', 'cooked_porkchop', 'cooked_chicken', 'bread', 'apple', 'baked_potato', 'carrot', 'golden_apple'];
      const food = this.bot.inventory.items().find(item => foodItems.includes(item.name));
      if (!food) {
        this.say("I don't have any food in my inventory!");
        return false;
      }
      await this.bot.equip(food, 'hand');
      await this.bot.consume();
      this.say(`Yum! Ate some ${food.name}.`);
      return true;
    } catch (e) {
      console.error('[Action Error] eatFood:', e.message);
      return false;
    }
  }

  async attackTarget(targetName) {
    if (!this.bot) return false;
    try {
      let targetEntity = null;
      for (const id in this.bot.entities) {
        const entity = this.bot.entities[id];
        if (entity && (entity.name === targetName || entity.username === targetName)) {
          targetEntity = entity;
          break;
        }
      }
      if (!targetEntity) {
        this.say(`Couldn't find target: ${targetName}`);
        return false;
      }
      this.currentTask = `attacking ${targetName}`;
      await this.walkTo(targetEntity.position.x, targetEntity.position.y, targetEntity.position.z, 2);
      await this.bot.attack(targetEntity);
      return true;
    } catch (e) {
      console.error('[Action Error] attackTarget:', e.message);
      return false;
    }
  }

  async buildStructure(structureType, originX, originY, originZ, wallBlock = 'oak_planks') {
    this.currentTask = `building ${structureType}`;
    this.say(`Starting to build ${structureType}...`);

    // Use RCON if available for large fast building, or chat command fallback
    if (this.rcon && this.rcon.isConnected) {
      const x = Math.round(originX);
      const y = Math.round(originY);
      const z = Math.round(originZ);

      if (structureType === 'house' || structureType === 'shelter') {
        // Walls
        await this.rcon.sendCommand(`fill ${x - 3} ${y} ${z - 3} ${x + 3} ${y + 4} ${z + 3} ${wallBlock}`);
        // Hollow interior
        await this.rcon.sendCommand(`fill ${x - 2} ${y + 1} ${z - 2} ${x + 2} ${y + 3} ${z + 2} air`);
        // Doorway
        await this.rcon.sendCommand(`setblock ${x} ${y + 1} ${z - 3} air`);
        await this.rcon.sendCommand(`setblock ${x} ${y + 2} ${z - 3} air`);
        // Roof
        await this.rcon.sendCommand(`fill ${x - 3} ${y + 4} ${z - 3} ${x + 3} ${y + 4} ${z + 3} glass`);
        // Light inside
        await this.rcon.sendCommand(`setblock ${x} ${y + 3} ${z} lantern`);
      } else if (structureType === 'tower') {
        await this.rcon.sendCommand(`fill ${x - 1} ${y} ${z - 1} ${x + 1} ${y + 10} ${z + 1} cobblestone`);
        await this.rcon.sendCommand(`fill ${x} ${y + 1} ${z} ${x} ${y + 9} ${z} ladder`);
      } else if (structureType === 'garden') {
        await this.rcon.sendCommand(`fill ${x - 2} ${y - 1} ${z - 2} ${x + 2} ${y - 1} ${z + 2} farmland`);
        await this.rcon.sendCommand(`setblock ${x} ${y - 1} ${z} water`);
      }
      this.say(`Finished building ${structureType}!`);
    } else {
      // Chat command fallback if server allows /fill /setblock
      this.say(`(Building via in-game command fallback at ${Math.round(originX)}, ${Math.round(originY)}, ${Math.round(originZ)})`);
      this.bot.chat(`/fill ${Math.round(originX) - 2} ${Math.round(originY)} ${Math.round(originZ) - 2} ${Math.round(originX) + 2} ${Math.round(originY) + 3} ${Math.round(originZ) + 2} ${wallBlock}`);
    }
    this.currentTask = 'idle';
  }
}
