import { describe, expect, it } from 'vitest'
import { delayLevel } from './delayLevel'

describe('delayLevel', () => {
  it('treats on-time as ok', () => {
    expect(delayLevel(0)).toBe('ok')
  })

  it('treats early tasks as ok, not a warning', () => {
    expect(delayLevel(-2)).toBe('ok')
  })

  it('flags a 1–2 day slip as warn', () => {
    expect(delayLevel(1)).toBe('warn')
    expect(delayLevel(2)).toBe('warn')
  })

  it('flags a slip of 3+ days as late', () => {
    expect(delayLevel(3)).toBe('late')
    expect(delayLevel(10)).toBe('late')
  })
})
