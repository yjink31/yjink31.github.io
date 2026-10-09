import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { parseSite } from '../src/lib/site-content.ts'
import { editLine, site, siteSources, withFile } from './support/site.ts'

const pagesSource = readFileSync(new URL('../src/pages.tsx', import.meta.url), 'utf8')
const css = readFileSync(new URL('../src/index.css', import.meta.url), 'utf8')

test('the Music page opens with the orchestra film beside its side text', () => {
  const { feature } = site.pages.music
  assert.equal(feature.video.src, '/media/music/Orchestra1.mp4')
  assert.ok(feature.video.poster)
  assert.equal(feature.video.demo, false, 'a real performance never repeats')
  // The text sits beside the film: the film takes the wide column, the text the narrow.
  assert.match(css, /\.music-feature \{ display: grid; grid-template-columns: 8fr 4fr; gap: clamp\(32px, 6vw, 96px\); align-items: center;/)
  assert.match(pagesSource, /<section className="music-feature enter enter-delay" data-side=\{layout\.music\.featureSide\}/)
  // The choice in content/site.yaml decides which side the film takes, and the mirror is
  // a real composition rather than a stretched one.
  assert.match(css, /\.music-feature\[data-side='right'\] \{ grid-template-columns: 4fr 8fr; \}/)
  // The orchestra film is the one that starts on its own, muted, once it is in view;
  // every film below waits for a press.
  assert.match(pagesSource, /<VideoPlayer autoplay label=\{music\.feature\.heading\} src=\{video\.src\}/)
  assert.doesNotMatch(pagesSource, /<VideoPlayer autoplay label=\{film\.title\}/)
  // The heading, note, and practice words stay the side text, next to the film.
  assert.ok(feature.topics.length >= 1)
  assert.ok(pagesSource.indexOf('className="music-experience"') > pagesSource.indexOf('className="music-feature'))
})

test('the films below run the full width and carry their captions as the text under the player', () => {
  const { films } = site.pages.music
  assert.deepEqual(films.map((film) => film.title), ['Bach prelude', 'Solo repertoire'])
  assert.ok(films.every((film) => film.poster))
  assert.ok(films.every((film) => film.demo === false), 'a real performance never repeats')
  // The Bach prelude film carries the text below its player, written in the content file.
  assert.equal(films[0].src, '/media/music/BachPrelude1.mp4')
  assert.ok(films[0].caption && films[0].caption.trim().length > 0)
  // The caption renders under the player as a note, never over the picture.
  assert.match(pagesSource, /caption=\{film\.caption \?\? ''\} demo=\{film\.demo\}/)
  assert.match(css, /\.music-film \.media-note \{ padding-inline: var\(--gutter\); \}/)
  // Full-bleed from inside the capped shell, at the film's own 16:9 rather than a column's.
  assert.match(css, /\.music-films \{ display: flex; flex-direction: column;/)
  assert.match(css, /\.music-film \{ width: 100vw; margin-inline: calc\(50% - 50vw\); \}/)
  assert.match(css, /\.music-film \.video-stage \{ aspect-ratio: 16 \/ 9; \}/)
  assert.match(pagesSource, /<section className="music-films enter" aria-label="Performances">/)
  // The films are under the orchestra film, not above it.
  assert.ok(pagesSource.indexOf('className="music-feature') < pagesSource.indexOf('className="music-films'))
})

test('a film listed before its file exists keeps its still and says so honestly', () => {
  // The film without a file is the one the page renders as a still, never a dead player.
  const { films } = site.pages.music
  assert.ok(films.some((film) => film.src === undefined))
  assert.match(pagesSource, /: <div className="film-empty" role="status">/)
  assert.match(pagesSource, /\{messages\.recordingMissingHeading\}/)
  // Writing the file's path in gives that film its player back.
  const filled = withFile('music', editLine(siteSources.pages.music, /^    src:$/m, '    src: /media/music/SoloRepertoire.mp4'))
  assert.equal(parseSite(filled).pages.music.films[1].src, '/media/music/SoloRepertoire.mp4')
})

test('the photographs close the page as a strip that turns like a ring', () => {
  const { photos } = site.pages.music
  assert.ok(photos.length >= 5, `expected at least five photographs, found ${photos.length}`)
  assert.ok(photos.every((photo) => photo.image.startsWith('/media/music/') && photo.alt && photo.width && photo.height))
  // Upright and wide pictures share the strip, which is why one declared ratio will not do.
  assert.ok(photos.some((photo) => photo.width! < photo.height!))
  assert.ok(photos.some((photo) => photo.width! > photo.height!))
  assert.match(pagesSource, /<PhotoStrip images=\{music\.photos\} \/>/)
  assert.match(pagesSource, /className="music-photos reveal" aria-label="Performance photographs"/)
  // The strip is the last thing on the page, after the feature and the films.
  assert.ok(pagesSource.indexOf('className="music-films') < pagesSource.indexOf('className="music-photos'))
  // Emptying the block drops the strip rather than failing: it is not required content.
  const withoutPhotos = siteSources.pages.music.slice(0, siteSources.pages.music.lastIndexOf('photos:')) + 'photos:'
  assert.deepEqual(parseSite(withFile('music', withoutPhotos)).pages.music.photos, [])
})

test('the recording slots and their companion are gone from the page', () => {
  // The page is the orchestra film with its side text, the films under it, and the
  // photograph strip. The stock slots and the companion still are no longer composed,
  // and the page's content file carries no companion block to feed them.
  assert.doesNotMatch(pagesSource, /recording-collection|collection-companion|recording-empty/)
  assert.doesNotMatch(siteSources.pages.music, /^companion:/m)
  assert.doesNotMatch(css, /\.recording|collection-companion/)
})

test('a mistake in a film or a photograph names the file, the entry, and the setting', () => {
  assert.throws(() => parseSite(withFile('music', editLine(siteSources.pages.music, /^    poster: /m, '    still: '))),
    /content\/pages\/music\.yaml → feature\.video: has an unknown setting "still"/)
  assert.throws(() => parseSite(withFile('music', editLine(siteSources.pages.music, /^  - title: Bach prelude$/m, '  - title:'))),
    /content\/pages\/music\.yaml → films\[0\]\.title: cannot be left empty/)
  assert.throws(() => parseSite(withFile('music', editLine(siteSources.pages.music, /(films:[\s\S]*?poster: )\S+/, '$1'))),
    /content\/pages\/music\.yaml → films\[0\]\.poster: cannot be left empty/)
  // The feature film reads through the same vocabulary as the films below it.
  assert.throws(() => parseSite(withFile('music', editLine(siteSources.pages.music, /^    demo: false$/m, '    demo: no'))),
    /content\/pages\/music\.yaml → feature\.video\.demo: needs true or false/)
  // Half a pair of proportions is a mistake, not a smaller frame.
  assert.throws(() => parseSite(withFile('music', editLine(siteSources.pages.music, /(photos:[\s\S]*?height: )\d+/, '$1'))),
    /content\/pages\/music\.yaml → photos\[0\]: needs both width and height, or neither/)
  assert.throws(() => parseSite(withFile('music', editLine(siteSources.pages.music, /(photos:[\s\S]*?alt: ).*/, '$1'))),
    /content\/pages\/music\.yaml → photos\[0\]\.alt: cannot be left empty/)
})
