import { useEffect, useMemo, useRef, useState } from 'react'
import type uPlot from 'uplot'
import { assignScales, axisLabels, axisSize, flatRange, formatTick, maxAbsFinite } from '../core/axes.ts'
import { buildInputs, progressOf, type XKey } from '../core/chartInputs.ts'
import { buildChartData } from '../core/series.ts'
import type { Run } from '../core/types.ts'
import { t, type Lang } from '../i18n/index.ts'
import { filterVisibleEntries } from '../core/legend.ts'
import { composeChartCanvas, downloadCanvasPng } from './chartPng.ts'
import { COLORS, CSS_DASHES, DASHES } from './colors.ts'

interface Props {
  lang: Lang
  /** Runs to draw (hidden runs already removed) with their colour index in the full list. */
  runs: readonly { run: Run; colorIndex: number }[]
  metrics: readonly string[]
  xKey: XKey
  smoothing: number
  logY: boolean
  /** Steps diagnosed by the rules; drawn as dashed vertical lines on the step and progress axes. */
  markers: readonly { run: Run; step: number }[]
  /** Zoom the x axis around this step (set by clicking a step in the findings table). */
  focusStep: number | null
}

/** uPlot wrapper. uPlot touches `document` when imported, so it is loaded lazily inside the effect. */
export function Chart({ lang, runs, metrics, xKey, smoothing, logY, markers, focusStep }: Props) {
  const host = useRef<HTMLDivElement>(null)
  const plotRef = useRef<uPlot | null>(null)
  const [pngFailed, setPngFailed] = useState(false)

  const prepared = useMemo(() => {
    const inputs = buildInputs(
      runs.map((r) => r.run),
      metrics,
      xKey,
      smoothing,
    )
    const metricOf = inputs.map((input) => input.metric ?? '')
    // Line style: colour from the run, dash from the metric position.
    const styles = inputs.map((input, i) => {
      const runIndex = runs.findIndex((r) => input.label.startsWith(`${r.run.name} · `))
      const metricIndex = metrics.indexOf(metricOf[i])
      return {
        color: COLORS[(runs[Math.max(runIndex, 0)]?.colorIndex ?? 0) % COLORS.length],
        dash: DASHES[Math.max(metricIndex, 0) % DASHES.length],
        cssDash: CSS_DASHES[Math.max(metricIndex, 0) % CSS_DASHES.length],
      }
    })
    // Tiny-scale metrics (learning rate) get their own y axis so they stay visible next to loss.
    // Decided per metric, so loss lines of every run stay together; all-zero lines never open a second axis.
    const scales = assignScales(
      inputs.map((input) => maxAbsFinite(input.ys)),
      metricOf,
    )
    return { inputs, styles, scales, metricOf, data: buildChartData(inputs, 2000) }
  }, [runs, metrics, xKey, smoothing])

  useEffect(() => {
    const el = host.current
    if (!el || prepared.inputs.length === 0) return
    let plot: uPlot | undefined
    let cancelled = false
    const onResize = () => plot?.setSize({ width: el.clientWidth, height: 360 })

    void import('uplot').then(({ default: UPlot }) => {
      if (cancelled) return
      const hasSecondScale = prepared.scales.includes('y2')
      // Axis titles name the metrics on each side whenever a right axis exists (never an anonymous axis).
      const labels = axisLabels(lang, prepared.scales, prepared.metricOf)
      const tickValues = (_u: uPlot, ticks: number[]) => ticks.map(formatTick)
      // Axis width follows the longest tick text, so "4.0e-5" is not cut at the edge.
      const tickSize = (_u: uPlot, values: string[]) => axisSize(values)
      // Linear scales: a flat line (all 0) gets a small band instead of uPlot's 0..100 fallback.
      const yScale: uPlot.Scale = logY
        ? { distr: 3 }
        : {
            range: (_u, min, max) =>
              min == null || max == null ? [min, max] : (flatRange(min, max) ?? UPlot.rangeNum(min, max, 0.1, true)),
          }
      const options: uPlot.Options = {
        width: el.clientWidth || 800,
        height: 360,
        scales: {
          x: { time: false },
          y: yScale,
          ...(hasSecondScale ? { y2: yScale } : {}),
        },
        axes: [
          { label: t(lang, `chart.x.${xKey}`) },
          { values: tickValues, size: tickSize, ...(labels.left ? { label: labels.left } : {}) },
          ...(hasSecondScale
            ? [{ scale: 'y2', side: 1, grid: { show: false }, values: tickValues, size: tickSize, label: labels.right }]
            : []),
        ],
        // The legend marker repeats the line's dash pattern so metrics of one run can be told apart.
        legend: { markers: { dash: (_u: uPlot, seriesIdx: number) => prepared.styles[seriesIdx - 1]?.cssDash ?? 'solid' } },
        series: [
          // The x series label is the legend's first entry (uPlot defaults to the English word "Value").
          { label: t(lang, `chart.x.${xKey}`) },
          ...prepared.inputs.map((input, i) => ({
            label: input.label,
            scale: prepared.scales[i],
            stroke: prepared.styles[i].color,
            dash: prepared.styles[i].dash,
            width: 1.5,
            spanGaps: true,
            points: { show: prepared.data.counts[i] < 60 },
          })),
        ],
        hooks: {
          draw: [
            (u) => {
              if (xKey !== 'step' && xKey !== 'progress') return
              const { ctx, bbox } = u
              ctx.save()
              ctx.setLineDash([4, 4])
              ctx.strokeStyle = 'rgba(100,100,100,0.7)'
              for (const marker of markers) {
                const at = xKey === 'progress' ? progressOf(marker.run, marker.step) : marker.step
                const x = u.valToPos(at, 'x', true)
                if (x < bbox.left || x > bbox.left + bbox.width) continue
                ctx.beginPath()
                ctx.moveTo(x, bbox.top)
                ctx.lineTo(x, bbox.top + bbox.height)
                ctx.stroke()
              }
              ctx.restore()
            },
          ],
        },
      }
      plot = new UPlot(options, [prepared.data.x, ...prepared.data.ys] as uPlot.AlignedData, el)
      plotRef.current = plot
      if (focusStep !== null && xKey === 'step') {
        const xs = prepared.data.x
        const span = Math.max((xs[xs.length - 1] ?? 0) - (xs[0] ?? 0), 1)
        plot.setScale('x', { min: focusStep - span * 0.05, max: focusStep + span * 0.05 })
      }
      window.addEventListener('resize', onResize)
    })

    return () => {
      cancelled = true
      plotRef.current = null
      window.removeEventListener('resize', onResize)
      plot?.destroy()
    }
  }, [prepared, lang, xKey, logY, markers, focusStep])

  // Saves what is on screen now (hidden runs, metrics, smoothing, zoom, markers) plus a drawn legend.
  const downloadPng = async () => {
    const plot = plotRef.current
    if (!plot) return
    try {
      const entries = prepared.inputs.map((input, i) => ({ label: input.label, color: prepared.styles[i].color, dash: prepared.styles[i].dash }))
      const visible = filterVisibleEntries(entries, plot.series.slice(1).map((s) => s.show))
      const canvas = composeChartCanvas(plot.ctx.canvas, visible, window.devicePixelRatio || 1)
      setPngFailed(!(await downloadCanvasPng(canvas)))
    } catch {
      setPngFailed(true)
    }
  }

  return (
    <section className="panel">
      <h2>{t(lang, 'chart.title')}</h2>
      {prepared.inputs.length > 0 ? (
        <p>
          <button type="button" onClick={() => void downloadPng()}>
            {t(lang, 'chart.download.png')}
          </button>{' '}
          {pngFailed ? (
            <span className="muted" role="status">
              {t(lang, 'chart.download.failed')}
            </span>
          ) : null}
        </p>
      ) : null}
      {prepared.inputs.length === 0 ? <p className="muted">{t(lang, 'chart.empty')}</p> : null}
      <div ref={host} className="chart" />
      <p className="muted small">
        {t(lang, 'chart.markers')} {t(lang, 'chart.points')}
      </p>
      {runs.length > 1 ? <p className="note">{t(lang, 'chart.compareNote')}</p> : null}
    </section>
  )
}
