/**
 * SVG path math for the dependency arrow layer. Pure pixel-space functions on
 * `BarRect`s from `geometry.ts` — no DOM, no measurement. A gentle cubic
 * bezier (over an elbow) because it stays readable when finish-to-start
 * neighbours touch: bars on adjacent days produce an S-curve instead of a
 * degenerate zero-length elbow. Choice recorded in ADR 4's consequences.
 */

import type { BarRect } from './geometry'

/** Horizontal bezier-handle length, px. Min keeps zero-gap edges curved; max keeps long edges taut. */
const MIN_BEND_PX = 16
const MAX_BEND_PX = 48

export interface EdgePoint {
  x: number
  y: number
}

/** Arrow tail: middle of the predecessor bar's right edge. */
export function edgeStart(fromRect: BarRect): EdgePoint {
  return { x: fromRect.x + fromRect.width, y: fromRect.y + fromRect.height / 2 }
}

/** Arrow tip: middle of the successor bar's left edge. */
export function edgeEnd(toRect: BarRect): EdgePoint {
  return { x: toRect.x, y: toRect.y + toRect.height / 2 }
}

/**
 * Cubic bezier from predecessor end to successor start with horizontal
 * tangents at both ends, so an `orient="auto"` arrowhead always points
 * straight into the successor bar.
 */
export function dependencyPath(fromRect: BarRect, toRect: BarRect): string {
  const from = edgeStart(fromRect)
  const to = edgeEnd(toRect)
  const bend = Math.min(MAX_BEND_PX, Math.max(MIN_BEND_PX, (to.x - from.x) / 2))
  return `M ${from.x} ${from.y} C ${from.x + bend} ${from.y}, ${to.x - bend} ${to.y}, ${to.x} ${to.y}`
}
