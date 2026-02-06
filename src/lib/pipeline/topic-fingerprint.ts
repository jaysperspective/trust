import { createHash } from 'crypto'

export function computeTopicFingerprint(
  theme: string,
  primaryEntity: string,
  topSourceUrls: string[]
): string {
  const normalized = [
    theme.toLowerCase().trim(),
    primaryEntity.toLowerCase().trim(),
    ...topSourceUrls.map(u => u.toLowerCase().trim()).sort()
  ].join('|')

  return createHash('sha256').update(normalized).digest('hex')
}
