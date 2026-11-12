/** One entry of `log_history`. Values are whatever the Trainer wrote; numbers may be NaN/Infinity. */
export type Row = Record<string, unknown> & { step: number }

export type NonFiniteToken = 'NaN' | 'Infinity' | '-Infinity'

/** Where a non-finite number was found. `step` is null for top-level keys such as `best_metric`. */
export interface NonFinitePosition {
  step: number | null
  key: string
  value: NonFiniteToken
}

export interface ParsedRun {
  /** File name (or any label) the text came from. */
  name: string
  /** Everything except `log_history`. */
  top: Record<string, unknown>
  train: Row[]
  evals: Row[]
  summary: Row[]
  nonFinite: NonFinitePosition[]
}

/** One run after checkpoint files of the same training were merged. */
export interface Run {
  name: string
  files: string[]
  top: Record<string, unknown>
  train: Row[]
  evals: Row[]
  summary: Row[]
  nonFinite: NonFinitePosition[]
}

export type Severity = 'error' | 'warn' | 'info' | 'ok'

export type EvidenceValue = number | string | boolean | null | number[]
export type Evidence = Record<string, EvidenceValue>

export interface Finding {
  /** Stable rule id such as `overfit.eval_rise`; also the i18n key prefix. */
  rule: string
  severity: Severity
  /** Step the finding points at (chart marker), or null. */
  step: number | null
  evidence: Evidence
}

export interface Diagnosis {
  run: Run
  findings: Finding[]
}

export type Lang = 'en' | 'ko'

/** Why a file could not be read; the UI turns the code into a message in the chosen language. */
export type ParseErrorCode = 'invalid_json' | 'no_log_history'

export class TrainerStateParseError extends Error {
  readonly fileName: string
  readonly code: ParseErrorCode
  constructor(fileName: string, code: ParseErrorCode, reason: string, options?: { cause?: unknown }) {
    super(`${fileName}: ${reason}`, options)
    this.name = 'TrainerStateParseError'
    this.fileName = fileName
    this.code = code
  }
}
