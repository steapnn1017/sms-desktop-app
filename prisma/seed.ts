import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // Create default templates
  await prisma.smsTemplate.upsert({
    where: { id: 'tpl_ready' },
    update: {},
    create: {
      id: 'tpl_ready',
      name: 'Zakázka připravena',
      content: 'Dobrý den, Vaše zakázka č. {zakazka} je připravena k vyzvednutí. Cena: {cena} Kč. Těšíme se na Vaši návštěvu!',
      description: 'Automatická zpráva o připravení zakázky',
      isDefault: true,
    },
  })

  await prisma.smsTemplate.upsert({
    where: { id: 'tpl_received' },
    update: {},
    create: {
      id: 'tpl_received',
      name: 'Zakázka přijata',
      content: 'Dobrý den, potvrzujeme přijetí Vaší zakázky č. {zakazka}. Budeme Vás informovat o průběhu opravy.',
      description: 'Potvrzení přijetí zakázky',
      isDefault: false,
    },
  })

  await prisma.smsTemplate.upsert({
    where: { id: 'tpl_reminder' },
    update: {},
    create: {
      id: 'tpl_reminder',
      name: 'Připomínka',
      content: 'Dobrý den, připomínáme Vám, že Vaše zakázka č. {zakazka} je připravena k vyzvednutí již {poznamka}. Cena: {cena} Kč.',
      description: 'Připomínka nevyzvednuté zakázky',
      isDefault: false,
    },
  })

  await prisma.smsTemplate.upsert({
    where: { id: 'tpl_custom' },
    update: {},
    create: {
      id: 'tpl_custom',
      name: 'Individuální zpráva',
      content: '{poznamka}',
      description: 'Vlastní text zprávy',
      isDefault: false,
    },
  })

  console.log('Seeding complete!')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
