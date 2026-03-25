const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  selectFiles: () => ipcRenderer.invoke('dialog:openFiles'),
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  saveFile: (path, base64Data) => ipcRenderer.invoke('save-file', path, base64Data)
})
