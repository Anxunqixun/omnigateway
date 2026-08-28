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
export function docsExtractJsonBody(example: string): string {
  const trimmed = example.trim()
  if (!trimmed) return ''

  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fence?.[1]) {
    return formatJsonOrRaw(fence[1].trim())
  }

  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    return formatJsonOrRaw(trimmed)
  }

  const dashD = trimmed.match(/(?:-d|--data(?:-raw)?)\s+'([\s\S]*)'\s*$/)
  if (dashD?.[1]) {
    return formatJsonOrRaw(dashD[1].trim())
  }
  const dashDDouble = trimmed.match(/(?:-d|--data(?:-raw)?)\s+"([\s\S]*)"\s*$/)
  if (dashDDouble?.[1]) {
    return formatJsonOrRaw(dashDDouble[1].trim())
  }
  const heredoc = trimmed.match(/(?:-d|--data(?:-raw)?)\s+'(\{[\s\S]*\})'/)
  if (heredoc?.[1]) {
    return formatJsonOrRaw(heredoc[1].trim())
  }
  return ''
}

export function docsBuildCurlExample(
  method: string,
  url: string,
  jsonBody: string
): string {
  const lines = [
    `curl -X ${method} '${url}' \\`,
    `  -H 'Authorization: Bearer $API_KEY'`,
  ]
  if (method !== 'GET' && jsonBody.trim() !== '') {
    lines[1] += ' \\'
    lines.push(`  -H 'Content-Type: application/json' \\`)
    lines.push(`  -d '${jsonBody}'`)
  }
  return lines.join('\n')
}

function formatJsonOrRaw(value: string): string {
  try {
    return JSON.stringify(JSON.parse(value), null, 2)
  } catch {
    return value
  }
}
