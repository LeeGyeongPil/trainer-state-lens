import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { messages } from '../src/i18n/index.ts'
import { SAMPLES } from '../src/samples/index.ts'
import { loadParsed, samplePath } from './helpers.ts'

const ROOT = fileURLToPath(new URL('../', import.meta.url))

describe('practice samples (AC-10)', () => {
  it('lists every file in samples/ and nothing else', () => {
    const files = readdirSync(`${ROOT}samples`).filter((f) => f.endsWith('.json')).map((f) => f.replace(/\.json$/, ''))
    expect(SAMPLES.map((s) => s.id).sort()).toEqual(files.sort())
  })

  it.each(SAMPLES.map((s) => [s.id, s] as const))('%s parses and carries a source label and license', (id, sample) => {
    expect(existsSync(samplePath(id))).toBe(true)
    const run = loadParsed(id)
    expect(run.train.length).toBeGreaterThan(0)
    expect(['own', 'hub', 'synthetic']).toContain(sample.source)
    expect(sample.license.length).toBeGreaterThan(0)
    if (sample.source === 'hub') expect(sample.url).toMatch(/^https:\/\/huggingface\.co\//)
    if (sample.source === 'synthetic') expect(id.startsWith('synthetic-')).toBe(true)
    // every sample has a description in both languages
    expect(Object.hasOwn(messages.en, `samples.sample.${id}`)).toBe(true)
    expect(Object.hasOwn(messages.ko, `samples.sample.${id}`)).toBe(true)
  })

  it('has at least one starter sample per source kind', () => {
    for (const source of ['own', 'hub', 'synthetic'] as const) {
      expect(SAMPLES.some((s) => s.source === source && s.starter), source).toBe(true)
    }
  })

  it('documents every Hub file and its license in samples/SOURCES.md', () => {
    const doc = readFileSync(`${ROOT}samples/SOURCES.md`, 'utf8')
    for (const sample of SAMPLES.filter((s) => s.source === 'hub')) {
      expect(doc, sample.id).toContain(sample.url)
      expect(doc, sample.id).toContain(sample.license)
    }
  })

  it('contains no local paths or user names', () => {
    for (const sample of SAMPLES) {
      const text = readFileSync(samplePath(sample.id), 'utf8')
      expect(text, sample.id).not.toMatch(/\/Users\/|\/home\/|C:\\\\Users/)
    }
  })
})
