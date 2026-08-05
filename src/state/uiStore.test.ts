import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useUiStore } from './uiStore'

beforeEach(() => {
  setActivePinia(createPinia())
})

describe('useUiStore', () => {
  it('starts with nothing dragged, hovered or selected', () => {
    const store = useUiStore()

    expect(store.drag).toBeNull()
    expect(store.hoveredTaskId).toBeNull()
    expect(store.selectedTaskId).toBeNull()
  })

  it('tracks a drag through start, update and end', () => {
    const store = useUiStore()

    store.startDrag('task-a', '2026-03-02')
    expect(store.drag).toEqual({ taskId: 'task-a', previewStart: '2026-03-02' })

    store.updateDrag('2026-03-05')
    expect(store.drag).toEqual({ taskId: 'task-a', previewStart: '2026-03-05' })

    store.endDrag()
    expect(store.drag).toBeNull()
  })

  it('ignores drag updates when no drag is active', () => {
    const store = useUiStore()

    store.updateDrag('2026-03-05')

    expect(store.drag).toBeNull()
  })

  it('sets and clears hover and selection', () => {
    const store = useUiStore()

    store.setHovered('task-a')
    store.setSelected('task-b')
    expect(store.hoveredTaskId).toBe('task-a')
    expect(store.selectedTaskId).toBe('task-b')

    store.setHovered(null)
    store.setSelected(null)
    expect(store.hoveredTaskId).toBeNull()
    expect(store.selectedTaskId).toBeNull()
  })
})
