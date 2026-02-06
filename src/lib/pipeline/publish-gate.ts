import { prisma } from '@/lib/db'

const GATE_HOURS = parseFloat(process.env.PUBLISH_GATE_HOURS || '1')

export async function acquirePublishGate(
  channelId: string = 'global'
): Promise<{ acquired: boolean; waitMinutes?: number }> {
  const oneWindowMs = GATE_HOURS * 60 * 60 * 1000

  return prisma.$transaction(async (tx) => {
    // Use raw query for SELECT ... FOR UPDATE (Prisma doesn't support this natively)
    const gates = await tx.$queryRaw<Array<{ id: string; lastPublishedAt: Date }>>`
      SELECT "id", "lastPublishedAt"
      FROM "PublishGate"
      WHERE "channelId" = ${channelId}
      FOR UPDATE
    `

    const gate = gates[0]

    if (!gate) {
      // First publish ever — create the gate row
      await tx.publishGate.create({
        data: { channelId, lastPublishedAt: new Date() },
      })
      return { acquired: true }
    }

    const elapsed = Date.now() - gate.lastPublishedAt.getTime()

    if (elapsed < oneWindowMs) {
      const waitMinutes = Math.ceil((oneWindowMs - elapsed) / 60000)
      return { acquired: false, waitMinutes }
    }

    // Enough time has passed — claim the slot
    await tx.publishGate.update({
      where: { id: gate.id },
      data: { lastPublishedAt: new Date() },
    })

    return { acquired: true }
  })
}
