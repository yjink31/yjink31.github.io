import { useState, type CSSProperties } from 'react'
import { Image } from '@/components/Media'
import type { Picture } from '@/content'

/** The cycle action's one label, kept in code like every other control name. */
export const DECK_HINT = 'Next image'

/** How many upcoming cards peek out behind the frame, so a long deck stays calm. */
export const DECK_PEEKS = 2

/**
 * A set of pictures shown in one frame. Pressing the frame advances to the next
 * picture and wraps at the end; the cursor hint and the focus ring carry the
 * affordance, so nothing is drawn over the image. A single picture renders inert,
 * which is why every surface can use this and a block becomes a deck just by
 * listing more entries in its content file.
 *
 * The next cards sit behind the frame with only their edges showing, so the deck
 * reads as a stack there is more to leaf through rather than one picture.
 *
 * Reusable anywhere a `pictures(...)` list is parsed: pass the images and the frame's
 * declared proportions, and the surrounding CSS decides the slot it fills.
 */
export function ImageDeck({ images, width, height, className, loading, fetchPriority }: {
  images: Picture[]
  width: number
  height: number
  className?: string
  loading?: 'eager' | 'lazy'
  fetchPriority?: 'high' | 'low' | 'auto'
}) {
  const [index, setIndex] = useState(0)
  // A content edit could shrink the list under a saved index; clamp rather than blank it.
  const current = images[Math.min(index, images.length - 1)]
  const cycling = images.length > 1
  // The cards after this one, wrapping past the end. Each shows the next picture's own
  // edge, clipped to a sliver, so the stack reads as leafable rather than blank.
  const peeks = cycling
    ? Array.from({ length: Math.min(images.length - 1, DECK_PEEKS) }, (_, offset) => images[(index + offset + 1) % images.length])
    : []
  const position = `Image ${index + 1} of ${images.length}`

  return (
    <div className={`image-deck ${className ?? ''}`} data-deck={images.length}>
      {cycling && (
        <div className="deck-stack" aria-hidden="true">
          {peeks.map((peek, offset) => (
            <div className="deck-card" key={`${offset}-${peek.image}`} style={{ '--deck-depth': offset + 1 } as CSSProperties}>
              <img src={peek.image} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" />
            </div>
          ))}
        </div>
      )}
      {/* A picture that declares its own proportions frames itself, so a set of mixed
          upright and wide photographs is shown whole instead of cropped to one ratio. */}
      <Image src={current.image} alt={current.alt} width={current.width ?? width} height={current.height ?? height} loading={loading} fetchPriority={fetchPriority} />
      {cycling && (
        <>
          {/* The button fills the frame, so hovering anywhere over the picture shows the
              hint and pressing anywhere advances it. */}
          <button type="button" className="deck-hit" data-cursor={DECK_HINT}
            aria-label={`${DECK_HINT} (${index + 1} of ${images.length})`}
            onClick={() => setIndex((value) => (value + 1) % images.length)} />
          <span className="sr-only" aria-live="polite">{position}</span>
        </>
      )}
    </div>
  )
}
