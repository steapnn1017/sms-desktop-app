import { ipcMain, app } from 'electron'
import { getDb } from '../lib/database'
import { getGatewayService, resetGatewayService, SmsGatewayService } from '../services/sms-gateway'
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

function getSetting(key: string): string | null {
    const db = getDb()
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined
    return row?.value || null
}

function migrateOldGatewaySettings() {
    const db = getDb()
    const oldUrl = getSetting('gateway_api_url')
    const oldUser = getSetting('gateway_username')
    const oldPass = getSetting('gateway_password')
    const already = getSetting('gateway_1_username')

    if ((oldUrl || oldUser || oldPass) && !already) {
        log.info('Migrating old gateway settings to gateway_1_*')
        if (oldUrl) upsertSetting('gateway_1_api_url', oldUrl)
        if (oldUser) upsertSetting('gateway_1_username', oldUser)
        if (oldPass) upsertSetting('gateway_1_password', oldPass)
        db.prepare("DELETE FROM settings WHERE key IN ('gateway_api_url','gateway_username','gateway_password')").run()
    }
}

export function registerSettingsHandlers() {
    migrateOldGatewaySettings()

    ipcMain.handle('settings:getAll', async () => {
        const db = getDb()
        try {
            const rows = db.prepare('SELECT key, value FROM settings').all() as Array<{ key: string; value: string }>
            const settings: Record<string, string> = {}
            rows.forEach(row => { settings[row.key] = row.value })
            if (settings.gateway_1_password) settings.gateway_1_password_masked = '••••••••'
            if (settings.gateway_2_password) settings.gateway_2_password_masked = '••••••••'
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
            if (key.startsWith('gateway_')) resetGatewayService()
            return { success: true }
        } catch (error) {
            log.error('Set setting error:', error)
            return { success: false, error: String(error) }
        }
    })

    ipcMain.handle('settings:saveGateway1', async (_event, data) => {
        const { name, apiUrl, username, password } = data
        try {
            upsertSetting('gateway_1_name', name || 'Zaměstnanec 1')
            upsertSetting('gateway_1_api_url', apiUrl || 'https://api.sms-gate.app/3rdparty/v1')
            upsertSetting('gateway_1_username', username || '')
            if (password && password !== '••••••••') {
                upsertSetting('gateway_1_password', password)
            }
            resetGatewayService()
            log.info('Gateway 1 settings saved')
            return { success: true }
        } catch (error) {
            log.error('Save gateway 1 settings error:', error)
            return { success: false, error: String(error) }
        }
    })

    ipcMain.handle('settings:saveGateway2', async (_event, data) => {
        const { name, apiUrl, username, password } = data
        try {
            upsertSetting('gateway_2_name', name || 'Zaměstnanec 2')
            upsertSetting('gateway_2_api_url', apiUrl || 'https://api.sms-gate.app/3rdparty/v1')
            upsertSetting('gateway_2_username', username || '')
            if (password && password !== '••••••••') {
                upsertSetting('gateway_2_password', password)
            }
            resetGatewayService()
            log.info('Gateway 2 settings saved')
            return { success: true }
        } catch (error) {
            log.error('Save gateway 2 settings error:', error)
            return { success: false, error: String(error) }
        }
    })

    ipcMain.handle('settings:saveGateway', async (_event, data) => {
        const { apiUrl, username, password } = data
        try {
            upsertSetting('gateway_1_api_url', apiUrl || 'https://api.sms-gate.app/3rdparty/v1')
            upsertSetting('gateway_1_username', username || '')
            if (password && password !== '••••••••') {
                upsertSetting('gateway_1_password', password)
            }
            resetGatewayService()
            return { success: true }
        } catch (error) {
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
        const gateway = new SmsGatewayService({
            apiUrl: apiUrl || 'https://api.sms-gate.app/3rdparty/v1',
            username: username || '',
            password: password || '',
        })
        return gateway.testConnection()
    })

    ipcMain.handle('settings:testBothGateways', async () => {
        const cfg1 = {
            name: getSetting('gateway_1_name') || 'Zaměstnanec 1',
            apiUrl: getSetting('gateway_1_api_url') || 'https://api.sms-gate.app/3rdparty/v1',
            username: getSetting('gateway_1_username') || '',
            password: getSetting('gateway_1_password') || '',
        }
        const cfg2 = {
            name: getSetting('gateway_2_name') || 'Zaměstnanec 2',
            apiUrl: getSetting('gateway_2_api_url') || 'https://api.sms-gate.app/3rdparty/v1',
            username: getSetting('gateway_2_username') || '',
            password: getSetting('gateway_2_password') || '',
        }

        const svc1 = new SmsGatewayService(cfg1)
        const svc2 = new SmsGatewayService(cfg2)

        const [status1, status2] = await Promise.all([
            cfg1.username ? svc1.testConnection() : Promise.resolve({ connected: false, error: 'Nenakonfigurováno' }),
            cfg2.username ? svc2.testConnection() : Promise.resolve({ connected: false, error: 'Nenakonfigurováno' }),
        ])

        return {
            gateway1: { ...status1, name: cfg1.name },
            gateway2: { ...status2, name: cfg2.name },
        }
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