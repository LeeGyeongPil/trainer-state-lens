import { extract } from '../series.ts'
import { mean, quarterMeans, roundEvidence } from '../stats.ts'
import type { Finding, Run } from '../types.ts'
import type { Thresholds } from './options.ts'

/** GRPO (TRL) metrics: reward progress, groups without reward variance, KL growth, entropy, truncation. */
export function grpoRules(run: Run, th: Thresholds): Finding[] {
  const reward = extract(run.train, 'reward')
  if (reward.ys.length < 10) return []
  const findings: Finding[] = []

  const zero = extract(run.train, 'frac_reward_zero_std')
  if (zero.ys.length >= 4) {
    const lastHalf = mean(zero.ys.slice(Math.floor(zero.ys.length / 2)))
    if (lastHalf >= th.grpoZeroStd) {
      findings.push({
        rule: 'grpo.zero_std_groups',
        severity: 'warn',
        step: zero.xs[zero.xs.length - 1],
        evidence: { fracZeroStd: roundEvidence(lastHalf) },
      })
    }
  }

  const r = quarterMeans(reward.ys)
  if (r.last - r.first < th.grpoRewardGain) {
    findings.push({
      rule: 'grpo.reward_flat',
      severity: 'warn',
      step: reward.xs[reward.xs.length - 1],
      evidence: { rewardFirst: roundEvidence(r.first), rewardLast: roundEvidence(r.last) },
    })
  }

  const kl = extract(run.train, 'kl')
  if (kl.ys.length >= 4) {
    const k = quarterMeans(kl.ys)
    if (k.last >= th.grpoKlHigh && k.last > k.first) {
      findings.push({
        rule: 'grpo.kl_high',
        severity: 'info',
        step: kl.xs[kl.xs.length - 1],
        evidence: { klFirst: roundEvidence(k.first), klLast: roundEvidence(k.last) },
      })
    }
  }

  const entropy = extract(run.train, 'entropy')
  if (entropy.ys.length >= 4) {
    const e = quarterMeans(entropy.ys)
    if (e.first > 0 && e.last < 0.1 * e.first) {
      findings.push({
        rule: 'grpo.entropy_collapse',
        severity: 'info',
        step: entropy.xs[entropy.xs.length - 1],
        evidence: { entropyFirst: roundEvidence(e.first), entropyLast: roundEvidence(e.last) },
      })
    }
  }

  const clipped = extract(run.train, 'completions/clipped_ratio')
  if (clipped.ys.length >= 4) {
    const c = quarterMeans(clipped.ys)
    if (c.last >= 0.9) {
      findings.push({
        rule: 'grpo.truncation',
        severity: 'info',
        step: clipped.xs[clipped.xs.length - 1],
        evidence: { clippedRatio: roundEvidence(c.last) },
      })
    }
  }
  return findings
}
