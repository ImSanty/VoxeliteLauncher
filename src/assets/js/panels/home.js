/**
 * @author Luuxis
 * @license CC-BY-NC 4.0 - https://creativecommons.org/licenses/by-nc/4.0
 */
import {
  config,
  database,
  logger,
  changePanel,
  appdata,
  setStatus,
  setStatusTarget,
  pkg,
  popup
} from '../utils.js';

const { Launch } = require('minecraft-java-core');
const { ipcRenderer } = require('electron');
const { Buffer } = require('buffer');

class Home {
  static id = 'home';
  async init(config) {
    this.config = config;
    this.db = new database();
    this.news();
    this.instancesSelect();
    this.bindAccountShortcut();
    document
      .querySelector('.settings-btn')
      .addEventListener('click', (e) => changePanel('settings'));
  }

  bindAccountShortcut() {
    const playerHead = document.querySelector('.player-head');
    if (!playerHead) return;

    playerHead.addEventListener('click', () => {
      changePanel('settings');
      this.focusAccountSettingsTab();
    });
  }

  focusAccountSettingsTab() {
    const accountNavBtn = document.getElementById('account');
    const accountTab = document.getElementById('account-tab');
    if (!accountNavBtn || !accountTab) return;

    const activeNavBtn = document.querySelector(
      '.nav-settings-btn.active-settings-BTN'
    );
    activeNavBtn?.classList.remove('active-settings-BTN');
    accountNavBtn.classList.add('active-settings-BTN');

    const activeTab = document.querySelector(
      '.container-settings.active-container-settings'
    );
    activeTab?.classList.remove('active-container-settings');
    accountTab.classList.add('active-container-settings');
  }

  async news() {
    let newsElement = document.querySelector('.news-list');
    let news = await config
      .getNews()
      .then((res) => res)
      .catch((err) => false);
    if (news) {
      if (!news.length) {
        let blockNews = document.createElement('div');
        blockNews.classList.add('news-block');
        blockNews.innerHTML = `
                      <div class="news-header">
                          <div class="header-text">
                              <div class="title">No se encontraron novedades.</div>
                          </div>
                          <div class="date">
                              <div class="day">1</div>
                              <div class="month">Month</div>
                          </div>
                      </div>
                      <div class="news-content">
                          <div class="bbWrapper">
                              <p>Podes ver todas las novedades del server aca.</p>
                          </div>
                      </div>`;
        newsElement.appendChild(blockNews);
      } else {
        for (let News of news) {
          let date = this.getdate(News.publish_date);
          let blockNews = document.createElement('div');
          blockNews.classList.add('news-block');
          blockNews.innerHTML = `
                          <div class="news-header">
                              <div class="header-text">
                                  <div class="title">${News.title}</div>
                              </div>
                              <div class="date">
                                  <div class="day">${date.day}</div>
                                  <div class="month">${date.month}</div>
                              </div>
                          </div>
                          <div class="news-content">
                              <div class="bbWrapper">
                                  <p>${News.content.replace(/\n/g, '</br>')}</p>
                                  <p class="news-author">Autor - <span>${
                                    News.author
                                  }</span></p>
                              </div>
                          </div>`;
          newsElement.appendChild(blockNews);
        }
      }
    } else {
      let blockNews = document.createElement('div');
      blockNews.classList.add('news-block');
      blockNews.innerHTML = `
                  <div class="news-header">
                          <div class="header-text">
                              <div class="title">Error.</div>
                          </div>
                          <div class="date">
                              <div class="day">1</div>
                              <div class="month">Enero</div>
                          </div>
                      </div>
                      <div class="news-content">
                          <div class="bbWrapper">
                              <p>No se pudo contactar con el servidor.</br>Por favor verifique la configuracion :(</p>
                          </div>
                      </div>`;
      newsElement.appendChild(blockNews);
    }
  }

  async instancesSelect() {
    let configClient = await this.db.readData('configClient');
    let auth = await this.db.readData(
      'accounts',
      configClient.account_selected
    );
    let instancesList = await config.getInstanceList();
    let selectedInstanceConfig = null;
    let instanceSelect = instancesList.find(
      (i) => i.name == configClient?.instance_selct
    )
      ? configClient?.instance_selct
      : null;

    let instanceBTN = document.querySelector('.play-instance');
    let instanceSelectControl = document.querySelector('.instance-select');
    let instancePopup = document.querySelector('.instance-popup');
    let instancesListPopup = document.querySelector('.instances-List');
    let instanceCloseBTN = document.querySelector('.close-popup');

    if (instancesList.length === 1) {
      document.querySelector('.instance-select').style.display = 'none';
      instanceBTN.style.paddingRight = '0';
    }

    if (!instanceSelect) {
      let newInstanceSelect = instancesList.find(
        (i) => i.whitelistActive == false
      );
      let configClient = await this.db.readData('configClient');
      configClient.instance_selct = newInstanceSelect.name;
      instanceSelect = newInstanceSelect.name;
      selectedInstanceConfig = newInstanceSelect;
      await this.db.updateData('configClient', configClient);
    }

    for (let instance of instancesList) {
      if (instance.whitelistActive) {
        let whitelist = instance.whitelist.find(
          (whitelist) => whitelist == auth?.name
        );
        if (whitelist !== auth?.name) {
          if (instance.name == instanceSelect) {
            let newInstanceSelect = instancesList.find(
              (i) => i.whitelistActive == false
            );
            let configClient = await this.db.readData('configClient');
            configClient.instance_selct = newInstanceSelect.name;
            instanceSelect = newInstanceSelect.name;
            selectedInstanceConfig = newInstanceSelect;
            await this.db.updateData('configClient', configClient);
          }
        }
      } else console.log(`Initializing instance ${instance.name}...`);
      if (instance.name == instanceSelect) selectedInstanceConfig = instance;
    }

    if (!selectedInstanceConfig) {
      selectedInstanceConfig = instancesList.find(
        (entry) => entry.name === instanceSelect
      );
    }

    if (selectedInstanceConfig) {
      setStatusTarget(selectedInstanceConfig.name);
      await setStatus(
        selectedInstanceConfig.status,
        selectedInstanceConfig.name
      );
    } else {
      setStatusTarget(null);
      await setStatus(null);
    }

    instancePopup.addEventListener('click', async (e) => {
      let configClient = await this.db.readData('configClient');

      if (e.target.classList.contains('instance-elements')) {
        let newInstanceSelect = e.target.id;
        let activeInstanceSelect = document.querySelector('.active-instance');

        if (activeInstanceSelect)
          activeInstanceSelect.classList.toggle('active-instance');
        e.target.classList.add('active-instance');

        configClient.instance_selct = newInstanceSelect;
        await this.db.updateData('configClient', configClient);
        instancePopup.style.display = 'none';
        let instance = await config.getInstanceList();
        let options = instance.find(
          (i) => i.name == configClient.instance_selct
        );
        if (options) {
          setStatusTarget(options.name);
          await setStatus(options.status, options.name);
        }
      }
    });

    const renderInstancesPopup = async () => {
      let configClient = await this.db.readData('configClient');
      let instanceSelect = configClient.instance_selct;
      let auth = await this.db.readData(
        'accounts',
        configClient.account_selected
      );

      instancesListPopup.innerHTML = '';

      for (let instance of instancesList) {
        if (instance.whitelistActive) {
          const allowed = instance.whitelist.some(
            (whitelist) => whitelist == auth?.name
          );
          if (!allowed) continue;
        }

        const isActive = instance.name == instanceSelect;
        instancesListPopup.innerHTML += `<div id="${
          instance.name
        }" class="instance-elements${isActive ? ' active-instance' : ''}">${
          instance.name
        }</div>`;
      }

      instancePopup.style.display = 'flex';
    };

    instanceSelectControl?.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      await renderInstancesPopup();
    });

    instanceBTN.addEventListener('click', () => this.startGame());

    instanceCloseBTN.addEventListener(
      'click',
      () => (instancePopup.style.display = 'none')
    );
  }

  async startGame() {
    let launch = new Launch();
    let configClient = await this.db.readData('configClient');
    const keepLauncherVisible =
      configClient?.launcher_config?.closeLauncher !== 'close-launcher';
    const consoleEnabled =
      (configClient?.launcher_config?.consoleMode || 'hidden') === 'window';

    const toConsoleString = (value) => {
      if (value === null || typeof value === 'undefined') return '';
      if (typeof value === 'string') return value;
      if (Buffer.isBuffer(value)) return value.toString('utf8');
      if (typeof value === 'object') {
        try {
          return JSON.stringify(value);
        } catch (error) {
          return String(value);
        }
      }
      return String(value);
    };

    const sendConsole = (channel, payload) => {
      if (!consoleEnabled) return;
      ipcRenderer.send(channel, payload);
    };

    const ensureConsoleWindow = (meta = {}) => {
      sendConsole('console-window-open', { focus: false, meta });
    };

    const consoleLog = (message, level = 'info', source = 'launcher') => {
      if (!consoleEnabled) return;
      let output = toConsoleString(message);
      if (!output.trim()) return;
      sendConsole('console-window-log', {
        message: output,
        level,
        source,
        timestamp: Date.now()
      });
    };

    const consoleState = (state = {}) => {
      if (!consoleEnabled) return;
      sendConsole('console-window-status', state);
    };

    let instance = await config.getInstanceList();
    let authenticator = await this.db.readData(
      'accounts',
      configClient.account_selected
    );
    let options = instance.find((i) => i.name == configClient.instance_selct);

    if (consoleEnabled && options) {
      const meta = {
        instance: options.name,
        version: options.loadder?.minecraft_version || 'Desconocida',
        account: authenticator?.name || 'Sin sesión'
      };
      ensureConsoleWindow(meta);
      consoleLog(
        `Preparando instancia ${meta.instance} (${meta.version})`,
        'status'
      );
      consoleState({
        phase: 'preparing',
        label: 'Preparando archivos...',
        meta
      });
    }

    let playInstanceBTN = document.querySelector('.play-instance');
    let infoStartingBOX = document.querySelector('.info-starting-game');
    let infoStarting = document.querySelector('.info-starting-game-text');
    let progressBar = document.querySelector('.progress-bar');

    let opt = {
      url: options.url,
      authenticator: authenticator,
      timeout: 10000,
      path: `${await appdata()}/${
        process.platform == 'darwin'
          ? this.config.dataDirectory
          : `.${this.config.dataDirectory}`
      }`,
      instance: options.name,
      version: options.loadder.minecraft_version,
      detached:
        configClient.launcher_config.closeLauncher == 'close-all'
          ? false
          : true,
      downloadFileMultiple: configClient.launcher_config.download_multi,
      intelEnabledMac: configClient.launcher_config.intelEnabledMac,

      loader: {
        type: options.loadder.loadder_type,
        build: options.loadder.loadder_version,
        enable: options.loadder.loadder_type == 'none' ? false : true
      },

      verify: options.verify,

      ignored: [...options.ignored],

      javaPath: configClient.java_config.java_path,

      screen: {
        width: configClient.game_config.screen_size.width,
        height: configClient.game_config.screen_size.height
      },

      memory: {
        min: `${configClient.java_config.java_memory.min * 1024}M`,
        max: `${configClient.java_config.java_memory.max * 1024}M`
      }
    };

    launch.Launch(opt);

    playInstanceBTN.style.display = 'none';
    infoStartingBOX.style.display = 'block';
    progressBar.style.display = 'block';
    progressBar.classList.add('progress-bar-active');

    let lastProgressTick = { time: Date.now(), value: 0 };
    let lastPercent = 0;
    let lastSpeedBps = 0;
    let lastEtaSeconds = null;
    let currentPhase = 'download';
    const downloadLogKeys = new Set();
    const baseGamePath = opt.path.replace(/\\/g, '/');

    const normalizeDownloadKey = (file) => {
      if (!file) return null;
      if (typeof file === 'string') return file;
      return (
        file.path ||
        file.name ||
        file.url ||
        (file.type ? `type:${file.type}` : null)
      );
    };

    const formatDownloadLabel = (file) => {
      if (!file) return null;
      if (typeof file === 'string') return file;

      const normalizedPath = file.path
        ? file.path.replace(/\\/g, '/').trim()
        : null;
      const name = typeof file.name === 'string' ? file.name.trim() : null;
      if (normalizedPath) {
        if (normalizedPath.startsWith(baseGamePath)) {
          const relative = normalizedPath.slice(baseGamePath.length).replace(/^\//, '');
          if (relative) {
            return relative;
          }
        }
        return normalizedPath;
      }
      if (name) return name;
      if (file.type) return file.type;
      if (typeof file.url === 'string') return file.url.trim();
      return null;
    };

    const updateLabel = () => {
      const label = buildDownloadLabel({
        phase: currentPhase,
        percent: lastPercent,
        speedBps: currentPhase === 'download' ? lastSpeedBps : undefined,
        etaSeconds: currentPhase === 'download' ? lastEtaSeconds : undefined
      });
      infoStarting.innerHTML = label;
      return label;
    };

    updateLabel();
    ipcRenderer.send('main-window-progress-load');

    launch.on('download', ({ status, file }) => {
      if (status !== 'start') return;
      const key = normalizeDownloadKey(file);
      if (key) {
        if (downloadLogKeys.has(key)) {
          return;
        }
        downloadLogKeys.add(key);
      }
      const label = formatDownloadLabel(file);
      if (!label) return;
      consoleLog(`[Descarga] ${label}`, 'info');
    });

    launch.on('extract', (extract) => {
      ipcRenderer.send('main-window-progress-load');
      consoleState({ phase: 'preparing', label: 'Extrayendo librerías...' });
      consoleLog(`[Extract] ${toConsoleString(extract)}`, 'info');
      console.log(extract);
    });

    launch.on('progress', (progress, size) => {
      currentPhase = 'download';

      const percent = size > 0 ? (progress / size) * 100 : 0;
      const now = Date.now();
      const deltaBytes = progress - lastProgressTick.value;
      const deltaTime = (now - lastProgressTick.time) / 1000;
      let derivedSpeed = lastSpeedBps;

      if (deltaTime > 0.2 && deltaBytes >= 0) {
        derivedSpeed = deltaBytes / deltaTime;
      }

      const remainingBytes = size - progress;
      const derivedEta =
        derivedSpeed > 0 ? remainingBytes / derivedSpeed : null;

      lastProgressTick = { time: now, value: progress };
      lastPercent = percent;

      if (Number.isFinite(derivedSpeed) && derivedSpeed > 0) {
        lastSpeedBps = derivedSpeed;
      }

      if (Number.isFinite(derivedEta) && derivedEta >= 0) {
        lastEtaSeconds = derivedEta;
      }

      const label = updateLabel();
      consoleState({ phase: 'download', label });
      ipcRenderer.send('main-window-progress', { progress, size });
      progressBar.value = progress;
      progressBar.max = size;
    });

    launch.on('check', (progress, size) => {
      currentPhase = 'verify';
      const percent = size > 0 ? (progress / size) * 100 : 0;
      lastPercent = percent;
      const label = updateLabel();
      consoleState({ phase: 'verifying', label });
      ipcRenderer.send('main-window-progress', { progress, size });
      progressBar.value = progress;
      progressBar.max = size;
    });

    launch.on('estimated', (time) => {
      if (Number.isFinite(time) && time >= 0) {
        lastEtaSeconds = time;
        if (currentPhase === 'download') {
          const label = updateLabel();
          consoleState({ phase: 'download', label });
        }
      }
    });

    launch.on('speed', (speed) => {
      if (Number.isFinite(speed) && speed > 0) {
        lastSpeedBps = speed;
        if (currentPhase === 'download') {
          const label = updateLabel();
          consoleState({ phase: 'download', label });
        }
      }
    });

    launch.on('patch', (patch) => {
      console.log(patch);
      ipcRenderer.send('main-window-progress-load');
      infoStarting.innerHTML = `Parche en proceso...`;
      consoleState({ phase: 'preparing', label: 'Aplicando parches...' });
      consoleLog(`[Patch] ${toConsoleString(patch)}`, 'info');
    });

    launch.on('data', (e) => {
      progressBar.style.display = 'none';
      progressBar.classList.remove('progress-bar-active');
      if (!keepLauncherVisible) {
        ipcRenderer.send('main-window-hide');
      }
      new logger('Minecraft', '#36b030');
      ipcRenderer.send('main-window-progress-reset');
      infoStarting.innerHTML = keepLauncherVisible
        ? 'Jugando...'
        : `Iniciando...`;
      consoleState({ phase: 'running', label: 'Minecraft en ejecución' });
      consoleLog(e, 'stdout', 'game');
      console.log(e);
    });

    launch.on('close', (code) => {
      if (configClient.launcher_config.closeLauncher == 'close-launcher') {
        ipcRenderer.send('main-window-show');
      }
      ipcRenderer.send('main-window-progress-reset');
      infoStartingBOX.style.display = 'none';
      playInstanceBTN.style.display = 'flex';
      progressBar.classList.remove('progress-bar-active');
      infoStarting.innerHTML = `Verificando`;
      new logger(pkg.name, '#7289da');
      consoleLog(
        `Proceso de juego finalizado con código ${code ?? 0}`,
        'status',
        'game'
      );
      consoleState({
        phase: 'closed',
        label:
          code === 0
            ? 'Juego cerrado correctamente'
            : `Juego cerrado con código ${code}`
      });
      console.log('Cerrar');
    });

    launch.on('error', (err) => {
      let popupError = new popup();

      popupError.openPopup({
        title: 'Error',
        content: err.error,
        color: 'red',
        options: true
      });

      if (configClient.launcher_config.closeLauncher == 'close-launcher') {
        ipcRenderer.send('main-window-show');
      }
      ipcRenderer.send('main-window-progress-reset');
      infoStartingBOX.style.display = 'none';
      playInstanceBTN.style.display = 'flex';
      progressBar.classList.remove('progress-bar-active');
      infoStarting.innerHTML = `Verificando`;
      new logger(pkg.name, '#7289da');
      consoleLog(err?.error || err, 'error', 'launcher');
      consoleState({
        phase: 'error',
        label: err?.error || 'Error durante el lanzamiento'
      });
      console.log(err);
    });
  }

  getdate(e) {
    let date = new Date(e);
    let year = date.getFullYear();
    let month = date.getMonth() + 1;
    let day = date.getDate();
    let allMonth = [
      'Enero',
      'Febrero',
      'Marzo',
      'Abril',
      'Mayo',
      'Junio',
      'Julio',
      'Agosto',
      'Septiembre',
      'Octubre',
      'Noviembre',
      'Diciembre'
    ];
    return { year: year, month: allMonth[month - 1], day: day };
  }
}

function buildDownloadLabel({ phase, percent = 0, speedBps, etaSeconds }) {
  const safePhase = phase === 'verify' ? 'Verificando' : 'Descargando';
  const boundedPercent = Math.max(0, Math.min(100, percent || 0));
  const extras = [];

  if (safePhase === 'Descargando') {
    const speedText = formatSpeed(speedBps);
    const etaText = formatEta(etaSeconds);

    if (speedText) {
      extras.push(speedText);
    }

    if (etaText) {
      extras.push(etaText);
    }
  }

  const suffix = extras.length ? ` · ${extras.join(' · ')}` : '';
  return `${safePhase} ${boundedPercent.toFixed(0)}%${suffix}`;
}

function formatSpeed(bytesPerSecond) {
  if (!Number.isFinite(bytesPerSecond) || bytesPerSecond <= 0) {
    return null;
  }

  const units = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
  let value = bytesPerSecond;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  const precision = value >= 100 ? 0 : value >= 10 ? 1 : 2;
  return `${value.toFixed(precision)} ${units[unitIndex]}`;
}

function formatEta(seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return null;
  }

  const totalSeconds = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  const parts = [];

  if (hours) {
    parts.push(`${hours}h`);
  }

  if (minutes || hours) {
    parts.push(`${minutes}m`);
  }

  parts.push(`${secs}s`);
  return parts.join(' ');
}

export default Home;
