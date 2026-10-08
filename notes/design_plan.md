# Yujin Kim: design plan

## Design read

Reading this as: an art portfolio for curators, collectors, collaborators, and visually adventurous visitors, with an experimental Awwwards-level language, leaning toward an artwork-led spatial experience rather than a conventional portfolio grid.

**Concept: Four registers, one mind.**

Me, Art, Music, and Research are four ways of encountering the same person: presence, material, time, and inquiry. The site should feel like a small exhibition with four rooms, not a creative-agency template with different headings.

**The distinctive move:** change the visitor's distance from the work. Start with a whole image, offer a separate close-up, then carry that exact image into its detail view. Surprise comes from scale, framing, silence, and continuity, not from decorating the artwork.

This document is a design and implementation plan, not a claim that the interface has been built or tested. Awwwards is the ambition, not a guaranteed award.

## Brief, scope, and current-state audit

The content contract is [structural_requirements.md](notes/structural_requirements.md). Its four top-level pages, labels, required placements, and content take priority over visual experimentation.

| Existing condition | Design consequence |
| --- | --- |
| The application renders only a placeholder. | Treat this as greenfield visual design, not a brand-preservation redesign. |
| The requirements identify Yujin Kim and four pages. | Use the actual name. Keep Me, Art, Music, and Research. Do not turn the site into a single landing page. |
| No portrait, artwork, recordings, papers, or resume are supplied in `public`. | Plan for real assets. Never invent Yujin's artwork, education, achievements, research findings, or biography. |
| The README describes an Atelier generative-art starter. | Treat that as scaffold context, not proof that Yujin makes generative art. Do not keep Atelier as the artist's identity. |
| React 19, Vite 8, TypeScript, and Tailwind v4 are installed. | Keep the existing stack. No framework migration. |
| Three.js, React Three Fiber, and Drei are installed but unused. | Availability is not a creative reason to add a 3D room. Keep them out of the critical path. |
| The starter uses Inter, Space Grotesk, violet-biased neutrals, and two warm accents. | These are unused starter tokens, not established brand assets. Replace deliberately during implementation. |
| Fonts currently load through Google Fonts links. | Self-host licensed font files before production. |
| No content routes, analytics, real logo, or SEO history are evidenced by the supplied files. | Define routing and metadata intentionally; do not claim a full live-site or search-ranking audit. |

**Scope now:** this plan only. No app changes, dependency installs, generated artwork, or deployment.

**Working assumptions:** the portfolio serves both exploratory viewing and fast professional review; Me is the default entry; the artwork itself may contain any colors; published biographical and project facts must be supplied or confirmed.

## Creative settings

- **DESIGN_VARIANCE: 9.** Strong offsets, unequal image scales, deliberate empty zones, and a different composition on each page. DOM order remains understandable.
- **MOTION_INTENSITY: 8.** One signature image-to-detail transition, coordinated page entrances, and restrained inspection feedback. This is selective choreography, not constant movement. If the signature cannot be made robust, reduce to 3 rather than shipping unstable motion.
- **VISUAL_DENSITY: 3.** Artwork and media dominate. Facts become denser only where a paper or artwork detail needs them.
- **Foundation:** bespoke native CSS and Tailwind v4. This is an aesthetic direction, not an official design system. No UI kit is needed for the planned interface.

### What makes it ownable

1. The artist's name is quiet and fixed in its required position while the work sets the scale.
2. Art is encountered at two distances: complete object and material detail. The interface never paints effects over it.
3. Music uses duration and stillness rather than translating sound into a decorative waveform.
4. Research uses the rhythm of an illustrated publication, not a SaaS feature section.
5. Navigation stays plain. Experimental composition does not require experimental wayfinding.

### Directions deliberately rejected

- A walkable WebGL museum: too much navigation cost before seeing a single work.
- An infinite draggable mood board: weak on touch, keyboard use, deep links, and professional scanning.
- Giant manifesto type, scrolling slogans, decorative numbering, or local-time strips: they promote the website over the artist.
- A cream-and-serif gallery template: predictable and disconnected from the brief.
- Image trails, RGB glitches, tilt cards, custom cursors, or artificial grain: visual interference without a content purpose.

## Shared visual system

### Palette and themes

Use CSS semantic variables with one page-level theme decision. Follow system preference initially and offer an accessible System / Light / Dark control. Persist only a deliberate user choice. No section switches theme independently.

| Token | Light | Dark | Role |
| --- | --- | --- | --- |
| `--surface` | `#eeeff0` | `#17191c` | Page background |
| `--surface-raised` | `#e3e5e7` | `#23262b` | A real media control or document panel |
| `--text-primary` | `#17191c` | `#eeeff0` | Names, titles, body, active controls |
| `--text-secondary` | `#525861` | `#afb5bf` | Captions and secondary facts |
| `--accent` | `#8d4874` | `#8d4874` | Muted plum-purple selection mark and active underline |
| `--ambient-cool` | `#2c3f7e` | `#3a5296` | The background wash's cool underpainting |
| `--ambient-warm` | `#8a5570` | `#b06a92` | The background wash's warm field |
| `--focus` | `#17191c` | `#eeeff0` | High-contrast focus outline |

The accent stays identical across pages and themes. Because this accent is not sufficiently contrasting for every text or control use in dark mode, **do not use it for body text, essential icons, button fills, or the sole focus indicator**. Active navigation also uses weight and `aria-current`; color is never the only signal.

Primary buttons use `--text-primary` as their surface and `--surface` as their label. Secondary controls use readable text plus a visible boundary. Verify every actual token pairing during implementation; this palette table is not an accessibility test report.

Artwork colors are not interface accent colors. Never recolor a painting, invert a photograph in dark mode, or apply a global filter to media.

### Typography

- **Display and body:** self-hosted Space Grotesk, already named in the starter. Its geometric construction supports art, music, and research without pretending the site is a fashion magazine. Use regular and medium weights, not extreme heavy headings everywhere.
- **Fallback:** `ui-sans-serif, system-ui, sans-serif` with metric adjustments where practical.
- No serif accent words, random italic inserts, text scrambling, or stretched letterforms.
- Desktop name: roughly 48-72px, scaled with `clamp()` and viewport height. Section headings: 32-48px. Body: 16-18px with 1.5-1.65 line-height. Captions: at least 14px.
- Headlines use natural wrapping, no forced poetic line breaks. Desktop first-view headlines never exceed two lines.
- Keep reading text within 60-65 characters per line. Scientific notation, citations, and paper titles retain their actual meaning and spelling.
- No section-heading eyebrows are planned. Artwork title/year captions below images are content, not decorative labels.

### Geometry and rhythm

- One shape system: sharp corners, radius 0 for buttons, images, document panels, and inputs. Circular native media affordances are not an excuse to introduce pill-shaped containers.
- Maximum main width: 1400px. On wider displays, gain negative space rather than inflate everything.
- Desktop: 12-column grid, 24px gaps, fluid 32-64px outer gutters. Navigation height 64-72px, never above 80px.
- Tablet: 8 columns with 24px gutters. Below 768px: strict single-column content, 16-20px gutters, no negative-margin overlap or absolute-positioned primary content.
- Use deliberate 8px-based spacing steps. Large gaps mark changes of attention, not arbitrary empty acreage.
- Hairlines organize facts or delimit a real document panel. No crosshair grids or borders around every item.
- System layers: content 0, sticky navigation 10, contextual description 20, dialog 30. Add a documented scale in implementation rather than arbitrary z-index escalation.

## Information architecture and navigation

Keep **four top-level destinations: Me, Art, Music, Research**. The active page is unmistakable; the labels never turn into abstract symbols.

Proposed implementation paths are `/`, `/art`, `/music`, and `/research`, with `/art/:slug` for subordinate artwork details. These are proposals for a placeholder app, not authorization to change any existing deployed URLs. Verify hosting fallback and any live URLs before implementing.

- At desktop, the four links stay in one line at the top right. The artist identity occupies the left. No animated navigation dock or oversized menu.
- On Me, the required upper-left name and resume link form one identity block. Do not add a duplicate artist wordmark next to it.
- At narrow widths, use a compact identity row followed by one line of four page links. This needs no hamburger and keeps the complete site visible.
- The theme control can sit in the shared footer to avoid crowding the mobile navigation.
- Each route has one H1, a skip-to-content link, a meaningful document title, and real link semantics. Back/forward navigation restores scroll and selected artwork where possible.
- Link vocabulary is fixed: **Resume**, **Inspect work**, **Previous work**, **Next work**, **Open paper**, **Play sound**, **Mute**, **Pause**, **Play**, **Retry**, **Back to Art**. Do not introduce several marketing labels for the same action.
- Contact information appears only if supplied. No invented email, availability claim, or contact form.

## Page choreography

### Me: presence, not a sales pitch

**Composition:** an upper-left identity block and an offset right portrait, with an intentional unoccupied center. The name remains at the top left as required, not pushed below a cinematic intro.

```text
Yujin Kim                                  Me  Art  Music  Research
Resume

                                  [ portrait photograph ]
                                  [ text directly below ]

[ one concise introduction, only if supplied ]
```

- Preserve the exact visible name **Yujin Kim**. Put the resume link immediately beneath it.
- Portrait occupies roughly columns 8-12 at desktop; its text stays beneath the photograph, never in a floating corner elsewhere.
- Let the portrait's actual framing determine its ratio. Avoid a generic circular headshot. No masking of the face or pretend film credit.
- Reserve the left body area for a short supplied introduction, not a fabricated artist statement. A possible placeholder instruction is “Add a concise introduction”; this is not final public copy.
- The first viewport contains navigation, name, resume, portrait, and its short caption or introduction. Plan image height and text together, using `min-height: 100dvh` with responsive sizing rather than a locked screen height.
- Entrance: identity is immediately readable; portrait and its caption settle through a small opacity/translation sequence. Purpose: establish person first, work second. No blank loading ceremony.
- **Mobile:** name, Resume, portrait, text, introduction in that order. The complete portrait is visible without sideways movement. On short screens, shorten only optional copy and media height; never make required content unreachable to force a viewport fit.

### Art: a collection at two distances

**Composition:** a featured whole-work image followed by an intentionally paced collection. Large pieces and small pieces alternate in scale, not in repetitive left/right marketing rows.

```text
Art
[ full featured artwork ]           [ separate close-up ]
[ title, year ]                      [ contextual description ]

              [ medium work ]
              [ title, year ]
[ smaller work ]                     [ tall work ]
[ title, year ]                      [ title, year ]

              [ wide work ]
              [ title, year ]
```

These slots illustrate rhythm, not a required number of artworks. Render exactly the supplied works; regroup if the count changes. An unoccupied layout zone is page whitespace, not a fake empty tile.

- Whole-work images preserve their intrinsic ratio and use containment when necessary. Only the clearly separated close-up intentionally crops.
- Every image is a real artwork link. Display title and year beneath it. Do not overlay tags or buttons across the artwork.
- The required **description widget** appears on hover and keyboard focus in a reserved adjacent caption/inspection area. It is anchored to the work, not to a custom cursor, and never obscures another piece.
- The widget contains the actual title, material, and one short description. Reserve its footprint so revealing it does not move the collection.
- Pointer inspection can select a supplied close-up in the separate inspection pane. Do not distort the original, auto-pan on mouse movement, or invent material texture.
- Keyboard focus receives equivalent information. On touch, a distinct Details disclosure reveals the description; tapping the image always opens the work. No first-tap trap.
- **Mobile:** one work per row in editorial order; title/year plus an expandable description underneath. The featured close-up becomes a second image below the whole work, not a tiny side pane.

#### Artwork detail: the signature registration shift

Clicking an artwork carries the same image from its collection position into a larger inspection view. The transition is a change of viewing distance, not a theatrical wipe.

- Use the native View Transition API when supported, with unique image transition names. Old/new media crossfade and translate/scale; no animated width/height and no custom canvas screenshot. Override the browser's default transition-group size interpolation if it conflicts with that transform-only contract.
- Fall back to ordinary navigation without any intermediate blank screen. Deep links work independently of the transition.
- At rest, show the full artwork, title, **year**, **material**, and **description**, followed by at least one genuine close-up when supplied.
- Facts sit in a compact, readable block. The full description can be longer than a landing-page paragraph because understanding the work is this view's purpose.
- Offer an explicit **Inspect work** action for the high-resolution image. Use a focus-managed dialog only if needed, with zoom buttons, keyboard pan, Escape to close, and an obvious close control. Never make drag or pinch the only way to inspect.
- **Back to Art** returns to the originating artwork and restores focus. Browser Back should do the same.
- **Previous work** and **Next work** walk the collection order from this view and wrap at both ends, so the chrome-free page never dead-ends. They share the bar **Back to Art** already owns and are never drawn over the work, which stays the inspect target. A single-work collection shows neither.
- The registration is instant wherever the View Transition API is absent. A browser that supports it animates for every visitor, whatever the operating system's animation setting says (see the motion contract).
- **Mobile:** title and essential facts remain near the image; description and close-ups follow vertically. No pinned facts column or overflowed horizontal stage.

### Music: time and attention

**Composition:** the films are the page's own subject, so they lead it at the full width of the window, one after another, each playing in place on the page. The note on the player's experience follows, then the recording slots, and a deck of photographs closes the page. This page feels temporal because the media has duration, not because typography loops.

```text
Music
[ performance film, full width, playing in place ]
[ second film, full width ]

[ note on the player's experience ]

[ companion ]                     [ first recording slot ]
[ second recording slot ]            [ third recording slot ]

[ photographs: one deck the reader presses through ]
```

- Meet the required autoplay behavior with `muted`, `playsInline`, and `autoplay`; include a poster and usable Pause/Play control. Autoplay with sound is not promised because browsers prohibit it in many cases.
- Start muted playback only when the first film is meaningfully visible. Pause offscreen and when the tab is hidden. Never autoplay the films below it.
- A film is listed before its file exists rather than after: an empty `src` keeps the still and says so honestly, and never shows a player with nothing behind it.
- The photographs close the page as one deck the reader presses through, wrapping at the end like every other deck. Each picture declares its own proportions, so a mixed set of upright and wide photographs is shown whole rather than cropped to one shape.
- **Play sound** is an explicit action. Unmuting or starting another recording pauses competing media. The site never has two audio sources playing together.
- With a detectable data-saving preference, start from the poster with manual Play. If autoplay is blocked, that same state appears naturally.
- Experience text uses real supplied facts. Do not assume instrument, conservatory, awards, repertoire authorship, or professional role from placeholder labels.
- Include the supplied examples **Bach prelude**, **viola**, and **concerto** once real media and accurate titles are available. Treat these as content requests, not verified recordings.
- Captions sit below media. Provide accessible playback names, duration when known, transcripts or captions where relevant, and performance context outside the image.
- **Mobile:** the films with their controls, then the note, then one media item per row, and the photographs close the page. No offscreen next slide as the only sign that more recordings exist.

### Research: evidence with visual weight

**Composition:** exactly three required sections, each with a different layout job. Preserve the literal title **GHP** without inventing its expansion.

```text
Research
[ major project image ]
[ title and description ]
[ paper panel with actual title and Open paper ]

GHP
[ unequal paired images ]
[ text ]
[ paper panel with actual title and Open paper ]

Smaller projects
[ compact illustrated project ]     [ compact illustrated project ]
[ further supplied projects only ]
```

- **First section:** primary projects with images and descriptions. Start with the strongest supplied visual. If there are multiple projects, use a short vertical sequence with real headings rather than duplicating generic cards. Place the research-paper widget alongside the relevant project at desktop and beneath it on mobile.
- **Second section, GHP:** unequal paired images, followed by text and the paper widget. One image may be evidence and the other context if the assets support that relationship. Do not fabricate a connection between them.
- **Third section:** smaller projects in a compact illustrated two-column collection, changing to one column below 768px. Each has an image, meaningful title, and short actual description. Render only the real count.
- Paper widgets are genuine document objects: actual title, authors/year if supplied, document type, and **Open paper**. Show file size only when known. Link to a PDF or authoritative publication page; do not build fake page rectangles or a simulated document screenshot.
- A real first-page thumbnail is optional. It is never a substitute for an accessible text link. Do not load PDF viewers on the initial page.
- No invented charts, citations, affiliations, impact percentages, or progress indicators. Clearly distinguish a prototype from a published result using factual text.
- **Mobile:** all media, prose, and paper panels follow semantic reading order. The three sections remain distinct without decorative section numbers or labels.

## Motion contract

The motion score is an ambition with specific observable behaviors. Implement them before claiming a high-motion experience.

| Moment | Behavior | Purpose | Fallback |
| --- | --- | --- | --- |
| Me arrival | Small portrait/caption opacity and translate sequence, about 350-550ms total | Establish hierarchy without hiding identity | Fully visible immediately |
| Page change | Brief outgoing/incoming content transition, about 200-300ms | Make the four destinations feel connected | Direct navigation and immediate focus update |
| Art inspection | Description and separate close-up crossfade, about 150-220ms | Explain which work has attention | Immediate replacement |
| Artwork opening | Image continuity using native view transitions, about 400-550ms | Carry context from collection to detail | Ordinary route change |
| Below-fold media entrance | One-time, low-distance reveal | Pace discovery of a new work | Static media |
| Control press | Small transform/opacity feedback | Acknowledge an action | Instant state change |

Durations are design targets, not measured results. Animate only transforms and opacity. Never delay navigation to finish a flourish.

- Prefer native CSS transitions, View Transitions, and IntersectionObserver. Continuous scroll-driven animation is not needed for this concept.
- Motion and GSAP are **not installed**. Do not import them by assumption. If a later prototype proves a library necessary, propose the exact npm install command before importing and keep it in isolated leaves. Do not mix animation engines on the same subtree.
- No scroll hijacking, smooth-scroll replacement, pinned horizontal travel, infinite marquees, or endless background motion in the core plan.
- No React state updates every pointer frame, `window.addEventListener('scroll')`, or animation loops that update React state.
- Each observer, media listener, and animation has a cleanup path compatible with StrictMode.
- **Motion is unconditional** (site owner's decision, 2026-10-07). No animation, transition, view transition, autoplay, or cursor effect is gated on `prefers-reduced-motion`, and there is no blanket rule that switches motion off. This supersedes the earlier reduced-motion policy; the capability fallbacks in this contract still apply, and the pointer and autoplay policies keep their safety conditions.
- Essential content is visible without animation support or a reveal observer. Progressive enhancement must not leave images or text at opacity zero.

## Asset and content brief

**The portfolio needs Yujin's actual material.** No image-generation tool is available in this session, and generating substitute portfolio works would misrepresent authorship anyway. Do not use stock art as if Yujin made it.

| Placement | Needed material | Production treatment |
| --- | --- | --- |
| Me portrait | One approved portrait and its text | Responsive AVIF/WebP plus fallback; preserve facial framing; reserve intrinsic dimensions |
| Resume | Current accessible PDF or approved destination | Real Resume link; indicate PDF in accessible text if relevant |
| Art collection | Full images of every selected work | Accurate color, full composition, descriptive alt text; record title, year, material, description, order, and slug |
| Art inspection | Genuine close-ups or high-resolution originals | Separate optimized close-ups; lazy-load high-resolution inspection assets |
| Music feature | Performance file, poster, and experience copy | Muted autoplay source, manual playback fallback, accessible controls |
| Music collection | Real photos and recordings including the requested repertoire where available | Posters and metadata first; stream only on demand |
| Research | Project images, real descriptions, GHP material, smaller projects | Legible diagrams, image descriptions, factual captions |
| Papers | Real PDF/publication links and bibliographic details | Accessible links and optional actual page thumbnails |
| Sharing | Approved image and summary for each route | Real Open Graph cards, not fabricated exhibition posters |

Do not prescribe a minimum work count. A small, strong collection is better than filling vacant tiles with invented pieces.

For an internal prototype, use plainly labeled asset slots at these placements. A public launch is blocked until real material is supplied. Skeletons are loading states, not a permanent substitute for artwork.

Maintain a rights/credits field for each asset. Publish credits when required or genuinely attributable, not fake film-frame captions. Use short functional alt descriptions; do not repeat the complete adjacent description.

## Engineering plan

### Keep the existing foundations

- React + TypeScript + Vite, with Tailwind v4 through the already-installed Vite plugin.
- Existing `@/` imports.
- Static typed content records are appropriate for this frontend-only portfolio. No CMS or backend until updating frequency justifies it.
- Prefer editing the existing application and theme files; split page modules and content only when implementation grows enough to benefit.
- Define semantic theme tokens, typography, spacing, and layers centrally. Do not sprinkle raw colors into individual pages.
- Self-host font files with `@font-face`, `font-display: swap`, and correct licensing. Remove the production Google Fonts links only during implementation.

### Routing and media

- Select the smallest maintained routing approach that supports direct detail links, history, focus restoration, and static hosting. No routing library currently exists in the dependency list; installation is a separate implementation decision.
- Do not add a fifth top-level navigation item for artwork details.
- Lazy-load offscreen media and optional high-resolution inspectors. Load the actual first-view image eagerly with explicit width/height, responsive `srcset`/`sizes`, and high fetch priority where appropriate. This is Vite, so do not prescribe `next/image`.
- Music should show its optimized poster before downloading a large recording. Use metadata-only preload where practical and avoid third-party video embeds until requested.
- A future generative-art piece may use the installed Three.js stack only if it is itself genuine portfolio content. Lazy-load it, cap pixel ratio, stop rendering offscreen, and provide a real poster and non-WebGL fallback.
- Text labels are sufficient for most controls. If icons become necessary, verify an allowed family first. No icon library is installed; never hand-draw SVG paths or assume Lucide is present.

### Accessibility and resilience

- Visible keyboard focus, logical heading hierarchy, semantic links/buttons, and 44px practical touch targets.
- No hover-only information, drag-only exploration, autoplay audio, or cursor replacement.
- Body contrast targets AAA where practical; all text and controls meet applicable WCAG AA thresholds. Test both themes, including captions, disabled controls, PDF panels, and media overlays.
- Dialogs need focus containment, Escape, an accessible name, inert background, and focus return. A route transition must not disorient screen-reader users or steal focus unnecessarily.
- A blocked recording, failed image, absent PDF, or unavailable WebGL context cannot strand the visitor.

### Complete UI states

| Surface | Loading | Empty/unavailable | Error/recovery |
| --- | --- | --- | --- |
| Artwork | Ratio-matched neutral skeleton with dimensions reserved | Omit nonexistent collection items; unpublished data never becomes a fake work | Keep title/facts and detail link available; offer Retry for recoverable media |
| Detail/close-up | Full image remains while higher-resolution media loads | Say “Close-up unavailable” if the requested source is missing | Retain the whole image; return path always works |
| Music | Real poster and controls while buffering | Say “Recording unavailable” for a known missing item | Clear inline message and Retry or a supplied external recording link |
| Paper | Text metadata remains readable; optional thumbnail loads independently | No disabled fake PDF; explain an actual known unavailability | Keep citation and alternative supplied publication link |
| Resume | Ordinary link, no artificial loading | Do not publish a dead placeholder link | State unavailability honestly during prototype review |

Only publish meaningful records. Empty/error states describe real conditions, not invented activity. No generic spinner, shimmer loop, or toast for a permanent missing asset.

## Delivery sequence

1. **Curate the material.** Confirm biography, portrait, resume, artwork order and detail images, performance permissions, paper links, and GHP wording. Verify any live URLs before deciding paths.
2. **Set the visual system.** Build both theme token sets, self-hosted typography, navigation, and the Me first viewport. Validate composition with the real portrait.
3. **Prove the signature.** Prototype one whole-work/close-up pair and its detail handoff with actual images. Compare enhanced navigation with the static fallback. Reject the effect if it damages clarity, color, crop, or speed.
4. **Complete the four pages.** Apply page-specific rhythm and mobile reading order, wire media controls and paper links, and finish every state.
5. **Harden and review.** Direct-link testing, history/focus restoration, accessibility and contrast checks, image optimization, both themes, motion preferences, and production build.

These are internal delivery tasks, not numbered marketing copy to render on the site.

## Verification and pre-flight gates

Documentation review can verify intentions; only the implemented interface can verify behavior. Do not mark runtime checks as passed from this plan.

### Plan review

- [x] Brief inference, greenfield mode, audience, and explicit dial values documented.
- [x] Four required page labels and all specified content/placement obligations mapped.
- [x] Bespoke aesthetic labeled honestly; installed dependencies distinguished from possible additions.
- [x] One accent, one sharp-corner system, and one site-wide theme policy specified.
- [x] Every multi-column composition has an explicit mobile fallback.
- [x] Motion has a content purpose, a static fallback, and an explicit, unconditional motion policy.
- [x] Real asset needs and authorship constraints documented; no fake works or factual claims.
- [x] No decorative eyebrows, numbered image labels, scroll cues, marquees, status dots, local-time strips, photo tags, or fake product panels planned.
- [x] Link vocabulary is consistent; no competing labels for the same CTA intent.
- [x] Layout families vary across destinations; no equal three-card row or repeated marketing zigzag.
- [x] No serif/italic display treatments, logo wall, testimonials, data tables, forms, or GSAP pinning patterns are proposed, so their specialized checks are not applicable to this scope.
- [x] Planned public copy uses no em-dash or en-dash separators, invented metrics, or performative artist statements.

### Implementation acceptance

- [ ] Me satisfies upper-left name, Resume beneath, right portrait, and text beneath it.
- [ ] Art hover/focus/touch descriptions work, and clicking reaches complete title/year/material/description/close-up information.
- [ ] Music autoplay is muted and controlled; fallback, single-audio policy, and supplied repertoire work.
- [ ] Research includes its three sections, the exact GHP heading, and functioning paper widgets.
- [ ] First-view copy/media fit at representative desktop sizes, including 1024x768 and short laptop windows. Headline at most two lines, optional summary at most 20 words, top padding at most 96px.
- [ ] Desktop navigation is one line and at most 80px tall; mobile navigation and CTAs do not wrap unintentionally.
- [ ] Every button, caption, form if later introduced, focus ring, and state is contrasted in both themes. No CTA relies on unreadable accent text.
- [ ] Page-level theme is stable on load and navigation; no mid-page theme inversion or media recoloring.
- [ ] Review at 360px, 390px, 768px, 1024px, and 1440px, plus 200% zoom. No horizontal overflow, clipped names, or hidden controls.
- [ ] Keyboard-only use, focus return, screen-reader labels, direct detail links, browser history, and media controls are tested.
- [ ] Motion runs for every visitor regardless of the operating system's animation setting; blocked autoplay and failed media have usable recovery paths.
- [ ] Visible copy, captions, alt text, facts, credits, and metadata are reread. Search for forbidden dash characters and decorative micro-labels.
- [ ] Run `npm run build` for typecheck/build and `npm run lint`; add and run relevant tests when interaction code is introduced. No test suite currently exists.
- [ ] Run Lighthouse against the production build on all four pages and an artwork detail in both themes. Targets: LCP < 2.5s, INP < 200ms, CLS < 0.1. Confirm INP with real interaction or field measurement; Lighthouse alone is not proof of field INP.
- [ ] Check a real mobile device and current Chrome, Safari, and Firefox, including unsupported View Transition behavior. Optional effects may fail; viewing the portfolio may not.

**Launch standard:** an unfamiliar visitor can identify Yujin, obtain the resume, inspect an artwork, intentionally hear a recording, and open a research paper without deciphering the design.

## Reference direction and evidence limits

- [Tauba Auerbach: Works](https://taubaauerbach.com/works.php): a relevant primary artist reference for a practice spanning disciplines. The readable-page extraction returned only its title; it has not been visually audited here. Do not infer its animation or layout behavior from that extraction.
- [My Art Gallery | Portfolio, Awwwards](https://www.awwwards.com/sites/my-art-gallery-portfolio): the listing documents Kelly CLOVIS's Three.js/GSAP interactive portfolio and identifies it as a nominee dated May 15, 2026. It supports the feasibility of immersive presentation, not a claim of award-winning usability. Our plan deliberately avoids requiring a navigable 3D room.
- [Awwwards Art & Illustration collection](https://www.awwwards.com/websites/art-illustration/): a discovery source for implementation-stage visual comparison, not a layout to copy wholesale.
- [MDN: View Transition API](https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API): implementation reference for progressive image continuity.
- [MDN: prefers-reduced-motion](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion): kept as background only. The motion contract deliberately does not gate on it, so it is not an implementation reference.
- [MDN: prefers-color-scheme](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-color-scheme): implementation reference for system-aware theme selection.

Use references to evaluate coherence and restraint. Yujin's material determines the final image sequence, not whichever fashionable effect is easiest to import.
