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
import { afterEach, describe, expect, test } from 'vitest'

const { createInstance } = await import('i18next')
const { I18nextProvider, initReactI18next } = await import('react-i18next')
const { QueryClient, QueryClientProvider } =
  await import('@tanstack/react-query')
const { api } = await import('@/lib/api')
const { UsersProvider } = await import('../users-provider')
const { UsersMutateDrawer } = await import('../users-mutate-drawer')

const i18n = createInstance()
await i18n.use(initReactI18next).init({
  lng: 'en',
  resources: {
    en: {
      translation: {
        'Model sell ratios': 'Model sell ratios',
        'Add model ratio': 'Add model ratio',
        'Model name': 'Model name',
      },
    },
  },
})

type ApiMethod = (url: string) => Promise<{ data: unknown }>
type MockableApi = { get: ApiMethod }
const apiClient = api as unknown as MockableApi
const originalGet = apiClient.get
let queryClient: InstanceType<typeof QueryClient> | null = null

function renderDrawer() {
  apiClient.get = async (url) => {
    if (url === '/api/group/') {
      return { data: { success: true, data: ['default'] } }
    }
    if (url === '/api/authz/catalog') {
      return { data: { data: { resources: [], roles: [] } } }
    }
    throw new Error(`Unexpected GET ${url}`)
  }
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={queryClient}>
        <UsersProvider>
          <UsersMutateDrawer open onOpenChange={() => undefined} />
        </UsersProvider>
      </QueryClientProvider>
    </I18nextProvider>
  )
}

afterEach(() => {
  apiClient.get = originalGet
  queryClient?.clear()
  queryClient = null
})

describe('users mutate drawer model sell ratios', () => {
  test('shows model sell ratios next to account fields when creating a user', () => {
    renderDrawer()
    expect(screen.getByText('Model sell ratios')).toBeTruthy()
    expect(screen.getByPlaceholderText('Model name')).toBeTruthy()
    expect(
      screen.getByRole('button', { name: 'Add model ratio' })
    ).toBeTruthy()
  })
})
