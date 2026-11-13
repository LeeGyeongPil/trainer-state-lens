import { describe, expect, it } from 'vitest'
import { LEGEND_PAD, LEGEND_ROW, filterVisibleEntries, layoutLegend, type LegendEntry } from '../src/core/legend.ts'

const measure = (text: string) => text.length * 10
const entry = (label: string): LegendEntry => ({ label, color: '#2563eb', dash: [] })

describe('PNG legend layout', () => {
  it('has no height without entries', () => {
    expect(layoutLegend([], 800, measure)).toEqual({ items: [], height: 0 })
  })

  it('keeps every entry on one row when they fit', () => {
    const { items, height } = layoutLegend([entry('a · loss'), entry('b · loss')], 800, measure)
    expect(items).toHaveLength(2)
    expect(items[0].y).toBe(items[1].y)
    expect(items[1].x).toBeGreaterThan(items[0].x)
    expect(height).toBe(LEGEND_PAD * 2 + LEGEND_ROW)
  })

  it('wraps to a new row when the width is exceeded and keeps colour and dash', () => {
    const dashed = { label: 'run-b · eval_loss', color: '#dc2626', dash: [6, 4] }
    const { items, height } = layoutLegend([entry('run-a · loss'), dashed], 250, measure)
    expect(items[1].y).toBe(items[0].y + LEGEND_ROW)
    expect(items[1].x).toBe(LEGEND_PAD)
    expect(items[1].color).toBe('#dc2626')
    expect(items[1].dash).toEqual([6, 4])
    expect(height).toBe(LEGEND_PAD * 2 + LEGEND_ROW * 2)
  })

  it('always places an entry wider than the whole width', () => {
    const { items } = layoutLegend([entry('x'.repeat(100))], 100, measure)
    expect(items).toHaveLength(1)
    expect(items[0].x).toBe(LEGEND_PAD)
  })
})

describe('PNG legend visibility', () => {
  const all = [entry('a'), entry('b'), entry('c')]

  it('drops entries whose series is hidden', () => {
    expect(filterVisibleEntries(all, [true, false, true]).map((e) => e.label)).toEqual(['a', 'c'])
  })

  it('treats a missing flag as shown', () => {
    expect(filterVisibleEntries(all, [undefined, true])).toHaveLength(3)
  })

  it('returns no entries (no legend) when every line is hidden', () => {
    const visible = filterVisibleEntries(all, [false, false, false])
    expect(visible).toEqual([])
    expect(layoutLegend(visible, 800, measure).height).toBe(0)
  })
})
