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
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { CopyButton } from '@/components/copy-button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Markdown } from '@/components/ui/markdown'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

import { docsBuildCurlExample, docsExtractJsonBody } from '../lib/docs-examples'
import {
  docsEndpointDisplayTitle,
  docsEndpointIsAsync,
  docsEndpointIsPollQuery,
  docsGatewayOrigin,
  docsRelatedDisplayTitle,
  docsRequestUrl,
  renderDocsText,
} from '../lib/group-docs'
import type { DocsEndpoint, DocsParam, DocsTag } from '../types'

type DocsArticleProps = {
  endpoint: DocsEndpoint
  baseUrl: string
}

export function DocsArticle(props: DocsArticleProps) {
  const { t } = useTranslation()
  const origin = docsGatewayOrigin(props.baseUrl)
  const requestUrl = docsRequestUrl(origin, props.endpoint.path)
  const authValue = 'Authorization: Bearer $API_KEY'
  const showAsync = docsEndpointIsAsync(props.endpoint)
  const related = props.endpoint.related ?? []
  const title = docsEndpointDisplayTitle(props.endpoint, t)
  const rawDescription = props.endpoint.description || ''
  const description = renderDocsText(
    looksLikeI18nKey(rawDescription) ? t(rawDescription) : rawDescription,
    props.endpoint.model,
    origin
  )
  const examples = useMemo(
    () =>
      buildExampleTabs(
        props.endpoint.method,
        requestUrl,
        props.endpoint.request_example || ''
      ),
    [props.endpoint.method, props.endpoint.request_example, requestUrl]
  )
  const [exampleTab, setExampleTab] = useState(examples.json ? 'json' : 'curl')

  useEffect(() => {
    setExampleTab(examples.json ? 'json' : 'curl')
  }, [props.endpoint.id, examples.json])

  if (props.endpoint.kind === 'article') {
    return (
      <article className='space-y-6'>
        <header className='space-y-3'>
          <Badge variant='secondary'>{t('Guide article')}</Badge>
          <h1 className='text-2xl font-semibold tracking-tight'>{title}</h1>
        </header>
        {description ? (
          <Markdown className='prose prose-sm dark:prose-invert max-w-none'>
            {description}
          </Markdown>
        ) : null}
      </article>
    )
  }

  return (
    <article className='space-y-8'>
      <header className='space-y-3'>
        <div className='flex flex-wrap items-center gap-2'>
          <MethodBadge method={props.endpoint.method} />
          <code className='text-muted-foreground text-sm'>
            {props.endpoint.path}
          </code>
          <Badge variant='secondary'>{t('API')}</Badge>
        </div>
        <h1 className='text-2xl font-semibold tracking-tight'>{title}</h1>
        {props.endpoint.model ? (
          <p className='text-muted-foreground text-sm'>
            {t('API model ID')}:{' '}
            <code className='text-foreground font-mono'>
              {props.endpoint.model}
            </code>
          </p>
        ) : null}
        {description ? (
          <p className='text-sm leading-relaxed'>{description}</p>
        ) : null}
      </header>

      <div className='grid gap-3 sm:grid-cols-2'>
        <CopyValueCard label={t('Request URL')} value={requestUrl} />
        <CopyValueCard label={t('Authentication')} value={authValue} />
      </div>

      {showAsync ? (
        <Alert className='border-sky-200 bg-sky-50 text-sky-950 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-50'>
          <AlertDescription>
            {docsEndpointIsPollQuery(props.endpoint)
              ? t(
                  'This is a query endpoint. Use the task id returned by the submit API.'
                )
              : t(
                  'After submit, poll the task query API. When it succeeds, fetch the video from the content API.'
                )}
            {related.length > 0 ? (
              <ul className='mt-3 space-y-1'>
                {related.map((item) => (
                  <li key={item.id}>
                    <Link
                      to='/docs/$slug'
                      params={{ slug: item.id }}
                      className='font-medium underline-offset-4 hover:underline'
                    >
                      {item.method} {docsRelatedDisplayTitle(item, t)}
                    </Link>
                    <span className='text-muted-foreground ml-2 font-mono text-xs'>
                      {item.path}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
            <p className='mt-3 text-sm'>
              {t(
                'Submit pre-consumes quota with the model sell mode. A successful poll settles the same rule from the poll JSON. Failed tasks refund the pre-consume. An optional cost formula can be added to any sell mode and never uses group ratio.'
              )}
            </p>
          </AlertDescription>
        </Alert>
      ) : null}

      <CapabilityList tags={props.endpoint.capabilities ?? []} />

      <ParamTable
        title={t('Required parameters')}
        rows={props.endpoint.required_params ?? []}
        required
      />
      <ParamTable
        title={t('Optional parameters')}
        rows={props.endpoint.optional_params ?? []}
      />

      {examples.json || examples.curl ? (
        <section className='space-y-2'>
          <h2 className='text-sm font-semibold'>{t('Request example')}</h2>
          <Tabs value={exampleTab} onValueChange={setExampleTab}>
            <TabsList>
              {examples.json ? (
                <TabsTrigger value='json'>JSON</TabsTrigger>
              ) : null}
              {examples.curl ? (
                <TabsTrigger value='curl'>cURL</TabsTrigger>
              ) : null}
            </TabsList>
            {examples.json ? (
              <TabsContent value='json'>
                <CodeBlock value={examples.json} />
              </TabsContent>
            ) : null}
            {examples.curl ? (
              <TabsContent value='curl'>
                <CodeBlock value={examples.curl} />
              </TabsContent>
            ) : null}
          </Tabs>
        </section>
      ) : null}
      {props.endpoint.response_example ? (
        <section className='space-y-2'>
          <h2 className='text-sm font-semibold'>{t('Response example')}</h2>
          <CodeBlock value={props.endpoint.response_example} />
        </section>
      ) : null}
    </article>
  )
}

function buildExampleTabs(
  method: string,
  requestUrl: string,
  rawExample: string
): { json: string; curl: string } {
  const json = docsExtractJsonBody(rawExample)
  if (json) {
    return {
      json,
      curl: docsBuildCurlExample(method, requestUrl, json),
    }
  }
  if (rawExample.trim().startsWith('curl')) {
    return { json: '', curl: rawExample.trim() }
  }
  return { json: '', curl: rawExample.trim() }
}

function looksLikeI18nKey(value: string): boolean {
  return /^[A-Za-z]/.test(value) && !value.includes('\n')
}

function paramDescription(row: DocsParam, t: (key: string) => string): string {
  if (!row.description) return '—'
  if (looksLikeI18nKey(row.description)) return t(row.description)
  return row.description
}

function MethodBadge(props: { method: string }) {
  const isGet = props.method === 'GET'
  return (
    <Badge
      variant='outline'
      className={
        isGet
          ? 'border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-400'
          : 'border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400'
      }
    >
      {props.method}
    </Badge>
  )
}

function CapabilityList(props: { tags: DocsTag[] }) {
  const { t } = useTranslation()
  if (props.tags.length === 0) return null
  return (
    <section className='space-y-2'>
      <h2 className='text-sm font-semibold'>{t('Model capabilities')}</h2>
      <div className='flex flex-wrap gap-2'>
        {props.tags.map((tag) => (
          <Badge
            key={`${tag.label}-${tag.value ?? ''}`}
            variant='secondary'
          >
            {capabilityLabel(tag)}
          </Badge>
        ))}
      </div>
    </section>
  )
}

function capabilityLabel(tag: DocsTag): string {
  const value = (tag.value || '').trim()
  if (!value) return tag.label
  return `${tag.label}: ${value}`
}

function CopyValueCard(props: { label: string; value: string }) {
  return (
    <Card size='sm'>
      <CardHeader>
        <CardTitle>{props.label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className='bg-muted flex items-center justify-between gap-2 rounded-lg px-3 py-2'>
          <code className='min-w-0 truncate text-xs'>{props.value}</code>
          <CopyButton value={props.value} className='size-6' />
        </div>
      </CardContent>
    </Card>
  )
}

function CodeBlock(props: { value: string }) {
  return (
    <div className='bg-muted/60 relative overflow-hidden rounded-lg border'>
      <CopyButton
        value={props.value}
        className='absolute top-2 right-2 size-6'
      />
      <pre className='max-h-[28rem] overflow-auto p-4 pr-10 text-xs leading-6'>
        {props.value}
      </pre>
    </div>
  )
}

function DefaultRangeCell(props: { row: DocsParam }) {
  const parts = [props.row.default, props.row.range]
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value))
  if (parts.length === 0) {
    return (
      <code className='bg-muted rounded px-1.5 py-0.5 text-[11px]'>—</code>
    )
  }
  return (
    <div className='flex flex-wrap gap-1'>
      {parts.map((part) => (
        <code
          key={part}
          className='bg-muted rounded px-1.5 py-0.5 text-[11px]'
        >
          {part}
        </code>
      ))}
    </div>
  )
}

function ParamTable(props: {
  title: string
  rows: DocsParam[]
  required?: boolean
}) {
  const { t } = useTranslation()
  if (props.rows.length === 0) return null
  return (
    <section className='space-y-2'>
      <h2 className='text-sm font-semibold'>{props.title}</h2>
      <div className='overflow-hidden rounded-lg border'>
        <Table>
          <TableHeader>
            <TableRow className='bg-muted/40'>
              <TableHead>{t('Parameter')}</TableHead>
              <TableHead>{t('Type')}</TableHead>
              <TableHead>{t('Default / range')}</TableHead>
              <TableHead>{t('Description')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {props.rows.map((row) => (
              <TableRow key={row.name}>
                <TableCell className='align-top whitespace-nowrap'>
                  <div className='flex items-center gap-1.5'>
                    <code className='text-xs font-semibold'>{row.name}</code>
                    {props.required ? (
                      <Badge
                        variant='destructive'
                        className='h-4 rounded px-1 text-[9px]'
                      >
                        {t('Required')}
                      </Badge>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell className='text-muted-foreground align-top text-xs'>
                  {row.type || '—'}
                </TableCell>
                <TableCell className='max-w-48 align-top whitespace-normal'>
                  <DefaultRangeCell row={row} />
                </TableCell>
                <TableCell className='text-muted-foreground min-w-52 align-top whitespace-normal'>
                  {paramDescription(row, t)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  )
}
