import { describe, expect, test } from 'vitest'

import { formatDynamicUnitPrice } from '../dynamic-price'
import { getUserModelSellRatio } from '../model-helpers'
import { formatPrice, formatRequestPrice } from '../price'
import type { PricingModel } from '../../types'

function tokenModel(ratio: number): PricingModel {
  return {
    id: 1,
    model_name: 'sora-2',
    quota_type: 0,
    model_ratio: 1,
    completion_ratio: 1,
    enable_groups: ['default'],
    group_ratio: { default: 1 },
    user_model_ratio: ratio,
  }
}

function requestModel(ratio: number): PricingModel {
  return {
    id: 2,
    model_name: 'sora-2',
    quota_type: 1,
    model_ratio: 0,
    completion_ratio: 1,
    model_price: 0.1,
    enable_groups: ['default'],
    group_ratio: { default: 1 },
    user_model_ratio: ratio,
  }
}

describe('model square user sell ratio', () => {
  test('treats a missing ratio as 1 and keeps an explicit 0', () => {
    expect(getUserModelSellRatio({} as PricingModel)).toBe(1)
    expect(getUserModelSellRatio(tokenModel(0))).toBe(0)
    expect(getUserModelSellRatio(tokenModel(0.5))).toBe(0.5)
  })

  test('token and request plaza prices multiply the user model ratio', () => {
    expect(formatPrice(tokenModel(1), 'input', 'M')).not.toBe(
      formatPrice(tokenModel(0.5), 'input', 'M')
    )
    expect(formatRequestPrice(requestModel(0.5))).not.toBe(
      formatRequestPrice(requestModel(1))
    )
    expect(formatPrice(tokenModel(0), 'input', 'M')).toMatch(/0/)
  })

  test('dynamic plaza unit prices also multiply the user model ratio', () => {
    expect(
      formatDynamicUnitPrice(2, {
        tokenUnit: 'M',
        groupRatioMultiplier: 1,
        userModelRatioMultiplier: 0.5,
      })
    ).not.toBe(
      formatDynamicUnitPrice(2, {
        tokenUnit: 'M',
        groupRatioMultiplier: 1,
        userModelRatioMultiplier: 1,
      })
    )
  })
})
