import { describe, it, expect } from 'vitest'

// Test the publish gate timing logic (pure math, no DB)
// Mirrors the logic in src/lib/pipeline/publish-gate.ts
describe('publish gate timing', () => {
  const GATE_HOURS = 1
  const oneWindowMs = GATE_HOURS * 60 * 60 * 1000

  it('window is exactly 1 hour in ms', () => {
    expect(oneWindowMs).toBe(3_600_000)
  })

  it('allows publish when enough time has elapsed', () => {
    const lastPublished = new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
    const elapsed = Date.now() - lastPublished.getTime()
    expect(elapsed >= oneWindowMs).toBe(true)
  })

  it('allows publish at exactly the boundary', () => {
    const lastPublished = new Date(Date.now() - oneWindowMs)
    const elapsed = Date.now() - lastPublished.getTime()
    expect(elapsed >= oneWindowMs).toBe(true)
  })

  it('blocks publish within window', () => {
    const lastPublished = new Date(Date.now() - 30 * 60 * 1000) // 30 min ago
    const elapsed = Date.now() - lastPublished.getTime()
    expect(elapsed < oneWindowMs).toBe(true)
    const waitMinutes = Math.ceil((oneWindowMs - elapsed) / 60000)
    expect(waitMinutes).toBeGreaterThan(0)
    expect(waitMinutes).toBeLessThanOrEqual(30)
  })

  it('blocks publish 1 second after last', () => {
    const elapsed = 1000 // 1 second
    expect(elapsed < oneWindowMs).toBe(true)
    const waitMinutes = Math.ceil((oneWindowMs - elapsed) / 60000)
    expect(waitMinutes).toBe(60) // almost full hour to wait
  })

  it('calculates correct wait time for 45 min elapsed', () => {
    const elapsed = 45 * 60 * 1000
    const waitMinutes = Math.ceil((oneWindowMs - elapsed) / 60000)
    expect(waitMinutes).toBe(15)
  })

  it('calculates correct wait time for 59 min elapsed', () => {
    const elapsed = 59 * 60 * 1000
    const waitMinutes = Math.ceil((oneWindowMs - elapsed) / 60000)
    expect(waitMinutes).toBe(1)
  })

  it('calculates correct wait time for 10 min elapsed', () => {
    const elapsed = 10 * 60 * 1000
    const waitMinutes = Math.ceil((oneWindowMs - elapsed) / 60000)
    expect(waitMinutes).toBe(50)
  })

  describe('configurable gate hours', () => {
    it('works with 2-hour gate', () => {
      const gateHours = 2
      const windowMs = gateHours * 60 * 60 * 1000
      expect(windowMs).toBe(7_200_000)

      const elapsed = 90 * 60 * 1000 // 90 min
      expect(elapsed < windowMs).toBe(true)
      const waitMinutes = Math.ceil((windowMs - elapsed) / 60000)
      expect(waitMinutes).toBe(30)
    })

    it('works with fractional gate (0.5 hours = 30 min)', () => {
      const gateHours = 0.5
      const windowMs = gateHours * 60 * 60 * 1000
      expect(windowMs).toBe(1_800_000)

      const elapsed = 20 * 60 * 1000 // 20 min
      const waitMinutes = Math.ceil((windowMs - elapsed) / 60000)
      expect(waitMinutes).toBe(10)
    })
  })
})
