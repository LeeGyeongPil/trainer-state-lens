import { extract } from '../series.ts'
import { mean, round, roundEvidence } from '../stats.ts'
import type { Finding, Run } from '../types.ts'
import type { Thresholds } from './options.ts'

export type ScheduleShape = 'constant' | 'linear' | 'cosine' | 'linear_min_lr' | 'cosine_min_lr' | 'unknown'

interface Candidate {
  shape: ScheduleShape
  /** Fraction of the peak the schedule decays to (0 = to zero). */
  floor: number
  /** Normalised progress 0..1 after the peak -> value 1..floor-ish. */
  model: (progress: number) => number
}

const FLOOR_MARGIN = 0.03

function candidates(floor: number): Candidate[] {
  const list: Candidate[] = [
    { shape: 'constant', floor: 1, model: () => 1 },
    { shape: 'linear', floor: 0, model: (p) => 1 - p },
    { shape: 'cosine', floor: 0, model: (p) => 0.5 * (1 + Math.cos(Math.PI * p)) },
  ]
  if (floor >= 0.02 && floor < 0.98) {
    list.push(
      { shape: 'linear_min_lr', floor, model: (p) => floor + (1 - floor) * (1 - p) },
      { shape: 'cosine_min_lr', floor, model: (p) => floor + (1 - floor) * 0.5 * (1 + Math.cos(Math.PI * p)) },
    )
  }
  return list
}

/**
 * Learning-rate schedule: warmup peak, decay shape (also with a minimum-LR floor) and the share of warmup.
 * Only observed values are used; the config (warmup_steps, scheduler type) is not stored in trainer_state.json.
 */
export function scheduleRules(run: Run, th: Thresholds): Finding[] {
  const lr = extract(run.train, 'learning_rate')
  if (lr.xs.length < 4) return []

  let peakIdx = 0
  for (let i = 1; i < lr.ys.length; i++) if (lr.ys[i] > lr.ys[peakIdx]) peakIdx = i
  const peak = lr.ys[peakIdx]
  if (!(peak > 0)) return []
  const peakStep = lr.xs[peakIdx]
  const lastStep = lr.xs[lr.xs.length - 1]
  const lastLr = lr.ys[lr.ys.length - 1]

  // Fit against max_steps so an unfinished run is judged by the schedule it was meant to follow.
  const maxSteps = typeof run.top.max_steps === 'number' ? run.top.max_steps : undefined
  const endStep = maxSteps !== undefined && maxSteps >= lastStep ? maxSteps : lastStep
  const complete = lastStep >= 0.98 * endStep
  const floorRatio = complete ? lastLr / peak : null
  const span = Math.max(endStep - peakStep, 1)

  const tailX = lr.xs.slice(peakIdx)
  const tailY = lr.ys.slice(peakIdx)
  let best: { shape: ScheduleShape; err: number } = { shape: 'unknown', err: Infinity }
  for (const c of candidates(floorRatio ?? 0)) {
    const err = mean(tailY.map((y, i) => Math.abs(y - peak * c.model((tailX[i] - peakStep) / span)) / peak))
    // A floor variant must be clearly better than the plain shapes: the logged LR lags the optimizer
    // step by one, so a plain linear/cosine schedule often ends a hair above zero.
    const margin = c.floor > 0 && c.floor < 1 ? FLOOR_MARGIN : 1e-9
    if (err < best.err - margin) best = { shape: c.shape, err }
  }
  const shape: ScheduleShape = best.err > th.scheduleMaxFitError ? 'unknown' : best.shape

  const loggingSteps = run.top.logging_steps
  let resolution: number | null = typeof loggingSteps === 'number' ? loggingSteps : null
  if (resolution === null && lr.xs.length > 1) resolution = lr.xs[1] - lr.xs[0]

  return [
    {
      rule: 'schedule.shape',
      severity: 'info',
      step: peakStep,
      evidence: {
        shape,
        peakLr: roundEvidence(peak),
        peakStep,
        warmupPct: round((peakStep / endStep) * 100, 1),
        resolution,
        floorRatio: floorRatio === null ? null : roundEvidence(floorRatio),
        lastLr: roundEvidence(lastLr),
        fitError: round(best.err, 4),
      },
    },
  ]
}
