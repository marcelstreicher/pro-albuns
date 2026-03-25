const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const path = require('path')
const fs = require('fs')

const isDev = process.env.NODE_ENV === 'development'

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false // Disable web security ONLY for reading local file paths. Better practice is setting up a custom protocol.
    },
    backgroundColor: '#0e0e0e',
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#0e0e0e',
      symbolColor: '#a9caeb'
    }
  })

  // Set Content Security Policy for Vite
  win.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': ["default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: file: http://localhost:5173 ws://localhost:5173 https://*"]
      }
    })
  })

  ipcMain.handle('dialog:openFiles', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog(win, {
      title: 'Select Images',
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp', 'gif'] }
      ]
    })
    if (canceled) {
      return null
    } else {
      return filePaths.map(p => `file:///${p.replace(/\\/g, '/')}`)
    }
  })

  if (isDev) {
    win.loadURL('http://localhost:5173')
    win.webContents.openDevTools()
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

// --- Native Export Handlers ---

ipcMain.handle('select-directory', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ['openDirectory']
  })
  if (canceled) return null
  return filePaths[0]
})

ipcMain.handle('save-file', async (_event, filePath, base64Data) => {
  try {
    const base64Content = base64Data.split(';base64,').pop() || ''
    const buffer = Buffer.from(base64Content, 'base64')
    await fs.promises.writeFile(filePath, buffer)
    return true
  } catch (error) {
    console.error('Failed to save file:', error)
    return false
  }
})

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
