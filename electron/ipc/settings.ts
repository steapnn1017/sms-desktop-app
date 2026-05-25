import { ipcMain, app } from 'electron'
import { getDb } from '../lib/database'
import { getGatewayService, resetGatewayService } from '../services/sms-gateway'
import log from 'electron-log'
import path from 'path'

function nowIso(): string {
    return new Date().toISOString()
}

function generateId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36)
}

function upsertSetting(key: string, value: string) {
    const db = getDb()
    const now = nowIso()
    const existing = db.prepare('SELECT id FROM settings WHERE key = ?').get(key)
    if (existing) {
        db.prepare('UPDATE settings SET value = ?, updatedAt = ? WHERE key = ?').run(value, now, key)
    } else {
        db.prepare('INSERT INTO settings (id, key, value, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)')
            .run(generateId(), key, value, now, now)
    }
}

export function registerSettingsHandlers() {
    ipcMain.handle('settings:getAll', async () => {
        const db = getDb()
        try {
            const rows = db.prepare('SELECT key, value FROM settings').all() as Array<{ key: string; value: string }>
            const settings: Record<string, string> = {}
            rows.forEach(row => { settings[row.key] = row.value })
            if (settings.gateway_password) {
                settings.gateway_password_masked = '••••••••'
            }
            return { success: true, data: settings }
        } catch (error) {
            log.error('Get settings error:', error)
            return { success: false, data: {}, error: String(error) }
        }
    })

    ipcMain.handle('settings:get', async (_event, key: string) => {
        const db = getDb()
        try {
            const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined
            return { success: true, value: row?.value || null }
        } catch (error) {
            return { success: false, value: null }
        }
    })

    ipcMain.handle('settings:set', async (_event, { key, value }: { key: string; value: string }) => {
        try {
            upsertSetting(key, value)
            if (['gateway_api_url', 'gateway_username', 'gateway_password'].includes(key)) {
                resetGatewayService()
            }
            return { success: true }
        } catch (error) {
            log.error('Set setting error:', error)
            return { success: false, error: String(error) }
        }
    })

    ipcMain.handle('settings:saveGateway', async (_event, data) => {
        const { apiUrl, username, password } = data
        try {
            upsertSetting('gateway_api_url', apiUrl || 'https://app.sms-gate.app/api/v1')
            upsertSetting('gateway_username', username || '')
            if (password && password !== '••••••••') {
                upsertSetting('gateway_password', password)
            }
            resetGatewayService()
            log.info('Gateway settings saved')
            return { success: true }
        } catch (error) {
            log.error('Save gateway settings error:', error)
            return { success: false, error: String(error) }
        }
    })

    ipcMain.handle('settings:getAppInfo', async () => {
        return {
            version: app.getVersion(),
            name: app.getName(),
            userDataPath: app.getPath('userData'),
            dbPath: path.join(app.getPath('userData'), 'sms-manager.db'),
            platform: process.platform,
            nodeVersion: process.version,
            electronVersion: process.versions.electron,
        }
    })

    ipcMain.handle('settings:testGateway', async (_event, data) => {
        const { apiUrl, username, password } = data
        const gateway = getGatewayService({
            apiUrl: apiUrl || 'https://app.sms-gate.app/api/v1',
            username: username || '',
            password: password || '',
        })
        return gateway.testConnection()
    })

    ipcMain.handle('settings:clearHistory', async () => {
        const db = getDb()
        try {
            db.prepare('DELETE FROM sms_history').run()
            return { success: true }
        } catch (error) {
            return { success: false, error: String(error) }
        }
    })

    log.info('Settings IPC handlers registered')
}