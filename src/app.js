/**
 * @author Luuxis
 * @license CC-BY-NC 4.0 - https://creativecommons.org/licenses/by-nc/4.0
 */

const { app, ipcMain } = require('electron');
const { Microsoft } = require('./assets/js/minecraft-core/Index.js');
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

const normalizeConsoleMessage = (value) => {
  if (value == null) return '';
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
};

const dispatchConsoleLog = (entry = {}) => {
  const rawMessage = entry.message ?? entry.text ?? '';
  const normalized = {
    message: normalizeConsoleMessage(rawMessage),
    level: entry.level ?? entry.type ?? 'info',
    source: entry.source ?? 'launcher',
    timestamp: entry.timestamp ?? Date.now()
  };

  consoleLogs.push(normalized);
  if (consoleLogs.length > CONSOLE_LOG_LIMIT) {
    consoleLogs.splice(0, consoleLogs.length - CONSOLE_LOG_LIMIT);
  }

  ConsoleWindow.getWindow()?.webContents.send('console-log', normalized);
};

const dispatchConsoleState = (patch = {}) => {
  const phase = patch.phase || patch.status || consoleState.phase;
  const label = patch.label || consolePhaseLabels[phase] || consoleState.label;
  const meta = {
    ...(consoleState.meta ?? {}),
    ...(patch.meta ?? {})
  };

  consoleState = {
    ...consoleState,
    ...patch,
    phase,
    label,
    meta
  };

  ConsoleWindow.getWindow()?.webContents.send('console-state', consoleState);
};

const dev = process.env.NODE_ENV === 'dev';

const DATABASE_FILENAME = 'Databases.db';

const ensureDatabaseDir = (source = 'startup') => {
  try {
    const userDataDir = app.getPath('userData');
    const legacyDir = path.join(userDataDir, 'databases');
    const legacyFile = path.join(legacyDir, DATABASE_FILENAME);
    const targetDir = userDataDir;
    const targetFile = path.join(targetDir, DATABASE_FILENAME);

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    if (fs.existsSync(legacyFile) && !fs.existsSync(targetFile)) {
      try {
        fs.copyFileSync(legacyFile, targetFile);
      } catch (migrationError) {
        console.error(
          '[database-path] Failed to migrate legacy database',
          migrationError
        );
      }
    }

    try {
      if (fs.existsSync(legacyDir)) {
        const remaining = fs.readdirSync(legacyDir);
        if (!remaining.length) {
          fs.rmSync(legacyDir, { recursive: true, force: true });
        }
      }
    } catch (cleanupError) {
      console.error(
        '[database-path] Unable to clean legacy directory',
        cleanupError
      );
    }

    return targetDir;
  } catch (error) {
    console.error(`[database-path] Failed via ${source}:`, error);
    throw error;
  }
};

if (dev) {
  const appPath = path.resolve('./data/Launcher').replace(/\\/g, '/');
  const appdata = path.resolve('./data').replace(/\\/g, '/');

  if (!fs.existsSync(appPath)) fs.mkdirSync(appPath, { recursive: true });
  if (!fs.existsSync(appdata)) fs.mkdirSync(appdata, { recursive: true });

  app.setPath('userData', appPath);
  app.setPath('appData', appdata);
}

ensureDatabaseDir('startup');

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.whenReady().then(() => {
    if (dev) {
      return MainWindow.createWindow();
    }
    UpdateWindow.createWindow();
  });
}

ipcMain.on('main-window-open', () => MainWindow.createWindow());
ipcMain.on('main-window-dev-tools', () =>
  MainWindow.getWindow().webContents.openDevTools({ mode: 'detach' })
);
ipcMain.on('main-window-dev-tools-close', () =>
  MainWindow.getWindow().webContents.closeDevTools()
);
ipcMain.on('main-window-close', () => MainWindow.destroyWindow());
ipcMain.on('main-window-reload', () => MainWindow.getWindow().reload());
ipcMain.on('main-window-progress', (_event, options) =>
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
ipcMain.on('update-window-progress', (_event, options) =>
  UpdateWindow.getWindow().setProgressBar(options.progress / options.size)
);
ipcMain.on('update-window-progress-reset', () =>
  UpdateWindow.getWindow().setProgressBar(-1)
);
ipcMain.on('update-window-progress-load', () =>
  UpdateWindow.getWindow().setProgressBar(2)
);

ipcMain.handle('path-user-data', () => app.getPath('userData'));
ipcMain.handle('appData', () => app.getPath('appData'));
ipcMain.handle('database-path', () => ensureDatabaseDir('ipc-invoke'));

ipcMain.on('main-window-maximize', () => {
  const window = MainWindow.getWindow();
  if (!window) return;

  if (window.isMaximized()) {
    window.unmaximize();
  } else {
    window.maximize();
  }
});

ipcMain.on('main-window-hide', () => MainWindow.getWindow()?.hide());
ipcMain.on('main-window-show', () => MainWindow.getWindow()?.show());

ipcMain.on('console-window-open', (_event, options = {}) => {
  const win = ConsoleWindow.createWindow();
  if (options.focus !== false) win?.focus();
  if (options.meta) dispatchConsoleState({ meta: options.meta });
});

ipcMain.on('console-window-request-close', () => ConsoleWindow.destroyWindow());
ipcMain.on('console-window-close', () => ConsoleWindow.destroyWindow());

ipcMain.on('console-window-log', (_event, payload) => {
  dispatchConsoleLog(payload);
});
ipcMain.on('console-window-status', (_event, payload) => {
  dispatchConsoleState(payload);
});

ipcMain.on('console-window-clear', () => {
  consoleLogs = [];
  ConsoleWindow.getWindow()?.webContents.send('console-clear');
});

ipcMain.handle('console-window-initial-state', () => ({
  logs: consoleLogs,
  state: consoleState
}));

ipcMain.handle('Microsoft-window', async (_event, clientId) =>
  new Microsoft(clientId).getAuth()
);

app.on('window-all-closed', () => {
  app.quit();
});

autoUpdater.autoDownload = false;

ipcMain.handle('update-app', async () => {
  try {
    return await autoUpdater.checkForUpdates();
  } catch (error) {
    return {
      error: true,
      message: error
    };
  }
});

autoUpdater.on('update-available', () => {
  UpdateWindow.getWindow()?.webContents.send('updateAvailable');
});

ipcMain.on('start-update', () => {
  autoUpdater.downloadUpdate();
});

autoUpdater.on('update-not-available', () => {
  UpdateWindow.getWindow()?.webContents.send('update-not-available');
});

autoUpdater.on('update-downloaded', () => {
  autoUpdater.quitAndInstall();
});

autoUpdater.on('download-progress', (progress) => {
  UpdateWindow.getWindow()?.webContents.send('download-progress', progress);
});

autoUpdater.on('error', (err) => {
  UpdateWindow.getWindow()?.webContents.send('error', err);
});
