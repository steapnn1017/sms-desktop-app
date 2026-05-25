import {
  app,
  BrowserWindow,
  Tray,
  Menu,
  nativeImage,
  ipcMain,
  shell,
  Notification,
} from 'electron'
import path from 'path'
import log from 'electron-log'
import { initDatabase, closeDatabase } from './lib/database'
import { registerSmsHandlers } from './ipc/sms'
import { registerCustomerHandlers } from './ipc/customers'
import { registerTemplateHandlers } from './ipc/templates'
import { registerSettingsHandlers } from './ipc/settings'

// Configure logging
log.transports.file.level = 'info'
log.transports.console.level = 'debug'
log.info('App starting...')

const isDev = process.env.NODE_ENV === 'development'
const DEV_URL = 'http://localhost:3000'

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let isQuitting = false

// ─── Single Instance Lock ──────────────────────────────────────────────────────
const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.show()
      mainWindow.focus()
    }
  })
}

// ─── Window Creation ──────────────────────────────────────────────────────────
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 640,
    frame: false,           // Custom titlebar
    transparent: false,
    backgroundColor: '#0b0b0b',
    titleBarStyle: 'hidden',
    trafficLightPosition: { x: 12, y: 14 },
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    icon: getIconPath(),
    show: false,
  })

  // Load app
  if (isDev) {
    mainWindow.loadURL(DEV_URL)
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    const indexPath = path.join(__dirname, '..', 'out', 'index.html')
    mainWindow.loadFile(indexPath)
  }

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
    mainWindow?.focus()
    log.info('Main window ready and shown')
  })

  // Minimize to tray instead of close
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault()
      mainWindow?.hide()
      showTrayNotification()
    }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  return mainWindow
}

// ─── Tray ─────────────────────────────────────────────────────────────────────
function createTray() {
  const iconPath = getIconPath()
  const icon = nativeImage.createFromPath(iconPath)
  const trayIcon = icon.resize({ width: 16, height: 16 })

  tray = new Tray(trayIcon)
  tray.setToolTip('SMS Manager')

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Otevřít SMS Manager',
      click: () => {
        mainWindow?.show()
        mainWindow?.focus()
      },
    },
    {
      label: 'Odeslat SMS',
      click: () => {
        mainWindow?.show()
        mainWindow?.focus()
        mainWindow?.webContents.send('navigate', '/send')
      },
    },
    { type: 'separator' },
    {
      label: 'Ukončit',
      click: () => {
        isQuitting = true
        app.quit()
      },
    },
  ])

  tray.setContextMenu(contextMenu)

  tray.on('click', () => {
    if (mainWindow?.isVisible()) {
      mainWindow.hide()
    } else {
      mainWindow?.show()
      mainWindow?.focus()
    }
  })

  tray.on('double-click', () => {
    mainWindow?.show()
    mainWindow?.focus()
  })
}

function showTrayNotification() {
  if (Notification.isSupported() && tray) {
    // Only show once, not every time
  }
}

function getIconPath(): string {
  const resourcesPath = app.isPackaged
    ? path.join(process.resourcesPath, 'resources')
    : path.join(__dirname, '..', 'resources')

  if (process.platform === 'win32') {
    return path.join(resourcesPath, 'icon.ico')
  } else if (process.platform === 'darwin') {
    return path.join(resourcesPath, 'icon.icns')
  }
  return path.join(resourcesPath, 'icon.png')
}

// ─── Window control IPC ───────────────────────────────────────────────────────
function registerWindowHandlers() {
  ipcMain.on('window:minimize', () => mainWindow?.minimize())
  ipcMain.on('window:maximize', () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize()
    } else {
      mainWindow?.maximize()
    }
  })
  ipcMain.on('window:close', () => {
    if (!isQuitting) {
      mainWindow?.hide()
    } else {
      mainWindow?.close()
    }
  })
  ipcMain.on('window:quit', () => {
    isQuitting = true
    app.quit()
  })

  ipcMain.handle('window:isMaximized', () => mainWindow?.isMaximized() ?? false)

  // Desktop notifications
  ipcMain.handle('notification:show', (_event, { title, body }) => {
    if (Notification.isSupported()) {
      new Notification({ title, body, icon: getIconPath() }).show()
    }
  })

  // Open external URL
  ipcMain.handle('shell:openExternal', (_event, url: string) => {
    shell.openExternal(url)
  })

  // Open file/folder in explorer
  ipcMain.handle('shell:showItemInFolder', (_event, filePath: string) => {
    shell.showItemInFolder(filePath)
  })
}

// ─── App Lifecycle ────────────────────────────────────────────────────────────
app.whenReady().then(async () => {
  log.info('App ready, initializing...')

  try {
    // Initialize database
    await initDatabase()
    log.info('Database initialized')

    // Register all IPC handlers
    registerWindowHandlers()
    registerSmsHandlers()
    registerCustomerHandlers()
    registerTemplateHandlers()
    registerSettingsHandlers()
    log.info('IPC handlers registered')

    // Create main window
    createWindow()

    // Create system tray
    createTray()

    // Auto-launch setup (Windows)
    if (!isDev) {
      app.setLoginItemSettings({
        openAtLogin: false, // Default off, user can enable in settings
        name: 'SMS Manager',
        path: process.execPath,
      })
    }

    log.info('App ready')
  } catch (error) {
    log.error('App initialization error:', error)
  }
})

app.on('window-all-closed', () => {
  // Keep app running in tray on Windows/Linux
  if (process.platform === 'darwin') {
    // On macOS, standard behavior is to keep app running
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  } else {
    mainWindow?.show()
  }
})

app.on('before-quit', async () => {
  isQuitting = true
  await closeDatabase()
  log.info('App closing, database disconnected')
})

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  log.error('Uncaught exception:', error)
})

process.on('unhandledRejection', (reason) => {
  log.error('Unhandled rejection:', reason)
})
