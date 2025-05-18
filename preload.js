// preload.js - Updated with sound-related functionality
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Window controls
  minimizeWindow: () => ipcRenderer.send('minimize-window'),
  closeWindow: () => ipcRenderer.send('close-window'),
  
  // Notifications
  showNotification: (options) => ipcRenderer.invoke('show-notification', options),
  
  // Audio file check
  checkAudioFile: (filepath) => ipcRenderer.invoke('check-audio-file', filepath),
  
  // Sound settings persistence
  saveSoundSettings: (settings) => ipcRenderer.invoke('save-sound-settings', settings),
  getSoundSettings: () => ipcRenderer.invoke('get-sound-settings')
});