const { app, BrowserWindow } = require('electron');
const path = require('path');

async function createWindow() {
  try {
    const { initDatabase } = require('./database.js');
    await initDatabase();
  } catch(e) {
    console.error('Database initialization error:', e);
  }

  const mainWindow = new BrowserWindow({
    width: 1240,
    height: 840,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#020617',
    title: "AI'dan Al Dersi",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // Check if running in development mode
  const isDev = process.env.NODE_ENV === 'development' && !app.isPackaged;
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(app.getAppPath(), 'dist', 'index.html'));
  }

  try {
    const { registerIpcHandlers } = require('./ipc-handlers.js');
    registerIpcHandlers(mainWindow);
  } catch(e) {
    console.error('IPC handlers error:', e);
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
