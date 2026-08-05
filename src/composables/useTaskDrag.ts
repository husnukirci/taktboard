/**
 * Drag-to-reschedule pointer lifecycle for one task bar. Every listener lives
 * on the bar element itself — `setPointerCapture` routes all subsequent
 * pointer events there, so no document-level listeners are needed, and the
 * element is focused on pointerdown so its own keydown handler can catch
 * Escape mid-drag. During the drag only uiStore's preview is written; the
 * schedule store is written exactly once, on drop.
 */

import { computed, onScopeDispose, toValue } from 'vue'
import type { ComputedRef, MaybeRefOrGetter } from 'vue'
import { addDays, maxDate } from '../domain'
import type { ISODate } from '../domain'
import { useScheduleStore } from '../state/scheduleStore'
import { useUiStore } from '../state/uiStore'
import { DAY_WIDTH_PX } from '../ui/geometry'

export interface UseTaskDragOptions {
  taskId: MaybeRefOrGetter<string>
  currentStart: MaybeRefOrGetter<ISODate>
  /**
   * Earliest day a drag may preview or drop on — the timeline's first day,
   * so the preview never renders left of the grid. Unset = unclamped.
   */
  minStart?: MaybeRefOrGetter<ISODate>
  /** Defaults to the shared geometry token; overridable for tests. */
  dayWidthPx?: number
}

export interface UseTaskDrag {
  /** Wire to `@pointerdown` on the bar. */
  onPointerDown: (event: PointerEvent) => void
  /** Escape path: drop the preview, commit nothing. */
  cancelDrag: () => void
  /** Keyboard equivalent — same `moveTask` path as a drop. Ignored mid-drag. */
  moveByDays: (delta: number) => void
  isDragging: ComputedRef<boolean>
  /** Day the bar would land on if dropped now; null unless this task drags. */
  previewStart: ComputedRef<ISODate | null>
}

interface ActiveDrag {
  element: HTMLElement
  pointerId: number
  originClientX: number
  /** currentStart at pointerdown; stable during the drag — the store is untouched until drop. */
  startDate: ISODate
  lastClientX: number
  frame: number | null
}

export function useTaskDrag(options: UseTaskDragOptions): UseTaskDrag {
  const ui = useUiStore()
  const scheduleStore = useScheduleStore()
  const dayWidthPx = options.dayWidthPx ?? DAY_WIDTH_PX

  let active: ActiveDrag | null = null

  const previewStart = computed<ISODate | null>(() =>
    ui.drag !== null && ui.drag.taskId === toValue(options.taskId) ? ui.drag.previewStart : null,
  )
  const isDragging = computed(() => previewStart.value !== null)

  function snappedStart(drag: ActiveDrag, clientX: number): ISODate {
    const raw = addDays(drag.startDate, Math.round((clientX - drag.originClientX) / dayWidthPx))
    // Clamp preview and drop alike, so the bar always lands where it showed.
    return options.minStart === undefined ? raw : maxDate(toValue(options.minStart), raw)
  }

  function flushPreview(): void {
    if (active === null) return
    active.frame = null
    ui.updateDrag(snappedStart(active, active.lastClientX))
  }

  function onPointerMove(event: PointerEvent): void {
    if (active === null || event.pointerId !== active.pointerId) return
    active.lastClientX = event.clientX
    if (active.frame === null) {
      active.frame = requestAnimationFrame(flushPreview)
    }
  }

  function onPointerUp(event: PointerEvent): void {
    if (active === null || event.pointerId !== active.pointerId) return
    const dropStart = snappedStart(active, event.clientX)
    teardown()
    ui.endDrag()
    if (dropStart !== toValue(options.currentStart)) {
      scheduleStore.moveTask(toValue(options.taskId), dropStart)
    }
  }

  function onPointerCancel(event: PointerEvent): void {
    if (active === null || event.pointerId !== active.pointerId) return
    cancelDrag()
  }

  function cancelDrag(): void {
    if (active === null) return
    teardown()
    ui.endDrag()
  }

  function teardown(): void {
    if (active === null) return
    const { element, pointerId, frame } = active
    if (frame !== null) cancelAnimationFrame(frame)
    element.removeEventListener('pointermove', onPointerMove)
    element.removeEventListener('pointerup', onPointerUp)
    element.removeEventListener('pointercancel', onPointerCancel)
    if (element.hasPointerCapture(pointerId)) {
      element.releasePointerCapture(pointerId)
    }
    active = null
  }

  function onPointerDown(event: PointerEvent): void {
    // Primary button only; a second pointer mid-drag is ignored.
    if (active !== null || event.button !== 0) return
    if (!(event.currentTarget instanceof HTMLElement)) return
    const element = event.currentTarget
    active = {
      element,
      pointerId: event.pointerId,
      originClientX: event.clientX,
      startDate: toValue(options.currentStart),
      lastClientX: event.clientX,
      frame: null,
    }
    element.setPointerCapture(event.pointerId)
    element.focus()
    element.addEventListener('pointermove', onPointerMove)
    element.addEventListener('pointerup', onPointerUp)
    element.addEventListener('pointercancel', onPointerCancel)
    ui.startDrag(toValue(options.taskId), active.startDate)
  }

  function moveByDays(delta: number): void {
    if (active !== null) return
    scheduleStore.moveTask(toValue(options.taskId), addDays(toValue(options.currentStart), delta))
  }

  onScopeDispose(() => {
    cancelDrag()
  })

  return { onPointerDown, cancelDrag, moveByDays, isDragging, previewStart }
}
