/**
 * Typed boundary to the "backend". Tier 1 serves a static file from /public;
 * the signature is what a real API client would expose, so swapping in a
 * server later only changes this module.
 */

import { validateSchedule } from '../domain'
import type { Schedule } from '../domain'

/** A non-OK HTTP response, carrying the status for the UI to explain. */
export class ApiError extends Error {
  readonly status: number

  constructor(status: number, statusText: string) {
    super(`GET /scenario.json failed: ${status} ${statusText}`)
    this.name = 'ApiError'
    this.status = status
  }
}

/** Fetch the seed scenario and validate it into a domain `Schedule`. */
export async function getScenario(): Promise<Schedule> {
  const res = await fetch('/scenario.json')
  if (!res.ok) {
    throw new ApiError(res.status, res.statusText)
  }
  const body: unknown = await res.json()
  return validateSchedule(body)
}
