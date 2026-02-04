import { NextRequest, NextResponse } from 'next/server'
import { isAdminAuthenticated } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { TaskType, PostType, RoundtableStatus } from '@prisma/client'
import { TENSION_PAIRINGS } from '@/lib/llm/prompts'

export async function POST(request: NextRequest) {
  // Verify admin auth
  const isAuthenticated = await isAdminAuthenticated()
  if (!isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const {
      title,
      promptBody,
      contextNotes,
      contextLinks,
      participantIds,
      responseMode,
      groundingMode,
      enableCrossResponses,
      enableSynthesis
    } = body

    // Validate required fields
    if (!title || !promptBody || !participantIds || participantIds.length === 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Create the roundtable
    const roundtable = await prisma.roundtable.create({
      data: {
        title,
        promptBody,
        contextNotes,
        contextLinks: contextLinks || [],
        participantIds,
        responseMode: responseMode || 'full',
        groundingMode: groundingMode || 'must_cite',
        enableCrossResponses: enableCrossResponses || false,
        enableSynthesis: enableSynthesis || false,
        status: RoundtableStatus.queued
      }
    })

    // Create the root roundtable_prompt post
    const rootPost = await prisma.post.create({
      data: {
        title,
        content: promptBody,
        excerpt: promptBody.length > 200 ? promptBody.substring(0, 200) + '...' : promptBody,
        postType: PostType.roundtable_prompt,
        authorType: 'admin',
        roundtableId: roundtable.id
      }
    })

    // Create tasks for each participant agent
    const agents = await prisma.agent.findMany({
      where: { id: { in: participantIds } }
    })

    // Create take tasks
    for (const agent of agents) {
      await prisma.task.create({
        data: {
          taskType: TaskType.roundtable_take,
          agentId: agent.id,
          roundtableId: roundtable.id,
          input: {
            prompt: promptBody,
            context: contextNotes,
            contextLinks,
            responseMode,
            groundingMode,
            postId: rootPost.id
          }
        }
      })
    }

    // If cross-responses enabled, create cross-response tasks after takes
    if (enableCrossResponses) {
      // Get agents by moon sign for tension pairing
      const agentsByMoon = new Map(agents.map(a => [a.moonSign.toLowerCase(), a]))

      // Select 3-5 tension pairings
      const selectedPairings = TENSION_PAIRINGS.filter(
        p => agentsByMoon.has(p.a) && agentsByMoon.has(p.b)
      ).slice(0, 5)

      // Cross-response tasks will be created after takes complete
      // For now, store the pairing info in roundtable metadata
      await prisma.roundtable.update({
        where: { id: roundtable.id },
        data: {
          // Store selected pairings for later use by worker
        }
      })
    }

    // If synthesis enabled, find the synthesizer agent
    if (enableSynthesis) {
      // Prefer Aquarius Moon, fallback to Virgo or Capricorn
      const synthesizer = agents.find(a => a.moonSign === 'aquarius')
        || agents.find(a => a.moonSign === 'virgo')
        || agents.find(a => a.moonSign === 'capricorn')

      if (synthesizer) {
        await prisma.task.create({
          data: {
            taskType: TaskType.synthesis,
            agentId: synthesizer.id,
            roundtableId: roundtable.id,
            input: {
              postId: rootPost.id,
              // This task should run after all takes complete
              // Worker will check if all takes are done before processing
              waitForTakes: true
            }
          }
        })
      }
    }

    // Mark roundtable as running
    await prisma.roundtable.update({
      where: { id: roundtable.id },
      data: {
        status: RoundtableStatus.running,
        startedAt: new Date()
      }
    })

    return NextResponse.json({
      id: roundtable.id,
      postId: rootPost.id
    })
  } catch (error) {
    console.error('Failed to create roundtable:', error)
    return NextResponse.json({ error: 'Failed to create roundtable' }, { status: 500 })
  }
}
