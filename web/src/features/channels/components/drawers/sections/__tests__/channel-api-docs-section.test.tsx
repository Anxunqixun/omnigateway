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
import userEvent from '@testing-library/user-event'
import { useForm } from 'react-hook-form'
import { describe, expect, test } from 'vitest'

import { Form } from '@/components/ui/form'

import {
  CHANNEL_FORM_DEFAULT_VALUES,
  type ChannelFormValues,
} from '../../../../lib/channel-form'
import { ChannelApiDocsSection } from '../channel-api-docs-section'

const { createInstance } = await import('i18next')
const { I18nextProvider, initReactI18next } = await import('react-i18next')

const i18n = createInstance()
await i18n.use(initReactI18next).init({
  lng: 'en',
  resources: {
    en: {
      translation: {
        'API docs': 'API docs',
        'Publish API docs': 'Publish API docs',
        'Enable try it': 'Enable try it',
        'Docs for model': 'Docs for model',
        'Each model has its own docs. Select a model to edit its description.':
          'Each model has its own docs. Select a model to edit its description.',
        Category: 'Category',
        Method: 'Method',
        'Request path': 'Request path',
        Title: 'Title',
        Description: 'Description',
        Capabilities: 'Capabilities',
        'Add capability': 'Add capability',
        'Required parameters': 'Required parameters',
        'Add required parameter': 'Add required parameter',
        'Optional parameters': 'Optional parameters',
        'Add optional parameter': 'Add optional parameter',
        'Request example': 'Request example',
        'Response example': 'Response example',
        'Related endpoints': 'Related endpoints',
        'Add poll endpoint': 'Add poll endpoint',
        'Add related endpoint': 'Add related endpoint',
        Remove: 'Remove',
        Text: 'Text',
        Image: 'Image',
        Video: 'Video',
        Audio: 'Audio',
      },
    },
  },
})

function DocsHarness() {
  const form = useForm<ChannelFormValues>({
    defaultValues: {
      ...CHANNEL_FORM_DEFAULT_VALUES,
      models: 'gpt-image-2,gpt-image-2-hd',
    },
  })
  return (
    <I18nextProvider i18n={i18n}>
      <Form {...form}>
        <ChannelApiDocsSection form={form} />
        <pre data-testid='docs-json'>
          {JSON.stringify(form.watch('api_docs'))}
        </pre>
      </Form>
    </I18nextProvider>
  )
}

describe('channel API docs per-model editing', () => {
  test('keeps a different description after switching between two models', async () => {
    const user = userEvent.setup()
    render(<DocsHarness />)

    const firstModel = screen.getByRole('button', { name: 'gpt-image-2' })
    const secondModel = screen.getByRole('button', { name: 'gpt-image-2-hd' })
    expect(firstModel).toHaveAttribute('aria-pressed', 'true')

    await user.type(screen.getByLabelText('Description'), 'Standard image docs')
    await user.click(secondModel)
    expect(secondModel).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByLabelText('Description')).toHaveValue('')

    await user.type(screen.getByLabelText('Description'), 'HD image extra fee')
    await user.click(firstModel)
    expect(screen.getByLabelText('Description')).toHaveValue(
      'Standard image docs'
    )

    const saved = JSON.parse(
      screen.getByTestId('docs-json').textContent || '{}'
    ) as {
      models?: Record<string, { description?: string }>
    }
    expect(saved.models?.['gpt-image-2']?.description).toBe(
      'Standard image docs'
    )
    expect(saved.models?.['gpt-image-2-hd']?.description).toBe(
      'HD image extra fee'
    )
  })
})
