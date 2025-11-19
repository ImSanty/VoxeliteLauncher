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

async function setBackground(theme) {
  if (typeof theme == 'undefined') {
    let databaseLauncher = new database();
    let configClient = await databaseLauncher.readData('configClient');
    theme = configClient?.launcher_config?.theme || 'auto';
    theme = await ipcRenderer.invoke('is-dark-theme', theme).then((res) => res);
  }
  let background;
  let body = document.body;
  body.className = theme ? 'dark global' : 'light global';
  if (
    fs.existsSync(`${__dirname}/assets/images/background/easterEgg`) &&
    Math.random() < 0.005
  ) {
    let backgrounds = fs.readdirSync(
      `${__dirname}/assets/images/background/easterEgg`
    );
    let Background =
      backgrounds[Math.floor(Math.random() * backgrounds.length)];
    background = `url(./assets/images/background/easterEgg/${Background})`;
  } else if (
    fs.existsSync(
      `${__dirname}/assets/images/background/${theme ? 'dark' : 'light'}`
    )
  ) {
    let backgrounds = fs.readdirSync(
      `${__dirname}/assets/images/background/${theme ? 'dark' : 'light'}`
    );
    let Background =
      backgrounds[Math.floor(Math.random() * backgrounds.length)];
    background = `linear-gradient(#00000080, #00000080), url(./assets/images/background/${
      theme ? 'dark' : 'light'
    }/${Background})`;
  }
  body.style.backgroundImage = background
    ? background
    : theme
    ? '#000'
    : '#fff';
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

async function setStatus(opt, displayNameOverride) {
  const currentToken = ++statusPollToken;
  let nameServerElement = document.querySelector('.server-status-name');
  let statusServerElement = document.querySelector('.server-status-text');
  let playersOnline = document.querySelector(
    '.status-player-count .player-count'
  );
  let serverIconElement = document.querySelector('.server-status-icon');
  const defaultIconSrc =
    serverIconElement?.dataset?.defaultSrc || 'assets/images/icon.png';

  let resolvedExternalIcon = null;
  let lastAppliedIcon = null;

  const applyServerIcon = (src) => {
    if (!serverIconElement) return;
    const nextSrc = src || defaultIconSrc;
    if (lastAppliedIcon === nextSrc) return;
    serverIconElement.src = nextSrc;
    lastAppliedIcon = nextSrc;
  };

  const applyOfflineState = () => {
    statusServerElement.classList.add('red');
    statusServerElement.innerHTML = `Server - 0 ms`;
    document.querySelector('.status-player-count').classList.add('red');
    playersOnline.innerHTML = '0';
    applyServerIcon();
  };

  const displayLabel = displayNameOverride || opt?.nameServer || 'Server';
  if (displayLabel && nameServerElement) {
    nameServerElement.innerHTML = displayLabel;
  }

  if (!opt) {
    applyOfflineState();
    return;
  }

  let { ip, port, nameServer } = opt;
  if (ip) {
    fetchServerIconByIp(ip, port)
      .then((icon) => {
        if (icon && currentToken === statusPollToken) {
          resolvedExternalIcon = icon;
          applyServerIcon(icon);
        }
      })
      .catch(() => {});
  }
  let status = new Status(ip, port);
  const pollStatus = async () => {
    if (currentToken !== statusPollToken) return;

    let statusServer = await status
      .getStatus()
      .then((res) => res)
      .catch((err) => ({ error: err }));

    if (currentToken !== statusPollToken) return;

    if (!statusServer.error) {
      let totalPing = 0;
      let attempts = 3;
      for (let i = 0; i < attempts; i++) {
        let tempStatus = await status.getStatus().catch(() => null);
        if (tempStatus && !tempStatus.error) totalPing += tempStatus.ms;
      }
      let avgPing = totalPing / attempts;
      let adjustedPing = Math.max(0, Math.round(avgPing * 0.25));

      statusServerElement.classList.remove('red');
      document.querySelector('.status-player-count').classList.remove('red');
      statusServerElement.innerHTML = `Online - ${adjustedPing} ms`;
      playersOnline.innerHTML = statusServer.playersConnect;
      if (resolvedExternalIcon) {
        applyServerIcon(resolvedExternalIcon);
      } else if (statusServer.favicon) {
        applyServerIcon(statusServer.favicon);
      } else {
        applyServerIcon();
      }
    } else {
      applyOfflineState();
    }

    if (currentToken === statusPollToken) {
      setTimeout(pollStatus, 2500);
    }
  };

  await pollStatus();
}

async function fetchServerIconByIp(ip, port) {
  try {
    const normalizedPort = port && Number(port) !== 25565 ? `:${port}` : '';
    const address = `${ip}${normalizedPort}`;

    const mcstatusResponse = await fetch(
      `https://api.mcstatus.io/v2/status/java/${address}`,
      { cache: 'no-store' }
    );
    if (mcstatusResponse.ok) {
      const payload = await mcstatusResponse.json();
      const icon = payload?.icon;
      if (icon) {
        return icon.startsWith('data:image')
          ? icon
          : `data:image/png;base64,${icon}`;
      }
    }

    const fallbackResponse = await fetch(
      `https://api.mcsrvstat.us/icon/${address}`,
      { cache: 'no-store' }
    );
    if (!fallbackResponse.ok) return null;
    const buffer = Buffer.from(await fallbackResponse.arrayBuffer());
    if (!buffer.length) return null;
    return `data:image/png;base64,${buffer.toString('base64')}`;
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
  setStatus as setStatus
};
