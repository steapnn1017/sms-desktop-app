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
  // Get all templates
  ipcMain.handle('templates:getAll', async () => {
    const db = getDb()
    try {
      const templates = await db.$queryRaw`
        SELECT * FROM sms_templates ORDER BY isDefault DESC, name ASC
      `
      return { success: true, data: templates }
    } catch (error) {
      log.error('Get templates error:', error)
      return { success: false, data: [], error: String(error) }
    }
  })

  // Get template by ID
  ipcMain.handle('templates:getById', async (_event, id: string) => {
    const db = getDb()
    try {
      const templates = await db.$queryRaw`SELECT * FROM sms_templates WHERE id = ${id}` as unknown[]
      return { success: true, data: (templates as unknown[])[0] || null }
    } catch (error) {
      log.error('Get template error:', error)
      return { success: false, data: null, error: String(error) }
    }
  })

  // Create template
  ipcMain.handle('templates:create', async (_event, data) => {
    const db = getDb()
    const { name, content, description, isDefault } = data
    const id = generateId()
    const now = nowIso()

    try {
      // If setting as default, unset others
      if (isDefault) {
        await db.$executeRaw`UPDATE sms_templates SET isDefault = 0 WHERE isDefault = 1`
      }

      await db.$executeRaw`
        INSERT INTO sms_templates (id, name, content, description, isDefault, createdAt, updatedAt)
        VALUES (${id}, ${name}, ${content}, ${description || null}, ${isDefault ? 1 : 0}, ${now}, ${now})
      `
      const created = await db.$queryRaw`SELECT * FROM sms_templates WHERE id = ${id}` as unknown[]
      return { success: true, data: (created as unknown[])[0] }
    } catch (error) {
      log.error('Create template error:', error)
      return { success: false, error: String(error) }
    }
  })

  // Update template
  ipcMain.handle('templates:update', async (_event, { id, ...data }) => {
    const db = getDb()
    const { name, content, description, isDefault } = data
    const now = nowIso()

    try {
      if (isDefault) {
        await db.$executeRaw`UPDATE sms_templates SET isDefault = 0 WHERE isDefault = 1 AND id != ${id}`
      }

      await db.$executeRaw`
        UPDATE sms_templates
        SET name = ${name}, content = ${content}, description = ${description || null},
            isDefault = ${isDefault ? 1 : 0}, updatedAt = ${now}
        WHERE id = ${id}
      `
      const updated = await db.$queryRaw`SELECT * FROM sms_templates WHERE id = ${id}` as unknown[]
      return { success: true, data: (updated as unknown[])[0] }
    } catch (error) {
      log.error('Update template error:', error)
      return { success: false, error: String(error) }
    }
  })

  // Delete template
  ipcMain.handle('templates:delete', async (_event, id: string) => {
    const db = getDb()
    try {
      // Check if it's a default/system template
      const templates = await db.$queryRaw`SELECT id FROM sms_templates WHERE id = ${id}` as unknown[]
      if (!templates || (templates as unknown[]).length === 0) {
        return { success: false, error: 'Šablona nenalezena' }
      }

      await db.$executeRaw`DELETE FROM sms_templates WHERE id = ${id}`
      return { success: true }
    } catch (error) {
      log.error('Delete template error:', error)
      return { success: false, error: String(error) }
    }
  })

  // Preview template with variables
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
