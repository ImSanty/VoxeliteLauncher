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
  popup,
  presence
} from '../utils.js';

const { Launch } = require('./assets/js/minecraft-core/Index.js');
const { ipcRenderer } = require('electron');
const { Buffer } = require('buffer');
const fs = require('fs');
const path = require('path');

// Voxelite patch (temporary): mitigate minecraft-java-core Forge installer issues on Windows until upstream can be fixed.
// NOTE: We cannot modify the third-party dependency directly, so this shim stays here until the vendor ships a permanent fix.
(() => {
  try {
    const moduleEntry = require.resolve('./assets/js/minecraft-core/Index.js');
    const buildDir = path.dirname(moduleEntry);
    const loaderEntry = path.join(buildDir, 'Minecraft-Loader', 'index.js');
    const Loader = require(loaderEntry)?.default;
    if (!Loader || Loader.__voxelitePatched) return;

    Loader.__voxelitePatched = true;
    const originalForge = Loader.prototype.forge;
    if (typeof originalForge !== 'function') return;

    Loader.prototype.forge = async function patchedForge(LoaderData) {
      const nativeCpSync = typeof fs.cpSync === 'function' ? fs.cpSync : null;
      if (!nativeCpSync) {
        return originalForge.call(this, LoaderData);
      }

      const ensureForgeJarIntegrity = (forgeVersion) => {
        try {
          const versionId = forgeVersion?.id;
          const minecraftJar = this?.options?.loader?.config?.minecraftJar;
          if (!versionId || !minecraftJar || !fs.existsSync(minecraftJar)) {
            return;
          }

          const destinationDir = path.resolve(
            this.options.path,
            'versions',
            versionId
          );
          const destinationFile = path.join(destinationDir, `${versionId}.jar`);

          const destinationExists = fs.existsSync(destinationFile);
          const destinationSize = destinationExists
            ? fs.statSync(destinationFile).size
            : 0;

          if (destinationExists && destinationSize > 0) {
            return;
          }

          fs.mkdirSync(destinationDir, { recursive: true });
          try {
            fs.copyFileSync(minecraftJar, destinationFile);
            const copiedSize = fs.statSync(destinationFile).size;
            if (!copiedSize) {
              throw new Error('Empty Forge jar after fallback copy');
            }
            console.info(
              '[voxelite-launcher] Applied fallback Forge jar copy after cpSync failure'
            );
          } catch (copyError) {
            console.warn(
              '[voxelite-launcher] Fallback Forge jar copy failed',
              copyError
            );
          }
        } catch (integrityError) {
          console.warn(
            '[voxelite-launcher] Failed to validate Forge jar integrity',
            integrityError
          );
        }
      };

      const shouldIgnoreCopyError = (error, destination) => {
        if (!error || process.platform !== 'win32') return false;
        if (!error.message?.includes('The operation completed successfully')) {
          return false;
        }
        return destination && fs.existsSync(destination);
      };

      fs.cpSync = function patchedCpSync(src, dest, options) {
        try {
          return nativeCpSync.call(fs, src, dest, options);
        } catch (error) {
          if (shouldIgnoreCopyError(error, dest)) {
            return dest;
          }
          throw error;
        }
      };

      try {
        const forgeVersion = await originalForge.call(this, LoaderData);
        ensureForgeJarIntegrity(forgeVersion);
        return forgeVersion;
      } finally {
        fs.cpSync = nativeCpSync;
      }
    };
  } catch (error) {
    console.error('[voxelite-launcher] Failed to patch forge loader', error);
  }
})();

class Home {
  static id = 'home';

  constructor() {
    this.newsPollTimer = null;
    this.lastNewsSignature = null;
    this.newsPollInterval = 60000;
    this.newsLoading = false;
  }
  async init(config) {
    this.config = config;
    this.db = new database();
    this.stopNewsPolling();
    const configClient = await this.db.readData('configClient');
    const rpcEnabled = configClient?.launcher_config?.discordPresenceEnabled;
    presence.setEnabled(rpcEnabled !== false);
    presence.setPage('home');
    await this.news();
    this.startNewsPolling();
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

  buildNewsSignature(news) {
    if (!Array.isArray(news)) return 'invalid';
    return news
      .map((item) => {
        const title = item?.title || '';
        const published = item?.publish_date || '';
        const content = item?.content || '';
        return `${published}|${title}|${content}`;
      })
      .join('||');
  }

  renderNewsList(target, news) {
    if (!target) return;
    target.innerHTML = '';

    if (Array.isArray(news) && news.length) {
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
        target.appendChild(blockNews);
      }
      return;
    }

    let blockNews = document.createElement('div');
    blockNews.classList.add('news-block');
    blockNews.innerHTML = news
      ? `
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
                      </div>`
      : `
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
    target.appendChild(blockNews);
  }

  async news() {
    if (this.newsLoading) return;
    this.newsLoading = true;
    try {
      const newsElement = document.querySelector('.news-list');
      if (!newsElement) {
        return;
      }

      let news = await config
        .getNews()
        .then((res) => res)
        .catch(() => false);

      const normalizedNews = Array.isArray(news)
        ? news
        : news && typeof news === 'object'
        ? [news]
        : [];

      const signature = this.buildNewsSignature(normalizedNews);
      if (signature === this.lastNewsSignature && news !== false) {
        return;
      }

      this.lastNewsSignature = signature;
      this.renderNewsList(newsElement, news === false ? false : normalizedNews);
    } finally {
      this.newsLoading = false;
    }
  }

  startNewsPolling() {
    if (this.newsPollTimer) return;
    this.newsPollTimer = setInterval(() => {
      this.news();
    }, this.newsPollInterval);
  }

  stopNewsPolling() {
    if (!this.newsPollTimer) return;
    clearInterval(this.newsPollTimer);
    this.newsPollTimer = null;
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

    this.updatePresenceContext(auth?.name, selectedInstanceConfig?.name);

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
          const latestAccount =
            (await this.db.readData(
              'accounts',
              configClient.account_selected
            )) || auth;
          this.updatePresenceContext(latestAccount?.name, options?.name);
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
    const devRuntimeEnv =
      typeof process !== 'undefined' &&
      (Boolean(process?.env?.ELECTRON_START_URL) ||
        process?.env?.NODE_ENV === 'development');
    const devToolsTracing = Boolean(
      devRuntimeEnv || configClient?.launcher_config?.devtoolsTracing
    );

    const devTraceEvent = (label, payload) => {
      if (!devToolsTracing) return;
      try {
        if (typeof payload === 'undefined') {
          console.debug(`[voxelite-launcher] ${label}`);
        } else {
          console.debug(`[voxelite-launcher] ${label}`, payload);
        }
      } catch {
        /* ignore console failures */
      }
    };

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
      let output = toConsoleString(message);
      if (!output.trim()) return;
      if (devToolsTracing) {
        devTraceEvent('log', { source, level, message: output });
      }
      if (!consoleEnabled) return;
      sendConsole('console-window-log', {
        message: output,
        level,
        source,
        timestamp: Date.now()
      });
    };

    const consoleState = (state = {}) => {
      if (devToolsTracing) {
        devTraceEvent('status', state);
      }
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

    const requestedTimeout = Number(
      configClient?.launcher_config?.download_timeout_ms
    );
    const downloadTimeoutMs =
      Number.isFinite(requestedTimeout) && requestedTimeout >= 60000
        ? requestedTimeout
        : 5 * 60 * 1000;

    let opt = {
      url: options.url,
      authenticator: authenticator,
      timeout: downloadTimeoutMs,
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

    devTraceEvent('launch:options', {
      instance: opt.instance,
      version: opt.version,
      loader: opt.loader?.type,
      timeoutMs: opt.timeout,
      parallelDownloads: opt.downloadFileMultiple,
      keepLauncherVisible
    });

    launch.Launch(opt);

    playInstanceBTN.style.display = 'none';
    infoStartingBOX.style.display = 'block';
    progressBar.style.display = 'block';
    progressBar.classList.add('progress-bar-active');

    let lastProgressTick = { time: Date.now(), value: 0 };
    let lastPercent = 0;
    let lastSpeedBps = 0;
    const speedSamples = [];
    const maxSpeedSamples = 50;
    let currentPhase = 'preparing';
    let preparingTicker = null;

    const stopPreparingTicker = () => {
      if (preparingTicker) {
        clearInterval(preparingTicker);
        preparingTicker = null;
      }
    };

    const ensurePreparingTicker = () => {
      if (preparingTicker) return;
      preparingTicker = setInterval(() => {
        if (currentPhase !== 'preparing') {
          stopPreparingTicker();
          return;
        }
        const label = updateLabel();
        consoleState({ phase: 'preparing', label });
      }, 500);
    };
    const downloadLogKeys = new Set();
    let lastDownloadEntry = null;
    const baseGamePath = opt.path.replace(/\\/g, '/');
    const recordSpeedSample = (value) => {
      if (!Number.isFinite(value) || value <= 0) {
        return;
      }
      speedSamples.push(value);
      if (speedSamples.length > maxSpeedSamples) {
        speedSamples.shift();
      }
    };
    const getSmoothedSpeed = () => {
      if (!speedSamples.length) {
        return null;
      }
      const total = speedSamples.reduce((sum, sample) => sum + sample, 0);
      return total / speedSamples.length;
    };
    const getEffectiveSpeed = () => {
      const smoothed = getSmoothedSpeed();
      if (Number.isFinite(smoothed) && smoothed > 0) {
        return smoothed;
      }
      if (Number.isFinite(lastSpeedBps) && lastSpeedBps > 0) {
        return lastSpeedBps;
      }
      return null;
    };

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
          const relative = normalizedPath
            .slice(baseGamePath.length)
            .replace(/^\//, '');
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

    const summarizeDownloadFile = (file) => {
      if (!file || typeof file !== 'object') {
        return file ?? null;
      }

      return {
        path:
          typeof file.path === 'string' && file.path.trim()
            ? file.path.trim()
            : null,
        name:
          typeof file.name === 'string' && file.name.trim()
            ? file.name.trim()
            : null,
        url:
          typeof file.url === 'string' && file.url.trim()
            ? file.url.trim()
            : null,
        size: Number.isFinite(file.size) && file.size >= 0 ? file.size : null,
        type: file.type ?? null
      };
    };

    const updateLabel = () => {
      const displaySpeed =
        currentPhase === 'download' ? getEffectiveSpeed() : undefined;
      const timestamp = Date.now();
      const label = buildDownloadLabel({
        phase: currentPhase,
        percent: lastPercent,
        speedBps: displaySpeed,
        timestamp
      });
      infoStarting.innerHTML = label;
      return label;
    };

    ensurePreparingTicker();
    updateLabel();

    updateLabel();
    ipcRenderer.send('main-window-progress-load');

    launch.on('download', ({ status, file }) => {
      const key = normalizeDownloadKey(file);
      const label = formatDownloadLabel(file);
      if (status === 'start') {
        if (key) {
          if (downloadLogKeys.has(key)) {
            return;
          }
          downloadLogKeys.add(key);
        }
        lastDownloadEntry = { file, label };
        devTraceEvent('download:start', {
          label,
          file: summarizeDownloadFile(file)
        });
        if (!label) return;
        consoleLog(`[Descarga] ${label}`, 'info');
        return;
      }

      if (status === 'end') {
        devTraceEvent('download:end', {
          label,
          file: summarizeDownloadFile(file)
        });
      }
    });

    launch.on('extract', (extract) => {
      ipcRenderer.send('main-window-progress-load');
      consoleState({ phase: 'preparing', label: 'Extrayendo librerías...' });
      consoleLog(`[Extract] ${toConsoleString(extract)}`, 'info');
      console.log(extract);
      devTraceEvent('extract', extract);
    });

    launch.on('progress', (progress, size, element) => {
      stopPreparingTicker();
      currentPhase = 'download';

      const percent = size > 0 ? (progress / size) * 100 : 0;
      const now = Date.now();
      const deltaBytes = progress - lastProgressTick.value;
      const deltaTime = (now - lastProgressTick.time) / 1000;
      let derivedSpeed = lastSpeedBps;

      if (deltaTime > 0.2 && deltaBytes >= 0) {
        derivedSpeed = deltaBytes / deltaTime;
      }

      lastProgressTick = { time: now, value: progress };
      lastPercent = percent;

      if (Number.isFinite(derivedSpeed) && derivedSpeed > 0) {
        recordSpeedSample(derivedSpeed);
        lastSpeedBps = derivedSpeed;
      }

      const effectiveSpeed = getEffectiveSpeed();

      const label = updateLabel();
      devTraceEvent('progress', {
        downloaded: progress,
        size,
        percent,
        label,
        file: summarizeDownloadFile(element),
        speed: effectiveSpeed
      });
      consoleState({ phase: 'download', label });
      ipcRenderer.send('main-window-progress', { progress, size });
      progressBar.value = progress;
      progressBar.max = size;
    });

    launch.on('check', (progress, size, element) => {
      stopPreparingTicker();
      currentPhase = 'verify';
      const percent = size > 0 ? (progress / size) * 100 : 0;
      lastPercent = percent;
      const label = updateLabel();
      devTraceEvent('verify:progress', {
        verified: progress,
        size,
        percent,
        label,
        file: summarizeDownloadFile(element)
      });
      consoleState({ phase: 'verifying', label });
      ipcRenderer.send('main-window-progress', { progress, size });
      progressBar.value = progress;
      progressBar.max = size;
    });

    launch.on('estimated', (time) => {
      if (Number.isFinite(time) && time >= 0) {
        devTraceEvent('download:eta', { seconds: time });
      }
    });

    launch.on('speed', (speed) => {
      if (Number.isFinite(speed) && speed > 0) {
        recordSpeedSample(speed);
        lastSpeedBps = speed;
        if (currentPhase === 'download') {
          const label = updateLabel();
          consoleState({ phase: 'download', label });
        }
        devTraceEvent('download:speed', { bytesPerSecond: speed });
      }
    });

    launch.on('patch', (patch) => {
      currentPhase = 'preparing';
      ensurePreparingTicker();
      console.log(patch);
      ipcRenderer.send('main-window-progress-load');
      infoStarting.innerHTML = `Parche en proceso...`;
      consoleState({ phase: 'preparing', label: 'Aplicando parches...' });
      consoleLog(`[Patch] ${toConsoleString(patch)}`, 'info');
      devTraceEvent('patch', patch);
    });

    launch.on('data', (e) => {
      stopPreparingTicker();
      progressBar.style.display = 'none';
      progressBar.classList.remove('progress-bar-active');
      if (!keepLauncherVisible) {
        ipcRenderer.send('main-window-hide');
        presence.setSuspended(true);
      }
      new logger('Minecraft', '#36b030');
      ipcRenderer.send('main-window-progress-reset');
      infoStarting.innerHTML = keepLauncherVisible
        ? 'Jugando...'
        : `Iniciando...`;
      consoleState({ phase: 'running', label: 'Minecraft en ejecución' });
      consoleLog(e, 'stdout', 'game');
      console.log(e);
      devTraceEvent('game:data', toConsoleString(e));
    });

    launch.on('close', (code) => {
      stopPreparingTicker();
      if (configClient.launcher_config.closeLauncher == 'close-launcher') {
        ipcRenderer.send('main-window-show');
      }
      presence.setSuspended(false);
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
      devTraceEvent('game:close', { code });
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
      stopPreparingTicker();
      const popupError = new popup();
      const formattedError = formatLauncherError(err, lastDownloadEntry);

      popupError.openPopup({
        title: 'Error',
        content: formattedError.html,
        color: 'red',
        options: true
      });

      if (configClient.launcher_config.closeLauncher == 'close-launcher') {
        ipcRenderer.send('main-window-show');
      }
      presence.setSuspended(false);
      ipcRenderer.send('main-window-progress-reset');
      infoStartingBOX.style.display = 'none';
      playInstanceBTN.style.display = 'flex';
      progressBar.classList.remove('progress-bar-active');
      infoStarting.innerHTML = `Verificando`;
      new logger(pkg.name, '#7289da');
      consoleLog(
        formattedError.debug ?? toConsoleString(err),
        'error',
        'launcher'
      );
      devTraceEvent('launch:error', {
        error: serializeError(err),
        lastDownload: summarizeDownloadFile(lastDownloadEntry?.file)
      });
      consoleState({
        phase: 'error',
        label: formattedError.rawMessage || 'Error durante el lanzamiento'
      });
      console.error(err);
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

  updatePresenceContext(playerName, instanceName) {
    presence.setPlayerName(playerName || null);
    presence.setInstanceName(instanceName || null);
  }
}

function buildDownloadLabel({
  phase,
  percent = 0,
  speedBps,
  timestamp = Date.now()
}) {
  if (phase === 'preparing') {
    const dotCount = (Math.floor(timestamp / 500) % 3) + 1 || 1;
    const dots = '.'.repeat(dotCount);
    return `Analizando archivos${dots}`;
  }

  const safePhase = phase === 'verify' ? 'Verificando' : 'Descargando';
  const boundedPercent = Math.max(0, Math.min(100, percent || 0));
  const extras = [];

  if (safePhase === 'Descargando') {
    const speedText = formatSpeed(speedBps);

    if (speedText) {
      extras.push(speedText);
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


function formatLauncherError(error, lastDownloadEntry) {
  const segments = [];
  const message = extractErrorMessage(error);

  if (message) {
    segments.push(message);
  }

  const code =
    error?.code ||
    error?.status ||
    error?.response?.status ||
    error?.cause?.code;

  if (code) {
    segments.push(`Código: ${code}`);
  }

  const fileLabel = describeDownloadEntry(lastDownloadEntry);

  if (fileLabel) {
    segments.push(`Archivo: ${fileLabel}`);
  }

  const url =
    error?.url ||
    error?.resource ||
    error?.downloadURL ||
    lastDownloadEntry?.file?.url;

  if (url) {
    segments.push(`URL: ${url}`);
  }

  const html = segments.length
    ? segments.map((segment) => escapeHtml(segment)).join('<br/>')
    : 'Se produjo un error durante la descarga.';

  let debug = null;

  try {
    debug = JSON.stringify(
      {
        error: serializeError(error),
        download: lastDownloadEntry?.file ?? null
      },
      null,
      2
    );
  } catch {
    debug = null;
  }

  return {
    html,
    rawMessage: message,
    debug
  };
}

function extractErrorMessage(error) {
  if (!error && error !== 0) {
    return null;
  }

  if (typeof error === 'string') {
    return error;
  }

  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error?.error === 'string') {
    return error.error;
  }

  if (typeof error?.message === 'string') {
    return error.message;
  }

  if (typeof error === 'object') {
    try {
      return JSON.stringify(error);
    } catch {
      return String(error);
    }
  }

  return String(error);
}

function describeDownloadEntry(entry) {
  if (!entry) {
    return null;
  }

  if (entry.label) {
    return entry.label;
  }

  const file = entry.file;

  if (!file) {
    return null;
  }

  if (typeof file.path === 'string' && file.path.trim()) {
    return file.path.trim();
  }

  if (typeof file.name === 'string' && file.name.trim()) {
    return file.name.trim();
  }

  if (typeof file.type === 'string' && file.type.trim()) {
    return file.type.trim();
  }

  return null;
}

function serializeError(error) {
  if (!error) {
    return null;
  }

  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      code: error.code ?? null
    };
  }

  if (typeof error === 'object') {
    try {
      return JSON.parse(JSON.stringify(error));
    } catch {
      return Object.entries(error).reduce((acc, [key, value]) => {
        acc[key] = value;
        return acc;
      }, {});
    }
  }

  return { message: String(error) };
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export default Home;
