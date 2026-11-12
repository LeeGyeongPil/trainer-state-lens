import { runStatus } from '../core/rules/index.ts'
import type { Diagnosis } from '../core/types.ts'
import { t, type Lang } from '../i18n/index.ts'
import { COLORS } from './colors.ts'

interface Props {
  lang: Lang
  diagnoses: readonly Diagnosis[]
  hidden: ReadonlySet<string>
  onToggle: (name: string) => void
}

/** Run list: colour, name, status, file count, and a switch to show/hide the run in the chart. */
export function RunList({ lang, diagnoses, hidden, onToggle }: Props) {
  if (diagnoses.length === 0) return <p className="muted">{t(lang, 'runs.empty')}</p>
  return (
    <ul className="runs">
      {diagnoses.map(({ run, findings }, index) => {
        const status = runStatus(findings)
        return (
          <li key={run.name}>
            <label title={t(lang, 'runs.show')}>
              <input type="checkbox" checked={!hidden.has(run.name)} onChange={() => onToggle(run.name)} />
              <span className="swatch" style={{ background: COLORS[index % COLORS.length] }} />
              <strong>{run.name}</strong>
            </label>{' '}
            <span className={`badge badge-${status}`}>{t(lang, `runs.status.${status}`)}</span>{' '}
            <span className="muted small">
              {t(lang, 'runs.files', { count: run.files.length })} · {run.train.length}/{run.evals.length}/{run.summary.length}
            </span>
          </li>
        )
      })}
    </ul>
  )
}
