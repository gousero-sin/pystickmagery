// Wrapper desktop (Electron) do StickMagery Battle.
// Requer: npm i -D electron   →   npm run desktop
const { app, BrowserWindow, globalShortcut } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 760,
    minWidth: 960,
    minHeight: 600,
    autoHideMenuBar: true,
    backgroundColor: '#0e0a06',
    title: 'StickMagery Battle',
    webPreferences: { contextIsolation: true },
  });
  win.loadFile(path.join(__dirname, '..', 'game.html'));

  globalShortcut.register('F11', () => {
    win.setFullScreen(!win.isFullScreen());
  });
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());
