import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const css = readFileSync(new URL('../src/index.css', import.meta.url), 'utf8')
const app = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8')
const cursor = readFileSync(new URL('../src/components/Experience.tsx', import.meta.url), 'utf8')

test('the accent is a registered color that drifts per destination', () => {
  assert.match(css, /@property --accent \{[^}]*syntax: '<color>'[^}]*inherits: true/)
  assert.match(css, /:root \{[^}]*transition: --accent /)
  // One source of truth per identity, reusing the same value for the page and the cursor.
  assert.match(css, /--accent-me: #[0-9a-f]{6};/)
  assert.match(css, /--accent-art: #[0-9a-f]{6};/)
  assert.match(css, /--accent-music: #[0-9a-f]{6};/)
  assert.match(css, /--accent-research: #[0-9a-f]{6};/)
  assert.match(css, /:root\[data-page='art'\] \{ --page-accent: var\(--accent-art\); --page-accent-ink: var\(--accent-ink-dark\); \}/)
  assert.match(css, /:root\[data-page='music'\] \{ --page-accent: var\(--accent-music\); \}/)
  assert.match(css, /:root\[data-page='research'\] \{ --page-accent: var\(--accent-research\); \}/)
  // Artwork detail pages keep the collection's identity.
  assert.match(app, /dataset\.page = accentKey\(route\.page\)/)
})

test('the cursor previews the accent of the destination a hovered link leads to', () => {
  // Each destination carries the accent and its ink together, so a preview on a light-accent
  // page cannot inherit the wrong ink.
  assert.match(css, /\.experience-cursor\[data-accent='me'\] \{ --accent: var\(--accent-me\); --accent-ink: var\(--accent-ink-light\); \}/)
  assert.match(css, /\.experience-cursor\[data-accent='art'\] \{ --accent: var\(--accent-art\); --accent-ink: var\(--accent-ink-dark\); \}/)
  assert.match(css, /\.experience-cursor\[data-accent='music'\] \{ --accent: var\(--accent-music\); --accent-ink: var\(--accent-ink-light\); \}/)
  assert.match(css, /\.experience-cursor\[data-accent='research'\] \{ --accent: var\(--accent-research\); --accent-ink: var\(--accent-ink-light\); \}/)
  // Unknown or external targets clear the attribute, so the page accent stands.
  assert.match(cursor, /element\.dataset\.accent = linkAccent\(next\?\.closest\('a\[href\]'\)\?\.getAttribute\('href'\)\) \?\? ''/)
  // --accent is a registered property with a fixed initial-value, so a cursor that falls
  // back by redeclaring nothing would ease from that value instead of the colour on screen.
  // It therefore always declares its own accent, defaulting to the page's.
  assert.match(css, /\.experience-cursor \{ --accent: var\(--page-accent\); --accent-ink: var\(--page-accent-ink\); \}/)
  assert.match(css, /--page-accent: var\(--accent-me\);\s*--accent: var\(--page-accent\);/)
  assert.match(css, /--page-accent-ink: var\(--accent-ink-light\);\s*--accent-ink: var\(--page-accent-ink\);/)
  // A light accent carries dark ink so the hint label stays legible on the disc.
  assert.match(css, /--accent-ink-light: #[0-9a-f]{6};/)
  assert.match(css, /--accent-ink-dark: #[0-9a-f]{6};/)
  assert.match(css, /@property --accent-ink \{[^}]*syntax: '<color>'[^}]*inherits: true/)
  assert.match(css, /\.cursor-label \{ position: relative; color: var\(--accent-ink\);/)
  assert.match(css, /\.cursor-disc \{[^}]*border: 1px solid color-mix\(in srgb, var\(--accent-ink\) 35%, transparent\);/)
})

test('the custom cursor survives a route change, including a work transition', () => {
  // Pointer tracking owns no route state. Re-running this effect on navigation would hide the
  // cursor through its cleanup, leaving it hidden until the next pointer move, which is the
  // whole 760ms artwork animation.
  assert.doesNotMatch(cursor, /\}, \[pathname/)
  assert.doesNotMatch(cursor, /ExperienceCursor\(\{ pathname \}\)/)
  assert.doesNotMatch(app, /<ExperienceCursor pathname=/)
  // An unresolved point is not the pointer leaving: a View Transition briefly reports nothing
  // under it, and treating that as a departure is what hid the cursor mid-animation.
  assert.match(cursor, /const syncAt = \(atX: number, atY: number\) => \{/)
  assert.match(cursor, /if \(at\) updateTarget\(at\)/)
  assert.doesNotMatch(cursor, /updateTarget\(document\.elementFromPoint/)
  assert.match(cursor, /const syncHover = \(\) => \{ if \(visible\) syncAt\(lastX, lastY\) \}/)
  assert.match(cursor, /const up = \(\) => \{ press\.set\(1\); syncAt\(lastX, lastY\) \}/)
  // The named cursor group is excluded from the snapshot cross-fade, so it never blinks.
  assert.match(css, /::view-transition-old\(interaction-cursor\) \{ display: none; \}/)
  assert.match(css, /::view-transition-new\(interaction-cursor\) \{ animation: none;/)
})

test('the atmosphere divides the hero from the section around it, not a hairline', () => {
  // The canvas is document-anchored and ends at the hero's bottom, so its fade is the edge.
  const hero = /^\.me-hero \{([^}]+)\}/m.exec(css)![1]
  assert.doesNotMatch(hero, /border/)
  // The hero is a self-contained band above the collection, not a full first viewport.
  assert.match(hero, /position: relative/)
  assert.doesNotMatch(hero, /min-height: calc\(100dvh/)
  assert.match(css, /\.me-atmosphere \{[^}]*inset: 0 0 auto; height: 100dvh;/)
})

test('the modal dialog stays centred instead of anchoring to the top left', () => {
  // A modal dialog is laid out inside an `inset: 0` box and centres itself with auto
  // margins, so a blanket `margin: 0` (Tailwind's preflight) pins it to the top left.
  const base = /^dialog \{([^}]+)\}/m.exec(css)![1]
  assert.match(base, /margin: auto;/)

  // The inspector keeps an explicit box, so the centring margins are what place it.
  assert.match(css, /\.inspector \{ width: calc\(100vw - 48px\); height: calc\(100dvh - 48px\); max-width: 1600px; max-height: none;/)
})

test('ambient wash and grain stay behind content and never intercept input', () => {
  for (const rule of [css.match(/body::before \{([^}]+)\}/)![1], css.match(/body::after \{([^}]+)\}/)![1]]) {
    assert.match(rule, /position: fixed/)
    assert.match(rule, /pointer-events: none/)
    assert.match(rule, /z-index: -1/)
    assert.doesNotMatch(rule, /mix-blend-mode|backdrop-filter/)
  }
  // The wash carries colour rather than a tinted gray: the page's own accent plus the two
  // shared ambient hues, so each tab sits in the same light while the accent still drifts.
  const wash = css.match(/body::before \{([^}]+)\}/)![1]
  assert.match(wash, /var\(--accent\)/)
  assert.match(wash, /var\(--ambient-cool\)/)
  assert.match(wash, /var\(--ambient-warm\)/)
  // Grain is theme-aware noise, not a dark scrim over the page.
  assert.match(css, /body::after \{[^}]*background: var\(--text\)/)
  assert.match(css, /mask-image: url\("data:image\/svg\+xml/)
})

test('scroll hairline is scroll-driven, and rests at zero where the timeline is unsupported', () => {
  const rule = css.match(/\.scroll-progress \{([^}]+)\}/)![1]
  assert.match(rule, /transform: scaleX\(0\)/)
  assert.match(rule, /pointer-events: none/)
  assert.match(css, /@supports \(animation-timeline: scroll\(\)\)/)
  assert.match(css, /animation-timeline: scroll\(root block\)/)
  assert.match(app, /<div className="scroll-progress" aria-hidden="true" \/>/)
})

test('motion runs for every visitor instead of following the OS animation setting', () => {
  // The choreography is part of the design, so it is deliberately not gated on the operating
  // system's animation setting: no `prefers-reduced-motion` query anywhere in the stylesheet,
  // and no blanket rule that switches animation and transition off. The comment that records
  // this decision lives in the stylesheet too, so the query form is what is checked.
  assert.doesNotMatch(css, /prefers-reduced-motion\s*:/)
  assert.doesNotMatch(css, /\*, \*::before, \*::after \{ animation/)
  assert.match(css, /\n\.enter \{ animation: enter 600ms var\(--ease-out-expo\) both; \}/)
  // The one blanket rule left belongs to the artwork handoff, which replaces entrance
  // effects with the snapshot choreography for the lifetime of that route.
  assert.match(css, /\.transition-static, \.transition-static \* \{ animation: none !important; \}/)
  // Nothing in JavaScript reads the preference either: the app's reveal observer, the cursor,
  // image arrivals, playback, the atmosphere, and the router all run unconditionally.
  for (const file of ['src/App.tsx', 'src/components/Experience.tsx', 'src/components/Media.tsx',
    'src/components/VideoPlayer.tsx', 'src/components/PhotoStrip.tsx', 'src/components/MeAtmosphere.tsx', 'src/lib/router.ts']) {
    assert.doesNotMatch(readFileSync(new URL(`../${file}`, import.meta.url), 'utf8'), /prefers-reduced-motion\s*:/, file)
  }
  // The pointer and autoplay policies take capability and safety as inputs, not motion.
  assert.doesNotMatch(readFileSync(new URL('../src/lib/interaction-policy.ts', import.meta.url), 'utf8'), /reducedMotion/)
  assert.doesNotMatch(readFileSync(new URL('../src/lib/media-policy.ts', import.meta.url), 'utf8'), /reducedMotion/)
})

test('the document scrollbar is hidden so the scroll hairline is the only affordance', () => {
  // Only where the custom hairline can actually be driven; otherwise the scrollbar stays.
  assert.match(css, /@supports \(animation-timeline: scroll\(\)\) \{\s*\n\s*html \{ scrollbar-width: none; \}/)
  assert.match(css, /html::-webkit-scrollbar \{ display: none; \}/)
  // No reserved gutter: the layout width matches the viewport so full-bleed layers stay exact.
  assert.doesNotMatch(css, /scrollbar-gutter/)
})

test('page arrivals settle on the transition snapshot, never on live elements', () => {
  assert.match(css, /@keyframes page-in \{ from \{ opacity: 0; transform: translateY\(10px\); filter: blur\(8px\); \} \}/)
  assert.match(css, /::view-transition-new\(root\) \{ animation: 400ms [^}]*page-in; \}/)
})

test('the inspector uses the one native modal implementation', () => {
  const media = readFileSync(new URL('../src/components/Media.tsx', import.meta.url), 'utf8')
  const hook = readFileSync(new URL('../src/components/useModalDialog.ts', import.meta.url), 'utf8')
  // Open, scroll lock, focus return, Escape, and backdrop close live in one place.
  assert.match(hook, /element\?\.showModal\(\)/)
  assert.match(hook, /document\.body\.style\.overflow = 'hidden'/)
  assert.match(hook, /previous\?\.focus\(\{ preventScroll: true \}\)/)
  assert.match(hook, /event\.target === event\.currentTarget/)
  // The inspector uses it and does not reimplement it.
  assert.match(media, /useModalDialog\(onClose\)/)
  assert.doesNotMatch(media, /showModal/)
  // The header's resume dialog is gone: the resume is page content in an embedded PDF now.
  assert.doesNotMatch(app, /InfoDialog|info-dialog|useModalDialog/)
  // It keeps the native element, which is what gives it focus trapping and an inert backdrop.
  assert.match(media, /<dialog ref=\{ref\} className="inspector" \{\.\.\.dialogProps\}/)
})

test('collection surfaces draw a work through one shared image component', () => {
  const pages = readFileSync(new URL('../src/pages.tsx', import.meta.url), 'utf8')
  const media = readFileSync(new URL('../src/components/Media.tsx', import.meta.url), 'utf8')
  // One place sets the work's sources, dimensions, and transition tag for every surface.
  assert.match(pages, /function WorkImage\(/)
  assert.match(pages, /linked workSlug=\{work\.slug\}/)
  assert.equal(pages.match(/className="linked-image"/g)?.length, 1)
  // A failed linked image explains itself from a prop, not from guessing at its class string.
  assert.doesNotMatch(media, /className\.includes\('linked-image'\)/)
  assert.match(media, /\{linked \? <span>Open the work for details\.<\/span> :/)
})
