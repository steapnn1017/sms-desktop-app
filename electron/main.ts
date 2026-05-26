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

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 800,
        minWidth: 960,
        minHeight: 640,
        frame: false,
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