import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { MEDIA_FILES, PAGE_FILES, SITE_FILE, parseSite } from '../src/lib/site-content.ts'
import { THEME_FILE } from '../src/lib/theme-content.ts'
import { contentFiles, editLine, site, siteSources, withFile } from './support/site.ts'

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8')
const appContent = read('../src/content.ts')
const app = read('../src/App.tsx')
const pagesSource = read('../src/pages.tsx')
const css = read('../src/index.css')
const allFiles = Object.values(contentFiles).join('\n')

test('the app reads every content file instead of holding copy in components', () => {
  assert.equal(SITE_FILE, 'content/site.yaml')
  assert.equal(MEDIA_FILES.artworks, 'content/media/artworks.yaml')
  assert.equal(MEDIA_FILES.recordings, 'content/media/recordings.yaml')
  assert.equal(MEDIA_FILES.papers, 'content/media/papers.yaml')
  assert.equal(THEME_FILE, 'content/theme.yaml')
  assert.equal(PAGE_FILES.art, 'content/pages/art.yaml')
  assert.equal(PAGE_FILES.notFound, 'content/pages/not-found.yaml')
  for (const path of ['site.yaml', 'theme.yaml', 'media/artworks.yaml', 'media/recordings.yaml', 'media/papers.yaml', 'pages/art.yaml', 'pages/music.yaml', 'pages/research.yaml', 'pages/not-found.yaml']) {
    assert.match(appContent, new RegExp(`\\.\\./content/${path.replace(/\./g, '\\.')}\\?raw`), `${path} should be imported as text`)
  }
  assert.match(appContent, /parseSite\(siteSources\)/)
  assert.match(appContent, /parseTheme\(rawTheme\)/)
  // Copy belongs in the content files, not in the page components.
  assert.doesNotMatch(pagesSource, /'Different ways of looking/)
  assert.doesNotMatch(pagesSource, /'Room for sound/)
})

test('the split leaves the copy in one file per page and each media collection in its own file', () => {
  for (const [name, declaring] of [['art', 'hero:'], ['music', 'feature:'], ['research', 'ghp:'], ['notFound', 'copy:']] as const) {
    assert.ok(contentFiles[name].includes(declaring), `content/pages/${name} should hold its own page`)
  }
  // The spine keeps the shared settings: no page copy, no works, no media lists of its own.
  assert.match(siteSources.site, /^layout:/m)
  assert.match(siteSources.site, /^messages:/m)
  assert.doesNotMatch(siteSources.site, /^pages:/m)
  assert.doesNotMatch(siteSources.site, /^artworks:/m)
  assert.doesNotMatch(siteSources.site, /^recordings:/m)
  assert.doesNotMatch(siteSources.site, /^papers:/m)
  // Every media collection is its own file under content/media, the same way as artworks.
  assert.match(siteSources.media.artworks, /^artworks:/m)
  assert.match(siteSources.media.recordings, /^recordings:/m)
  assert.match(siteSources.media.papers, /^papers:/m)
  // A setting that moved out is reported instead of being ignored.
  const stale = withFile('site', `${siteSources.site}\npages:\n  art: {}\n`)
  assert.throws(() => parseSite(stale), /content\/site\.yaml → the file: has an unknown setting "pages"/)
})

test('every content file explains itself to a non-technical editor', () => {
  const comments = (source: string) => source.split('\n').filter((line) => line.trimStart().startsWith('#')).length
  for (const [file, source] of Object.entries(contentFiles)) {
    assert.ok(comments(source) > 0, `${file} should carry a note explaining what it is for`)
  }
  assert.ok(comments(allFiles) > 80, `expected generous guidance across the files, found ${comments(allFiles)} comment lines`)
  for (const marker of ['HOW TO EDIT', 'WHAT IS NOT HERE', 'layout:', 'artworks:', 'recordings:', 'papers:', 'accents:', 'modes:', 'atmosphere:']) {
    assert.ok(allFiles.includes(marker), `${marker} should be documented somewhere`)
  }
  // The spine says where everything else went.
  for (const pointer of ['content/theme.yaml', 'content/media/', 'content/pages/']) {
    assert.ok(siteSources.site.includes(pointer), `site.yaml should point at ${pointer}`)
  }
})

test('every curated layout choice is documented next to its allowed values and wired to the page', () => {
  for (const setting of ['feature_side:', 'show_topics:', 'copy_side:']) {
    assert.ok(siteSources.site.includes(setting), `${setting} should be documented in site.yaml`)
  }
  assert.ok(siteSources.media.artworks.includes('large | small | offset | wide'))
  assert.equal(siteSources.site.match(/left \| right/g)?.length, 2)
  // Each option reaches a real composition, and the mirrored one has CSS behind it.
  assert.match(pagesSource, /data-copy=\{layout\.detail\.copySide\}/)
  assert.match(css, /\.artwork-detail\[data-copy='left'\] \{ grid-template-columns/)
  // The featured film sits beside its side text, so the choice decides which side the
  // film takes, and the mirrored composition has real CSS behind it.
  assert.match(pagesSource, /data-side=\{layout\.music\.featureSide\}/)
  assert.match(css, /\.music-feature\[data-side='right'\] \{ grid-template-columns: 4fr 8fr; \}/)
})

test('the front page is one bento grid of the whole collection, four works per row', () => {
  // The request fixes four pieces per row, so the grid is a plain four-column track
  // with `dense` packing and no per-work size classes overriding the slot.
  assert.match(css, /\.art-collection \{ display: grid; grid-template-columns: repeat\(4, minmax\(0, 1fr\)\); grid-auto-flow: row dense;/)
  assert.doesNotMatch(css, /\.work-(?:small|offset|wide)\b/)
  // Every work renders, in file order, through the one shared card.
  assert.match(pagesSource, /artworks\.map\(\(work\) => <WorkCard key=\{work\.slug\} work=\{work\} \/>\)/)
  // Two per row on a tablet, one per row on a phone.
  assert.match(css, /@media \(min-width: 768px\) and \(max-width: 1023px\) \{[\s\S]*?\.art-collection \{ grid-template-columns: repeat\(2, minmax\(0, 1fr\)\);/)
  assert.match(css, /@media \(max-width: 767px\) \{[\s\S]*?\.art-collection \{ grid-template-columns: 1fr;/)
  // The collection is the front page, so the page carries twelve placeholder works.
  assert.equal(site.artworks.length, 12)
  // The hero opens the page: it is composed before the collection, so the opening statement
  // and portrait lead and the grid follows.
  assert.ok(pagesSource.indexOf('className="me-hero"') < pagesSource.indexOf('className="art-collection'), 'the hero should be composed above the collection')
  // The Art heading and its subtitle are gone: the front page carries no separate
  // `.page-heading`, and the hero statement is the page's own heading.
  const artPage = pagesSource.slice(pagesSource.indexOf('export function ArtPage'), pagesSource.indexOf('export function ArtworkPage'))
  assert.doesNotMatch(artPage, /page-heading/)
  assert.match(artPage, /<h1 id="page-title" tabIndex=\{-1\} className="portrait-lead">\{hero\.portrait\.lead\}<\/h1>/)
  assert.doesNotMatch(siteSources.pages.art, /^heading:/m)
  assert.doesNotMatch(siteSources.pages.art, /^introduction:/m)
  // The portrait and its greeting lead on the left, with the resume panel beside them on
  // the right, and the collection follows.
  assert.match(artPage, /className="portrait enter"/)
  assert.match(artPage, /\{hero\.resumeUrl && <ResumePanel url=\{hero\.resumeUrl\} \/>\}/)
  // The PDF is drawn as its own pages in a scrollable frame, not left to the browser's
  // viewer, whose toolbar and thumbnail chrome cannot be embedded without them.
  assert.match(artPage, /<PdfViewer url=\{url\} label="Resume, as a PDF" \/>/)
  assert.doesNotMatch(artPage, /<object|<iframe/)
  // The frame keeps the page's own 8.5 x 11 letter ratio and is held to about a quarter of
  // the page, so the resume reads as a small document rather than a second column.
  assert.match(css, /\.resume-panel \{ grid-column: 10 \/ 13;/)
  assert.match(css, /\.resume-viewer \{ position: relative; aspect-ratio: 8\.5 \/ 11; overflow: auto;/)
  // The quick links to Music and Research under the hero are gone with their settings.
  assert.doesNotMatch(pagesSource, /other-registers|showRegisters|teaserOrder|art\.teasers/)
  assert.doesNotMatch(css, /\.other-registers/)
  assert.doesNotMatch(siteSources.site, /teaser_order|show_registers/)
  assert.doesNotMatch(siteSources.pages.art, /teasers:/)
})

test('the typographic look is a single documented switch on the spine', () => {
  // The one line an editor changes, with both values named beside it.
  assert.ok(siteSources.site.includes('look:'), 'site.yaml should document the look setting')
  assert.ok(siteSources.site.includes('classic | times'), 'site.yaml should name both looks')
  // It reaches the document, and the stylesheet carries the alternative look.
  assert.match(appContent, /appearance/)
  assert.match(app, /document\.documentElement\.dataset\.look = appearance\.look/)
  assert.match(css, /:root\[data-look='times'\] \{/)
  assert.match(css, /--font-sans: 'Times New Roman'/)
  // "classic" is the designed default, so the shipped file opts into no alternative.
  assert.equal(site.appearance.look, 'classic')
  assert.equal(parseSite(withFile('site', editLine(siteSources.site, /^  look: \w+$/m, '  look: times'))).appearance.look, 'times')
})

test('a look outside the documented set fails with the file, the setting, and the allowed values', () => {
  const broken = withFile('site', editLine(siteSources.site, /^  look: \w+$/m, '  look: serif'))
  assert.throws(() => parseSite(broken),
    /content\/site\.yaml → appearance\.look: must be one of: classic, times \(found "serif"\)/)
  const stray = withFile('site', editLine(siteSources.site, /^  look: \w+$/m, '  looks: times'))
  assert.throws(() => parseSite(stray), /content\/site\.yaml → appearance: has an unknown setting "looks"/)
})

test('a choice outside the documented set fails with the file, the setting, and the allowed values', () => {
  const broken = withFile('site', editLine(siteSources.site, /copy_side: \w+/, 'copy_side: centre'))
  assert.throws(() => parseSite(broken),
    /content\/site\.yaml → layout\.detail\.copy_side: must be one of: left, right \(found "centre"\)/)
})

test('a misspelled setting is reported instead of being silently ignored', () => {
  const broken = withFile('site', editLine(siteSources.site, /show_topics: (?:true|false)/, 'show_topic: true'))
  assert.throws(() => parseSite(broken), /content\/site\.yaml → layout\.music: has an unknown setting "show_topic"/)
  const strayKey = withFile('art', editLine(siteSources.pages.art, /^hero:/m, 'heros:'))
  assert.throws(() => parseSite(strayKey), /content\/pages\/art\.yaml → the page: has an unknown setting "heros"/)
})

test('an emptied required field names the file and setting to fill in', () => {
  const broken = withFile('art', editLine(siteSources.pages.art, /^    lead: .*/m, '    lead:'))
  assert.throws(() => parseSite(broken), /content\/pages\/art\.yaml → hero\.portrait\.lead: cannot be left empty/)
})

test('the resume link is optional and can be emptied from the file', () => {
  assert.equal(site.pages.art.hero.resumeUrl, '/media/resume.pdf')
  // The panel renders only when the file supplies a PDF, so emptying the setting drops it.
  assert.match(pagesSource, /\{hero\.resumeUrl && <ResumePanel url=\{hero\.resumeUrl\} \/>\}/)
  const empty = withFile('art', editLine(siteSources.pages.art, /^  resume_url: .*/m, '  resume_url:'))
  assert.equal(parseSite(empty).pages.art.hero.resumeUrl, undefined)
})

test('the recording slots and their companion are gone from the Music page', () => {
  // The page is the orchestra film with its side text, the films under it, and the
  // photograph strip. The stock slots and the companion still are no longer composed,
  // and the page's content file carries no companion block to feed them.
  assert.doesNotMatch(pagesSource, /recording-collection|collection-companion|recording-empty/)
  assert.doesNotMatch(siteSources.pages.music, /^companion:/m)
  assert.doesNotMatch(css, /\.recording|collection-companion/)
})

test('a paper panel must point at something another file defines', () => {
  // `[ \t]+` rather than `\s+`: with the `m` flag a JavaScript `^` also matches after a
  // `\r`, so `\s+` would swallow the line break itself and quietly edit the line above.
  const wrongPaper = withFile('research', editLine(siteSources.pages.research, /^[ \t]+paper: \S+/m, '  paper: poject'))
  assert.throws(() => parseSite(wrongPaper),
    /content\/pages\/research\.yaml → project\.paper: points at a paper named "poject"/)
  // Two works sharing a slug, whatever the works are called today.
  const slugs = [...siteSources.media.artworks.matchAll(/^\s+(?:- )?slug: (\S+)$/gm)].map((match) => match[1])
  assert.ok(slugs.length >= 2, `expected at least two works, found ${slugs.length}`)
  const duplicate = withFile('artworks', siteSources.media.artworks.replace(`slug: ${slugs[1]}`, `slug: ${slugs[0]}`))
  assert.throws(() => parseSite(duplicate), /content\/media\/artworks\.yaml → artworks: uses the same slug twice/)
})

test('the GHP pair stays an unequal pair of exactly two images', () => {
  // Deck blocks share the `images:` key, so edit from the ghp section on to be sure the
  // extra image lands in the pair and not in the project's deck above it.
  const start = siteSources.pages.research.indexOf('\nghp:')
  assert.ok(start > -1, 'research.yaml should still contain a ghp section')
  const ghp = editLine(siteSources.pages.research.slice(start), /^(  images:)$/m,
    '$1\n    - image: /media/portrait.jpg\n      alt: An extra reference image.')
  const extra = withFile('research', siteSources.pages.research.slice(0, start) + ghp)
  assert.throws(() => parseSite(extra), /content\/pages\/research\.yaml → ghp\.images: needs exactly two images/)
})

test('third-party notices are gone while the museum source link and the images stay', () => {
  // Comments may still explain the fields; the visible content must not carry notices.
  const visible = allFiles.split('\n').filter((line) => !line.trimStart().startsWith('#')).join('\n')
  for (const notice of ['public-domain', 'public domain', 'stock reference', 'Preview photograph', 'demo footage', 'not a work by Yujin', 'CC0 flower']) {
    assert.equal(visible.includes(notice), false, `"${notice}" should no longer appear in the content`)
  }
  assert.equal(site.pages.art.note, undefined)
  assert.equal(site.pages.detail, undefined)
  assert.equal(site.pages.music.creditNote, undefined)
  // The images and the museum source links they came from are untouched.
  assert.ok(site.artworks.filter((work) => work.reference).every((work) => work.imageId && work.source?.startsWith('https://')))
  assert.match(pagesSource, /Museum source/)
  assert.match(css, /\.source-note \{/)
  assert.doesNotMatch(css, /reference-note|collection-note|preview-credits/)
  assert.doesNotMatch(pagesSource, /Public-domain reference/)
})

test('every local media path in the content files exists in public/', () => {
  const local = [...allFiles.matchAll(/^\s*(?:- )?(?:image|poster|src|url|resume_url):\s*(\/media\/[^\s]+)$/gm)].map((match) => match[1])
  // The portrait, the resume, and the two paper placeholders.
  assert.ok(local.length >= 4, `expected local media paths, found ${local.length}`)
  for (const path of local) {
    assert.ok(existsSync(new URL(`../public${path}`, import.meta.url)), `${path} should exist in public/`)
  }
})

// The copy itself is the editor's to change, so this asserts the shape of the shipped
// content rather than the placeholder wording that happened to be in it.
test('every page still parses to real content, and the fixed wording survives', () => {
  const headings = {
    music: site.pages.music.heading,
    research: site.pages.research.heading,
    notFound: site.pages.notFound.heading,
  }
  for (const [name, heading] of Object.entries(headings)) assert.ok(heading.trim().length > 0, `${name} should have a heading`)
  for (const [name, page] of [['music', site.pages.music], ['research', site.pages.research]] as const) {
    assert.ok(page.introduction.trim().length > 0, `${name} should have an introduction`)
  }
  // The portrait's greeting is the front page's heading now, above the collection, so
  // there is no separate "Art" page heading to sit above it.
  assert.ok(site.pages.art.hero.portrait.lead.trim().length > 0)
  assert.ok(site.pages.art.hero.portrait.caption.trim().length > 0)
  assert.ok(site.pages.art.hero.portrait.width > 0 && site.pages.art.hero.portrait.height > 0)
  assert.ok(site.pages.art.hero.resumeUrl?.startsWith('/media/'))
  assert.ok(site.name.trim().length > 0)
  for (const message of Object.values(site.messages)) assert.ok(message.trim().length > 0)
  // The brief fixes the GHP title, and the pair stays two images.
  assert.equal(site.pages.research.ghp.title, 'GHP')
  assert.equal(site.pages.research.ghp.images.length, 2)
  // A page's paper panel resolves to a real entry.
  assert.ok(site.pages.research.project.paper in site.papers)
  assert.ok(site.pages.research.ghp.paper in site.papers)
})
