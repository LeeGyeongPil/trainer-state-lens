import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import App from '../src/App.tsx'
import {
  AXIS_PAD_PX,
  MIN_AXIS_PX,
  TICK_CHAR_PX,
  assignScales,
  axisLabels,
  axisSize,
  flatRange,
  formatTick,
  maxAbsFinite,
  metricsOnScale,
} from '../src/core/axes.ts'
import { buildInputs, defaultXKey, progressOf } from '../src/core/chartInputs.ts'
import { parseTrainerState } from '../src/core/parse.ts'
import { diagnose } from '../src/core/rules/index.ts'
import { TrainerStateParseError } from '../src/core/types.ts'
import { messages, t } from '../src/i18n/index.ts'
import { loadRun, loadRuns } from './helpers.ts'

describe('y axis ticks (Q-1)', () => {
  it('never writes a small learning rate as 0', () => {
    expect(formatTick(4e-5)).toBe('4.0e-5')
    expect(formatTick(2.5e-6)).toBe('2.5e-6')
    expect(formatTick(0)).toBe('0')
    expect(formatTick(0.5)).toBe('0.5')
    expect(formatTick(1.2345678)).toBe('1.235')
  })

  it('puts tiny lines on a second scale only when they share the chart with larger ones', () => {
    expect(assignScales([1.2, 4e-5])).toEqual(['y', 'y2'])
    expect(assignScales([4e-5, 3e-5])).toEqual(['y', 'y'])
    expect(assignScales([1.2, 0.8])).toEqual(['y', 'y'])
  })
})

describe('second y axis is never anonymous or opened by zeros (round-2 Q-1)', () => {
  it('keeps an all-zero line on the left axis', () => {
    expect(assignScales([1.2, 0])).toEqual(['y', 'y'])
    expect(assignScales([1.2, 4e-5, 0])).toEqual(['y', 'y2', 'y'])
    expect(assignScales([0, 0])).toEqual(['y', 'y'])
    expect(assignScales([1.2, Number.NaN])).toEqual(['y', 'y'])
  })

  it('puts every line of one metric on the same axis', () => {
    // A broken run's loss (all 0) and a run whose loss is tiny still follow the healthy run's loss.
    expect(assignScales([2.9, 0, 0.004], ['loss', 'loss', 'loss'])).toEqual(['y', 'y', 'y'])
    expect(assignScales([2.9, 0, 4e-5, 3e-5], ['loss', 'loss', 'learning_rate', 'learning_rate'])).toEqual([
      'y',
      'y',
      'y2',
      'y2',
    ])
  })

  it('maxAbsFinite skips NaN and handles long lines', () => {
    expect(maxAbsFinite([0, Number.NaN, -3, 2])).toBe(3)
    expect(maxAbsFinite([])).toBe(0)
    expect(maxAbsFinite(new Array<number>(300_000).fill(1e-5))).toBe(1e-5)
  })

  it('starter set (overview screenshot) draws loss and eval_loss on one axis only', () => {
    const runs = loadRuns('tiny-sft', 'tiny-sft-checkpoint-60', 'zephyr-7b-beta', 'synthetic-nan-broken')
    const inputs = buildInputs(runs, ['loss', 'eval_loss'], defaultXKey(runs), 0)
    expect(inputs.some((input) => input.label.startsWith('synthetic-nan-broken'))).toBe(true)
    const metricOf = inputs.map((input) => input.metric ?? '')
    const scales = assignScales(
      inputs.map((input) => maxAbsFinite(input.ys)),
      metricOf,
    )
    expect(scales.every((s) => s === 'y')).toBe(true)
    expect(axisLabels('en', scales, metricOf)).toEqual({})
  })

  it('labels both axes with metric names whenever the right axis is used', () => {
    const runs = loadRuns('tiny-sft', 'synthetic-nan-broken')
    const inputs = buildInputs(runs, ['loss', 'learning_rate'], 'step', 0)
    const metricOf = inputs.map((input) => input.metric ?? '')
    const scales = assignScales(
      inputs.map((input) => maxAbsFinite(input.ys)),
      metricOf,
    )
    // Only learning_rate is on the right; the broken run's loss (0.0) stays with the other loss.
    expect(metricsOnScale(scales, metricOf, 'y2')).toEqual(['learning_rate'])
    expect(metricsOnScale(scales, metricOf, 'y')).toEqual(['loss'])
    expect(axisLabels('en', scales, metricOf)).toEqual({
      left: 'left axis: loss',
      right: 'right axis: learning_rate',
    })
    expect(axisLabels('ko', scales, metricOf)).toEqual({
      left: '왼쪽 축: loss',
      right: '오른쪽 축: learning_rate',
    })
  })

  it('gives a flat zero line a small band instead of uPlot 0..100', () => {
    expect(flatRange(0, 0)).toEqual([0, 1])
    expect(flatRange(2, 2)).toEqual([1.8, 2.2])
    expect(flatRange(0, 1)).toBeNull()
  })
})

describe('y axis width fits the tick text (round-2 Q-2)', () => {
  it('is wider than the 50px default for exponent ticks', () => {
    expect(axisSize(['4.0e-5', '3.0e-5', '2.0e-5', '1.0e-5', '0'])).toBeGreaterThan(MIN_AXIS_PX)
    expect(axisSize(['0.5', '1', '1.5'])).toBe(MIN_AXIS_PX)
    expect(axisSize(null)).toBe(MIN_AXIS_PX)
  })

  it('leaves room for the longest tick string next to the tick mark and gap', () => {
    for (const ticks of [['4.0e-5'], ['-2.5e-6', '0'], ['-1.2e+6'], ['1.235', '12.35']]) {
      const longest = Math.max(...ticks.map((v) => v.length))
      expect(axisSize(ticks) - AXIS_PAD_PX).toBeGreaterThanOrEqual(longest * TICK_CHAR_PX)
    }
  })

  it('uses one character width that covers digits in a 12px font', () => {
    // 12px system fonts draw digits about 6.7px wide; the estimate must not be smaller.
    expect(TICK_CHAR_PX).toBeGreaterThanOrEqual(7)
    // Tick mark (10) + gap (5) of uPlot's default y axis are inside the padding.
    expect(AXIS_PAD_PX).toBeGreaterThanOrEqual(15)
  })
})

describe('progress axis (Q-3)', () => {
  it('switches to progress when run lengths differ more than 10x', () => {
    expect(defaultXKey(loadRuns('tiny-sft', 'zephyr-7b-beta'))).toBe('progress')
    expect(defaultXKey(loadRuns('tiny-sft', 'tiny-dpo'))).toBe('step')
    expect(defaultXKey(loadRuns('tiny-sft'))).toBe('step')
  })

  it('maps each run onto 0..100 percent', () => {
    const run = loadRun('tiny-sft')
    const [line] = buildInputs([run], ['loss'], 'progress', 0)
    expect(Math.max(...line.xs)).toBeLessThanOrEqual(100)
    expect(Math.min(...line.xs)).toBeGreaterThan(0)
    expect(progressOf(run, 0)).toBe(0)
  })
})

describe('Korean screen has no English leftovers (Q-2)', () => {
  it('parse errors carry a reason code', () => {
    for (const [text, code] of [['{"log_his', 'invalid_json'], ['{"a":1}', 'no_log_history']] as const) {
      try {
        parseTrainerState(text, 'x.json')
        expect.unreachable()
      } catch (error) {
        expect(error).toBeInstanceOf(TrainerStateParseError)
        expect((error as TrainerStateParseError).code).toBe(code)
      }
    }
  })

  it('every parse error code has a Korean sentence without Latin words except fixed names', () => {
    for (const code of ['invalid_json', 'no_log_history'] as const) {
      const ko = t('ko', `runs.parseError.${code}`)
      expect(ko).toMatch(/[가-힣]/)
      const withoutNames = ko.replace(/log_history|Hugging Face Trainer|trainer_state\.json|JSON/g, '')
      expect(withoutNames).not.toMatch(/[A-Za-z]{3,}/)
    }
  })

  it('x axis labels exist for every axis and differ between languages where translated', () => {
    for (const key of ['step', 'epoch', 'num_tokens', 'progress'] as const) {
      expect(messages.ko[`chart.x.${key}`].length).toBeGreaterThan(0)
    }
    expect(messages.ko['chart.x.progress']).toMatch(/[가-힣]/)
  })

  it('Korean placeholders are not followed by a fixed particle', () => {
    for (const [key, text] of Object.entries(messages.ko)) {
      expect(text, key).not.toMatch(/\}(은|는|이|가|을|를|와|과)(\s|$)/)
    }
  })

  it('server-rendered Korean app does not show English chart text', () => {
    const html = renderToString(createElement(App, { initialLang: 'ko' }))
    expect(html).not.toContain('Value')
  })
})

describe('edge runs (Q-9)', () => {
  it('reports an empty run instead of an empty table', () => {
    const empty = parseTrainerState('{"log_history":[]}', 'empty.json')
    const findings = diagnose({ ...empty, files: ['empty.json'] })
    expect(findings.map((f) => f.rule)).toEqual(['run.empty'])
    const evalOnly = parseTrainerState('{"log_history":[{"step":5,"eval_loss":1.2}]}', 'e.json')
    expect(diagnose({ ...evalOnly, files: ['e.json'] }).map((f) => f.rule)).toEqual(['run.empty'])
  })

  it('flags a run whose train loss is non-finite from the first entry as error', () => {
    const text =
      '{"log_history":[{"step":1,"loss":NaN,"grad_norm":NaN},{"step":2,"loss":NaN,"grad_norm":NaN}],"max_steps":10,"global_step":2}'
    const parsed = parseTrainerState(text, 'nan.json')
    const findings = diagnose({ ...parsed, files: ['nan.json'] })
    const allLoss = findings.find((f) => f.rule === 'nonfinite.all_loss')
    expect(allLoss?.severity).toBe('error')
    expect(allLoss?.step).toBe(1)
    expect(findings.find((f) => f.rule === 'nonfinite.values')?.severity).toBe('info')
  })
})
