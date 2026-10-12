import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { parseSite } from '../src/lib/site-content.ts'
import { editLine, site, siteSources, withFile } from './support/site.ts'

const pagesSource = readFileSync(new URL('../src/pages.tsx', import.meta.url), 'utf8')
const css = readFileSync(new URL('../src/index.css', import.meta.url), 'utf8')

test('the main deck is the mainR set and the preview beside the paper is the Research1 set', () => {
  const { project } = site.pages.research
  assert.deepEqual(project.images.map((picture) => picture.image), [
    '/media/research/mainR/IMG_2155.jpg',
    '/media/research/mainR/IMG_2201.jpg',
    '/media/research/mainR/IMG_2354.jpg',
    '/media/research/mainR/Screenshot 2026-10-11 165724.png',
    '/media/research/mainR/Screenshot 2026-10-11 165742.png',
  ])
  assert.deepEqual(project.preview?.map((picture) => picture.image), [
    '/media/research/Research1/IMG_5523.png',
    '/media/research/Research1/IMG_5657.png',
    '/media/research/Research1/IMG_5661.png',
    '/media/research/Research1/IMG_6747.png',
    '/media/research/Research1/IMG_8983.png',
  ])
  // Upright and wide pictures share both sets, so each declares its own proportions.
  assert.ok([...project.images, ...(project.preview ?? [])].every((picture) => picture.width && picture.height))
  // The preview deck is composed between the section's text and the paper panel.
  const slot = pagesSource.indexOf('className="research-paper-slot"')
  assert.ok(pagesSource.indexOf('className="research-project-copy"') < slot, 'the text comes first')
  assert.ok(slot < pagesSource.indexOf('<PaperWidget paper={papers[research.project.paper]} />'), 'the paper comes last')
  assert.match(pagesSource, /\{research\.project\.preview && <ImageDeck className="research-preview" images=\{research\.project\.preview\}/)
})

test('the 047 document fills the space beside the research paper, under the section text', () => {
  // The second document is content: a key in papers, shown with the section's paper.
  assert.equal(site.pages.research.project.sidePaper, '047')
  assert.equal(site.papers['047'].title, 'Project Poster')
  assert.equal(site.papers['047'].url, '/media/research/047.pdf')
  assert.match(pagesSource, /\{research\.project\.sidePaper && <PaperWidget paper=\{papers\[research\.project\.sidePaper\]\} \/>\}/)
  // The text stands above the document in one column, and that column is left of both
  // the preview deck and the paper panel…
  assert.match(pagesSource, /<div className="research-project-side">/)
  assert.ok(pagesSource.indexOf('className="research-project-copy"') < pagesSource.indexOf('research.project.sidePaper'), 'the text stands above the document')
  assert.match(css, /\.research-project-side \{ grid-column: 1 \/ 9; grid-row: 2; display: grid; grid-template-rows: auto 1fr;/)
  // …and the document fills the whole space under the text, its pages scrolling inside.
  assert.match(css, /\.research-project-side > \.paper-widget \.resume-viewer \{ aspect-ratio: auto; flex: 1 1 0;/)
  assert.ok(pagesSource.indexOf('research.project.sidePaper') < pagesSource.indexOf('className="research-paper-slot"'), 'the 047 panel stands before the paper slot')
  // The document is out of the photo deck: the preview beside the paper is the research set.
  assert.ok((site.pages.research.project.preview ?? []).every((picture) => !picture.image.includes('047image')))
})

test('each paper panel draws its paper pages, scrollable like the resume', () => {
  assert.ok(pagesSource.includes('{paper.url && <PdfViewer url={paper.url} label={`${paper.title}, as a PDF`} noun="paper" />}'))
  // The same viewer the resume uses, in the panel above the Open paper link.
  assert.match(css, /\.resume-viewer \{ position: relative; aspect-ratio: 8\.5 \/ 11; overflow: auto;/)
  // The panels lead with their names and reach their pages at once — the top stays
  // tight (no label line, no empty-citation gap) so the document fills the panel.
  assert.match(css, /\.paper-widget \{[^}]*padding: 20px 28px 28px;/)
  assert.match(css, /\.paper-widget > \.resume-viewer \{ margin-top: 16px; \}/)
  assert.doesNotMatch(pagesSource, /paper-label/)
  assert.match(pagesSource, /<h3>\{paper\.title\}<\/h3>\{paper\.citation && <p>\{paper\.citation\}<\/p>\}/)
})

test('the GHP row is a photo deck beside its two videos', () => {
  const { ghp } = site.pages.research
  // The deck is the GHPphoto folder's set, in folder order with the screenshot the
  // row opens on placed first.
  assert.deepEqual(ghp.images.map((picture) => picture.image), [
    '/media/research/GHPphoto/Screenshot 2026-10-11 152029.png',
    '/media/research/GHPphoto/IMG_1607.jpg',
    '/media/research/GHPphoto/IMG_2835.png',
    '/media/research/GHPphoto/IMG_2869.png',
    '/media/research/GHPphoto/Screenshot 2026-10-11 174331.png',
    '/media/research/GHPphoto/Screenshot 2026-10-11 174417.png',
    '/media/research/GHPphoto/Screenshot 2026-10-11 174437.png',
    '/media/research/GHPphoto/Screenshot 2026-10-11 174452.png',
  ])
  assert.deepEqual(ghp.videos.map((video) => video.src), ['/media/research/IMG_1613.MOV', '/media/research/IMG_1634.mp4'])
  // The deck takes the photograph's place: the wide slot on the left, in the row's own frame.
  assert.match(pagesSource, /<ImageDeck images=\{research\.ghp\.images\} width=\{1100\} height=\{1000\} loading="lazy" \/>/)
  assert.match(css, /\.ghp-images > \.image-deck:first-child \{ grid-column: 1; \}/)
  assert.match(css, /\.ghp-images > \.image-deck \.image-frame \{ aspect-ratio: 5 \/ 4; \}/)
  // The videos stand where the right-hand photograph stood: small, one above the other.
  assert.ok(pagesSource.includes('<div className="ghp-videos">{research.ghp.videos.map((video) => <VideoPlayer key={video.src} label={video.title}'))
  assert.match(css, /\.ghp-videos \{ grid-column: 3; display: flex; flex-direction: column; gap: 24px; \}/)
  assert.match(css, /\.ghp-videos \.video-stage \{ aspect-ratio: 16 \/ 9; \}/)
  // Like the music page's players, but nothing here starts on its own.
  assert.doesNotMatch(pagesSource, /<VideoPlayer autoplay label=\{video\.title\}/)
})

test('the smaller projects carry CarbonN and the passion-project figures in order', () => {
  const [notes, experiment] = site.pages.research.smaller.projects
  assert.deepEqual(notes.images.map((picture) => picture.image), [
    '/media/research/CarbonN/CN1.png',
    '/media/research/CarbonN/CN2.png',
    '/media/research/CarbonN/CN3.png',
    '/media/research/CarbonN/CN4.png',
    '/media/research/CarbonN/CN5.png',
    '/media/research/CarbonN/CN6.png',
    '/media/research/CarbonN/CN7.png',
    '/media/research/CarbonN/CN8.png',
  ])
  assert.deepEqual(experiment.images.map((picture) => picture.image), [
    '/media/research/PassionProject/KH.png',
    '/media/research/PassionProject/KH2.png',
    '/media/research/PassionProject/AdaptR.png',
    '/media/research/PassionProject/AdaptR2.png',
    '/media/research/PassionProject/ElecCar.png',
  ])
  // The figures are wide, but the cards take each picture's own proportions.
  assert.ok([...notes.images, ...experiment.images].every((picture) => picture.width && picture.height))
})

test('the preview is optional and a mistake in the new blocks names the file and the entry', () => {
  // Leaving the preview block out keeps the page whole: the paper panel stands alone.
  const withoutPreview = editLine(siteSources.pages.research, /  preview:\r?\n    images:(?:\r?\n {4,}.*)+/, '  # the preview is optional')
  assert.equal(parseSite(withFile('research', withoutPreview)).pages.research.project.preview, undefined)
  // Half of a picture's pair of proportions is a mistake, not a smaller frame.
  assert.throws(() => parseSite(withFile('research', editLine(siteSources.pages.research, /(  preview:[\s\S]*?width: \d+)(\r?\n +height: \d+)/, '$1'))),
    /content\/pages\/research\.yaml → project\.preview\.images\[0\]: needs both width and height, or neither/)
  // An empty alt names the entry it belongs to.
  assert.throws(() => parseSite(withFile('research', editLine(siteSources.pages.research, /(  preview:\r?\n    images:\r?\n +- image: [^\r\n]+\r?\n +alt: )[^\r\n]+/, '$1'))),
    /content\/pages\/research\.yaml → project\.preview\.images\[0\]\.alt: cannot be left empty/)
  // A video without its file is a mistake too.
  assert.throws(() => parseSite(withFile('research', editLine(siteSources.pages.research, /^      src: \/media\/research\/IMG_1613\.MOV$/m, '      src:'))),
    /content\/pages\/research\.yaml → ghp\.videos\[0\]\.src: cannot be left empty/)
})
