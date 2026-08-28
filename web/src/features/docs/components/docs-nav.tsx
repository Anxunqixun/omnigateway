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
import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/utils'

import {
  DOCS_CATEGORY_LABEL_KEYS,
  docsEndpointDisplayTitle,
  docsEndpointNavLabel,
  groupDocsEndpoints,
} from '../lib/group-docs'
import type { DocsEndpoint } from '../types'

type DocsNavProps = {
  items: DocsEndpoint[]
  selectedId?: string
}

export function DocsNav(props: DocsNavProps) {
  const { t } = useTranslation()
  const grouped = groupDocsEndpoints(props.items)

  return (
    <nav aria-label={t('API docs navigation')} className='space-y-5'>
      <div>
        <p className='text-sm font-semibold'>{t('API Reference')}</p>
        <p className='text-muted-foreground text-xs'>
          {t('Live model catalog')}
        </p>
      </div>
      {grouped.map((group) => (
        <div key={group.category} className='space-y-1'>
          <h2 className='text-muted-foreground px-2 text-xs font-medium tracking-wide uppercase'>
            {t(DOCS_CATEGORY_LABEL_KEYS[group.category] || group.category)}
          </h2>
          <ul className='space-y-1'>
            {group.items.map((item) => (
              <li key={item.id}>
                <Link
                  to='/docs/$slug'
                  params={{ slug: item.id }}
                  aria-label={docsEndpointNavLabel(item, t)}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm',
                    props.selectedId === item.id
                      ? 'bg-blue-500/10 font-medium text-blue-700 dark:text-blue-300'
                      : 'hover:bg-muted/60'
                  )}
                >
                  {item.kind === 'article' ? null : (
                    <span
                      className={cn(
                        'shrink-0 rounded-md border px-1.5 py-0.5 font-mono text-[10px]',
                        item.method === 'GET'
                          ? 'border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-400'
                          : 'border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400'
                      )}
                    >
                      {item.method}
                    </span>
                  )}
                  <span className='truncate'>
                    {docsEndpointDisplayTitle(item, t)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  )
}
