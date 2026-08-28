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
  DEFAULT_VIDEO_POLL_PATH,
  emptyChannelApiDocs,
  ensureDefaultPollRelated,
  hasVideoPollRelated,
  parseChannelApiDocs,
  resolveChannelModelDocs,
  serializeChannelApiDocs,
  writeChannelModelDocs,
} from '../channel-api-docs'

describe('channel API docs parse and serialize', () => {
  test('fills defaults when settings have no api_docs object', () => {
    expect(parseChannelApiDocs(undefined)).toEqual(emptyChannelApiDocs())
    expect(serializeChannelApiDocs(undefined)).toBeUndefined()
  })

  test('keeps publish and try-it flags for a video model endpoint', () => {
    const parsed = parseChannelApiDocs({
      published: true,
      try_it: true,
      category: 'video',
      method: 'POST',
      path: '/v1/videos',
      description: 'Seedance 480p',
      required_params: [{ name: 'model', type: 'string' }],
      optional_params: [{ name: '', type: 'string' }],
    })

    expect(parsed.published).toBe(true)
    expect(parsed.try_it).toBe(true)
    expect(parsed.category).toBe('video')
    expect(parsed.path).toBe('/v1/videos')

    const serialized = serializeChannelApiDocs(parsed)
    expect(serialized).toMatchObject({
      published: true,
      try_it: true,
      category: 'video',
      method: 'POST',
      path: '/v1/videos',
    })
    expect(serialized?.required_params).toEqual([
      { name: 'model', type: 'string', default: '', range: '', description: '' },
    ])
    expect(serialized?.optional_params).toEqual([])
    expect(JSON.stringify(serialized)).not.toContain('rowKey')
  })

  test('omits empty unpublished docs from channel settings', () => {
    expect(serializeChannelApiDocs(emptyChannelApiDocs())).toBeUndefined()
  })

  test('adds a video poll endpoint only when the category is video and none exists', () => {
    const textDocs = ensureDefaultPollRelated(emptyChannelApiDocs())
    expect(textDocs.related_endpoints).toEqual([])

    const videoDocs = ensureDefaultPollRelated({
      ...emptyChannelApiDocs(),
      category: 'video',
    })
    expect(hasVideoPollRelated(videoDocs.related_endpoints)).toBe(true)
    expect(videoDocs.related_endpoints[0]?.path).toBe(DEFAULT_VIDEO_POLL_PATH)

    const again = ensureDefaultPollRelated(videoDocs)
    expect(again.related_endpoints).toHaveLength(2)
    expect(again.related_endpoints[1]?.path).toBe('/v1/videos/{id}/content')
  })

  test('keeps two model descriptions independent when serializing', () => {
    const withFirst = writeChannelModelDocs(emptyChannelApiDocs(), 'gpt-image-2', {
      description: 'Standard image docs',
      request_example: '{"model":"gpt-image-2"}',
    })
    const withBoth = writeChannelModelDocs(withFirst, 'gpt-image-2-hd', {
      description: 'HD image extra fee',
    })

    expect(resolveChannelModelDocs(withBoth, 'gpt-image-2').description).toBe(
      'Standard image docs'
    )
    expect(resolveChannelModelDocs(withBoth, 'gpt-image-2-hd').description).toBe(
      'HD image extra fee'
    )
    expect(resolveChannelModelDocs(withBoth, 'missing').description).toBe('')

    const serialized = serializeChannelApiDocs({
      ...withBoth,
      published: true,
    })
    expect(serialized?.models).toMatchObject({
      'gpt-image-2': { description: 'Standard image docs' },
      'gpt-image-2-hd': { description: 'HD image extra fee' },
    })
  })

  test('parses per-model docs and falls back to the channel description', () => {
    const parsed = parseChannelApiDocs({
      published: true,
      path: '/v1/images/generations',
      description: 'Shared fallback',
      models: {
        'gpt-image-2': { description: 'Standard image docs' },
      },
    })

    expect(parsed.description).toBe('Shared fallback')
    expect(parsed.models?.['gpt-image-2']?.description).toBe(
      'Standard image docs'
    )
    expect(resolveChannelModelDocs(parsed, 'gpt-image-2').description).toBe(
      'Standard image docs'
    )
    expect(resolveChannelModelDocs(parsed, 'other').description).toBe(
      'Shared fallback'
    )
  })
})
