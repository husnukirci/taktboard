<script setup lang="ts">
import type { Trade } from '../domain'

defineProps<{
  trade: Trade
  /** Grid row of this trade's lane. */
  gridRow: number
}>()
</script>

<template>
  <div
    :style="{ gridRow }"
    class="sticky left-0 z-10 col-start-1 flex items-center border-r border-slate-200 bg-white px-3 text-sm font-medium text-slate-700"
  >
    {{ trade.name }}
  </div>
</template>
