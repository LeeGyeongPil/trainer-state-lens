import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import App from '../src/App.tsx'
import { diagnose } from '../src/core/rules/index.ts'
import {
  STORAGE_KEY,
  findingAction,
  findingMessage,
  format,
  loadLang,
  messages,
  resolveLang,
  saveLang,
  t,
  type StorageLike,
} from '../src/i18n/index.ts'
import { loadRuns } from './helpers.ts'

function fakeStorage(initial: Record<string, string> = {}): StorageLike & { data: Record<string, string> } {
  const data = { ...initial }
  return {
    data,
    getItem: (key) => (key in data ? data[key] : null),
    setItem: (key, value) => {
      data[key] = value
    },
  }
}

const PLACEHOLDER = /\{([A-Za-z0-9_]+)\}/g
function placeholders(text: string): string[] {
  return [...text.matchAll(PLACEHOLDER)].map((m) => m[1]).sort()
}

describe('English / Korean UI (AC-9)', () => {
  it('has identical message keys in en and ko', () => {
    expect(Object.keys(messages.ko).sort()).toEqual(Object.keys(messages.en).sort())
  })

  it('uses the same placeholders in both languages and leaves no message empty', () => {
    for (const key of Object.keys(messages.en) as (keyof typeof messages.en)[]) {
      expect(placeholders(messages.ko[key]), key).toEqual(placeholders(messages.en[key]))
      expect(messages.ko[key].trim().length, key).toBeGreaterThan(0)
    }
  })

  it('never puts a Korean particle right behind a placeholder (it would be wrong for some values)', () => {
    // 은/는/이/가/을/를/과/와/의/에/로/도/만 directly after "}" -- a linear scan, no nested quantifiers.
    const bad = /\}(?:은|는|이|가|을|를|과|와|의|에|로|도|만|으로|에서|부터|까지)/
    for (const [key, text] of Object.entries(messages.ko)) expect(text, key).not.toMatch(bad)
  })

  it('keeps Korean text out of the English table', () => {
    for (const [key, text] of Object.entries(messages.en)) {
      if (key === 'lang.ko') continue
      expect(text, key).not.toMatch(/[가-힣]/)
    }
  })

  it('resolves the language: saved choice wins, detection only on first run', () => {
    expect(resolveLang(null, 'ko-KR')).toBe('ko')
    expect(resolveLang(null, 'ko')).toBe('ko')
    expect(resolveLang(null, 'fr-FR')).toBe('en')
    expect(resolveLang(null, undefined)).toBe('en')
    expect(resolveLang('en', 'ko-KR')).toBe('en')
    expect(resolveLang('ko', 'en-US')).toBe('ko')
    expect(resolveLang('zz', 'ko-KR')).toBe('ko') // an invalid saved value counts as "nothing saved"
  })

  it('saves the chosen language under the documented localStorage key', () => {
    const storage = fakeStorage()
    expect(STORAGE_KEY).toBe('trainer-state-lens.lang')
    expect(loadLang(storage, 'ko-KR')).toBe('ko') // first visit: detected, not saved
    expect(storage.data).toEqual({})
    saveLang(storage, 'en')
    expect(storage.data['trainer-state-lens.lang']).toBe('en')
    expect(loadLang(storage, 'ko-KR')).toBe('en')
  })

  it('survives a storage that throws (private mode)', () => {
    const broken: StorageLike = {
      getItem: () => {
        throw new Error('denied')
      },
      setItem: () => {
        throw new Error('denied')
      },
    }
    expect(loadLang(broken, 'ko-KR')).toBe('ko')
    expect(() => saveLang(broken, 'ko')).not.toThrow()
    expect(loadLang(null, 'fr')).toBe('en')
  })

  it('renders the title, menu and tagline in Korean or English', () => {
    const ko = renderToString(createElement(App, { initialLang: 'ko' }))
    const en = renderToString(createElement(App, { initialLang: 'en' }))
    expect(ko).toContain('언어') // menu label
    expect(ko).toContain('끌어놓으세요')
    expect(ko).toContain('샘플 실행 불러오기')
    expect(en).toContain('Language')
    expect(en).toContain('Drop trainer_state.json files here')
    expect(en).toContain('Load sample runs')
    expect(en).not.toMatch(/끌어놓으세요/)
    expect(ko).not.toContain('Drop trainer_state.json files here')
    // both languages stay selectable from either screen
    expect(ko).toContain('English')
    expect(ko).toContain('한국어')
    expect(en).toContain('한국어')
  })

  it('format keeps unknown placeholders visible', () => {
    expect(format('a {x} {y}', { x: 1 })).toBe('a 1 {y}')
    expect(t('en', 'runs.files', { count: 3 })).toBe('3 file(s)')
    expect(t('ko', 'runs.files', { count: 3 })).toBe('파일 3개')
  })

  it('writes a complete message for every finding the samples produce, in both languages', () => {
    const runs = loadRuns(
      'tiny-sft', 'tiny-dpo', 'tiny-grpo', 'zephyr-7b-beta', 'mistral-7b-sft-beta', 'smollm2-1.7b-instruct',
      'openr1-distill-7b', 'synthetic-nan-broken', 'synthetic-eval-nan', 'synthetic-infinity-best',
      'synthetic-flat-jitter', 'synthetic-diverge', 'synthetic-grpo-stall',
    )
    let checked = 0
    for (const run of runs) {
      for (const finding of diagnose(run)) {
        for (const lang of ['en', 'ko'] as const) {
          const message = findingMessage(lang, finding)
          expect(message, `${run.name} ${finding.rule}`).not.toMatch(/\{[A-Za-z0-9_]+\}/)
          expect(message).not.toBe(finding.rule)
          if (finding.severity !== 'ok') expect(findingAction(lang, finding).length).toBeGreaterThan(0)
        }
        checked++
      }
    }
    expect(checked).toBeGreaterThan(20)
  })
})
