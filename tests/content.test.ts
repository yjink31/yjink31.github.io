import { test } from 'node:test'
import assert from 'node:assert/strict'
import { artImage, artSrcSet, type Artwork } from '../src/lib/site-content.ts'
import { artworks, navigation, pages, papers, recordings } from './support/site.ts'

const localWork: Artwork = {
  ...artworks[0],
  slug: 'local-work',
  artist: 'Yujin Kim',
  reference: false,
  imageId: undefined,
  image: '/media/work.webp',
}

test('local artwork images replace museum URLs at every regular resolution', () => {
  assert.equal(artImage(localWork), '/media/work.webp')
  assert.equal(artImage(localWork, 1680), '/media/work.webp')
  assert.equal(artImage(localWork, 2400), '/media/work.webp')
  assert.equal(artSrcSet(localWork), undefined)
})

test('high-resolution inspection uses its own source without changing collection images', () => {
  const work = { ...localWork, highResolution: '/media/work-original.jpg' }
  assert.equal(artImage(work, 1200), '/media/work.webp')
  assert.equal(artImage(work, 2400), '/media/work-original.jpg')
})

test('a supplied responsive source set is preserved verbatim', () => {
  const srcSet = '/media/work-small.webp 400w, /media/work-large.webp 1200w'
  assert.equal(artSrcSet({ ...localWork, srcSet }), srcSet)
})

test('missing artwork image configuration fails clearly rather than requesting undefined', () => {
  assert.throws(() => artImage({ ...localWork, image: undefined }), /needs an image or imageId/)
})

test('navigation keeps three destinations, with Art on the front page', () => {
  // The front page is the Art collection, so Art leads the navigation at '/', and Me is
  // no longer a destination: its hero opens the front page above the collection.
  assert.deepEqual(navigation.map((item) => item.label), ['Art', 'Music', 'Research'])
  assert.deepEqual(navigation.map((item) => item.href), ['/', '/music', '/research'])
  assert.equal(new Set(navigation.map((item) => item.href)).size, 3)
})

test('resume and paper links point at placeholders while recordings stay honestly empty', () => {
  // The resume now lives with the Art page it belongs to, not on the spine.
  assert.equal(pages.art.hero.resumeUrl, '/media/resume.pdf')
  assert.equal(papers.project.url, '/media/project-paper.pdf')
  assert.equal(papers.ghp.url, '/media/ghp-paper.pdf')
  // The orchestra film and the films below are real performances, so none of them
  // repeats as a demo would.
  assert.deepEqual(pages.music.films.map((film) => film.title), ['Bach prelude', 'Solo repertoire'])
  assert.ok(pages.music.films.every((film) => film.demo === false))
  assert.equal(pages.music.feature.video.src, '/media/music/Orchestra1.mp4')
  assert.equal(pages.music.feature.video.demo, false)
  // A listed film with no file yet keeps its still and says so honestly.
  assert.equal(pages.music.films[0].src, '/media/music/BachPrelude1.mp4')
  assert.deepEqual(pages.music.films.slice(1).map((film) => film.src), [undefined])
  assert.deepEqual(recordings.map((recording) => recording.title), ['Bach prelude', 'Viola', 'Concerto'])
  assert.ok(recordings.every((recording) => !recording.src))
  // The collection is twelve local placeholder works, so the grid is full and no
  // museum reference or third-party source is claimed for a placeholder.
  assert.equal(artworks.length, 12)
  assert.ok(artworks.every((work) => !work.reference && work.image?.startsWith('/media/placeholders/')))
  assert.ok(artworks.every((work) => work.source === undefined && work.imageId === undefined))
})
