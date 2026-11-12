import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { DropZone } from '../src/components/DropZone.tsx'
import { ExportPanel } from '../src/components/ExportPanel.tsx'
import { Findings } from '../src/components/Findings.tsx'
import { RunList } from '../src/components/RunList.tsx'
import { diagnoseAll } from '../src/core/rules/index.ts'
import { loadRuns } from './helpers.ts'

const diagnoses = diagnoseAll(loadRuns('tiny-sft', 'synthetic-nan-broken'))
const noop = () => {}

describe('components render without a browser', () => {
  it('Findings shows the message, severity and evidence in the chosen language', () => {
    const en = renderToString(createElement(Findings, { lang: 'en', diagnoses, onFocus: noop }))
    const ko = renderToString(createElement(Findings, { lang: 'ko', diagnoses, onFocus: noop }))
    expect(en).toContain('Broken run')
    expect(en).toContain('overfit.eval_rise')
    expect(en).toContain('evalMinStep=30')
    expect(ko).toContain('고장난 실행')
    expect(ko).toContain('심각도')
    expect(ko).toContain('evalMinStep=30')
  })

  it('RunList shows status badges and file counts', () => {
    const html = renderToString(createElement(RunList, { lang: 'en', diagnoses, hidden: new Set<string>(), onToggle: noop }))
    expect(html).toContain('tiny-sft.json')
    expect(html).toContain('badge-error')
    expect(html).toContain('1 file(s)')
  })

  it('DropZone labels the practice samples as such and shows each source and license', () => {
    const html = renderToString(
      createElement(DropZone, { lang: 'en', busy: false, onFiles: noop, onSamples: noop, onClear: noop }),
    )
    expect(html).toContain('Practice samples')
    expect(html).toContain('synthetic')
    expect(html).toContain('Hub file')
    expect(html).toContain('Apache-2.0')
    expect(html).toContain('Nothing is uploaded')
  })

  it('ExportPanel previews the Markdown in the chosen language', () => {
    const ko = renderToString(createElement(ExportPanel, { lang: 'ko', diagnoses }))
    expect(ko).toContain('내보내기')
    expect(ko).toContain('학습 실행 진단')
    expect(ko).toContain('주의 (warn)')
  })
})
