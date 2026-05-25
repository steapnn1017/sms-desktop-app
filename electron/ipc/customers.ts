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
    ipcMain.handle('customers:getAll', async (_event, params) => {
        const db = getDb()
        const { search, limit = 100, offset = 0 } = params || {}

        try {
            let query = `SELECT * FROM customers WHERE 1=1`
            const queryParams: unknown[] = []

            if (search) {
                query += ` AND (name LIKE ? OR phone LIKE ?)`
                queryParams.push(`%${search}%`, `%${search}%`)
            }
            query += ` ORDER BY name ASC LIMIT ? OFFSET ?`
            queryParams.push(limit, offset)

            const customers = db.prepare(query).all(...queryParams)

            let countQuery = `SELECT COUNT(*) as total FROM customers`
            const countParams: unknown[] = []
            if (search) {
                countQuery += ` WHERE name LIKE ? OR phone LIKE ?`
                countParams.push(`%${search}%`, `%${search}%`)
            }
            const countResult = db.prepare(countQuery).get(...countParams) as { total: number }

            return { data: customers, total: Number(countResult?.total || 0) }
        } catch (error) {
            log.error('Get customers error:', error)
            return { data: [], total: 0 }
        }
    })

    ipcMain.handle('customers:getById', async (_event, id: string) => {
        const db = getDb()
        try {
            const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(id)
            const history = db.prepare('SELECT * FROM sms_history WHERE customerId = ? ORDER BY createdAt DESC LIMIT 20').all(id)
            return { customer: customer || null, history }
        } catch (error) {
            log.error('Get customer error:', error)
            return { customer: null, history: [] }
        }
    })

    ipcMain.handle('customers:create', async (_event, data) => {
        const db = getDb()
        const { name, phone, note } = data
        const id = generateId()
        const now = nowIso()

        try {
            const existing = db.prepare('SELECT id FROM customers WHERE phone = ?').get(phone)
            if (existing) {
                return { success: false, error: 'Zákazník s tímto telefonním číslem již existuje' }
            }

            db.prepare(`
                INSERT INTO customers (id, name, phone, note, createdAt, updatedAt)
                VALUES (?, ?, ?, ?, ?, ?)
            `).run(id, name, phone, note || null, now, now)

            const created = db.prepare('SELECT * FROM customers WHERE id = ?').get(id)
            return { success: true, data: created }
        } catch (error) {
            log.error('Create customer error:', error)
            return { success: false, error: String(error) }
        }
    })

    ipcMain.handle('customers:update', async (_event, { id, ...data }) => {
        const db = getDb()
        const { name, phone, note } = data
        const now = nowIso()

        try {
            db.prepare(`
                UPDATE customers SET name = ?, phone = ?, note = ?, updatedAt = ? WHERE id = ?
            `).run(name, phone, note || null, now, id)

            const updated = db.prepare('SELECT * FROM customers WHERE id = ?').get(id)
            return { success: true, data: updated }
        } catch (error) {
            log.error('Update customer error:', error)
            return { success: false, error: String(error) }
        }
    })

    ipcMain.handle('customers:delete', async (_event, id: string) => {
        const db = getDb()
        try {
            db.prepare('DELETE FROM customers WHERE id = ?').run(id)
            return { success: true }
        } catch (error) {
            log.error('Delete customer error:', error)
            return { success: false, error: String(error) }
        }
    })

    log.info('Customer IPC handlers registered')
}