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

export const API_DOCS_CATEGORIES = [
  { value: 'text', labelKey: 'Text' },
  { value: 'image', labelKey: 'Image' },
  { value: 'video', labelKey: 'Video' },
  { value: 'audio', labelKey: 'Audio' },
] as const

export const API_DOCS_METHODS = ['POST', 'GET'] as const

export const DEFAULT_API_DOCS_PATHS: Record<string, string> = {
  text: '/v1/chat/completions',
  image: '/v1/images/generations',
  video: '/v1/videos',
  audio: '/v1/audio/speech',
}

export const channelApiDocParamSchema = z.object({
  rowKey: z.string(),
  name: z.string(),
  type: z.string(),
  default: z.string(),
  range: z.string(),
  description: z.string(),
})

export const channelApiDocTagSchema = z.object({
  rowKey: z.string(),
  label: z.string(),
  value: z.string(),
})

export const channelApiDocRelatedSchema = z.object({
  rowKey: z.string(),
  method: z.string(),
  path: z.string(),
  title: z.string(),
  description: z.string(),
  request_example: z.string(),
  response_example: z.string(),
  try_it: z.boolean(),
})

export const channelApiDocsContentSchema = z.object({
  category: z.string(),
  method: z.string(),
  path: z.string(),
  title: z.string(),
  description: z.string(),
  capabilities: z.array(channelApiDocTagSchema),
  required_params: z.array(channelApiDocParamSchema),
  optional_params: z.array(channelApiDocParamSchema),
  request_example: z.string(),
  response_example: z.string(),
  related_endpoints: z.array(channelApiDocRelatedSchema),
})

export const channelApiDocsSchema = channelApiDocsContentSchema.extend({
  published: z.boolean(),
  try_it: z.boolean(),
  models: z.record(z.string(), channelApiDocsContentSchema).optional(),
})

export type ChannelApiDocsContent = z.infer<typeof channelApiDocsContentSchema>
export type ChannelApiDocsForm = z.infer<typeof channelApiDocsSchema>

export function emptyChannelApiDocParam(): z.infer<
  typeof channelApiDocParamSchema
> {
  return {
    rowKey: nanoid(),
    name: '',
    type: 'string',
    default: '',
    range: '',
    description: '',
  }
}

export function emptyChannelApiDocTag(): z.infer<typeof channelApiDocTagSchema> {
  return { rowKey: nanoid(), label: '', value: '' }
}

export function emptyChannelApiDocRelated(): z.infer<
  typeof channelApiDocRelatedSchema
> {
  return {
    rowKey: nanoid(),
    method: 'GET',
    path: '',
    title: '',
    description: '',
    request_example: '',
    response_example: '',
    try_it: false,
  }
}

export const DEFAULT_VIDEO_POLL_PATH = '/v1/videos/{id}'
export const DEFAULT_VIDEO_RESULT_PATH = '/v1/videos/{id}/content'

export function defaultVideoPollRelated(): z.infer<
  typeof channelApiDocRelatedSchema
> {
  return {
    rowKey: nanoid(),
    method: 'GET',
    path: DEFAULT_VIDEO_POLL_PATH,
    title: 'Query video task',
    description:
      'Poll this gateway path with the task id from the submit response. Do not call the upstream vendor.',
    request_example:
      "curl '{{BASE_URL}}/v1/videos/{id}' \\\n  -H 'Authorization: Bearer $API_KEY'",
    response_example: `{
  "id": "task_xxx",
  "status": "completed"
}`,
    try_it: true,
  }
}

export function defaultVideoResultRelated(): z.infer<
  typeof channelApiDocRelatedSchema
> {
  return {
    rowKey: nanoid(),
    method: 'GET',
    path: DEFAULT_VIDEO_RESULT_PATH,
    title: 'Get video result',
    description:
      'Download the finished video from this gateway after the task succeeds.',
    request_example:
      "curl '{{BASE_URL}}/v1/videos/{id}/content' \\\n  -H 'Authorization: Bearer $API_KEY' \\\n  -o result.mp4",
    response_example: '',
    try_it: true,
  }
}

function relatedPath(item: { path: string }): string {
  return item.path.replaceAll(/\s/g, '')
}

export function hasVideoPollRelated(
  related: ChannelApiDocsForm['related_endpoints']
): boolean {
  return related.some(
    (item) =>
      item.method.toUpperCase() === 'GET' &&
      relatedPath(item).includes(DEFAULT_VIDEO_POLL_PATH) &&
      !relatedPath(item).includes('/content')
  )
}

export function hasVideoResultRelated(
  related: ChannelApiDocsForm['related_endpoints']
): boolean {
  return related.some(
    (item) =>
      item.method.toUpperCase() === 'GET' &&
      relatedPath(item).includes(DEFAULT_VIDEO_RESULT_PATH)
  )
}

export function ensureDefaultPollRelated(
  docs: ChannelApiDocsForm
): ChannelApiDocsForm {
  if (docs.category !== 'video') {
    return docs
  }
  let related = docs.related_endpoints
  if (!hasVideoPollRelated(related)) {
    related = [...related, defaultVideoPollRelated()]
  }
  if (!hasVideoResultRelated(related)) {
    related = [...related, defaultVideoResultRelated()]
  }
  if (related === docs.related_endpoints) {
    return docs
  }
  return {
    ...docs,
    related_endpoints: related,
  }
}

export function emptyChannelApiDocsContent(): ChannelApiDocsContent {
  return {
    category: 'text',
    method: 'POST',
    path: DEFAULT_API_DOCS_PATHS.text,
    title: '',
    description: '',
    capabilities: [],
    required_params: [],
    optional_params: [],
    request_example: '',
    response_example: '',
    related_endpoints: [],
  }
}

export function emptyChannelApiDocs(): ChannelApiDocsForm {
  return {
    ...emptyChannelApiDocsContent(),
    published: false,
    try_it: false,
    models: {},
  }
}

export function pickChannelApiDocsContent(
  docs: ChannelApiDocsForm | ChannelApiDocsContent
): ChannelApiDocsContent {
  return {
    category: docs.category,
    method: docs.method,
    path: docs.path,
    title: docs.title,
    description: docs.description,
    capabilities: docs.capabilities ?? [],
    required_params: docs.required_params ?? [],
    optional_params: docs.optional_params ?? [],
    request_example: docs.request_example,
    response_example: docs.response_example,
    related_endpoints: docs.related_endpoints ?? [],
  }
}

export function resolveChannelModelDocs(
  docs: ChannelApiDocsForm,
  modelName?: string
): ChannelApiDocsContent {
  const fallback = pickChannelApiDocsContent(docs)
  const name = modelName?.trim()
  if (!name) return fallback
  const override = docs.models?.[name]
  if (!override) return fallback
  return {
    ...fallback,
    ...override,
    capabilities: override.capabilities ?? fallback.capabilities,
    required_params: override.required_params ?? fallback.required_params,
    optional_params: override.optional_params ?? fallback.optional_params,
    related_endpoints:
      override.related_endpoints ?? fallback.related_endpoints,
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function asBoolean(value: unknown): boolean {
  return value === true
}

function parseParamList(value: unknown): ChannelApiDocsForm['required_params'] {
  if (!Array.isArray(value)) return []
  return value.map((item) => {
    const row = asRecord(item) ?? {}
    return {
      rowKey: asString(row.rowKey) || nanoid(),
      name: asString(row.name),
      type: asString(row.type) || 'string',
      default: asString(row.default),
      range: asString(row.range),
      description: asString(row.description),
    }
  })
}

function parseTagList(value: unknown): ChannelApiDocsForm['capabilities'] {
  if (!Array.isArray(value)) return []
  return value.map((item) => {
    const row = asRecord(item) ?? {}
    return {
      rowKey: asString(row.rowKey) || nanoid(),
      label: asString(row.label),
      value: asString(row.value),
    }
  })
}

function parseRelatedList(
  value: unknown
): ChannelApiDocsForm['related_endpoints'] {
  if (!Array.isArray(value)) return []
  return value.map((item) => {
    const row = asRecord(item) ?? {}
    return {
      rowKey: asString(row.rowKey) || nanoid(),
      method: asString(row.method) || 'GET',
      path: asString(row.path),
      title: asString(row.title),
      description: asString(row.description),
      request_example: asString(row.request_example),
      response_example: asString(row.response_example),
      try_it: asBoolean(row.try_it),
    }
  })
}

function parseDocsContent(
  value: unknown,
  defaults: ChannelApiDocsContent
): ChannelApiDocsContent {
  const row = asRecord(value)
  if (!row) return { ...defaults }
  const category = asString(row.category) || defaults.category
  return {
    category,
    method: asString(row.method) || defaults.method,
    path: asString(row.path) || DEFAULT_API_DOCS_PATHS[category] || defaults.path,
    title: asString(row.title),
    description: asString(row.description),
    capabilities: parseTagList(row.capabilities),
    required_params: parseParamList(row.required_params),
    optional_params: parseParamList(row.optional_params),
    request_example: asString(row.request_example),
    response_example: asString(row.response_example),
    related_endpoints: parseRelatedList(row.related_endpoints),
  }
}

function parseDocsModels(
  value: unknown,
  defaults: ChannelApiDocsContent
): Record<string, ChannelApiDocsContent> {
  const row = asRecord(value)
  if (!row) return {}
  const models: Record<string, ChannelApiDocsContent> = {}
  for (const [name, item] of Object.entries(row)) {
    const modelName = name.trim()
    if (!modelName) continue
    models[modelName] = parseDocsContent(item, defaults)
  }
  return models
}

export function parseChannelApiDocs(value: unknown): ChannelApiDocsForm {
  const defaults = emptyChannelApiDocs()
  const row = asRecord(value)
  if (!row) return defaults
  const content = parseDocsContent(row, pickChannelApiDocsContent(defaults))
  return {
    ...content,
    published: asBoolean(row.published),
    try_it: asBoolean(row.try_it),
    models: parseDocsModels(row.models, content),
  }
}

export function isChannelApiDocsContentConfigured(
  docs?: ChannelApiDocsContent | null
): boolean {
  if (!docs) return false
  return (
    docs.description.trim() !== '' ||
    docs.title.trim() !== '' ||
    docs.request_example.trim() !== '' ||
    docs.response_example.trim() !== '' ||
    docs.capabilities.length > 0 ||
    docs.required_params.length > 0 ||
    docs.optional_params.length > 0 ||
    docs.related_endpoints.length > 0
  )
}

export function isChannelApiDocsConfigured(
  docs?: ChannelApiDocsForm | null
): boolean {
  if (!docs) return false
  if (docs.published || docs.try_it) return true
  if (isChannelApiDocsContentConfigured(pickChannelApiDocsContent(docs))) {
    return true
  }
  return Object.values(docs.models ?? {}).some((item) =>
    isChannelApiDocsContentConfigured(item)
  )
}

function serializeDocsContent(
  docs: ChannelApiDocsContent
): Record<string, unknown> {
  return {
    category: docs.category,
    method: docs.method,
    path: docs.path.trim(),
    title: docs.title.trim(),
    description: docs.description.trim(),
    capabilities: docs.capabilities
      .filter((item) => item.label.trim() || item.value.trim())
      .map(({ label, value }) => ({ label, value })),
    required_params: docs.required_params
      .filter((item) => item.name.trim())
      .map(({ name, type, default: defaultValue, range, description }) => ({
        name,
        type,
        default: defaultValue,
        range,
        description,
      })),
    optional_params: docs.optional_params
      .filter((item) => item.name.trim())
      .map(({ name, type, default: defaultValue, range, description }) => ({
        name,
        type,
        default: defaultValue,
        range,
        description,
      })),
    request_example: docs.request_example,
    response_example: docs.response_example,
    related_endpoints: docs.related_endpoints
      .filter((item) => item.path.trim() || item.title.trim())
      .map(
        ({
          method,
          path,
          title,
          description,
          request_example,
          response_example,
          try_it,
        }) => ({
          method,
          path,
          title,
          description,
          request_example,
          response_example,
          try_it,
        })
      ),
  }
}

function serializeDocsModels(
  models?: Record<string, ChannelApiDocsContent>
): Record<string, unknown> | undefined {
  if (!models) return undefined
  const out: Record<string, unknown> = {}
  for (const [name, content] of Object.entries(models)) {
    const modelName = name.trim()
    if (!modelName || !isChannelApiDocsContentConfigured(content)) continue
    out[modelName] = serializeDocsContent(content)
  }
  return Object.keys(out).length > 0 ? out : undefined
}

export function writeChannelModelDocs(
  docs: ChannelApiDocsForm,
  modelName: string,
  patch: Partial<ChannelApiDocsContent>
): ChannelApiDocsForm {
  const name = modelName.trim()
  if (!name) {
    return {
      ...docs,
      ...patch,
    }
  }
  const resolved = resolveChannelModelDocs(docs, name)
  return {
    ...docs,
    models: {
      ...docs.models,
      [name]: {
        ...resolved,
        related_endpoints: docs.models?.[name]?.related_endpoints ?? [],
        ...patch,
      },
    },
  }
}

export function serializeChannelApiDocs(
  docs?: ChannelApiDocsForm | null
): Record<string, unknown> | undefined {
  if (!docs) return undefined
  const models = serializeDocsModels(docs.models)
  if (!isChannelApiDocsConfigured(docs) && !docs.published) {
    return undefined
  }
  return {
    published: docs.published,
    try_it: docs.try_it,
    ...serializeDocsContent(pickChannelApiDocsContent(docs)),
    ...(models ? { models } : {}),
  }
}
