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

const EXAMPLES = [
  {
    titleKey: 'Fixed amount per request',
    example: 'v2:0.04',
    noteKey: 'v2 means the number is US dollars, then converted by QuotaPerUnit.',
  },
  {
    titleKey: 'Read a request field',
    example: 'v2:num(param("n"), param("seconds"), 1)*0.02',
    noteKey: 'num() takes the first valid number. Missing fields fall back to the next argument.',
  },
  {
    titleKey: 'Charge extra after 5 list items',
    example: 'v2:0.04 + max(count("images")-5, 0)*0.01',
    noteKey:
      'count("images") is the length of that JSON list. count("n") also works when the client sends a number.',
  },
  {
    titleKey: 'Count nested image parts',
    example: 'v2:max(count("messages.#.content.#(type==\\"image_url\\")")-5, 0)*0.01',
    noteKey: 'The path uses gjson. This counts image_url parts inside messages.',
  },
] as const

export function FormulaGuide() {
  const { t } = useTranslation()
  return (
    <div className='bg-muted/30 space-y-3 rounded-lg border p-3'>
      <div>
        <h4 className='text-sm font-medium'>{t('How site formulas work')}</h4>
        <p className='text-muted-foreground text-xs'>
          {t(
            'Write one expression for this model. Group ratio and user model ratio still multiply after it. Cost formulas never use those ratios.'
          )}
        </p>
        <p className='pt-1'>
          <Link
            to='/docs/$slug'
            params={{ slug: 'billing-formula' }}
            className='text-xs font-medium underline-offset-4 hover:underline'
          >
            {t('Open the full formula guide')}
          </Link>
        </p>
      </div>
      <ul className='text-muted-foreground list-disc space-y-1 pl-4 text-xs'>
        <li>
          {t(
            'param("path") reads the request JSON. resp("path") reads the upstream or poll JSON. usage("prompt") is a usage alias.'
          )}
        </li>
        <li>
          {t(
            'count("path") counts a JSON list or a numeric field. Missing is 0. The count is capped at 256.'
          )}
        </li>
        <li>
          {t(
            'max/min/abs work as usual. Example: extra items after 5 use max(count("images")-5, 0).'
          )}
        </li>
      </ul>
      <div className='space-y-2'>
        {EXAMPLES.map((item) => (
          <div key={item.example} className='space-y-1'>
            <p className='text-xs font-medium'>{t(item.titleKey)}</p>
            <pre className='bg-background overflow-x-auto rounded border px-2 py-1 font-mono text-xs'>
              {item.example}
            </pre>
            <p className='text-muted-foreground text-xs'>{t(item.noteKey)}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
