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
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, test } from 'vitest'

const { createInstance } = await import('i18next')
const { I18nextProvider, initReactI18next } = await import('react-i18next')
const { QueryClient, QueryClientProvider } =
  await import('@tanstack/react-query')
const { api } = await import('@/lib/api')
const { ApiDocsAdminPage } = await import('../api-docs-admin-page')

const i18n = createInstance()
await i18n.use(initReactI18next).init({
  lng: 'en',
  resources: {
    en: {
      translation: {
        'API docs': 'API docs',
        'Create document': 'Create document',
        'Create API document': 'Create API document',
        'Edit API document': 'Edit API document',
        Edit: 'Edit',
        Delete: 'Delete',
        'Delete this document?': 'Delete this document?',
        'This removes the public page. This action cannot be undone.':
          'This removes the public page. This action cannot be undone.',
        'This removes the docs from the channel. The public page will disappear.':
          'This removes the docs from the channel. The public page will disappear.',
        'Guide article': 'Guide article',
        'Channel document': 'Channel document',
        'Model override': 'Model override',
        'Quick start': 'Quick start',
        Image: 'Image',
        Video: 'Video',
        Published: 'Published',
        'Document type': 'Document type',
        'Document ID': 'Document ID',
        Title: 'Title',
        Category: 'Category',
        Publish: 'Publish',
        'Article body': 'Article body',
        'Request path': 'Request path',
        Channel: 'Channel',
        Cancel: 'Cancel',
        Save: 'Save',
        'API docs saved': 'API docs saved',
      },
    },
  },
})

type ApiCall = (
  url: string,
  body?: unknown
) => Promise<{ data: unknown }>
type MockableApi = {
  get: ApiCall
  put: ApiCall
  delete: ApiCall
}
const apiClient = api as unknown as MockableApi
const originalGet = apiClient.get
const originalPut = apiClient.put
const originalDelete = apiClient.delete
let queryClient: InstanceType<typeof QueryClient> | null = null

const sampleDoc = {
  id: 'billing-formula',
  kind: 'article',
  source: 'standalone',
  published: true,
  title: 'Billing formula guide',
  description: 'v2:0.04',
  category: 'quickstart',
}

const channelDoc = {
  id: 'channel:1',
  source: 'channel',
  kind: 'endpoint',
  channel_id: 1,
  channel_name: 'gpt-image-2',
  channel_status: 1,
  published: true,
  try_it: true,
  title: 'gpt-image-2',
  path: '/v1/images/generations',
  method: 'POST',
  category: 'image',
}

const modelOverrideDoc = {
  id: 'channel:1:model:gemini-2.5-flash-image-preview',
  source: 'channel',
  kind: 'endpoint',
  channel_id: 1,
  channel_name: 'gpt-image-2',
  channel_status: 1,
  model: 'gemini-2.5-flash-image-preview',
  published: true,
  try_it: true,
  title: 'gemini-2.5-flash-image-preview',
  path: '/v1/images/generations',
  method: 'POST',
  category: 'image',
}

let lastPut: { url: string; body?: unknown } | null = null

function renderPage() {
  lastPut = null
  apiClient.get = async (url) => {
    if (url === '/api/docs/admin') {
      return {
        data: {
          success: true,
          data: { items: [sampleDoc, channelDoc, modelOverrideDoc] },
        },
      }
    }
    throw new Error(`Unexpected GET ${url}`)
  }
  apiClient.put = async (url, body) => {
    lastPut = { url, body }
    return { data: { success: true } }
  }
  apiClient.delete = async () => {
    return { data: { success: true } }
  }
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={queryClient}>
        <ApiDocsAdminPage />
      </QueryClientProvider>
    </I18nextProvider>
  )
}

function getNthButton(name: string, index: number) {
  const buttons = screen.getAllByRole('button', { name })
  const button = buttons[index]
  expect(button).toBeTruthy()
  return button as HTMLElement
}

afterEach(() => {
  apiClient.get = originalGet
  apiClient.put = originalPut
  apiClient.delete = originalDelete
  queryClient?.clear()
  queryClient = null
})

describe('api docs admin page actions', () => {
  test('clicking Create document opens the create drawer', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Billing formula guide')

    await user.click(screen.getByRole('button', { name: 'Create document' }))

    expect(
      screen.getByRole('heading', { name: 'Create API document' })
    ).toBeInTheDocument()
  })

  test('clicking Edit opens the edit drawer for that document', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Billing formula guide')

    await user.click(getNthButton('Edit', 0))

    expect(
      screen.getByRole('heading', { name: 'Edit API document' })
    ).toBeInTheDocument()
    expect(screen.getByDisplayValue('billing-formula')).toBeInTheDocument()
  })

  test('editing a channel document shows its request path and saves to the channel API', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('channel:1')

    await user.click(getNthButton('Edit', 1))

    expect(screen.getByLabelText('Request path')).toHaveValue(
      '/v1/images/generations'
    )
    expect(screen.getByLabelText('Document ID')).toBeDisabled()

    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(lastPut?.url).toBe('/api/docs/admin/channel/1')
    })
    expect(lastPut?.body).toMatchObject({
      id: 'channel:1',
      source: 'channel',
      channel_id: 1,
      path: '/v1/images/generations',
      title: 'gpt-image-2',
    })
  })

  test('clicking Delete on a channel document opens the channel confirm dialog', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('channel:1')

    await user.click(getNthButton('Delete', 1))

    expect(
      screen.getByRole('heading', { name: 'Delete this document?' })
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        'This removes the docs from the channel. The public page will disappear.'
      )
    ).toBeInTheDocument()
  })

  test('a model override subtitle keeps one font size and does not repeat the channel name', async () => {
    renderPage()
    const subtitle = await screen.findByText(
      'channel:1:model:gemini-2.5-flash-image-preview'
    )

    expect(subtitle.parentElement).toHaveClass('text-xs')
    expect(subtitle.parentElement?.textContent).toContain(
      'POST /v1/images/generations'
    )
    expect(subtitle.parentElement?.textContent).not.toContain('gpt-image-2')
    expect(screen.getByText('Model override')).toBeInTheDocument()
  })

  test('clicking Delete opens the confirm dialog', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Billing formula guide')

    await user.click(getNthButton('Delete', 0))

    expect(
      screen.getByRole('heading', { name: 'Delete this document?' })
    ).toBeInTheDocument()
  })
})
