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
  pkg,
  popup
} from '../utils.js';

const { Launch } = require('minecraft-java-core');
const { shell, ipcRenderer } = require('electron');

class Home {
  static id = 'home';
  async init(config) {
    this.config = config;
    this.db = new database();
    this.news();
    this.socialLick();
    this.instancesSelect();
    document
      .querySelector('.settings-btn')
      .addEventListener('click', (e) => changePanel('settings'));
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

  socialLick() {
    let socials = document.querySelectorAll('.social-block');

    socials.forEach((social) => {
      social.addEventListener('click', (e) => {
        shell.openExternal(e.target.dataset.url);
      });
    });
  }

  async instancesSelect() {
    let configClient = await this.db.readData('configClient');
    let auth = await this.db.readData(
      'accounts',
      configClient.account_selected
    );
    let instancesList = await config.getInstanceList();
    let instanceSelect = instancesList.find(
      (i) => i.name == configClient?.instance_selct
    )
      ? configClient?.instance_selct
      : null;

    let instanceBTN = document.querySelector('.play-instance');
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
            setStatus(newInstanceSelect.status);
            await this.db.updateData('configClient', configClient);
          }
        }
      } else console.log(`Initializing instance ${instance.name}...`);
      if (instance.name == instanceSelect) setStatus(instance.status);
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
        instanceSelect = instancesList.filter(
          (i) => i.name == newInstanceSelect
        );
        instancePopup.style.display = 'none';
        let instance = await config.getInstanceList();
        let options = instance.find(
          (i) => i.name == configClient.instance_selct
        );
        await setStatus(options.status);
      }
    });

    instanceBTN.addEventListener('click', async (e) => {
      let configClient = await this.db.readData('configClient');
      let instanceSelect = configClient.instance_selct;
      let auth = await this.db.readData(
        'accounts',
        configClient.account_selected
      );

      if (e.target.classList.contains('instance-select')) {
        instancesListPopup.innerHTML = '';
        for (let instance of instancesList) {
          if (instance.whitelistActive) {
            instance.whitelist.map((whitelist) => {
              if (whitelist == auth?.name) {
                if (instance.name == instanceSelect) {
                  instancesListPopup.innerHTML += `<div id="${instance.name}" class="instance-elements active-instance">${instance.name}</div>`;
                } else {
                  instancesListPopup.innerHTML += `<div id="${instance.name}" class="instance-elements">${instance.name}</div>`;
                }
              }
            });
          } else {
            if (instance.name == instanceSelect) {
              instancesListPopup.innerHTML += `<div id="${instance.name}" class="instance-elements active-instance">${instance.name}</div>`;
            } else {
              instancesListPopup.innerHTML += `<div id="${instance.name}" class="instance-elements">${instance.name}</div>`;
            }
          }
        }

        instancePopup.style.display = 'flex';
      }

      if (!e.target.classList.contains('instance-select')) this.startGame();
    });

    instanceCloseBTN.addEventListener(
      'click',
      () => (instancePopup.style.display = 'none')
    );
  }

  async startGame() {
    let launch = new Launch();
    let configClient = await this.db.readData('configClient');
    let instance = await config.getInstanceList();
    let authenticator = await this.db.readData(
      'accounts',
      configClient.account_selected
    );
    let options = instance.find((i) => i.name == configClient.instance_selct);

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

    const updateLabel = () => {
      infoStarting.innerHTML = buildDownloadLabel({
        phase: currentPhase,
        percent: lastPercent,
        speedBps: currentPhase === 'download' ? lastSpeedBps : undefined,
        etaSeconds: currentPhase === 'download' ? lastEtaSeconds : undefined
      });
    };

    updateLabel();
    ipcRenderer.send('main-window-progress-load');

    launch.on('extract', (extract) => {
      ipcRenderer.send('main-window-progress-load');
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

      updateLabel();
      ipcRenderer.send('main-window-progress', { progress, size });
      progressBar.value = progress;
      progressBar.max = size;
    });

    launch.on('check', (progress, size) => {
      currentPhase = 'verify';
      const percent = size > 0 ? (progress / size) * 100 : 0;
      lastPercent = percent;
      updateLabel();
      ipcRenderer.send('main-window-progress', { progress, size });
      progressBar.value = progress;
      progressBar.max = size;
    });

    launch.on('estimated', (time) => {
      if (Number.isFinite(time) && time >= 0) {
        lastEtaSeconds = time;
        if (currentPhase === 'download') {
          updateLabel();
        }
      }
    });

    launch.on('speed', (speed) => {
      if (Number.isFinite(speed) && speed > 0) {
        lastSpeedBps = speed;
        if (currentPhase === 'download') {
          updateLabel();
        }
      }
    });

    launch.on('patch', (patch) => {
      console.log(patch);
      ipcRenderer.send('main-window-progress-load');
      infoStarting.innerHTML = `Parche en proceso...`;
    });

    launch.on('data', (e) => {
      progressBar.style.display = 'none';
      progressBar.classList.remove('progress-bar-active');
      if (configClient.launcher_config.closeLauncher == 'close-launcher') {
        ipcRenderer.send('main-window-hide');
      }
      new logger('Minecraft', '#36b030');
      ipcRenderer.send('main-window-progress-load');
      infoStarting.innerHTML = `Iniciando...`;
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
