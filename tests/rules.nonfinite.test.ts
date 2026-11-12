import { describe, expect, it } from 'vitest'
import { byRule, findingsOf } from './helpers.ts'

describe('non-finite rules (AC-2)', () => {
  it('reports a broken run: loss 0.0 with grad_norm NaN in every entry', () => {
    const findings = findingsOf('synthetic-nan-broken')
    const broken = byRule(findings, 'nonfinite.broken_run')
    expect(broken?.severity).toBe('error')
    expect(broken?.evidence.entries).toBe(21)
    expect(findings[0].rule).toBe('nonfinite.broken_run') // errors sort first
  })

  it('excludes NaN eval losses before looking for the minimum and reports how many', () => {
    const findings = findingsOf('synthetic-eval-nan')
    const overfit = byRule(findings, 'overfit.eval_rise')
    expect(Number.isFinite(overfit?.evidence.evalMin as number)).toBe(true)
    expect(overfit?.evidence.evalMin).toBe(1.5)
    expect(overfit?.evidence.excludedNonFinite).toBeGreaterThanOrEqual(1)
    expect(overfit?.severity).toBe('warn')
    expect(byRule(findings, 'nonfinite.values')?.severity).toBe('warn')
  })

  it('treats a top-level Infinity alone as harmless', () => {
    const findings = findingsOf('synthetic-infinity-best')
    expect(byRule(findings, 'nonfinite.broken_run')).toBeUndefined()
    expect(byRule(findings, 'nonfinite.values')?.severity).toBe('info')
  })
})
