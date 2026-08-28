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
import { FileText, Plus, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { UseFormReturn } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

import {
  SideDrawerSection,
  SideDrawerSectionHeader,
  sideDrawerSwitchItemClassName,
} from '@/components/drawer-layout'
import { Button } from '@/components/ui/button'
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'

import type { ChannelFormValues } from '../../../lib/channel-form'
import {
  API_DOCS_CATEGORIES,
  API_DOCS_METHODS,
  DEFAULT_API_DOCS_PATHS,
  defaultVideoPollRelated,
  emptyChannelApiDocParam,
  emptyChannelApiDocRelated,
  emptyChannelApiDocTag,
  emptyChannelApiDocs,
  ensureDefaultPollRelated,
  hasVideoPollRelated,
  resolveChannelModelDocs,
  writeChannelModelDocs,
  type ChannelApiDocsContent,
} from '../../../lib/channel-api-docs'

type ChannelApiDocsSectionProps = {
  form: UseFormReturn<ChannelFormValues>
}

export function ChannelApiDocsSection(props: ChannelApiDocsSectionProps) {
  const { t } = useTranslation()
  const watchedDocs = props.form.watch('api_docs') ?? emptyChannelApiDocs()
  const docs = {
    ...emptyChannelApiDocs(),
    ...watchedDocs,
    capabilities: watchedDocs.capabilities ?? [],
    required_params: watchedDocs.required_params ?? [],
    optional_params: watchedDocs.optional_params ?? [],
    related_endpoints: watchedDocs.related_endpoints ?? [],
    models: watchedDocs.models ?? {},
  }
  const models = String(props.form.watch('models') || '')
    .split(',')
    .map((name) => name.trim())
    .filter(Boolean)
  const [selectedModel, setSelectedModel] = useState(models[0] ?? '')

  useEffect(() => {
    if (models.length === 0) {
      if (selectedModel !== '') setSelectedModel('')
      return
    }
    if (!models.includes(selectedModel)) {
      setSelectedModel(models[0] ?? '')
    }
  }, [models, selectedModel])

  const content = selectedModel
    ? resolveChannelModelDocs(docs, selectedModel)
    : docs

  const applyContent = (patch: Partial<ChannelApiDocsContent>) => {
    const current = props.form.getValues('api_docs') ?? emptyChannelApiDocs()
    if (!selectedModel) {
      props.form.setValue(
        'api_docs',
        {
          ...current,
          ...patch,
        },
        { shouldDirty: true }
      )
      return
    }
    props.form.setValue(
      'api_docs',
      writeChannelModelDocs(current, selectedModel, patch),
      { shouldDirty: true }
    )
  }

  const updatePathForCategory = (category: string) => {
    const knownPaths = Object.values(DEFAULT_API_DOCS_PATHS)
    if (!content.path || knownPaths.includes(content.path)) {
      applyContent({
        category,
        path: DEFAULT_API_DOCS_PATHS[category] || content.path,
      })
      return
    }
    applyContent({ category })
  }

  return (
    <SideDrawerSection>
      <SideDrawerSectionHeader
        title={t('API docs')}
        description={t(
          'Write the public API reference for models on this channel. Customers see model endpoints, not the channel name.'
        )}
        icon={<FileText className='h-4 w-4' aria-hidden='true' />}
        iconTone='info'
      />

      <FormField
        control={props.form.control}
        name='api_docs.published'
        render={({ field }) => (
          <FormItem className={sideDrawerSwitchItemClassName()}>
            <FormLabel>{t('Publish API docs')}</FormLabel>
            <FormControl>
              <Switch checked={field.value} onCheckedChange={field.onChange} />
            </FormControl>
          </FormItem>
        )}
      />
      <FormField
        control={props.form.control}
        name='api_docs.try_it'
        render={({ field }) => (
          <FormItem className={sideDrawerSwitchItemClassName()}>
            <div>
              <FormLabel>{t('Enable try it')}</FormLabel>
              <FormDescription>
                {t(
                  'Lets visitors send a request from the docs page using their own API key.'
                )}
              </FormDescription>
            </div>
            <FormControl>
              <Switch checked={field.value} onCheckedChange={field.onChange} />
            </FormControl>
          </FormItem>
        )}
      />

      {models.length > 0 ? (
        <div className='space-y-2'>
          <div>
            <p className='text-sm font-medium'>{t('Docs for model')}</p>
            <p className='text-muted-foreground text-xs'>
              {t(
                'Each model has its own docs. Select a model to edit its description.'
              )}
            </p>
          </div>
          <div className='flex flex-wrap gap-2'>
            {models.map((name) => (
              <Button
                key={name}
                type='button'
                size='sm'
                variant={selectedModel === name ? 'default' : 'outline'}
                aria-pressed={selectedModel === name}
                onClick={() => setSelectedModel(name)}
              >
                {name}
              </Button>
            ))}
          </div>
        </div>
      ) : (
        <p className='text-muted-foreground text-sm'>
          {t(
            'Add models above, then write a different description for each model.'
          )}
        </p>
      )}

      <div className='grid gap-4 sm:grid-cols-2'>
        <FormItem>
          <FormLabel>{t('Category')}</FormLabel>
          <Select
            items={API_DOCS_CATEGORIES.map((item) => ({
              value: item.value,
              label: t(item.labelKey),
            }))}
            value={content.category}
            onValueChange={(value) => {
              if (!value) return
              updatePathForCategory(value)
              if (value === 'video') {
                const current =
                  props.form.getValues('api_docs') ?? emptyChannelApiDocs()
                const next = ensureDefaultPollRelated({
                  ...current,
                  category: value,
                })
                props.form.setValue(
                  'api_docs.related_endpoints',
                  next.related_endpoints,
                  { shouldDirty: true }
                )
              }
            }}
          >
            <FormControl>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              <SelectGroup>
                {API_DOCS_CATEGORIES.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {t(item.labelKey)}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </FormItem>
        <FormItem>
          <FormLabel>{t('Method')}</FormLabel>
          <Select
            items={API_DOCS_METHODS.map((method) => ({
              value: method,
              label: method,
            }))}
            value={content.method}
            onValueChange={(value) => {
              if (!value) return
              applyContent({ method: value })
            }}
          >
            <FormControl>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              <SelectGroup>
                {API_DOCS_METHODS.map((method) => (
                  <SelectItem key={method} value={method}>
                    {method}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </FormItem>
      </div>

      <FormItem>
        <FormLabel>{t('Request path')}</FormLabel>
        <FormControl>
          <Input
            placeholder='https://api.example.com/v1/videos'
            value={content.path}
            onChange={(event) => applyContent({ path: event.target.value })}
          />
        </FormControl>
        <FormDescription>
          {t(
            'Gateway path or a full http(s) URL, for example /v1/videos or https://api.example.com/v1/videos.'
          )}
        </FormDescription>
      </FormItem>
      <FormItem>
        <FormLabel>{t('Title')}</FormLabel>
        <FormControl>
          <Input
            value={content.title}
            onChange={(event) => applyContent({ title: event.target.value })}
          />
        </FormControl>
      </FormItem>
      <FormItem>
        <FormLabel>{t('Description')}</FormLabel>
        <FormControl>
          <Textarea
            rows={3}
            value={content.description}
            onChange={(event) =>
              applyContent({ description: event.target.value })
            }
          />
        </FormControl>
        <FormMessage />
      </FormItem>

      {content.category === 'video' ? (
        <p className='text-muted-foreground text-sm'>
          {t(
            'Video tasks are submitted first, then queried until they finish. Customers must poll the gateway, not the upstream vendor.'
          )}
        </p>
      ) : null}

      <DocsParamList
        title={t('Capabilities')}
        emptyLabel={t('Add capability')}
        columns={['label', 'value']}
        rows={content.capabilities}
        onAdd={() =>
          applyContent({
            capabilities: [...content.capabilities, emptyChannelApiDocTag()],
          })
        }
        onRemove={(index) =>
          applyContent({
            capabilities: content.capabilities.filter(
              (_, itemIndex) => itemIndex !== index
            ),
          })
        }
        onChange={(index, key, value) => {
          applyContent({
            capabilities: content.capabilities.map((row, itemIndex) =>
              itemIndex === index ? { ...row, [key]: value } : row
            ),
          })
        }}
      />
      <DocsParamList
        title={t('Required parameters')}
        emptyLabel={t('Add required parameter')}
        columns={['name', 'type', 'default', 'range', 'description']}
        rows={content.required_params}
        onAdd={() =>
          applyContent({
            required_params: [
              ...content.required_params,
              emptyChannelApiDocParam(),
            ],
          })
        }
        onRemove={(index) =>
          applyContent({
            required_params: content.required_params.filter(
              (_, itemIndex) => itemIndex !== index
            ),
          })
        }
        onChange={(index, key, value) => {
          applyContent({
            required_params: content.required_params.map((row, itemIndex) =>
              itemIndex === index ? { ...row, [key]: value } : row
            ),
          })
        }}
      />
      <DocsParamList
        title={t('Optional parameters')}
        emptyLabel={t('Add optional parameter')}
        columns={['name', 'type', 'default', 'range', 'description']}
        rows={content.optional_params}
        onAdd={() =>
          applyContent({
            optional_params: [
              ...content.optional_params,
              emptyChannelApiDocParam(),
            ],
          })
        }
        onRemove={(index) =>
          applyContent({
            optional_params: content.optional_params.filter(
              (_, itemIndex) => itemIndex !== index
            ),
          })
        }
        onChange={(index, key, value) => {
          applyContent({
            optional_params: content.optional_params.map((row, itemIndex) =>
              itemIndex === index ? { ...row, [key]: value } : row
            ),
          })
        }}
      />

      <FormItem>
        <FormLabel>{t('Request example')}</FormLabel>
        <FormControl>
          <Textarea
            rows={8}
            className='font-mono text-xs'
            value={content.request_example}
            onChange={(event) =>
              applyContent({ request_example: event.target.value })
            }
          />
        </FormControl>
        <FormDescription>
          {t('You can write {{name}} and {{url}} as placeholders.', {
            name: '{{MODEL_NAME}}',
            url: '{{BASE_URL}}',
          })}
        </FormDescription>
      </FormItem>
      <FormItem>
        <FormLabel>{t('Response example')}</FormLabel>
        <FormControl>
          <Textarea
            rows={8}
            className='font-mono text-xs'
            value={content.response_example}
            onChange={(event) =>
              applyContent({ response_example: event.target.value })
            }
          />
        </FormControl>
      </FormItem>

      <div className='space-y-3'>
        <div className='flex flex-wrap items-center justify-between gap-2'>
          <h3 className='text-sm font-medium'>{t('Related endpoints')}</h3>
          <div className='flex flex-wrap gap-2'>
            <Button
              type='button'
              variant='outline'
              size='sm'
              onClick={() => {
                if (hasVideoPollRelated(docs.related_endpoints)) return
                props.form.setValue(
                  'api_docs.related_endpoints',
                  [...docs.related_endpoints, defaultVideoPollRelated()],
                  { shouldDirty: true }
                )
              }}
            >
              <Plus className='mr-1 size-3.5' />
              {t('Add poll endpoint')}
            </Button>
            <Button
              type='button'
              variant='outline'
              size='sm'
              onClick={() =>
                props.form.setValue(
                  'api_docs.related_endpoints',
                  [...docs.related_endpoints, emptyChannelApiDocRelated()],
                  { shouldDirty: true }
                )
              }
            >
              <Plus className='mr-1 size-3.5' />
              {t('Add related endpoint')}
            </Button>
          </div>
        </div>
        {docs.related_endpoints.map((row, index) => (
          <div key={row.rowKey} className='space-y-2 rounded-lg border p-3'>
            <div className='grid gap-2 sm:grid-cols-[120px_1fr_auto]'>
              <Input
                value={row.method}
                onChange={(event) => {
                  const next = docs.related_endpoints.map((item, itemIndex) =>
                    itemIndex === index
                      ? { ...item, method: event.target.value }
                      : item
                  )
                  props.form.setValue('api_docs.related_endpoints', next, {
                    shouldDirty: true,
                  })
                }}
                placeholder='GET'
              />
              <Input
                value={row.path}
                onChange={(event) => {
                  const next = docs.related_endpoints.map((item, itemIndex) =>
                    itemIndex === index
                      ? { ...item, path: event.target.value }
                      : item
                  )
                  props.form.setValue('api_docs.related_endpoints', next, {
                    shouldDirty: true,
                  })
                }}
                placeholder='/v1/videos/{id}'
              />
              <Button
                type='button'
                variant='ghost'
                size='icon'
                aria-label={t('Remove')}
                onClick={() =>
                  props.form.setValue(
                    'api_docs.related_endpoints',
                    docs.related_endpoints.filter(
                      (_, itemIndex) => itemIndex !== index
                    ),
                    { shouldDirty: true }
                  )
                }
              >
                <Trash2 className='size-4' />
              </Button>
            </div>
            <Input
              value={row.title}
              onChange={(event) => {
                const next = docs.related_endpoints.map((item, itemIndex) =>
                  itemIndex === index
                    ? { ...item, title: event.target.value }
                    : item
                )
                props.form.setValue('api_docs.related_endpoints', next, {
                  shouldDirty: true,
                })
              }}
              placeholder={t('Title')}
            />
            <Textarea
              rows={2}
              value={row.description}
              onChange={(event) => {
                const next = docs.related_endpoints.map((item, itemIndex) =>
                  itemIndex === index
                    ? { ...item, description: event.target.value }
                    : item
                )
                props.form.setValue('api_docs.related_endpoints', next, {
                  shouldDirty: true,
                })
              }}
              placeholder={t('Description')}
            />
            <Textarea
              rows={4}
              className='font-mono text-xs'
              value={row.request_example}
              onChange={(event) => {
                const next = docs.related_endpoints.map((item, itemIndex) =>
                  itemIndex === index
                    ? { ...item, request_example: event.target.value }
                    : item
                )
                props.form.setValue('api_docs.related_endpoints', next, {
                  shouldDirty: true,
                })
              }}
              placeholder={t('Request example')}
            />
            <Textarea
              rows={4}
              className='font-mono text-xs'
              value={row.response_example}
              onChange={(event) => {
                const next = docs.related_endpoints.map((item, itemIndex) =>
                  itemIndex === index
                    ? { ...item, response_example: event.target.value }
                    : item
                )
                props.form.setValue('api_docs.related_endpoints', next, {
                  shouldDirty: true,
                })
              }}
              placeholder={t('Response example')}
            />
            <label className='flex items-center gap-2 text-sm'>
              <Switch
                checked={row.try_it}
                onCheckedChange={(checked) => {
                  const next = docs.related_endpoints.map((item, itemIndex) =>
                    itemIndex === index ? { ...item, try_it: checked } : item
                  )
                  props.form.setValue('api_docs.related_endpoints', next, {
                    shouldDirty: true,
                  })
                }}
              />
              {t('Enable try it')}
            </label>
          </div>
        ))}
      </div>
    </SideDrawerSection>
  )
}

type DocsParamListProps = {
  title: string
  emptyLabel: string
  columns: string[]
  rows: Array<Record<string, string>>
  onAdd: () => void
  onRemove: (index: number) => void
  onChange: (index: number, key: string, value: string) => void
}

function DocsParamList(props: DocsParamListProps) {
  const { t } = useTranslation()
  return (
    <div className='space-y-2'>
      <div className='flex items-center justify-between gap-2'>
        <h3 className='text-sm font-medium'>{props.title}</h3>
        <Button type='button' variant='outline' size='sm' onClick={props.onAdd}>
          <Plus className='mr-1 size-3.5' />
          {props.emptyLabel}
        </Button>
      </div>
      {props.rows.map((row, index) => (
        <div
          key={row.rowKey}
          className='grid gap-2 sm:grid-cols-[repeat(auto-fit,minmax(120px,1fr))_auto]'
        >
          {props.columns.map((column) => (
            <Input
              key={column}
              value={row[column] ?? ''}
              placeholder={t(columnLabel(column))}
              onChange={(event) =>
                props.onChange(index, column, event.target.value)
              }
            />
          ))}
          <Button
            type='button'
            variant='ghost'
            size='icon'
            aria-label={t('Remove')}
            onClick={() => props.onRemove(index)}
          >
            <Trash2 className='size-4' />
          </Button>
        </div>
      ))}
    </div>
  )
}

function columnLabel(column: string): string {
  if (column === 'name') return 'Name'
  if (column === 'type') return 'Type'
  if (column === 'default') return 'Default'
  if (column === 'range') return 'Range'
  if (column === 'description') return 'Description'
  if (column === 'label') return 'Label'
  if (column === 'value') return 'Value'
  return column
}
