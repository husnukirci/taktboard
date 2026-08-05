import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { effectScope } from 'vue'
import type { EffectScope } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import type { Schedule } from '../domain'
import { useScheduleStore } from '../state/scheduleStore'
import { useUiStore } from '../state/uiStore'
import { useTaskDrag } from './useTaskDrag'
import type { UseTaskDrag } from './useTaskDrag'

const DAY_W = 44

/** A → B with zero slack, so a committed drop on A visibly pushes B. */
function fixture(): Schedule {
  return {
    trades: { 'trade-shell': { id: 'trade-shell', name: 'Shell', order: 1 } },
    tasks: {
      a: {
        id: 'a',
        tradeId: 'trade-shell',
        name: 'Task A',
        baselineStart: '2026-03-02',
        currentStart: '2026-03-02',
        durationDays: 2,
      },
      b: {
        id: 'b',
        tradeId: 'trade-shell',
        name: 'Task B',
        baselineStart: '2026-03-04',
        currentStart: '2026-03-04',
        durationDays: 2,
      },
    },
    dependencies: [{ predecessorId: 'a', successorId: 'b' }],
  }
}

/** happy-dom lacks the pointer-capture API; stub it on a real element. */
function makeBar(): HTMLElement {
  const el = document.createElement('div')
  el.setPointerCapture = vi.fn()
  el.releasePointerCapture = vi.fn()
  el.hasPointerCapture = vi.fn(() => true)
  return el
}

/** Build a pointer event happy-dom can dispatch, with pointerId patched on. */
function pointerEvent(type: string, clientX: number, pointerId = 1): PointerEvent {
  const event = new MouseEvent(type, { clientX, button: 0, bubbles: true })
  Object.defineProperty(event, 'pointerId', { value: pointerId })
  return event as PointerEvent
}

describe('useTaskDrag', () => {
  let scope: EffectScope
  let bar: HTMLElement
  let drag: UseTaskDrag
  let store: ReturnType<typeof useScheduleStore>
  let ui: ReturnType<typeof useUiStore>
  let rafQueue: FrameRequestCallback[]

  function flushRaf(): void {
    const queue = rafQueue
    rafQueue = []
    for (const cb of queue) cb(0)
  }

  function currentStartOfA(): string {
    const task = store.schedule?.tasks['a']
    if (task === undefined) throw new Error('fixture task "a" missing')
    return task.currentStart
  }

  function pointerDown(clientX: number): void {
    const event = pointerEvent('pointerdown', clientX)
    Object.defineProperty(event, 'currentTarget', { value: bar })
    drag.onPointerDown(event)
  }

  beforeEach(() => {
    rafQueue = []
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => rafQueue.push(cb))
    vi.stubGlobal('cancelAnimationFrame', () => undefined)
    setActivePinia(createPinia())
    store = useScheduleStore()
    ui = useUiStore()
    store.loadScenario(fixture())
    bar = makeBar()
    scope = effectScope()
    const result = scope.run(() =>
      useTaskDrag({ taskId: 'a', currentStart: currentStartOfA, dayWidthPx: DAY_W }),
    )
    if (result === undefined) throw new Error('effect scope did not run')
    drag = result
  })

  afterEach(() => {
    scope.stop()
    vi.unstubAllGlobals()
  })

  it('snaps the preview to the nearest whole day', () => {
    pointerDown(100)
    expect(drag.isDragging.value).toBe(true)
    expect(drag.previewStart.value).toBe('2026-03-02')

    // 60px right of a 44px day ≈ 1.36 days → snaps to 1.
    bar.dispatchEvent(pointerEvent('pointermove', 160))
    flushRaf()
    expect(drag.previewStart.value).toBe('2026-03-03')

    // 60px left of the origin snaps to -1.
    bar.dispatchEvent(pointerEvent('pointermove', 40))
    flushRaf()
    expect(drag.previewStart.value).toBe('2026-03-01')
  })

  it('throttles moves to animation frames', () => {
    pointerDown(100)
    bar.dispatchEvent(pointerEvent('pointermove', 160))
    bar.dispatchEvent(pointerEvent('pointermove', 200))

    // No frame yet — the preview still shows the pointerdown value.
    expect(drag.previewStart.value).toBe('2026-03-02')
    expect(rafQueue).toHaveLength(1)

    flushRaf()
    // One flush applies the latest position (100 → 200 = 2.27 days → 2).
    expect(drag.previewStart.value).toBe('2026-03-04')
  })

  it('commits the snapped position once on drop and clears the drag', () => {
    const moveTask = vi.spyOn(store, 'moveTask')
    pointerDown(100)
    bar.dispatchEvent(pointerEvent('pointermove', 160))
    flushRaf()

    bar.dispatchEvent(pointerEvent('pointerup', 190))

    expect(moveTask).toHaveBeenCalledExactlyOnceWith('a', '2026-03-04')
    expect(store.schedule?.tasks['a']?.currentStart).toBe('2026-03-04')
    expect(store.schedule?.tasks['b']?.currentStart).toBe('2026-03-06')
    expect(ui.drag).toBeNull()
    expect(bar.releasePointerCapture).toHaveBeenCalled()
  })

  it('clamps preview and drop to minStart, so nothing renders left of the grid', () => {
    scope.stop()
    scope = effectScope()
    const result = scope.run(() =>
      useTaskDrag({
        taskId: 'a',
        currentStart: currentStartOfA,
        minStart: '2026-03-02',
        dayWidthPx: DAY_W,
      }),
    )
    if (result === undefined) throw new Error('effect scope did not run')
    drag = result

    const moveTask = vi.spyOn(store, 'moveTask')
    pointerDown(100)
    // 5 days left of the range start: raw snap would be 2026-02-25.
    bar.dispatchEvent(pointerEvent('pointermove', -120))
    flushRaf()
    expect(drag.previewStart.value).toBe('2026-03-02')

    // The drop commits the clamped day — here the origin, so no move at all.
    bar.dispatchEvent(pointerEvent('pointerup', -120))
    expect(moveTask).not.toHaveBeenCalled()
    expect(ui.drag).toBeNull()
  })

  it('does not touch the schedule when dropped on the original day', () => {
    const moveTask = vi.spyOn(store, 'moveTask')
    pointerDown(100)
    bar.dispatchEvent(pointerEvent('pointermove', 110))
    flushRaf()

    bar.dispatchEvent(pointerEvent('pointerup', 110))

    expect(moveTask).not.toHaveBeenCalled()
    expect(store.moveSeq).toBe(0)
    expect(ui.drag).toBeNull()
  })

  it('cancelDrag (Escape) clears the preview and commits nothing', () => {
    pointerDown(100)
    bar.dispatchEvent(pointerEvent('pointermove', 200))
    flushRaf()
    expect(drag.previewStart.value).toBe('2026-03-04')

    drag.cancelDrag()

    expect(ui.drag).toBeNull()
    expect(currentStartOfA()).toBe('2026-03-02')
    expect(bar.releasePointerCapture).toHaveBeenCalled()

    // Listeners are gone: a stray move must not resurrect a preview.
    bar.dispatchEvent(pointerEvent('pointermove', 300))
    flushRaf()
    expect(ui.drag).toBeNull()
  })

  it('pointercancel behaves like Escape', () => {
    pointerDown(100)
    bar.dispatchEvent(pointerEvent('pointermove', 200))
    flushRaf()

    bar.dispatchEvent(pointerEvent('pointercancel', 200))

    expect(ui.drag).toBeNull()
    expect(currentStartOfA()).toBe('2026-03-02')
  })

  it('moveByDays moves through the same moveTask path, but never mid-drag', () => {
    drag.moveByDays(1)
    expect(currentStartOfA()).toBe('2026-03-03')
    expect(store.schedule?.tasks['b']?.currentStart).toBe('2026-03-05')

    pointerDown(100)
    drag.moveByDays(1)
    expect(currentStartOfA()).toBe('2026-03-03')
  })
})
