import { ipcMain } from 'electron'
import { getDb } from '../lib/database'
import log from 'electron-log'

function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36)
}

function nowIso(): string {
  return new Date().toISOString()
}

export function registerCustomerHandlers() {
  // Get all customers
  ipcMain.handle('customers:getAll', async (_event, params) => {
    const db = getDb()
    const { search, limit = 100, offset = 0 } = params || {}

    try {
      let query = `SELECT * FROM customers WHERE 1=1`
      const queryParams: unknown[] = []

      if (search) {
        query += ` AND (name LIKE '%' || ? || '%' OR phone LIKE '%' || ? || '%')`
        queryParams.push(search, search)
      }

      query += ` ORDER BY name ASC LIMIT ? OFFSET ?`
      queryParams.push(limit, offset)

      const customers = await db.$queryRawUnsafe(query, ...queryParams)

      const countQuery = `SELECT COUNT(*) as total FROM customers${search ? ` WHERE name LIKE '%${search}%' OR phone LIKE '%${search}%'` : ''}`
      const countResult = await db.$queryRawUnsafe(countQuery) as Array<{ total: number }>

      return { data: customers, total: Number(countResult[0]?.total || 0) }
    } catch (error) {
      log.error('Get customers error:', error)
      return { data: [], total: 0 }
    }
  })

  // Get customer by ID
  ipcMain.handle('customers:getById', async (_event, id: string) => {
    const db = getDb()
    try {
      const customer = await db.$queryRaw`SELECT * FROM customers WHERE id = ${id}` as unknown[]
      const history = await db.$queryRaw`
        SELECT * FROM sms_history WHERE customerId = ${id} ORDER BY createdAt DESC LIMIT 20
      `
      return { customer: (customer as unknown[])[0] || null, history }
    } catch (error) {
      log.error('Get customer error:', error)
      return { customer: null, history: [] }
    }
  })

  // Create customer
  ipcMain.handle('customers:create', async (_event, data) => {
    const db = getDb()
    const { name, phone, note } = data
    const id = generateId()
    const now = nowIso()

    try {
      // Check for duplicate phone
      const existing = await db.$queryRaw`SELECT id FROM customers WHERE phone = ${phone}` as unknown[]
      if (existing && (existing as unknown[]).length > 0) {
        return { success: false, error: 'Zákazník s tímto telefonním číslem již existuje' }
      }

      await db.$executeRaw`
        INSERT INTO customers (id, name, phone, note, createdAt, updatedAt)
        VALUES (${id}, ${name}, ${phone}, ${note || null}, ${now}, ${now})
      `
      const created = await db.$queryRaw`SELECT * FROM customers WHERE id = ${id}` as unknown[]
      return { success: true, data: (created as unknown[])[0] }
    } catch (error) {
      log.error('Create customer error:', error)
      return { success: false, error: String(error) }
    }
  })

  // Update customer
  ipcMain.handle('customers:update', async (_event, { id, ...data }) => {
    const db = getDb()
    const { name, phone, note } = data
    const now = nowIso()

    try {
      await db.$executeRaw`
        UPDATE customers
        SET name = ${name}, phone = ${phone}, note = ${note || null}, updatedAt = ${now}
        WHERE id = ${id}
      `
      const updated = await db.$queryRaw`SELECT * FROM customers WHERE id = ${id}` as unknown[]
      return { success: true, data: (updated as unknown[])[0] }
    } catch (error) {
      log.error('Update customer error:', error)
      return { success: false, error: String(error) }
    }
  })

  // Delete customer
  ipcMain.handle('customers:delete', async (_event, id: string) => {
    const db = getDb()
    try {
      await db.$executeRaw`DELETE FROM customers WHERE id = ${id}`
      return { success: true }
    } catch (error) {
      log.error('Delete customer error:', error)
      return { success: false, error: String(error) }
    }
  })

  log.info('Customer IPC handlers registered')
}
