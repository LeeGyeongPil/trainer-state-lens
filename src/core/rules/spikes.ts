import { ema, extract } from '../series.ts'
import { mad, mean, median, roundEvidence } from '../stats.ts'
import type { Finding, Run } from '../types.ts'
import type { Thresholds } from './options.ts'

export interface Spike {
  step: number
  value: number
  windowMedian: number
  score: number
}

/**
 * Upward spikes: a point must clear three bars at once.
 *  1. robust z-score against the previous `spikeWindow` points (median + MAD),
 *  2. a relative floor (at least `spikeRelFloor` above the window median),
 *  3. an absolute floor (`spikeAbsFloor` of the series' starting level).
 * Bars 2 and 3 stop a tiny MAD on a flat, converged series from flagging harmless jitter.
 */
export function detectSpikes(xs: readonly number[], ys: readonly number[], th: Thresholds): Spike[] {
  const win = th.spikeWindow
  if (ys.length <= win) return []
  const head = ys.slice(0, Math.max(10, Math.ceil(ys.length / 10)))
  const level = Math.abs(median(head))
  const absFloor = th.spikeAbsFloor * level
  const spikes: Spike[] = []
  for (let i = win; i < ys.length; i++) {
    const window = ys.slice(i - win, i)
    const med = median(window)
    const sigma = Math.max(1.4826 * mad(window, med), 1e-12)
    const excess = ys[i] - med
    const score = excess / sigma
    if (score > th.spikeK && excess > th.spikeRelFloor * Math.abs(med) && excess > absFloor) {
      spikes.push({ step: xs[i], value: ys[i], windowMedian: med, score })
    }
  }
  return spikes
}

function spikeFinding(rule: string, spikes: Spike[]): Finding {
  const top = spikes.reduce((a, b) => (b.score > a.score ? b : a))
  const listed = [...spikes]
    .sort((a, b) => b.score - a.score)
    .slice(0, 20)
    .map((s) => s.step)
    .sort((a, b) => a - b)
  return {
    rule,
    severity: 'warn',
    step: top.step,
    evidence: {
      count: spikes.length,
      steps: listed,
      topStep: top.step,
      topValue: roundEvidence(top.value),
      windowMedian: roundEvidence(top.windowMedian),
    },
  }
}

/** Loss and grad_norm spikes, plus divergence (loss that climbs away from its best level or ends non-finite). */
export function spikeRules(run: Run, th: Thresholds): Finding[] {
  const findings: Finding[] = []
  const loss = extract(run.train, 'loss')
  const lossSpikes = detectSpikes(loss.xs, loss.ys, th)
  if (lossSpikes.length > 0) findings.push(spikeFinding('spikes.loss', lossSpikes))
  const grad = extract(run.train, 'grad_norm')
  const gradSpikes = detectSpikes(grad.xs, grad.ys, th)
  if (gradSpikes.length > 0) findings.push(spikeFinding('spikes.grad_norm', gradSpikes))

  const divergence = detectDivergence(run, th)
  if (divergence) findings.push(divergence)
  return findings
}

function detectDivergence(run: Run, th: Thresholds): Finding | null {
  const rows = run.train.filter((r) => typeof r.loss === 'number')
  if (rows.length < 8) return null

  // A run that ends in NaN / Infinity after a stretch of finite losses has diverged
  // (loss 0.0 + NaN grad_norm is the separate broken-run rule, those rows have loss 0).
  let tail = 0
  for (let i = rows.length - 1; i >= 0 && !Number.isFinite(rows[i].loss as number); i--) tail++
  const finiteBefore = rows.length - tail
  if (tail >= 2 && finiteBefore >= 5) {
    const firstBad = rows[finiteBefore].step
    return {
      rule: 'spikes.divergence',
      severity: 'error',
      step: firstBad,
      evidence: { reason: 'nonfinite_tail', firstNonFiniteStep: firstBad, nonFiniteRows: tail },
    }
  }

  const loss = extract(run.train, 'loss')
  if (loss.xs.length < 8) return null
  const smooth = ema(loss.ys, 0.2)
  let refIdx = 0
  for (let i = 1; i < smooth.length; i++) if (smooth[i] < smooth[refIdx]) refIdx = i
  const q = Math.max(Math.floor(loss.ys.length / 4), 2)
  const endLoss = mean(loss.ys.slice(-q))
  const ref = smooth[refIdx]
  const level = Math.abs(median(loss.ys.slice(0, Math.max(5, Math.ceil(loss.ys.length / 10)))))
  const climbed = endLoss - ref
  // The best level must come well before the end, and the end must be far above it in relative and absolute terms.
  if (refIdx < loss.ys.length - q && ref > 0 && endLoss >= th.divergeRatio * ref && climbed >= th.divergeAbsFloor * level) {
    return {
      rule: 'spikes.divergence',
      severity: 'error',
      step: loss.xs[refIdx],
      evidence: {
        reason: 'loss_climb',
        bestStep: loss.xs[refIdx],
        bestLoss: roundEvidence(ref),
        endLoss: roundEvidence(endLoss),
        ratio: roundEvidence(endLoss / ref),
      },
    }
  }
  return null
}
