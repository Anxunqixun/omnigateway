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
import { Textarea } from '@/components/ui/textarea'

import { SettingsSection } from '../components/settings-section'
import { useUpdateOption } from '../hooks/use-update-option'

export function DocsHandbookSection({ defaultValue }: { defaultValue: string }) {
  const { t } = useTranslation()
  const updateOption = useUpdateOption()
  const [value, setValue] = useState(defaultValue || '[]')

  return (
    <SettingsSection title={t('Docs handbook')}>
      <p className='text-muted-foreground text-sm'>
        {t(
          'JSON array of handbook pages: id, title, category, markdown, published. Leave [] to use the built-in getting started / API / billing pages.'
        )}
      </p>
      <Textarea rows={16} value={value} onChange={(e) => setValue(e.target.value)} />
      <Button
        disabled={updateOption.isPending}
        onClick={async () => {
          JSON.parse(value || '[]')
          await updateOption.mutateAsync({
            key: 'docs_setting.handbook',
            value,
          })
          toast.success(t('Saved'))
        }}
      >
        {t('Save handbook')}
      </Button>
    </SettingsSection>
  )
}
