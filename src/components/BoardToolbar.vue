<script setup lang="ts">
import { useScheduleStore } from '../state/scheduleStore'

const store = useScheduleStore()
</script>

<template>
  <div class="flex items-center gap-2">
    <button
      type="button"
      class="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
      @click="store.reset()"
    >
      Reset schedule
    </button>
  </div>
</template>
