import { useState, type CSSProperties } from 'react'
import { artImage, artSrcSet, artworks, layout, messages, navigationLabel, pages, papers, type Artwork, type Paper } from '@/content'
import { Image, Inspector } from '@/components/Media'
import { PdfViewer } from '@/components/PdfViewer'
import { ImageDeck } from '@/components/ImageDeck'
import { PhotoStrip } from '@/components/PhotoStrip'
import { VideoPlayer } from '@/components/VideoPlayer'
import { PageLink } from '@/components/PageLink'
import { workNeighbours } from '@/lib/work-sequence'

/** The step actions' own names, kept in code like every other control label. */
export const WORK_STEP_PREVIOUS = 'Previous work'
export const WORK_STEP_NEXT = 'Next work'

/**
 * A work's image inside the link to its own page. Every collection surface shares the
 * same source selection, dimensions, and transition tag; only the slot it fills differs.
 */
function WorkImage({ work, sizes, loading, fetchPriority }: {
  work: Artwork
  sizes: string
  loading?: 'eager' | 'lazy'
  fetchPriority?: 'high' | 'low' | 'auto'
}) {
  return (
    <Image className="linked-image" linked workSlug={work.slug} src={artImage(work)} srcSet={artSrcSet(work)}
      sizes={sizes} alt={work.alt} width={work.width} height={work.height} loading={loading} fetchPriority={fetchPriority} />
  )
}

function WorkCard({ work }: { work: Artwork }) {
  return (
    <article className="work-card reveal">
      <PageLink href={`/art/${work.slug}`} id={`work-${work.slug}`} data-cursor="View work" className="art-image-link" aria-describedby={`description-${work.slug}`} aria-label={`View ${work.title}`}>
        <WorkImage work={work} sizes="(max-width: 767px) 100vw, (max-width: 1099px) 50vw, 25vw" loading="lazy" />
      </PageLink>
      <div className="work-caption"><h2>{work.title}</h2><span>{work.year}</span></div>
      <p className="work-credit">{work.artist}.</p>
      <div className="work-description" id={`description-${work.slug}`}><span>{work.material}</span><p>{work.description}</p></div>
      <details className="work-mobile-description"><summary>Details <span aria-hidden="true">+</span></summary><div><span>{work.material}</span><p>{work.description}</p></div></details>
    </article>
  )
}

export function ArtPage() {
  const hero = pages.art.hero
  return (
    <>
      {/* The hero opens the front page: the portrait and its greeting sit on the left, with
          the resume panel beside them on the right, above the collection. The greeting is
          the page's own heading, and the atmosphere layer is anchored to this section. */}
      <section className="me-hero" aria-label="Introduction">
        <figure className="portrait enter" data-depth>
          <Image src={hero.portrait.image} alt={hero.portrait.alt} width={hero.portrait.width} height={hero.portrait.height} fetchPriority="high" />
          <figcaption>
            <h1 id="page-title" tabIndex={-1} className="portrait-lead">{hero.portrait.lead}</h1>
            <p>{hero.portrait.caption}</p>
          </figcaption>
        </figure>
        {hero.resumeUrl && <ResumePanel url={hero.resumeUrl} />}
      </section>
      {/* The whole collection in one bento grid: four works per row at desktop, two
          below 1100px, and one per row on a phone. Each card keeps its own ratio, so
          the row heights stay uneven and the grid reads as a bento rather than a table. */}
      <section className="art-collection enter enter-delay" aria-label="The art collection">
        {artworks.map((work) => <WorkCard key={work.slug} work={work} />)}
      </section>
    </>
  )
}

/**
 * The resume panel: the PDF's own pages, stacked and scrollable, beside the portrait. The
 * document is drawn with PdfViewer rather than the browser's built-in viewer, whose toolbar
 * and thumbnail chrome cannot be removed.
 */
function ResumePanel({ url }: { url: string }) {
  return (
    <section className="resume-panel enter enter-delay" aria-label="Resume">
      <div className="resume-panel-head">
        <span className="resume-label">Resume</span>
        <a data-magnetic data-cursor="Open resume" className="text-link resume-open" href={url} target="_blank" rel="noreferrer">Open <span aria-hidden="true">↗</span><span className="sr-only"> (opens in a new tab)</span></a>
      </div>
      <PdfViewer url={url} label="Resume, as a PDF" />
    </section>
  )
}

export function ArtworkPage({ work }: { work: Artwork }) {
  const [inspecting, setInspecting] = useState(false)
  // The collection order is the reading order, so the steps walk the same order the grid
  // does and wrap at both ends: one work either side, never a dead end.
  const { previous, next } = workNeighbours(artworks, work.slug)
  return (
    <>
      <div className="detail-actions enter">
        <PageLink href="/" data-magnetic data-cursor="Back to Art" className="button button-quiet back-link"><span aria-hidden="true">←</span> Back to Art</PageLink>
        {/* The view carries no header, so stepping between works is how a visitor keeps
            browsing. The two controls are quiet buttons on the bar Back to Art already
            owns, never a drawn arrow over the artwork itself. */}
        {(previous || next) && <nav className="work-steps" aria-label="More works">
          {previous && <PageLink href={`/art/${previous.slug}`} data-magnetic data-cursor={WORK_STEP_PREVIOUS} className="button button-quiet work-step work-step-previous" aria-label={`${WORK_STEP_PREVIOUS}: ${previous.title}`}><span aria-hidden="true">←</span> {WORK_STEP_PREVIOUS}</PageLink>}
          {next && <PageLink href={`/art/${next.slug}`} data-magnetic data-cursor={WORK_STEP_NEXT} className="button button-quiet work-step work-step-next" aria-label={`${WORK_STEP_NEXT}: ${next.title}`}>{WORK_STEP_NEXT} <span aria-hidden="true">→</span></PageLink>}
        </nav>}
      </div>
      <article className="artwork-detail" data-copy={layout.detail.copySide}>
        <div className="detail-image">
          {/* The work itself is the inspect control. Nothing is drawn over the image, so the
              cursor hint and the focus ring carry the affordance. */}
          <div className="detail-image-frame" style={{ '--image-ratio-v': work.width / work.height } as CSSProperties}>
            <Image src={artImage(work, 1680)} srcSet={artSrcSet(work)} sizes="(max-width: 767px) 100vw, 65vw" alt={work.alt} width={work.width} height={work.height} fetchPriority="high" workSlug={work.slug} />
            <button type="button" data-cursor="Inspect" className="detail-inspect" aria-label={`Inspect work: ${work.title}`} onClick={() => setInspecting(true)} />
          </div>
        </div>
        <div className="detail-copy enter">
          <h1 id="page-title" tabIndex={-1}>{work.title}</h1>
          <p className="detail-artist">{work.artist}</p>
          <dl><div><dt>Year</dt><dd>{work.year}</dd></div><div><dt>Material</dt><dd>{work.material}</dd></div></dl>
          <p>{work.description}</p>
          {work.source && <div className="source-note"><a href={work.source} target="_blank" rel="noreferrer" className="text-link">{work.reference ? 'Museum source' : 'Source'} <span aria-hidden="true">↗</span><span className="sr-only"> (opens in a new tab)</span></a></div>}
        </div>
      </article>
      {inspecting && <Inspector work={work} onClose={() => setInspecting(false)} />}
    </>
  )
}

export function MusicPage() {
  const music = pages.music
  const video = music.feature.video
  return (
    <>
      <div className="page-heading enter"><h1 id="page-title" tabIndex={-1}>{music.heading}</h1><p>{music.introduction}</p></div>
      {/* The orchestra film opens the page beside its side text: the film takes the wide
          column and the heading, note, and practice words sit alongside it. It starts on
          its own, muted, once it is in view. A film whose file is not there yet keeps its
          still and says so, rather than showing a player with nothing to play. */}
      <section className="music-feature enter enter-delay" data-side={layout.music.featureSide} aria-label="Orchestra and experience">
        {video.src
          ? <VideoPlayer autoplay label={music.feature.heading} src={video.src} poster={video.poster} caption={video.caption ?? ''} demo={video.demo} />
          : <div className="film-empty" role="status">
            <Image src={video.poster} alt={`Still for the ${music.feature.heading} film.`} width={1600} height={900} loading="lazy" />
            <p>{messages.recordingMissingHeading}</p>
            <p>{messages.recordingMissingCopy}</p>
          </div>}
        <div className="music-experience"><h2>{music.feature.heading}</h2><p>{music.feature.copy}</p>{music.feature.note && <p className="preview-copy">{music.feature.note}</p>}{layout.music.showTopics && <div className="music-topics">{music.feature.topics.map((topic) => <span key={topic}>{topic}</span>)}</div>}</div>
      </section>
      {/* The films below run the full width of the window, one after another, each played
          right here with its caption as the text under the player. They wait to be started. */}
      <section className="music-films enter" aria-label="Performances">
        {music.films.map((film, index) => (
          <div className="music-film" key={`${film.title}-${index}`}>
            {film.src
              ? <VideoPlayer label={film.title} src={film.src} poster={film.poster} caption={film.caption ?? ''} demo={film.demo} />
              : <div className="film-empty" role="status">
                <Image src={film.poster} alt={`Still for the ${film.title} film.`} width={1600} height={900} loading="lazy" />
                <p>{messages.recordingMissingHeading}</p>
                <p>{messages.recordingMissingCopy}</p>
              </div>}
          </div>
        ))}
      </section>
      {/* The photographs close the page as one strip the reader turns with the arrows. */}
      {music.photos.length > 0 && <section className="music-photos reveal" aria-label="Performance photographs">
        <PhotoStrip images={music.photos} />
      </section>}
    </>
  )
}

function PaperWidget({ paper }: { paper: Paper }) {
  return <div className="paper-widget" data-light><span className="paper-label">Research paper</span><h3>{paper.title}</h3><p>{paper.citation ?? messages.paperMissing}</p>{paper.url ? <a data-magnetic data-cursor="Read paper" className="text-link paper-open" href={paper.url} target="_blank" rel="noreferrer">Open paper <span aria-hidden="true">↗</span><span className="sr-only"> (opens in a new tab)</span></a> : <span className="paper-unavailable">Document pending</span>}</div>
}

export function ResearchPage() {
  const research = pages.research
  return (
    <>
      <div className="page-heading enter"><h1 id="page-title" tabIndex={-1}>{research.heading}</h1><p>{research.introduction}</p></div>
      <section className="research-project enter enter-delay" aria-labelledby="research-project-title">
        <ImageDeck images={research.project.images} width={1600} height={1000} fetchPriority="high" />
        <div className="research-project-copy"><h2 id="research-project-title">{research.project.heading}</h2><p>{research.project.copy}</p>{research.project.note && <p className="preview-copy">{research.project.note}</p>}</div>
        <PaperWidget paper={papers[research.project.paper]} />
      </section>
      <section className="ghp-section reveal" aria-labelledby="ghp-title">
        <h2 id="ghp-title">{research.ghp.title}</h2>
        <div className="ghp-images">{research.ghp.images.map((image, index) => <Image key={image.image} src={image.image} alt={image.alt} width={index === 0 ? 1100 : 900} height={index === 0 ? 1000 : 1100} loading="lazy" />)}</div>
        <div className="ghp-copy"><div><h3>{research.ghp.heading}</h3><p>{research.ghp.copy}</p>{research.ghp.note && <p className="preview-copy">{research.ghp.note}</p>}</div><PaperWidget paper={papers[research.ghp.paper]} /></div>
      </section>
      <section className="smaller-projects reveal" aria-labelledby="smaller-projects-title"><h2 id="smaller-projects-title">{research.smaller.title}</h2><div className="small-project-grid">{research.smaller.projects.map((project) => <article key={project.title}><ImageDeck images={project.images} width={1000} height={750} loading="lazy" /><h3>{project.title}</h3><p>{project.copy}</p><span className="work-credit">{project.credit}</span></article>)}</div></section>
    </>
  )
}

export function NotFoundPage() {
  return <section className="not-found"><h1 id="page-title" tabIndex={-1}>{pages.notFound.heading}</h1><p>{pages.notFound.copy}</p><PageLink href="/" className="button">{navigationLabel('/')} <span aria-hidden="true">↗</span></PageLink></section>
}
