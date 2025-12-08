const { ipcRenderer, clipboard } = require('electron');
const { Buffer } = require('buffer');

const logContainer = document.getElementById('console-log');
const statusHeaderText = document.querySelector('.status-text');
const statusLabel = document.querySelector('.status-label');
const statusIndicator = document.querySelector('.status-indicator');
const metaChips = {
  instance: document.querySelector('[data-meta="instance"] b'),
  version: document.querySelector('[data-meta="version"] b'),
  account: document.querySelector('[data-meta="account"] b')
};
const actionBar = document.querySelector('.console-actions');

const stateColors = {
  idle: '#99a0c3',
  preparing: '#ffd65f',
  download: '#9bf0ff',
  verifying: '#9bf0ff',
  running: '#48f2b3',
  closed: '#c4c9ff',
  error: '#ff7b7b'
};

const formatTime = (time) => {
  const date = new Date(time || Date.now());
  return date.toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};

const sanitizeMessage = (value) => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (Buffer.isBuffer(value)) return value.toString('utf8');
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value, null, 2);
    } catch (error) {
      return String(value);
    }
  }
  return String(value);
};

const appendLog = (entry = {}) => {
  const message = sanitizeMessage(entry.message || entry.text);
  if (!message.trim()) return;

  const logLine = document.createElement('div');
  const level = entry.level || entry.type || 'info';
  const source = entry.source || 'launcher';
  const timestamp = entry.timestamp || Date.now();

  logLine.className = `log-line log-${level}`;
  logLine.dataset.raw = `[${formatTime(timestamp)}] (${source}) ${message}`;

  const timeSpan = document.createElement('span');
  timeSpan.className = 'log-time';
  timeSpan.textContent = formatTime(timestamp);

  const sourceSpan = document.createElement('span');
  sourceSpan.className = 'log-source';
  sourceSpan.textContent = source;

  const messageSpan = document.createElement('span');
  messageSpan.className = 'log-message';
  messageSpan.textContent = message;

  logLine.appendChild(timeSpan);
  logLine.appendChild(sourceSpan);
  logLine.appendChild(messageSpan);

  logContainer.appendChild(logLine);
  logContainer.scrollTop = logContainer.scrollHeight;
};

let lastKnownState = null;

const applyState = (state = {}) => {
  const phase = state.phase || state.status || 'idle';
  const label = state.label || 'Sin actividad';
  const color = stateColors[phase] || stateColors.idle;

  statusHeaderText.textContent = label;
  statusLabel.textContent = label;
  statusIndicator.style.background = color;
  statusIndicator.style.boxShadow = `0 0 18px ${color}55`;

  if (state.meta) {
    Object.entries(state.meta).forEach(([key, value]) => {
      if (!metaChips[key]) return;
      metaChips[key].textContent = value || '-';
    });
  }

  lastKnownState = {
    ...state,
    phase,
    label,
    meta: {
      ...lastKnownState?.meta,
      ...state.meta
    }
  };
};

const hydrate = async () => {
  try {
    const payload = await ipcRenderer.invoke('console-window-initial-state');
    payload?.logs?.forEach(appendLog);
    if (payload?.state) applyState(payload.state);
  } catch (error) {
    appendLog({
      message: `No se pudo restaurar el historial: ${error.message || error}`,
      level: 'error',
      source: 'console'
    });
  }
};

hydrate();

ipcRenderer.on('console-log', (_, entry) => appendLog(entry));
ipcRenderer.on('console-clear', () => {
  logContainer.innerHTML = '';
});
ipcRenderer.on('console-state', (_, state) => applyState(state));

const actions = {
  copy: () => {
    const dump = Array.from(logContainer.querySelectorAll('.log-line')).map(
      (line) => line.dataset.raw
    );
    if (!dump.length) return;
    clipboard.writeText(dump.join('\n'));
    statusHeaderText.textContent = 'Logs copiados al portapapeles';
    setTimeout(() => {
      if (lastKnownState) applyState(lastKnownState);
    }, 1500);
  },
  clear: () => {
    ipcRenderer.send('console-window-clear');
  },
  close: () => {
    ipcRenderer.send('console-window-request-close');
  }
};

actionBar?.addEventListener('click', (event) => {
  const btn = event.target.closest('.toolbar-btn');
  if (!btn) return;
  const action = btn.dataset.action;
  const handler = actions[action];
  if (handler) {
    handler();
  }
});
