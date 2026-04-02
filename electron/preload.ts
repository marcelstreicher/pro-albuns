import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  ping: () => ipcRenderer.invoke('ping'),
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  saveFile: (path: string, base64Data: string) => ipcRenderer.invoke('save-file', path, base64Data),
  downloadMedia: (url: string, destPath: string) => ipcRenderer.invoke('download-media', url, destPath)
})
