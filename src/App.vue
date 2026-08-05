<script setup lang="ts">
import { computed, watchEffect } from 'vue'
import TimelineBoard from './components/TimelineBoard.vue'
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
</script>

<template>
  <main class="p-6">
    <h1 class="text-2xl font-semibold">taktboard</h1>
    <p v-if="isPending" class="mt-2 text-gray-600">Loading scenario…</p>
    <p v-else-if="error" class="mt-2 whitespace-pre-line text-red-700">{{ error.message }}</p>
    <p v-else-if="taskCount === 0" class="mt-2 text-gray-600">The scenario has no tasks.</p>
    <TimelineBoard v-else class="mt-4" />
  </main>
</template>
