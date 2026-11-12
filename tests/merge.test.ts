import { describe, expect, it } from 'vitest'
import { buildInputs } from '../src/core/chartInputs.ts'
import { duplicateSteps, entryCount, mergeRuns } from '../src/core/merge.ts'
import { parseTrainerState } from '../src/core/parse.ts'
import { diagnose } from '../src/core/rules/index.ts'
import { buildChartData, ema, lttbIndexes } from '../src/core/series.ts'
import { loadParsed, loadRuns, sampleText } from './helpers.ts'

describe('merge and performance (AC-7)', () => {
  it('merges checkpoint-60 and the final file into one run with 37 entries and no duplicate steps', () => {
    const runs = loadRuns('tiny-sft-checkpoint-60', 'tiny-sft')
    expect(runs).toHaveLength(1)
    expect(entryCount(runs[0])).toBe(37)
    expect(duplicateSteps(runs[0])).toBe(0)
    expect(runs[0].files).toEqual(['tiny-sft-checkpoint-60.json', 'tiny-sft.json'])
    expect(runs[0].name).toBe('tiny-sft.json') // the file that got furthest leads
    expect(runs[0].top.global_step).toBe(120)
  })

  it('gives the same result whatever order the files come in', () => {
    const a = loadRuns('tiny-sft', 'tiny-sft-checkpoint-60')[0]
    const b = loadRuns('tiny-sft-checkpoint-60', 'tiny-sft')[0]
    expect(entryCount(a)).toBe(entryCount(b))
    expect(a.train.map((r) => r.step)).toEqual(b.train.map((r) => r.step))
  })

  it('keeps different runs separate so they can be overlaid', () => {
    const runs = loadRuns('tiny-sft', 'tiny-dpo', 'tiny-grpo', 'tiny-sft-checkpoint-60')
    expect(runs.map((r) => r.name)).toEqual(['tiny-sft.json', 'tiny-dpo.json', 'tiny-grpo.json'])
  })

  it('does not join runs that share settings but differ in logged values', () => {
    const a = loadParsed('tiny-sft')
    const b = loadParsed('tiny-sft')
    b.train = b.train.map((r) => ({ ...r, loss: (r.loss as number) + 1 }))
    expect(mergeRuns([a, b])).toHaveLength(2)
  })

  it('numbers runs that come from files with the same name', () => {
    const a = parseTrainerState(sampleText('tiny-dpo'), 'trainer_state.json')
    const b = parseTrainerState(sampleText('tiny-grpo'), 'trainer_state.json')
    expect(mergeRuns([a, b]).map((r) => r.name)).toEqual(['trainer_state.json (1)', 'trainer_state.json (2)'])
  })

  it('parses and diagnoses the 2.8 MB-class OpenR1 file in under 1500 ms', () => {
    const text = sampleText('openr1-distill-7b')
    const t0 = performance.now()
    const run = mergeRuns([parseTrainerState(text, 'openr1.json')])[0]
    const findings = diagnose(run)
    const elapsed = performance.now() - t0
    expect(run.train).toHaveLength(13645)
    expect(findings.length).toBeGreaterThan(0)
    expect(elapsed).toBeLessThan(1500)
  })

  it('keeps at most 2000 chart points per line after LTTB and keeps the spike', () => {
    const run = loadRuns('openr1-distill-7b')[0]
    const inputs = buildInputs([run], ['loss', 'grad_norm'], 'step', 0)
    const data = buildChartData(inputs, 2000)
    expect(Math.max(...data.counts)).toBeLessThanOrEqual(2000)
    const grad = inputs.find((i) => i.label.endsWith('grad_norm'))
    const idx = lttbIndexes(grad!.xs, grad!.ys, 2000)
    expect(idx.map((i) => grad!.xs[i])).toContain(1563) // peaks survive downsampling
    expect(data.ys.every((col) => col.length === data.x.length)).toBe(true)
  })
})

describe('series helpers', () => {
  it('lttb returns everything when the input is small', () => {
    expect(lttbIndexes([1, 2, 3], [1, 2, 3], 10)).toEqual([0, 1, 2])
  })

  it('lttb keeps the first and the last point', () => {
    const xs = Array.from({ length: 1000 }, (_, i) => i)
    const idx = lttbIndexes(xs, xs.map((x) => Math.sin(x / 10)), 50)
    expect(idx).toHaveLength(50)
    expect(idx[0]).toBe(0)
    expect(idx[idx.length - 1]).toBe(999)
  })

  it('ema follows the weighting of new values', () => {
    expect(ema([1, 1, 1])).toEqual([1, 1, 1])
    expect(ema([0, 10], 0.5)).toEqual([0, 5])
  })

  it('buildInputs leaves out non-finite values and does not smooth eval metrics', () => {
    const run = loadRuns('synthetic-eval-nan')[0]
    const [evalLine] = buildInputs([run], ['eval_loss'], 'step', 0.5)
    expect(evalLine.ys.every(Number.isFinite)).toBe(true)
    expect(evalLine.xs).toHaveLength(5)
    expect(evalLine.ys).toContain(1.5)
  })
})
