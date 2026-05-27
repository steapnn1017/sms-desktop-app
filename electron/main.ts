import {
    app,
    BrowserWindow,
    Tray,
    Menu,
    nativeImage,
    ipcMain,
    shell,
    Notification,
    protocol,
} from 'electron'
import path from 'path'
import fs from 'fs'
import log from 'electron-log'
import { initDatabase, closeDatabase } from './lib/database'
import { registerSmsHandlers } from './ipc/sms'
import { registerCustomerHandlers } from './ipc/customers'
import { registerTemplateHandlers } from './ipc/templates'
import { registerSettingsHandlers } from './ipc/settings'

log.transports.file.level = 'info'
log.transports.console.level = 'debug'
log.info('App starting...')

// Fix blurry rendering on Windows high-DPI displays
if (process.platform === 'win32') {
    app.commandLine.appendSwitch('high-dpi-support', '1')
    app.commandLine.appendSwitch('force-device-scale-factor', '1')
}

// ─── Custom Protocol ───────────────────────────────────────────────────────────
// Musí být voláno PŘED app.whenReady()
protocol.registerSchemesAsPrivileged([
    {
        scheme: 'app',
        privileges: {
            secure: true,
            standard: true,
            supportFetchAPI: true,
            corsEnabled: true,
        },
    },
])

function getMimeType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase()
    const types: Record<string, string> = {
        '.html': 'text/html; charset=utf-8',
        '.js': 'application/javascript',
        '.mjs': 'application/javascript',
        '.css': 'text/css',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.gif': 'image/gif',
        '.svg': 'image/svg+xml',
        '.ico': 'image/x-icon',
        '.woff': 'font/woff',
        '.woff2': 'font/woff2',
        '.ttf': 'font/ttf',
        '.eot': 'application/vnd.ms-fontobject',
        '.txt': 'text/plain',
        '.xml': 'text/xml',
        '.map': 'application/json',
    }
    return types[ext] || 'application/octet-stream'
}

function handleAppProtocol(request: Request): Response {
    const url = new URL(request.url)
    const pathname = url.pathname
    const outDir = path.resolve(__dirname, '..', 'out')

    let filePath: string

    if (pathname === '/' || pathname === '') {
        filePath = path.join(outDir, 'index.html')
    } else {
        filePath = path.join(outDir, pathname)
        if (!path.extname(pathname)) {
            const indexHtml = path.join(filePath, 'index.html')
            if (fs.existsSync(indexHtml)) {
                filePath = indexHtml
            } else {
                filePath = path.join(outDir, 'index.html')
            }
        }
    }

    try {
        const data = fs.readFileSync(filePath)
        return new Response(data, {
            headers: { 'Content-Type': getMimeType(filePath) },
        })
    } catch {
        log.warn(`app:// protocol: not found: ${filePath}`)
        try {
            const fallback = fs.readFileSync(path.join(outDir, 'index.html'))
            return new Response(fallback, {
                headers: { 'Content-Type': 'text/html; charset=utf-8' },
            })
        } catch {
            return new Response('Not found', { status: 404 })
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────

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
        frame: false,
        transparent: false,
        backgroundColor: '#f5f5f7',
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

    if (isDev) {
        mainWindow.loadURL(DEV_URL)
        mainWindow.webContents.openDevTools({ mode: 'detach' })
    } else {
        mainWindow.loadURL('app://./index.html')
    }

    mainWindow.once('ready-to-show', () => {
        mainWindow?.show()
        mainWindow?.focus()
        log.info('Main window ready and shown')
    })

    mainWindow.on('close', (event) => {
        if (!isQuitting) {
            event.preventDefault()
            mainWindow?.hide()
        }
    })

    mainWindow.on('closed', () => {
        mainWindow = null
    })

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

    ipcMain.handle('notification:show', (_event, { title, body }) => {
        if (Notification.isSupported()) {
            new Notification({ title, body, icon: getIconPath() }).show()
        }
    })

    ipcMain.handle('shell:openExternal', (_event, url: string) => {
        shell.openExternal(url)
    })

    ipcMain.handle('shell:showItemInFolder', (_event, filePath: string) => {
        shell.showItemInFolder(filePath)
    })
}

// ─── App Lifecycle ────────────────────────────────────────────────────────────
app.whenReady().then(async () => {
    log.info('App ready, initializing...')

    try {
        protocol.handle('app', handleAppProtocol)
        log.info('Protocol handler registered')

        await initDatabase()
        log.info('Database initialized')

        registerWindowHandlers()
        registerSmsHandlers()
        registerCustomerHandlers()
        registerTemplateHandlers()
        registerSettingsHandlers()
        log.info('IPC handlers registered')

        createWindow()
        createTray()

        if (!isDev) {
            app.setLoginItemSettings({
                openAtLogin: false,
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
    if (process.platform === 'darwin') {
        // Na macOS nechat běžet
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

process.on('uncaughtException', (error) => {
    log.error('Uncaught exception:', error)
})

process.on('unhandledRejection', (reason) => {
    log.error('Unhandled rejection:', reason)
})