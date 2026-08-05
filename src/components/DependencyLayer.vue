<script setup lang="ts">
import { computed } from 'vue'
import { diffDays } from '../domain'
import type { ISODate, Task } from '../domain'
import { useScheduleStore } from '../state/scheduleStore'
import { useUiStore } from '../state/uiStore'
import { dependencyPath } from '../ui/edgePath'
import { barRect, DAY_WIDTH_PX, LANE_HEIGHT_PX } from '../ui/geometry'

/**
 * One SVG over the whole grid, one path per finish-to-start dependency.
 * Everything derives from store state via geometry.ts — no DOM measurement —
 * so arrows can never drift from the HTML bars (ADR 4).
 */

const store = useScheduleStore()
const ui = useUiStore()

const range = computed(() => store.dateRange)

interface PlacedTask {
  task: Task
  laneIndex: number
}

const placedById = computed(() => {
  const map = new Map<string, PlacedTask>()
  store.tasksByTrade.forEach((lane, laneIndex) => {
    for (const task of lane.tasks) map.set(task.id, { task, laneIndex })
  })
  return map
})

/** The dragged bar renders from the preview; its arrows must follow it. */
function rectOf({ task, laneIndex }: PlacedTask, rangeStart: ISODate) {
  const drag = ui.drag
  const placedTask =
    drag !== null && drag.taskId === task.id ? { ...task, currentStart: drag.previewStart } : task
  return barRect(rangeStart, placedTask, laneIndex)
}

interface Edge {
  key: string
  d: string
}

const edges = computed<Edge[]>(() => {
  if (store.schedule === null || range.value === null) return []
  const result: Edge[] = []
  for (const { predecessorId, successorId } of store.schedule.dependencies) {
    const from = placedById.value.get(predecessorId)
    const to = placedById.value.get(successorId)
    // Validation guarantees both ends exist; the guard narrows the Map lookup.
    if (from === undefined || to === undefined) continue
    result.push({
      key: `${predecessorId}->${successorId}`,
      d: dependencyPath(rectOf(from, range.value.start), rectOf(to, range.value.start)),
    })
  }
  return result
})

const sizePx = computed(() => {
  if (range.value === null) return { width: 0, height: 0 }
  return {
    width: diffDays(range.value.start, range.value.end) * DAY_WIDTH_PX,
    height: store.tasksByTrade.length * LANE_HEIGHT_PX,
  }
})
</script>

<template>
  <svg
    class="pointer-events-none absolute top-[calc(var(--hdr-month-h)+var(--hdr-day-h))] left-(--trade-w)"
    :width="sizePx.width"
    :height="sizePx.height"
    :viewBox="`0 0 ${sizePx.width} ${sizePx.height}`"
    aria-hidden="true"
  >
    <defs>
      <marker
        id="dep-arrowhead"
        viewBox="0 0 8 8"
        refX="7"
        refY="4"
        markerWidth="7"
        markerHeight="7"
        orient="auto"
      >
        <path d="M 0 0 L 8 4 L 0 8 z" class="fill-slate-400" />
      </marker>
    </defs>
    <path
      v-for="edge in edges"
      :key="edge.key"
      :d="edge.d"
      marker-end="url(#dep-arrowhead)"
      class="fill-none stroke-slate-400 stroke-[1.5]"
    />
  </svg>
</template>
