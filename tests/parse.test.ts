import { describe, expect, it } from 'vitest'
import { parseTrainerState, toStrictJson } from '../src/core/parse.ts'
import { TrainerStateParseError } from '../src/core/types.ts'
import { loadParsed, sampleText } from './helpers.ts'

describe('tolerant parser (AC-1)', () => {
  it('restores a top-level best_metric Infinity', () => {
    const run = loadParsed('synthetic-infinity-best')
    expect(run.top.best_metric).toBe(Infinity)
    expect(run.nonFinite).toContainEqual({ step: null, key: 'best_metric', value: 'Infinity' })
  })

  it('restores NaN, Infinity and -Infinity inside log_history and reports their positions', () => {
    const text = '{"log_history":[{"step":1,"loss":NaN,"grad_norm":Infinity,"learning_rate":-Infinity}]}'
    const run = parseTrainerState(text)
    const row = run.train[0]
    expect(Number.isNaN(row.loss)).toBe(true)
    expect(row.grad_norm).toBe(Infinity)
    expect(row.learning_rate).toBe(-Infinity)
    expect(run.nonFinite).toEqual([
      { step: 1, key: 'loss', value: 'NaN' },
      { step: 1, key: 'grad_norm', value: 'Infinity' },
      { step: 1, key: 'learning_rate', value: '-Infinity' },
    ])
  })

  it('keeps the text "NaN" inside strings untouched', () => {
    const text = '{"note":"NaN and Infinity \\" NaN","log_history":[{"step":1,"loss":1.5,"tag":"-Infinity"}]}'
    const run = parseTrainerState(text)
    expect(run.top.note).toBe('NaN and Infinity " NaN')
    expect(run.train[0].tag).toBe('-Infinity')
    expect(run.nonFinite).toEqual([])
  })

  it('is not fooled by a user string that looks like the internal marker', () => {
    const text = '{"x":"__tsl_nonfinite__:NaN","log_history":[{"step":1,"loss":NaN}]}'
    const run = parseTrainerState(text)
    expect(run.top.x).toBe('__tsl_nonfinite__:NaN')
    expect(Number.isNaN(run.train[0].loss)).toBe(true)
  })

  it('does not treat plain negative numbers as tokens', () => {
    const run = parseTrainerState('{"log_history":[{"step":1,"loss":-0.5,"reward":-1e-3}]}')
    expect(run.train[0].loss).toBe(-0.5)
    expect(run.nonFinite).toEqual([])
  })

  it('splits log_history into train, eval and summary (probe SFT: 24/12/1)', () => {
    const run = loadParsed('tiny-sft')
    expect([run.train.length, run.evals.length, run.summary.length]).toEqual([24, 12, 1])
  })

  it('throws TrainerStateParseError with the file name for truncated JSON', () => {
    const text = sampleText('tiny-sft').slice(0, 500)
    expect(() => parseTrainerState(text, 'broken.json')).toThrowError(TrainerStateParseError)
    try {
      parseTrainerState(text, 'broken.json')
    } catch (error) {
      expect(error).toBeInstanceOf(TrainerStateParseError)
      expect((error as TrainerStateParseError).fileName).toBe('broken.json')
      expect((error as Error).message).toContain('broken.json')
      expect((error as Error).message).toContain('truncated')
    }
  })

  it('throws a helpful error when log_history is missing', () => {
    expect(() => parseTrainerState('{"a":1}', 'x.json')).toThrowError(/log_history/)
    expect(() => parseTrainerState('[1,2]', 'x.json')).toThrowError(TrainerStateParseError)
  })

  it('stays fast on long inputs without tokens (no regex backtracking)', () => {
    const rows = Array.from({ length: 50000 }, (_, i) => `{"step":${i},"loss":${(i % 7) / 10},"note":"${'-'.repeat(30)}"}`)
    const text = `{"log_history":[${rows.join(',')}]}`
    const t0 = performance.now()
    const strict = toStrictJson(text, 'm:')
    expect(strict).toBe(text)
    expect(performance.now() - t0).toBeLessThan(1000)
  })
})
