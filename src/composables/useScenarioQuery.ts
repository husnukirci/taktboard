/**
 * Server state for the scenario. vue-query owns fetching, caching and retry;
 * components hand the result to the schedule store and never read it twice.
 */

import { useQuery } from '@tanstack/vue-query'
import { ScheduleValidationError } from '../domain'
import { ApiError, getScenario } from '../api/client'

export function useScenarioQuery() {
  return useQuery({
    queryKey: ['scenario'],
    queryFn: getScenario,
    // A static file never goes stale within a session.
    staleTime: Infinity,
    // 4xx and validation failures are deterministic — retrying can't help.
    retry: (failureCount, error) => {
      if (error instanceof ApiError && error.status < 500) return false
      if (error instanceof ScheduleValidationError) return false
      return failureCount < 3
    },
  })
}
