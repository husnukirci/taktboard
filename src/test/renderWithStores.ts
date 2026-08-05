/**
 * Mounts a component with a fresh Pinia per test. `seedStores` runs with that
 * Pinia active, so tests can grab stores and load fixtures before mounting.
 */

import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import type { Component } from 'vue'

export function renderWithStores(component: Component, seedStores?: () => void) {
  const pinia = createPinia()
  setActivePinia(pinia)
  seedStores?.()
  return mount(component, { global: { plugins: [pinia] } })
}
