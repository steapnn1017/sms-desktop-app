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

export function registerSmsHandlers() {
  // Send SMS
  ipcMain.handle('sms:send', async (_event, params) => {
    const { phone, message, templateId, customerId, orderNumber, price } = params
    const db = getDb()

    // Create history record with pending status
    const historyId = generateId()
    try {
      await db.$executeRaw`
        INSERT INTO sms_history (id, phone, message, status, templateId, customerId, orderNumber, price, createdAt, updatedAt)
        VALUES (${historyId}, ${phone}, ${message}, 'pending', ${templateId || null}, ${customerId || null}, ${orderNumber || null}, ${price || null}, ${nowIso()}, ${nowIso()})
      `
    } catch (dbErr) {
      log.error('Failed to create SMS history record:', dbErr)
    }

    // Get gateway settings
    const settings = await getGatewaySettings(db)
    const gateway = getGatewayService({
      apiUrl: settings.apiUrl,
      username: settings.username,
      password: settings.password,
    })

    // Send via gateway
    const result = await gateway.sendSms({
      phoneNumbers: [phone],
      message,
    })

    // Update history record
    try {
      if (result.success) {
        await db.$executeRaw`
          UPDATE sms_history
          SET status = 'sent', gatewayMsgId = ${result.messageId || null}, sentAt = ${nowIso()}, updatedAt = ${nowIso()}
          WHERE id = ${historyId}
        `
      } else {
        await db.$executeRaw`
          UPDATE sms_history
          SET status = 'failed', errorMsg = ${result.error || 'Unknown error'}, updatedAt = ${nowIso()}
          WHERE id = ${historyId}
        `
      }
    } catch (dbErr) {
      log.error('Failed to update SMS history record:', dbErr)
    }

    return { ...result, historyId }
  })

  // Get SMS history
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
        query += ` AND (h.phone LIKE '%' || ? || '%' OR h.message LIKE '%' || ? || '%' OR h.orderNumber LIKE '%' || ? || '%')`
        queryParams.push(search, search, search)
      }

      if (status && status !== 'all') {
        query += ` AND h.status = ?`
        queryParams.push(status)
      }

      query += ` ORDER BY h.createdAt DESC LIMIT ? OFFSET ?`
      queryParams.push(limit, offset)

      const history = await db.$queryRawUnsafe(query, ...queryParams)

      const countQuery = `SELECT COUNT(*) as total FROM sms_history WHERE 1=1${search ? ` AND (phone LIKE '%${search}%' OR message LIKE '%${search}%')` : ''}${status && status !== 'all' ? ` AND status = '${status}'` : ''}`
      const countResult = await db.$queryRawUnsafe(countQuery) as Array<{ total: number }>

      return {
        data: history,
        total: Number(countResult[0]?.total || 0),
      }
    } catch (error) {
      log.error('Get history error:', error)
      return { data: [], total: 0 }
    }
  })

  // Delete SMS history entry
  ipcMain.handle('sms:deleteHistory', async (_event, id: string) => {
    const db = getDb()
    try {
      await db.$executeRaw`DELETE FROM sms_history WHERE id = ${id}`
      return { success: true }
    } catch (error) {
      log.error('Delete history error:', error)
      return { success: false, error: String(error) }
    }
  })

  // Resend SMS
  ipcMain.handle('sms:resend', async (event, id: string) => {
    const db = getDb()
    try {
      const records = await db.$queryRaw`
        SELECT * FROM sms_history WHERE id = ${id}
      ` as Array<{ phone: string; message: string; templateId: string; customerId: string; orderNumber: string; price: string }>

      if (!records || records.length === 0) {
        return { success: false, error: 'Záznam nenalezen' }
      }

      const record = records[0]
      return ipcMain.emit('sms:send', event, {
        phone: record.phone,
        message: record.message,
        templateId: record.templateId,
        customerId: record.customerId,
        orderNumber: record.orderNumber,
        price: record.price,
      })
    } catch (error) {
      log.error('Resend error:', error)
      return { success: false, error: String(error) }
    }
  })

  // Get daily stats
  ipcMain.handle('sms:getDailyStats', async () => {
    const db = getDb()
    try {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const todayIso = today.toISOString()

      const stats = await db.$queryRaw`
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN status = 'sent' OR status = 'delivered' THEN 1 ELSE 0 END) as sent,
          SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending
        FROM sms_history
        WHERE createdAt >= ${todayIso}
      ` as Array<{ total: number; sent: number; failed: number; pending: number }>

      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      const weekAgoIso = weekAgo.toISOString()

      const weekStats = await db.$queryRaw`
        SELECT
          DATE(createdAt) as date,
          COUNT(*) as count
        FROM sms_history
        WHERE createdAt >= ${weekAgoIso}
        GROUP BY DATE(createdAt)
        ORDER BY date ASC
      `

      return {
        today: stats[0] || { total: 0, sent: 0, failed: 0, pending: 0 },
        weekChart: weekStats,
      }
    } catch (error) {
      log.error('Get stats error:', error)
      return { today: { total: 0, sent: 0, failed: 0, pending: 0 }, weekChart: [] }
    }
  })

  // Test gateway connection
  ipcMain.handle('sms:testConnection', async () => {
    const db = getDb()
    const settings = await getGatewaySettings(db)
    const gateway = getGatewayService({
      apiUrl: settings.apiUrl,
      username: settings.username,
      password: settings.password,
    })
    return gateway.testConnection()
  })

  log.info('SMS IPC handlers registered')
}

async function getGatewaySettings(db: ReturnType<typeof getDb>) {
  try {
    const rows = await db.$queryRaw`
      SELECT key, value FROM settings
      WHERE key IN ('gateway_api_url', 'gateway_username', 'gateway_password')
    ` as Array<{ key: string; value: string }>

    const settingsMap: Record<string, string> = {}
    rows.forEach(row => { settingsMap[row.key] = row.value })

    return {
      apiUrl: settingsMap['gateway_api_url'] || 'https://app.sms-gate.app/api/v1',
      username: settingsMap['gateway_username'] || '',
      password: settingsMap['gateway_password'] || '',
    }
  } catch {
    return {
      apiUrl: 'https://app.sms-gate.app/api/v1',
      username: '',
      password: '',
    }
  }
}
