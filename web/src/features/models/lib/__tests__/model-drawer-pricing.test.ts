import { describe, expect, test } from 'vitest'

import {
  applyDrawerPricing,
  hasDrawerPricingConfig,
  parseDrawerPricingMaps,
  readDrawerPricingConfig,
} from '../model-drawer-pricing'

describe('model drawer pricing', () => {
  test('loads formula mode from billing maps instead of leftover token price', () => {
    const config = readDrawerPricingConfig(
      {
        ModelPrice: '{"sora-2":0.1}',
        ModelRatio: '{"sora-2":1}',
        'billing_setting.billing_mode': '{"sora-2":"formula"}',
        'billing_setting.billing_expr': '{"sora-2":"v2:0.01"}',
      },
      'sora-2'
    )
    expect(config.mode).toBe('formula')
    expect(config.billingExpr).toBe('v2:0.01')
    expect(config.fields.price).toBe('')
  })

  test('loads official expression mode from billing maps', () => {
    const config = readDrawerPricingConfig(
      {
        'billing_setting.billing_mode': '{"sora-2":"tiered_expr"}',
        'billing_setting.billing_expr': '{"sora-2":"usage(\\"prompt\\")"}',
      },
      'sora-2'
    )
    expect(config.mode).toBe('tiered_expr')
    expect(config.billingExpr).toBe('usage("prompt")')
  })

  test('saves formula and clears token and request prices for that model', () => {
    const maps = parseDrawerPricingMaps({
      ModelPrice: '{"sora-2":0.1,"keep":0.2}',
      ModelRatio: '{"sora-2":1}',
      BillingMode: '{"keep":"per-token"}',
      BillingExpr: '{}',
    })
    const next = applyDrawerPricing(maps, {
      modelName: 'sora-2',
      loadedPricingName: 'sora-2',
      mode: 'formula',
      fields: {
        price: '0.1',
        ratio: '1',
        cacheRatio: '',
        completionRatio: '',
        imageRatio: '',
        audioRatio: '',
        audioCompletionRatio: '',
      },
      billingExpr: 'v2:num(param("n"),1)*0.02',
    })
    expect(next.ModelPrice).toEqual({ keep: 0.2 })
    expect(next.ModelRatio).toEqual({})
    expect(next.BillingMode).toEqual({
      keep: 'per-token',
      'sora-2': 'formula',
    })
    expect(next.BillingExpr['sora-2']).toBe('v2:num(param("n"),1)*0.02')
  })

  test('treats an empty formula as unset so a loaded name can be cleared', () => {
    expect(
      hasDrawerPricingConfig({
        mode: 'formula',
        fields: {
          price: '',
          ratio: '',
          cacheRatio: '',
          completionRatio: '',
          imageRatio: '',
          audioRatio: '',
          audioCompletionRatio: '',
        },
        billingExpr: '   ',
      })
    ).toBe(false)
  })
})
