import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { parseSite } from '../src/lib/site-content.ts'
import { editLine, site, siteSources, withFile } from './support/site.ts'

const pagesSource = readFileSync(new URL('../src/pages.tsx', import.meta.url), 'utf8')
const css = readFileSync(new URL('../src/index.css', import.meta.url), 'utf8')

test('the Music page leads with its films, in file order, each one full width', () => {
  const { films } = site.pages.music
  assert.ok(films.length >= 2, `expected at least two films, found ${films.length}`)
  assert.deepEqual(films.map((film) => film.title), ['Bach prelude', 'Solo'])
  assert.ok(films.every((film) => film.poster))
  assert.ok(films.every((film) => film.demo === false), 'a real performance never repeats')
  // Full-bleed from inside the capped shell, at the film's own 16:9 rather than a column's.
  assert.match(css, /\.music-films \{ display: flex; flex-direction: column;/)
  assert.match(css, /\.music-film \{ width: 100vw; margin-inline: calc\(50% - 50vw\); \}/)
  assert.match(css, /\.music-film \.video-stage \{ aspect-ratio: 16 \/ 9; \}/)
  assert.match(pagesSource, /<section className="music-films enter" aria-label="Performances">/)
})

test('a film plays on the page: the site owns a player rather than linking the file', () => {
  // The player is the same component the recordings use, so the controls, the poster,
  // and the recovery path are shared rather than a second implementation.
  assert.match(pagesSource, /<VideoPlayer autoplay=\{index === 0\} label=\{film\.title\} src=\{film\.src\}/)
  assert.doesNotMatch(pagesSource, /<a [^>]*href=\{film\.src\}/)
  // Only the first film starts on its own; the ones below wait to be started.
  assert.match(pagesSource, /autoplay=\{index === 0\}/)
})

test('a film listed before its file exists keeps its still and says so honestly', () => {
  assert.equal(site.pages.music.films[0].src, '/media/music/BachPrelude1.mp4')
  // The film without a file is the one the page renders as a still, never a dead player.
  const { films } = site.pages.music
  assert.ok(films.some((film) => film.src === undefined))
  assert.match(pagesSource, /: <div className="film-empty" role="status">/)
  assert.match(pagesSource, /\{messages\.recordingMissingHeading\}/)
  // Writing the file's path in gives that film its player back.
  const filled = withFile('music', editLine(siteSources.pages.music, /(\n    src:)(\r?\n)/, '$1 /media/music/Solo.mp4$2'))
  assert.equal(parseSite(filled).pages.music.films[1].src, '/media/music/Solo.mp4')
})

test('the photographs close the page as one deck, each framed by its own proportions', () => {
  const { photos } = site.pages.music
  assert.equal(photos.length, 5)
  assert.ok(photos.every((photo) => photo.image.startsWith('/media/music/') && photo.alt && photo.width && photo.height))
  // Upright and wide pictures share the deck, which is why one declared ratio will not do.
  assert.ok(photos.some((photo) => photo.width! < photo.height!))
  assert.ok(photos.some((photo) => photo.width! > photo.height!))
  assert.match(pagesSource, /<ImageDeck images=\{music\.photos\} width=\{1600\} height=\{1000\} loading="lazy" \/>/)
  assert.match(pagesSource, /className="music-photos reveal" aria-label="Performance photographs"/)
  // The deck is the last thing on the page, after the films and the recordings.
  assert.ok(pagesSource.indexOf('className="music-photos') > pagesSource.indexOf('className="recording-collection"'))
  assert.ok(pagesSource.indexOf('className="music-films') < pagesSource.indexOf('className="music-experience'))
  // Emptying the block drops the gallery rather than failing: it is not required content.
  const withoutPhotos = siteSources.pages.music.slice(0, siteSources.pages.music.lastIndexOf('photos:')) + 'photos:'
  assert.deepEqual(parseSite(withFile('music', withoutPhotos)).pages.music.photos, [])
})

test('a mistake in a film or a photograph names the file, the entry, and the setting', () => {
  assert.throws(() => parseSite(withFile('music', editLine(siteSources.pages.music, /^    poster: /m, '    still: '))),
    /content\/pages\/music\.yaml → films\[0\]: has an unknown setting "still"/)
  assert.throws(() => parseSite(withFile('music', editLine(siteSources.pages.music, /^  - title: Bach prelude$/m, '  - title:'))),
    /content\/pages\/music\.yaml → films\[0\]\.title: cannot be left empty/)
  assert.throws(() => parseSite(withFile('music', editLine(siteSources.pages.music, /^    poster: https.*$/m, '    poster:'))),
    /content\/pages\/music\.yaml → films\[0\]\.poster: cannot be left empty/)
  // Half a pair of proportions is a mistake, not a smaller frame.
  assert.throws(() => parseSite(withFile('music', editLine(siteSources.pages.music, /^    height: 3264$/m, ''))),
    /content\/pages\/music\.yaml → photos\[0\]: needs both width and height, or neither/)
  assert.throws(() => parseSite(withFile('music', editLine(siteSources.pages.music, /^    alt: Photograph 1.*$/m, '    alt:'))),
    /content\/pages\/music\.yaml → photos\[0\]\.alt: cannot be left empty/)
})
