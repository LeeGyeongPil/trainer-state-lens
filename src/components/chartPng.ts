import { layoutLegend, type LegendEntry } from '../core/legend.ts'

/** Fixed file name of the downloaded chart. */
export const PNG_FILE_NAME = 'training-curves.png'

const FONT = '13px system-ui, sans-serif'

/**
 * Copies the uPlot canvas onto a white canvas and draws the legend below it.
 * The uPlot canvas already carries the axis titles; the legend is DOM in uPlot, so it is drawn here.
 * `pxRatio` is the canvas pixel ratio (devicePixelRatio) so the picture stays sharp.
 */
export function composeChartCanvas(source: HTMLCanvasElement, entries: readonly LegendEntry[], pxRatio: number): HTMLCanvasElement {
  const cssWidth = source.width / pxRatio
  const cssHeight = source.height / pxRatio
  const out = document.createElement('canvas')
  const ctx = out.getContext('2d')
  if (!ctx) throw new Error('2d canvas is not available')
  ctx.font = FONT
  const layout = layoutLegend(entries, cssWidth, (text) => ctx.measureText(text).width)
  out.width = source.width
  out.height = Math.ceil((cssHeight + layout.height) * pxRatio)
  // Resizing resets the context state, so set it up again.
  ctx.scale(pxRatio, pxRatio)
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, cssWidth, cssHeight + layout.height)
  ctx.drawImage(source, 0, 0, cssWidth, cssHeight)
  ctx.font = FONT
  ctx.textBaseline = 'middle'
  for (const item of layout.items) {
    const y = cssHeight + item.y
    ctx.strokeStyle = item.color
    ctx.lineWidth = 2
    ctx.setLineDash([...item.dash])
    ctx.beginPath()
    ctx.moveTo(item.x, y)
    ctx.lineTo(item.x + item.sample, y)
    ctx.stroke()
    ctx.setLineDash([])
    ctx.fillStyle = '#0f172a'
    ctx.fillText(item.label, item.textX, y)
  }
  return out
}

/** Saves a canvas as a PNG download (same Blob + object URL + a[download] approach as the text export). */
export function downloadCanvasPng(canvas: HTMLCanvasElement): Promise<boolean> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (!blob) return resolve(false)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = PNG_FILE_NAME
      link.click()
      URL.revokeObjectURL(url)
      resolve(true)
    }, 'image/png')
  })
}
