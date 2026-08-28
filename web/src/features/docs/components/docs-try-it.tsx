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
import { Play } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

import { docsExtractJsonBody } from '../lib/docs-examples'
import { docsGatewayOrigin, docsRequestUrl } from '../lib/group-docs'
import type { DocsEndpoint } from '../types'

function initialTryItBody(raw: string): string {
  const json = docsExtractJsonBody(raw)
  if (json) return json
  if (raw.trim().startsWith('curl')) return '{}'
  return raw
}

type DocsTryItProps = {
  endpoint: DocsEndpoint
  baseUrl: string
}

export function DocsTryIt(props: DocsTryItProps) {
  const { t } = useTranslation()
  const [apiKey, setApiKey] = useState('')
  const [pathOverride, setPathOverride] = useState(props.endpoint.path)
  const requestExample = props.endpoint.request_example || ''
  const [body, setBody] = useState(initialTryItBody(requestExample))
  const [result, setResult] = useState('')
  const [busy, setBusy] = useState(false)
  const requestUrl = docsRequestUrl(
    docsGatewayOrigin(props.baseUrl),
    pathOverride
  )
  const canSend = props.endpoint.try_it && apiKey.trim() !== ''
  const hasPathParam = props.endpoint.path.includes('{')
  const isGet = props.endpoint.method === 'GET'

  useEffect(() => {
    setPathOverride(props.endpoint.path)
    setBody(initialTryItBody(requestExample))
    setResult('')
  }, [props.endpoint.id, props.endpoint.path, requestExample])

  return (
    <aside className='space-y-4'>
      <div>
        <div className='flex items-center gap-2'>
          <Play className='size-4' aria-hidden='true' />
          <h2 className='text-sm font-semibold'>{t('Online run')}</h2>
        </div>
        <p className='text-muted-foreground mt-1 text-xs leading-5'>
          {t(
            'The request is sent from this browser to this gateway. The API key stays in page memory only.'
          )}
        </p>
      </div>
      <div className='space-y-1.5'>
        <p className='text-muted-foreground text-xs'>{t('Request URL')}</p>
        <div className='flex items-start gap-2'>
          <Badge
            variant='outline'
            className={
              isGet
                ? 'border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-400'
                : 'border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400'
            }
          >
            {props.endpoint.method}
          </Badge>
          <p className='min-w-0 font-mono text-xs break-all'>{requestUrl}</p>
        </div>
      </div>
      {hasPathParam ? (
        <div className='space-y-1.5'>
          <label
            className='text-muted-foreground text-xs'
            htmlFor='docs-request-path'
          >
            {t('Request path')}
          </label>
          <Input
            id='docs-request-path'
            className='font-mono text-xs'
            value={pathOverride}
            onChange={(event) => setPathOverride(event.target.value)}
          />
        </div>
      ) : null}
      <div className='space-y-1.5'>
        <label className='text-muted-foreground text-xs' htmlFor='docs-api-key'>
          {t('API Key')}
        </label>
        <Input
          id='docs-api-key'
          type='password'
          autoComplete='off'
          placeholder={t('Paste your API key')}
          value={apiKey}
          onChange={(event) => setApiKey(event.target.value)}
        />
      </div>
      {props.endpoint.method !== 'GET' ? (
        <div className='space-y-1.5'>
          <label className='text-muted-foreground text-xs' htmlFor='docs-body'>
            {t('Request body')}
          </label>
          <Textarea
            id='docs-body'
            className='min-h-64 resize-y font-mono text-xs leading-5'
            value={body}
            onChange={(event) => setBody(event.target.value)}
          />
        </div>
      ) : null}
      {!props.endpoint.try_it ? (
        <p className='text-muted-foreground text-sm'>
          {t('Try it is not enabled for this endpoint.')}
        </p>
      ) : (
        <p className='text-muted-foreground text-xs'>
          {props.endpoint.method === 'GET'
            ? t(
                'This query reads an existing task and does not start a new generation.'
              )
            : t('Sending a generation request may consume account quota.')}
        </p>
      )}
      <Button
        type='button'
        className='h-8 w-full'
        disabled={!canSend || busy}
        onClick={async () => {
          setBusy(true)
          setResult('')
          try {
            const headers: Record<string, string> = {
              Authorization: `Bearer ${apiKey.trim()}`,
            }
            const init: RequestInit = {
              method: props.endpoint.method,
              headers,
              credentials: 'omit',
            }
            if (props.endpoint.method !== 'GET') {
              headers['Content-Type'] = 'application/json'
              init.body = body
            }
            const response = await fetch(requestUrl, init)
            const text = await response.text()
            setResult(`${response.status} ${response.statusText}\n${text}`)
          } catch (error) {
            setResult((error as Error).message)
          } finally {
            setBusy(false)
          }
        }}
      >
        <Play />
        {t('Send request')}
      </Button>
      <div className='space-y-1.5'>
        <p className='text-muted-foreground text-xs'>{t('Result')}</p>
        <pre className='bg-muted/50 min-h-36 overflow-auto rounded-xl border p-3 text-[11px] leading-5 whitespace-pre-wrap'>
          {result || t('Ready to send')}
        </pre>
      </div>
    </aside>
  )
}
