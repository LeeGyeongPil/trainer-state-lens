import type { Finding, Run } from '../types.ts'
import type { Thresholds } from './options.ts'

/** NaN / Infinity positions and the "loss 0.0 + grad_norm NaN" broken-run pattern. */
export function nonFiniteRules(run: Run, th: Thresholds): Finding[] {
  const findings: Finding[] = []

  // Longest consecutive stretch of rows with loss 0.0 and a non-finite grad_norm:
  // mixed-precision overflow or a broken loss kernel logs exactly this.
  let best = { length: 0, firstStep: 0, lastStep: 0 }
  let current = { length: 0, firstStep: 0, lastStep: 0 }
  for (const row of run.train) {
    const loss = row.loss
    const gradNorm = row.grad_norm
    const lossBad = loss === 0
    const gradBad = typeof gradNorm === 'number' && !Number.isFinite(gradNorm)
    if (lossBad && gradBad) {
      current = current.length
        ? { ...current, length: current.length + 1, lastStep: row.step }
        : { length: 1, firstStep: row.step, lastStep: row.step }
      if (current.length > best.length) best = current
    } else {
      current = { length: 0, firstStep: 0, lastStep: 0 }
    }
  }
  const broken = best.length >= th.brokenRunMinEntries
  if (broken) {
    findings.push({
      rule: 'nonfinite.broken_run',
      severity: 'error',
      step: best.firstStep,
      evidence: { entries: best.length, firstStep: best.firstStep, lastStep: best.lastStep },
    })
  }

  // Every logged train loss is NaN/Infinity: broken from the very first entry, not a late divergence.
  const lossRows = run.train.filter((row) => typeof row.loss === 'number')
  const allNonFinite = lossRows.length > 0 && lossRows.every((row) => !Number.isFinite(row.loss as number))
  if (allNonFinite) {
    findings.push({
      rule: 'nonfinite.all_loss',
      severity: 'error',
      step: lossRows[0].step,
      evidence: { entries: lossRows.length, firstStep: lossRows[0].step },
    })
  }
  const settled = broken || allNonFinite

  const inLog = run.nonFinite.filter((p) => p.step !== null)
  const topLevel = run.nonFinite.filter((p) => p.step === null)
  if (run.nonFinite.length > 0) {
    const keys = [...new Set(run.nonFinite.map((p) => p.key))].slice(0, 6).join(', ')
    const firstStep = inLog.length ? (inLog[0].step as number) : null
    findings.push({
      rule: 'nonfinite.values',
      // A broken run already carries the error; top-level only values (best_metric) are harmless.
      severity: inLog.length > 0 && !settled ? 'warn' : 'info',
      step: firstStep,
      evidence: { count: run.nonFinite.length, topLevelCount: topLevel.length, firstStep, keys },
    })
  }
  return findings
}
