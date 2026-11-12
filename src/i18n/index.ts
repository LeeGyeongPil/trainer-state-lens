import type { Evidence, EvidenceValue, Finding, Lang } from '../core/types.ts'
import { en, type MessageKey } from './en.ts'
import { ko } from './ko.ts'

export type { Lang, MessageKey }

export const LANGS: readonly Lang[] = ['en', 'ko']
export const messages: Record<Lang, Record<MessageKey, string>> = { en, ko }

/** localStorage key that stores the language the user picked in the menu. */
export const STORAGE_KEY = 'trainer-state-lens.lang'

export function isLang(value: unknown): value is Lang {
  return value === 'en' || value === 'ko'
}

/**
 * Pick the UI language. A saved choice always wins; the browser language is only consulted on the
 * first visit (nothing saved). Anything that is not Korean falls back to English.
 */
export function resolveLang(stored: string | null | undefined, navigatorLang: string | null | undefined): Lang {
  if (isLang(stored)) return stored
  return typeof navigatorLang === 'string' && /^ko(?:$|[-_])/i.test(navigatorLang) ? 'ko' : 'en'
}

/** Minimal slice of the Storage interface, so tests can pass a fake. */
export interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

export function loadLang(storage: StorageLike | null, navigatorLang: string | null | undefined): Lang {
  let stored: string | null = null
  try {
    stored = storage ? storage.getItem(STORAGE_KEY) : null
  } catch {
    stored = null // storage can throw in private mode: act like a first visit
  }
  return resolveLang(stored, navigatorLang)
}

export function saveLang(storage: StorageLike | null, lang: Lang): void {
  try {
    storage?.setItem(STORAGE_KEY, lang)
  } catch {
    // Ignore: the choice then only lasts for this page view.
  }
}

/** Replace `{name}` placeholders. Unknown names stay visible so a missing value is noticed. */
export function format(template: string, params: Record<string, string | number> = {}): string {
  return template.replace(/\{([A-Za-z0-9_]+)\}/g, (whole, name: string) =>
    Object.hasOwn(params, name) ? String(params[name]) : whole,
  )
}

export function t(lang: Lang, key: MessageKey, params: Record<string, string | number> = {}): string {
  return format(messages[lang][key], params)
}

/** Human readable number: integers as is, tiny/huge values in exponent form, otherwise at most 4 decimals. */
export function formatNumber(value: number): string {
  if (Number.isNaN(value)) return 'NaN'
  if (!Number.isFinite(value)) return value > 0 ? 'Infinity' : '-Infinity'
  if (Number.isInteger(value)) return String(value)
  const abs = Math.abs(value)
  if (abs < 0.001 || abs >= 1e6) return value.toExponential(2)
  return String(Number(value.toFixed(4)))
}

function formatEvidenceValue(lang: Lang, value: EvidenceValue): string {
  if (value === null) return '–'
  if (typeof value === 'number') return formatNumber(value)
  if (typeof value === 'boolean') return String(value)
  if (Array.isArray(value)) {
    const shown = value.slice(0, 8).map(formatNumber).join(', ')
    return value.length > 8 ? `${shown}, ...` : shown
  }
  const enumKey = `enum.${value}` as MessageKey
  return Object.hasOwn(messages[lang], enumKey) ? messages[lang][enumKey] : value
}

function evidenceParams(lang: Lang, evidence: Evidence): Record<string, string> {
  const params: Record<string, string> = {}
  for (const [key, value] of Object.entries(evidence)) params[key] = formatEvidenceValue(lang, value)
  return params
}

/** Localised message ("what we see") of a finding. */
export function findingMessage(lang: Lang, finding: Finding): string {
  const base = `finding.${finding.rule}.msg`
  const reason = finding.evidence.reason
  const candidates = [
    typeof reason === 'string' ? `${base}.${reason}` : '',
    `${base}.${finding.severity}`,
    base,
  ] as string[]
  const key = candidates.find((k) => k && Object.hasOwn(messages[lang], k)) as MessageKey | undefined
  if (!key) return finding.rule
  return format(messages[lang][key], evidenceParams(lang, finding.evidence))
}

/** Localised recommendation ("what to check"), empty when the rule has none. */
export function findingAction(lang: Lang, finding: Finding): string {
  if (finding.severity === 'ok') return '' // nothing to do for a clean result
  const key = `finding.${finding.rule}.action` as MessageKey
  return Object.hasOwn(messages[lang], key) ? messages[lang][key] : ''
}

/** Language-neutral evidence text for tables: `key=value; key=value`. */
export function evidenceText(evidence: Evidence): string {
  return Object.entries(evidence)
    .map(([key, value]) => `${key}=${value === null ? '–' : Array.isArray(value) ? `[${value.map(formatNumber).join(' ')}]` : typeof value === 'number' ? formatNumber(value) : String(value)}`)
    .join('; ')
}
