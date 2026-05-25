import { ipcMain } from 'electron'
import { getDb } from '../lib/database'
import log from 'electron-log'

function generateId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36)
}

function nowIso(): string {
    return new Date().toISOString()
}

export function registerTemplateHandlers() {
    ipcMain.handle('templates:getAll', async () => {
        const db = getDb()
        try {
            const templates = db.prepare('SELECT * FROM sms_templates ORDER BY isDefault DESC, name ASC').all()
            return { success: true, data: templates }
        } catch (error) {
            log.error('Get templates error:', error)
            return { success: false, data: [], error: String(error) }
        }
    })

    ipcMain.handle('templates:getById', async (_event, id: string) => {
        const db = getDb()
        try {
            const template = db.prepare('SELECT * FROM sms_templates WHERE id = ?').get(id)
            return { success: true, data: template || null }
        } catch (error) {
            log.error('Get template error:', error)
            return { success: false, data: null, error: String(error) }
        }
    })

    ipcMain.handle('templates:create', async (_event, data) => {
        const db = getDb()
        const { name, content, description, isDefault } = data
        const id = generateId()
        const now = nowIso()

        try {
            if (isDefault) {
                db.prepare('UPDATE sms_templates SET isDefault = 0 WHERE isDefault = 1').run()
            }

            db.prepare(`
                INSERT INTO sms_templates (id, name, content, description, isDefault, createdAt, updatedAt)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `).run(id, name, content, description || null, isDefault ? 1 : 0, now, now)

            const created = db.prepare('SELECT * FROM sms_templates WHERE id = ?').get(id)
            return { success: true, data: created }
        } catch (error) {
            log.error('Create template error:', error)
            return { success: false, error: String(error) }
        }
    })

    ipcMain.handle('templates:update', async (_event, { id, ...data }) => {
        const db = getDb()
        const { name, content, description, isDefault } = data
        const now = nowIso()

        try {
            if (isDefault) {
                db.prepare('UPDATE sms_templates SET isDefault = 0 WHERE isDefault = 1 AND id != ?').run(id)
            }

            db.prepare(`
                UPDATE sms_templates
                SET name = ?, content = ?, description = ?, isDefault = ?, updatedAt = ?
                WHERE id = ?
            `).run(name, content, description || null, isDefault ? 1 : 0, now, id)

            const updated = db.prepare('SELECT * FROM sms_templates WHERE id = ?').get(id)
            return { success: true, data: updated }
        } catch (error) {
            log.error('Update template error:', error)
            return { success: false, error: String(error) }
        }
    })

    ipcMain.handle('templates:delete', async (_event, id: string) => {
        const db = getDb()
        try {
            const template = db.prepare('SELECT id FROM sms_templates WHERE id = ?').get(id)
            if (!template) return { success: false, error: 'Šablona nenalezena' }

            db.prepare('DELETE FROM sms_templates WHERE id = ?').run(id)
            return { success: true }
        } catch (error) {
            log.error('Delete template error:', error)
            return { success: false, error: String(error) }
        }
    })

    ipcMain.handle('templates:preview', async (_event, { content, variables }) => {
        try {
            let preview = content
            if (variables) {
                Object.entries(variables).forEach(([key, value]) => {
                    preview = preview.replace(new RegExp(`{${key}}`, 'g'), String(value || `{${key}}`))
                })
            }
            return { success: true, preview }
        } catch (error) {
            return { success: false, preview: content, error: String(error) }
        }
    })

    log.info('Template IPC handlers registered')
}