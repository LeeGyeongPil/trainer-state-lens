import { evidenceText, findingAction, findingMessage, t, type Lang } from '../i18n/index.ts'
import type { Diagnosis } from '../core/types.ts'

interface Props {
  lang: Lang
  diagnoses: readonly Diagnosis[]
  onFocus: (step: number) => void
}

/** Diagnosis tables: one per run with severity, rule, step, evidence, message and what to check. */
export function Findings({ lang, diagnoses, onFocus }: Props) {
  return (
    <section className="panel">
      <h2>{t(lang, 'findings.title')}</h2>
      {diagnoses.map(({ run, findings }) => (
        <div key={run.name} className="findings">
          <h3>{run.name}</h3>
          {findings.length === 0 ? (
            <p className="muted">{t(lang, 'findings.empty')}</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>{t(lang, 'findings.col.severity')}</th>
                  <th>{t(lang, 'findings.col.rule')}</th>
                  <th>{t(lang, 'findings.col.step')}</th>
                  <th>{t(lang, 'findings.col.message')}</th>
                  <th>{t(lang, 'findings.col.evidence')}</th>
                </tr>
              </thead>
              <tbody>
                {findings.map((finding, index) => (
                  <tr key={`${finding.rule}-${index}`} className={`sev-${finding.severity}`}>
                    <td>
                      <span className={`badge badge-${finding.severity}`}>{t(lang, `severity.${finding.severity}`)}</span>
                    </td>
                    <td>
                      <code>{finding.rule}</code>
                    </td>
                    <td>
                      {finding.step === null ? (
                        ''
                      ) : (
                        <button type="button" className="link" title={t(lang, 'findings.focus')} onClick={() => onFocus(finding.step as number)}>
                          {finding.step}
                        </button>
                      )}
                    </td>
                    <td>
                      <div>{findingMessage(lang, finding)}</div>
                      {findingAction(lang, finding) ? (
                        <div className="muted small">
                          <em>{t(lang, 'findings.col.action')}:</em> {findingAction(lang, finding)}
                        </div>
                      ) : null}
                    </td>
                    <td className="evidence">
                      <code>{evidenceText(finding.evidence)}</code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ))}
    </section>
  )
}
