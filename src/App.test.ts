import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { VueQueryPlugin } from '@tanstack/vue-query'
import App from './App.vue'
import scenarioSeed from '../public/scenario.json'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('App', () => {
  it('boots through loading into the scenario summary', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: () => Promise.resolve(scenarioSeed),
      }),
    )

    const wrapper = mount(App, {
      global: { plugins: [createPinia(), VueQueryPlugin] },
    })

    expect(wrapper.text()).toContain('taktboard')
    expect(wrapper.text()).toContain('Loading scenario')

    await vi.waitFor(() => {
      expect(wrapper.text()).toContain('12 tasks · 2026-03-02 → 2026-03-29')
    })
  })
})
