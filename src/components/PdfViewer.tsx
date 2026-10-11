import { useEffect, useRef, useState } from 'react'
import type { PDFDocumentLoadingTask } from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

type Status = 'loading' | 'ready' | 'error'

/**
 * A PDF rendered as its own pages, stacked in one scrollable column. The browser's built-in
 * PDF viewer cannot be embedded without its toolbar and thumbnail chrome, so the document is
 * drawn page by page onto canvases instead: `pdfjs-dist` is imported lazily, keeping its
 * weight out of the main bundle, and each page is rasterised at the frame's own width so the
 * text stays crisp. A browser that cannot load or draw the file falls back to a plain link.
 */
export function PdfViewer({ url, label, noun = 'resume' }: { url: string; label: string; noun?: string }) {
  const host = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  const [status, setStatus] = useState<Status>('loading')

  // The frame's width drives the render scale, and it re-renders when the column resizes so
  // a phone and a desktop each get a page drawn for their own width rather than a stretched one.
  useEffect(() => {
    const element = host.current
    if (!element) return
    const measure = () => setWidth(element.clientWidth)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!width) return
    const element = host.current
    if (!element) return
    let cancelled = false
    let task: PDFDocumentLoadingTask | undefined

    const render = async () => {
      try {
        const pdfjs = await import('pdfjs-dist')
        pdfjs.GlobalWorkerOptions.workerSrc = workerUrl
        task = pdfjs.getDocument({ url })
        const pdf = await task.promise
        if (cancelled) return
        const pages = document.createDocumentFragment()
        const ratio = Math.min(window.devicePixelRatio || 1, 2)
        for (let number = 1; number <= pdf.numPages; number++) {
          const page = await pdf.getPage(number)
          if (cancelled) return
          const viewport = page.getViewport({ scale: width / page.getViewport({ scale: 1 }).width })
          const canvas = document.createElement('canvas')
          canvas.className = 'resume-page'
          canvas.setAttribute('aria-hidden', 'true')
          canvas.width = Math.floor(viewport.width * ratio)
          canvas.height = Math.floor(viewport.height * ratio)
          const context = canvas.getContext('2d')
          if (!context) throw new Error(`This browser could not draw the ${noun}.`)
          await page.render({ canvasContext: context, viewport, transform: ratio === 1 ? undefined : [ratio, 0, 0, ratio, 0, 0] }).promise
          if (cancelled) return
          pages.appendChild(canvas)
        }
        if (cancelled) return
        element.replaceChildren(pages)
        setStatus('ready')
      } catch {
        if (!cancelled) setStatus('error')
      }
    }
    render()

    return () => {
      cancelled = true
      void task?.destroy()
    }
  }, [url, width, noun])

  return (
    <div className="resume-viewer">
      <div ref={host} className="resume-viewer-pages" role="img" aria-label={label} />
      {status === 'loading' && <p className="resume-status" role="status">Loading the {noun}…</p>}
      {status === 'error' && <p className="resume-status">This browser cannot show the {noun} here. <a className="text-link" href={url} target="_blank" rel="noreferrer">Open the {noun} <span aria-hidden="true">↗</span><span className="sr-only"> (opens in a new tab)</span></a></p>}
    </div>
  )
}
