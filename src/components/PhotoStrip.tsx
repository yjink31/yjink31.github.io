import { useState, type CSSProperties } from 'react'
import type { Picture } from '@/content'
import { ringOffset, RING_TURN, stepRing } from '@/lib/photo-strip'

/** The two directions' own names, kept in code like every other control label. */
export const STRIP_PREVIOUS = 'Previous photo'
export const STRIP_NEXT = 'Next photo'

/** How many places from the front a picture is still drawn; past it, the ring hides it. */
export const STRIP_REACH = 2

/**
 * The photographs as one ring: every picture keeps a place on a circle in three
 * dimensions, the front one facing the reader and the rest curving away to both
 * sides, so the strip reads as a circle seen from its edge. The arrows at the two
 * ends turn the ring one place at a time and wrap at both ends, so the strip never
 * runs out in either direction.
 *
 * Each picture keeps its own proportions, so a mixed set of upright and wide
 * photographs is shown whole rather than cropped to one shape. A single picture
 * renders inert with no arrows, which is why any `photos` list can be a strip.
 */
export function PhotoStrip({ images, className }: {
  images: Picture[]
  className?: string
}) {
  const [index, setIndex] = useState(0)
  const count = images.length
  // A content edit could shrink the list under a saved index; clamp rather than blank it.
  const front = Math.min(index, count - 1)
  const turning = count > 1
  const turn = (delta: number) => setIndex((value) => stepRing(value, delta, count))
  const position = `Photo ${front + 1} of ${count}`

  return (
    <div className={`photo-strip ${className ?? ''}`} data-strip={count}>
      {turning && (
        <button type="button" className="button button-quiet strip-arrow" data-magnetic data-cursor={STRIP_PREVIOUS}
          aria-label={STRIP_PREVIOUS} onClick={() => turn(-1)}><span aria-hidden="true">←</span></button>
      )}
      <div className="photo-ring" role="group" tabIndex={turning ? 0 : -1}
        aria-label="Photograph strip. Use the arrow keys to turn it."
        onKeyDown={(event) => {
          if (event.key === 'ArrowLeft') { event.preventDefault(); turn(-1) }
          if (event.key === 'ArrowRight') { event.preventDefault(); turn(1) }
        }}>
        {images.map((photo, place) => {
          const offset = ringOffset(place, front, count)
          const distance = Math.abs(offset)
          // The place on the circle is the picture's own: a press moves every place one
          // step, which is the ring turning. Past the reach the ring hides the picture,
          // so the wrap between the two ends can never be seen swinging across it.
          return (
            <div className="photo-card" key={photo.image} data-distance={distance}
              aria-hidden={distance > STRIP_REACH || undefined}
              style={{ '--photo-angle': `${offset * RING_TURN}deg` } as CSSProperties}>
              <img src={photo.image} alt={photo.alt} loading="lazy" decoding="async" referrerPolicy="no-referrer"
                width={photo.width} height={photo.height} />
            </div>
          )
        })}
      </div>
      {turning && (
        <button type="button" className="button button-quiet strip-arrow" data-magnetic data-cursor={STRIP_NEXT}
          aria-label={STRIP_NEXT} onClick={() => turn(1)}><span aria-hidden="true">→</span></button>
      )}
      {turning && <span className="sr-only" aria-live="polite">{position}</span>}
    </div>
  )
}
