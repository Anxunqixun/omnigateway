import { describe, expect, test } from 'vitest'

import { shouldNavigateToServerErrorPage } from '../query-error'

describe('shouldNavigateToServerErrorPage', () => {
  test('keeps dashboard data failures on the current page', () => {
    expect(
      shouldNavigateToServerErrorPage('/api/data/flow/self', 500)
    ).toBe(false)
    expect(shouldNavigateToServerErrorPage('/api/data/flow', 500)).toBe(false)
  })

  test('still sends other HTTP 500 responses to the error page', () => {
    expect(shouldNavigateToServerErrorPage('/api/user/', 500)).toBe(true)
    expect(shouldNavigateToServerErrorPage(undefined, 500)).toBe(true)
  })

  test('ignores non-500 statuses', () => {
    expect(shouldNavigateToServerErrorPage('/api/data/flow/self', 400)).toBe(
      false
    )
  })
})
