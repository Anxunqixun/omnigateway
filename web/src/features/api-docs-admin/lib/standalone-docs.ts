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
import { nanoid } from 'nanoid'
import { z } from 'zod'

export const STANDALONE_DOC_KINDS = [
  { value: 'article', labelKey: 'Guide article' },
  { value: 'endpoint', labelKey: 'API endpoint' },
] as const

export const STANDALONE_DOC_CATEGORIES = [
  { value: 'quickstart', labelKey: 'Quick start' },
  { value: 'text', labelKey: 'Text' },
  { value: 'image', labelKey: 'Image' },
  { value: 'video', labelKey: 'Video' },
  { value: 'audio', labelKey: 'Audio' },
  { value: 'tools', labelKey: 'Tools' },
] as const

const paramSchema = z.object({
  rowKey: z.string(),
  name: z.string(),
  type: z.string(),
  default: z.string(),
  range: z.string(),
  description: z.string(),
})

export const standaloneDocFormSchema = z
  .object({
    id: z
      .string()
      .trim()
      .min(1)
      .max(64)
      .regex(
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
        'Use lowercase letters, numbers, and hyphens'
      )
      .refine((value) => value !== 'models' && value !== 'admin', {
        message: 'This document id is reserved',
      }),
    kind: z.enum(['article', 'endpoint']),
    published: z.boolean(),
    try_it: z.boolean(),
    category: z.string(),
    method: z.string(),
    path: z.string(),
    title: z.string().trim().min(1),
    description: z.string(),
    required_params: z.array(paramSchema),
    optional_params: z.array(paramSchema),
    request_example: z.string(),
    response_example: z.string(),
  })
  .superRefine((value, ctx) => {
    if (value.kind === 'endpoint' && !isStandaloneEndpointPath(value.path)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['path'],
        message: 'Enter a path starting with / or a full http(s) URL',
      })
    }
  })

export function isStandaloneEndpointPath(path: string): boolean {
  const value = path.trim()
  if (value.startsWith('/') && !value.startsWith('//')) {
    return true
  }
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

export type StandaloneDocFormValues = z.infer<typeof standaloneDocFormSchema>

export type StandaloneDoc = {
  id: string
  kind: 'article' | 'endpoint'
  published?: boolean
  try_it?: boolean
  category?: string
  method?: string
  path?: string
  title?: string
  description?: string
  required_params?: Array<{
    name?: string
    type?: string
    default?: string
    range?: string
    description?: string
  }>
  optional_params?: Array<{
    name?: string
    type?: string
    default?: string
    range?: string
    description?: string
  }>
  request_example?: string
  response_example?: string
}

export function emptyStandaloneDocForm(): StandaloneDocFormValues {
  return {
    id: '',
    kind: 'article',
    published: false,
    try_it: false,
    category: 'quickstart',
    method: 'POST',
    path: '',
    title: '',
    description: '',
    required_params: [],
    optional_params: [],
    request_example: '',
    response_example: '',
  }
}

export function emptyParamRow() {
  return {
    rowKey: nanoid(),
    name: '',
    type: 'string',
    default: '',
    range: '',
    description: '',
  }
}

export function standaloneDocToForm(doc?: StandaloneDoc): StandaloneDocFormValues {
  const base = emptyStandaloneDocForm()
  if (!doc) return base
  return {
    ...base,
    id: doc.id,
    kind: doc.kind === 'endpoint' ? 'endpoint' : 'article',
    published: Boolean(doc.published),
    try_it: Boolean(doc.try_it),
    category: doc.category || 'quickstart',
    method: doc.method || 'POST',
    path: doc.path || '',
    title: doc.title || '',
    description: doc.description || '',
    required_params: (doc.required_params ?? []).map((row) => ({
      rowKey: nanoid(),
      name: row.name || '',
      type: row.type || 'string',
      default: row.default || '',
      range: row.range || '',
      description: row.description || '',
    })),
    optional_params: (doc.optional_params ?? []).map((row) => ({
      rowKey: nanoid(),
      name: row.name || '',
      type: row.type || 'string',
      default: row.default || '',
      range: row.range || '',
      description: row.description || '',
    })),
    request_example: doc.request_example || '',
    response_example: doc.response_example || '',
  }
}

export function formToStandaloneDoc(
  values: StandaloneDocFormValues
): StandaloneDoc {
  if (values.kind === 'article') {
    return {
      id: values.id.trim(),
      kind: 'article',
      published: values.published,
      category: values.category,
      title: values.title.trim(),
      description: values.description,
    }
  }
  return {
    id: values.id.trim(),
    kind: 'endpoint',
    published: values.published,
    try_it: values.try_it,
    category: values.category,
    method: values.method || 'POST',
    path: values.path.trim(),
    title: values.title.trim(),
    description: values.description,
    required_params: values.required_params
      .filter((row) => row.name.trim() !== '')
      .map(({ rowKey: _rowKey, ...row }) => row),
    optional_params: values.optional_params
      .filter((row) => row.name.trim() !== '')
      .map(({ rowKey: _rowKey, ...row }) => row),
    request_example: values.request_example,
    response_example: values.response_example,
  }
}
