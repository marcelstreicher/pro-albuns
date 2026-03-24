import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  // Define IPC channels here later
  ping: () => ipcRenderer.invoke('ping')
})
