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
import {
  standaloneDocToForm,
  type StandaloneDoc,
  type StandaloneDocFormValues,
} from './standalone-docs'

export type AdminDocSource = 'standalone' | 'channel'

export type AdminDoc = StandaloneDoc & {
  source?: AdminDocSource
  channel_id?: number
  channel_name?: string
  channel_status?: number
  model?: string
}

export function isChannelAdminDoc(doc?: AdminDoc | null): boolean {
  return doc?.source === 'channel'
}

export function toStandaloneDoc(doc: AdminDoc): StandaloneDoc {
  return {
    id: doc.id,
    kind: doc.kind,
    published: doc.published,
    try_it: doc.try_it,
    category: doc.category,
    method: doc.method,
    path: doc.path,
    title: doc.title,
    description: doc.description,
    required_params: doc.required_params,
    optional_params: doc.optional_params,
    request_example: doc.request_example,
    response_example: doc.response_example,
  }
}

export function standaloneDocsFromAdmin(items: AdminDoc[]): StandaloneDoc[] {
  return items.filter((item) => !isChannelAdminDoc(item)).map(toStandaloneDoc)
}

export function applyFormToAdminDoc(
  current: AdminDoc | undefined,
  form: StandaloneDoc
): AdminDoc {
  if (isChannelAdminDoc(current) && current) {
    return {
      ...current,
      ...form,
      id: current.id,
      source: 'channel',
      kind: 'endpoint',
      channel_id: current.channel_id,
      channel_name: current.channel_name,
      channel_status: current.channel_status,
      model: current.model,
    }
  }
  return {
    ...form,
    source: 'standalone',
  }
}

export function adminDocToForm(doc?: AdminDoc): StandaloneDocFormValues {
  const form = standaloneDocToForm(doc)
  if (!isChannelAdminDoc(doc) || !doc) {
    return form
  }
  const raw = doc.model || `channel-${doc.channel_id ?? 0}`
  const slug = raw
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, '-')
    .replaceAll(/^-+|-+$/g, '')
  return {
    ...form,
    kind: 'endpoint',
    id: slug || 'channel-doc',
  }
}
