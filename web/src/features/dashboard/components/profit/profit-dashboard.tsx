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
import { Coins, TrendingDown, TrendingUp, CircleHelp } from 'lucide-react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { formatQuota } from '@/lib/format'
import { computeTimeRange } from '@/lib/time'

import { getProfitSummary } from '../../api'
import { StatCard } from '../ui/stat-card'

function toDate(ts: number) {
  return new Date(ts * 1000).toISOString().slice(0, 10)
}

export function ProfitDashboard() {
  const { t } = useTranslation()
  const range = useMemo(() => computeTimeRange(7), [])
  const { data, isLoading } = useQuery({
    queryKey: ['profit-summary', range.start_timestamp, range.end_timestamp],
    queryFn: () =>
      getProfitSummary({
        start_date: toDate(range.start_timestamp),
        end_date: toDate(range.end_timestamp),
      }),
  })
  const summary = data?.data
  const spark = (summary?.daily ?? []).map((item) => Number(item.profit_quota) || 0)
  const margin =
    summary && summary.sell_quota
      ? `${((summary.margin_rate || 0) * 100).toFixed(1)}%`
      : '—'

  return (
    <div className='space-y-3 sm:space-y-4'>
      <div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-4'>
        <StatCard
          title={t('Revenue')}
          value={summary ? formatQuota(summary.sell_quota) : '—'}
          description={t('User sell quota in the selected range')}
          icon={Coins}
          tone='accent-1'
          loading={isLoading}
        />
        <StatCard
          title={t('Cost')}
          value={
            summary && summary.cost_quota
              ? formatQuota(summary.cost_quota)
              : '—'
          }
          description={t('Upstream cost. Empty cost formulas show as —.')}
          icon={TrendingDown}
          tone='accent-2'
          loading={isLoading}
        />
        <StatCard
          title={t('Gross profit')}
          value={summary ? formatQuota(summary.profit_quota) : '—'}
          description={t('Sell minus known cost')}
          icon={TrendingUp}
          tone='accent-3'
          sparkline={spark}
          loading={isLoading}
        />
        <StatCard
          title={t('Margin')}
          value={margin}
          description={t(
            '{{count}} requests with unknown cost',
            { count: summary?.unknown_cost_count ?? 0 }
          )}
          icon={CircleHelp}
          loading={isLoading}
        />
      </div>
      <div className='overflow-hidden rounded-lg border'>
        <div className='border-b px-4 py-3 text-sm font-medium'>
          {t('By model')}
        </div>
        <div className='divide-y'>
          {(summary?.by_model ?? []).length === 0 ? (
            <p className='text-muted-foreground px-4 py-6 text-sm'>
              {t('No profit data yet')}
            </p>
          ) : (
            (summary?.by_model ?? []).map((row) => (
              <div
                key={row.key}
                className='flex items-center justify-between gap-3 px-4 py-2.5 text-sm'
              >
                <span className='truncate font-medium'>{row.key || '—'}</span>
                <span className='text-muted-foreground shrink-0'>
                  {t('Profit')}: {formatQuota(row.profit_quota)}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
