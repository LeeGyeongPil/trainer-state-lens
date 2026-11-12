/** Small numeric helpers shared by the rules. All functions ignore nothing: callers pass finite numbers. */

export function median(values: readonly number[]): number {
  if (values.length === 0) return NaN
  const sorted = [...values].sort((a, b) => a - b)
  const mid = sorted.length >> 1
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

/** Median absolute deviation around `center` (default: the median). Not scaled. */
export function mad(values: readonly number[], center = median(values)): number {
  return median(values.map((v) => Math.abs(v - center)))
}

export function mean(values: readonly number[]): number {
  if (values.length === 0) return NaN
  let sum = 0
  for (const v of values) sum += v
  return sum / values.length
}

/** Mean of the first and of the last quarter of a series (at least one point each). */
export function quarterMeans(values: readonly number[]): { first: number; last: number } {
  const q = Math.max(Math.floor(values.length / 4), 1)
  return { first: mean(values.slice(0, q)), last: mean(values.slice(-q)) }
}

/** Least-squares slope of y over x. */
export function slope(xs: readonly number[], ys: readonly number[]): number {
  const n = Math.min(xs.length, ys.length)
  if (n < 2) return 0
  const mx = mean(xs.slice(0, n))
  const my = mean(ys.slice(0, n))
  let num = 0
  let den = 0
  for (let i = 0; i < n; i++) {
    num += (xs[i] - mx) * (ys[i] - my)
    den += (xs[i] - mx) ** 2
  }
  return den === 0 ? 0 : num / den
}

/** Round to a readable number of decimals; large magnitudes keep fewer decimals. */
export function round(value: number, decimals = 4): number {
  if (!Number.isFinite(value)) return value
  const f = 10 ** decimals
  return Math.round(value * f) / f
}

/** Rounding used for evidence values: 2 decimals, 1 decimal from magnitude 100, 6 significant digits below 0.01. */
export function roundEvidence(value: number): number {
  if (!Number.isFinite(value)) return value
  const abs = Math.abs(value)
  if (abs >= 100) return round(value, 1)
  if (abs >= 0.01 || abs === 0) return round(value, 2)
  return Number(value.toPrecision(3))
}
