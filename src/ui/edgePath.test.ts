import { describe, expect, it } from 'vitest'
import { dependencyPath, edgeEnd, edgeStart } from './edgePath'
import type { BarRect } from './geometry'

// Two lanes of 20px; day width 10px. Predecessor days 1-3, successor day 5+.
const predecessor: BarRect = { x: 0, y: 0, width: 30, height: 20 }
const gapSuccessor: BarRect = { x: 40, y: 20, width: 20, height: 20 }
// Finish-to-start with no slack: starts on the predecessor's exclusive end.
const touchingSuccessor: BarRect = { x: 30, y: 20, width: 20, height: 20 }

describe('edge anchors', () => {
  it('start is the middle of the predecessor right edge', () => {
    expect(edgeStart(predecessor)).toEqual({ x: 30, y: 10 })
  })

  it('end is the middle of the successor left edge', () => {
    expect(edgeEnd(gapSuccessor)).toEqual({ x: 40, y: 30 })
  })
})

describe('dependencyPath', () => {
  it('runs from the predecessor end anchor to the successor start anchor', () => {
    const path = dependencyPath(predecessor, gapSuccessor)
    expect(path.startsWith('M 30 10 ')).toBe(true)
    expect(path.endsWith(' 40 30')).toBe(true)
  })

  it('keeps horizontal end tangents so the arrowhead points into the bar', () => {
    const path = dependencyPath(predecessor, gapSuccessor)
    // Cubic handles share their anchor's y: tangents are horizontal at both ends.
    expect(path).toBe('M 30 10 C 46 10, 24 30, 40 30')
  })

  it('still curves when the successor starts on the predecessor end date', () => {
    const path = dependencyPath(predecessor, touchingSuccessor)
    // Zero horizontal gap: the minimum bend keeps an S-curve instead of a vertical line.
    expect(path).toBe('M 30 10 C 46 10, 14 30, 30 30')
  })
})
