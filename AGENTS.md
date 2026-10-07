# Agent guide

Frontend-only Vite + React + TypeScript portfolio. Read [README.md](README.md) for
architecture and [notes/design_plan.md](notes/design_plan.md) for the design contract.
Use `npm` (`package-lock.json` is the lockfile).

## Verification: prefer code checks over the preview

Run these first. They are fast and deterministic, and they are the primary evidence
that a change works:

```bash
npm test                 # node --test, ~0.3s
npx tsc -b --noEmit
npm run lint             # oxlint
```

**Avoid interacting with preview screenshots when applicable.** In this workspace the
screenshot path is slow and unreliable: captures return stale or alternating frames
from earlier in the session, requests can fail with "no frames" because the webview is
not compositing, `requestAnimationFrame` stalls in background tabs, evaluations and
wheel/scroll actions hit their timeouts, and capture results lag DOM changes. Time
spent retrying them is almost always wasted.

When a change can be verified another way, do that instead:

- Layout, geometry, layering, overflow: one short read-only evaluation returning
  `getBoundingClientRect()`, computed styles, and `scrollWidth` vs `clientWidth`.
  A single evaluation beats a screenshot.
- Shader and WebGL behavior: check `data-ready`, console errors, canvas backing size,
  and uniforms through `getComputedStyle`. Do not chase pixels.
- Visual taste ("does it look good"): ask the user to glance at the Preview tab, or
  say plainly that you could not review it visually and name the knobs to tune.

If a visual capture is genuinely unavoidable, take at most one or two of them and stop.
Never retry in a loop, and never detach, hide, or restyle page elements to force a
capture. Leave the preview tab and its dev server running when you finish.

If you do need the browser: start a dev server on a free port, find its listener pid
(`netstat -ano | grep :<port>`), then register that url and pid as the preview. Lenis
owns scrolling, so `window.scrollTo` can be fought by it — use wheel input instead.

## Conventions

- Tests encode design decisions, including source-level policy tests
  ([tests/atmosphere.test.ts](tests/atmosphere.test.ts),
  [tests/surface.test.ts](tests/surface.test.ts)) that assert CSS and GLSL conventions.
  When a change alters a convention, update those assertions as part of the change
  rather than deleting them.
- Document user-visible work in [README.md](README.md); the shader and surface sections
  describe intent, budgets, and knobs.
- Motion is unconditional, by explicit product decision: never gate an animation, transition,
  view transition, autoplay, or cursor effect on `prefers-reduced-motion`, and never add a
  blanket rule that switches motion off. Nothing in JavaScript reads the preference either.
  Motion still degrades on capability — no IntersectionObserver, no `animation-timeline:
  scroll()`, no View Transition API, no WebGL, coarse pointer — but never on the visitor's
  operating-system animation setting. [tests/surface.test.ts](tests/surface.test.ts) enforces
  this.
- Layer contract: atmosphere/ambient `-1`, content `0`, header `10`, contextual `20`,
  dialogs `30`, cursor `40`. Background treatments stay behind content with
  `pointer-events: none`.
- Colors come from the semantic tokens in [src/index.css](src/index.css). Never place
  effects over artwork or text.
- **Content is YAML, and the YAML is the source of truth.** The runtime *and* the tests
  read the same files in [content/](content): the spine in `site.yaml`, the media collections
  (`artworks.yaml`, `recordings.yaml`, `papers.yaml`) under `media/`, one file per page under
  `pages/`, and every colour in `theme.yaml`. They
  are parsed by [site-content.ts](src/lib/site-content.ts) and
  [theme-content.ts](src/lib/theme-content.ts) on the vocabulary in
  [content-schema.ts](src/lib/content-schema.ts), imported with `?raw` by
  [content.ts](src/content.ts), and loaded in tests through
  [tests/support/site.ts](tests/support/site.ts) — so a test can never assert copy the site
  does not render. Put new copy there rather than as a literal in a component; a parser
  error names the file and the field (`content/pages/home.yaml → portrait.alt: ...`), and
  cross-file references check both sides (`featured_artwork`, `papers` keys). Grow the
  `layout` vocabulary with a documented option plus its CSS instead of a per-page one-off.
  A colour belongs in `theme.yaml`, never in a component or a stylesheet block outside the
  documented first-paint fallback. Interface action labels stay in code: the design
  contract fixes one name per action. One exception to "content lives in `content/`": the
  page set is closed in code (`PAGE_FILES`, `SiteSources`, the `parseSite` call), so a new
  page is a code change, not just a new file.
- Prefer editing existing files, and keep diffs minimal. Do not commit, push, or open a
  pull request unless the user asks.
