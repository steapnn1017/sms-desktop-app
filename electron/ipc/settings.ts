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

export function registerSettingsHandlers() {
  // Get all settings
  ipcMain.handle('settings:getAll', async () => {
    const db = getDb()
    try {
      const rows = await db.$queryRaw`SELECT key, value FROM settings` as Array<{ key: string; value: string }>
      const settings: Record<string, string> = {}
      rows.forEach(row => { settings[row.key] = row.value })

      // Mask password
      if (settings.gateway_password) {
        settings.gateway_password_masked = '••••••••'
      }

      return { success: true, data: settings }
    } catch (error) {
      log.error('Get settings error:', error)
      return { success: false, data: {}, error: String(error) }
    }
  })

  // Get single setting
  ipcMain.handle('settings:get', async (_event, key: string) => {
    const db = getDb()
    try {
      const rows = await db.$queryRaw`SELECT value FROM settings WHERE key = ${key}` as Array<{ value: string }>
      return { success: true, value: rows[0]?.value || null }
    } catch (error) {
      return { success: false, value: null }
    }
  })

  // Set single setting
  ipcMain.handle('settings:set', async (_event, { key, value }: { key: string; value: string }) => {
    const db = getDb()
    const now = nowIso()

    try {
      const existing = await db.$queryRaw`SELECT id FROM settings WHERE key = ${key}` as Array<{ id: string }>

      if (existing && existing.length > 0) {
        await db.$executeRaw`UPDATE settings SET value = ${value}, updatedAt = ${now} WHERE key = ${key}`
      } else {
        const id = generateId()
        await db.$executeRaw`
          INSERT INTO settings (id, key, value, createdAt, updatedAt)
          VALUES (${id}, ${key}, ${value}, ${now}, ${now})
        `
      }

      // If gateway settings changed, reset the service
      if (['gateway_api_url', 'gateway_username', 'gateway_password'].includes(key)) {
        resetGatewayService()
      }

      return { success: true }
    } catch (error) {
      log.error('Set setting error:', error)
      return { success: false, error: String(error) }
    }
  })

  // Save gateway settings (batch)
  ipcMain.handle('settings:saveGateway', async (_event, data) => {
    const db = getDb()
    const { apiUrl, username, password } = data
    const now = nowIso()

    try {
      const settingsToSave = [
        { key: 'gateway_api_url', value: apiUrl || 'https://app.sms-gate.app/api/v1' },
        { key: 'gateway_username', value: username || '' },
      ]

      // Only update password if it was changed (not masked)
      if (password && password !== '••••••••') {
        settingsToSave.push({ key: 'gateway_password', value: password })
      }

      for (const { key, value } of settingsToSave) {
        const existing = await db.$queryRaw`SELECT id FROM settings WHERE key = ${key}` as Array<{ id: string }>
        if (existing && existing.length > 0) {
          await db.$executeRaw`UPDATE settings SET value = ${value}, updatedAt = ${now} WHERE key = ${key}`
        } else {
          const id = generateId()
          await db.$executeRaw`
            INSERT INTO settings (id, key, value, createdAt, updatedAt)
            VALUES (${id}, ${key}, ${value}, ${now}, ${now})
          `
        }
      }

      resetGatewayService()
      log.info('Gateway settings saved')
      return { success: true }
    } catch (error) {
      log.error('Save gateway settings error:', error)
      return { success: false, error: String(error) }
    }
  })

  // Get app info
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

  // Test gateway connection
  ipcMain.handle('settings:testGateway', async (_event, data) => {
    const { apiUrl, username, password } = data
    const gateway = getGatewayService({
      apiUrl: apiUrl || 'https://app.sms-gate.app/api/v1',
      username: username || '',
      password: password || '',
    })
    return gateway.testConnection()
  })

  // Clear all history
  ipcMain.handle('settings:clearHistory', async () => {
    const db = getDb()
    try {
      await db.$executeRaw`DELETE FROM sms_history`
      return { success: true }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })

  log.info('Settings IPC handlers registered')
}
