/**
 * @author Luuxis
 * @license CC-BY-NC 4.0 - https://creativecommons.org/licenses/by-nc/4.0
 */

import {
  changePanel,
  accountSelect,
  database,
  Slider,
  config,
  setStatus,
  setStatusTarget,
  popup,
  appdata,
  presence
} from '../utils.js';
const { ipcRenderer, shell } = require('electron');
const os = require('os');

class Settings {
  static id = 'settings';
  async init(config) {
    this.config = config;
    this.db = new database();
    this.navBTN();
    this.accounts();
    this.ram();
    this.javaPath();
    this.resolution();
    this.launcher();
    this.credits();
  }

  navBTN() {
    document.querySelector('.nav-box').addEventListener('click', (e) => {
      if (e.target.classList.contains('nav-settings-btn')) {
        let id = e.target.id;

        let activeSettingsBTN = document.querySelector('.active-settings-BTN');
        let activeContainerSettings = document.querySelector(
          '.active-container-settings'
        );

        if (id == 'save') {
          if (activeSettingsBTN)
            activeSettingsBTN.classList.toggle('active-settings-BTN');
          document
            .querySelector('#account')
            .classList.add('active-settings-BTN');

          if (activeContainerSettings)
            activeContainerSettings.classList.toggle(
              'active-container-settings'
            );
          document
            .querySelector(`#account-tab`)
            .classList.add('active-container-settings');
          return changePanel('home');
        }

        if (activeSettingsBTN)
          activeSettingsBTN.classList.toggle('active-settings-BTN');
        e.target.classList.add('active-settings-BTN');

        if (activeContainerSettings)
          activeContainerSettings.classList.toggle('active-container-settings');
        document
          .querySelector(`#${id}-tab`)
          .classList.add('active-container-settings');
      }
    });
  }

  accounts() {
    document
      .querySelector('.accounts-list')
      .addEventListener('click', async (e) => {
        let popupAccount = new popup();
        try {
          let id = e.target.id;
          if (e.target.classList.contains('account')) {
            popupAccount.openPopup({
              title: 'Iniciando sesion',
              content: 'Por favor espere...',
              color: 'var(--color)'
            });

            if (id == 'add') {
              document.querySelector('.cancel-home').style.display = 'inline';
              return changePanel('login');
            }

            let account = await this.db.readData('accounts', id);
            let configClient = await this.setInstance(account);
            await accountSelect(account);
            configClient.account_selected = account.ID;
            return await this.db.updateData('configClient', configClient);
          }

          if (e.target.classList.contains('delete-profile')) {
            popupAccount.openPopup({
              title: 'Iniciando sesion',
              content: 'Por favor espere...',
              color: 'var(--color)'
            });
            await this.db.deleteData('accounts', id);
            let deleteProfile = document.getElementById(`${id}`);
            let accountListElement = document.querySelector('.accounts-list');
            accountListElement.removeChild(deleteProfile);

            if (accountListElement.children.length == 1)
              return changePanel('login');

            let configClient = await this.db.readData('configClient');

            if (configClient.account_selected == id) {
              let allAccounts = await this.db.readAllData('accounts');
              configClient.account_selected = allAccounts[0].ID;
              accountSelect(allAccounts[0]);
              let newInstanceSelect = await this.setInstance(allAccounts[0]);
              configClient.instance_selct = newInstanceSelect.instance_selct;
              return await this.db.updateData('configClient', configClient);
            }
          }
        } catch (err) {
          console.error(err);
        } finally {
          popupAccount.closePopup();
        }
      });
  }

  async setInstance(auth) {
    let configClient = await this.db.readData('configClient');
    let instanceSelect = configClient.instance_selct;
    let instancesList = await config.getInstanceList();

    for (let instance of instancesList) {
      if (instance.whitelistActive) {
        let whitelist = instance.whitelist.find(
          (whitelist) => whitelist == auth.name
        );
        if (whitelist !== auth.name) {
          if (instance.name == instanceSelect) {
            let newInstanceSelect = instancesList.find(
              (i) => i.whitelistActive == false
            );
            configClient.instance_selct = newInstanceSelect.name;
            setStatusTarget(newInstanceSelect.name);
            await setStatus(newInstanceSelect.status, newInstanceSelect.name);
          }
        }
      }
    }
    presence.setInstanceName(configClient?.instance_selct || null);
    return configClient;
  }

  async ram() {
    let configClient = await this.db.readData('configClient');
    let totalMem = Math.trunc((os.totalmem() / 1073741824) * 10) / 10;
    let freeMem = Math.trunc((os.freemem() / 1073741824) * 10) / 10;

    document.getElementById('total-ram').textContent = `${totalMem} GB`;
    document.getElementById('free-ram').textContent = `${freeMem} GB`;

    let sliderDiv = document.querySelector('.memory-slider');
    if (!sliderDiv) return;

    const sliderMinAttr = parseFloat(sliderDiv.getAttribute('min')) || 1;
    const sliderMaxAttr = Math.max(
      sliderMinAttr,
      Math.trunc((80 * totalMem) / 100)
    );
    sliderDiv.setAttribute('max', sliderMaxAttr);

    let storedMemory = configClient?.java_config?.java_memory || {};
    let initialValue = parseFloat(
      storedMemory.max ?? storedMemory.min ?? sliderMinAttr
    );

    if (!Number.isFinite(initialValue) || initialValue < sliderMinAttr) {
      initialValue = sliderMinAttr;
    }
    if (initialValue > sliderMaxAttr) {
      initialValue = sliderMaxAttr;
    }

    if (
      storedMemory.min !== initialValue ||
      storedMemory.max !== initialValue
    ) {
      configClient.java_config.java_memory = {
        min: initialValue,
        max: initialValue
      };
      this.db.updateData('configClient', configClient);
    }

    let slider = new Slider('.memory-slider', null, initialValue);
    let maxSpan = document.querySelector('.slider-touch-right span');
    maxSpan.setAttribute('value', `${initialValue} GB`);

    slider.on('change', async (_min, max) => {
      let value = Math.max(sliderMinAttr, Math.min(max, sliderMaxAttr));
      maxSpan.setAttribute('value', `${value} GB`);
      let config = await this.db.readData('configClient');
      config.java_config.java_memory = { min: value, max: value };
      this.db.updateData('configClient', config);
    });
  }

  async javaPath() {
    let javaPathText = document.querySelector('.java-path-txt');
    javaPathText.textContent = `${await appdata()}/${
      process.platform == 'darwin'
        ? this.config.dataDirectory
        : `.${this.config.dataDirectory}`
    }/runtime`;

    let configClient = await this.db.readData('configClient');
    let javaPath =
      configClient?.java_config?.java_path ||
      'Dejar que el launcher elija la version de java';
    let javaPathInputTxt = document.querySelector('.java-path-input-text');
    let javaPathInputFile = document.querySelector('.java-path-input-file');
    javaPathInputTxt.value = javaPath;

    document
      .querySelector('.java-path-set')
      .addEventListener('click', async () => {
        javaPathInputFile.value = '';
        javaPathInputFile.click();
        await new Promise((resolve) => {
          let interval;
          interval = setInterval(() => {
            if (javaPathInputFile.value != '') resolve(clearInterval(interval));
          }, 100);
        });

        if (
          javaPathInputFile.value.replace('.exe', '').endsWith('java') ||
          javaPathInputFile.value.replace('.exe', '').endsWith('javaw')
        ) {
          let configClient = await this.db.readData('configClient');
          let file = javaPathInputFile.files[0].path;
          javaPathInputTxt.value = file;
          configClient.java_config.java_path = file;
          await this.db.updateData('configClient', configClient);
        } else alert('El nombre del archivo debe ser java o javaw');
      });

    document
      .querySelector('.java-path-reset')
      .addEventListener('click', async () => {
        let configClient = await this.db.readData('configClient');
        javaPathInputTxt.value =
          'Dejar que el launcher elija la version de java ';
        configClient.java_config.java_path = null;
        await this.db.updateData('configClient', configClient);
      });
  }

  async resolution() {
    let configClient = await this.db.readData('configClient');
    let resolution = configClient?.game_config?.screen_size || {
      width: 1920,
      height: 1080
    };

    let width = document.querySelector('.width-size');
    let height = document.querySelector('.height-size');
    let resolutionReset = document.querySelector('.size-reset');

    width.value = resolution.width;
    height.value = resolution.height;

    width.addEventListener('change', async () => {
      let configClient = await this.db.readData('configClient');
      configClient.game_config.screen_size.width = width.value;
      await this.db.updateData('configClient', configClient);
    });

    height.addEventListener('change', async () => {
      let configClient = await this.db.readData('configClient');
      configClient.game_config.screen_size.height = height.value;
      await this.db.updateData('configClient', configClient);
    });

    resolutionReset.addEventListener('click', async () => {
      let configClient = await this.db.readData('configClient');
      configClient.game_config.screen_size = { width: '1280', height: '720' };
      width.value = '1280';
      height.value = '720';
      await this.db.updateData('configClient', configClient);
    });
  }

  async launcher() {
    let configClient = await this.db.readData('configClient');

    let maxDownloadFiles = configClient?.launcher_config?.download_multi || 5;
    let maxDownloadFilesInput = document.querySelector('.max-files');
    let maxDownloadFilesReset = document.querySelector('.max-files-reset');
    maxDownloadFilesInput.value = maxDownloadFiles;

    maxDownloadFilesInput.addEventListener('change', async () => {
      let configClient = await this.db.readData('configClient');
      configClient.launcher_config.download_multi = maxDownloadFilesInput.value;
      await this.db.updateData('configClient', configClient);
    });

    maxDownloadFilesReset.addEventListener('click', async () => {
      let configClient = await this.db.readData('configClient');
      maxDownloadFilesInput.value = 5;
      configClient.launcher_config.download_multi = 5;
      await this.db.updateData('configClient', configClient);
    });

    const consoleBox = document.querySelector('.console-box');
    const consoleButtons = document.querySelectorAll('.console-btn');
    let consoleMode = configClient?.launcher_config?.consoleMode || 'hidden';

    const setActiveConsole = (mode) => {
      consoleButtons.forEach((btn) => {
        btn.classList.toggle('active-console', btn.dataset.mode === mode);
      });
    };

    setActiveConsole(consoleMode);

    consoleBox?.addEventListener('click', async (e) => {
      const target = e.target.closest('.console-btn');
      if (!target) return;
      const mode = target.dataset.mode;
      if (!mode || mode === consoleMode) return;
      consoleMode = mode;
      setActiveConsole(consoleMode);
      let configClient = await this.db.readData('configClient');
      configClient.launcher_config.consoleMode = consoleMode;
      await this.db.updateData('configClient', configClient);
      if (consoleMode === 'window') {
        ipcRenderer.send('console-window-open', { focus: true });
      } else {
        ipcRenderer.send('console-window-close');
      }
    });

    let closeBox = document.querySelector('.close-box');
    let closeLauncher =
      configClient?.launcher_config?.closeLauncher || 'close-launcher';

    if (closeLauncher == 'close-launcher') {
      document.querySelector('.close-launcher').classList.add('active-close');
    } else if (closeLauncher == 'close-all') {
      document.querySelector('.close-all').classList.add('active-close');
    } else if (closeLauncher == 'close-none') {
      document.querySelector('.close-none').classList.add('active-close');
    }

    closeBox.addEventListener('click', async (e) => {
      if (e.target.classList.contains('close-btn')) {
        let activeClose = document.querySelector('.active-close');
        if (e.target.classList.contains('active-close')) return;
        activeClose?.classList.toggle('active-close');

        let configClient = await this.db.readData('configClient');

        if (e.target.classList.contains('close-launcher')) {
          e.target.classList.toggle('active-close');
          configClient.launcher_config.closeLauncher = 'close-launcher';
          await this.db.updateData('configClient', configClient);
        } else if (e.target.classList.contains('close-all')) {
          e.target.classList.toggle('active-close');
          configClient.launcher_config.closeLauncher = 'close-all';
          await this.db.updateData('configClient', configClient);
        } else if (e.target.classList.contains('close-none')) {
          e.target.classList.toggle('active-close');
          configClient.launcher_config.closeLauncher = 'close-none';
          await this.db.updateData('configClient', configClient);
        }
      }
    });
  }

  credits() {
    let creditsList = document.querySelector('.credits-list');
    if (!creditsList) return;

    creditsList.addEventListener('click', (e) => {
      let item = e.target.closest('.credit-item');
      if (!item || !item.dataset.url) return;
      shell.openExternal(item.dataset.url);
    });
  }
}
export default Settings;
