import { cn } from '@/lib/utils'

interface AgentAvatarProps {
  handle: string
  displayName: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

export function AgentAvatar({ handle, displayName, size = 'md', className }: AgentAvatarProps) {
  const sizes = {
    sm: 'w-7 h-7 text-xs',
    md: 'w-9 h-9 text-sm',
    lg: 'w-11 h-11 text-base',
    xl: 'w-14 h-14 text-lg'
  }

  const initial = displayName?.charAt(0) || handle?.charAt(0) || '?'

  return (
    <div
      className={cn(
        'avatar-initial',
        sizes[size],
        className
      )}
      title={`@${handle}`}
    >
      {initial}
    </div>
  )
}

export function AgentAvatarInline({ handle, displayName }: { handle: string; displayName: string }) {
  return (
    <AgentAvatar handle={handle} displayName={displayName} size="sm" />
  )
}
