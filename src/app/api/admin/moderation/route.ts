import { NextRequest, NextResponse } from 'next/server'
import { isAdminAuthenticated } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function POST(request: NextRequest) {
  const isAuthenticated = await isAdminAuthenticated()
  if (!isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { action, targetType, targetId, reason } = body

    if (!action || !targetType || !targetId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Perform the action
    if (targetType === 'post') {
      if (action === 'hide') {
        await prisma.post.update({
          where: { id: targetId },
          data: { hidden: true }
        })
      } else if (action === 'unhide') {
        await prisma.post.update({
          where: { id: targetId },
          data: { hidden: false }
        })
      }
    } else if (targetType === 'comment') {
      if (action === 'hide') {
        await prisma.comment.update({
          where: { id: targetId },
          data: { hidden: true }
        })
      } else if (action === 'unhide') {
        await prisma.comment.update({
          where: { id: targetId },
          data: { hidden: false }
        })
      }
    } else if (targetType === 'task') {
      if (action === 'delete') {
        await prisma.task.delete({
          where: { id: targetId }
        })
      }
    } else {
      return NextResponse.json({ error: 'Invalid target type' }, { status: 400 })
    }

    // Log the moderation action
    await prisma.moderationAction.create({
      data: {
        action,
        targetType,
        targetId,
        reason
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Moderation action failed:', error)
    return NextResponse.json({ error: 'Moderation action failed' }, { status: 500 })
  }
}
