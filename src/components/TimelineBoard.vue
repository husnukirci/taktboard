<script setup lang="ts">
import { computed } from 'vue'
import { addDays, eachDay } from '../domain'
import type { ISODate } from '../domain'
import { useScheduleStore } from '../state/scheduleStore'
import { gridColumnOfDate, isWeekend } from '../ui/geometry'
import TaskBar from './TaskBar.vue'
import TimelineHeader from './TimelineHeader.vue'
import TradeLabel from './TradeLabel.vue'

/** Month labels + day-of-month labels precede the trade lanes. */
const HEADER_ROWS = 2

const store = useScheduleStore()

const range = computed(() => store.dateRange)

const days = computed<ISODate[]>(() => {
  if (range.value === null) return []
  // dateRange's end is exclusive, so the last day column is end - 1.
  return eachDay(range.value.start, addDays(range.value.end, -1))
})

const weekendDays = computed(() => days.value.filter(isWeekend))

const lanes = computed(() => store.tasksByTrade)

// Track counts depend on the loaded scenario — computed geometry, not styling.
const gridStyle = computed(() => ({
  gridTemplateColumns: `var(--trade-w) repeat(${days.value.length}, var(--day-w))`,
  gridTemplateRows: `var(--hdr-month-h) var(--hdr-day-h) repeat(${lanes.value.length}, var(--lane-h))`,
}))

function laneRow(laneIndex: number): number {
  return laneIndex + HEADER_ROWS + 1
}
</script>

<template>
  <div
    v-if="range !== null"
    role="region"
    aria-label="Project timeline"
    class="overflow-auto rounded-lg border border-slate-200"
  >
    <div class="grid w-max bg-white" :style="gridStyle">
      <TimelineHeader :days="days" :range-start="range.start" />
      <div
        v-for="day in weekendDays"
        :key="day"
        :style="{
          gridColumn: gridColumnOfDate(range.start, day),
          gridRow: `${HEADER_ROWS + 1} / -1`,
        }"
        class="bg-slate-100/70"
        aria-hidden="true"
      />
      <div
        v-for="(lane, laneIndex) in lanes"
        :key="lane.trade.id"
        :style="{ gridColumn: '1 / -1', gridRow: laneRow(laneIndex) }"
        class="border-b border-slate-100"
        aria-hidden="true"
      />
      <template v-for="(lane, laneIndex) in lanes" :key="lane.trade.id">
        <TradeLabel :trade="lane.trade" :grid-row="laneRow(laneIndex)" />
        <TaskBar
          v-for="task in lane.tasks"
          :key="task.id"
          :task="task"
          :range-start="range.start"
          :grid-row="laneRow(laneIndex)"
          :delay-days="store.delayOf(task.id)"
          :rippled="store.rippledIds.includes(task.id)"
          :ripple-seq="store.moveSeq"
        />
      </template>
    </div>
  </div>
</template>
