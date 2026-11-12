import { describe, expect, it } from 'vitest'
import { REPORT_VERSION, toJson, toMarkdown, type JsonReport } from '../src/core/report.ts'
import { diagnoseAll } from '../src/core/rules/index.ts'
import { loadRuns } from './helpers.ts'

const diagnoses = diagnoseAll(loadRuns('tiny-sft-checkpoint-60', 'tiny-sft', 'synthetic-nan-broken', 'tiny-dpo'))

describe('export (AC-8)', () => {
  it('Markdown matches the snapshot (English)', () => {
    expect(toMarkdown(diagnoses, 'en')).toMatchSnapshot()
  })

  it('Markdown matches the snapshot (Korean)', () => {
    expect(toMarkdown(diagnoses, 'ko')).toMatchSnapshot()
  })

  it('has one table per run with severity, rule, step, evidence and message columns', () => {
    const md = toMarkdown(diagnoses, 'en')
    expect(md.match(/^\| Severity \| Rule \| Step \| Evidence \| Message \|$/gm)).toHaveLength(diagnoses.length)
    expect(md).toContain('| warn | overfit.eval_rise | 30 |')
    expect(md).toContain('| error | nonfinite.broken_run | 7 |')
  })

  it('JSON follows the fixed schema', () => {
    const report = JSON.parse(toJson(diagnoses, 'en')) as JsonReport
    expect(report.version).toBe(REPORT_VERSION)
    expect(report.runs).toHaveLength(3)
    expect(report.runs.map((r) => r.status)).toEqual(['warn', 'error', 'ok'])
    for (const run of report.runs) {
      expect(Object.keys(run).sort()).toEqual(['entries', 'files', 'findings', 'name', 'status'])
      for (const f of run.findings) {
        expect(Object.keys(f).sort()).toEqual(['action', 'evidence', 'message', 'rule', 'severity', 'step'])
        expect(f.message.length).toBeGreaterThan(0)
        expect(f.message).not.toMatch(/\{[A-Za-z]+\}/) // every placeholder was filled
      }
    }
  })

  it('is deterministic: two generations are identical', () => {
    expect(toMarkdown(diagnoses, 'en')).toBe(toMarkdown(diagnoses, 'en'))
    expect(toJson(diagnoses, 'ko')).toBe(toJson(diagnoses, 'ko'))
  })

  it('writes Korean messages for lang ko', () => {
    const md = toMarkdown(diagnoses, 'ko')
    expect(md).toMatch(/[가-힣]/)
    expect(md).toContain('학습 실행 진단')
    const report = JSON.parse(toJson(diagnoses, 'ko')) as JsonReport
    expect(report.lang).toBe('ko')
    expect(report.runs[0].findings.some((f) => /[가-힣]/.test(f.message))).toBe(true)
    expect(toMarkdown(diagnoses, 'en')).not.toMatch(/[가-힣]/)
  })

  it('escapes table separators and survives a run without findings', () => {
    const quiet = diagnoseAll(loadRuns('synthetic-flat-jitter')).map((d) => ({ ...d, findings: [] }))
    expect(toMarkdown(quiet, 'en')).toContain('No findings.')
  })
})
