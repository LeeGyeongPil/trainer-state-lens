import { readdirSync, readFileSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const SRC = fileURLToPath(new URL('../src/', import.meta.url))

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = `${dir}${name}`
    return statSync(path).isDirectory() ? sourceFiles(`${path}/`) : [path]
  })
}

describe('files never leave the browser (AC-10)', () => {
  const files = sourceFiles(SRC).filter((f) => /\.(ts|tsx)$/.test(f))

  it('scans a meaningful number of source files', () => {
    expect(files.length).toBeGreaterThan(15)
  })

  it('has no network API in src/', () => {
    const forbidden = /\bfetch\s*\(|XMLHttpRequest|WebSocket|sendBeacon|EventSource|navigator\.sendBeacon/
    for (const file of files) {
      expect(readFileSync(file, 'utf8'), file).not.toMatch(forbidden)
    }
  })

  it('does not load remote scripts or styles from index.html', () => {
    const html = readFileSync(fileURLToPath(new URL('../index.html', import.meta.url)), 'utf8')
    expect(html).not.toMatch(/(?:src|href)=["']https?:/)
  })
})
