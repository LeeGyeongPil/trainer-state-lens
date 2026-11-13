import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (path: string): string => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')
const pkg = JSON.parse(read('package.json')) as { version: string }
const lock = JSON.parse(read('package-lock.json')) as { version: string; packages: Record<string, { version: string }> }
const changelog = read('CHANGELOG.md')
const headings = [...changelog.matchAll(/^## \[(\d+\.\d+\.\d+)\] - (\d{4}-\d{2}-\d{2})$/gm)]
const versions = headings.map((m) => m[1])

const cmp = (a: string, b: string): number => {
  const [x, y] = [a.split('.').map(Number), b.split('.').map(Number)]
  return x[0] - y[0] || x[1] - y[1] || x[2] - y[2]
}

describe('release alignment (AC-10)', () => {
  it('package.json and package-lock.json carry the same version', () => {
    expect(pkg.version).toMatch(/^\d+\.\d+\.\d+$/)
    expect(lock.version).toBe(pkg.version)
    expect(lock.packages[''].version).toBe(pkg.version)
  })

  it('the first CHANGELOG entry is the package version with a date', () => {
    expect(versions[0]).toBe(pkg.version)
  })

  it('CHANGELOG versions are unique, descending and keep 0.1.3, 0.1.2, 0.1.1, 0.1.0', () => {
    expect(new Set(versions).size).toBe(versions.length)
    expect([...versions].sort((a, b) => cmp(b, a))).toEqual(versions)
    for (const v of ['0.1.3', '0.1.2', '0.1.1', '0.1.0']) expect(versions).toContain(v)
  })

  it('README mentions of a version equal the package version', () => {
    for (const file of ['README.md', 'README.ko.md']) {
      const text = read(file)
      const mentions = [...text.matchAll(/\bv(\d+\.\d+\.\d+)\b|trainer-state-lens@(\d+\.\d+\.\d+)/g)].map((m) => m[1] ?? m[2])
      for (const m of mentions) expect(m, file).toBe(pkg.version)
    }
  })

  it('keeps the security fix: the sample helper project is named make-samples', () => {
    expect(read('tools/make-samples/pyproject.toml')).toMatch(/^name = "make-samples"$/m)
  })
})
