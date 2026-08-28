import { describe, expect, test } from 'vitest'

import {
  parseUserModelRatioRows,
  serializeUserModelRatioRows,
  transformFormDataToPayload,
  transformUserToFormDefaults,
  USER_FORM_DEFAULT_VALUES,
} from '../user-form'
import type { User } from '../../types'

describe('user model sell ratios', () => {
  test('parses a stored JSON map into editor rows', () => {
    expect(
      parseUserModelRatioRows('{"gpt-image-2":0.5,"sora-2":1.2}').map(
        ({ model, ratio }) => ({ model, ratio })
      )
    ).toEqual([
      { model: 'gpt-image-2', ratio: '0.5' },
      { model: 'sora-2', ratio: '1.2' },
    ])
  })

  test('serializes valid rows and rejects a negative ratio', () => {
    expect(
      serializeUserModelRatioRows([
        { id: 'a', model: 'gpt-image-2', ratio: '0' },
        { id: 'b', model: 'sora-2', ratio: '1.2' },
      ])
    ).toEqual({
      ok: true,
      value: JSON.stringify({ 'gpt-image-2': 0, 'sora-2': 1.2 }),
    })
    expect(
      serializeUserModelRatioRows([{ id: 'c', model: 'sora-2', ratio: '-1' }])
    ).toEqual({
      ok: false,
      message: 'Invalid model sell ratio',
    })
  })

  test('create and update payloads both include model_ratio', () => {
    const values = {
      ...USER_FORM_DEFAULT_VALUES,
      username: 'alice',
      model_ratio_rows: [{ id: 'd', model: 'sora-2', ratio: '1.2' }],
    }
    expect(USER_FORM_DEFAULT_VALUES.model_ratio_rows).toHaveLength(1)
    expect(transformFormDataToPayload(values).model_ratio).toBe(
      JSON.stringify({ 'sora-2': 1.2 })
    )
    expect(transformFormDataToPayload(values, 7).model_ratio).toBe(
      JSON.stringify({ 'sora-2': 1.2 })
    )
  })

  test('loads stored model_ratio when editing a user', () => {
    const defaults = transformUserToFormDefaults({
      id: 7,
      username: 'alice',
      display_name: 'Alice',
      quota: 0,
      used_quota: 0,
      request_count: 0,
      group: 'default',
      status: 1,
      role: 1,
      model_ratio: '{"sora-2":1.2}',
    } as User)
    expect(
      defaults.model_ratio_rows?.map(({ model, ratio }) => ({ model, ratio }))
    ).toEqual([{ model: 'sora-2', ratio: '1.2' }])
  })

  test('edit form shows one empty ratio row when the user has none saved', () => {
    const defaults = transformUserToFormDefaults({
      id: 7,
      username: 'alice',
      display_name: 'Alice',
      quota: 0,
      used_quota: 0,
      request_count: 0,
      group: 'default',
      status: 1,
      role: 1,
    } as User)
    expect(defaults.model_ratio_rows).toHaveLength(1)
    expect(defaults.model_ratio_rows?.[0]).toMatchObject({
      model: '',
      ratio: '1',
    })
  })
})
