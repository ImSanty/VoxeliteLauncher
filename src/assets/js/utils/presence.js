import rpc from './rpc.js';

const PRODUCT_NAME =
  (typeof process !== 'undefined' &&
    (process.env?.npm_package_productName || process.env?.npm_package_name)) ||
  'Voxelite Launcher';

const context = {
  playerName: null,
  instanceName: null,
  page: null,
  startTimestamp: Math.floor(Date.now() / 1000)
};
let suspended = false;
let enabled = true;

const normalizeLabel = (value) => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
};

const describePage = () => {
  if (!context.page) return null;
  const normalized = context.page.toLowerCase();
  if (normalized === 'home') return 'Inicio · En espera';
  if (normalized === 'settings') return 'Ajustes del launcher';
  return `Sección: ${context.page}`;
};

const buildDetails = () => {
  const pageLabel = describePage();
  if (pageLabel) return pageLabel;
  return `${PRODUCT_NAME} listo`;
};

const buildState = () => {
  const parts = [];
  if (context.playerName) {
    parts.push(`Jugador: ${context.playerName}`);
  }
  if (context.instanceName) {
    parts.push(`Instancia: ${context.instanceName}`);
  }
  if (parts.length) return parts.join(' · ');
  return 'Selecciona una instancia';
};

const pushPresence = () => {
  if (suspended) return;
  if (!enabled) {
    rpc.clearPresence();
    return;
  }
  rpc.updatePresence({
    details: buildDetails(),
    state: buildState(),
    startTimestamp: context.startTimestamp,
    largeImageKey: 'voxelite_launcher',
    largeImageText: PRODUCT_NAME
  });
};

const setPlayerName = (value) => {
  const normalized = normalizeLabel(value);
  if (normalized === context.playerName) return;
  context.playerName = normalized;
  pushPresence();
};

const setInstanceName = (value) => {
  const normalized = normalizeLabel(value);
  if (normalized === context.instanceName) return;
  context.instanceName = normalized;
  pushPresence();
};

const setEnabled = (value) => {
  const next = value !== false;
  if (next === enabled) return;
  enabled = next;
  if (!enabled) {
    rpc.clearPresence();
    return;
  }
  context.startTimestamp = Math.floor(Date.now() / 1000);
  pushPresence();
};

const setPage = (value) => {
  const normalized = normalizeLabel(value);
  if (normalized === context.page) return;
  context.page = normalized;
  context.startTimestamp = Math.floor(Date.now() / 1000);
  pushPresence();
};

const setSuspended = (value) => {
  const next = Boolean(value);
  if (next === suspended) return;
  suspended = next;
  if (suspended) {
    rpc.clearPresence();
    return;
  }
  context.startTimestamp = Math.floor(Date.now() / 1000);
  pushPresence();
};

const resetPresence = () => {
  context.playerName = null;
  context.instanceName = null;
  context.page = null;
  context.startTimestamp = Math.floor(Date.now() / 1000);
  rpc.clearPresence();
};

const getState = () => ({ ...context, suspended, enabled });

export {
  setPlayerName,
  setInstanceName,
  setPage,
  setEnabled,
  setSuspended,
  resetPresence,
  getState
};

export default {
  setPlayerName,
  setInstanceName,
  setPage,
  setEnabled,
  setSuspended,
  resetPresence,
  getState
};
