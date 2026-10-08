import { choice, deck, fail, flag, group, inFile, items, lines, mapping, number, only, optionalText, pictures, readYaml, text, type Mapping, type Picture } from './content-schema.ts'

export type { Picture }

/**
 * The site's content format. Each file is validated as it loads, and a bad value
 * throws an error naming that file and the exact setting to fix, e.g.
 * `content/pages/art.yaml → hero.portrait: needs its own block of indented settings`.
 *
 * Nothing here touches the browser, so the tests read the shipped files through
 * exactly the code the page does.
 */

export const SITE_FILE = 'content/site.yaml'

/** The media collections, one file each, under content/media. */
export const MEDIA_FILES = {
  artworks: 'content/media/artworks.yaml',
  recordings: 'content/media/recordings.yaml',
  papers: 'content/media/papers.yaml',
} as const

/** One file per page, under content/pages. */
export const PAGE_FILES = {
  art: 'content/pages/art.yaml',
  music: 'content/pages/music.yaml',
  research: 'content/pages/research.yaml',
  notFound: 'content/pages/not-found.yaml',
} as const

export type PageSources = { [K in keyof typeof PAGE_FILES]: string }
export type MediaSources = { [K in keyof typeof MEDIA_FILES]: string }

export type SiteSources = {
  site: string
  media: MediaSources
  pages: PageSources
}

export const ARTWORK_SIZES = ['large', 'small', 'offset', 'wide'] as const
export const LAYOUT_SIDES = ['left', 'right'] as const

/** The site's two looks: the geometric sans it was designed with, and a Times serif. */
export const APPEARANCE_LOOKS = ['classic', 'times'] as const

export type ArtworkSize = (typeof ARTWORK_SIZES)[number]
export type LayoutSide = (typeof LAYOUT_SIDES)[number]
export type AppearanceLook = (typeof APPEARANCE_LOOKS)[number]

export type Artwork = {
  slug: string
  title: string
  artist: string
  year: string
  material: string
  description: string
  reference: boolean
  alt: string
  width: number
  height: number
  /** Where a close-up crop looks: `horizontal% vertical%`. */
  crop: string
  /** How much room the work takes in the collection. */
  size: ArtworkSize
  imageId?: string
  image?: string
  srcSet?: string
  closeUp?: string
  highResolution?: string
  source?: string
}

export type Recording = {
  title: string
  kind: string
  image: string
  src?: string
  caption?: string
}

export type Paper = {
  title: string
  url: string | null
  citation?: string
}

export type NavigationItem = { label: string; href: string }

export type Layout = {
  music: { showTopics: boolean }
  detail: { copySide: LayoutSide }
}

export type ArtContent = {
  /**
   * The portrait and its greeting, shown above the collection grid, with the resume
   * panel beside them. The greeting is the page's own heading, so the Art page
   * carries no separate one.
   */
  hero: {
    portrait: { image: string; alt: string; lead: string; caption: string; width: number; height: number }
    /**
     * The resume PDF, previewed in the panel beside the portrait. Optional: leave
     * it empty and the panel does not appear.
     */
    resumeUrl?: string
  }
}

/**
 * One film at the top of the Music page: the whole width of the window, played in
 * place. `src` is optional so a film can be listed before its file exists: the still
 * stands in and the page says so rather than offering a player with nothing to play.
 */
export type MusicFilm = {
  title: string
  src?: string
  poster: string
  caption?: string
  demo: boolean
}

export type MusicContent = {
  heading: string
  introduction: string
  /** The films, in order. The first plays on its own; the ones below wait to be started. */
  films: MusicFilm[]
  feature: {
    heading: string
    copy: string
    /** Optional: leave it empty in the content file to hide the line. */
    note?: string
    topics: string[]
  }
  /** Optional: a still that fills the collection grid's open top-left corner. */
  companion?: { image: string; alt: string }
  /** Optional: the photographs at the bottom of the page, shown as one deck. */
  photos: Picture[]
}

export type ResearchContent = {
  heading: string
  introduction: string
  project: { images: Picture[]; heading: string; copy: string; note?: string; paper: string }
  ghp: { title: string; heading: string; copy: string; note?: string; paper: string; images: Picture[] }
  smaller: { title: string; projects: { title: string; copy: string; images: Picture[]; credit: string }[] }
}

export type Pages = {
  art: ArtContent
  music: MusicContent
  research: ResearchContent
  notFound: { heading: string; copy: string }
}

/** Everything content/site.yaml holds on its own, before the other files join in. */
export type Spine = {
  name: string
  tagline: string
  appearance: { look: AppearanceLook }
  navigation: NavigationItem[]
  layout: Layout
  messages: { paperMissing: string; recordingMissingHeading: string; recordingMissingCopy: string }
}

/** The media collections, each in its own file under content/media. */
export type Media = {
  artworks: Artwork[]
  recordings: Recording[]
  papers: Record<string, Paper>
}

export type Site = Spine & Media & { pages: Pages }

export function parseSite(sources: SiteSources): Site {
  const artworks = inFile(MEDIA_FILES.artworks, () => artworksFrom(mapping(readYaml(sources.media.artworks), 'the file')))
  const recordings = inFile(MEDIA_FILES.recordings, () => recordingsFrom(mapping(readYaml(sources.media.recordings), 'the file')))
  const papers = inFile(MEDIA_FILES.papers, () => papersFrom(mapping(readYaml(sources.media.papers), 'the file')))
  const pages: Pages = {
    art: inFile(PAGE_FILES.art, () => artPage(mapping(readYaml(sources.pages.art), 'the page'))),
    music: inFile(PAGE_FILES.music, () => musicPage(mapping(readYaml(sources.pages.music), 'the page'))),
    research: inFile(PAGE_FILES.research, () => researchPage(mapping(readYaml(sources.pages.research), 'the page'))),
    notFound: inFile(PAGE_FILES.notFound, () => notFoundPage(mapping(readYaml(sources.pages.notFound), 'the page'))),
  }
  const spine = inFile(SITE_FILE, () => spineFrom(mapping(readYaml(sources.site), 'the file')))

  // Cross-references cross files now, so a mistyped slug would otherwise leave a
  // page pointing nowhere. Each error names the file that holds the reference.
  for (const [path, key] of [['project.paper', pages.research.project.paper], ['ghp.paper', pages.research.ghp.paper]] as const) {
    if (!(key in papers)) {
      fail(`${PAGE_FILES.research} → ${path}`, `points at a paper named "${key}", which ${MEDIA_FILES.papers} does not define under papers`)
    }
  }

  return { ...spine, artworks, recordings, papers, pages }
}

function artworkBlocks(file: Mapping): Mapping[] {
  only(file, 'the file', ['artworks'])
  return items(file.artworks, 'artworks')
}

const ARTWORK_KEYS = ['slug', 'title', 'artist', 'year', 'material', 'description', 'reference', 'image_id', 'image', 'src_set',
  'close_up', 'high_resolution', 'source', 'alt', 'width', 'height', 'crop', 'size'] as const

function artworksFrom(file: Mapping): Artwork[] {
  const artworks: Artwork[] = artworkBlocks(file).map((item, index) => {
    const where = `artworks[${index}]`
    only(item, where, ARTWORK_KEYS)
    const slug = text(item, 'slug', where)
    if (!/^[a-z0-9-]+$/.test(slug)) fail(`${where}.slug`, 'uses only lower-case letters, numbers, and hyphens')
    return {
      slug,
      title: text(item, 'title', where),
      artist: text(item, 'artist', where),
      year: text(item, 'year', where),
      material: text(item, 'material', where),
      description: text(item, 'description', where),
      reference: flag(item, 'reference', where),
      alt: text(item, 'alt', where),
      width: number(item, 'width', where),
      height: number(item, 'height', where),
      crop: optionalText(item, 'crop', where) ?? '50% 50%',
      size: choice(item, 'size', where, ARTWORK_SIZES),
      imageId: optionalText(item, 'image_id', where),
      image: optionalText(item, 'image', where),
      srcSet: optionalText(item, 'src_set', where),
      closeUp: optionalText(item, 'close_up', where),
      highResolution: optionalText(item, 'high_resolution', where),
      source: optionalText(item, 'source', where),
    }
  })
  if (new Set(artworks.map((work) => work.slug)).size !== artworks.length) {
    fail('artworks', 'uses the same slug twice. Each work needs its own slug')
  }
  return artworks
}

function recordingsFrom(file: Mapping): Recording[] {
  only(file, 'the file', ['recordings'])
  return items(file.recordings, 'recordings').map((item, index) => {
    const where = `recordings[${index}]`
    only(item, where, ['title', 'kind', 'image', 'src', 'caption'])
    return {
      title: text(item, 'title', where),
      kind: text(item, 'kind', where),
      image: text(item, 'image', where),
      src: optionalText(item, 'src', where),
      caption: optionalText(item, 'caption', where),
    }
  })
}

function papersFrom(file: Mapping): Record<string, Paper> {
  only(file, 'the file', ['papers'])
  const block = group(file, 'papers', '')
  const papers: Record<string, Paper> = {}
  for (const [key, value] of Object.entries(block)) {
    const where = `papers.${key}`
    const entry = mapping(value, where)
    only(entry, where, ['title', 'citation', 'url'])
    papers[key] = { title: text(entry, 'title', where), citation: optionalText(entry, 'citation', where), url: optionalText(entry, 'url', where) ?? null }
  }
  return papers
}

function artPage(page: Mapping): ArtContent {
  only(page, 'the page', ['hero'])
  const hero = group(page, 'hero', '')
  only(hero, 'hero', ['portrait', 'resume_url'])
  const portrait = group(hero, 'portrait', 'hero')
  return {
    hero: {
      portrait: {
        image: text(portrait, 'image', 'hero.portrait'),
        alt: text(portrait, 'alt', 'hero.portrait'),
        lead: text(portrait, 'lead', 'hero.portrait'),
        caption: text(portrait, 'caption', 'hero.portrait'),
        width: number(portrait, 'width', 'hero.portrait'),
        height: number(portrait, 'height', 'hero.portrait'),
      },
      resumeUrl: optionalText(hero, 'resume_url', 'hero'),
    },
  }
}

function musicPage(page: Mapping): MusicContent {
  only(page, 'the page', ['heading', 'introduction', 'films', 'feature', 'companion', 'photos'])
  const feature = group(page, 'feature', '')
  only(feature, 'feature', ['heading', 'copy', 'note', 'topics'])
  const companionBlock = page.companion === undefined || page.companion === null ? undefined : group(page, 'companion', '')
  if (companionBlock) only(companionBlock, 'companion', ['image', 'alt'])
  const companionImage = companionBlock ? optionalText(companionBlock, 'image', 'companion') : undefined
  const companion = companionBlock && companionImage ? { image: companionImage, alt: text(companionBlock, 'alt', 'companion') } : undefined
  return {
    heading: text(page, 'heading', ''),
    introduction: text(page, 'introduction', ''),
    films: items(page.films, 'films').map((item, index) => {
      const where = `films[${index}]`
      only(item, where, ['title', 'src', 'poster', 'caption', 'demo'])
      return {
        title: text(item, 'title', where),
        // Empty until the file exists: the still and the note stand in for the player.
        src: optionalText(item, 'src', where),
        poster: text(item, 'poster', where),
        caption: optionalText(item, 'caption', where),
        demo: flag(item, 'demo', where),
      }
    }),
    feature: {
      heading: text(feature, 'heading', 'feature'),
      copy: text(feature, 'copy', 'feature'),
      note: optionalText(feature, 'note', 'feature'),
      topics: lines(feature.topics, 'feature.topics'),
    },
    companion,
    // An emptied or missing block is simply no deck, like the companion still.
    photos: page.photos === undefined || page.photos === null ? [] : deck(page.photos, 'photos'),
  }
}

function researchPage(page: Mapping): ResearchContent {
  only(page, 'the page', ['heading', 'introduction', 'project', 'ghp', 'smaller'])
  const project = group(page, 'project', '')
  only(project, 'project', ['image', 'alt', 'images', 'heading', 'copy', 'note', 'paper'])
  const ghp = group(page, 'ghp', '')
  only(ghp, 'ghp', ['title', 'heading', 'copy', 'note', 'images', 'paper'])
  const smaller = group(page, 'smaller', '')
  const research: ResearchContent = {
    heading: text(page, 'heading', ''),
    introduction: text(page, 'introduction', ''),
    project: {
      images: pictures(project, 'project'),
      heading: text(project, 'heading', 'project'),
      copy: text(project, 'copy', 'project'),
      note: optionalText(project, 'note', 'project'),
      paper: text(project, 'paper', 'project'),
    },
    ghp: {
      title: text(ghp, 'title', 'ghp'),
      heading: text(ghp, 'heading', 'ghp'),
      copy: text(ghp, 'copy', 'ghp'),
      note: optionalText(ghp, 'note', 'ghp'),
      paper: text(ghp, 'paper', 'ghp'),
      images: deck(ghp.images, 'ghp.images'),
    },
    smaller: {
      title: text(smaller, 'title', 'smaller'),
      projects: items(smaller.projects, 'smaller.projects').map((entry, index) => {
        const where = `smaller.projects[${index}]`
        only(entry, where, ['title', 'copy', 'image', 'alt', 'images', 'credit'])
        return {
          title: text(entry, 'title', where),
          copy: text(entry, 'copy', where),
          images: pictures(entry, where),
          credit: text(entry, 'credit', where),
        }
      }),
    },
  }
  // The GHP pair is an unequal two-image composition: wider first, taller second.
  if (research.ghp.images.length !== 2) {
    fail('ghp.images', 'needs exactly two images: the wider one first, then the taller one')
  }
  return research
}

function notFoundPage(page: Mapping): { heading: string; copy: string } {
  only(page, 'the page', ['heading', 'copy'])
  return { heading: text(page, 'heading', ''), copy: text(page, 'copy', '') }
}

function spineFrom(root: Mapping): Spine {
  only(root, 'the file', ['site', 'appearance', 'navigation', 'layout', 'messages'])

  const identity = group(root, 'site', '')
  only(identity, 'site', ['name', 'tagline'])
  const appearance = group(root, 'appearance', '')
  only(appearance, 'appearance', ['look'])

  const navigation = items(root.navigation, 'navigation').map((item, index) => {
    const where = `navigation[${index}]`
    only(item, where, ['label', 'href'])
    return { label: text(item, 'label', where), href: text(item, 'href', where) }
  })

  const layoutBlock = group(root, 'layout', '')
  only(layoutBlock, 'layout', ['music', 'detail'])
  const musicLayout = group(layoutBlock, 'music', 'layout')
  only(musicLayout, 'layout.music', ['show_topics'])
  const detailLayout = group(layoutBlock, 'detail', 'layout')
  only(detailLayout, 'layout.detail', ['copy_side'])
  const layout: Layout = {
    music: {
      showTopics: flag(musicLayout, 'show_topics', 'layout.music'),
    },
    detail: { copySide: choice(detailLayout, 'copy_side', 'layout.detail', LAYOUT_SIDES) },
  }

  const messagesBlock = group(root, 'messages', '')
  only(messagesBlock, 'messages', ['paper_missing', 'recording_missing_heading', 'recording_missing_copy'])

  return {
    name: text(identity, 'name', 'site'),
    tagline: text(identity, 'tagline', 'site'),
    appearance: { look: choice(appearance, 'look', 'appearance', APPEARANCE_LOOKS) },
    navigation,
    layout,
    messages: {
      paperMissing: text(messagesBlock, 'paper_missing', 'messages'),
      recordingMissingHeading: text(messagesBlock, 'recording_missing_heading', 'messages'),
      recordingMissingCopy: text(messagesBlock, 'recording_missing_copy', 'messages'),
    },
  }
}

export function artImage(work: Artwork, size = 1000) {
  if (size >= 2000 && work.highResolution) return work.highResolution
  if (work.image) return work.image
  if (!work.imageId) throw new Error(`Artwork "${work.slug}" needs an image or imageId.`)
  return `https://www.artic.edu/iiif/2/${work.imageId}/full/${size},/0/default.jpg`
}

export function artSrcSet(work: Artwork) {
  if (work.srcSet) return work.srcSet
  if (work.image) return undefined
  return [400, 800, 1200, 1680].map((size) => `${artImage(work, size)} ${size}w`).join(', ')
}
