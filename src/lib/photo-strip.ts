/**
 * The photograph strip's ring geometry: where each picture sits around the one
 * circle the strip turns on, and how a press turns it. Pure numbers, so the
 * rotation is tested without a browser.
 */

/** How far one press turns the ring, in degrees: one place on the circle. */
export const RING_TURN = 30

/**
 * The signed number of places `index` sits from the front, wrapping the short way
 * around the circle: `0` is the front picture, positive turns one way, negative
 * the other, so a picture is never more than half a ring from its place.
 */
export function ringOffset(index: number, current: number, count: number): number {
  if (!Number.isInteger(count) || count <= 1) return 0
  const around = (((index - current) % count) + count) % count
  return around > count / 2 ? around - count : around
}

/** The front photograph after `delta` presses, wrapping at both ends. */
export function stepRing(current: number, delta: number, count: number): number {
  if (!Number.isInteger(count) || count <= 0) return 0
  return (((current + delta) % count) + count) % count
}
