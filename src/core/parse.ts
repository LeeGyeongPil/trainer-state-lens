import type { NonFinitePosition, NonFiniteToken, ParsedRun, Row } from './types.ts'
import { TrainerStateParseError } from './types.ts'

const TOKENS: NonFiniteToken[] = ['-Infinity', 'Infinity', 'NaN']

/**
 * Python's json module (and therefore the Hugging Face Trainer) writes NaN / Infinity / -Infinity as
 * bare tokens, which JSON.parse rejects. This replaces those tokens, but only outside string literals,
 * with a marker string that the reviver turns back into the number.
 */
export function toStrictJson(text: string, marker: string): string {
  const parts: string[] = []
  let copiedFrom = 0
  let inString = false
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i)
    if (inString) {
      if (c === 92) i++ // backslash: skip the escaped character
      else if (c === 34) inString = false
      continue
    }
    if (c === 34) {
      inString = true
      continue
    }
    // Only N, I and '-' can start a token: cheap pre-check keeps the scan fast on 3 MB files.
    if (c !== 78 && c !== 73 && c !== 45) continue
    const token = TOKENS.find((t) => text.startsWith(t, i))
    if (!token) continue
    parts.push(text.slice(copiedFrom, i), `"${marker}${token}"`)
    i += token.length - 1
    copiedFrom = i + 1
  }
  if (parts.length === 0) return text
  parts.push(text.slice(copiedFrom))
  return parts.join('')
}

function decodeToken(token: string): number {
  return token === 'NaN' ? NaN : token === 'Infinity' ? Infinity : -Infinity
}

function tokenOf(value: number): NonFiniteToken {
  return Number.isNaN(value) ? 'NaN' : value > 0 ? 'Infinity' : '-Infinity'
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

/**
 * Parse the text of a trainer_state.json file.
 * Throws TrainerStateParseError (with the file name) for broken JSON or a file without `log_history`.
 */
export function parseTrainerState(text: string, name = 'trainer_state.json'): ParsedRun {
  let marker = '__tsl_nonfinite__:'
  while (text.includes(marker)) marker = `_${marker}`
  let raw: unknown
  try {
    raw = JSON.parse(toStrictJson(text, marker), (_key, value) =>
      typeof value === 'string' && value.startsWith(marker) ? decodeToken(value.slice(marker.length)) : value,
    )
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    throw new TrainerStateParseError(
      name,
      'invalid_json',
      `not valid JSON (${reason}). The file may be truncated; re-download it or copy it again.`,
      { cause: error },
    )
  }
  if (!isRecord(raw) || !Array.isArray(raw.log_history)) {
    throw new TrainerStateParseError(
      name,
      'no_log_history',
      'no "log_history" array found. Expected a Hugging Face Trainer trainer_state.json file.',
    )
  }

  const { log_history: history, ...top } = raw
  const nonFinite: NonFinitePosition[] = []
  for (const [key, value] of Object.entries(top)) {
    if (typeof value === 'number' && !Number.isFinite(value)) nonFinite.push({ step: null, key, value: tokenOf(value) })
  }

  const train: Row[] = []
  const evals: Row[] = []
  const summary: Row[] = []
  for (const item of history) {
    if (!isRecord(item) || typeof item.step !== 'number') continue
    const row = item as Row
    for (const [key, value] of Object.entries(row)) {
      if (typeof value === 'number' && !Number.isFinite(value)) {
        nonFinite.push({ step: row.step, key, value: tokenOf(value) })
      }
    }
    if ('train_runtime' in row) summary.push(row)
    else if (Object.keys(row).some((k) => k.startsWith('eval_'))) evals.push(row)
    else train.push(row)
  }
  return { name, top, train, evals, summary, nonFinite }
}
