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
export type DocsParam = {
  name: string
  type?: string
  default?: string
  range?: string
  description?: string
}

export type DocsTag = {
  label: string
  value?: string
}

export type DocsRelatedLink = {
  id: string
  method: string
  path: string
  title: string
  description?: string
}

export type DocsEndpoint = {
  id: string
  kind: 'builtin' | 'model' | 'related' | 'standalone' | 'article'
  method: string
  path: string
  title: string
  model?: string
  category: string
  description?: string
  try_it: boolean
  async?: boolean
  related?: DocsRelatedLink[]
  capabilities?: DocsTag[]
  required_params?: DocsParam[]
  optional_params?: DocsParam[]
  request_example?: string
  response_example?: string
  auth_scheme?: string
}

export type DocsCatalogResponse = {
  success: boolean
  data?: {
    items: DocsEndpoint[]
    base_url?: string
  }
  message?: string
}
