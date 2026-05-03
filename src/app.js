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

const pkg = require('../package.json');

app.on('ready', () => {
  UpdateWindow.createWindow();
});

ipcMain.on('update-window-close', () => {
  UpdateWindow.destroyWindow();
});

ipcMain.on('update-window-dev-tools', () => {
  const win = UpdateWindow.getWindow();
  if (win) win.webContents.openDevTools({ mode: 'detach' });
});

ipcMain.on('update-window-progress-load', () => {
  const win = UpdateWindow.getWindow();
  if (win) win.setProgressBar(2);
});

ipcMain.on('update-window-progress', (event, arg) => {
  const win = UpdateWindow.getWindow();
  if (win) win.setProgressBar(arg.progress / arg.size);
});

ipcMain.handle('update-app', async () => {
  return new Promise((resolve, reject) => {
    if (app.isPackaged) {
      autoUpdater.checkForUpdates();

      autoUpdater.on('update-available', () => {
        const win = UpdateWindow.getWindow();
        if (win) win.webContents.send('updateAvailable');
      });

      autoUpdater.on('update-not-available', () => {
        const win = UpdateWindow.getWindow();
        if (win) win.webContents.send('update-not-available');
      });

      autoUpdater.on('error', (err) => {
        const win = UpdateWindow.getWindow();
        if (win) win.webContents.send('error', err);
      });

      autoUpdater.on('download-progress', (progressObj) => {
        const win = UpdateWindow.getWindow();
        if (win) win.webContents.send('download-progress', progressObj);
      });

      autoUpdater.on('update-downloaded', () => {
        autoUpdater.quitAndInstall();
      });
    } else {
      const win = UpdateWindow.getWindow();
      if (win) resolve(win.webContents.send('update-not-available'));
      else resolve();
    }
  });
});

ipcMain.on('main-window-open', () => {
  MainWindow.createWindow();
});

ipcMain.on('main-window-dev-tools', () => {
  const win = MainWindow.getWindow();
  if (win) win.webContents.openDevTools({ mode: 'detach' });
});

ipcMain.on('main-window-dev-tools-close', () => {
  const win = MainWindow.getWindow();
  if (win) win.webContents.closeDevTools();
});

ipcMain.on('main-window-close', () => {
  MainWindow.destroyWindow();
});

ipcMain.on('main-window-reload', () => {
  const win = MainWindow.getWindow();
  if (win) win.reload();
});

ipcMain.on('main-window-progress', (event, arg) => {
  const win = MainWindow.getWindow();
  if (win) win.setProgressBar(arg.progress / arg.size);
});

ipcMain.on('main-window-progress-reset', () => {
  const win = MainWindow.getWindow();
  if (win) win.setProgressBar(-1);
});

ipcMain.on('main-window-progress-load', () => {
  const win = MainWindow.getWindow();
  if (win) win.setProgressBar(2);
});

ipcMain.on('main-window-maximize', () => {
  const win = MainWindow.getWindow();
  if (win) {
    if (win.isMaximized()) {
      win.unmaximize();
    } else {
      win.maximize();
    }
  }
});

ipcMain.on('main-window-minimize', () => {
  const win = MainWindow.getWindow();
  if (win) win.minimize();
});

ipcMain.handle('appData', async () => {
  return app.getPath('userData');
});

ipcMain.handle('microsoft-auth', async (event, arg) => {
  return await new Microsoft().getAuth();
});

ipcMain.handle('Microsoft-window', async (event, client_id) => {
  return await new Microsoft(client_id).getAuth();
});

ipcMain.on('console-window-open', () => {
  ConsoleWindow.createWindow();
});

ipcMain.on('console-window-close', () => {
  ConsoleWindow.destroyWindow();
});

ipcMain.on('console-window-dev-tools', () => {
  const win = ConsoleWindow.getWindow();
  if (win) win.webContents.openDevTools({ mode: 'detach' });
});

ipcMain.handle('database-path', async (event, arg) => {
  return path.join(app.getPath('userData'), 'database');
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

const migrateLegacyDatabase = async () => {
  const userDataPath = app.getPath('userData');
  const legacyDbPath = path.join(userDataPath, 'database.sqlite');
  const newDbDir = path.join(userDataPath, 'database');

  if (fs.existsSync(legacyDbPath)) {
    console.log('[Migration] Legacy SQLite database found. Ready for migration.');
    if (!fs.existsSync(newDbDir)) {
      fs.mkdirSync(newDbDir, { recursive: true });
    }
  }
};

migrateLegacyDatabase().catch(err => console.error('[Migration Error]', err));
