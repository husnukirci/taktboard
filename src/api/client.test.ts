import { afterEach, describe, expect, it, vi } from 'vitest'
import { ScheduleValidationError, addDays } from '../domain'
import { ApiError, getScenario } from './client'
import scenarioSeed from '../../public/scenario.json'

function stubFetch(response: {
  ok: boolean
  status?: number
  statusText?: string
  body?: unknown
}) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: response.ok,
      status: response.status ?? 200,
      statusText: response.statusText ?? 'OK',
      json: () => Promise.resolve(response.body),
    }),
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('getScenario', () => {
  it('fetches /scenario.json and returns the validated schedule', async () => {
    stubFetch({ ok: true, body: scenarioSeed })

    const schedule = await getScenario()

    expect(fetch).toHaveBeenCalledWith('/scenario.json')
    expect(Object.keys(schedule.tasks)).toHaveLength(12)
    expect(Object.keys(schedule.trades)).toHaveLength(4)
  })

  it('throws a typed ApiError on a non-OK response', async () => {
    stubFetch({ ok: false, status: 404, statusText: 'Not Found' })

    const call = getScenario()

    await expect(call).rejects.toBeInstanceOf(ApiError)
    await expect(call).rejects.toMatchObject({ status: 404 })
  })

  it('rejects an invalid payload with a ScheduleValidationError', async () => {
    stubFetch({ ok: true, body: { trades: {}, tasks: 'nope', dependencies: [] } })

    await expect(getScenario()).rejects.toBeInstanceOf(ScheduleValidationError)
  })
})

describe('seed scenario', () => {
  it('has exactly one pre-slipped task, by two days', () => {
    const slipped = Object.values(scenarioSeed.tasks).filter(
      (t) => t.currentStart !== t.baselineStart,
    )
    expect(slipped).toHaveLength(1)
    expect(slipped[0]?.id).toBe('task-rough-elec')
    expect(slipped[0] && addDays(slipped[0].baselineStart, 2)).toBe(slipped[0]?.currentStart)
  })

  it('satisfies every finish-to-start constraint in both baseline and current dates', () => {
    for (const { predecessorId, successorId } of scenarioSeed.dependencies) {
      const pred = scenarioSeed.tasks[predecessorId as keyof typeof scenarioSeed.tasks]
      const succ = scenarioSeed.tasks[successorId as keyof typeof scenarioSeed.tasks]
      expect(pred, `missing predecessor ${predecessorId}`).toBeDefined()
      expect(succ, `missing successor ${successorId}`).toBeDefined()
      for (const start of ['baselineStart', 'currentStart'] as const) {
        const predEnd = addDays(pred[start], pred.durationDays)
        expect(
          succ[start] >= predEnd,
          `${successorId} ${start} ${succ[start]} starts before ${predecessorId} ends ${predEnd}`,
        ).toBe(true)
      }
    }
  })
})
