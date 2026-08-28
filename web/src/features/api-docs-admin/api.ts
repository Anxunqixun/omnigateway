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

import type { AdminDoc } from './lib/admin-docs'
import type { StandaloneDoc } from './lib/standalone-docs'

type AdminDocsResponse = {
  success: boolean
  data?: { items: AdminDoc[] }
  message?: string
}

export async function getAdminStandaloneDocs(): Promise<AdminDocsResponse> {
  const res = await api.get('/api/docs/admin')
  return res.data
}

export async function saveAdminStandaloneDocs(
  items: StandaloneDoc[]
): Promise<AdminDocsResponse> {
  const res = await api.put('/api/docs/admin', { items })
  return res.data
}

export async function saveAdminChannelDoc(doc: AdminDoc): Promise<{
  success: boolean
  message?: string
}> {
  if (!doc.channel_id) {
    throw new Error('Missing channel id')
  }
  const res = await api.put(`/api/docs/admin/channel/${doc.channel_id}`, doc)
  return res.data
}

export async function deleteAdminChannelDoc(
  channelId: number,
  model?: string
): Promise<{ success: boolean; message?: string }> {
  const res = await api.delete(`/api/docs/admin/channel/${channelId}`, {
    params: model ? { model } : undefined,
  })
  return res.data
}
