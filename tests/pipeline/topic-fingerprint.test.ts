import { describe, it, expect } from 'vitest'
import { computeTopicFingerprint } from '../../src/lib/pipeline/topic-fingerprint'

describe('computeTopicFingerprint', () => {
  it('produces deterministic output for same inputs', () => {
    const a = computeTopicFingerprint('power_dynamics', 'Federal Reserve', ['https://a.com', 'https://b.com'])
    const b = computeTopicFingerprint('power_dynamics', 'Federal Reserve', ['https://a.com', 'https://b.com'])
    expect(a).toBe(b)
  })

  it('normalizes casing', () => {
    const a = computeTopicFingerprint('Power_Dynamics', 'FEDERAL RESERVE', ['https://A.com'])
    const b = computeTopicFingerprint('power_dynamics', 'federal reserve', ['https://a.com'])
    expect(a).toBe(b)
  })

  it('sorts URLs so order does not matter', () => {
    const a = computeTopicFingerprint('theme', 'entity', ['https://b.com', 'https://a.com'])
    const b = computeTopicFingerprint('theme', 'entity', ['https://a.com', 'https://b.com'])
    expect(a).toBe(b)
  })

  it('produces different output for different inputs', () => {
    const a = computeTopicFingerprint('theme1', 'entity', [])
    const b = computeTopicFingerprint('theme2', 'entity', [])
    expect(a).not.toBe(b)
  })

  it('returns a 64-char hex string (SHA-256)', () => {
    const hash = computeTopicFingerprint('theme', 'entity', [])
    expect(hash).toMatch(/^[a-f0-9]{64}$/)
  })
})
