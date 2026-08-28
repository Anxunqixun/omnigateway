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
import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, test, vi } from 'vitest'

import type { DocsEndpoint } from '../../types'
import { DocsArticle } from '../docs-article'

vi.mock('@tanstack/react-router', () => ({
  Link: (props: { children: ReactNode; params?: { slug: string } }) => (
    <a href={props.params?.slug}>{props.children}</a>
  ),
}))

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
    async: true,
    related: [
      {
        id: 'related:GET:~v1~videos~_id_',
        method: 'GET',
        path: '/v1/videos/{id}',
        title: 'Query video task',
        description:
          'Poll this gateway path with the task id from the submit response. Do not call the upstream vendor.',
      },
    ],
    ...overrides,
  }
}

describe('docs article polling copy', () => {
  test('explains submit-then-poll billing on a video model page', () => {
    render(
      <DocsArticle endpoint={endpoint()} baseUrl='https://foreign.example' />
    )

    expect(
      screen.getByText(
        'After submit, poll the task query API. When it succeeds, fetch the video from the content API.'
      )
    ).toBeInTheDocument()
    expect(screen.getByText(/GET Query video task/)).toBeInTheDocument()
    expect(screen.getByText('/v1/videos/{id}')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'ad-seedance-2.0-480p' })
    ).toBeInTheDocument()
    expect(screen.getByText(/API model ID/)).toBeInTheDocument()
  })

  test('explains that a related GET page is a query, not a new generation', () => {
    render(
      <DocsArticle
        endpoint={endpoint({
          id: 'related:GET:~v1~videos~_id_',
          kind: 'related',
          method: 'GET',
          path: '/v1/videos/{id}',
          title: 'Query video task',
          related: [],
        })}
        baseUrl='https://foreign.example'
      />
    )

    expect(
      screen.getByText(
        'This is a query endpoint. Use the task id returned by the submit API.'
      )
    ).toBeInTheDocument()
  })

  test('renders an image generation handbook with model id, params, and JSON first', () => {
    render(
      <DocsArticle
        endpoint={endpoint({
          id: 'model:gpt-image-2',
          kind: 'model',
          method: 'POST',
          path: '/v1/images/generations',
          title: 'gpt-image-2 · Image generation',
          model: 'gpt-image-2',
          category: 'image',
          async: false,
          related: [],
          description:
            '{{MODEL_NAME}} provides image generation and editing through an OpenAI-compatible API.',
          capabilities: [
            { label: 'image-generation' },
            { label: 'web-serach', value: 'True' },
          ],
          required_params: [
            {
              name: 'model',
              type: 'string',
              default: 'gpt-image-2',
              description: 'Fixed to this model ID',
            },
            {
              name: 'prompt',
              type: 'string',
              description: 'Text instruction for image generation',
            },
          ],
          optional_params: [
            {
              name: 'quality',
              type: 'string',
              default: 'medium',
              range: 'low / medium / high',
              description: 'Generation quality',
            },
          ],
          request_example: `{
  "model": "gpt-image-2",
  "prompt": "雨后的未来城市"
}`,
        })}
        baseUrl='https://foreign.example'
      />
    )

    expect(
      screen.getByRole('heading', { name: 'gpt-image-2 · Image generation' })
    ).toBeInTheDocument()
    expect(screen.getByText(/API model ID/)).toBeInTheDocument()
    expect(
      screen.getByText(
        'gpt-image-2 provides image generation and editing through an OpenAI-compatible API.'
      )
    ).toBeInTheDocument()
    expect(screen.getByText('image-generation')).toBeInTheDocument()
    expect(screen.getByText('web-serach: True')).toBeInTheDocument()
    expect(screen.getByText('prompt')).toBeInTheDocument()
    expect(screen.getByText('medium')).toBeInTheDocument()
    expect(screen.getByText('low / medium / high')).toBeInTheDocument()
    expect(
      screen.getAllByRole('button', { name: 'Copy to clipboard' }).length
    ).toBeGreaterThan(0)
    expect(screen.getByRole('tab', { name: 'JSON' })).toHaveAttribute(
      'data-active'
    )
  })

  test('renders a guide article as title and body without request chrome', () => {
    render(
      <DocsArticle
        endpoint={endpoint({
          id: 'billing-formula',
          kind: 'article',
          method: '',
          path: '',
          title: 'Billing formula guide',
          category: 'quickstart',
          try_it: false,
          async: false,
          related: [],
          description: '## Version\n\nUse `v2:0.04` for a fixed dollar amount.',
        })}
        baseUrl='https://foreign.example'
      />
    )

    expect(
      screen.getByRole('heading', { name: 'Billing formula guide' })
    ).toBeInTheDocument()
    expect(screen.getByText('Version')).toBeInTheDocument()
    expect(screen.getByText(/v2:0.04/)).toBeInTheDocument()
    expect(screen.queryByText('Request URL')).not.toBeInTheDocument()
    expect(screen.queryByText('Online run')).not.toBeInTheDocument()
  })
})
