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
import type { DocsEndpoint } from '../types'

export const DOCS_CATEGORY_ORDER = [
  'quickstart',
  'text',
  'image',
  'video',
  'audio',
  'tools',
] as const

export const DOCS_CATEGORY_LABEL_KEYS: Record<string, string> = {
  quickstart: 'Quick start',
  text: 'Text APIs',
  image: 'Image APIs',
  video: 'Video APIs',
  audio: 'Audio APIs',
  tools: 'Tools APIs',
}

export function groupDocsEndpoints(
  items: DocsEndpoint[]
): Array<{ category: string; items: DocsEndpoint[] }> {
  const buckets = new Map<string, DocsEndpoint[]>()
  for (const item of items) {
    let category = item.category
    if (
      !DOCS_CATEGORY_ORDER.includes(
        item.category as (typeof DOCS_CATEGORY_ORDER)[number]
      )
    ) {
      category = item.kind === 'builtin' ? 'quickstart' : 'text'
    }
    const list = buckets.get(category) ?? []
    list.push(item)
    buckets.set(category, list)
  }
  return DOCS_CATEGORY_ORDER.filter((category) => buckets.has(category)).map(
    (category) => ({
      category,
      items: buckets.get(category) ?? [],
    })
  )
}

export function decodeDocsSlug(id?: string): string | undefined {
  if (!id) return undefined
  try {
    return decodeURIComponent(id)
  } catch {
    return id
  }
}

export function findDocsEndpoint(
  items: DocsEndpoint[],
  id?: string
): DocsEndpoint | undefined {
  const slug = decodeDocsSlug(id)
  if (!slug) return items[0]
  return items.find((item) => item.id === slug) ?? items[0]
}

const DOCS_TITLE_KEYS = new Set([
  'Model list',
  'Query video task',
  'Get video result',
])

export function docsEndpointDisplayTitle(
  item: DocsEndpoint,
  t: (key: string) => string
): string {
  const title = item.title || item.model || item.path
  if (item.kind === 'builtin' || DOCS_TITLE_KEYS.has(title)) {
    return t(title || 'Model list')
  }
  return title
}

export function docsEndpointNavLabel(
  item: DocsEndpoint,
  t?: (key: string) => string
): string {
  const title = t ? docsEndpointDisplayTitle(item, t) : item.title
  if (item.kind === 'article') {
    return title
  }
  return `${item.method} ${title}`
}

export function docsGatewayOrigin(fallbackBaseUrl = ''): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin
  }
  return fallbackBaseUrl.replace(/\/+$/, '')
}

export function docsRequestUrl(baseUrl: string, path: string): string {
  const trimmed = path.trim()
  try {
    const parsed = new URL(trimmed)
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return trimmed
    }
  } catch {
    // Gateway-relative paths stay joined to this page origin.
  }
  return `${baseUrl.replace(/\/+$/, '')}${trimmed.startsWith('/') ? trimmed : `/${trimmed}`}`
}

export function docsEndpointIsAsync(item: DocsEndpoint): boolean {
  if (item.kind === 'article') return false
  if (item.async) return true
  if (item.category === 'video') return true
  return (item.related?.length ?? 0) > 0
}

export function docsEndpointIsPollQuery(item: DocsEndpoint): boolean {
  return item.kind === 'related' && item.method === 'GET'
}

export function docsRelatedDisplayTitle(
  item: { title: string; path: string },
  t: (key: string) => string
): string {
  if (DOCS_TITLE_KEYS.has(item.title)) {
    return t(item.title)
  }
  return item.title
}

export function renderDocsText(
  value: string,
  modelName = '',
  baseUrl = ''
): string {
  let out = value
  if (modelName) {
    out = out.replaceAll('{{MODEL_NAME}}', modelName)
  }
  if (baseUrl) {
    out = out.replaceAll('{{BASE_URL}}', baseUrl.replace(/\/+$/, ''))
  }
  return out
}
