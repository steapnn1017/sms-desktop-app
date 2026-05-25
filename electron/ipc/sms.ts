import { ipcMain } from 'electron'
import { getDb } from '../lib/database'
import { getGatewayService } from '../services/sms-gateway'
import log from 'electron-log'

function generateId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36)
}

function nowIso(): string {
    return new Date().toISOString()
}

function getGatewaySettings() {
    try {
        const db = getDb()
        const rows = db.prepare(`
            SELECT key, value FROM settings
            WHERE key IN ('gateway_api_url', 'gateway_username', 'gateway_password')
        `).all() as Array<{ key: string; value: string }>
        const map: Record<string, string> = {}
        rows.forEach(row => { map[row.key] = row.value })
        return {
            apiUrl: map['gateway_api_url'] || 'https://app.sms-gate.app/api/v1',
            username: map['gateway_username'] || '',
            password: map['gateway_password'] || '',
        }
    } catch {
        return { apiUrl: 'https://app.sms-gate.app/api/v1', username: '', password: '' }
    }
}

export function registerSmsHandlers() {
    ipcMain.handle('sms:send', async (_event, params) => {
        const { phone, message, templateId, customerId, orderNumber, price } = params
        const db = getDb()

        const historyId = generateId()
        try {
            db.prepare(`
                INSERT INTO sms_history (id, phone, message, status, templateId, customerId, orderNumber, price, createdAt, updatedAt)
                VALUES (?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?)
            `).run(historyId, phone, message, templateId || null, customerId || null, orderNumber || null, price || null, nowIso(), nowIso())
        } catch (dbErr) {
            log.error('Failed to create SMS history record:', dbErr)
        }

        const settings = getGatewaySettings()
        const gateway = getGatewayService({
            apiUrl: settings.apiUrl,
            username: settings.username,
            password: settings.password,
        })

        const result = await gateway.sendSms({ phoneNumbers: [phone], message })

        try {
            if (result.success) {
                db.prepare(`
                    UPDATE sms_history SET status = 'sent', gatewayMsgId = ?, sentAt = ?, updatedAt = ? WHERE id = ?
                `).run(result.messageId || null, nowIso(), nowIso(), historyId)
            } else {
                db.prepare(`
                    UPDATE sms_history SET status = 'failed', errorMsg = ?, updatedAt = ? WHERE id = ?
                `).run(result.error || 'Unknown error', nowIso(), historyId)
            }
        } catch (dbErr) {
            log.error('Failed to update SMS history record:', dbErr)
        }

        return { ...result, historyId }
    })

    ipcMain.handle('sms:getHistory', async (_event, params) => {
        const db = getDb()
        const { limit = 50, offset = 0, search, status } = params || {}

        try {
            let query = `
                SELECT h.*, t.name as templateName, c.name as customerName
                FROM sms_history h
                         LEFT JOIN sms_templates t ON h.templateId = t.id
                         LEFT JOIN customers c ON h.customerId = c.id
                WHERE 1=1
            `
            const queryParams: unknown[] = []

            if (search) {
                query += ` AND (h.phone LIKE ? OR h.message LIKE ? OR h.orderNumber LIKE ?)`
                queryParams.push(`%${search}%`, `%${search}%`, `%${search}%`)
            }
            if (status && status !== 'all') {
                query += ` AND h.status = ?`
                queryParams.push(status)
            }
            query += ` ORDER BY h.createdAt DESC LIMIT ? OFFSET ?`
            queryParams.push(limit, offset)

            const history = db.prepare(query).all(...queryParams)

            let countQuery = `SELECT COUNT(*) as total FROM sms_history WHERE 1=1`
            const countParams: unknown[] = []
            if (search) {
                countQuery += ` AND (phone LIKE ? OR message LIKE ?)`
                countParams.push(`%${search}%`, `%${search}%`)
            }
            if (status && status !== 'all') {
                countQuery += ` AND status = ?`
                countParams.push(status)
            }
            const countResult = db.prepare(countQuery).get(...countParams) as { total: number }

            return { data: history, total: Number(countResult?.total || 0) }
        } catch (error) {
            log.error('Get history error:', error)
            return { data: [], total: 0 }
        }
    })

    ipcMain.handle('sms:deleteHistory', async (_event, id: string) => {
        const db = getDb()
        try {
            db.prepare('DELETE FROM sms_history WHERE id = ?').run(id)
            return { success: true }
        } catch (error) {
            log.error('Delete history error:', error)
            return { success: false, error: String(error) }
        }
    })

    ipcMain.handle('sms:resend', async (_event, id: string) => {
        const db = getDb()
        try {
            const record = db.prepare('SELECT * FROM sms_history WHERE id = ?').get(id) as any
            if (!record) return { success: false, error: 'Záznam nenalezen' }

            const settings = getGatewaySettings()
            const gateway = getGatewayService({
                apiUrl: settings.apiUrl,
                username: settings.username,
                password: settings.password,
            })

            const result = await gateway.sendSms({ phoneNumbers: [record.phone], message: record.message })

            if (result.success) {
                db.prepare(`UPDATE sms_history SET status = 'sent', gatewayMsgId = ?, sentAt = ?, updatedAt = ? WHERE id = ?`)
                    .run(result.messageId || null, nowIso(), nowIso(), id)
            } else {
                db.prepare(`UPDATE sms_history SET status = 'failed', errorMsg = ?, updatedAt = ? WHERE id = ?`)
                    .run(result.error || 'Unknown error', nowIso(), id)
            }

            return result
        } catch (error) {
            log.error('Resend error:', error)
            return { success: false, error: String(error) }
        }
    })

    ipcMain.handle('sms:getDailyStats', async () => {
        const db = getDb()
        try {
            const today = new Date()
            today.setHours(0, 0, 0, 0)

            const stats = db.prepare(`
                SELECT
                    COUNT(*) as total,
                    SUM(CASE WHEN status IN ('sent', 'delivered') THEN 1 ELSE 0 END) as sent,
                    SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
                    SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending
                FROM sms_history WHERE createdAt >= ?
            `).get(today.toISOString()) as { total: number; sent: number; failed: number; pending: number }

            const weekAgo = new Date()
            weekAgo.setDate(weekAgo.getDate() - 7)

            const weekStats = db.prepare(`
                SELECT DATE(createdAt) as date, COUNT(*) as count
                FROM sms_history WHERE createdAt >= ?
                GROUP BY DATE(createdAt) ORDER BY date ASC
            `).all(weekAgo.toISOString())

            return {
                today: stats || { total: 0, sent: 0, failed: 0, pending: 0 },
                weekChart: weekStats,
            }
        } catch (error) {
            log.error('Get stats error:', error)
            return { today: { total: 0, sent: 0, failed: 0, pending: 0 }, weekChart: [] }
        }
    })

    ipcMain.handle('sms:testConnection', async () => {
        const settings = getGatewaySettings()
        const gateway = getGatewayService({
            apiUrl: settings.apiUrl,
            username: settings.username,
            password: settings.password,
        })
        return gateway.testConnection()
    })

    log.info('SMS IPC handlers registered')
}