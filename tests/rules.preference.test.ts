import { describe, expect, it } from 'vitest'
import { byRule, findingsOf } from './helpers.ts'

describe('preference metric rules (AC-6)', () => {
  it('warns about likelihood displacement in zephyr-7b-beta with quarter-mean evidence', () => {
    const findings = findingsOf('zephyr-7b-beta')
    const f = byRule(findings, 'dpo.likelihood_displacement')
    expect(f?.severity).toBe('warn')
    const e = f?.evidence as Record<string, number>
    expect(e.marginsFirst).toBeCloseTo(1.05, 2)
    expect(e.marginsLast).toBeCloseTo(10.15, 2)
    expect(e.rewardsChosenFirst).toBeCloseTo(-0.34, 2)
    expect(e.rewardsChosenLast).toBeCloseTo(-1.09, 2)
    expect(e.logpsChosenFirst).toBeCloseTo(-285.5, 1)
    expect(e.logpsChosenLast).toBeCloseTo(-291.6, 1)
    const sat = byRule(findings, 'dpo.accuracy_saturated')
    expect(sat?.severity).toBe('info')
    expect(sat?.evidence.accuracy as number).toBeCloseTo(0.99, 2)
  })

  it('finds no displacement in SmolLM2 and the probe DPO run', () => {
    expect(byRule(findingsOf('smollm2-1.7b-instruct'), 'dpo.likelihood_displacement')).toBeUndefined()
    expect(byRule(findingsOf('tiny-dpo'), 'dpo.likelihood_displacement')).toBeUndefined()
  })

  it('warns about a stalled GRPO run: zero-variance groups and flat reward', () => {
    const findings = findingsOf('synthetic-grpo-stall')
    expect(byRule(findings, 'grpo.zero_std_groups')?.severity).toBe('warn')
    expect(byRule(findings, 'grpo.zero_std_groups')?.evidence.fracZeroStd as number).toBeCloseTo(0.8, 1)
    expect(byRule(findings, 'grpo.reward_flat')?.severity).toBe('warn')
    expect(byRule(findings, 'grpo.kl_high')?.severity).toBe('info')
  })

  it('gives the probe GRPO run neither warnings nor errors', () => {
    const bad = findingsOf('tiny-grpo').filter((f) => f.severity === 'warn' || f.severity === 'error')
    expect(bad).toEqual([])
  })

  it('stays silent for runs without preference keys', () => {
    const findings = findingsOf('tiny-sft')
    expect(findings.some((f) => f.rule.startsWith('dpo.') || f.rule.startsWith('grpo.'))).toBe(false)
  })
})
