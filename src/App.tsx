import { useCallback, useEffect, useMemo, useState } from 'react'
import { Chart } from './components/Chart.tsx'
import { DropZone } from './components/DropZone.tsx'
import { ExportPanel } from './components/ExportPanel.tsx'
import { Findings } from './components/Findings.tsx'
import { LangMenu } from './components/LangMenu.tsx'
import { RunList } from './components/RunList.tsx'
import { availableMetrics, defaultXKey, hasXKey, type XKey } from './core/chartInputs.ts'
import { mergeRuns } from './core/merge.ts'
import { parseTrainerState } from './core/parse.ts'
import { diagnoseAll } from './core/rules/index.ts'
import { TrainerStateParseError, type ParseErrorCode, type ParsedRun } from './core/types.ts'
import { SAMPLES, loadSampleText } from './samples/index.ts'
import { isLang, loadLang, saveLang, t, type Lang } from './i18n/index.ts'

interface Props {
  /** Fixes the language (used by tests and server rendering); otherwise saved choice, then browser language. */
  initialLang?: Lang
}

interface ParseFailure {
  id: number
  file: string
  /** Reason code; the text is looked up in the chosen language when drawn. */
  code: ParseErrorCode | 'unknown'
  /** Raw error text, shown only for unexpected failures. */
  detail: string
}

function browserStorage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage
  } catch {
    return null
  }
}

/**
 * First language: `?lang=ko|en` in the address (handy for screenshots) > saved choice > browser language.
 * The query is not saved, only a choice made in the menu is.
 */
function initialLanguage(): Lang {
  if (typeof window === 'undefined') return 'en'
  const fromQuery = new URLSearchParams(window.location.search).get('lang')
  if (isLang(fromQuery)) return fromQuery
  return loadLang(browserStorage(), window.navigator.language)
}

export default function App({ initialLang }: Props) {
  const [lang, setLang] = useState<Lang>(() => initialLang ?? initialLanguage())
  const [files, setFiles] = useState<ParsedRun[]>([])
  const [failures, setFailures] = useState<ParseFailure[]>([])
  const [hidden, setHidden] = useState<ReadonlySet<string>>(new Set())
  const [metrics, setMetrics] = useState<string[]>(['loss', 'eval_loss'])
  // null = automatic (step, or % progress when the runs differ a lot in length); a menu choice overrides it.
  const [xChoice, setXChoice] = useState<XKey | null>(null)
  const [smoothing, setSmoothing] = useState(0)
  const [logY, setLogY] = useState(false)
  const [focusStep, setFocusStep] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)

  const changeLang = (next: Lang) => {
    setLang(next)
    saveLang(browserStorage(), next)
  }

  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  const addText = useCallback((name: string, text: string) => {
    try {
      const parsed = parseTrainerState(text, name)
      setFiles((prev) => [...prev, parsed])
    } catch (error) {
      const known = error instanceof TrainerStateParseError
      const failure: ParseFailure = {
        id: Date.now() + Math.random(),
        file: name,
        code: known ? error.code : 'unknown',
        detail: known ? '' : String(error),
      }
      setFailures((prev) => [...prev, failure])
    }
  }, [])

  const onFiles = useCallback(
    async (picked: File[]) => {
      for (const file of picked) addText(file.name, await file.text())
    },
    [addText],
  )

  const onSamples = useCallback(
    async (ids: string[]) => {
      setBusy(true)
      try {
        for (const id of ids) addText(`${id}.json`, await loadSampleText(id))
      } finally {
        setBusy(false)
      }
    },
    [addText],
  )

  // `?samples=starter` or `?samples=tiny-sft,zephyr-7b-beta` loads samples on open (README screenshots, demos).
  useEffect(() => {
    const wanted = new URLSearchParams(window.location.search).get('samples')
    if (!wanted) return
    const known = new Set(SAMPLES.map((s) => s.id))
    const ids = wanted === 'starter' ? SAMPLES.filter((s) => s.starter).map((s) => s.id) : wanted.split(',').filter((id) => known.has(id))
    // Deferred one tick: loading is async work started by the address, not a state sync inside the effect.
    void Promise.resolve(ids).then(onSamples)
  }, [onSamples])

  const runs = useMemo(() => mergeRuns(files), [files])
  const diagnoses = useMemo(() => diagnoseAll(runs), [runs])
  const metricChoices = useMemo(() => availableMetrics(runs), [runs])
  const visible = useMemo(
    () => runs.map((run, colorIndex) => ({ run, colorIndex })).filter((r) => !hidden.has(r.run.name)),
    [runs, hidden],
  )
  const markers = useMemo(
    () =>
      diagnoses
        .filter(({ run }) => !hidden.has(run.name))
        .flatMap(({ run, findings }) =>
          findings.filter((f) => f.severity !== 'ok' && f.step !== null).map((f) => ({ run, step: f.step as number })),
        ),
    [diagnoses, hidden],
  )
  const xKey = xChoice ?? defaultXKey(visible.map((r) => r.run))
  // Keep only metrics the loaded files have; if none is left (e.g. a file without loss), show the first available one.
  const shownMetrics = useMemo(() => {
    const present = metrics.filter((key) => metricChoices.includes(key))
    return present.length > 0 ? present : metricChoices.slice(0, 1)
  }, [metrics, metricChoices])
  const xChoices = (['step', 'progress', 'epoch', 'num_tokens'] as const).filter(
    (key) => key === 'step' || key === 'progress' || hasXKey(runs, key),
  )

  const toggleRun = (name: string) =>
    setHidden((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  const toggleMetric = (key: string) =>
    setMetrics((prev) => (prev.includes(key) ? prev.filter((m) => m !== key) : [...prev, key]))

  return (
    <main>
      <header className="top">
        <div>
          <h1>{t(lang, 'app.title')}</h1>
          <p className="muted">{t(lang, 'app.tagline')}</p>
        </div>
        <LangMenu lang={lang} onChange={changeLang} />
      </header>

      <DropZone
        lang={lang}
        busy={busy}
        onFiles={(picked) => void onFiles(picked)}
        onSamples={(ids) => void onSamples(ids)}
        onClear={() => {
          setFiles([])
          setFailures([])
          setHidden(new Set())
          setFocusStep(null)
        }}
      />

      {failures.map((failure) => (
        <div key={failure.id} className="error-card" role="alert">
          <strong>{t(lang, 'runs.parseError', { file: failure.file })}</strong>
          <div>{failure.code === 'unknown' ? failure.detail : t(lang, `runs.parseError.${failure.code}`)}</div>
          <button type="button" className="ghost" onClick={() => setFailures((prev) => prev.filter((f) => f.id !== failure.id))}>
            {t(lang, 'runs.dismiss')}
          </button>
        </div>
      ))}

      <section className="panel">
        <h2>{t(lang, 'runs.title')}</h2>
        <RunList lang={lang} diagnoses={diagnoses} hidden={hidden} onToggle={toggleRun} />
      </section>

      {runs.length > 0 ? (
        <>
          <section className="panel controls">
            <div>
              <strong>{t(lang, 'chart.metrics')}</strong>{' '}
              {metricChoices.map((key) => (
                <label key={key} className="chip">
                  <input type="checkbox" checked={shownMetrics.includes(key)} onChange={() => toggleMetric(key)} /> {key}
                </label>
              ))}
            </div>
            <div className="row">
              <label>
                {t(lang, 'chart.xaxis')}{' '}
                <select value={xKey} onChange={(event) => setXChoice(event.target.value as XKey)}>
                  {xChoices.map((key) => (
                    <option key={key} value={key}>
                      {t(lang, `chart.x.${key}`)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {t(lang, 'chart.smooth')}{' '}
                <input type="range" min={0} max={0.95} step={0.05} value={smoothing} onChange={(event) => setSmoothing(Number(event.target.value))} />
              </label>
              <label>
                <input type="checkbox" checked={logY} onChange={(event) => setLogY(event.target.checked)} /> {t(lang, 'chart.logy')}
              </label>
            </div>
          </section>
          <Chart lang={lang} runs={visible} metrics={shownMetrics} xKey={xKey} smoothing={smoothing} logY={logY} markers={markers} focusStep={focusStep} />
          <Findings lang={lang} diagnoses={diagnoses} onFocus={setFocusStep} />
          <ExportPanel lang={lang} diagnoses={diagnoses} />
        </>
      ) : null}
    </main>
  )
}
