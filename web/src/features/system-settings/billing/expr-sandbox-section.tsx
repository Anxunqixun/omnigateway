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
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { api } from '@/lib/api'
import { formatQuota } from '@/lib/format'

import { SettingsSection } from '../components/settings-section'
import { useUpdateOption } from '../hooks/use-update-option'

type ExprSandboxSectionProps = {
  costExprDefault: string
}

type SandboxResult = {
  preconsume_quota: number
  settle_quota: number
  delta_quota: number
  cost_quota?: number | null
  profit_quota?: number | null
  cost_unknown?: boolean
  preconsume_error?: string
  settle_error?: string
  cost_error?: string
}

export function ExprSandboxSection({ costExprDefault }: ExprSandboxSectionProps) {
  const { t } = useTranslation()
  const updateOption = useUpdateOption()
  const [model, setModel] = useState('')
  const [expr, setExpr] = useState('')
  const [costExpr, setCostExpr] = useState('')
  const [costMap, setCostMap] = useState(costExprDefault || '{}')
  const [requestJson, setRequestJson] = useState('{"seconds":4}')
  const [responseJson, setResponseJson] = useState(
    '{"usage":{"prompt_tokens":100,"completion_tokens":20}}'
  )
  const [result, setResult] = useState<SandboxResult | null>(null)
  const [busy, setBusy] = useState(false)

  return (
    <SettingsSection title={t('Expression sandbox')}>
      <p className='text-muted-foreground text-sm'>
        {t(
          'Paste a request, sync response, or poll JSON to preview pre-consume and settlement.'
        )}
      </p>
      <div className='grid gap-3 md:grid-cols-2'>
        <Input
          placeholder={t('Model name')}
          value={model}
          onChange={(e) => setModel(e.target.value)}
        />
        <Input
          placeholder={t('Sell expression (optional if model is configured)')}
          value={expr}
          onChange={(e) => setExpr(e.target.value)}
        />
      </div>
      <Input
        placeholder={t('Cost expression (never uses group discount)')}
        value={costExpr}
        onChange={(e) => setCostExpr(e.target.value)}
      />
      <Textarea
        rows={5}
        value={requestJson}
        onChange={(e) => setRequestJson(e.target.value)}
      />
      <Textarea
        rows={5}
        value={responseJson}
        onChange={(e) => setResponseJson(e.target.value)}
      />
      <Button
        disabled={busy}
        onClick={async () => {
          setBusy(true)
          try {
            const res = await api.post('/api/billing/sandbox', {
              model,
              expr,
              cost_expr: costExpr,
              request: JSON.parse(requestJson || '{}'),
              response: JSON.parse(responseJson || '{}'),
            })
            if (!res.data?.success) {
              toast.error(res.data?.message || t('Sandbox failed'))
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
        <div className='rounded-lg border p-4 text-sm'>
          <div>
            {t('Pre-consume')}: {formatQuota(result.preconsume_quota)}
          </div>
          <div>
            {t('Settlement')}: {formatQuota(result.settle_quota)}
          </div>
          <div>
            {t('Delta')}: {formatQuota(result.delta_quota)}
          </div>
          <div>
            {t('Cost')}:{' '}
            {result.cost_unknown || result.cost_quota == null
              ? '—'
              : formatQuota(result.cost_quota)}
          </div>
          {result.preconsume_error ? (
            <div className='text-destructive'>{result.preconsume_error}</div>
          ) : null}
          {result.settle_error ? (
            <div className='text-destructive'>{result.settle_error}</div>
          ) : null}
          {result.cost_error ? (
            <div className='text-destructive'>{result.cost_error}</div>
          ) : null}
        </div>
      ) : null}
      <Textarea
        rows={6}
        value={costMap}
        onChange={(e) => setCostMap(e.target.value)}
      />
      <Button
        variant='outline'
        disabled={updateOption.isPending}
        onClick={async () => {
          JSON.parse(costMap || '{}')
          await updateOption.mutateAsync({
            key: 'billing_setting.cost_expr',
            value: costMap,
          })
          toast.success(t('Saved'))
        }}
      >
        {t('Save cost expressions')}
      </Button>
    </SettingsSection>
  )
}
