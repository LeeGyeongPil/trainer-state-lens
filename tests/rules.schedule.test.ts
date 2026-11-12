import { describe, expect, it } from 'vitest'
import { byRule, findingsOf } from './helpers.ts'

function shape(id: string) {
  const f = byRule(findingsOf(id), 'schedule.shape')
  if (!f) throw new Error(`no schedule finding for ${id}`)
  return f
}

describe('schedule and run status (AC-5)', () => {
  it('recognises the OpenR1 cosine with a minimum-LR floor of 10% and does not warn', () => {
    const f = shape('openr1-distill-7b')
    expect(f.evidence.shape).toBe('cosine_min_lr')
    expect(f.evidence.floorRatio as number).toBeCloseTo(0.1, 2)
    expect(f.severity).not.toBe('warn')
    expect(f.evidence.warmupPct as number).toBeCloseTo(3, 0)
  })

  it('recognises cosine, linear and the probe SFT warmup peak within logging resolution', () => {
    expect(shape('smollm2-1.7b-instruct').evidence.shape).toBe('cosine')
    expect(shape('zephyr-7b-beta').evidence.shape).toBe('linear')
    const sft = shape('tiny-sft')
    expect(sft.evidence.shape).toBe('cosine')
    // warmup_steps was 10 (probe config); logging every 5 steps puts the observed peak at 15.
    expect(sft.evidence.resolution).toBe(5)
    expect(Math.abs((sft.evidence.peakStep as number) - 10)).toBeLessThanOrEqual(5)
  })

  it('does not invent a floor for plain linear schedules whose last logged lr lags by one step', () => {
    expect(shape('tiny-dpo').evidence.shape).toBe('linear')
    expect(shape('tiny-grpo').evidence.shape).toBe('linear')
  })

  it('fits an unfinished run against max_steps and reports it as incomplete (272/406)', () => {
    const findings = findingsOf('mistral-7b-sft-beta')
    expect(shape('mistral-7b-sft-beta').evidence.shape).toBe('cosine')
    const incomplete = byRule(findings, 'run.incomplete')
    expect(incomplete?.severity).toBe('info')
    expect(incomplete?.evidence.globalStep).toBe(272)
    expect(incomplete?.evidence.maxSteps).toBe(406)
  })

  it('reports the synthetic eval-NaN run as incomplete (76/92)', () => {
    const incomplete = byRule(findingsOf('synthetic-eval-nan'), 'run.incomplete')
    expect(incomplete?.evidence.globalStep).toBe(76)
    expect(incomplete?.evidence.maxSteps).toBe(92)
  })

  it('does not report a finished run as incomplete', () => {
    expect(byRule(findingsOf('smollm2-1.7b-instruct'), 'run.incomplete')).toBeUndefined()
  })
})
