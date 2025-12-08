const DiscordRPC = require('discord-rpc');

const PRODUCT_NAME =
  (typeof process !== 'undefined' &&
    (process.env?.npm_package_productName || process.env?.npm_package_name)) ||
  'Voxelite Launcher';
const APPLICATION_ID =
  process.env.VOXELITE_DISCORD_APP_ID || '1447501963955535892';

let client = null;
let lastPresence = null;
let ready = false;
let reconnectTimer = null;

const scheduleReconnect = (delay = 15000) => {
  if (reconnectTimer || process.env.DISABLE_DISCORD_RPC === '1') return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    initRPC(true);
  }, delay);
};

const destroyClient = () => {
  if (!client) return;
  try {
    client.removeAllListeners?.();
    client.destroy?.();
  } catch (error) {
    console.warn('[rpc] Failed during client destroy', error);
  } finally {
    client = null;
    ready = false;
  }
};

const safeSetActivity = async (payload) => {
  if (!client || !ready) return;
  try {
    await client.setActivity(payload);
  } catch (error) {
    console.warn('[rpc] Failed to apply activity', error);
  }
};

function initRPC(force = false) {
  if (process.env.DISABLE_DISCORD_RPC === '1') return;
  if (client && !force) return;

  destroyClient();

  try {
    DiscordRPC.register(APPLICATION_ID);
    client = new DiscordRPC.Client({ transport: 'ipc' });

    client.on('ready', () => {
      ready = true;
      if (lastPresence) {
        safeSetActivity(lastPresence);
      }
    });

    client.on('disconnected', (_code, _reason) => {
      ready = false;
      destroyClient();
      scheduleReconnect();
    });

    client.on('error', (error) => {
      ready = false;
      console.warn('[rpc] Discord RPC error', error);
      destroyClient();
      scheduleReconnect();
    });

    client.login({ clientId: APPLICATION_ID }).catch((error) => {
      console.warn('[rpc] Failed to login', error);
      destroyClient();
      scheduleReconnect();
    });
  } catch (error) {
    console.error('[rpc] Failed to initialize Discord RPC', error);
    destroyClient();
    scheduleReconnect();
  }
}

function ensureClient() {
  if (!client) {
    initRPC();
  }
  return client && ready;
}

function updatePresence(presence = {}) {
  const isReady = ensureClient();
  const payload = {
    details: presence.details || PRODUCT_NAME,
    state: presence.state || '',
    largeImageKey: presence.largeImageKey || 'voxelite_launcher',
    largeImageText: presence.largeImageText || PRODUCT_NAME,
    smallImageKey: presence.smallImageKey,
    smallImageText: presence.smallImageText,
    startTimestamp: presence.startTimestamp
  };
  lastPresence = payload;
  if (!isReady) return;
  safeSetActivity(payload);
}

function clearPresence() {
  lastPresence = null;
  if (!client) return;
  try {
    client.clearActivity?.();
  } catch (error) {
    console.warn('[rpc] Failed to clear presence', error);
  }
}

export { updatePresence, clearPresence, initRPC };

export default {
  updatePresence,
  clearPresence,
  initRPC
};
