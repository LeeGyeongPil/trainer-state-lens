/** Pure layout of the chart legend for the PNG export (uPlot's own legend is DOM, so it is not on its canvas). */

export interface LegendEntry {
  label: string
  color: string
  /** Canvas line dash pattern; empty for a solid line. */
  dash: readonly number[]
}

export interface LegendItem extends LegendEntry {
  x: number
  y: number
  /** Width of the line sample drawn before the text. */
  sample: number
  textX: number
}

export interface LegendLayout {
  items: LegendItem[]
  /** Total height the legend needs, including padding; 0 without entries. */
  height: number
}

export const LEGEND_SAMPLE = 24
export const LEGEND_GAP = 6
export const LEGEND_ITEM_GAP = 18
export const LEGEND_ROW = 20
export const LEGEND_PAD = 10

/** Wraps entries into rows no wider than `width` (CSS pixels). `measure` returns the text width of a label. */
export function layoutLegend(entries: readonly LegendEntry[], width: number, measure: (text: string) => number): LegendLayout {
  if (entries.length === 0) return { items: [], height: 0 }
  const items: LegendItem[] = []
  let x = LEGEND_PAD
  let row = 0
  for (const entry of entries) {
    const itemWidth = LEGEND_SAMPLE + LEGEND_GAP + measure(entry.label)
    // Start a new row when it does not fit (the first item of a row is always placed, however long).
    if (x > LEGEND_PAD && x + itemWidth > width - LEGEND_PAD) {
      row += 1
      x = LEGEND_PAD
    }
    items.push({ ...entry, x, y: LEGEND_PAD + row * LEGEND_ROW + LEGEND_ROW / 2, sample: LEGEND_SAMPLE, textX: x + LEGEND_SAMPLE + LEGEND_GAP })
    x += itemWidth + LEGEND_ITEM_GAP
  }
  return { items, height: LEGEND_PAD * 2 + (row + 1) * LEGEND_ROW }
}

/**
 * Keeps only the entries whose uPlot series is currently shown (series index i + 1; index 0 is x).
 * A series without a flag counts as shown. With every line hidden the result is empty, so the PNG is saved without a legend.
 */
export function filterVisibleEntries<T>(entries: readonly T[], shown: readonly (boolean | undefined)[]): T[] {
  return entries.filter((_, i) => shown[i] !== false)
}
