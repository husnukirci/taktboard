<script setup lang="ts">
import { computed } from 'vue'
import type { ISODate, Task } from '../domain'
import { useTaskDrag } from '../composables/useTaskDrag'
import { useUiStore } from '../state/uiStore'
import { delayLevel, type DelayLevel } from '../ui/delayLevel'
import { barGridColumn, formatDayRange } from '../ui/geometry'

const props = defineProps<{
  task: Task
  rangeStart: ISODate
  /** Grid row of the trade lane this bar sits in. */
  gridRow: number
  /** Days late vs. baseline, from the store's `delayOf`. */
  delayDays: number
  /** True when the last move pushed this task (and it wasn't the moved one). */
  rippled: boolean
  /** Move counter; re-keys the pulse so consecutive moves replay it. */
  rippleSeq: number
}>()

const ui = useUiStore()

const { onPointerDown, cancelDrag, moveByDays, isDragging, previewStart } = useTaskDrag({
  taskId: () => props.task.id,
  currentStart: () => props.task.currentStart,
  minStart: () => props.rangeStart,
})

const BAR_STYLE: Record<DelayLevel, string> = {
  ok: 'bg-(--ok) text-white',
  warn: 'bg-(--warn) text-amber-950',
  late: 'bg-(--late) text-white',
}

const barClass = computed(() => BAR_STYLE[delayLevel(props.delayDays)])

/** Only this bar renders from the drag preview; all others follow the store. */
const barColumn = computed(() =>
  barGridColumn(
    props.rangeStart,
    previewStart.value === null ? props.task : { ...props.task, currentStart: previewStart.value },
  ),
)

const delayText = computed(() => {
  const days = Math.abs(props.delayDays)
  const unit = days === 1 ? 'day' : 'days'
  if (props.delayDays > 0) return `${days} ${unit} late`
  if (props.delayDays < 0) return `${days} ${unit} early`
  return 'on time'
})

const ariaLabel = computed(
  () =>
    `${props.task.name}, ${formatDayRange(props.task.currentStart, props.task.durationDays)}, ` +
    delayText.value,
)
</script>

<template>
  <div
    v-if="delayDays !== 0"
    :style="{ gridColumn: barGridColumn(rangeStart, task, 'baseline'), gridRow }"
    class="pointer-events-none h-8 self-center rounded-md border-2 border-dashed border-slate-400 opacity-40"
    aria-hidden="true"
  />
  <div
    :style="{ gridColumn: barColumn, gridRow }"
    tabindex="0"
    :aria-label="ariaLabel"
    class="relative flex h-8 min-w-0 touch-none select-none items-center gap-1 self-center rounded-md px-2 text-xs font-medium shadow-sm outline-offset-2 focus-visible:outline-2 focus-visible:outline-blue-600"
    :class="[barClass, isDragging ? 'z-10 cursor-grabbing shadow-lg' : 'cursor-grab']"
    @pointerdown="onPointerDown"
    @pointerenter="ui.setHovered(task.id)"
    @pointerleave="ui.setHovered(null)"
    @keydown.esc="cancelDrag"
    @keydown.left.prevent="moveByDays(-1)"
    @keydown.right.prevent="moveByDays(1)"
  >
    <span class="truncate">{{ task.name }}</span>
    <span v-if="delayDays > 0" class="ml-auto shrink-0 rounded-sm bg-black/20 px-1">
      +{{ delayDays }}d
    </span>
    <div
      v-if="rippled"
      :key="rippleSeq"
      class="pointer-events-none absolute inset-0 rounded-md bg-white opacity-0 motion-safe:animate-ripple"
      aria-hidden="true"
    />
  </div>
</template>
