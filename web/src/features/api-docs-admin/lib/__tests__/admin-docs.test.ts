import { describe, expect, test } from 'vitest'

import {
  adminDocToForm,
  applyFormToAdminDoc,
  isChannelAdminDoc,
  standaloneDocsFromAdmin,
  type AdminDoc,
} from '../admin-docs'
import { formToStandaloneDoc } from '../standalone-docs'

const channelDoc: AdminDoc = {
  id: 'channel:5',
  source: 'channel',
  kind: 'endpoint',
  channel_id: 5,
  channel_name: 'seedance',
  published: true,
  try_it: true,
  title: 'Seedance video',
  path: '/v1/videos',
  method: 'POST',
  category: 'video',
}

describe('admin docs helpers', () => {
  test('treats missing source as a standalone document', () => {
    expect(isChannelAdminDoc({ id: 'billing-formula', kind: 'article' })).toBe(
      false
    )
    expect(isChannelAdminDoc(channelDoc)).toBe(true)
  })

  test('filters channel documents out of the standalone save payload', () => {
    const items = standaloneDocsFromAdmin([
      { id: 'billing-formula', kind: 'article', title: 'Guide' },
      channelDoc,
    ])
    expect(items).toHaveLength(1)
    expect(items[0]?.id).toBe('billing-formula')
    expect(items[0]?.title).toBe('Guide')
  })

  test('channel form keeps a valid slug and save writes back the channel id', () => {
    const form = adminDocToForm(channelDoc)
    expect(form.kind).toBe('endpoint')
    expect(form.id).toBe('channel-5')
    expect(form.path).toBe('/v1/videos')

    const saved = applyFormToAdminDoc(channelDoc, {
      ...formToStandaloneDoc(form),
      title: 'Updated',
      path: 'https://mjnewapi.diwdiw.cn/v1/videos',
    })
    expect(saved.id).toBe('channel:5')
    expect(saved.source).toBe('channel')
    expect(saved.channel_id).toBe(5)
    expect(saved.title).toBe('Updated')
    expect(saved.path).toBe('https://mjnewapi.diwdiw.cn/v1/videos')
  })
})
