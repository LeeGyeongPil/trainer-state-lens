import { ema } from './series.ts'
import type { ChartInput } from './series.ts'
import type { Row, Run } from './types.ts'

export type XKey = 'step' | 'epoch' | 'num_tokens' | 'progress'

/** Last logged step of a run (0 when nothing was logged). */
function lastStep(run: Run): number {
  return Math.max(0, ...[...run.train, ...run.evals].map((row) => row.step))
}

/** Planned length of a run: `max_steps` when the file has it, otherwise the last logged step. */
export function runLength(run: Run): number {
  const maxSteps = run.top.max_steps
  return typeof maxSteps === 'number' && maxSteps > 0 ? maxSteps : lastStep(run)
}

/** Step as percent of the run length, so runs of very different length can share one axis. */
export function progressOf(run: Run, step: number): number {
  const length = runLength(run)
  return length > 0 ? (step / length) * 100 : 0
}

/** Longest and shortest run may differ by this factor before the chart switches to the progress axis. */
export const PROGRESS_RATIO = 10

/** Default x axis: step, unless the runs differ in length by more than 10x (then % progress). */
export function defaultXKey(runs: readonly Run[]): XKey {
  const lengths = runs.map(runLength).filter((n) => n > 0)
  if (lengths.length < 2) return 'step'
  return Math.max(...lengths) / Math.min(...lengths) > PROGRESS_RATIO ? 'progress' : 'step'
}

function xOf(run: Run, row: Row, xKey: XKey): unknown {
  return xKey === 'progress' ? progressOf(run, row.step) : row[xKey]
}

/** Keys that are axes or bookkeeping rather than metrics worth plotting. */
const NOT_METRICS = new Set(['step', 'epoch', 'num_tokens', 'eval_num_tokens', 'total_flos'])

const PREFERRED = ['loss', 'eval_loss', 'grad_norm', 'learning_rate']

/** Numeric keys present in the train/eval rows of the given runs, common ones first. */
export function availableMetrics(runs: readonly Run[]): string[] {
  const keys = new Set<string>()
  for (const run of runs) {
    for (const row of [...run.train, ...run.evals]) {
      for (const [key, value] of Object.entries(row)) {
        if (typeof value === 'number' && !NOT_METRICS.has(key)) keys.add(key)
      }
    }
  }
  const preferred = PREFERRED.filter((k) => keys.has(k))
  const rest = [...keys].filter((k) => !PREFERRED.includes(k)).sort()
  return [...preferred, ...rest]
}

/** Whether any row of the runs carries the given x axis key. */
export function hasXKey(runs: readonly Run[], key: XKey): boolean {
  return runs.some((run) => [...run.train, ...run.evals].some((row) => typeof row[key] === 'number'))
}

/**
 * One line per (run, metric). `smoothing` 0 means raw values, otherwise an EMA with alpha = 1 - smoothing.
 * Eval metrics are never smoothed (they have few points). Non-finite values are left out.
 */
export function buildInputs(
  runs: readonly Run[],
  metrics: readonly string[],
  xKey: XKey,
  smoothing: number,
): ChartInput[] {
  const inputs: ChartInput[] = []
  for (const run of runs) {
    const rows: Row[] = [...run.train, ...run.evals]
    for (const metric of metrics) {
      const points: [number, number][] = []
      for (const row of rows) {
        const y = row[metric]
        const x = xOf(run, row, xKey)
        if (typeof y === 'number' && Number.isFinite(y) && typeof x === 'number' && Number.isFinite(x)) {
          points.push([x, y])
        }
      }
      if (points.length === 0) continue
      points.sort((a, b) => a[0] - b[0])
      const xs = points.map((p) => p[0])
      let ys = points.map((p) => p[1])
      if (smoothing > 0 && !metric.startsWith('eval_')) ys = ema(ys, Math.max(1 - smoothing, 0.02))
      inputs.push({ label: `${run.name} · ${metric}`, metric, xs, ys })
    }
  }
  return inputs
}
