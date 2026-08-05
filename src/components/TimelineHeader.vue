<script setup lang="ts">
import { computed } from 'vue'
import type { ISODate } from '../domain'
import { dayOfMonth, gridColumnOfDate, isWeekend, monthSpans } from '../ui/geometry'

const props = defineProps<{
  days: ISODate[]
  rangeStart: ISODate
}>()

const months = computed(() => monthSpans(props.days))
</script>

<template>
  <!-- Corner cell: occludes bars sliding under both sticky axes. -->
  <div
    class="sticky top-0 left-0 z-20 col-start-1 row-span-2 row-start-1 border-r border-b border-slate-200 bg-white"
  />
  <div
    v-for="m in months"
    :key="m.month"
    :style="{ gridColumn: `${m.gridColumnStart} / span ${m.span}`, gridRow: 1 }"
    class="sticky top-0 z-10 flex items-center bg-white px-2 text-xs font-semibold text-slate-500"
  >
    <!-- Keeps the label readable while its month span scrolls under the trade column. -->
    <span class="sticky left-(--trade-w)">{{ m.label }}</span>
  </div>
  <div
    v-for="day in days"
    :key="day"
    :style="{ gridColumn: gridColumnOfDate(rangeStart, day), gridRow: 2 }"
    class="sticky top-6 z-10 flex items-center justify-center border-b border-slate-200 text-xs text-slate-600"
    :class="isWeekend(day) ? 'bg-slate-100' : 'bg-white'"
  >
    {{ dayOfMonth(day) }}
  </div>
</template>
