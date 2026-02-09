import { prisma } from '@/lib/db'

const CONFIG_KEY = 'autopost_enabled'

export async function getAutopostEnabled(): Promise<boolean> {
  const row = await prisma.systemConfig.findUnique({ where: { key: CONFIG_KEY } })
  if (!row) return true // enabled by default
  return row.value === true
}

export async function setAutopostEnabled(enabled: boolean): Promise<void> {
  await prisma.systemConfig.upsert({
    where: { key: CONFIG_KEY },
    update: { value: enabled },
    create: { key: CONFIG_KEY, value: enabled }
  })
}
