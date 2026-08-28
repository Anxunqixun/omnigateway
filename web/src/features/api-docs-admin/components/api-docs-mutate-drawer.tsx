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
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useFieldArray, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

import {
  SideDrawerSection,
  sideDrawerContentClassName,
  sideDrawerFooterClassName,
  sideDrawerFormClassName,
  sideDrawerHeaderClassName,
  sideDrawerSwitchItemClassName,
} from '@/components/drawer-layout'
import { Button } from '@/components/ui/button'
import {
  Form,
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
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'

import {
  adminDocToForm,
  isChannelAdminDoc,
  type AdminDoc,
} from '../lib/admin-docs'
import {
  emptyParamRow,
  formToStandaloneDoc,
  STANDALONE_DOC_CATEGORIES,
  STANDALONE_DOC_KINDS,
  standaloneDocFormSchema,
  type StandaloneDoc,
  type StandaloneDocFormValues,
} from '../lib/standalone-docs'

const ENDPOINT_METHODS = ['POST', 'GET'] as const

type ApiDocsMutateDrawerProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentDoc?: AdminDoc
  existingIds: string[]
  onSave: (doc: StandaloneDoc) => Promise<void>
}

export function ApiDocsMutateDrawer(props: ApiDocsMutateDrawerProps) {
  const { t } = useTranslation()
  const isUpdate = Boolean(props.currentDoc)
  const isChannel = isChannelAdminDoc(props.currentDoc)
  const isModelOverride = isChannel && Boolean(props.currentDoc?.model)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const form = useForm<StandaloneDocFormValues>({
    resolver: zodResolver(standaloneDocFormSchema),
    defaultValues: adminDocToForm(props.currentDoc),
  })
  const requiredParams = useFieldArray({
    control: form.control,
    name: 'required_params',
  })
  const optionalParams = useFieldArray({
    control: form.control,
    name: 'optional_params',
  })
  const kind = form.watch('kind')

  useEffect(() => {
    if (!props.open) return
    form.reset(adminDocToForm(props.currentDoc))
  }, [form, props.currentDoc, props.open])

  const handleSubmit = form.handleSubmit(async (values) => {
    const next = formToStandaloneDoc(values)
    const originalId = props.currentDoc?.id
    const taken =
      !isChannel &&
      props.existingIds.some((id) => id === next.id && id !== originalId)
    if (taken) {
      form.setError('id', { message: t('This document id is already used') })
      return
    }
    setIsSubmitting(true)
    try {
      await props.onSave(next)
      props.onOpenChange(false)
    } finally {
      setIsSubmitting(false)
    }
  })

  return (
    <Sheet open={props.open} onOpenChange={props.onOpenChange}>
      <SheetContent className={sideDrawerContentClassName('sm:max-w-[640px]')}>
        <SheetHeader className={sideDrawerHeaderClassName()}>
          <SheetTitle>
            {isUpdate ? t('Edit API document') : t('Create API document')}
          </SheetTitle>
          <SheetDescription>
            {isChannel
              ? t(
                  'This document belongs to a channel. Saving updates that channel.'
                )
              : t(
                  'Use the form to write a public endpoint or a guide article. Customers see this on the docs page.'
                )}
          </SheetDescription>
        </SheetHeader>
        <Form {...form}>
          <form
            id='standalone-doc-form'
            onSubmit={handleSubmit}
            className={sideDrawerFormClassName()}
          >
            <SideDrawerSection>
              <FormField
                control={form.control}
                name='kind'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('Document type')}</FormLabel>
                    <Select
                      items={STANDALONE_DOC_KINDS.map((item) => ({
                        value: item.value,
                        label: t(item.labelKey),
                      }))}
                      value={field.value}
                      disabled={isChannel}
                      onValueChange={(value) => {
                        if (!value || isChannel) return
                        field.onChange(value)
                      }}
                    >
                      <FormControl>
                        <SelectTrigger disabled={isChannel}>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectGroup>
                          {STANDALONE_DOC_KINDS.map((item) => (
                            <SelectItem key={item.value} value={item.value}>
                              {t(item.labelKey)}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='id'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('Document ID')}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder='billing-formula'
                        autoComplete='off'
                        disabled={isChannel}
                      />
                    </FormControl>
                    <FormDescription>
                      {isChannel
                        ? t(
                            'The document id is assigned by the channel and cannot be changed.'
                          )
                        : t(
                            'Public URL slug. Use lowercase letters, numbers, and hyphens.'
                          )}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='title'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('Title')}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    {isChannel && props.currentDoc?.channel_name ? (
                      <FormDescription>
                        {t('Channel')}: {props.currentDoc.channel_name}
                        {props.currentDoc.model
                          ? ` · ${t('Model')}: ${props.currentDoc.model}`
                          : ''}
                      </FormDescription>
                    ) : null}
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='category'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('Category')}</FormLabel>
                    <Select
                      items={STANDALONE_DOC_CATEGORIES.map((item) => ({
                        value: item.value,
                        label: t(item.labelKey),
                      }))}
                      value={field.value}
                      onValueChange={(value) => {
                        if (!value) return
                        field.onChange(value)
                      }}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectGroup>
                          {STANDALONE_DOC_CATEGORIES.map((item) => (
                            <SelectItem key={item.value} value={item.value}>
                              {t(item.labelKey)}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {isModelOverride ? null : (
                <FormField
                  control={form.control}
                  name='published'
                  render={({ field }) => (
                    <FormItem className={sideDrawerSwitchItemClassName()}>
                      <FormLabel>{t('Publish')}</FormLabel>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              )}
              {kind === 'article' ? (
                <FormField
                  control={form.control}
                  name='description'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('Article body')}</FormLabel>
                      <FormControl>
                        <Textarea rows={18} className='font-mono text-xs' {...field} />
                      </FormControl>
                      <FormDescription>
                        {t('Markdown is supported. Visitors can copy the full page.')}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : (
                <>
                  {isModelOverride ? null : (
                    <FormField
                      control={form.control}
                      name='try_it'
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
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  )}
                  <FormField
                    control={form.control}
                    name='method'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('Method')}</FormLabel>
                        <Select
                          items={ENDPOINT_METHODS.map((method) => ({
                            value: method,
                            label: method,
                          }))}
                          value={field.value}
                          onValueChange={(value) => {
                            if (!value) return
                            field.onChange(value)
                          }}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectGroup>
                              {ENDPOINT_METHODS.map((method) => (
                                <SelectItem key={method} value={method}>
                                  {method}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name='path'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('Request path')}</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder='https://api.example.com/v1/materials'
                          />
                        </FormControl>
                        <FormDescription>
                          {t(
                            'Gateway path or a full http(s) URL, for example /v1/videos or https://api.example.com/v1/videos.'
                          )}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name='description'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('Description')}</FormLabel>
                        <FormControl>
                          <Textarea rows={4} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <ParamRows
                    title={t('Required parameters')}
                    emptyLabel={t('Add required parameter')}
                    fields={requiredParams.fields}
                    onAdd={() => requiredParams.append(emptyParamRow())}
                    onRemove={requiredParams.remove}
                    namePrefix='required_params'
                    form={form}
                  />
                  <ParamRows
                    title={t('Optional parameters')}
                    emptyLabel={t('Add optional parameter')}
                    fields={optionalParams.fields}
                    onAdd={() => optionalParams.append(emptyParamRow())}
                    onRemove={optionalParams.remove}
                    namePrefix='optional_params'
                    form={form}
                  />
                  <FormField
                    control={form.control}
                    name='request_example'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('Request example')}</FormLabel>
                        <FormControl>
                          <Textarea rows={8} className='font-mono text-xs' {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name='response_example'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('Response example')}</FormLabel>
                        <FormControl>
                          <Textarea rows={8} className='font-mono text-xs' {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}
            </SideDrawerSection>
          </form>
        </Form>
        <SheetFooter className={sideDrawerFooterClassName()}>
          <SheetClose render={<Button type='button' variant='outline' />}>
            {t('Cancel')}
          </SheetClose>
          <Button
            type='submit'
            form='standalone-doc-form'
            disabled={isSubmitting}
          >
            {isSubmitting ? t('Saving...') : t('Save')}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

type ParamRowsProps = {
  title: string
  emptyLabel: string
  fields: Array<{ id: string }>
  onAdd: () => void
  onRemove: (index: number) => void
  namePrefix: 'required_params' | 'optional_params'
  form: ReturnType<typeof useForm<StandaloneDocFormValues>>
}

function ParamRows(props: ParamRowsProps) {
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
      {props.fields.map((field, index) => (
        <div
          key={field.id}
          className='grid gap-2 sm:grid-cols-[repeat(auto-fit,minmax(110px,1fr))_auto]'
        >
          <FormField
            control={props.form.control}
            name={`${props.namePrefix}.${index}.name`}
            render={({ field: item }) => (
              <FormItem>
                <FormControl>
                  <Input {...item} placeholder={t('Name')} />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={props.form.control}
            name={`${props.namePrefix}.${index}.type`}
            render={({ field: item }) => (
              <FormItem>
                <FormControl>
                  <Input {...item} placeholder={t('Type')} />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={props.form.control}
            name={`${props.namePrefix}.${index}.default`}
            render={({ field: item }) => (
              <FormItem>
                <FormControl>
                  <Input {...item} placeholder={t('Default')} />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={props.form.control}
            name={`${props.namePrefix}.${index}.range`}
            render={({ field: item }) => (
              <FormItem>
                <FormControl>
                  <Input {...item} placeholder={t('Range')} />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={props.form.control}
            name={`${props.namePrefix}.${index}.description`}
            render={({ field: item }) => (
              <FormItem>
                <FormControl>
                  <Input {...item} placeholder={t('Description')} />
                </FormControl>
              </FormItem>
            )}
          />
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
