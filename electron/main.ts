import { dirname, join } from 'path'
import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import { fileURLToPath } from 'url'
import fs from 'fs'

// Removed esm specific variables since TS compiles main.ts to commonjs usually, or wait:
// Vite + React + TS uses ES modules if type: module. Let's assume standard electron config.

const isDev = process.env.NODE_ENV === 'development'

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: join(__dirname, 'preload.mjs'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    backgroundColor: '#0e0e0e',
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#0e0e0e',
      symbolColor: '#a9caeb'
    }
  })

  if (isDev) {
    win.loadURL('http://localhost:5173')
    win.webContents.openDevTools()
  } else {
    win.loadFile(join(__dirname, '../dist/index.html'))
  }
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// --- Native Export Handlers ---

ipcMain.handle('select-directory', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ['openDirectory']
  })
  if (canceled) return null
  return filePaths[0]
})

ipcMain.handle('save-file', async (_event, filePath: string, base64Data: string) => {
  try {
    // Remove data:image/jpeg;base64, prefix if present
    const base64Content = base64Data.split(';base64,').pop() || ''
    const buffer = Buffer.from(base64Content, 'base64')
    await fs.promises.writeFile(filePath, buffer)
    return true
  } catch (error) {
    console.error('Failed to save file:', error)
    return false
  }
})
