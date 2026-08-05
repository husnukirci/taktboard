<script setup lang="ts">
import { computed, watchEffect } from 'vue'
import BoardToolbar from './components/BoardToolbar.vue'
import TimelineBoard from './components/TimelineBoard.vue'
import { useScenarioQuery } from './composables/useScenarioQuery'
import { useScheduleStore } from './state/scheduleStore'
import { moveAnnouncement } from './ui/announce'

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

const boardReady = computed(() => !isPending.value && error.value === null && taskCount.value > 0)

/** Screen-reader move feedback; empty until the first move (and after reset). */
const announcement = computed(() =>
  store.schedule === null ? null : moveAnnouncement(store.schedule, store.lastChangedIds),
)
</script>

<template>
  <main class="min-h-screen bg-slate-50 p-6">
    <header class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight text-slate-900">taktboard</h1>
        <p class="mt-1 text-sm text-slate-500">
          Construction schedule board — drag a task and watch downstream trades slip.
        </p>
      </div>
      <BoardToolbar v-if="boardReady" />
    </header>
    <div
      v-if="isPending"
      class="mt-6 flex items-center justify-center gap-3 rounded-lg border border-slate-200 bg-white p-10 text-sm text-slate-500"
    >
      <span
        class="size-4 rounded-full border-2 border-slate-300 border-t-slate-600 motion-safe:animate-spin"
        aria-hidden="true"
      />
      Loading scenario…
    </div>
    <div v-else-if="error" class="mt-6 rounded-lg border border-red-200 bg-red-50 p-6">
      <h2 class="text-sm font-semibold text-red-800">Couldn't load the scenario</h2>
      <p class="mt-1 text-sm whitespace-pre-line text-red-700">{{ error.message }}</p>
    </div>
    <div
      v-else-if="taskCount === 0"
      class="mt-6 rounded-lg border border-slate-200 bg-white p-10 text-center text-sm text-slate-500"
    >
      The scenario has no tasks.
    </div>
    <TimelineBoard v-else class="mt-6" />
    <p role="status" aria-live="polite" class="sr-only">{{ announcement }}</p>
  </main>
</template>
