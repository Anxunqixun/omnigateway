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
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Field,
  FieldDescription,
  FieldLabel,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { api } from '@/lib/api'
import { formatQuota } from '@/lib/format'

import type { PricingMode } from './model-pricing-core'

type ExprTryCalcProps = {
  modelName: string
  sellMode: PricingMode
  sellExpr: string
  costExpr: string
}

type SandboxResult = {
  preconsume_quota: number
  settle_quota: number
  delta_quota: number
  raw_preconsume?: number
  raw_settle?: number
  cost_quota?: number | null
  profit_quota?: number | null
  cost_unknown?: boolean
  matched_tier?: string
  preconsume_error?: string
  settle_error?: string
  cost_error?: string
}

export function ExprTryCalc(props: ExprTryCalcProps) {
  const { t } = useTranslation()
  const [groupRatio, setGroupRatio] = useState('1')
  const [requestJson, setRequestJson] = useState('{"seconds":4}')
  const [responseJson, setResponseJson] = useState(
    '{"data":{"duration":10},"usage":{"prompt_tokens":100,"completion_tokens":20}}'
  )
  const [result, setResult] = useState<SandboxResult | null>(null)
  const [busy, setBusy] = useState(false)
  const canPreview =
    props.costExpr.trim() !== '' ||
    ((props.sellMode === 'tiered_expr' || props.sellMode === 'formula') &&
      props.sellExpr.trim() !== '')
  const showSellPreview =
    props.sellMode === 'tiered_expr' || props.sellMode === 'formula'

  return (
    <div className='space-y-3 rounded-lg border p-4'>
      <div>
        <h4 className='text-sm font-medium'>{t('Try calculation')}</h4>
        <p className='text-muted-foreground text-sm'>
          {showSellPreview
            ? t(
                'Preview the base quota from this model formula, then the amount after group ratio. Group ratio is not written into the formula.'
              )
            : t(
                'Preview formulas you type here. Token and request sell prices stay in their own mode.'
              )}
        </p>
      </div>
      <Field>
        <FieldLabel>{t('Group ratio')}</FieldLabel>
        <Input
          inputMode='decimal'
          value={groupRatio}
          onChange={(event) => setGroupRatio(event.target.value)}
        />
        <FieldDescription>
          {t(
            'Same stack as live billing: expression first, then group ratio. Cost formulas never use group ratio.'
          )}
        </FieldDescription>
      </Field>
      <Field>
        <FieldLabel>{t('Request JSON')}</FieldLabel>
        <Textarea
          rows={5}
          className='font-mono text-xs'
          value={requestJson}
          onChange={(event) => setRequestJson(event.target.value)}
        />
      </Field>
      <Field>
        <FieldLabel>{t('Response or poll JSON')}</FieldLabel>
        <Textarea
          rows={5}
          className='font-mono text-xs'
          value={responseJson}
          onChange={(event) => setResponseJson(event.target.value)}
        />
      </Field>
      <Button
        type='button'
        disabled={busy || !canPreview}
        onClick={async () => {
          const parsedRatio = Number(groupRatio)
          if (!Number.isFinite(parsedRatio) || parsedRatio < 0) {
            toast.error(t('Enter a valid group ratio'))
            return
          }
          setBusy(true)
          try {
            const res = await api.post('/api/billing/sandbox', {
              model: props.modelName,
              expr: showSellPreview ? props.sellExpr : '',
              cost_expr: props.costExpr,
              group_ratio: parsedRatio,
              request: JSON.parse(requestJson || '{}'),
              response: JSON.parse(responseJson || '{}'),
            })
            if (!res.data?.success) {
              toast.error(res.data?.message || t('Try calculation failed'))
              return
            }
            setResult(res.data.data as SandboxResult)
          } catch (error) {
            toast.error((error as Error).message)
          } finally {
            setBusy(false)
          }
        }}
      >
        {t('Preview')}
      </Button>
      {result ? (
        <div className='space-y-1 text-sm'>
          {showSellPreview ? (
            <>
              <div>
                {t('Base pre-consume')}: {formatQuota(result.raw_preconsume ?? 0)}
              </div>
              <div>
                {t('After group ratio')}: {formatQuota(result.preconsume_quota)}
              </div>
              <div>
                {t('Base settlement')}: {formatQuota(result.raw_settle ?? 0)}
              </div>
              <div>
                {t('Settlement')}: {formatQuota(result.settle_quota)}
              </div>
              <div>
                {t('Delta')}: {formatQuota(result.delta_quota)}
              </div>
            </>
          ) : (
            <div className='text-muted-foreground'>
              {t(
                'Sell uses the token or request price above. This preview only evaluates formulas.'
              )}
            </div>
          )}
          <div>
            {t('Cost')}:{' '}
            {result.cost_unknown || result.cost_quota == null
              ? '—'
              : formatQuota(result.cost_quota)}
          </div>
          {result.matched_tier ? (
            <div>
              {t('Matched tier')}: {result.matched_tier}
            </div>
          ) : null}
          {showSellPreview && result.preconsume_error ? (
            <div className='text-destructive'>{result.preconsume_error}</div>
          ) : null}
          {showSellPreview && result.settle_error ? (
            <div className='text-destructive'>{result.settle_error}</div>
          ) : null}
          {result.cost_error ? (
            <div className='text-destructive'>{result.cost_error}</div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
