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
import { describe, expect, test, vi } from 'vitest'

import type { AdminDoc } from '../../lib/admin-docs'
import { ApiDocsMutateDrawer } from '../api-docs-mutate-drawer'

const { createInstance } = await import('i18next')
const { I18nextProvider, initReactI18next } = await import('react-i18next')

const i18n = createInstance()
await i18n.use(initReactI18next).init({
  lng: 'en',
  resources: {
    en: {
      translation: {
        'Edit API document': 'Edit API document',
        'Create API document': 'Create API document',
        'Document type': 'Document type',
        'Document ID': 'Document ID',
        Title: 'Title',
        Category: 'Category',
        Publish: 'Publish',
        'Article body': 'Article body',
        'Request path': 'Request path',
        'Enable try it': 'Enable try it',
        Method: 'Method',
        Description: 'Description',
        'Required parameters': 'Required parameters',
        'Optional parameters': 'Optional parameters',
        'Request example': 'Request example',
        'Response example': 'Response example',
        Cancel: 'Cancel',
        Save: 'Save',
        'Guide article': 'Guide article',
        'API endpoint': 'API endpoint',
        'Quick start': 'Quick start',
        Tools: 'Tools',
        Channel: 'Channel',
        'The document id is assigned by the channel and cannot be changed.':
          'The document id is assigned by the channel and cannot be changed.',
        'This document belongs to a channel. Saving updates that channel.':
          'This document belongs to a channel. Saving updates that channel.',
      },
    },
  },
})

function renderDrawer(currentDoc?: AdminDoc) {
  return render(
    <I18nextProvider i18n={i18n}>
      <ApiDocsMutateDrawer
        open
        onOpenChange={() => undefined}
        currentDoc={currentDoc}
        existingIds={currentDoc ? [currentDoc.id] : []}
        onSave={vi.fn()}
      />
    </I18nextProvider>
  )
}

describe('standalone docs drawer', () => {
  test('article form shows a body field and hides the request path', () => {
    renderDrawer({
      id: 'billing-formula',
      kind: 'article',
      published: true,
      title: 'Billing formula guide',
      description: 'v2:0.04',
      category: 'quickstart',
    })

    expect(screen.getByLabelText('Article body')).toBeInTheDocument()
    expect(screen.queryByLabelText('Request path')).not.toBeInTheDocument()
    expect(screen.getByDisplayValue('billing-formula')).toBeInTheDocument()
  })

  test('endpoint form shows path and try-it instead of article body', () => {
    renderDrawer({
      id: 'materials',
      kind: 'endpoint',
      published: true,
      try_it: true,
      title: 'Upload',
      path: '/v1/materials',
      method: 'POST',
      category: 'tools',
    })

    expect(screen.getByLabelText('Request path')).toHaveValue('/v1/materials')
    expect(screen.getByRole('switch', { name: 'Enable try it' })).toBeChecked()
    expect(screen.queryByLabelText('Article body')).not.toBeInTheDocument()
  })

  test('channel document locks type and id and shows the request path', () => {
    renderDrawer({
      id: 'channel:5',
      source: 'channel',
      kind: 'endpoint',
      channel_id: 5,
      channel_name: 'seedance',
      published: true,
      title: 'Seedance video',
      path: 'https://mjnewapi.diwdiw.cn/v1/videos',
      method: 'POST',
      category: 'video',
    })

    expect(screen.getByLabelText('Document ID')).toBeDisabled()
    expect(screen.getByLabelText('Request path')).toHaveValue(
      'https://mjnewapi.diwdiw.cn/v1/videos'
    )
    expect(
      screen.getByText(
        'This document belongs to a channel. Saving updates that channel.'
      )
    ).toBeInTheDocument()
  })
})
