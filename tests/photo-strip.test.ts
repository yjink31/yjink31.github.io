import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { ringOffset, RING_TURN, stepRing } from '../src/lib/photo-strip.ts'

const strip = readFileSync(new URL('../src/components/PhotoStrip.tsx', import.meta.url), 'utf8')
const css = readFileSync(new URL('../src/index.css', import.meta.url), 'utf8')

test('every picture keeps its place on the circle, wrapped the short way', () => {
  // Six pictures, six places:0 is the front, and a picture is never placed more than
  // half a circle away from its front, whichever way is shorter.
  assert.equal(ringOffset(0, 0, 6), 0)
  assert.equal(ringOffset(1, 0, 6), 1)
  assert.equal(ringOffset(5, 0, 6), -1)
  assert.equal(ringOffset(4, 0, 6), -2)
  assert.equal(ringOffset(3, 0, 6), 3)
  // The front can be anywhere; the places follow it.
  assert.equal(ringOffset(0, 2, 6), -2)
  assert.equal(ringOffset(5, 2, 6), 3)
  assert.equal(ringOffset(2, 2, 6), 0)
  // A single picture, or none, is simply the front.
  assert.equal(ringOffset(0, 0, 1), 0)
  assert.equal(ringOffset(0, 0, 0), 0)
})

test('a press turns the ring one place and wraps at both ends', () => {
  assert.equal(stepRing(0, 1, 6), 1)
  assert.equal(stepRing(5, 1, 6), 0)
  assert.equal(stepRing(0, -1, 6), 5)
  assert.equal(stepRing(2, -1, 6), 1)
  // Turning is the same circle every time, so long presses wrap the same way.
  assert.equal(stepRing(0, 8, 6), 2)
  assert.equal(stepRing(0, -8, 6), 4)
  assert.equal(stepRing(0, 1, 0), 0)
  // One place on the circle is RING_TURN degrees, for every picture and every press.
  assert.equal(RING_TURN, 30)
})

test('the strip turns with the arrows at its two ends and announces its place', () => {
  // The two directions are named once, in code like every other control label.
  assert.match(strip, /export const STRIP_PREVIOUS = 'Previous photo'/)
  assert.match(strip, /export const STRIP_NEXT = 'Next photo'/)
  assert.match(strip, /data-cursor=\{STRIP_PREVIOUS\}/)
  assert.match(strip, /data-cursor=\{STRIP_NEXT\}/)
  assert.match(strip, /aria-label=\{STRIP_PREVIOUS\}/)
  assert.match(strip, /aria-label=\{STRIP_NEXT\}/)
  // Pressing wraps at both ends through the one pure step, and the keyboard turns it too.
  assert.match(strip, /stepRing\(value, delta, count\)/)
  assert.match(strip, /event\.key === 'ArrowLeft'/)
  assert.match(strip, /event\.key === 'ArrowRight'/)
  assert.match(strip, /className="sr-only" aria-live="polite"/)
  // Every picture keeps its own proportions rather than being cropped to one shape.
  assert.match(strip, /width=\{photo\.width\} height=\{photo\.height\}/)
  // A single picture stays inert with no arrows at all.
  assert.match(strip, /const turning = count > 1/)
  assert.match(strip, /\{turning && /)
})

test('the pictures sit on one circle that turns by place, with a seam that is never seen', () => {
  // The ring is three-dimensional: each picture rotates onto its place and reaches for
  // the circle's radius, and one press moves every place by RING_TURN.
  assert.match(css, /transform: translate\(-50%, -50%\) rotateY\(var\(--photo-angle, 0deg\)\) translateZ\(var\(--photo-radius\)\);/)
  assert.match(css, /\.photo-ring \{ position: relative; flex: 1; height: clamp\(320px, 44vw, 480px\); perspective: 1500px; overflow: hidden; \}/)
  assert.match(strip, /'--photo-angle': `\$\{offset \* RING_TURN\}deg`/)
  // The turn itself is one smooth rotation; the place where the ring wraps hides the
  // picture by place with no transition at all, so nothing is ever seen swinging across
  // the ring between the two ends.
  assert.match(css, /\.photo-card \{[^}]*transition: transform 700ms var\(--ease-out-expo\); \}/)
  assert.doesNotMatch(css, /\.photo-card \{[^}]*opacity/)
  assert.match(css, /\.photo-card\[aria-hidden='true'\] \{ opacity: 0; visibility: hidden; \}/)
  assert.match(strip, /aria-hidden=\{distance > STRIP_REACH \|\| undefined\}/)
  // The strip is content on the content layer: the background never sits over a picture.
  assert.doesNotMatch(css, /\.photo-card[^}]*mix-blend-mode|\.photo-card[^}]*backdrop-filter/)
})
