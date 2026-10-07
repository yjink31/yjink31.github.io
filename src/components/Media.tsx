import { useEffect, useRef, useState, type CSSProperties, type ImgHTMLAttributes } from 'react'
import { artImage, type Artwork } from '@/content'
import { useModalDialog } from '@/components/useModalDialog'

/** `workSlug` tags the image for the selected-work transition; `linked` marks an image
 *  that sits inside a link, so a failure explains itself instead of offering Retry. */
type ImageProps = ImgHTMLAttributes<HTMLImageElement> & { workSlug?: string; linked?: boolean }

export function Image({ className = '', alt, style, workSlug, linked = false, ...props }: ImageProps) {
  const source = `${props.src ?? ''}|${props.srcSet ?? ''}`
  const [result, setResult] = useState<{ source: string; status: 'loaded' | 'error' } | null>(null)
  const [attempt, setAttempt] = useState(0)
  const image = useRef<HTMLImageElement>(null)
  const status = result?.source === source ? result.status : 'loading'

  useEffect(() => {
    if (image.current?.complete && image.current.naturalWidth > 0) setResult({ source, status: 'loaded' })
  }, [source, attempt])

  const retry = () => {
    setResult(null)
    setAttempt((value) => value + 1)
  }

  return (
    <div data-work-image={workSlug} className={`image-frame ${className} ${status}`} style={{ '--image-ratio': props.width && props.height ? `${props.width} / ${props.height}` : undefined, ...style } as CSSProperties}>
      {status !== 'error' ? (
        <img referrerPolicy="no-referrer" {...props} key={`${source}-${attempt}`} ref={image} alt={alt} decoding="async" onLoad={(event) => {
          if (!workSlug && !document.documentElement.dataset.transition) event.currentTarget.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 650, easing: 'ease-out' })
          setResult({ source, status: 'loaded' })
          props.onLoad?.(event)
        }} onError={(event) => {
          setResult({ source, status: 'error' })
          props.onError?.(event)
        }} />
      ) : (
        <div className="image-error" role="status">
          <span>Image unavailable</span>
          {linked ? <span>Open the work for details.</span> : (
            <button type="button" className="text-link" onClick={retry}>Retry <span aria-hidden="true">↗</span></button>
          )}
        </div>
      )}
    </div>
  )
}

export function Inspector({ work, onClose }: { work: Artwork; onClose: () => void }) {
  const { ref, dialogProps } = useModalDialog(onClose)
  const viewport = useRef<HTMLDivElement>(null)
  const [zoom, setZoom] = useState(1)

  return (
    <dialog ref={ref} className="inspector" {...dialogProps} aria-labelledby="inspector-title">
      <div className="inspector-toolbar">
        <div><h2 id="inspector-title">{work.title}</h2><p>{work.artist}, {work.year}</p></div>
        <div className="inspector-actions">
          <button aria-label="Zoom out" disabled={zoom === 1} onClick={() => setZoom((value) => Math.max(1, value - 0.5))}>−</button>
          <output aria-live="polite" aria-label="Zoom level">{zoom * 100}%</output>
          <button aria-label="Zoom in" disabled={zoom === 3} onClick={() => setZoom((value) => Math.min(3, value + 0.5))}>+</button>
          <button className="text-link" onClick={onClose} autoFocus>Close <span aria-hidden="true">×</span></button>
        </div>
      </div>
      <div ref={viewport} className="inspector-viewport" tabIndex={0} role="region" aria-label="Artwork image. Use arrow keys to pan when zoomed." onKeyDown={(event) => {
        const movement: Record<string, [number, number]> = { ArrowLeft: [-100, 0], ArrowRight: [100, 0], ArrowUp: [0, -100], ArrowDown: [0, 100] }
        if (movement[event.key]) {
          event.preventDefault()
          const [left, top] = movement[event.key]
          viewport.current?.scrollBy({ left, top, behavior: 'instant' })
        }
      }}>
        <div className="inspector-image" style={{ '--zoom': zoom } as CSSProperties}>
          <Image src={artImage(work, 2400)} alt={work.alt} width={work.width} height={work.height} />
        </div>
      </div>
      <p className="inspector-hint">Zoom to inspect; use arrow keys to move.</p>
    </dialog>
  )
}
