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
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, test, vi } from 'vitest'

import type { DocsEndpoint } from '../../types'
import { DocsTryIt } from '../docs-try-it'

function endpoint(overrides: Partial<DocsEndpoint> = {}): DocsEndpoint {
  return {
    id: 'model:ad-seedance-2.0-480p',
    kind: 'model',
    method: 'POST',
    path: '/v1/videos',
    title: 'ad-seedance-2.0-480p',
    model: 'ad-seedance-2.0-480p',
    category: 'video',
    try_it: true,
    request_example: '{"model":"ad-seedance-2.0-480p"}',
    ...overrides,
  }
}

describe('docs try it', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  test('keeps send disabled when the API key is empty', () => {
    render(
      <DocsTryIt endpoint={endpoint()} baseUrl='https://foreign.example' />
    )

    expect(screen.getByRole('button', { name: 'Send request' })).toBeDisabled()
  })

  test('shows a notice and keeps send disabled when try it is off', () => {
    render(
      <DocsTryIt
        endpoint={endpoint({ try_it: false })}
        baseUrl='https://foreign.example'
      />
    )

    fireEvent.change(screen.getByLabelText('API Key'), {
      target: { value: 'sk-test' },
    })

    expect(
      screen.getByText('Try it is not enabled for this endpoint.')
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Send request' })).toBeDisabled()
  })

  test('sends the request to this gateway origin with the pasted key only', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      status: 200,
      statusText: 'OK',
      text: async () => '{"id":"task_1"}',
    })
    vi.stubGlobal('fetch', fetchMock)

    render(
      <DocsTryIt endpoint={endpoint()} baseUrl='https://foreign.example' />
    )

    fireEvent.change(screen.getByLabelText('API Key'), {
      target: { value: 'sk-test' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Send request' }))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1)
    })

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe(`${window.location.origin}/v1/videos`)
    expect(url).not.toContain('foreign.example')
    expect(init.method).toBe('POST')
    expect(init.credentials).toBe('omit')
    expect((init.headers as Record<string, string>).Authorization).toBe(
      'Bearer sk-test'
    )
    expect(JSON.parse(String(init.body))).toEqual({
      model: 'ad-seedance-2.0-480p',
    })
  })

  test('lets a poll query replace the task id in the path before sending', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      status: 200,
      statusText: 'OK',
      text: async () => '{"status":"completed"}',
    })
    vi.stubGlobal('fetch', fetchMock)

    render(
      <DocsTryIt
        endpoint={endpoint({
          id: 'related:GET:~v1~videos~_id_',
          kind: 'related',
          method: 'GET',
          path: '/v1/videos/{id}',
          request_example: '',
        })}
        baseUrl='https://foreign.example'
      />
    )

    fireEvent.change(screen.getByLabelText('API Key'), {
      target: { value: 'sk-test' },
    })
    fireEvent.change(screen.getByLabelText('Request path'), {
      target: { value: '/v1/videos/task_1' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Send request' }))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1)
    })

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe(`${window.location.origin}/v1/videos/task_1`)
    expect(init.method).toBe('GET')
    expect(init.body).toBeUndefined()
  })

  test('extracts JSON from a curl example instead of sending the curl command', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      status: 200,
      statusText: 'OK',
      text: async () => '{"created":1}',
    })
    vi.stubGlobal('fetch', fetchMock)

    render(
      <DocsTryIt
        endpoint={endpoint({
          id: 'model:gpt-image-2',
          path: '/v1/images/generations',
          model: 'gpt-image-2',
          category: 'image',
          request_example: `curl -X POST 'https://foreign.example/v1/images/generations' \\
  -H 'Authorization: Bearer $API_KEY' \\
  -d '{
  "model": "gpt-image-2",
  "prompt": "rain"
}'`,
        })}
        baseUrl='https://foreign.example'
      />
    )

    fireEvent.change(screen.getByLabelText('API Key'), {
      target: { value: 'sk-test' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Send request' }))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1)
    })

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(String(init.body)).toContain('"model": "gpt-image-2"')
    expect(String(init.body)).toContain('"prompt": "rain"')
    expect(String(init.body)).not.toContain('curl')
  })
})
