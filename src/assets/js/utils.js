/**
 * @author Luuxis
 * @license CC-BY-NC 4.0 - https://creativecommons.org/licenses/by-nc/4.0
 */

const { ipcRenderer } = require('electron');
const { Status } = require('minecraft-java-core');
const fs = require('fs');
const pkg = require('../package.json');

import config from './utils/config.js';
import database from './utils/database.js';
import logger from './utils/logger.js';
import popup from './utils/popup.js';
import { skin2D } from './utils/skin.js';
import slider from './utils/slider.js';

async function setBackground() {
  const body = document.body;
  body.classList.remove('dark', 'light');
  if (!body.classList.contains('global')) {
    body.classList.add('global');
  }

  let background = null;
  const easterEggDir = `${__dirname}/assets/images/background/easterEgg`;
  const defaultDir = `${__dirname}/assets/images/background/dark`;
  const overlayLayers = [
    'radial-gradient(circle at 18% 22%, var(--background-overlay-sheen) 0%, rgba(255, 255, 255, 0) 32%)',
    'radial-gradient(circle at 82% 18%, rgba(114, 137, 218, 0.12) 0%, rgba(114, 137, 218, 0) 45%)',
    'linear-gradient(160deg, var(--background-overlay-start), var(--background-overlay-end))'
  ];

  if (fs.existsSync(easterEggDir) && Math.random() < 0.005) {
    const backgrounds = fs.readdirSync(easterEggDir);
    if (backgrounds.length) {
      const randomBackground =
        backgrounds[Math.floor(Math.random() * backgrounds.length)];
      background = `${overlayLayers.join(
        ', '
      )}, url(./assets/images/background/easterEgg/${randomBackground})`;
    }
  } else if (fs.existsSync(defaultDir)) {
    const backgrounds = fs.readdirSync(defaultDir);
    if (backgrounds.length) {
      const randomBackground =
        backgrounds[Math.floor(Math.random() * backgrounds.length)];
      background = `${overlayLayers.join(
        ', '
      )}, url(./assets/images/background/dark/${randomBackground})`;
    }
  }

  body.style.backgroundImage = background || overlayLayers.join(', ');
  body.style.backgroundColor = 'var(--background)';
  body.style.backgroundSize = 'cover';
}

async function changePanel(id) {
  let panel = document.querySelector(`.${id}`);
  let active = document.querySelector(`.active`);
  if (active) active.classList.toggle('active');
  panel.classList.add('active');
}

async function appdata() {
  return await ipcRenderer.invoke('appData').then((path) => path);
}

async function addAccount(data) {
  let skin = false;
  if (data?.profile?.skins[0]?.base64)
    skin = await new skin2D().creatHeadTexture(data.profile.skins[0].base64);
  let div = document.createElement('div');
  div.classList.add('account');
  div.id = data.ID;
  div.innerHTML = `
        <div class="profile-image" ${
          skin ? 'style="background-image: url(' + skin + ');"' : ''
        }></div>
        <div class="profile-infos">
            <div class="profile-name">${data.name}</div>
            <div class="profile-uuid">${data.uuid}</div>
        </div>
        <div class="delete-profile" id="${data.ID}">
            <div class="icon-account-delete delete-profile-icon"></div>
        </div>
    `;
  return document.querySelector('.accounts-list').appendChild(div);
}

async function accountSelect(data) {
  let account = document.getElementById(`${data.ID}`);
  let activeAccount = document.querySelector('.account-select');

  if (activeAccount) activeAccount.classList.toggle('account-select');
  account.classList.add('account-select');
  if (data?.profile?.skins[0]?.base64) headplayer(data.profile.skins[0].base64);

  document.querySelector('.player-head-name').textContent = data.name;
}

async function headplayer(skinBase64) {
  let skin = await new skin2D().creatHeadTexture(skinBase64);
  document.querySelector(
    '.player-head-image'
  ).style.backgroundImage = `url(${skin})`;
}

let statusPollToken = 0;
let statusInstanceGuard = null;

function setStatusTarget(instanceName) {
  statusInstanceGuard =
    typeof instanceName === 'string' && instanceName.trim().length
      ? instanceName.trim()
      : null;
}

async function setStatus(opt, displayNameOverride) {
  const normalizedInstanceName =
    typeof displayNameOverride === 'string' ? displayNameOverride.trim() : '';

  const matchesActiveInstance = () =>
    !statusInstanceGuard ||
    !normalizedInstanceName ||
    statusInstanceGuard === normalizedInstanceName;

  if (!matchesActiveInstance()) {
    return;
  }

  const currentToken = ++statusPollToken;
  const isCurrent = () =>
    currentToken === statusPollToken && matchesActiveInstance();
  let nameServerElement = document.querySelector('.server-status-name');
  let statusServerElement = document.querySelector('.server-status-text');
  let statusPlayerContainer = document.querySelector('.status-player-count');
  let playersOnline = document.querySelector(
    '.status-player-count .player-count'
  );
  let serverIconElement = document.querySelector('.server-status-icon');
  const defaultIconSrc =
    serverIconElement?.dataset?.defaultSrc || 'assets/images/icon.png';

  const { ip, port = 25565, nameServer } = opt || {};

  let resolvedExternalIcon = null;
  let lastAppliedIcon = null;

  const applyServerIcon = (src) => {
    if (!serverIconElement || !isCurrent()) return;
    const nextSrc = src || defaultIconSrc;
    if (lastAppliedIcon === nextSrc) return;
    serverIconElement.src = nextSrc;
    lastAppliedIcon = nextSrc;
  };

  const applyOfflineState = () => {
    if (!isCurrent()) return;
    if (!statusServerElement || !playersOnline) return;
    statusServerElement.classList.add('offline');
    statusServerElement.innerHTML = `Server - 0 ms`;
    if (statusPlayerContainer) {
      statusPlayerContainer.classList.add('offline');
    }
    playersOnline.innerHTML = '0';
    applyServerIcon();
  };

  const displayLabel = displayNameOverride || nameServer || 'Server';
  if (displayLabel && nameServerElement) {
    nameServerElement.innerHTML = displayLabel;
  }

  if (!ip) {
    applyOfflineState();
    return;
  }

  const status = new Status(ip, port);
  const sampleAttempts = 2;
  const failureTolerance = 2;
  let consecutiveFailures = 0;
  let lastGoodSnapshot = null;

  const sleep = (delay) =>
    new Promise((resolve) => {
      setTimeout(resolve, delay);
    });

  const normalizePlayerCount = (payload) => {
    if (!payload || typeof payload !== 'object') return 0;
    if (typeof payload.playersConnect === 'number')
      return Math.max(0, Math.round(payload.playersConnect));
    const players = payload.players;
    if (players && typeof players.online === 'number')
      return Math.max(0, Math.round(players.online));
    if (players && typeof players.connected === 'number')
      return Math.max(0, Math.round(players.connected));
    if (players && Array.isArray(players.sample)) return players.sample.length;
    return 0;
  };

  const choosePing = (localPing, externalPing) => {
    const previous = lastGoodSnapshot?.ping;
    const candidates = [];
    if (Number.isFinite(localPing) && localPing >= 0) {
      candidates.push({ source: 'local', value: localPing });
    }
    if (Number.isFinite(externalPing) && externalPing >= 0) {
      candidates.push({ source: 'external', value: externalPing });
    }
    if (!candidates.length) {
      return Number.isFinite(previous) ? previous : 0;
    }
    if (candidates.length === 1) {
      return Math.max(0, Math.round(candidates[0].value));
    }
    if (Number.isFinite(previous)) {
      const sorted = candidates.slice().sort((a, b) => {
        if (a.source === 'external' && b.source !== 'external') return -1;
        if (b.source === 'external' && a.source !== 'external') return 1;
        const aDelta = Math.abs(a.value - previous);
        const bDelta = Math.abs(b.value - previous);
        if (aDelta !== bDelta) return aDelta - bDelta;
        return a.value - b.value;
      });
      const best = sorted[0];
      if (
        best.source !== 'external' &&
        candidates.some(
          (candidate) =>
            candidate.source === 'external' &&
            candidate.value <= best.value * 0.8
        )
      ) {
        const externalCandidate = candidates
          .slice()
          .filter((c) => c.source === 'external')
          .sort((a, b) => a.value - b.value)[0];
        return Math.max(0, Math.round(externalCandidate.value));
      }
      return Math.max(0, Math.round(best.value));
    }
    const sorted = candidates.slice().sort((a, b) => {
      if (a.source === 'external' && b.source !== 'external') return -1;
      if (b.source === 'external' && a.source !== 'external') return 1;
      return a.value - b.value;
    });
    return Math.max(0, Math.round(sorted[0].value));
  };

  const choosePlayers = (localPlayers, externalPlayers) => {
    const previous = lastGoodSnapshot?.players;
    const validLocal = Number.isFinite(localPlayers) && localPlayers >= 0;
    const validExternal =
      Number.isFinite(externalPlayers) && externalPlayers >= 0;
    if (validLocal && validExternal) {
      if (!Number.isFinite(previous)) {
        return Math.max(0, Math.round(Math.max(localPlayers, externalPlayers)));
      }
      const localDelta = Math.abs(localPlayers - previous);
      const externalDelta = Math.abs(externalPlayers - previous);
      if (externalDelta <= localDelta * 1.5) {
        return Math.max(0, Math.round(externalPlayers));
      }
      return Math.max(0, Math.round(localPlayers));
    }
    if (validLocal) return Math.max(0, Math.round(localPlayers));
    if (validExternal) return Math.max(0, Math.round(externalPlayers));
    return Number.isFinite(previous) ? Math.max(0, Math.round(previous)) : 0;
  };

  const applyOnlineState = (snapshot) => {
    if (!isCurrent() || !snapshot) return;
    if (!statusServerElement || !playersOnline) return;
    statusServerElement.classList.remove('offline');
    if (statusPlayerContainer)
      statusPlayerContainer.classList.remove('offline');
    statusServerElement.innerHTML = `Online - ${snapshot.ping} ms`;
    playersOnline.innerHTML = `${snapshot.players}`;
    if (snapshot.icon) {
      applyServerIcon(snapshot.icon);
    } else if (resolvedExternalIcon) {
      applyServerIcon(resolvedExternalIcon);
    } else {
      applyServerIcon();
    }
  };

  const pollStatus = async () => {
    if (!isCurrent()) return;

    const externalStatusPromise = ip
      ? fetchExternalStatusByIp(ip, port)
      : Promise.resolve(null);

    const successfulSamples = [];
    const pingSamples = [];

    for (let attempt = 0; attempt < sampleAttempts; attempt++) {
      if (!isCurrent()) return;
      const sample = await status
        .getStatus()
        .then((res) => res)
        .catch((error) => ({ error }));

      if (!isCurrent()) return;

      if (sample && !sample.error) {
        successfulSamples.push(sample);
        if (typeof sample.ms === 'number' && sample.ms >= 0) {
          pingSamples.push(sample.ms);
        }
      }

      if (attempt < sampleAttempts - 1) {
        await sleep(120);
      }
    }

    if (!isCurrent()) return;

    const externalStatus = await externalStatusPromise.catch(() => null);
    if (externalStatus?.icon && isCurrent()) {
      resolvedExternalIcon = externalStatus.icon;
    }

    const hasLocalSuccess = successfulSamples.length > 0;
    const hasExternalSuccess =
      !!externalStatus &&
      (externalStatus.online === true ||
        Number.isFinite(externalStatus.ping) ||
        Number.isFinite(externalStatus.players));

    if (hasLocalSuccess || hasExternalSuccess) {
      consecutiveFailures = 0;

      let localPing = null;
      if (pingSamples.length) {
        pingSamples.sort((a, b) => a - b);
        const medianIndex = Math.floor(pingSamples.length / 2);
        const selectedPing = pingSamples[medianIndex];
        if (Number.isFinite(selectedPing)) {
          localPing = Math.max(0, Math.round(selectedPing));
        }
      }

      let primarySample = null;
      if (hasLocalSuccess) {
        primarySample = successfulSamples.reduce((best, current) => {
          if (!best) return current;
          const currentPlayers = normalizePlayerCount(current);
          const bestPlayers = normalizePlayerCount(best);
          if (currentPlayers === bestPlayers) {
            return current.ms < best.ms ? current : best;
          }
          return currentPlayers > bestPlayers ? current : best;
        }, null);
      }

      const localPlayers = primarySample
        ? normalizePlayerCount(primarySample)
        : null;

      const fallbackIconSample = successfulSamples.find(
        (sample) => sample && sample.favicon
      );

      const finalPing = choosePing(localPing, externalStatus?.ping ?? null);
      const normalizedPing = Math.max(0, Math.round(finalPing * 0.35));
      const finalPlayers = choosePlayers(
        localPlayers,
        externalStatus?.players ?? null
      );

      const iconCandidate =
        (externalStatus && externalStatus.icon) ||
        (primarySample && primarySample.favicon) ||
        (fallbackIconSample && fallbackIconSample.favicon) ||
        resolvedExternalIcon ||
        (lastGoodSnapshot && lastGoodSnapshot.icon) ||
        null;

      if (iconCandidate) {
        resolvedExternalIcon = iconCandidate;
      }

      const snapshot = {
        ping: normalizedPing,
        players: finalPlayers,
        icon: resolvedExternalIcon
      };

      lastGoodSnapshot = snapshot;
      applyOnlineState(snapshot);
    } else {
      consecutiveFailures += 1;
      if (lastGoodSnapshot && consecutiveFailures <= failureTolerance) {
        applyOnlineState(lastGoodSnapshot);
      } else {
        applyOfflineState();
      }
    }

    if (isCurrent()) {
      setTimeout(pollStatus, 3000);
    }
  };

  pollStatus().catch((error) => {
    logger?.error?.('[status poll]', error);
  });
}

async function fetchExternalStatusByIp(ip, port) {
  try {
    const normalizedPort = port && Number(port) !== 25565 ? `:${port}` : '';
    const address = `${ip}${normalizedPort}`;

    let icon = null;
    let ping = null;
    let players = null;
    let online = null;

    const mcstatusResponse = await fetch(
      `https://api.mcstatus.io/v2/status/java/${address}`,
      { cache: 'no-store' }
    );
    if (mcstatusResponse.ok) {
      const payload = await mcstatusResponse.json();
      const iconPayload = payload?.icon;
      if (iconPayload) {
        icon = iconPayload.startsWith('data:image')
          ? iconPayload
          : `data:image/png;base64,${iconPayload}`;
      }
      const latencyPayload = payload?.latency;
      if (typeof latencyPayload === 'number') {
        ping = latencyPayload;
      } else if (latencyPayload && typeof latencyPayload === 'object') {
        const latencyKeys = ['median', 'average', 'mean', 'min', 'max'];
        for (const key of latencyKeys) {
          const value = latencyPayload[key];
          if (typeof value === 'number') {
            ping = value;
            break;
          }
        }
      }
      const playersPayload = payload?.players;
      if (playersPayload && typeof playersPayload === 'object') {
        if (typeof playersPayload.online === 'number') {
          players = playersPayload.online;
        } else if (typeof playersPayload.connected === 'number') {
          players = playersPayload.connected;
        } else if (Array.isArray(playersPayload.sample)) {
          players = playersPayload.sample.length;
        }
      }
      if (typeof payload?.online === 'boolean') {
        online = payload.online;
      }
    }

    if (!icon) {
      const fallbackResponse = await fetch(
        `https://api.mcsrvstat.us/icon/${address}`,
        { cache: 'no-store' }
      );
      if (fallbackResponse.ok) {
        const buffer = Buffer.from(await fallbackResponse.arrayBuffer());
        if (buffer.length) {
          icon = `data:image/png;base64,${buffer.toString('base64')}`;
        }
      }
    }

    return {
      icon: icon || null,
      ping: Number.isFinite(ping) ? Math.max(0, Math.round(ping)) : null,
      players:
        Number.isFinite(players) && players >= 0
          ? Math.max(0, Math.round(players))
          : null,
      online: online === true
    };
  } catch (error) {
    return null;
  }
}

export {
  appdata as appdata,
  changePanel as changePanel,
  config as config,
  database as database,
  logger as logger,
  popup as popup,
  setBackground as setBackground,
  skin2D as skin2D,
  addAccount as addAccount,
  accountSelect as accountSelect,
  slider as Slider,
  pkg as pkg,
  setStatus as setStatus,
  setStatusTarget as setStatusTarget
};
