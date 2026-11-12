import type { Finding, Run } from '../types.ts'

/** A run whose global_step is below max_steps stopped early (crash, kill, or a checkpoint copy). */
export function runStatusRules(run: Run): Finding[] {
  // Nothing to diagnose: say so instead of showing an empty table that looks like a clean bill of health.
  if (run.train.length === 0) {
    return [{ rule: 'run.empty', severity: 'info', step: null, evidence: { evalEntries: run.evals.length } }]
  }
  const maxSteps = run.top.max_steps
  const lastTrain = run.train.length ? run.train[run.train.length - 1].step : undefined
  const globalStep = typeof run.top.global_step === 'number' ? run.top.global_step : lastTrain
  if (typeof maxSteps !== 'number' || globalStep === undefined || maxSteps <= 0 || globalStep >= maxSteps) return []
  return [
    {
      rule: 'run.incomplete',
      severity: 'info',
      step: globalStep,
      evidence: {
        globalStep,
        maxSteps,
        percent: Math.round((globalStep / maxSteps) * 1000) / 10,
      },
    },
  ]
}
