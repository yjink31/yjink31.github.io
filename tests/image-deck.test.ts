import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { deck, pictures } from '../src/lib/content-schema.ts'
import { parseSite } from '../src/lib/site-content.ts'
import { editLine, site, siteSources, withFile } from './support/site.ts'

const pagesSource = readFileSync(new URL('../src/pages.tsx', import.meta.url), 'utf8')
const deckSource = readFileSync(new URL('../src/components/ImageDeck.tsx', import.meta.url), 'utf8')
const css = readFileSync(new URL('../src/index.css', import.meta.url), 'utf8')

test('a block holds one picture or a deck, and never both', () => {
  assert.deepEqual(pictures({ image: '/a.jpg', alt: 'A' }, 'block'), [{ image: '/a.jpg', alt: 'A' }])
  // A single image is a deck of one, so every surface reads the same list.
  assert.deepEqual(pictures({ images: [{ image: '/a.jpg', alt: 'A' }] }, 'block'), [{ image: '/a.jpg', alt: 'A' }])
  assert.deepEqual(pictures({ images: [{ image: '/a.jpg', alt: 'A' }, { image: '/b.jpg', alt: 'B' }] }, 'block'),
    [{ image: '/a.jpg', alt: 'A' }, { image: '/b.jpg', alt: 'B' }])
  assert.throws(() => pictures({ image: '/a.jpg', alt: 'A', images: [{ image: '/b.jpg', alt: 'B' }] }, 'block'),
    /block: has both image and images/)
})

test('a deck needs at least one image and reports a stray or missing field', () => {
  assert.throws(() => deck([], 'block.images'), /block\.images: needs at least one item/)
  assert.throws(() => deck([{ image: '/a.jpg', alt: 'A', caption: 'x' }], 'block.images'),
    /block\.images\[0\]: has an unknown setting "caption"/)
  assert.throws(() => deck([{ image: '/a.jpg' }], 'block.images'), /block\.images\[0\]\.alt: cannot be left empty/)
})

test('a picture that declares its own proportions frames itself', () => {
  // One declared ratio cannot hold a set of upright and wide photographs without cropping
  // some of them, so a picture may carry its own pair and the deck uses it for that picture.
  assert.deepEqual(deck([{ image: '/a.jpg', alt: 'A', width: 900, height: 1200 }], 'images'),
    [{ image: '/a.jpg', alt: 'A', width: 900, height: 1200 }])
  // Without the pair the entry is exactly what it was, so every existing deck is unchanged.
  assert.deepEqual(deck([{ image: '/a.jpg', alt: 'A' }], 'images'), [{ image: '/a.jpg', alt: 'A' }])
  assert.throws(() => deck([{ image: '/a.jpg', alt: 'A', width: 900 }], 'images'),
    /images\[0\]: needs both width and height, or neither/)
  assert.throws(() => deck([{ image: '/a.jpg', alt: 'A', width: 'wide', height: 900 }], 'images'),
    /images\[0\]\.width: needs a number above zero \(found "wide"\)/)
  // The frame takes the picture's own pair, falling back to the surface's declared ratio.
  assert.match(deckSource, /width=\{current\.width \?\? width\} height=\{current\.height \?\? height\}/)
})

test('the research page parses its decks, and a doubled block names the file', () => {
  assert.ok(site.pages.research.project.images.length >= 2, 'the project image should be a deck')
  assert.ok(site.pages.research.smaller.projects.every((project) => project.images.length >= 1))
  // A block with a single image and an images list is rejected rather than silently half-read.
  const doubled = withFile('research', editLine(siteSources.pages.research, /^(  images:)$/m,
    '  image: /media/portrait.jpg\n  alt: A single picture.\n$1'))
  assert.throws(() => parseSite(doubled), /content\/pages\/research\.yaml → project: has both image and images/)
})

test('one reusable deck keeps the affordance on the cursor, not over the image', () => {
  assert.match(deckSource, /export const DECK_HINT = 'Next image'/)
  assert.match(deckSource, /data-cursor=\{DECK_HINT\}/)
  // Pressing wraps at the end, and a single picture stays inert with no control at all.
  assert.match(deckSource, /const cycling = images\.length > 1/)
  assert.match(deckSource, /\(value \+ 1\) % images\.length/)
  assert.match(deckSource, /\{cycling &&/)
  // Cycling is a state change, not an animation, so the deck owns no motion of its own.
  assert.doesNotMatch(deckSource, /transition|animation/)
  assert.doesNotMatch(deckSource, /deck-count/)
})

test('a deck shows its next cards behind the frame so there is more to leaf through', () => {
  // Up to DECK_PEEKS upcoming cards sit behind the frame, decorative and edge-only.
  assert.match(deckSource, /export const DECK_PEEKS = \d+/)
  assert.match(deckSource, /className="deck-stack" aria-hidden="true"/)
  assert.match(deckSource, /className="deck-card"/)
  assert.match(deckSource, /Math\.min\(images\.length - 1, DECK_PEEKS\)/)
  assert.match(deckSource, /images\[\(index \+ offset \+ 1\) % images\.length\]/)
  // The stack sits behind the frame, takes no space, and never intercepts the press.
  assert.match(css, /\.deck-stack \{ position: absolute; inset: 0; z-index: 0; pointer-events: none; \}/)
  assert.match(css, /\.deck-card \{ position: absolute; inset: 0; overflow: hidden; background: var\(--surface-raised\);/)
  assert.match(css, /\.deck-card \{ position: absolute;/)
  assert.match(css, /transform: translate\(calc\(var\(--deck-depth\) \* \d+px\), calc\(var\(--deck-depth\) \* \d+px\)\);/)
  assert.match(css, /\.image-deck > \.image-frame \{ z-index: 1; \}/)
  assert.match(css, /\.deck-hit \{ position: absolute; inset: 0; z-index: 2;/)
})

test('the deck reaches its surfaces through the shared image component', () => {
  assert.match(pagesSource, /import \{ ImageDeck \} from '@\/components\/ImageDeck'/)
  assert.match(pagesSource, /<ImageDeck images=\{research\.project\.images\}/)
  assert.match(pagesSource, /<ImageDeck images=\{project\.images\}/)
  assert.match(css, /\.image-deck \{ position: relative; display: block; \}/)
  assert.match(css, /\.deck-hit \{ position: absolute; inset: 0;/)
  assert.match(css, /\.research-project > \.image-deck \{ grid-column: 1 \/ 10;/)
  // The frame just inside the deck keeps the composition the single image had.
  assert.match(css, /\.research-project > \.image-deck > \.image-frame \{ aspect-ratio: 16 \/ 9; \}/)
})
