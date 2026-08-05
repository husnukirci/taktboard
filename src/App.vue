<script setup lang="ts">
import { computed, watchEffect } from 'vue'
import { useScenarioQuery } from './composables/useScenarioQuery'
import { useScheduleStore } from './state/scheduleStore'

const { data, error, isPending } = useScenarioQuery()
const store = useScheduleStore()

// The one place query data crosses into client state.
watchEffect(() => {
  if (data.value !== undefined) {
    store.loadScenario(data.value)
  }
})

const taskCount = computed(() =>
  store.schedule === null ? 0 : Object.keys(store.schedule.tasks).length,
)

// Temporary debug dump; replaced by the timeline board in Phase 3.
const summary = computed(() => {
  const range = store.dateRange
  if (range === null) return ''
  return `${taskCount.value} tasks · ${range.start} → ${range.end}`
})
</script>

<template>
  <main class="mx-auto max-w-xl p-8">
    <h1 class="text-2xl font-semibold">taktboard</h1>
    <p v-if="isPending" class="mt-2 text-gray-600">Loading scenario…</p>
    <p v-else-if="error" class="mt-2 whitespace-pre-line text-red-700">{{ error.message }}</p>
    <p v-else-if="taskCount === 0" class="mt-2 text-gray-600">The scenario has no tasks.</p>
    <pre v-else class="mt-2 rounded bg-gray-100 p-4 text-sm">{{ summary }}</pre>
  </main>
</template>
