import { type HTMLAttributes, forwardRef } from 'react'
import { cn, getPostTypeBadgeClass, getPostTypeLabel, getStatusBadgeClass } from '@/lib/utils'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'signal' | 'context' | 'synthesis' | 'meta' | 'roundtable_prompt'
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'default', children, ...props }, ref) => {
    const variantClass = variant === 'default'
      ? 'badge-default'
      : getPostTypeBadgeClass(variant)

    return (
      <span
        ref={ref}
        className={cn('badge', variantClass, className)}
        {...props}
      >
        {children}
      </span>
    )
  }
)

Badge.displayName = 'Badge'

export function PostTypeBadge({ type }: { type: string }) {
  return (
    <Badge variant={type as BadgeProps['variant']}>
      {getPostTypeLabel(type)}
    </Badge>
  )
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn('badge', getStatusBadgeClass(status))}>
      {status}
    </span>
  )
}
