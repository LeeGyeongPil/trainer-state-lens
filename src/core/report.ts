import { evidenceText, findingAction, findingMessage, t } from '../i18n/index.ts'
import { runStatus } from './rules/index.ts'
import type { Diagnosis, Lang } from './types.ts'

/** Version of the JSON export schema; bump when the shape changes. */
export const REPORT_VERSION = 1

export interface JsonReport {
  version: number
  lang: Lang
  runs: {
    name: string
    status: 'error' | 'warn' | 'ok'
    files: string[]
    entries: { train: number; eval: number; summary: number }
    findings: {
      rule: string
      severity: string
      step: number | null
      evidence: Record<string, unknown>
      message: string
      action: string
    }[]
  }[]
}

/** JSON export with a fixed schema. Same input gives the same output (no timestamps). */
export function toJson(diagnoses: readonly Diagnosis[], lang: Lang = 'en'): string {
  const report: JsonReport = {
    version: REPORT_VERSION,
    lang,
    runs: diagnoses.map(({ run, findings }) => ({
      name: run.name,
      status: runStatus(findings),
      files: run.files,
      entries: { train: run.train.length, eval: run.evals.length, summary: run.summary.length },
      findings: findings.map((f) => ({
        rule: f.rule,
        severity: f.severity,
        step: f.step,
        evidence: f.evidence,
        message: findingMessage(lang, f),
        action: findingAction(lang, f),
      })),
    })),
  }
  return JSON.stringify(report, null, 2)
}

/** Table cells must not contain pipes or line breaks. */
function cell(text: string): string {
  return text.replace(/\|/g, '\\|').replace(/\r?\n/g, ' ')
}

/** Severity or status label for Markdown: Korean adds the machine value in parentheses, English stays plain. */
function severityLabel(lang: Lang, value: 'error' | 'warn' | 'info' | 'ok'): string {
  return lang === 'ko' ? `${t(lang, `severity.${value}`)} (${value})` : value
}

/** Markdown export: one table per run (severity, rule, step, evidence, message). Deterministic. */
export function toMarkdown(diagnoses: readonly Diagnosis[], lang: Lang = 'en'): string {
  const lines: string[] = [`# ${t(lang, 'report.title')}`, '']
  for (const { run, findings } of diagnoses) {
    lines.push(`## ${run.name}`, '')
    lines.push(`- ${t(lang, 'report.files')}: ${run.files.join(', ')}`)
    lines.push(`- ${t(lang, 'report.status')}: ${severityLabel(lang, runStatus(findings))}`)
    lines.push(`- ${t(lang, 'report.entries')}: ${run.train.length}/${run.evals.length}/${run.summary.length}`, '')
    if (findings.length === 0) {
      lines.push(t(lang, 'report.noFindings'), '')
      continue
    }
    lines.push(
      `| ${t(lang, 'report.col.severity')} | ${t(lang, 'report.col.rule')} | ${t(lang, 'report.col.step')} | ${t(lang, 'report.col.evidence')} | ${t(lang, 'report.col.message')} |`,
      '|---|---|---|---|---|',
    )
    for (const f of findings) {
      const message = `${findingMessage(lang, f)} ${findingAction(lang, f)}`.trim()
      lines.push(
        `| ${severityLabel(lang, f.severity)} | ${f.rule} | ${f.step ?? ''} | ${cell(evidenceText(f.evidence))} | ${cell(message)} |`,
      )
    }
    lines.push('')
  }
  lines.push(`_${t(lang, 'report.generatedBy')}_`, '')
  return lines.join('\n')
}
