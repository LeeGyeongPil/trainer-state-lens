import { useState } from 'react'
import { toJson, toMarkdown } from '../core/report.ts'
import type { Diagnosis } from '../core/types.ts'
import { t, type Lang } from '../i18n/index.ts'

interface Props {
  lang: Lang
  diagnoses: readonly Diagnosis[]
}

/** Markdown / JSON export of the diagnoses in the current UI language. */
export function ExportPanel({ lang, diagnoses }: Props) {
  const [format, setFormat] = useState<'md' | 'json'>('md')
  const [status, setStatus] = useState('')
  const text = format === 'md' ? toMarkdown(diagnoses, lang) : toJson(diagnoses, lang)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setStatus(t(lang, 'export.copied'))
    } catch {
      setStatus(t(lang, 'export.failed'))
    }
  }

  const download = () => {
    const blob = new Blob([text], { type: format === 'md' ? 'text/markdown' : 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = format === 'md' ? 'diagnosis.md' : 'diagnosis.json'
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <section className="panel">
      <h2>{t(lang, 'export.title')}</h2>
      <div className="row">
        <button type="button" className={format === 'md' ? 'active' : ''} onClick={() => setFormat('md')}>
          Markdown
        </button>
        <button type="button" className={format === 'json' ? 'active' : ''} onClick={() => setFormat('json')}>
          JSON
        </button>
        <button type="button" onClick={() => void copy()}>
          {t(lang, format === 'md' ? 'export.markdown' : 'export.json')}
        </button>
        <button type="button" onClick={download}>
          {t(lang, format === 'md' ? 'export.download.md' : 'export.download.json')}
        </button>
        <span className="muted" role="status">
          {status}
        </span>
      </div>
      <textarea readOnly value={text} rows={12} spellCheck={false} />
    </section>
  )
}
