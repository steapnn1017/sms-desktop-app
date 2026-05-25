import Database from 'better-sqlite3'
import path from 'path'
import { app } from 'electron'
import fs from 'fs'
import log from 'electron-log'

let db: Database.Database | null = null

export function getDatabasePath(): string {
    const userDataPath = app.getPath('userData')
    return path.join(userDataPath, 'sms-manager.db')
}

export function initDatabase(): Database.Database {
    if (db) return db

    const dbPath = getDatabasePath()
    const userDataPath = path.dirname(dbPath)

    if (!fs.existsSync(userDataPath)) {
        fs.mkdirSync(userDataPath, { recursive: true })
    }

    log.info('Database path:', dbPath)

    db = new Database(dbPath)
    db.pragma('journal_mode = WAL')
    db.pragma('foreign_keys = ON')

    runMigrations()
    seedDefaultData()

    log.info('Database initialized successfully')
    return db
}

function runMigrations() {
    if (!db) return

    db.exec(`
        CREATE TABLE IF NOT EXISTS customers (
                                                 id TEXT NOT NULL PRIMARY KEY,
                                                 name TEXT NOT NULL,
                                                 phone TEXT NOT NULL UNIQUE,
                                                 note TEXT,
                                                 createdAt TEXT NOT NULL DEFAULT (datetime('now')),
            updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
            );

        CREATE TABLE IF NOT EXISTS sms_templates (
                                                     id TEXT NOT NULL PRIMARY KEY,
                                                     name TEXT NOT NULL,
                                                     content TEXT NOT NULL,
                                                     description TEXT,
                                                     isDefault INTEGER NOT NULL DEFAULT 0,
                                                     createdAt TEXT NOT NULL DEFAULT (datetime('now')),
            updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
            );

        CREATE TABLE IF NOT EXISTS sms_history (
                                                   id TEXT NOT NULL PRIMARY KEY,
                                                   phone TEXT NOT NULL,
                                                   message TEXT NOT NULL,
                                                   status TEXT NOT NULL DEFAULT 'pending',
                                                   errorMsg TEXT,
                                                   templateId TEXT,
                                                   customerId TEXT,
                                                   orderNumber TEXT,
                                                   price TEXT,
                                                   gatewayMsgId TEXT,
                                                   sentAt TEXT,
                                                   createdAt TEXT NOT NULL DEFAULT (datetime('now')),
            updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
            );

        CREATE TABLE IF NOT EXISTS settings (
                                                id TEXT NOT NULL PRIMARY KEY,
                                                key TEXT NOT NULL UNIQUE,
                                                value TEXT NOT NULL,
                                                createdAt TEXT NOT NULL DEFAULT (datetime('now')),
            updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
            );
    `)

    log.info('Database tables verified/created')
}

function seedDefaultData() {
    if (!db) return

    const count = db.prepare('SELECT COUNT(*) as cnt FROM sms_templates').get() as { cnt: number }
    if (count.cnt > 0) return

    const insert = db.prepare(`
        INSERT OR IGNORE INTO sms_templates (id, name, content, description, isDefault)
    VALUES (?, ?, ?, ?, ?)
    `)

    const insertMany = db.transaction(() => {
        insert.run('tpl_ready', 'Zakázka připravena',
            'Dobrý den, Vaše zakázka č. {zakazka} je připravena k vyzvednutí. Cena: {cena} Kč. Těšíme se na Vaši návštěvu!',
            'Automatická zpráva o připravení zakázky', 1)
        insert.run('tpl_received', 'Zakázka přijata',
            'Dobrý den, potvrzujeme přijetí Vaší zakázky č. {zakazka}. Budeme Vás informovat o průběhu opravy.',
            'Potvrzení přijetí zakázky', 0)
        insert.run('tpl_reminder', 'Připomínka',
            'Dobrý den, připomínáme Vám, že Vaše zakázka č. {zakazka} je připravena k vyzvednutí již {poznamka}. Cena: {cena} Kč.',
            'Připomínka nevyzvednuté zakázky', 0)
        insert.run('tpl_custom', 'Individuální zpráva',
            '{poznamka}', 'Vlastní text zprávy', 0)
    })

    insertMany()
    log.info('Default templates seeded')
}

export function getDb(): Database.Database {
    if (!db) throw new Error('Database not initialized. Call initDatabase() first.')
    return db
}

export function closeDatabase() {
    if (db) {
        db.close()
        db = null
        log.info('Database connection closed')
    }
}