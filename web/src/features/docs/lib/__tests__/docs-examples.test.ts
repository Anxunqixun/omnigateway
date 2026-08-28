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
import { describe, expect, test } from 'vitest'

import { docsBuildCurlExample, docsExtractJsonBody } from '../docs-examples'

describe('docs examples', () => {
  test('extracts JSON from a curl -d body so try-it does not send the curl command', () => {
    const example = `curl -X POST 'https://example.com/v1/images/generations' \\
  -H 'Authorization: Bearer $API_KEY' \\
  -H 'Content-Type: application/json' \\
  -d '{
  "model": "gpt-image-2",
  "prompt": "雨后的未来城市"
}'`

    expect(JSON.parse(docsExtractJsonBody(example))).toEqual({
      model: 'gpt-image-2',
      prompt: '雨后的未来城市',
    })
  })

  test('builds a curl example from JSON', () => {
    const curl = docsBuildCurlExample(
      'POST',
      'https://example.com/v1/images/generations',
      '{\n  "model": "gpt-image-2"\n}'
    )
    expect(curl).toContain("curl -X POST 'https://example.com/v1/images/generations'")
    expect(curl).toContain('Content-Type: application/json')
    expect(curl).toContain('"model": "gpt-image-2"')
  })
})
