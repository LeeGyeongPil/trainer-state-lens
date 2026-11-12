import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { mergeRuns } from '../src/core/merge.ts'
import { parseTrainerState } from '../src/core/parse.ts'
import { diagnose } from '../src/core/rules/index.ts'
import type { Finding, ParsedRun, Run } from '../src/core/types.ts'

const SAMPLES = fileURLToPath(new URL('../samples/', import.meta.url))

export function samplePath(id: string): string {
  return `${SAMPLES}${id}.json`
}

export function sampleText(id: string): string {
  return readFileSync(samplePath(id), 'utf8')
}

export function loadParsed(id: string): ParsedRun {
  return parseTrainerState(sampleText(id), `${id}.json`)
}

/** Parse samples and merge them into runs. */
export function loadRuns(...ids: string[]): Run[] {
  return mergeRuns(ids.map(loadParsed))
}

export function loadRun(id: string): Run {
  return loadRuns(id)[0]
}

export function findingsOf(id: string): Finding[] {
  return diagnose(loadRun(id))
}

export function byRule(findings: readonly Finding[], rule: string): Finding | undefined {
  return findings.find((f) => f.rule === rule)
}
