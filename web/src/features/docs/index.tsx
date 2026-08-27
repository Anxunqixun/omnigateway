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
import { BookOpen } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { PublicLayout } from '@/components/layout'
import { PageTransition } from '@/components/page-transition'
import { Skeleton } from '@/components/ui/skeleton'
import { SearchBar } from '@/features/pricing/components/search-bar'

import { getDocsCatalog } from './api'
import type { DocsCatalogItem } from './types'

const CATEGORY_KEYS: Record<string, string> = {
  'getting-started': 'Getting Started',
  api: 'API Reference',
  billing: 'Billing',
  models: 'Models',
}

export function Docs({ selectedSlug }: { selectedSlug?: string }) {
  const { t } = useTranslation()
  const [search, setSearch] = useState('')
  const { data, isLoading } = useQuery({
    queryKey: ['docs-catalog'],
    queryFn: getDocsCatalog,
  })
  const items = data?.data?.items ?? []
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return items
    return items.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
    )
  }, [items, search])
  const grouped = useMemo(() => {
    const map = new Map<string, DocsCatalogItem[]>()
    for (const item of filtered) {
      const list = map.get(item.category) ?? []
      list.push(item)
      map.set(item.category, list)
    }
    return map
  }, [filtered])

  return (
    <PublicLayout>
      <PageTransition>
        <div className='mx-auto w-full max-w-6xl space-y-6 px-4 py-8 sm:px-6'>
          <div className='space-y-2'>
            <h1 className='text-2xl font-semibold'>{t('Docs')}</h1>
            <p className='text-muted-foreground text-sm'>
              {t('API keys, endpoints, billing, and published model guides.')}
            </p>
          </div>
          <SearchBar
            value={search}
            onChange={setSearch}
            onClear={() => setSearch('')}
            placeholder={t('Search docs...')}
          />
          {isLoading ? (
            <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-3'>
              {['a', 'b', 'c'].map((key) => (
                <Skeleton key={key} className='h-28 rounded-lg' />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <p className='text-muted-foreground text-sm'>{t('No docs found')}</p>
          ) : (
            <div className='space-y-8'>
              {[...grouped.entries()].map(([category, pages]) => (
                <section key={category} className='space-y-3'>
                  <h2 className='text-lg font-semibold'>
                    {t(CATEGORY_KEYS[category] || category)}
                  </h2>
                  <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-3'>
                    {pages.map((page) => (
                      <Link
                        key={page.id}
                        to='/docs/$slug'
                        params={{ slug: page.id }}
                        className={
                          selectedSlug === page.id
                            ? 'bg-secondary flex h-auto items-start gap-3 rounded-lg border p-4 text-left'
                            : 'hover:bg-muted/40 flex h-auto items-start gap-3 rounded-lg border p-4 text-left'
                        }
                      >
                        <BookOpen className='mt-0.5 size-4 shrink-0' />
                        <span className='min-w-0'>
                          <span className='block truncate font-medium'>
                            {page.title}
                          </span>
                          <span className='text-muted-foreground block truncate text-xs'>
                            {page.kind === 'model'
                              ? t('Model guide')
                              : t('Handbook')}
                          </span>
                        </span>
                      </Link>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      </PageTransition>
    </PublicLayout>
  )
}
