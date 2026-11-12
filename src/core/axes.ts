/** Axis helpers for the chart: tick text, the choice of a second y scale, axis width and flat ranges. */
import { t } from '../i18n/index.ts'
import type { Lang } from './types.ts'

/**
 * Tick text of a y axis value. uPlot's default rounds small values (a 4e-5 learning rate) to "0",
 * so values below 0.01 are written in exponent form.
 */
export function formatTick(value: number): string {
  if (!Number.isFinite(value)) return String(value)
  if (value === 0) return '0'
  const abs = Math.abs(value)
  if (abs < 0.01 || abs >= 1e6) return value.toExponential(1)
  return String(Number(value.toPrecision(4)))
}

/** Metrics whose values stay below this live on the second y axis when they share the chart with larger ones. */
export const SMALL_SCALE_LIMIT = 0.01

/**
 * Largest absolute finite value of a line, 0 when there is none.
 * A plain loop instead of `Math.max(...ys)`: NaN would poison the result and long runs would overflow the call stack.
 */
export function maxAbsFinite(ys: readonly number[]): number {
  let best = 0
  for (const y of ys) {
    if (Number.isFinite(y) && Math.abs(y) > best) best = Math.abs(y)
  }
  return best
}

/**
 * Pick the y scale ('y' or 'y2') for every line.
 *
 * The decision is made per metric, not per line: the largest value of a metric over all its runs decides,
 * so the same metric (loss of a healthy run and loss of a broken run) always shares one axis.
 * A metric is "tiny" when that largest value is above 0 and below 0.01 (a learning rate ~1e-5).
 * A metric that is exactly 0 everywhere (a broken run logging loss 0.0) carries no scale information
 * and stays on 'y' — it must never open a second axis by itself.
 * Tiny metrics move to 'y2' only when a non-tiny metric is drawn too; otherwise everything stays on 'y'.
 *
 * `metricOf[i]` names the metric of line i. Without it every line counts as its own metric.
 */
export function assignScales(maxAbs: readonly number[], metricOf?: readonly string[]): ('y' | 'y2')[] {
  const keyOf = (i: number) => metricOf?.[i] ?? `#${i}`
  // 1) 지표별 최댓값: 같은 지표의 선은 같은 축에 둔다.
  const metricMax = new Map<string, number>()
  maxAbs.forEach((m, i) => {
    const value = Number.isFinite(m) ? Math.abs(m) : 0
    metricMax.set(keyOf(i), Math.max(metricMax.get(keyOf(i)) ?? 0, value))
  })
  // 2) 0 은 "작은 값"이 아니다 — 0 < 최댓값 < 0.01 일 때만 작은 지표.
  const isTiny = (m: number) => m > 0 && m < SMALL_SCALE_LIMIT
  const isLarge = (m: number) => m >= SMALL_SCALE_LIMIT
  const values = [...metricMax.values()]
  const mixed = values.some(isTiny) && values.some(isLarge)
  return maxAbs.map((_, i) => (mixed && isTiny(metricMax.get(keyOf(i)) ?? 0) ? 'y2' : 'y'))
}

/** Metric names drawn on one scale, in first-seen order without repeats (used for the axis label). */
export function metricsOnScale(
  scales: readonly ('y' | 'y2')[],
  metricOf: readonly string[],
  scale: 'y' | 'y2',
): string[] {
  const names: string[] = []
  scales.forEach((s, i) => {
    const name = metricOf[i]
    if (s === scale && name !== undefined && !names.includes(name)) names.push(name)
  })
  return names
}

/** Approximate width of one tick character in uPlot's default 12px axis font (digits ~6.7px, kept on the safe side). */
export const TICK_CHAR_PX = 7.5
/** Tick mark (10px) + gap to the text (5px) + a little air at the outer edge. */
export const AXIS_PAD_PX = 10 + 5 + 6
/** uPlot's default y axis width; never go below it so short ticks look as before. */
export const MIN_AXIS_PX = 50

/**
 * Width of a y axis that fits its longest tick text ("4.0e-5" needs more than the 50px default,
 * which cut the first character). `values` is null before uPlot has formatted the ticks.
 */
export function axisSize(values: readonly string[] | null | undefined): number {
  const longest = (values ?? []).reduce((n, v) => Math.max(n, String(v ?? '').length), 0)
  return Math.max(MIN_AXIS_PX, Math.ceil(longest * TICK_CHAR_PX + AXIS_PAD_PX))
}

/**
 * Range for a flat line (min === max). uPlot falls back to 0..100 when every value is 0, which invents an
 * unrelated scale; here a flat line gets a small band around its value instead. Returns null when the data
 * is not flat, so the caller keeps uPlot's normal range.
 */
export function flatRange(min: number, max: number): [number, number] | null {
  if (!Number.isFinite(min) || !Number.isFinite(max) || min !== max) return null
  const pad = Math.abs(min) * 0.1 || 1
  return min === 0 ? [0, 1] : [min - pad, max + pad]
}

/**
 * Axis titles naming the metrics on each side. Only set when a second (right) axis is drawn — then the
 * reader must be told which lines belong to which axis. Left alone (undefined) for a single axis.
 */
export function axisLabels(
  lang: Lang,
  scales: readonly ('y' | 'y2')[],
  metricOf: readonly string[],
): { left?: string; right?: string } {
  const right = metricsOnScale(scales, metricOf, 'y2')
  if (right.length === 0) return {}
  const left = metricsOnScale(scales, metricOf, 'y')
  return {
    left: left.length > 0 ? t(lang, 'chart.axis.left', { metrics: left.join(', ') }) : undefined,
    right: t(lang, 'chart.axis.right', { metrics: right.join(', ') }),
  }
}
