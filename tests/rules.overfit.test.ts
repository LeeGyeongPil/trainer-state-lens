import { describe, expect, it } from 'vitest'
import { byRule, findingsOf } from './helpers.ts'

describe('overfit rule (AC-3)', () => {
  it('warns on the probe SFT run: minimum at step 30, +11.5%, growing gap, best checkpoint not saved', () => {
    const findings = findingsOf('tiny-sft')
    const overfit = byRule(findings, 'overfit.eval_rise')
    expect(overfit?.severity).toBe('warn')
    expect(overfit?.step).toBe(30)
    expect(overfit?.evidence.evalMinStep).toBe(30)
    expect(overfit?.evidence.risePct as number).toBeCloseTo(11.5, 1)
    expect(overfit?.evidence.gapFirst as number).toBeCloseTo(0.4, 2)
    expect(overfit?.evidence.gapLast as number).toBeCloseTo(2.34, 2)
    const missing = byRule(findings, 'overfit.best_checkpoint_missing')
    expect(missing?.severity).toBe('info')
    expect(missing?.evidence).toEqual({ bestStep: 30, saveSteps: 60 })
  })

  it('is ok for SmolLM2 (rise 1.4%)', () => {
    const overfit = byRule(findingsOf('smollm2-1.7b-instruct'), 'overfit.eval_rise')
    expect(overfit?.severity).toBe('ok')
    expect(overfit?.evidence.risePct as number).toBeCloseTo(1.4, 1)
  })

  it('warns, never errors, for zephyr-7b-beta (+51.7%)', () => {
    const findings = findingsOf('zephyr-7b-beta')
    const overfit = byRule(findings, 'overfit.eval_rise')
    expect(overfit?.severity).toBe('warn')
    expect(overfit?.evidence.risePct as number).toBeCloseTo(51.7, 1)
    expect(findings.some((f) => f.rule.startsWith('overfit.') && f.severity === 'error')).toBe(false)
  })

  it('skips silently when a run has fewer than three eval points', () => {
    expect(findingsOf('mistral-7b-sft-beta').some((f) => f.rule.startsWith('overfit.'))).toBe(false)
  })
})
