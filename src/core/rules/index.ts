import type { Diagnosis, Finding, Run, Severity } from '../types.ts'
import { dpoRules } from './dpo.ts'
import { grpoRules } from './grpo.ts'
import { nonFiniteRules } from './nonfinite.ts'
import { DEFAULT_THRESHOLDS, type DiagnoseOptions } from './options.ts'
import { overfitRules } from './overfit.ts'
import { runStatusRules } from './runStatus.ts'
import { scheduleRules } from './schedule.ts'
import { spikeRules } from './spikes.ts'

export { DEFAULT_THRESHOLDS, type DiagnoseOptions, type Thresholds } from './options.ts'

const ORDER: Record<Severity, number> = { error: 0, warn: 1, info: 2, ok: 3 }

/** Run every rule on one run. Rules switch themselves off when their keys are missing. Output order is stable. */
export function diagnose(run: Run, options: DiagnoseOptions = {}): Finding[] {
  const th = { ...DEFAULT_THRESHOLDS, ...options.thresholds }
  const findings = [
    ...nonFiniteRules(run, th),
    ...overfitRules(run, th),
    ...spikeRules(run, th),
    ...scheduleRules(run, th),
    ...runStatusRules(run),
    ...dpoRules(run, th),
    ...grpoRules(run, th),
  ]
  return findings
    .map((f, i) => ({ f, i }))
    .sort((a, b) => ORDER[a.f.severity] - ORDER[b.f.severity] || a.i - b.i)
    .map((x) => x.f)
}

export function diagnoseAll(runs: readonly Run[], options: DiagnoseOptions = {}): Diagnosis[] {
  return runs.map((run) => ({ run, findings: diagnose(run, options) }))
}

/** Worst severity of a run: error, warn or ok (info and ok findings both count as ok). */
export function runStatus(findings: readonly Finding[]): 'error' | 'warn' | 'ok' {
  if (findings.some((f) => f.severity === 'error')) return 'error'
  if (findings.some((f) => f.severity === 'warn')) return 'warn'
  return 'ok'
}
