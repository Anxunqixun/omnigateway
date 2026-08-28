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
import { useQuery } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { PublicLayout } from '@/components/layout'
import { PageTransition } from '@/components/page-transition'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

import { getDocsCatalog } from './api'
import { DocsArticle } from './components/docs-article'
import { DocsNav } from './components/docs-nav'
import { DocsTryIt } from './components/docs-try-it'
import { findDocsEndpoint, renderDocsText } from './lib/group-docs'

type DocsReferenceProps = {
  selectedId?: string
}

export function Docs({ selectedSlug }: { selectedSlug?: string }) {
  return <DocsReference selectedId={selectedSlug} />
}

export function DocsReference(props: DocsReferenceProps) {
  const { t } = useTranslation()
  const { data, isLoading } = useQuery({
    queryKey: ['docs-catalog'],
    queryFn: getDocsCatalog,
  })
  const baseUrl =
    data?.data?.base_url ||
    (typeof window !== 'undefined' ? window.location.origin : '')
  const items = (data?.data?.items ?? []).map((item) => ({
    ...item,
    request_example: renderDocsText(
      item.request_example || '',
      item.model,
      baseUrl
    ),
    response_example: renderDocsText(
      item.response_example || '',
      item.model,
      baseUrl
    ),
  }))
  const endpoint = findDocsEndpoint(items, props.selectedId)

  let article: ReactNode
  if (isLoading) {
    article = (
      <div className='space-y-3'>
        <Skeleton className='h-8 w-48' />
        <Skeleton className='h-64 w-full' />
      </div>
    )
  } else if (!endpoint) {
    article = <p className='text-muted-foreground'>{t('No docs found')}</p>
  } else {
    article = <DocsArticle endpoint={endpoint} baseUrl={baseUrl} />
  }

  return (
    <PublicLayout showMainContainer={false}>
      <PageTransition>
        <div
          className={cn(
            'mx-auto grid min-h-[calc(100svh-5rem)] w-full max-w-[1440px] gap-0 pt-20',
            endpoint?.kind === 'article'
              ? 'lg:grid-cols-[260px_minmax(0,1fr)]'
              : 'lg:grid-cols-[260px_minmax(0,1fr)_340px]'
          )}
        >
          <aside className='border-border/60 overflow-y-auto border-b p-4 lg:sticky lg:top-20 lg:h-[calc(100svh-5rem)] lg:border-r lg:border-b-0'>
            {isLoading ? (
              <div className='space-y-2'>
                <Skeleton className='h-6 w-32' />
                <Skeleton className='h-8 w-full' />
                <Skeleton className='h-8 w-full' />
              </div>
            ) : (
              <DocsNav items={items} selectedId={endpoint?.id} />
            )}
          </aside>
          <main className='min-w-0 overflow-y-auto p-4 sm:p-6'>
            {article}
          </main>
          {endpoint?.kind === 'article' ? null : (
            <div className='border-border/60 overflow-y-auto border-t p-4 lg:sticky lg:top-20 lg:h-[calc(100svh-5rem)] lg:border-t-0 lg:border-l'>
              {endpoint ? (
                <DocsTryIt endpoint={endpoint} baseUrl={baseUrl} />
              ) : null}
            </div>
          )}
        </div>
      </PageTransition>
    </PublicLayout>
  )
}
