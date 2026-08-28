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
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { ConfirmDialog } from '@/components/confirm-dialog'
import { SectionPageLayout } from '@/components/layout'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { handleServerError } from '@/lib/handle-server-error'

import {
  deleteAdminChannelDoc,
  getAdminStandaloneDocs,
  saveAdminChannelDoc,
  saveAdminStandaloneDocs,
} from '../api'
import {
  applyFormToAdminDoc,
  isChannelAdminDoc,
  standaloneDocsFromAdmin,
  toStandaloneDoc,
  type AdminDoc,
} from '../lib/admin-docs'
import {
  STANDALONE_DOC_CATEGORIES,
  STANDALONE_DOC_KINDS,
  type StandaloneDoc,
} from '../lib/standalone-docs'
import { ApiDocsMutateDrawer } from './api-docs-mutate-drawer'

const ADMIN_DOCS_QUERY_KEY = ['admin-docs'] as const
const CHANNEL_STATUS_ENABLED = 1

type PersistPayload =
  | { type: 'standalone'; items: StandaloneDoc[] }
  | { type: 'channel-save'; doc: AdminDoc }
  | { type: 'channel-delete'; channelId: number; model?: string }

export function ApiDocsAdminPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [currentDoc, setCurrentDoc] = useState<AdminDoc | undefined>()
  const [pendingDelete, setPendingDelete] = useState<AdminDoc | undefined>()
  const { data, isLoading } = useQuery({
    queryKey: ADMIN_DOCS_QUERY_KEY,
    queryFn: getAdminStandaloneDocs,
  })
  const items = data?.data?.items ?? []
  const persistMutation = useMutation({
    mutationFn: async (payload: PersistPayload) => {
      if (payload.type === 'standalone') {
        return saveAdminStandaloneDocs(payload.items)
      }
      if (payload.type === 'channel-save') {
        return saveAdminChannelDoc(payload.doc)
      }
      return deleteAdminChannelDoc(payload.channelId, payload.model)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ADMIN_DOCS_QUERY_KEY })
      await queryClient.invalidateQueries({ queryKey: ['docs-catalog'] })
    },
  })

  const persist = async (payload: PersistPayload) => {
    let result
    try {
      result = await persistMutation.mutateAsync(payload)
    } catch (error) {
      handleServerError(error)
      throw error
    }
    if (!result.success) {
      toast.error(result.message || t('Failed to save API docs'))
      throw new Error(result.message || 'Failed to save API docs')
    }
    toast.success(t('API docs saved'))
  }

  return (
    <>
      <SectionPageLayout>
        <SectionPageLayout.Title>{t('API docs')}</SectionPageLayout.Title>
        <SectionPageLayout.Actions>
          <Button
            size='sm'
            onClick={() => {
              setCurrentDoc(undefined)
              setDrawerOpen(true)
            }}
          >
            <Plus className='h-4 w-4' />
            {t('Create document')}
          </Button>
        </SectionPageLayout.Actions>
        <SectionPageLayout.Content>
          <p className='text-muted-foreground mb-4 text-sm'>
            {t(
              'Edit standalone pages and channel docs here. Changes to a channel document are saved back to that channel.'
            )}
          </p>
          {isLoading ? (
            <div className='space-y-3'>
              <Skeleton className='h-24 w-full' />
              <Skeleton className='h-24 w-full' />
            </div>
          ) : null}
          {!isLoading && items.length === 0 ? (
            <p className='text-muted-foreground text-sm'>
              {t('No documents yet. Create a guide, or add docs on a channel.')}
            </p>
          ) : null}
          <div className='space-y-3'>
            {items.map((item) => (
              <DocCard
                key={item.id}
                item={item}
                onEdit={() => {
                  setCurrentDoc(item)
                  setDrawerOpen(true)
                }}
                onDelete={() => setPendingDelete(item)}
              />
            ))}
          </div>
        </SectionPageLayout.Content>
      </SectionPageLayout>
      <ApiDocsMutateDrawer
        open={drawerOpen}
        onOpenChange={(open) => {
          setDrawerOpen(open)
          if (!open) setCurrentDoc(undefined)
        }}
        currentDoc={currentDoc}
        existingIds={standaloneDocsFromAdmin(items).map((item) => item.id)}
        onSave={async (formDoc) => {
          const nextDoc = applyFormToAdminDoc(currentDoc, formDoc)
          if (isChannelAdminDoc(nextDoc)) {
            await persist({ type: 'channel-save', doc: nextDoc })
            return
          }
          const standalone = standaloneDocsFromAdmin(items)
          const next = currentDoc
            ? standalone.map((item) =>
                item.id === currentDoc.id ? toStandaloneDoc(nextDoc) : item
              )
            : [...standalone, toStandaloneDoc(nextDoc)]
          await persist({ type: 'standalone', items: next })
        }}
      />
      <ConfirmDialog
        destructive
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(undefined)
        }}
        title={t('Delete this document?')}
        desc={
          isChannelAdminDoc(pendingDelete)
            ? t(
                'This removes the docs from the channel. The public page will disappear.'
              )
            : t('This removes the public page. This action cannot be undone.')
        }
        confirmText={t('Delete')}
        isLoading={persistMutation.isPending}
        handleConfirm={() => {
          if (!pendingDelete) return
          let task: Promise<void> = Promise.resolve()
          if (isChannelAdminDoc(pendingDelete)) {
            if (pendingDelete.channel_id) {
              task = persist({
                type: 'channel-delete',
                channelId: pendingDelete.channel_id,
                model: pendingDelete.model,
              })
            }
          } else {
            task = persist({
              type: 'standalone',
              items: standaloneDocsFromAdmin(items).filter(
                (item) => item.id !== pendingDelete.id
              ),
            })
          }
          void task.then(() => setPendingDelete(undefined))
        }}
      />
    </>
  )
}

function DocCard(props: {
  item: AdminDoc
  onEdit: () => void
  onDelete: () => void
}) {
  const { t } = useTranslation()
  const kindLabel =
    STANDALONE_DOC_KINDS.find((item) => item.value === props.item.kind)
      ?.labelKey ?? 'Guide article'
  const categoryLabel =
    STANDALONE_DOC_CATEGORIES.find((item) => item.value === props.item.category)
      ?.labelKey ?? props.item.category
  const isChannel = isChannelAdminDoc(props.item)
  return (
    <Card size='sm'>
      <CardHeader className='flex flex-row items-start justify-between gap-3'>
        <div className='min-w-0 space-y-1'>
          <CardTitle className='truncate'>{props.item.title}</CardTitle>
          <CardDescription className='flex min-w-0 flex-wrap items-center gap-2 text-xs'>
            <code className='break-all'>{props.item.id}</code>
            {props.item.kind === 'endpoint' && props.item.path ? (
              <span className='font-mono break-all'>
                {props.item.method} {props.item.path}
              </span>
            ) : null}
          </CardDescription>
        </div>
        <div className='flex shrink-0 flex-wrap gap-2'>
          <Button size='sm' variant='outline' onClick={props.onEdit}>
            {t('Edit')}
          </Button>
          <Button size='sm' variant='ghost' onClick={props.onDelete}>
            {t('Delete')}
          </Button>
        </div>
      </CardHeader>
      <CardContent className='flex flex-wrap gap-2'>
        {isChannel ? (
          <Badge variant='secondary'>
            {props.item.model ? t('Model override') : t('Channel document')}
          </Badge>
        ) : (
          <Badge variant='secondary'>{t(kindLabel)}</Badge>
        )}
        {isChannel && props.item.channel_name ? (
          <Badge variant='outline'>{props.item.channel_name}</Badge>
        ) : null}
        {categoryLabel ? <Badge variant='outline'>{t(categoryLabel)}</Badge> : null}
        <Badge variant={props.item.published ? 'default' : 'outline'}>
          {props.item.published ? t('Published') : t('Draft')}
        </Badge>
        {isChannel &&
        props.item.channel_status !== undefined &&
        props.item.channel_status !== CHANNEL_STATUS_ENABLED ? (
          <Badge variant='outline'>{t('Disabled')}</Badge>
        ) : null}
      </CardContent>
    </Card>
  )
}
