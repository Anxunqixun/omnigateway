/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
import { safeJsonParse } from '@/features/system-settings/utils/json-parser'

export type DrawerPricingMode =
  | 'per-token'
  | 'per-request'
  | 'tiered_expr'
  | 'formula'

export type DrawerPricingFields = {
  price: string
  ratio: string
  cacheRatio: string
  completionRatio: string
  imageRatio: string
  audioRatio: string
  audioCompletionRatio: string
}

export type DrawerPricingConfig = {
  mode: DrawerPricingMode
  fields: DrawerPricingFields
  promptPrice: string
  completionPrice: string
  advancedOpen: boolean
  billingExpr: string
}

export type DrawerPricingMaps = {
  ModelPrice: Record<string, number>
  ModelRatio: Record<string, number>
  CacheRatio: Record<string, number>
  CompletionRatio: Record<string, number>
  ImageRatio: Record<string, number>
  AudioRatio: Record<string, number>
  AudioCompletionRatio: Record<string, number>
  BillingMode: Record<string, string>
  BillingExpr: Record<string, string>
}

export const EMPTY_DRAWER_PRICING_FIELDS: DrawerPricingFields = {
  price: '',
  ratio: '',
  cacheRatio: '',
  completionRatio: '',
  imageRatio: '',
  audioRatio: '',
  audioCompletionRatio: '',
}

export const EMPTY_DRAWER_PRICING_CONFIG: DrawerPricingConfig = {
  mode: 'per-token',
  fields: EMPTY_DRAWER_PRICING_FIELDS,
  promptPrice: '',
  completionPrice: '',
  advancedOpen: false,
  billingExpr: '',
}

const NUMBER_MAP_KEYS = [
  'ModelPrice',
  'ModelRatio',
  'CacheRatio',
  'CompletionRatio',
  'ImageRatio',
  'AudioRatio',
  'AudioCompletionRatio',
] as const

type NumberMapKey = (typeof NUMBER_MAP_KEYS)[number]

export function isExprSellMode(
  mode: string | undefined
): mode is 'tiered_expr' | 'formula' {
  return mode === 'tiered_expr' || mode === 'formula'
}

function lookupNumber(
  rawMap: string | undefined,
  modelName: string
): number | undefined {
  if (!rawMap || !modelName) return undefined
  return safeJsonParse<Record<string, number>>(rawMap, {
    fallback: {},
    silent: true,
  })[modelName]
}

function lookupString(
  rawMap: string | undefined,
  modelName: string
): string | undefined {
  if (!rawMap || !modelName) return undefined
  return safeJsonParse<Record<string, string>>(rawMap, {
    fallback: {},
    silent: true,
  })[modelName]
}

export function parseDrawerPricingMaps(input: {
  ModelPrice?: string
  ModelRatio?: string
  CacheRatio?: string
  CompletionRatio?: string
  ImageRatio?: string
  AudioRatio?: string
  AudioCompletionRatio?: string
  BillingMode?: string
  BillingExpr?: string
}): DrawerPricingMaps {
  const numberMap = (raw?: string) =>
    safeJsonParse<Record<string, number>>(raw || '', {
      fallback: {},
      silent: true,
    })
  const stringMap = (raw?: string) =>
    safeJsonParse<Record<string, string>>(raw || '', {
      fallback: {},
      silent: true,
    })
  return {
    ModelPrice: numberMap(input.ModelPrice),
    ModelRatio: numberMap(input.ModelRatio),
    CacheRatio: numberMap(input.CacheRatio),
    CompletionRatio: numberMap(input.CompletionRatio),
    ImageRatio: numberMap(input.ImageRatio),
    AudioRatio: numberMap(input.AudioRatio),
    AudioCompletionRatio: numberMap(input.AudioCompletionRatio),
    BillingMode: stringMap(input.BillingMode),
    BillingExpr: stringMap(input.BillingExpr),
  }
}

export function readDrawerPricingConfig(
  settings: {
    ModelPrice?: string
    ModelRatio?: string
    CacheRatio?: string
    CompletionRatio?: string
    ImageRatio?: string
    AudioRatio?: string
    AudioCompletionRatio?: string
    'billing_setting.billing_mode'?: string
    'billing_setting.billing_expr'?: string
  } | null,
  modelName: string
): DrawerPricingConfig {
  if (!settings || !modelName) return EMPTY_DRAWER_PRICING_CONFIG

  const billingMode = lookupString(
    settings['billing_setting.billing_mode'],
    modelName
  )
  const billingExpr = lookupString(
    settings['billing_setting.billing_expr'],
    modelName
  )
  if (isExprSellMode(billingMode)) {
    return {
      ...EMPTY_DRAWER_PRICING_CONFIG,
      mode: billingMode,
      billingExpr: billingExpr || '',
    }
  }

  const price = lookupNumber(settings.ModelPrice, modelName)
  const ratio = lookupNumber(settings.ModelRatio, modelName)
  const cacheRatio = lookupNumber(settings.CacheRatio, modelName)
  const completionRatio = lookupNumber(settings.CompletionRatio, modelName)
  const imageRatio = lookupNumber(settings.ImageRatio, modelName)
  const audioRatio = lookupNumber(settings.AudioRatio, modelName)
  const audioCompletionRatio = lookupNumber(
    settings.AudioCompletionRatio,
    modelName
  )

  if (price !== undefined && price !== null) {
    return {
      ...EMPTY_DRAWER_PRICING_CONFIG,
      mode: 'per-request',
      fields: { ...EMPTY_DRAWER_PRICING_FIELDS, price: price.toString() },
    }
  }

  let promptPrice = ''
  let completionPrice = ''
  if (ratio !== undefined && ratio !== null) {
    const tokenPrice = ratio * 2
    promptPrice = tokenPrice.toString()
    if (completionRatio !== undefined && completionRatio !== null) {
      completionPrice = (tokenPrice * completionRatio).toString()
    }
  }

  return {
    mode: 'per-token',
    fields: {
      price: '',
      ratio: ratio?.toString() || '',
      cacheRatio: cacheRatio?.toString() || '',
      completionRatio: completionRatio?.toString() || '',
      imageRatio: imageRatio?.toString() || '',
      audioRatio: audioRatio?.toString() || '',
      audioCompletionRatio: audioCompletionRatio?.toString() || '',
    },
    promptPrice,
    completionPrice,
    advancedOpen: [
      cacheRatio,
      imageRatio,
      audioRatio,
      audioCompletionRatio,
    ].some((value) => value !== undefined && value !== null),
    billingExpr: '',
  }
}

export function hasDrawerPricingConfig(input: {
  mode: DrawerPricingMode
  fields: DrawerPricingFields
  billingExpr: string
}): boolean {
  if (isExprSellMode(input.mode)) {
    return input.billingExpr.trim() !== ''
  }
  if (input.mode === 'per-request') {
    return input.fields.price !== ''
  }
  return Boolean(
    input.fields.ratio ||
      input.fields.cacheRatio ||
      input.fields.completionRatio ||
      input.fields.imageRatio ||
      input.fields.audioRatio ||
      input.fields.audioCompletionRatio
  )
}

function deleteModelFromMaps(maps: DrawerPricingMaps, modelName: string) {
  for (const key of NUMBER_MAP_KEYS) {
    delete maps[key][modelName]
  }
  delete maps.BillingMode[modelName]
  delete maps.BillingExpr[modelName]
}

function parseOptionalNumber(value: string): number | undefined {
  if (value === '') return undefined
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

export function applyDrawerPricing(
  maps: DrawerPricingMaps,
  input: {
    modelName: string
    oldModelName?: string
    loadedPricingName: string
    mode: DrawerPricingMode
    fields: DrawerPricingFields
    billingExpr: string
  }
): DrawerPricingMaps {
  const next: DrawerPricingMaps = {
    ModelPrice: { ...maps.ModelPrice },
    ModelRatio: { ...maps.ModelRatio },
    CacheRatio: { ...maps.CacheRatio },
    CompletionRatio: { ...maps.CompletionRatio },
    ImageRatio: { ...maps.ImageRatio },
    AudioRatio: { ...maps.AudioRatio },
    AudioCompletionRatio: { ...maps.AudioCompletionRatio },
    BillingMode: { ...maps.BillingMode },
    BillingExpr: { ...maps.BillingExpr },
  }

  if (input.oldModelName && input.oldModelName !== input.modelName) {
    deleteModelFromMaps(next, input.oldModelName)
  }

  const hasConfig = hasDrawerPricingConfig(input)
  if (hasConfig || input.modelName === input.loadedPricingName) {
    deleteModelFromMaps(next, input.modelName)
  }

  if (!hasConfig) {
    return next
  }

  if (isExprSellMode(input.mode)) {
    next.BillingMode[input.modelName] = input.mode
    next.BillingExpr[input.modelName] = input.billingExpr.trim()
    return next
  }

  if (input.mode === 'per-request') {
    const price = parseOptionalNumber(input.fields.price)
    if (price !== undefined) {
      next.ModelPrice[input.modelName] = price
    }
    return next
  }

  const assignments: Array<[NumberMapKey, string]> = [
    ['ModelRatio', input.fields.ratio],
    ['CacheRatio', input.fields.cacheRatio],
    ['CompletionRatio', input.fields.completionRatio],
    ['ImageRatio', input.fields.imageRatio],
    ['AudioRatio', input.fields.audioRatio],
    ['AudioCompletionRatio', input.fields.audioCompletionRatio],
  ]
  for (const [key, raw] of assignments) {
    const value = parseOptionalNumber(raw)
    if (value !== undefined) {
      next[key][input.modelName] = value
    }
  }
  return next
}
