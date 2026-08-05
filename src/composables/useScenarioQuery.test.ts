import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent } from 'vue'
import { mount } from '@vue/test-utils'
import { VueQueryPlugin } from '@tanstack/vue-query'
import { useScenarioQuery } from './useScenarioQuery'

/** Mounts the composable inside a throwaway component and returns the query. */
function mountQuery() {
  let query!: ReturnType<typeof useScenarioQuery>
  const Host = defineComponent({
    setup() {
      query = useScenarioQuery()
      return () => null
    },
  })
  mount(Host, { global: { plugins: [VueQueryPlugin] } })
  return query
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('useScenarioQuery', () => {
  it('does not retry a 404 — the failure is deterministic', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      json: () => Promise.resolve(undefined),
    })
    vi.stubGlobal('fetch', fetchMock)

    const query = mountQuery()

    await vi.waitFor(() => {
      expect(query.error.value?.message).toContain('404')
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('does not retry a schedule validation failure', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: () => Promise.resolve({ trades: {}, tasks: {}, dependencies: 'nope' }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const query = mountQuery()

    await vi.waitFor(() => {
      expect(query.error.value).not.toBeNull()
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
