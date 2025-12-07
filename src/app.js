/**
 * @author Luuxis
 * @license CC-BY-NC 4.0 - https://creativecommons.org/licenses/by-nc/4.0
 */

const { app, ipcMain, nativeTheme } = require('electron');
const { Microsoft } = require('minecraft-java-core');
const { autoUpdater } = require('electron-updater');

const path = require('path');
const fs = require('fs');

const UpdateWindow = require('./assets/js/windows/updateWindow.js');
const MainWindow = require('./assets/js/windows/mainWindow.js');
const ConsoleWindow = require('./assets/js/windows/consoleWindow.js');

const CONSOLE_LOG_LIMIT = 800;
const consolePhaseLabels = {
  idle: 'Esperando lanzamiento...',
  preparing: 'Preparando archivos...',
  download: 'Descargando recursos...',
  verifying: 'Verificando archivos...',
  running: 'Juego en ejecución',
  closed: 'Juego cerrado',
  error: 'Error en el lanzamiento'
};

let consoleLogs = [];
let consoleState = {
  phase: 'idle',
  label: consolePhaseLabels.idle,
  meta: {}
};

function normalizeConsoleMessage(value) {
  if (value === null || typeof value === 'undefined') return '';
  if (Buffer.isBuffer(value)) return value.toString('utf8');
  if (typeof value === 'object' && typeof value.message === 'string') {
    return value.message;
  }
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch (error) {
      return String(value);
    }
  }
  return String(value);
}

function dispatchConsoleLog(entry = {}) {
  const normalized = {
    message: normalizeConsoleMessage(entry.message ?? entry.text ?? ''),
    level: entry.level || entry.type || 'info',
    source: entry.source || 'launcher',
    timestamp: entry.timestamp || Date.now()
  };

  consoleLogs.push(normalized);
  if (consoleLogs.length > CONSOLE_LOG_LIMIT) {
    consoleLogs.splice(0, consoleLogs.length - CONSOLE_LOG_LIMIT);
  }

  const win = ConsoleWindow.getWindow();
  if (win) win.webContents.send('console-log', normalized);
}

function dispatchConsoleState(patch = {}) {
  const phase = patch.phase || patch.status || consoleState.phase;
  const label = patch.label || consolePhaseLabels[phase] || consoleState.label;
  const meta = {
    ...consoleState.meta,
    ...patch.meta
  };

  consoleState = {
    ...consoleState,
    ...patch,
    phase,
    label,
    meta
  };

  const win = ConsoleWindow.getWindow();
  if (win) win.webContents.send('console-state', consoleState);
}

let dev = process.env.NODE_ENV === 'dev';

if (dev) {
  let appPath = path.resolve('./data/Launcher').replace(/\\/g, '/');
  let appdata = path.resolve('./data').replace(/\\/g, '/');
  if (!fs.existsSync(appPath)) fs.mkdirSync(appPath, { recursive: true });
  if (!fs.existsSync(appdata)) fs.mkdirSync(appdata, { recursive: true });
  app.setPath('userData', appPath);
  app.setPath('appData', appdata);
}

if (!app.requestSingleInstanceLock()) app.quit();
else
  app.whenReady().then(() => {
    if (dev) return MainWindow.createWindow();
    UpdateWindow.createWindow();
  });

ipcMain.on('main-window-open', () => MainWindow.createWindow());
ipcMain.on('main-window-dev-tools', () =>
  MainWindow.getWindow().webContents.openDevTools({ mode: 'detach' })
);
ipcMain.on('main-window-dev-tools-close', () =>
  MainWindow.getWindow().webContents.closeDevTools()
);
ipcMain.on('main-window-close', () => MainWindow.destroyWindow());
ipcMain.on('main-window-reload', () => MainWindow.getWindow().reload());
ipcMain.on('main-window-progress', (event, options) =>
  MainWindow.getWindow().setProgressBar(options.progress / options.size)
);
ipcMain.on('main-window-progress-reset', () =>
  MainWindow.getWindow().setProgressBar(-1)
);
ipcMain.on('main-window-progress-load', () =>
  MainWindow.getWindow().setProgressBar(2)
);
ipcMain.on('main-window-minimize', () => MainWindow.getWindow().minimize());

ipcMain.on('update-window-close', () => UpdateWindow.destroyWindow());
ipcMain.on('update-window-dev-tools', () =>
  UpdateWindow.getWindow().webContents.openDevTools({ mode: 'detach' })
);
ipcMain.on('update-window-progress', (event, options) =>
  UpdateWindow.getWindow().setProgressBar(options.progress / options.size)
);
ipcMain.on('update-window-progress-reset', () =>
  UpdateWindow.getWindow().setProgressBar(-1)
);
ipcMain.on('update-window-progress-load', () =>
  UpdateWindow.getWindow().setProgressBar(2)
);

ipcMain.handle('path-user-data', () => app.getPath('userData'));
ipcMain.handle('appData', (e) => app.getPath('appData'));

ipcMain.on('main-window-maximize', () => {
  if (MainWindow.getWindow().isMaximized()) {
    MainWindow.getWindow().unmaximize();
  } else {
    MainWindow.getWindow().maximize();
  }
});

ipcMain.on('main-window-hide', () => MainWindow.getWindow().hide());
ipcMain.on('main-window-show', () => MainWindow.getWindow().show());

ipcMain.on('console-window-open', (event, options = {}) => {
  const win = ConsoleWindow.createWindow();
  if (options.focus !== false && win) win.focus();
  if (options.meta) dispatchConsoleState({ meta: options.meta });
});

ipcMain.on('console-window-request-close', () => ConsoleWindow.destroyWindow());
ipcMain.on('console-window-close', () => ConsoleWindow.destroyWindow());

ipcMain.on('console-window-log', (_, payload) => dispatchConsoleLog(payload));
ipcMain.on('console-window-status', (_, payload) =>
  dispatchConsoleState(payload)
);

ipcMain.on('console-window-clear', () => {
  consoleLogs = [];
  const win = ConsoleWindow.getWindow();
  if (win) win.webContents.send('console-clear');
});

ipcMain.handle('console-window-initial-state', () => ({
  logs: consoleLogs,
  state: consoleState
}));

ipcMain.handle('Microsoft-window', async (_, client_id) => {
  return await new Microsoft(client_id).getAuth();
});

ipcMain.handle('is-dark-theme', (_, theme) => {
  if (theme === 'dark') return true;
  if (theme === 'light') return false;
  return nativeTheme.shouldUseDarkColors;
});

app.on('window-all-closed', () => app.quit());

autoUpdater.autoDownload = false;

ipcMain.handle('update-app', async () => {
  return await new Promise(async (resolve, reject) => {
    autoUpdater
      .checkForUpdates()
      .then((res) => {
        resolve(res);
      })
      .catch((error) => {
        reject({
          error: true,
          message: error
        });
      });
  });
});

autoUpdater.on('update-available', () => {
  const updateWindow = UpdateWindow.getWindow();
  if (updateWindow) updateWindow.webContents.send('updateAvailable');
});

ipcMain.on('start-update', () => {
  autoUpdater.downloadUpdate();
});

autoUpdater.on('update-not-available', () => {
  const updateWindow = UpdateWindow.getWindow();
  if (updateWindow) updateWindow.webContents.send('update-not-available');
});

autoUpdater.on('update-downloaded', () => {
  autoUpdater.quitAndInstall();
});

autoUpdater.on('download-progress', (progress) => {
  const updateWindow = UpdateWindow.getWindow();
  if (updateWindow)
    updateWindow.webContents.send('download-progress', progress);
});

autoUpdater.on('error', (err) => {
  const updateWindow = UpdateWindow.getWindow();
  if (updateWindow) updateWindow.webContents.send('error', err);
});
