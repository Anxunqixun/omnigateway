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
import { api } from '@/lib/api'

import type { DocsCatalog, DocsPage } from './types'

export async function getDocsCatalog(): Promise<DocsCatalog> {
  const res = await api.get('/api/docs/')
  return res.data
}

export async function getDocsPage(slug: string): Promise<{
  success: boolean
  data?: DocsPage
  message?: string
}> {
  const res = await api.get(`/api/docs/${encodeURIComponent(slug)}`)
  return res.data
}

export async function getDocsTemplate(kind: string, model: string) {
  const res = await api.get('/api/docs/templates', { params: { kind, model } })
  return res.data
}
