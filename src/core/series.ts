import type { Row } from './types.ts'

export interface Series {
  xs: number[]
  ys: number[]
  /** Points dropped because the value was NaN or +-Infinity. */
  excludedNonFinite: number
}

/** Extract `key` over `step` from rows. Rows without the key are skipped; non-finite values are excluded and counted. */
export function extract(rows: readonly Row[], key: string, xKey = 'step'): Series {
  const xs: number[] = []
  const ys: number[] = []
  let excludedNonFinite = 0
  for (const row of rows) {
    const y = row[key]
    if (typeof y !== 'number') continue
    const x = row[xKey]
    if (typeof x !== 'number' || !Number.isFinite(x)) continue
    if (!Number.isFinite(y)) {
      excludedNonFinite++
      continue
    }
    xs.push(x)
    ys.push(y)
  }
  return { xs, ys, excludedNonFinite }
}

/** Exponential moving average; alpha is the weight of the new value (0 < alpha <= 1). */
export function ema(values: readonly number[], alpha = 0.2): number[] {
  const out: number[] = []
  let m: number | undefined
  for (const v of values) {
    m = m === undefined ? v : alpha * v + (1 - alpha) * m
    out.push(m)
  }
  return out
}

/**
 * Largest-Triangle-Three-Buckets downsampling. Keeps the first and last point and, per bucket, the point
 * forming the biggest triangle, so peaks and spikes survive. Returns indexes into the input.
 */
export function lttbIndexes(xs: readonly number[], ys: readonly number[], threshold: number): number[] {
  const n = xs.length
  if (threshold >= n || threshold < 3) return Array.from({ length: n }, (_, i) => i)
  const picked: number[] = [0]
  const every = (n - 2) / (threshold - 2)
  let a = 0
  for (let i = 0; i < threshold - 2; i++) {
    const nextStart = Math.floor((i + 1) * every) + 1
    const nextEnd = Math.min(Math.floor((i + 2) * every) + 1, n)
    let avgX = 0
    let avgY = 0
    for (let j = nextStart; j < nextEnd; j++) {
      avgX += xs[j]
      avgY += ys[j]
    }
    const count = Math.max(nextEnd - nextStart, 1)
    avgX /= count
    avgY /= count

    const start = Math.floor(i * every) + 1
    const end = Math.floor((i + 1) * every) + 1
    let best = -1
    let bestArea = -1
    for (let j = start; j < end; j++) {
      const area = Math.abs((xs[a] - avgX) * (ys[j] - ys[a]) - (xs[a] - xs[j]) * (avgY - ys[a]))
      if (area > bestArea) {
        bestArea = area
        best = j
      }
    }
    picked.push(best)
    a = best
  }
  picked.push(n - 1)
  return picked
}

export interface ChartInput {
  label: string
  /** Metric key of the line (e.g. "loss"); lines of the same metric share one y axis. */
  metric?: string
  xs: number[]
  ys: number[]
}

export interface ChartData {
  /** Sorted union of all x values. */
  x: number[]
  /** One array per input series, aligned to `x`, null where the series has no point. */
  ys: (number | null)[][]
  /** Points kept per series after downsampling. */
  counts: number[]
}

/** Downsample each series to at most `maxPoints` and align them on a shared x array (uPlot's data layout). */
export function buildChartData(inputs: readonly ChartInput[], maxPoints = 2000): ChartData {
  const reduced = inputs.map((s) => {
    const idx = lttbIndexes(s.xs, s.ys, maxPoints)
    return { xs: idx.map((i) => s.xs[i]), ys: idx.map((i) => s.ys[i]) }
  })
  const union = new Set<number>()
  for (const s of reduced) for (const x of s.xs) union.add(x)
  const x = [...union].sort((p, q) => p - q)
  const position = new Map(x.map((v, i) => [v, i]))
  const ys = reduced.map((s) => {
    const col: (number | null)[] = new Array<number | null>(x.length).fill(null)
    s.xs.forEach((v, i) => {
      col[position.get(v) as number] = s.ys[i]
    })
    return col
  })
  return { x, ys, counts: reduced.map((s) => s.xs.length) }
}
