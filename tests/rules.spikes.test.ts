import { describe, expect, it } from 'vitest'
import { diagnose } from '../src/core/rules/index.ts'
import type { Run } from '../src/core/types.ts'
import { byRule, findingsOf, loadRun } from './helpers.ts'

function stepsOf(id: string, rule: string): number[] {
  const f = byRule(findingsOf(id), rule)
  return (f?.evidence.steps as number[] | undefined) ?? []
}

describe('spike and divergence rules (AC-4)', () => {
  it('reports the OpenR1 grad_norm spike at step 1563 as the largest', () => {
    const f = byRule(findingsOf('openr1-distill-7b'), 'spikes.grad_norm')
    expect(f?.severity).toBe('warn')
    expect(f?.evidence.steps as number[]).toContain(1563)
    expect(f?.step).toBe(1563)
    expect(f?.evidence.topValue as number).toBeCloseTo(26.2, 1)
  })

  it('does not report the tiny-MAD false positives of zephyr-7b-beta (steps 4290 and 5090)', () => {
    const steps = stepsOf('zephyr-7b-beta', 'spikes.loss')
    expect(steps).not.toContain(4290)
    expect(steps).not.toContain(5090)
    expect(steps).toContain(760) // the real doubling is still found
  })

  it('does not report jitter on a converged flat loss', () => {
    const findings = findingsOf('synthetic-flat-jitter')
    expect(findings.filter((f) => f.rule.startsWith('spikes.'))).toEqual([])
  })

  it('reports divergence as an error for the synthetic diverging run', () => {
    const f = byRule(findingsOf('synthetic-diverge'), 'spikes.divergence')
    expect(f?.severity).toBe('error')
    expect(f?.evidence.reason).toBe('nonfinite_tail')
  })

  it('detects a loss that climbs away from its best level even without NaN', () => {
    const run = loadRun('synthetic-diverge')
    const truncated: Run = { ...run, train: run.train.filter((r) => r.step <= 290), nonFinite: [] }
    const f = byRule(diagnose(truncated), 'spikes.divergence')
    expect(f?.severity).toBe('error')
    expect(f?.evidence.reason).toBe('loss_climb')
    expect(f?.evidence.ratio as number).toBeGreaterThan(2)
  })

  it('finds no spikes or divergence in the probe SFT, DPO and GRPO runs', () => {
    for (const id of ['tiny-sft', 'tiny-dpo', 'tiny-grpo']) {
      expect(findingsOf(id).filter((f) => f.rule.startsWith('spikes.')), id).toEqual([])
    }
  })

  it('finds no divergence in healthy Hub runs', () => {
    for (const id of ['zephyr-7b-beta', 'smollm2-1.7b-instruct', 'openr1-distill-7b', 'mistral-7b-sft-beta']) {
      expect(byRule(findingsOf(id), 'spikes.divergence'), id).toBeUndefined()
    }
  })
})
