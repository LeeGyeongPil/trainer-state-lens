import { ema, extract } from '../series.ts'
import { roundEvidence } from '../stats.ts'
import type { Finding, Run } from '../types.ts'
import type { Thresholds } from './options.ts'

/** Index of the train point whose step is nearest to `step` (xs sorted ascending). */
function nearest(xs: readonly number[], step: number): number {
  let lo = 0
  let hi = xs.length - 1
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (xs[mid] < step) lo = mid + 1
    else hi = mid
  }
  if (lo > 0 && Math.abs(xs[lo - 1] - step) <= Math.abs(xs[lo] - step)) return lo - 1
  return lo
}

/** Eval loss minimum, rise after it, train-eval gap trend and whether the best step was saved. */
export function overfitRules(run: Run, th: Thresholds): Finding[] {
  const evalLoss = extract(run.evals, 'eval_loss')
  if (evalLoss.excludedNonFinite === 0 && evalLoss.xs.length < 3) return []
  if (evalLoss.xs.length < 3) {
    return [
      {
        rule: 'overfit.insufficient',
        severity: 'info',
        step: null,
        evidence: { evalPoints: evalLoss.xs.length, excludedNonFinite: evalLoss.excludedNonFinite },
      },
    ]
  }

  // Non-finite eval losses were dropped by extract(): a NaN minimum must never make the run look fine.
  let minIdx = 0
  for (let i = 1; i < evalLoss.ys.length; i++) if (evalLoss.ys[i] < evalLoss.ys[minIdx]) minIdx = i
  const last = evalLoss.ys.length - 1
  const evalMin = evalLoss.ys[minIdx]
  const evalLast = evalLoss.ys[last]
  const evalMinStep = evalLoss.xs[minIdx]
  const risePct = evalMin !== 0 ? ((evalLast - evalMin) / Math.abs(evalMin)) * 100 : 0

  const evidence: Finding['evidence'] = {
    evalMinStep,
    evalMin: roundEvidence(evalMin),
    evalLast: roundEvidence(evalLast),
    risePct: Math.round(risePct * 10) / 10,
    evalPoints: evalLoss.xs.length,
    excludedNonFinite: evalLoss.excludedNonFinite,
  }

  const train = extract(run.train, 'loss')
  if (train.xs.length > 0) {
    const smooth = ema(train.ys, 0.2)
    const gap = (i: number) => evalLoss.ys[i] - smooth[nearest(train.xs, evalLoss.xs[i])]
    evidence.gapFirst = roundEvidence(gap(0))
    evidence.gapLast = roundEvidence(gap(last))
  }

  const overfit = minIdx < last && risePct > th.overfitRisePct
  const findings: Finding[] = [
    { rule: 'overfit.eval_rise', severity: overfit ? 'warn' : 'ok', step: overfit ? evalMinStep : null, evidence },
  ]

  if (overfit) {
    const saveSteps = run.top.save_steps
    const bestStep = typeof run.top.best_global_step === 'number' ? run.top.best_global_step : evalMinStep
    const hasBest = typeof run.top.best_model_checkpoint === 'string' && run.top.best_model_checkpoint !== ''
    if (!hasBest && typeof saveSteps === 'number' && saveSteps > 0 && bestStep % saveSteps !== 0) {
      findings.push({
        rule: 'overfit.best_checkpoint_missing',
        severity: 'info',
        step: bestStep,
        evidence: { bestStep, saveSteps },
      })
    }
  }
  return findings
}
