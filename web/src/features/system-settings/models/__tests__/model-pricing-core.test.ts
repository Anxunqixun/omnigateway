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
import { describe, expect, test } from 'vitest'

import {
  EMPTY_LANE_ENABLED,
  EMPTY_LANE_PRICES,
  buildPreviewRows,
} from '../model-pricing-core'

describe('model pricing preview', () => {
  test('shows an independent cost expression for token and request modes', () => {
    const values = {
      name: 'ad-seedance-2.0-480p',
      price: '0.056',
      ratio: '',
      cacheRatio: '',
      createCacheRatio: '',
      completionRatio: '',
      imageRatio: '',
      audioRatio: '',
      audioCompletionRatio: '',
    }

    const tokenRows = buildPreviewRows(
      values,
      'per-token',
      '',
      '',
      '3',
      EMPTY_LANE_PRICES,
      EMPTY_LANE_ENABLED,
      'v2:0.02',
      (key) => key
    )
    expect(tokenRows.some((row) => row.key === 'cost' && row.value === 'v2:0.02')).toBe(
      true
    )

    const requestRows = buildPreviewRows(
      values,
      'per-request',
      '',
      '',
      '',
      EMPTY_LANE_PRICES,
      EMPTY_LANE_ENABLED,
      'v2:0.02',
      (key) => key
    )
    expect(
      requestRows.some((row) => row.key === 'cost' && row.value === 'v2:0.02')
    ).toBe(true)
  })

  test('shows raw site formula without combining request rules', () => {
    const rows = buildPreviewRows(
      {
        name: 'sora-2',
        price: '',
        ratio: '',
        cacheRatio: '',
        createCacheRatio: '',
        completionRatio: '',
        imageRatio: '',
        audioRatio: '',
        audioCompletionRatio: '',
      },
      'formula',
      'v2:0.01',
      'param("n") == 2',
      '',
      EMPTY_LANE_PRICES,
      EMPTY_LANE_ENABLED,
      'v2:0.02',
      (key) => key
    )
    expect(rows.some((row) => row.key === 'mode' && row.value === 'formula')).toBe(
      true
    )
    expect(rows.some((row) => row.key === 'expr' && row.value === 'v2:0.01')).toBe(
      true
    )
    expect(rows.some((row) => row.key === 'cost' && row.value === 'v2:0.02')).toBe(
      true
    )
  })
})
