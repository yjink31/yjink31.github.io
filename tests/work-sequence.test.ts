import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { workNeighbours } from '../src/lib/work-sequence.ts'

const pagesSource = readFileSync(new URL('../src/pages.tsx', import.meta.url), 'utf8')
const css = readFileSync(new URL('../src/index.css', import.meta.url), 'utf8')

const works = [{ slug: 'a' }, { slug: 'b' }, { slug: 'c' }]

test('the artwork view steps to the works either side of it in collection order', () => {
  assert.deepEqual(workNeighbours(works, 'b'), { previous: works[0], next: works[2] })
})

test('both ends wrap, so neither step is a dead end', () => {
  assert.deepEqual(workNeighbours(works, 'a'), { previous: works[2], next: works[1] })
  assert.deepEqual(workNeighbours(works, 'c'), { previous: works[1], next: works[0] })
})

test('a lone work, an empty collection, or an unknown slug has no neighbours', () => {
  assert.deepEqual(workNeighbours([works[0]], 'a'), {})
  assert.deepEqual(workNeighbours([], 'a'), {})
  // A deep link to a work that has since been removed still renders its own page.
  assert.deepEqual(workNeighbours(works, 'missing'), {})
})

test('the steps are real links on the action bar, never something drawn over the work', () => {
  // One name per action, kept in code like every other control label.
  assert.match(pagesSource, /export const WORK_STEP_PREVIOUS = 'Previous work'/)
  assert.match(pagesSource, /export const WORK_STEP_NEXT = 'Next work'/)
  // The order comes from the same list the grid renders, so the two never disagree.
  assert.match(pagesSource, /const \{ previous, next \} = workNeighbours\(artworks, work\.slug\)/)
  // Links rather than handlers, so a step can be opened in a new tab and the arrow keys,
  // history, and view transitions all keep working.
  assert.match(pagesSource, /href=\{`\/art\/\$\{previous\.slug\}`\}/)
  assert.match(pagesSource, /href=\{`\/art\/\$\{next\.slug\}`\}/)
  assert.match(pagesSource, /data-cursor=\{WORK_STEP_PREVIOUS\}/)
  assert.match(pagesSource, /data-cursor=\{WORK_STEP_NEXT\}/)
  // The destination work is named for a screen reader, after the action's own name.
  assert.match(pagesSource, /aria-label=\{`\$\{WORK_STEP_PREVIOUS\}: \$\{previous\.title\}`\}/)
  assert.match(pagesSource, /aria-label=\{`\$\{WORK_STEP_NEXT\}: \$\{next\.title\}`\}/)
  // Both controls live inside the bar the Back to Art control already owns, and neither
  // is positioned over the artwork, which stays the inspect target.
  assert.match(pagesSource, /className="detail-actions enter"[\s\S]*?className="work-steps"/)
  assert.match(css, /\.work-steps \{ display: flex; gap: 10px; margin-left: auto; \}/)
  assert.doesNotMatch(css, /\.work-step[^{]*\{[^}]*position: absolute/)
})
