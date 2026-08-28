import { describe, expect, test } from 'vitest'

import {
  formToStandaloneDoc,
  standaloneDocFormSchema,
  standaloneDocToForm,
} from '../standalone-docs'

describe('standalone docs form', () => {
  test('article form drops endpoint-only fields on save', () => {
    const form = standaloneDocToForm({
      id: 'billing-formula',
      kind: 'article',
      published: true,
      title: 'Billing formula guide',
      description: 'v2:0.04',
      path: '/ignored',
      try_it: true,
    })
    const saved = formToStandaloneDoc({
      ...form,
      path: '/ignored',
      try_it: true,
    })
    expect(saved.kind).toBe('article')
    expect(saved.path).toBeUndefined()
    expect(saved.try_it).toBeUndefined()
    expect(saved.description).toBe('v2:0.04')
  })

  test('rejects reserved document ids', () => {
    const parsed = standaloneDocFormSchema.safeParse({
      id: 'admin',
      kind: 'article',
      published: true,
      try_it: false,
      category: 'quickstart',
      method: 'POST',
      path: '',
      title: 'Reserved',
      description: '',
      required_params: [],
      optional_params: [],
      request_example: '',
      response_example: '',
    })
    expect(parsed.success).toBe(false)
  })

  test('endpoint form rejects a relative path that is not a URL', () => {
    const parsed = standaloneDocFormSchema.safeParse({
      id: 'materials',
      kind: 'endpoint',
      published: true,
      try_it: false,
      category: 'tools',
      method: 'POST',
      path: 'v1/materials',
      title: 'Upload',
      description: '',
      required_params: [],
      optional_params: [],
      request_example: '',
      response_example: '',
    })
    expect(parsed.success).toBe(false)
  })

  test('endpoint form accepts a full http URL', () => {
    const parsed = standaloneDocFormSchema.safeParse({
      id: 'materials',
      kind: 'endpoint',
      published: true,
      try_it: false,
      category: 'tools',
      method: 'POST',
      path: 'https://mjnewapi.diwdiw.cn/v1/materials',
      title: 'Upload',
      description: '',
      required_params: [],
      optional_params: [],
      request_example: '',
      response_example: '',
    })
    expect(parsed.success).toBe(true)
    if (!parsed.success) return
    expect(formToStandaloneDoc(parsed.data).path).toBe(
      'https://mjnewapi.diwdiw.cn/v1/materials'
    )
  })
})
