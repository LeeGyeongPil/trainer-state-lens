import type { ParsedRun, Row, Run } from './types.ts'

/** Config keys that stay constant during one training run (checkpoints copy them from the final file). */
const CONFIG_KEYS = ['max_steps', 'num_train_epochs', 'train_batch_size', 'logging_steps', 'eval_steps', 'save_steps']

function sameNumber(a: unknown, b: unknown): boolean {
  if (typeof a !== 'number' || typeof b !== 'number') return Object.is(a, b)
  if (Object.is(a, b)) return true
  return Math.abs(a - b) <= 1e-9 * Math.max(Math.abs(a), Math.abs(b), 1e-300)
}

/**
 * Two files are the same run when their constant settings agree and, on every shared train step,
 * loss and learning_rate are identical (a checkpoint file is a prefix of the final file).
 * At least one shared step is required, so unrelated runs are never joined by accident.
 */
export function isSameRun(a: ParsedRun, b: ParsedRun): boolean {
  for (const key of CONFIG_KEYS) {
    if (key in a.top && key in b.top && !sameNumber(a.top[key], b.top[key])) return false
  }
  const byStep = new Map<number, Row>()
  for (const row of a.train) byStep.set(row.step, row)
  let shared = 0
  for (const row of b.train) {
    const other = byStep.get(row.step)
    if (!other) continue
    shared++
    if (!sameNumber(other.loss, row.loss) || !sameNumber(other.learning_rate, row.learning_rate)) return false
  }
  return shared > 0
}

function lastStep(run: ParsedRun): number {
  const g = run.top.global_step
  if (typeof g === 'number') return g
  return run.train.length ? run.train[run.train.length - 1].step : 0
}

/** Union of rows by step; rows of earlier arguments win (pass the most complete file first). */
function unionByStep(lists: Row[][]): Row[] {
  const seen = new Set<number>()
  const out: Row[] = []
  for (const list of lists) {
    for (const row of list) {
      if (seen.has(row.step)) continue
      seen.add(row.step)
      out.push(row)
    }
  }
  return out.sort((x, y) => x.step - y.step)
}

/**
 * Group parsed files into runs. Files of one training (e.g. checkpoint-60 and the final file) are merged
 * by step; different runs stay separate so they can be overlaid.
 */
export function mergeRuns(files: readonly ParsedRun[]): Run[] {
  const groups: ParsedRun[][] = []
  for (const file of files) {
    const target = groups.find((g) => g.some((member) => isSameRun(member, file)))
    if (target) target.push(file)
    else groups.push([file])
  }
  const runs = groups.map((group) => {
    // The file that got furthest is the reference: its top-level fields and rows win on conflicts.
    const ordered = [...group].sort((a, b) => lastStep(b) - lastStep(a))
    const lead = ordered[0]
    const seenPos = new Set<string>()
    const nonFinite = ordered
      .flatMap((f) => f.nonFinite)
      .filter((p) => {
        const k = `${p.step}|${p.key}|${p.value}`
        if (seenPos.has(k)) return false
        seenPos.add(k)
        return true
      })
    return {
      name: lead.name,
      files: group.map((f) => f.name),
      top: lead.top,
      train: unionByStep(ordered.map((f) => f.train)),
      evals: unionByStep(ordered.map((f) => f.evals)),
      summary: unionByStep(ordered.map((f) => f.summary)),
      nonFinite,
    }
  })
  return uniqueNames(runs)
}

/** Two runs may come from files with the same name (trainer_state.json): number them so overlays stay readable. */
function uniqueNames(runs: Run[]): Run[] {
  const counts = new Map<string, number>()
  for (const run of runs) counts.set(run.name, (counts.get(run.name) ?? 0) + 1)
  const seen = new Map<string, number>()
  return runs.map((run) => {
    if ((counts.get(run.name) ?? 0) < 2) return run
    const n = (seen.get(run.name) ?? 0) + 1
    seen.set(run.name, n)
    return { ...run, name: `${run.name} (${n})` }
  })
}

/** Number of log entries (train + eval + summary) of a run. */
export function entryCount(run: Run): number {
  return run.train.length + run.evals.length + run.summary.length
}

/** Steps that occur more than once inside the train, eval or summary list (0 after a correct merge). */
export function duplicateSteps(run: Run): number {
  let dups = 0
  for (const list of [run.train, run.evals, run.summary]) {
    dups += list.length - new Set(list.map((r) => r.step)).size
  }
  return dups
}
