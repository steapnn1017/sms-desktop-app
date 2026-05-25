import { PrismaClient } from '@prisma/client'
import path from 'path'
import { app } from 'electron'
import fs from 'fs'
import log from 'electron-log'

let prisma: PrismaClient | null = null

export function getDatabasePath(): string {
  const userDataPath = app.getPath('userData')
  return path.join(userDataPath, 'sms-manager.db')
}

export async function initDatabase(): Promise<PrismaClient> {
  if (prisma) return prisma

  const dbPath = getDatabasePath()
  const userDataPath = path.dirname(dbPath)

  // Ensure userData directory exists
  if (!fs.existsSync(userDataPath)) {
    fs.mkdirSync(userDataPath, { recursive: true })
  }

  log.info('Database path:', dbPath)

  // Set DATABASE_URL for Prisma
  process.env.DATABASE_URL = `file:${dbPath}`

  prisma = new PrismaClient({
    datasources: {
      db: {
        url: `file:${dbPath}`,
      },
    },
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

  // Run migrations / push schema
  await runMigrations()

  // Seed default data
  await seedDefaultData()

  log.info('Database initialized successfully')
  return prisma
}

async function runMigrations() {
  if (!prisma) return

  try {
    // For SQLite with Prisma, we use db push approach in production
    // In dev, use `prisma migrate dev`
    await prisma.$executeRaw`PRAGMA journal_mode=WAL;`
    await prisma.$executeRaw`PRAGMA foreign_keys=ON;`

    // Create tables if they don't exist (fallback for when migrations aren't run)
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "customers" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "name" TEXT NOT NULL,
        "phone" TEXT NOT NULL UNIQUE,
        "note" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "sms_templates" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "name" TEXT NOT NULL,
        "content" TEXT NOT NULL,
        "description" TEXT,
        "isDefault" BOOLEAN NOT NULL DEFAULT false,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "sms_history" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "phone" TEXT NOT NULL,
        "message" TEXT NOT NULL,
        "status" TEXT NOT NULL DEFAULT 'pending',
        "errorMsg" TEXT,
        "templateId" TEXT,
        "customerId" TEXT,
        "orderNumber" TEXT,
        "price" TEXT,
        "gatewayMsgId" TEXT,
        "sentAt" DATETIME,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "settings" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "key" TEXT NOT NULL UNIQUE,
        "value" TEXT NOT NULL,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `
    log.info('Database tables verified/created')
  } catch (error) {
    log.error('Migration error:', error)
  }
}

async function seedDefaultData() {
  if (!prisma) return

  try {
    const templateCount = await prisma.smsTemplate.count()
    if (templateCount === 0) {
      await prisma.smsTemplate.createMany({
        data: [
          {
            id: 'tpl_ready',
            name: 'Zakázka připravena',
            content:
              'Dobrý den, Vaše zakázka č. {zakazka} je připravena k vyzvednutí. Cena: {cena} Kč. Těšíme se na Vaši návštěvu!',
            description: 'Automatická zpráva o připravení zakázky',
            isDefault: true,
          },
          {
            id: 'tpl_received',
            name: 'Zakázka přijata',
            content:
              'Dobrý den, potvrzujeme přijetí Vaší zakázky č. {zakazka}. Budeme Vás informovat o průběhu opravy.',
            description: 'Potvrzení přijetí zakázky',
            isDefault: false,
          },
          {
            id: 'tpl_reminder',
            name: 'Připomínka',
            content:
              'Dobrý den, připomínáme Vám, že Vaše zakázka č. {zakazka} je připravena k vyzvednutí již {poznamka}. Cena: {cena} Kč.',
            description: 'Připomínka nevyzvednuté zakázky',
            isDefault: false,
          },
          {
            id: 'tpl_custom',
            name: 'Individuální zpráva',
            content: '{poznamka}',
            description: 'Vlastní text zprávy',
            isDefault: false,
          },
        ],
      })
      log.info('Default templates seeded')
    }
  } catch (error) {
    log.error('Seed error:', error)
  }
}

export function getDb(): PrismaClient {
  if (!prisma) throw new Error('Database not initialized. Call initDatabase() first.')
  return prisma
}

export async function closeDatabase() {
  if (prisma) {
    await prisma.$disconnect()
    prisma = null
    log.info('Database connection closed')
  }
}
