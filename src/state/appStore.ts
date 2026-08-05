import { defineStore } from 'pinia'

/**
 * Placeholder store proving the Pinia wiring.
 * Deleted in Phase 2 when the real schedule/ui stores land.
 */
export const useAppStore = defineStore('app', {
  state: () => ({ ready: false }),
})
