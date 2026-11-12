import { extract } from '../series.ts'
import { quarterMeans, roundEvidence } from '../stats.ts'
import type { Finding, Run } from '../types.ts'
import type { Thresholds } from './options.ts'

/**
 * DPO / preference metrics (keys written by TRL).
 *  - likelihood displacement: the reward margin grows while the chosen reward turns negative and the
 *    log-probability of the chosen answers drops (arXiv 2410.08847),
 *  - accuracy saturation: rewards/accuracies near 1.0 means the pairs are separated easily.
 */
export function dpoRules(run: Run, th: Thresholds): Finding[] {
  const margins = extract(run.train, 'rewards/margins')
  if (margins.ys.length < 4) return []
  const findings: Finding[] = []

  const m = quarterMeans(margins.ys)
  const rewardChosen = extract(run.train, 'rewards/chosen')
  const logpChosen = extract(run.train, 'logps/chosen')
  if (rewardChosen.ys.length >= 4 && logpChosen.ys.length >= 4) {
    const c = quarterMeans(rewardChosen.ys)
    const l = quarterMeans(logpChosen.ys)
    if (m.last > m.first && c.last < 0 && l.last < l.first) {
      findings.push({
        rule: 'dpo.likelihood_displacement',
        severity: 'warn',
        step: margins.xs[margins.xs.length - 1],
        evidence: {
          marginsFirst: roundEvidence(m.first),
          marginsLast: roundEvidence(m.last),
          rewardsChosenFirst: roundEvidence(c.first),
          rewardsChosenLast: roundEvidence(c.last),
          logpsChosenFirst: roundEvidence(l.first),
          logpsChosenLast: roundEvidence(l.last),
        },
      })
    }
  }

  const accuracies = extract(run.train, 'rewards/accuracies')
  if (accuracies.ys.length >= 4) {
    const a = quarterMeans(accuracies.ys)
    if (a.last >= th.dpoSaturatedAccuracy) {
      findings.push({
        rule: 'dpo.accuracy_saturated',
        severity: 'info',
        step: null,
        evidence: { accuracy: roundEvidence(a.last) },
      })
    }
  }
  return findings
}
