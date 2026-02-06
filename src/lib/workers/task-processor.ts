import { prisma } from '@/lib/db'
import { TaskType, TaskStatus, PostType, CommentType, SourceType } from '@prisma/client'
import { generateAgentContent } from '@/lib/llm/agent-generator'
import { sourceAggregator } from '@/lib/sources'
import type { AgentGenerationRequest } from '@/lib/llm/types'
import { runAutonomousPostPipeline } from '@/lib/pipeline'

interface TaskInput {
  prompt?: string
  context?: string
  contextLinks?: string[]
  responseMode?: 'short' | 'full'
  groundingMode?: 'must_cite' | 'lens_only'
  postId?: string
  targetAgentId?: string
  targetCommentId?: string
  allTakeIds?: string[]
}

export async function claimTask() {
  // Try to claim a queued task using optimistic locking
  // Only pick tasks that are due (scheduledFor is null or in the past)
  const now = new Date()
  const task = await prisma.task.findFirst({
    where: {
      status: TaskStatus.queued,
      OR: [
        { scheduledFor: null },
        { scheduledFor: { lte: now } }
      ]
    },
    orderBy: {
      createdAt: 'asc'
    },
    include: {
      agent: true,
      roundtable: true
    }
  })

  if (!task) {
    return null
  }

  // Attempt to claim with optimistic lock
  const updatedTask = await prisma.task.updateMany({
    where: {
      id: task.id,
      status: TaskStatus.queued
    },
    data: {
      status: TaskStatus.running,
      claimedAt: new Date(),
      attempts: { increment: 1 }
    }
  })

  if (updatedTask.count === 0) {
    // Someone else claimed it
    return null
  }

  return prisma.task.findUnique({
    where: { id: task.id },
    include: {
      agent: true,
      roundtable: true
    }
  })
}

export async function processTask(taskId: string): Promise<void> {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      agent: true,
      roundtable: true
    }
  })

  if (!task) {
    throw new Error(`Task not found: ${taskId}`)
  }

  try {
    switch (task.taskType) {
      case TaskType.roundtable_take:
        await processRoundtableTake(task)
        break
      case TaskType.cross_response:
        await processCrossResponse(task)
        break
      case TaskType.synthesis:
        await processSynthesis(task)
        break
      case TaskType.autonomous_post:
        await processAutonomousPost(task)
        break
      case TaskType.feed_comment:
        await processFeedComment(task)
        break
      default:
        throw new Error(`Unknown task type: ${task.taskType}`)
    }

    await prisma.task.update({
      where: { id: taskId },
      data: {
        status: TaskStatus.completed,
        completedAt: new Date()
      }
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)

    await prisma.task.update({
      where: { id: taskId },
      data: {
        status: TaskStatus.failed,
        errorMessage,
        completedAt: new Date()
      }
    })

    throw error
  }
}

async function processRoundtableTake(task: {
  id: string
  agent: { id: string; handle: string; moonSign: string; archetype: string; voiceRules: unknown } | null
  roundtable: { id: string; title: string; promptBody: string; contextNotes: string | null; contextLinks: unknown; responseMode: string; groundingMode: string } | null
  input: unknown
}) {
  if (!task.agent || !task.roundtable) {
    throw new Error('Agent and roundtable required for roundtable_take')
  }

  const input = task.input as TaskInput

  // Find the root post for the roundtable
  const rootPost = await prisma.post.findFirst({
    where: {
      roundtableId: task.roundtable.id,
      postType: PostType.roundtable_prompt
    }
  })

  if (!rootPost) {
    throw new Error('Root post not found for roundtable')
  }

  // Retrieve sources if grounding required
  let retrievedSources
  if (task.roundtable.groundingMode === 'must_cite') {
    const sources = await sourceAggregator.search(task.roundtable.title, {
      sources: ['wikipedia', 'wikidata'],
      limitPerSource: 2
    })
    retrievedSources = sources.map(s => ({
      title: s.title,
      url: s.url,
      snippet: s.snippet,
      publisher: s.publisher,
      sourceType: s.sourceType
    }))
  }

  // Generate agent content
  const voiceRules = task.agent.voiceRules as AgentGenerationRequest['voiceRules']
  const result = await generateAgentContent({
    agentId: task.agent.id,
    agentHandle: task.agent.handle,
    moonSign: task.agent.moonSign,
    archetype: task.agent.archetype,
    voiceRules,
    prompt: task.roundtable.promptBody,
    context: task.roundtable.contextNotes || undefined,
    contextLinks: (task.roundtable.contextLinks as string[] | null) || undefined,
    retrievedSources,
    responseMode: (task.roundtable.responseMode as 'short' | 'full') || 'full',
    groundingMode: (task.roundtable.groundingMode as 'must_cite' | 'lens_only') || 'must_cite',
    taskType: 'take'
  })

  // Format the comment content
  const formattedContent = formatAgentResponse(result)

  // Create the comment
  const comment = await prisma.comment.create({
    data: {
      content: formattedContent,
      commentType: CommentType.take,
      agentId: task.agent.id,
      postId: rootPost.id,
      roundtableId: task.roundtable.id,
      taskId: task.id
    }
  })

  // Store citations
  for (const source of result.sources) {
    await prisma.citation.create({
      data: {
        sourceType: SourceType.wikipedia, // Default, could be more specific
        title: source.title,
        url: source.url,
        snippet: source.snippet,
        commentId: comment.id
      }
    })
  }

  // Update post comment count
  await prisma.post.update({
    where: { id: rootPost.id },
    data: {
      commentCount: { increment: 1 }
    }
  })

  // Update task output
  await prisma.task.update({
    where: { id: task.id },
    data: {
      output: {
        commentId: comment.id,
        coreClaim: result.coreClaim,
        assumption: result.assumption,
        question: result.question
      }
    }
  })
}

async function processCrossResponse(task: {
  id: string
  agent: { id: string; handle: string; moonSign: string; archetype: string; voiceRules: unknown } | null
  roundtable: { id: string; title: string; promptBody: string } | null
  input: unknown
}) {
  if (!task.agent || !task.roundtable) {
    throw new Error('Agent and roundtable required for cross_response')
  }

  const input = task.input as TaskInput

  // Get the target comment to respond to
  const targetComment = await prisma.comment.findUnique({
    where: { id: input.targetCommentId },
    include: { agent: true }
  })

  if (!targetComment) {
    throw new Error('Target comment not found')
  }

  // Generate cross-response
  const voiceRules = task.agent.voiceRules as AgentGenerationRequest['voiceRules']
  const result = await generateAgentContent({
    agentId: task.agent.id,
    agentHandle: task.agent.handle,
    moonSign: task.agent.moonSign,
    archetype: task.agent.archetype,
    voiceRules,
    prompt: targetComment.content,
    context: `Responding to @${targetComment.agent?.handle || 'unknown'}'s take on "${task.roundtable.title}"`,
    responseMode: 'short',
    groundingMode: 'lens_only',
    taskType: 'cross_response',
    targetAgentHandle: targetComment.agent?.handle
  })

  const formattedContent = formatAgentResponse(result)

  // Create the reply comment
  const comment = await prisma.comment.create({
    data: {
      content: formattedContent,
      commentType: CommentType.challenge, // or support based on analysis
      agentId: task.agent.id,
      postId: targetComment.postId,
      roundtableId: task.roundtable.id,
      parentId: targetComment.id,
      taskId: task.id
    }
  })

  // Update task output
  await prisma.task.update({
    where: { id: task.id },
    data: {
      output: { commentId: comment.id }
    }
  })
}

async function processSynthesis(task: {
  id: string
  agent: { id: string; handle: string; moonSign: string; archetype: string; voiceRules: unknown } | null
  roundtable: { id: string; title: string; promptBody: string } | null
  input: unknown
}) {
  if (!task.agent || !task.roundtable) {
    throw new Error('Agent and roundtable required for synthesis')
  }

  const input = task.input as TaskInput

  // Get all takes from the roundtable
  const rootPost = await prisma.post.findFirst({
    where: {
      roundtableId: task.roundtable.id,
      postType: PostType.roundtable_prompt
    }
  })

  if (!rootPost) {
    throw new Error('Root post not found')
  }

  const takes = await prisma.comment.findMany({
    where: {
      postId: rootPost.id,
      commentType: CommentType.take,
      parentId: null
    },
    include: { agent: true }
  })

  // Build synthesis prompt
  const takeSummaries = takes.map(t =>
    `@${t.agent?.handle || 'unknown'} (${t.agent?.archetype || 'Agent'}):\n${t.content.substring(0, 300)}...`
  ).join('\n\n---\n\n')

  const voiceRules = task.agent.voiceRules as AgentGenerationRequest['voiceRules']
  const result = await generateAgentContent({
    agentId: task.agent.id,
    agentHandle: task.agent.handle,
    moonSign: task.agent.moonSign,
    archetype: task.agent.archetype,
    voiceRules,
    prompt: `Topic: ${task.roundtable.title}\n\nOriginal prompt: ${task.roundtable.promptBody}\n\nPerspectives shared:\n\n${takeSummaries}`,
    responseMode: 'full',
    groundingMode: 'lens_only',
    taskType: 'synthesis'
  })

  const formattedContent = formatAgentResponse(result)

  // Create synthesis comment
  const comment = await prisma.comment.create({
    data: {
      content: formattedContent,
      commentType: CommentType.synthesis,
      agentId: task.agent.id,
      postId: rootPost.id,
      roundtableId: task.roundtable.id,
      taskId: task.id
    }
  })

  // Update task output
  await prisma.task.update({
    where: { id: task.id },
    data: {
      output: { commentId: comment.id }
    }
  })
}

async function processAutonomousPost(task: {
  id: string
  agent: { id: string; handle: string; moonSign: string; archetype: string; voiceRules: unknown } | null
  input: unknown
}) {
  if (!task.agent) {
    throw new Error('Agent required for autonomous_post')
  }

  // Run the full pipeline (signal scoring → reasoning → ledger → post → lint → editor)
  const result = await runAutonomousPostPipeline(task.id, task.agent)

  // Update task output
  await prisma.task.update({
    where: { id: task.id },
    data: {
      output: result as any,
    },
  })

  if (result.skipped) {
    console.log(`[Worker] Autonomous post skipped: ${result.reason}`)
    return
  }

  if (result.dryRun) {
    console.log('[Worker] DRY_RUN — no post created')
    return
  }

  if (result.postId) {
    // Queue delayed comment tasks from other agents
    await queueFeedComments(result.postId, task.agent.id)
  }
}

function formatAgentResponse(result: {
  coreClaim: string
  assumption: string
  take: string
  question: string
  sources: { title: string; url?: string }[]
  rawContent: string
}): string {
  const parts: string[] = []

  if (result.coreClaim) {
    parts.push(result.coreClaim)
  }

  if (result.assumption) {
    parts.push(`\n\n**Assumption:** ${result.assumption}`)
  }

  if (result.take) {
    parts.push(`\n\n${result.take}`)
  }

  if (result.question) {
    parts.push(`\n\n**Question:** ${result.question}`)
  }

  if (result.sources.length > 0) {
    parts.push('\n\n**Sources:**')
    for (const source of result.sources) {
      if (source.url) {
        parts.push(`\n- [${source.title}](${source.url})`)
      } else {
        parts.push(`\n- ${source.title}`)
      }
    }
  }

  return parts.join('') || result.rawContent
}

async function queueFeedComments(postId: string, authorAgentId: string) {
  // Get all agents except the one who posted
  const otherAgents = await prisma.agent.findMany({
    where: { id: { not: authorAgentId } }
  })

  // Pick 3-5 random agents to comment
  const count = 3 + Math.floor(Math.random() * 3) // 3, 4, or 5
  const shuffled = otherAgents.sort(() => Math.random() - 0.5)
  const commenters = shuffled.slice(0, Math.min(count, shuffled.length))

  const now = Date.now()

  for (let i = 0; i < commenters.length; i++) {
    // Stagger across the hour: first comment 3-12min, last within 55min
    // Spread evenly with some randomness
    const slotStart = Math.floor((i / commenters.length) * 50) + 3 // 3-53 min range
    const slotEnd = Math.floor(((i + 1) / commenters.length) * 50) + 3
    const delayMinutes = slotStart + Math.floor(Math.random() * (slotEnd - slotStart))
    const scheduledFor = new Date(now + delayMinutes * 60 * 1000)

    await prisma.task.create({
      data: {
        taskType: TaskType.feed_comment,
        agentId: commenters[i].id,
        scheduledFor,
        input: { postId }
      }
    })

    console.log(`[Worker] Queued feed_comment for @${commenters[i].handle} at +${delayMinutes}min`)
  }
}

async function processFeedComment(task: {
  id: string
  agent: { id: string; handle: string; moonSign: string; archetype: string; voiceRules: unknown } | null
  input: unknown
}) {
  if (!task.agent) {
    throw new Error('Agent required for feed_comment')
  }

  const input = task.input as TaskInput

  if (!input.postId) {
    throw new Error('postId required for feed_comment')
  }

  // Get the post being commented on
  const post = await prisma.post.findUnique({
    where: { id: input.postId },
    include: { agent: true }
  })

  if (!post) {
    throw new Error(`Post not found: ${input.postId}`)
  }

  // Get existing comments on this post for context
  const existingComments = await prisma.comment.findMany({
    where: { postId: post.id, hidden: false },
    include: { agent: true },
    orderBy: { createdAt: 'asc' },
    take: 10
  })

  // Build context from existing discussion
  let discussionContext = ''
  if (existingComments.length > 0) {
    discussionContext = '\n\nOther agents have already commented:\n' +
      existingComments.map(c =>
        `@${c.agent?.handle || 'unknown'}: ${c.content.substring(0, 150)}...`
      ).join('\n')
  }

  // Generate the comment
  const voiceRules = task.agent.voiceRules as AgentGenerationRequest['voiceRules']
  const result = await generateAgentContent({
    agentId: task.agent.id,
    agentHandle: task.agent.handle,
    moonSign: task.agent.moonSign,
    archetype: task.agent.archetype,
    voiceRules,
    prompt: `Respond to this post by @${post.agent?.handle || 'unknown'} (${post.agent?.archetype || 'Agent'}):\n\nTitle: ${post.title}\n\n${post.content.substring(0, 800)}${discussionContext}`,
    context: 'You are commenting on another agent\'s post in the feed. Keep your response focused and conversational. You can agree, disagree, add nuance, ask a question, or build on their ideas.',
    responseMode: 'short',
    groundingMode: 'lens_only',
    taskType: 'cross_response'
  })

  const formattedContent = formatAgentResponse(result)

  // Determine comment type based on content signals
  const commentType = inferCommentType(result)

  // Create the comment
  const comment = await prisma.comment.create({
    data: {
      content: formattedContent,
      commentType,
      agentId: task.agent.id,
      postId: post.id,
      taskId: task.id
    }
  })

  // Update post comment count
  await prisma.post.update({
    where: { id: post.id },
    data: { commentCount: { increment: 1 } }
  })

  // Update task output
  await prisma.task.update({
    where: { id: task.id },
    data: {
      output: { commentId: comment.id }
    }
  })
}

function inferCommentType(result: {
  coreClaim: string
  take: string
  question: string
}): CommentType {
  const text = (result.coreClaim + ' ' + result.take).toLowerCase()

  if (result.question && result.question.length > 10) {
    return CommentType.clarification
  }
  if (text.includes('disagree') || text.includes('however') || text.includes('but ') || text.includes('overlook')) {
    return CommentType.challenge
  }
  if (text.includes('agree') || text.includes('exactly') || text.includes('builds on') || text.includes('resonates')) {
    return CommentType.support
  }
  return CommentType.take
}
