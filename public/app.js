let socket = null;

// DOM Elements
const botStatusDot = document.getElementById('botStatusDot');
const botStatusText = document.getElementById('botStatusText');
const rconStatusDot = document.getElementById('rconStatusDot');
const rconStatusText = document.getElementById('rconStatusText');
const autonomousToggle = document.getElementById('autonomousToggle');
const botNameBadge = document.getElementById('botNameBadge');
const aiProviderBadge = document.getElementById('aiProviderBadge');

// Stats Elements
const statPos = document.getElementById('statPos');
const statHealth = document.getElementById('statHealth');
const barHealth = document.getElementById('barHealth');
const statFood = document.getElementById('statFood');
const barFood = document.getElementById('barFood');
const statTime = document.getElementById('statTime');
const statWeather = document.getElementById('statWeather');
const statHeld = document.getElementById('statHeld');
const statMaster = document.getElementById('statMaster');
const entitiesList = document.getElementById('entitiesList');
const inventoryGrid = document.getElementById('inventoryGrid');

// AI Mind Elements
const currentGoalText = document.getElementById('currentGoalText');
const internalThoughtText = document.getElementById('internalThoughtText');
const thinkingSpinner = document.getElementById('thinkingSpinner');
const chatContainer = document.getElementById('chatContainer');
const chatInput = document.getElementById('chatInput');
const btnSendChat = document.getElementById('btnSendChat');

// Config Elements
const cfgServerHost = document.getElementById('cfgServerHost');
const cfgServerPort = document.getElementById('cfgServerPort');
const cfgBotName = document.getElementById('cfgBotName');
const cfgMasterName = document.getElementById('cfgMasterName');
const cfgAiProvider = document.getElementById('cfgAiProvider');
const cfgAiKey = document.getElementById('cfgAiKey');
const cfgAiModel = document.getElementById('cfgAiModel');
const cfgAiBaseUrl = document.getElementById('cfgAiBaseUrl');
const btnConnectBot = document.getElementById('btnConnectBot');
const btnDisconnectBot = document.getElementById('btnDisconnectBot');
const btnSaveAi = document.getElementById('btnSaveAi');

// Log
const logStream = document.getElementById('logStream');
const btnClearLog = document.getElementById('btnClearLog');

function initWebSocket() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}`;
  socket = new WebSocket(wsUrl);

  socket.onopen = () => {
    addLogEntry('Connected to Web Dashboard server.');
  };

  socket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      handleServerMessage(data);
    } catch (e) {
      console.error('Error parsing WS message:', e);
    }
  };

  socket.onclose = () => {
    addLogEntry('Dashboard WebSocket disconnected. Reconnecting in 3s...');
    setTimeout(initWebSocket, 3000);
  };
}

function handleServerMessage(data) {
  switch (data.type) {
    case 'INIT_STATE':
      if (data.config) populateConfigUI(data.config);
      if (data.snapshot) updatePerceptionUI(data.snapshot);
      if (data.aiState) updateAiUI(data.aiState);
      break;

    case 'SNAPSHOT':
      if (data.snapshot) updatePerceptionUI(data.snapshot);
      if (data.aiState) updateAiUI(data.aiState);
      updateStatusBadges(data.snapshot.status === 'connected', data.rconConnected);
      break;

    case 'CHAT':
      appendChatBubble(data.username, data.message);
      break;

    case 'AI_THOUGHT':
      internalThoughtText.textContent = `"${data.thought}"`;
      break;

    case 'LOG':
      addLogEntry(`[${data.timestamp}] ${data.text}`);
      break;

    case 'NOTIFICATION':
      addLogEntry(`[Notice] ${data.text}`);
      break;
  }
}

function populateConfigUI(cfg) {
  if (cfg.server) {
    cfgServerHost.value = cfg.server.host || 'localhost';
    cfgServerPort.value = cfg.server.port || 25565;
    cfgBotName.value = cfg.server.username || 'AI_Alex';
  }
  if (cfg.ai) {
    cfgMasterName.value = cfg.ai.masterName || 'Player';
    cfgAiProvider.value = cfg.ai.provider || 'groq';
    cfgAiKey.value = cfg.ai.apiKey || '';
    cfgAiModel.value = cfg.ai.model || 'llama-3.3-70b-versatile';
    cfgAiBaseUrl.value = cfg.ai.baseUrl || 'https://api.groq.com/openai/v1';
    autonomousToggle.checked = cfg.ai.autonomousMode !== false;
    aiProviderBadge.textContent = (cfg.ai.provider || 'groq').toUpperCase();
  }
}

function updateStatusBadges(botConnected, rconConnected) {
  if (botConnected) {
    botStatusDot.className = 'status-dot online';
    botStatusText.textContent = 'Bot: Connected';
  } else {
    botStatusDot.className = 'status-dot offline';
    botStatusText.textContent = 'Bot: Disconnected';
  }

  if (rconConnected) {
    rconStatusDot.className = 'status-dot online';
    rconStatusText.textContent = 'RCON: Connected';
  } else {
    rconStatusDot.className = 'status-dot offline';
    rconStatusText.textContent = 'RCON: Disconnected';
  }
}

function updatePerceptionUI(snap) {
  if (snap.status === 'disconnected') {
    statPos.textContent = 'Offline';
    statHealth.textContent = '0/20';
    barHealth.style.width = '0%';
    statFood.textContent = '0/20';
    barFood.style.width = '0%';
    statTime.textContent = '--';
    statWeather.textContent = '--';
    statHeld.textContent = '--';
    statMaster.textContent = '--';
    entitiesList.innerHTML = '<li class="empty-msg">Bot disconnected from server.</li>';
    inventoryGrid.innerHTML = '<span class="empty-msg">No inventory</span>';
    return;
  }

  botNameBadge.textContent = snap.botName || cfgBotName.value;

  if (snap.position) {
    statPos.textContent = `${snap.position.x}, ${snap.position.y}, ${snap.position.z}`;
  }

  const h = snap.health || 0;
  statHealth.textContent = `${h}/20`;
  barHealth.style.width = `${(h / 20) * 100}%`;

  const f = snap.food || 0;
  statFood.textContent = `${f}/20`;
  barFood.style.width = `${(f / 20) * 100}%`;

  statTime.textContent = snap.timeOfDay || 'day';
  statWeather.textContent = snap.isRaining ? '🌧️ Rain' : '☀️ Clear';
  statHeld.textContent = snap.heldItem || 'empty';

  if (snap.master) {
    statMaster.textContent = snap.master.isNearby ? `Nearby (${snap.master.distance}m)` : 'Far / Offline';
  }

  // Entities List
  if (snap.nearbyEntities && snap.nearbyEntities.length > 0) {
    entitiesList.innerHTML = snap.nearbyEntities.map(e => `
      <li>
        <span>${getIconForEntity(e.type)} <strong>${e.name}</strong></span>
        <span class="stat-label">${e.distance}m away</span>
      </li>
    `).join('');
  } else {
    entitiesList.innerHTML = '<li class="empty-msg">No entities nearby.</li>';
  }

  // Inventory Grid
  if (snap.inventorySummary && Array.isArray(snap.inventorySummary) && snap.inventorySummary.length > 0 && typeof snap.inventorySummary[0] === 'object') {
    inventoryGrid.innerHTML = snap.inventorySummary.map(item => `
      <div class="item-badge">${item.name} x${item.count}</div>
    `).join('');
  } else {
    inventoryGrid.innerHTML = '<span class="empty-msg">Empty inventory</span>';
  }
}

function getIconForEntity(type) {
  if (type === 'player') return '👤';
  if (type === 'hostile_mob') return '🧟';
  if (type === 'passive_mob') return '🐷';
  if (type === 'dropped_item') return '📦';
  return '❓';
}

function updateAiUI(aiState) {
  if (!aiState) return;
  if (aiState.currentGoal) currentGoalText.textContent = aiState.currentGoal;
  if (aiState.lastThought) internalThoughtText.textContent = `"${aiState.lastThought}"`;
  if (aiState.isThinking) {
    thinkingSpinner.classList.remove('hidden');
  } else {
    thinkingSpinner.classList.add('hidden');
  }
}

function appendChatBubble(username, message) {
  const div = document.createElement('div');
  const isUser = username.includes('You') || username === cfgMasterName.value;
  const isSystem = username === 'System';

  if (isSystem) {
    div.className = 'chat-bubble system';
    div.innerHTML = `<span class="chat-sender">System:</span><span class="chat-msg">${message}</span>`;
  } else if (isUser) {
    div.className = 'chat-bubble user';
    div.innerHTML = `<span class="chat-sender">${username}:</span><span class="chat-msg">${message}</span>`;
  } else {
    div.className = 'chat-bubble agent';
    div.innerHTML = `<span class="chat-sender">${username}:</span><span class="chat-msg">${message}</span>`;
  }

  chatContainer.appendChild(div);
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

function addLogEntry(text) {
  const div = document.createElement('div');
  div.className = 'log-entry';
  div.textContent = text;
  logStream.appendChild(div);
  logStream.scrollTop = logStream.scrollHeight;
}

// Event Listeners
btnConnectBot.addEventListener('click', () => {
  if (!socket) return;
  socket.send(JSON.stringify({
    action: 'CONNECT_BOT',
    payload: {
      host: cfgServerHost.value,
      port: parseInt(cfgServerPort.value, 10),
      username: cfgBotName.value,
      masterName: cfgMasterName.value
    }
  }));
});

btnDisconnectBot.addEventListener('click', () => {
  if (!socket) return;
  socket.send(JSON.stringify({ action: 'DISCONNECT_BOT' }));
});

btnSaveAi.addEventListener('click', () => {
  if (!socket) return;
  const payload = {
    provider: cfgAiProvider.value,
    apiKey: cfgAiKey.value,
    model: cfgAiModel.value,
    baseUrl: cfgAiBaseUrl.value,
    masterName: cfgMasterName.value
  };
  socket.send(JSON.stringify({ action: 'UPDATE_AI', payload }));
  aiProviderBadge.textContent = cfgAiProvider.value.toUpperCase();
});

autonomousToggle.addEventListener('change', () => {
  if (!socket) return;
  socket.send(JSON.stringify({ action: 'TOGGLE_AUTONOMOUS' }));
});

function sendChatMessage() {
  const text = chatInput.value.trim();
  if (!text || !socket) return;
  socket.send(JSON.stringify({ action: 'SEND_CHAT', payload: { text } }));
  chatInput.value = '';
}

btnSendChat.addEventListener('click', sendChatMessage);
chatInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') sendChatMessage();
});

// Quick Actions
document.querySelectorAll('.btn-action').forEach(btn => {
  btn.addEventListener('click', () => {
    const actionType = btn.getAttribute('data-action');
    if (socket && actionType) {
      socket.send(JSON.stringify({ action: 'QUICK_ACTION', payload: { type: actionType } }));
    }
  });
});

btnClearLog.addEventListener('click', () => {
  logStream.innerHTML = '';
});

// Provider Dropdown Change Helper
cfgAiProvider.addEventListener('change', () => {
  const p = cfgAiProvider.value;
  if (p === 'groq') {
    cfgAiBaseUrl.value = 'https://api.groq.com/openai/v1';
    cfgAiModel.value = 'llama-3.3-70b-versatile';
  } else if (p === 'gemini') {
    cfgAiBaseUrl.value = 'https://generativelanguage.googleapis.com/v1beta/openai/';
    cfgAiModel.value = 'gemini-1.5-flash';
  } else if (p === 'local') {
    cfgAiBaseUrl.value = 'http://localhost:11434/v1';
    cfgAiModel.value = 'llama3.2';
  }
});

// Initialize on load
window.addEventListener('DOMContentLoaded', () => {
  initWebSocket();
});
