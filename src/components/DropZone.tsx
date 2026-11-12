import { useRef, useState } from 'react'
import { SAMPLES } from '../samples/index.ts'
import { t, type Lang, type MessageKey } from '../i18n/index.ts'

interface Props {
  lang: Lang
  busy: boolean
  onFiles: (files: File[]) => void
  onSamples: (ids: string[]) => void
  onClear: () => void
}

/** Drag-and-drop area, file picker, and the practice sample list. Files never leave the browser. */
export function DropZone({ lang, busy, onFiles, onSamples, onClear }: Props) {
  const input = useRef<HTMLInputElement>(null)
  const [over, setOver] = useState(false)

  return (
    <section className="panel">
      <div
        className={over ? 'drop drop-over' : 'drop'}
        onDragOver={(event) => {
          event.preventDefault()
          setOver(true)
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(event) => {
          event.preventDefault()
          setOver(false)
          onFiles([...event.dataTransfer.files])
        }}
      >
        <strong>{t(lang, 'drop.title')}</strong>
        <p className="muted">{t(lang, 'drop.hint')}</p>
        <div className="row">
          <button type="button" onClick={() => input.current?.click()}>
            {t(lang, 'drop.browse')}
          </button>
          <span className="muted">{t(lang, 'drop.or')}</span>
          <button type="button" disabled={busy} onClick={() => onSamples(SAMPLES.filter((s) => s.starter).map((s) => s.id))}>
            {busy ? t(lang, 'samples.loading') : t(lang, 'drop.samples')}
          </button>
          <button type="button" className="ghost" onClick={onClear}>
            {t(lang, 'drop.clear')}
          </button>
        </div>
        <input
          ref={input}
          type="file"
          accept=".json,application/json"
          multiple
          hidden
          onChange={(event) => {
            onFiles([...(event.target.files ?? [])])
            event.target.value = ''
          }}
        />
        <p className="muted small">{t(lang, 'drop.privacy')}</p>
      </div>

      <details className="samples">
        <summary>{t(lang, 'samples.title')}</summary>
        <p className="muted small">{t(lang, 'samples.note')}</p>
        <ul>
          {SAMPLES.map((sample) => (
            <li key={sample.id}>
              <button type="button" className="ghost" disabled={busy} onClick={() => onSamples([sample.id])}>
                {t(lang, 'samples.add')}
              </button>{' '}
              <code>{sample.id}</code> <span className={`tag tag-${sample.source}`}>{t(lang, `samples.source.${sample.source}` as MessageKey)}</span>{' '}
              <span>{t(lang, `samples.sample.${sample.id}` as MessageKey)}</span>{' '}
              <span className="muted small">
                {t(lang, 'samples.license')}: {sample.license}
                {sample.url ? (
                  <>
                    {' '}
                    <a href={sample.url} target="_blank" rel="noreferrer">
                      Hub
                    </a>
                  </>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
      </details>
    </section>
  )
}
