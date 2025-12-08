const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');
const pkg = require('../../../../package.json');

let consoleWindow;
const devTools = process.env.DEV_TOOL === 'open';

function getWindow() {
  return consoleWindow;
}

function destroyWindow() {
  if (!consoleWindow || consoleWindow.isDestroyed()) return;
  consoleWindow.close();
  consoleWindow = undefined;
}

function createWindow() {
  if (consoleWindow && !consoleWindow.isDestroyed()) {
    consoleWindow.focus();
    return consoleWindow;
  }

  consoleWindow = new BrowserWindow({
    title: `${pkg.productName || pkg.name} Console`,
    width: 880,
    height: 560,
    minWidth: 540,
    minHeight: 360,
    show: false,
    frame: false,
    backgroundColor: '#05060a',
    webPreferences: {
      contextIsolation: false,
      nodeIntegration: true
    }
  });

  Menu.setApplicationMenu(null);
  consoleWindow.setMenuBarVisibility(false);
  consoleWindow.loadFile(path.join(`${app.getAppPath()}/src/console.html`));
  consoleWindow.once('ready-to-show', () => {
    if (!consoleWindow || consoleWindow.isDestroyed()) return;
    if (devTools) {
      consoleWindow.webContents.openDevTools({ mode: 'detach' });
    }
    consoleWindow.show();
  });

  consoleWindow.on('closed', () => {
    consoleWindow = undefined;
  });

  return consoleWindow;
}

module.exports = {
  createWindow,
  destroyWindow,
  getWindow
};
