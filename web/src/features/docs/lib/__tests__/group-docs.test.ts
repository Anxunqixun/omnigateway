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

import type { DocsEndpoint } from '../../types'
import {
  docsEndpointDisplayTitle,
  docsEndpointIsAsync,
  docsEndpointIsPollQuery,
  docsEndpointNavLabel,
  docsGatewayOrigin,
  docsRelatedDisplayTitle,
  docsRequestUrl,
  findDocsEndpoint,
  groupDocsEndpoints,
} from '../group-docs'

function endpoint(overrides: Partial<DocsEndpoint>): DocsEndpoint {
  return {
    id: 'model:ad-seedance-2.0-480p',
    kind: 'model',
    method: 'POST',
    path: '/v1/videos',
    title: 'ad-seedance-2.0-480p',
    model: 'ad-seedance-2.0-480p',
    category: 'video',
    try_it: true,
    ...overrides,
  }
}

describe('public docs grouping', () => {
  test('groups endpoints by category and keeps model IDs as nav labels', () => {
    const items = [
      endpoint({
        id: 'models',
        kind: 'builtin',
        method: 'GET',
        path: '/v1/models',
        title: 'Model list',
        category: 'text',
        model: undefined,
      }),
      endpoint({
        id: 'model:ad-seedance-2.0-480p',
        category: 'video',
      }),
      endpoint({
        id: 'model:gpt-4o-mini',
        title: 'gpt-4o-mini',
        model: 'gpt-4o-mini',
        category: 'text',
        path: '/v1/chat/completions',
      }),
    ]

    const grouped = groupDocsEndpoints(items)
    expect(grouped.map((group) => group.category)).toEqual(['text', 'video'])
    expect(docsEndpointNavLabel(items[1])).toBe('POST ad-seedance-2.0-480p')
    expect(docsEndpointNavLabel(items[0])).toBe('GET Model list')
  })

  test('selects a model endpoint by encoded slug without exposing a channel name', () => {
    const items = [
      endpoint({ id: 'model:ad-seedance-2.0-480p' }),
      endpoint({
        id: 'model:ad-seedance-2.0-720p',
        title: 'ad-seedance-2.0-720p',
        model: 'ad-seedance-2.0-720p',
      }),
    ]

    const selected = findDocsEndpoint(
      items,
      encodeURIComponent('model:ad-seedance-2.0-720p')
    )
    expect(selected).toBeDefined()
    if (!selected) return
    expect(docsEndpointNavLabel(selected)).toBe('POST ad-seedance-2.0-720p')
    expect(docsEndpointNavLabel(selected)).not.toMatch(/channel/i)
  })

  test('builds try-it URLs against this page origin instead of a foreign base URL', () => {
    const origin = docsGatewayOrigin('https://foreign.example')
    expect(origin).toBe(window.location.origin)
    expect(docsRequestUrl(origin, '/v1/videos')).toBe(
      `${window.location.origin}/v1/videos`
    )
    expect(
      docsRequestUrl(origin, 'https://mjnewapi.diwdiw.cn/v1/materials')
    ).toBe('https://mjnewapi.diwdiw.cn/v1/materials')
  })

  test('treats video submit and related query pages as async polling docs', () => {
    expect(docsEndpointIsAsync(endpoint({ category: 'video' }))).toBe(true)
    expect(
      docsEndpointIsAsync(
        endpoint({
          id: 'related:GET:~v1~videos~_id_',
          kind: 'related',
          method: 'GET',
          path: '/v1/videos/{id}',
          title: 'Query video task',
          async: true,
        })
      )
    ).toBe(true)
    expect(
      docsEndpointIsPollQuery(
        endpoint({
          kind: 'related',
          method: 'GET',
          path: '/v1/videos/{id}',
        })
      )
    ).toBe(true)
    expect(
      docsRelatedDisplayTitle(
        { title: 'Query video task', path: '/v1/videos/{id}' },
        (key) => key
      )
    ).toBe('Query video task')
    expect(
      docsRelatedDisplayTitle(
        { title: 'Get video result', path: '/v1/videos/{id}/content' },
        (key) => key
      )
    ).toBe('Get video result')
  })

  test('puts the model list under Quick start and keeps the title filled in the channel', () => {
    const identity = (key: string) => key
    const grouped = groupDocsEndpoints([
      endpoint({
        id: 'models',
        kind: 'builtin',
        method: 'GET',
        path: '/v1/models',
        title: 'Model list',
        category: 'quickstart',
        model: undefined,
      }),
      endpoint({
        id: 'model:gpt-image-2',
        title: 'gpt-image-2 · 图片生成',
        model: 'gpt-image-2',
        category: 'image',
        path: '/v1/images/generations',
      }),
    ])

    expect(grouped.map((group) => group.category)).toEqual([
      'quickstart',
      'image',
    ])
    expect(
      docsEndpointDisplayTitle(
        endpoint({
          id: 'model:gpt-image-2',
          title: 'gpt-image-2 · 图片生成',
          model: 'gpt-image-2',
          path: '/v1/images/generations',
        }),
        identity
      )
    ).toBe('gpt-image-2 · 图片生成')
    expect(
      docsEndpointDisplayTitle(
        endpoint({
          id: 'model:gpt-image-2',
          title: '',
          model: 'gpt-image-2',
          path: '/v1/images/generations',
        }),
        identity
      )
    ).toBe('gpt-image-2')
  })

  test('keeps articles and tools without inventing a POST badge label', () => {
    const items = [
      endpoint({
        id: 'billing-formula',
        kind: 'article',
        method: '',
        path: '',
        title: 'Billing formula guide',
        category: 'quickstart',
        try_it: false,
      }),
      endpoint({
        id: 'materials',
        kind: 'standalone',
        method: 'POST',
        path: '/v1/materials',
        title: 'Upload material',
        category: 'tools',
      }),
    ]
    const grouped = groupDocsEndpoints(items)
    expect(grouped.map((group) => group.category)).toEqual([
      'quickstart',
      'tools',
    ])
    expect(docsEndpointNavLabel(items[0])).toBe('Billing formula guide')
    expect(docsEndpointNavLabel(items[1])).toBe('POST Upload material')
    expect(docsEndpointIsAsync(items[0])).toBe(false)
  })
})
