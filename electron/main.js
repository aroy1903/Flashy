const { app, BrowserWindow } = require('electron');
const path = require('path');
const http = require('http');

const isDev = !app.isPackaged;

function startServer() {
  process.env.DB_HOST = 'localhost';
  process.env.DB_PORT = '3306';
  process.env.DB_USER = 'root';
  process.env.DB_PASSWORD = 'patentlaw';
  process.env.DB_NAME = 'flashy';
  process.env.PORT = '5000';
  process.env.NODE_ENV = 'production';
  process.env.UPLOAD_DIR = path.join(app.getPath('userData'), 'uploads');
  require(path.join(app.getAppPath(), 'server', 'index.js'));
}

function waitForServer(retries = 20) {
  return new Promise((resolve, reject) => {
    const check = (n) => {
      http.get('http://localhost:5000/api/health', (res) => {
        if (res.statusCode === 200) resolve();
        else tryAgain(n);
      }).on('error', () => tryAgain(n));
    };
    const tryAgain = (n) => {
      if (n <= 0) return reject(new Error('Server did not start'));
      setTimeout(() => check(n - 1), 500);
    };
    check(retries);
  });
}

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    backgroundColor: '#0a0a0b',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    show: false
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'client', 'dist', 'index.html'));
  }
}

app.whenReady().then(async () => {
  if (!isDev) {
    startServer();
    try {
      await waitForServer();
    } catch (e) {
      console.error('Server failed to start:', e.message);
    }
  }
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
