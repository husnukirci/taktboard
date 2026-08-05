/**
 * Transient interaction state — what the pointer/keyboard is doing right now.
 * Deliberately separate from scheduleStore: dropping a drag must never be
 * able to corrupt schedule data.
 */

import { ref } from 'vue'
import { defineStore } from 'pinia'
import type { ISODate } from '../domain'

export interface DragState {
  taskId: string
  /** Day the bar would land on if dropped now; snapped by the drag layer. */
  previewStart: ISODate
}

export const useUiStore = defineStore('ui', () => {
  const drag = ref<DragState | null>(null)
  const hoveredTaskId = ref<string | null>(null)
  const selectedTaskId = ref<string | null>(null)

  function startDrag(taskId: string, previewStart: ISODate): void {
    drag.value = { taskId, previewStart }
  }

  function updateDrag(previewStart: ISODate): void {
    if (drag.value === null) return
    drag.value = { ...drag.value, previewStart }
  }

  function endDrag(): void {
    drag.value = null
  }

  function setHovered(taskId: string | null): void {
    hoveredTaskId.value = taskId
  }

  function setSelected(taskId: string | null): void {
    selectedTaskId.value = taskId
  }

  return {
    drag,
    hoveredTaskId,
    selectedTaskId,
    startDrag,
    updateDrag,
    endDrag,
    setHovered,
    setSelected,
  }
})
