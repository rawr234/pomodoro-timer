// main.js - Updated with audio file check functionality
const { app, BrowserWindow, ipcMain, Menu, Tray, nativeImage, Notification } = require('electron');
const path = require('path');
const url = require('url');
const fs = require('fs').promises; // Add this for file system access

// Keep a global reference of the window object
let mainWindow;
let tray = null;
let isQuitting = false;

function createWindow() {
  // Create the browser window with native window frame
  mainWindow = new BrowserWindow({
    width: 360,
    height: 720, // Increased height to accommodate all content
    resizable: false,
    frame: false, // Frameless window for custom titlebar
    transparent: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    icon: path.join(__dirname, 'assets/icon.png')
  });

  // Load the index.html file
  mainWindow.loadFile('index.html');
  
  // Hide the default menu
  mainWindow.setMenu(null);
  
  // Handle window close event
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
      return false;
    }
  });
  
  createTray();
}

function createTray() {
  const icon = nativeImage.createFromPath(path.join(__dirname, 'assets/tray-icon.png'));
  tray = new Tray(icon);
  
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Open FocusFlow', click: () => mainWindow.show() },
    { type: 'separator' },
    { label: 'Quit', click: () => {
      isQuitting = true;
      app.quit();
    }}
  ]);
  
  tray.setToolTip('FocusFlow');
  tray.setContextMenu(contextMenu);
  
  tray.on('click', () => {
    mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
  });
}

// IPC handlers for window controls
ipcMain.on('minimize-window', () => {
  mainWindow.minimize();
});

ipcMain.on('close-window', () => {
  mainWindow.hide();
});

// Fixed IPC handler for notifications
ipcMain.handle('show-notification', (event, { title, body }) => {
  // Create a new Electron Notification
  new Notification({
    title: title,
    body: body,
    icon: path.join(__dirname, 'assets/icon.png')
  }).show();
  
  return true;
});

// Audio file check handler
ipcMain.handle('check-audio-file', async (event, filepath) => {
  try {
    await fs.access(path.join(__dirname, filepath));
    return true;
  } catch (error) {
    console.error(`Audio file not found: ${filepath}`, error);
    return false;
  }
});

// Sound settings persistence
const soundSettingsPath = path.join(app.getPath('userData'), 'soundSettings.json');

// Save sound settings
ipcMain.handle('save-sound-settings', async (event, settings) => {
  try {
    await fs.writeFile(soundSettingsPath, JSON.stringify(settings), 'utf8');
    return true;
  } catch (error) {
    console.error('Failed to save sound settings:', error);
    return false;
  }
});

// Get sound settings
ipcMain.handle('get-sound-settings', async () => {
  try {
    const data = await fs.readFile(soundSettingsPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    // If file doesn't exist, return default settings
    return { enabled: true, volume: 0.7 };
  }
});

// This method will be called when Electron has finished initialization
app.whenReady().then(() => {
  createWindow();
  
  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

// Properly quit the app when the quit action is triggered
app.on('before-quit', () => {
  isQuitting = true;
});