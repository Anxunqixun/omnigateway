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
import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { PublicLayout } from '@/components/layout'
import { PageTransition } from '@/components/page-transition'
import { RichContent } from '@/components/rich-content'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

import { getDocsPage } from './api'

export function DocsPage({ slug }: { slug: string }) {
  const { t } = useTranslation()
  const { data, isLoading } = useQuery({
    queryKey: ['docs-page', slug],
    queryFn: () => getDocsPage(slug),
  })
  const page = data?.data

  return (
    <PublicLayout>
      <PageTransition>
        <div className='mx-auto w-full max-w-4xl space-y-6 px-4 py-8 sm:px-6'>
          <Button variant='ghost' size='sm' render={<Link to='/docs' />}>
            {t('Back to docs')}
          </Button>
          {isLoading ? (
            <div className='space-y-3'>
              <Skeleton className='h-8 w-48' />
              <Skeleton className='h-64 w-full' />
            </div>
          ) : !page ? (
            <p className='text-muted-foreground'>{t('Document not found')}</p>
          ) : (
            <article className='space-y-4'>
              <h1 className='text-2xl font-semibold'>{page.title}</h1>
              <RichContent
                mode='markdown'
                className='text-sm leading-relaxed'
                content={page.markdown}
              />
            </article>
          )}
        </div>
      </PageTransition>
    </PublicLayout>
  )
}
