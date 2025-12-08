import rpc from './rpc.js';

const PRODUCT_NAME =
  (typeof process !== 'undefined' &&
    (process.env?.npm_package_productName || process.env?.npm_package_name)) ||
  'Voxelite Launcher';

const context = {
  playerName: null,
  instanceName: null,
  startTimestamp: Math.floor(Date.now() / 1000)
};

const normalizeLabel = (value) => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
};

const buildDetails = () => {
  if (context.playerName) {
    return `Jugador: ${context.playerName}`;
  }
  return `${PRODUCT_NAME} listo`;
};

const buildState = () => {
  if (context.instanceName) {
    return `Instancia: ${context.instanceName}`;
  }
  return 'Selecciona una instancia';
};

const pushPresence = () => {
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

const resetPresence = () => {
  context.playerName = null;
  context.instanceName = null;
  context.startTimestamp = Math.floor(Date.now() / 1000);
  rpc.clearPresence();
};

const getState = () => ({ ...context });

export { setPlayerName, setInstanceName, resetPresence, getState };

export default {
  setPlayerName,
  setInstanceName,
  resetPresence,
  getState
};
