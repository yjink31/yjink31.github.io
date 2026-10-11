import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { parseSite } from '../src/lib/site-content.ts'
import { editLine, site, siteSources, withFile } from './support/site.ts'
const pagesSource = readFileSync(new URL('../src/pages.tsx', import.meta.url), 'utf8')
const css = readFileSync(new URL('../src/index.css', import.meta.url), 'utf8')
const stripSource = readFileSync(new URL('../src/components/PhotoStrip.tsx', import.meta.url), 'utf8')

test('the orchestra film leads the music page beside its experience text and topics', () => {
  assert.match(pagesSource, /<section className="music-feature enter enter-delay" data-side=\{layout\.music\.featureSide\} aria-label="Orchestra and experience">/)
  assert.match(pagesSource, /<VideoPlayer autoplay label=\{music\.feature\.heading\} src=\{video\.src\} poster=\{video\.poster\} caption=\{video\.caption \?\? ''\} demo=\{video\.demo\} \/>/)
  // The copy on the other side is content, not literals in the page:
  assert.match(pagesSource, /<h2>\{music\.feature\.heading\}<\/h2>/)
  assert.match(pagesSource, /<p>\{music\.feature\.copy\}<\/p>/)
  assert.match(pagesSource, /\{music\.feature\.note && <p className="preview-copy">\{music\.feature\.note\}<\/p>\}/)
  assert.match(pagesSource, /\{layout\.music\.showTopics && <div className="music-topics">/)
  // The side is a named option in content, and the grid follows it: the film takes the
  // wide column and the experience text the other.
  assert.equal(site.layout.music.featureSide, 'left')
  assert.equal(site.layout.music.showTopics, true)
  assert.match(css, /\.music-feature \{ display: grid; grid-template-columns: 8fr 4fr;/)
  assert.match(css, /\.music-feature\[data-side='right'\] \.music-experience \{ grid-column: 1; grid-row: 1; \}/)
  // The film is smaller than the window, never bled.
  assert.doesNotMatch(css, /\.music-feature \.video-player \{[^}]*width: 100vw/)
  // A film with its file missing keeps its still and says so, instead of a player
  // with nothing behind it (the schema lets a film exist before its file does).
  assert.match(pagesSource, /: <div className="film-empty" role="status">/)
  assert.match(pagesSource, /\{messages\.recordingMissingHeading\}/)
  assert.match(pagesSource, /\{messages\.recordingMissingCopy\}/)
})

test('the films run as rows that take the side their content names, with their descriptions beside them', () => {
  assert.match(pagesSource, /<section className="music-films enter" aria-label="Performances">/)
  // The player keeps no caption of its own: the description stands beside the film.
  assert.match(pagesSource, /<VideoPlayer label=\{film\.title\} src=\{film\.src\} poster=\{film\.poster\} demo=\{film\.demo\} \/>/)
  assert.match(pagesSource, /<div className="music-film" data-side=\{film\.side\}/)
  assert.match(pagesSource, /<div className="film-copy" role=\{film\.src \? undefined : 'status'\}>/)
  // The film is the smaller column of its row and the description takes the other side; a
  // film on the right puts its text on the left by grid area, not by reordering the page.
  assert.match(css, /\.music-film \{ display: grid; grid-template-columns: 7fr 5fr;/)
  assert.match(css, /\.music-film\[data-side='right'\] \{ grid-template-columns: 5fr 7fr; \}/)
  assert.match(css, /\.music-film\[data-side='right'\] \.video-player, \.music-film\[data-side='right'\] \.film-empty \{ grid-column: 2; grid-row: 1; \}/)
  assert.match(css, /\.music-film\[data-side='right'\] \.film-copy \{ grid-column: 1; grid-row: 1; \}/)
  // The films no longer measure the window, and the description is text at the reader's
  // size — not a footnote under the player padded to the window's gutter.
  assert.doesNotMatch(css, /\.music-film \{ width: 100vw/)
  assert.doesNotMatch(css, /\.music-film \.media-note/)
  assert.match(css, /\.film-description \{[^}]*font-size: clamp\(17px, 1\.8vw, 22px\);/)
  // A 100vw shell would put a scrollbar in every viewport; full bleed measures the scroll box.
  assert.doesNotMatch(css, /\.shell[^{]*\{[^}]*width: 100vw/)
})

test('a film listed before its file exists keeps its still and says so honestly', () => {
  // The schema allows a film to be listed before its file is in place…
  assert.doesNotThrow(() => {
    parseSite(withFile('music', editLine(siteSources.pages.music, /src: \/media\/music\/BachPrelude1\.mp4/, 'src:')))
  })
  // …and a film with no source simply does not run: no empty player on the page.
  assert.doesNotMatch(pagesSource, /poster=\{film\.poster\} demo=\{film\.demo\} autoplay/)
  const solo = site.pages.music.films[1]
  assert.equal(solo.src, undefined)
  // The still and the note stand in for the player…
  assert.match(pagesSource, /<Image src=\{film\.poster\} alt=\{`Still for the \$\{film\.title\} film\.`\} width=\{1600\} height=\{900\} loading="lazy" \/>/)
  // …and the copy comes from the same message set as the page's own notes, so it can be
  // reworded for the voice without touching the page.
  assert.match(pagesSource, /\{messages\.recordingMissingHeading\}/)
  assert.match(pagesSource, /\{messages\.recordingMissingCopy\}/)
  assert.ok(site.messages.recordingMissingHeading.length > 0)
  assert.ok(site.messages.recordingMissingCopy.length > 0)
})

test('each film names its side, and a film with its file takes its thumbnail from its own frames', () => {
  const { films, feature } = site.pages.music
  // The Bach film is the smaller one on the left with its text on the right; the film
  // below it stands on the right with its text on the left. A film that says nothing
  // about its side simply sits left.
  assert.deepEqual(films.map((film) => film.side), ['left', 'right'])
  // A film's thumbnail is a portion of its own video, not a stand-in from elsewhere.
  assert.equal(feature.video.poster, '/media/music/Orchestra1-poster.jpg')
  assert.equal(films[0].poster, '/media/music/BachPrelude1-poster.jpg')
  for (const film of [feature.video, films[0]]) {
    assert.ok(film.poster.startsWith('/media/music/'), `${film.title} keeps a frame of its own as its thumbnail`)
    assert.ok(!film.poster.includes('unsplash'), `${film.title} still points at a stock still`)
  }
  // The frames exist where their paths point…
  for (const path of ['/media/music/Orchestra1-poster.jpg', '/media/music/BachPrelude1-poster.jpg']) {
    assert.ok(existsSync(new URL(`../public${path}`, import.meta.url)), `${path} is missing from public`)
  }
  // …and a film whose file is not there yet has no frame to take; its still is its own.
  assert.equal(films[1].src, undefined)
})

test('the photographs close the music page as one ring that turns like a strip', () => {
  const music = site.pages.music
  // The list is content: the page simply renders whatever is there, in order.
  assert.deepEqual(music.photos.map((photo) => photo.image), [
    '/media/music/265.JPG',
    '/media/music/IMG_5505.JPG',
    '/media/music/IMG_7376.JPG',
    '/media/music/IMG_7498.JPG',
    '/media/music/IMG_8833.JPG',
    '/media/music/20150303_152956.jpg',
  ])
  assert.match(pagesSource, /<PhotoStrip images=\{music\.photos\} \/>/)
  // The photographs keep their real proportions in content; the ring gives each one the
  // same square card, cropped evenly from its centre, so a mixed set lines up as a ring.
  assert.ok(music.photos.every((photo) => Number.isInteger(photo.width) && Number.isInteger(photo.height)))
  assert.match(css, /\.photo-card \{[^}]*width: var\(--photo-width\); height: var\(--photo-width\);/)
  assert.match(css, /\.photo-card img \{[^}]*object-fit: cover/)
  // Every photograph carries its own description…
  assert.ok(music.photos.every((photo) => photo.alt.trim().length > 0))
  // …and it is a strip at the foot of the page, after the films.
  assert.ok(pagesSource.indexOf('<PhotoStrip') > pagesSource.indexOf('music-films'))
  assert.match(stripSource, /role="group" tabIndex=\{turning \? 0 : -1\}/)
  assert.match(stripSource, /onKeyDown=\{\(event\) =>/)
})
