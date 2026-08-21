/**
 * Perception Engine: Gathers 360-degree real-time environmental context
 * for the AI Brain LLM to understand what is happening in the world.
 */
export class PerceptionEngine {
  constructor(bot, masterName = 'Player') {
    this.bot = bot;
    this.masterName = masterName;
  }

  setMasterName(name) {
    if (name) this.masterName = name;
  }

  getSnapshot() {
    if (!this.bot || !this.bot.entity) {
      return {
        status: 'disconnected',
        message: 'Bot is not connected to server'
      };
    }

    const pos = this.bot.entity.position;
    const health = this.bot.health || 0;
    const food = this.bot.food || 0;
    const oxygen = this.bot.oxygenLevel || 20;

    // Time & Weather
    const timeOfDay = this.bot.time ? this.bot.time.timeOfDay : 0;
    const isNight = timeOfDay >= 13000 && timeOfDay <= 23000;
    const isRaining = !!this.bot.isRaining;

    // Inventory
    const inventoryItems = (this.bot.inventory?.items() || []).map(item => ({
      name: item.name,
      count: item.count,
      slot: item.slot
    }));
    const heldItem = this.bot.heldItem ? this.bot.heldItem.name : 'empty hands';

    // Master Player Info
    const masterEntity = this.bot.players[this.masterName]?.entity;
    let masterInfo = null;
    if (masterEntity) {
      const mPos = masterEntity.position;
      const distance = Math.round(pos.distanceTo(mPos) * 10) / 10;
      masterInfo = {
        name: this.masterName,
        isNearby: distance <= 32,
        distance,
        position: { x: Math.round(mPos.x), y: Math.round(mPos.y), z: Math.round(mPos.z) }
      };
    } else {
      masterInfo = {
        name: this.masterName,
        isNearby: false,
        distance: null,
        status: 'not in render distance or offline'
      };
    }

    // Nearby Entities (Mobs, Players, Items)
    const entities = [];
    const entityKeys = Object.keys(this.bot.entities);
    for (const key of entityKeys) {
      const e = this.bot.entities[key];
      if (!e || e === this.bot.entity) continue;
      const dist = Math.round(pos.distanceTo(e.position) * 10) / 10;
      if (dist > 24) continue; // Only entities within 24 blocks

      if (e.type === 'player') {
        entities.push({ type: 'player', name: e.username || 'Player', distance: dist });
      } else if (e.type === 'mob') {
        const isHostile = ['zombie', 'skeleton', 'creeper', 'spider', 'enderman', 'phantom', 'drowned', 'witch', 'slime'].includes(e.name);
        entities.push({ type: isHostile ? 'hostile_mob' : 'passive_mob', name: e.name, distance: dist });
      } else if (e.type === 'object' && e.name === 'item') {
        entities.push({ type: 'dropped_item', name: e.name, distance: dist });
      }
    }

    // Sort entities by distance
    entities.sort((a, b) => a.distance - b.distance);

    // Nearby Blocks of Interest
    const blocksOfInterest = this.findNearbyBlocksOfInterest(pos);

    return {
      status: 'connected',
      botName: this.bot.username,
      position: {
        x: Math.round(pos.x * 10) / 10,
        y: Math.round(pos.y * 10) / 10,
        z: Math.round(pos.z * 10) / 10
      },
      health: Math.round(health),
      food: Math.round(food),
      oxygen: Math.round(oxygen),
      heldItem,
      timeOfDay: isNight ? 'night' : 'day',
      isRaining,
      master: masterInfo,
      nearbyEntities: entities.slice(0, 10), // Limit top 10 closest
      nearbyBlocks: blocksOfInterest,
      inventorySummary: inventoryItems.length > 0 ? inventoryItems : ['empty inventory']
    };
  }

  findNearbyBlocksOfInterest(pos) {
    if (!this.bot || !this.bot.blockAt) return [];

    const interestingTypes = [
      'oak_log', 'birch_log', 'spruce_log', 'dark_oak_log', 'log',
      'iron_ore', 'coal_ore', 'diamond_ore', 'gold_ore', 'deepslate_iron_ore',
      'crafting_table', 'chest', 'bed', 'furnace', 'water', 'lava', 'wheat'
    ];

    const found = [];
    const radius = 8;

    for (let x = -radius; x <= radius; x += 2) {
      for (let y = -3; y <= 4; y += 2) {
        for (let z = -radius; z <= radius; z += 2) {
          const targetPos = pos.offset(x, y, z);
          const block = this.bot.blockAt(targetPos);
          if (block && interestingTypes.some(t => block.name.includes(t))) {
            const dist = Math.round(pos.distanceTo(block.position) * 10) / 10;
            if (!found.some(f => f.name === block.name && Math.abs(f.distance - dist) < 2)) {
              found.push({ name: block.name, distance: dist, x: Math.round(block.position.x), y: Math.round(block.position.y), z: Math.round(block.position.z) });
            }
          }
        }
      }
    }

    found.sort((a, b) => a.distance - b.distance);
    return found.slice(0, 8);
  }
}
