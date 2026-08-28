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
import { z } from 'zod'

import {
  type PermissionCatalog,
  type AdminPermissionMatrix,
  normalizeAdminPermissions,
} from '@/lib/admin-permissions'
import { quotaUnitsToDollars } from '@/lib/format'
import { ROLE } from '@/lib/roles'

import { DEFAULT_GROUP } from '../constants'
import type { UserFormData, User } from '../types'

// ============================================================================
// Form Schema
// ============================================================================

export const userFormSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  display_name: z.string().optional(),
  password: z.string().optional(),
  role: z.number().optional(),
  quota_dollars: z.number().min(0).optional(),
  group: z.string().optional(),
  remark: z.string().optional(),
  model_ratio_rows: z
    .array(
      z.object({
        id: z.string(),
        model: z.string(),
        ratio: z.string(),
      })
    )
    .optional(),
  admin_permissions: z
    .record(z.string(), z.record(z.string(), z.boolean()))
    .optional(),
})

export type UserFormValues = z.infer<typeof userFormSchema>

export type UserModelRatioRow = {
  id: string
  model: string
  ratio: string
}

function newUserModelRatioRowId(): string {
  return crypto.randomUUID()
}

export function createUserModelRatioRow(
  model = '',
  ratio = '1'
): UserModelRatioRow {
  return { id: newUserModelRatioRowId(), model, ratio }
}

// ============================================================================
// Form Defaults
// ============================================================================

export const USER_FORM_DEFAULT_VALUES: UserFormValues = {
  username: '',
  display_name: '',
  password: '',
  role: 1, // Default to common user
  quota_dollars: 0,
  group: DEFAULT_GROUP,
  remark: '',
  model_ratio_rows: [createUserModelRatioRow()],
  // Filled against the backend catalog at render time; see UsersMutateDrawer.
  admin_permissions: {},
}

export function parseUserModelRatioRows(raw?: string): UserModelRatioRow[] {
  const trimmed = raw?.trim()
  if (!trimmed) return []
  try {
    const parsed = JSON.parse(trimmed) as Record<string, unknown>
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return []
    }
    return Object.entries(parsed).flatMap(([model, value]) => {
      if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
        return []
      }
      return [{ id: newUserModelRatioRowId(), model, ratio: String(value) }]
    })
  } catch {
    return []
  }
}

export function serializeUserModelRatioRows(
  rows: UserModelRatioRow[]
): { ok: true; value: string } | { ok: false; message: string } {
  const out: Record<string, number> = {}
  for (const row of rows) {
    const model = row.model.trim()
    if (!model) continue
    const ratio = Number(row.ratio)
    if (!Number.isFinite(ratio) || ratio < 0) {
      return { ok: false, message: 'Invalid model sell ratio' }
    }
    out[model] = ratio
  }
  if (Object.keys(out).length === 0) {
    return { ok: true, value: '' }
  }
  return { ok: true, value: JSON.stringify(out) }
}

// ============================================================================
// Form Data Transformation
// ============================================================================

/**
 * Transform form data to API payload
 */
export function transformFormDataToPayload(
  data: UserFormValues,
  userId?: number,
  catalog?: PermissionCatalog
): UserFormData & { id?: number } {
  const payload: UserFormData & { id?: number } = {
    username: data.username,
    display_name: data.display_name || data.username,
    password: data.password || undefined,
  }

  const role = userId === undefined ? data.role || 1 : (data.role ?? 0)

  // Only send the permission matrix when the target is an admin and the catalog
  // is available; without the catalog we cannot build a full matrix, so we omit
  // the field (the backend then leaves existing permissions untouched).
  if (role >= ROLE.ADMIN && catalog) {
    payload.admin_permissions = normalizeAdminPermissions(
      data.admin_permissions as AdminPermissionMatrix | undefined,
      catalog
    )
  }

  const serialized = serializeUserModelRatioRows(data.model_ratio_rows ?? [])
  if (serialized.ok) {
    payload.model_ratio = serialized.value
  }

  // For create: only send required fields plus optional model sell ratios
  if (userId === undefined) {
    payload.role = role
  } else {
    // For update: quota is adjusted atomically via /api/user/manage, not sent here
    payload.group = data.group
    payload.remark = data.remark || undefined
    payload.id = userId
  }

  return payload
}

/**
 * Transform user data to form defaults. The admin permission matrix is passed
 * through as-is (the backend already returns a full matrix); it is filled against
 * the catalog at render time in UsersMutateDrawer.
 */
export function transformUserToFormDefaults(user: User): UserFormValues {
  const modelRatioRows = parseUserModelRatioRows(user.model_ratio)
  return {
    username: user.username,
    display_name: user.display_name,
    password: '',
    role: user.role,
    quota_dollars: quotaUnitsToDollars(user.quota),
    group: user.group || DEFAULT_GROUP,
    remark: user.remark || '',
    model_ratio_rows:
      modelRatioRows.length > 0 ? modelRatioRows : [createUserModelRatioRow()],
    admin_permissions: user.admin_permissions ?? {},
  }
}
