import { lazy, Suspense, useEffect, useState } from 'react'
import { appearance, artworks, navigation, site, theme } from '@/content'
import { accentKey, activePath, resolveRoute } from '@/lib/routes'
import { usePathname } from '@/lib/router'
import { applyTheme } from '@/lib/apply-theme'
import type { ThemeMode } from '@/lib/theme-content'
import { PageLink } from '@/components/PageLink'
import { ExperienceCursor, SmoothScroll } from '@/components/Experience'
import { ArtPage, ArtworkPage, MusicPage, NotFoundPage, ResearchPage } from '@/pages'

const MeAtmosphere = lazy(() => import('@/components/MeAtmosphere'))

/** The visitor's choice. The palette itself comes from content/theme.yaml. */
type ThemeSetting = 'system' | 'light' | 'dark'

/** The theme control is code, not content: the design contract fixes one name per action. */
const THEMES = [['system', 'System'], ['light', 'Light'], ['dark', 'Dark']] as const satisfies readonly (readonly [ThemeSetting, string])[]

function getThemeSetting(): ThemeSetting {
  try {
    const value = localStorage.getItem('portfolio-theme')
    return value === 'light' || value === 'dark' ? value : 'system'
  } catch { return 'system' }
}

export default function App() {
  const pathname = usePathname()
  const route = resolveRoute(pathname)
  const [themeSetting, setThemeSetting] = useState<ThemeSetting>(getThemeSetting)
  const work = route.page === 'detail' ? artworks.find((item) => item.slug === route.slug) : undefined
  const current = activePath(route)

  useEffect(() => {
    try { localStorage.setItem('portfolio-theme', themeSetting) } catch { /* Storage is optional. */ }
  }, [themeSetting])

  // content/theme.yaml owns the palette, so the resolved mode goes on the document and
  // its values are written over the stylesheet's first-paint fallback. "System" follows
  // the operating system, so it repaints when the preference changes.
  useEffect(() => {
    const preference = window.matchMedia('(prefers-color-scheme: dark)')
    const paint = () => {
      const mode: ThemeMode = themeSetting === 'system' ? (preference.matches ? 'dark' : 'light') : themeSetting
      document.documentElement.dataset.theme = mode
      applyTheme(document.documentElement, theme, mode)
    }
    paint()
    if (themeSetting !== 'system') return
    preference.addEventListener('change', paint)
    return () => preference.removeEventListener('change', paint)
  }, [themeSetting])

  useEffect(() => {
    document.documentElement.dataset.page = accentKey(route.page)
  }, [route.page])

  // content/site.yaml → appearance.look picks the typographic look. The stylesheet
  // carries both, so this only names the one in effect on the document.
  useEffect(() => {
    document.documentElement.dataset.look = appearance.look
  }, [])

  useEffect(() => {
    const title = route.page === 'detail' ? work?.title ?? 'Not found' : route.page === 'not-found' ? 'Not found' : navigation.find((item) => item.href === current)?.label ?? 'Art'
    document.title = `${title} | ${site.name}`
    document.querySelector('meta[name="description"]')?.setAttribute('content', `${site.name}: ${title.toLowerCase()}. ${site.tagline}`)
  }, [pathname, current, route.page, work?.title])

  // Reveals run for every visitor: the site's motion is not gated on the operating
  // system's animation setting, so the observer is the only condition here.
  useEffect(() => {
    if (!('IntersectionObserver' in window)) return
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed')
          observer.unobserve(entry.target)
        }
      })
    }, { threshold: 0.08 })
    document.querySelectorAll('.reveal').forEach((element) => observer.observe(element))
    return () => observer.disconnect()
  }, [pathname])

  return (
    <div className="site-shell">
      {/* The hero and its atmosphere now live below the collection on the Art page. */}
      {route.page === 'art' && <Suspense fallback={<div className="me-atmosphere" aria-hidden="true" />}><MeAtmosphere /></Suspense>}
      <SmoothScroll />
      <ExperienceCursor />
      <div className="scroll-progress" aria-hidden="true" />
      <a className="skip-link" href="#main-content">Skip to content</a>
      {/* The artwork view is chrome-free: no navigation and no footer, so the work fills the
          viewport and Back to Art is the way back. Every other view keeps both. */}
      {route.page !== 'detail' && <header className="site-header">
        <div className="identity">
          <PageLink href="/" className="identity-name">{site.name}</PageLink>
        </div>
        <nav aria-label="Main navigation">{navigation.map((item) => <PageLink data-magnetic data-cursor={`Explore ${item.label}`} key={item.href} href={item.href} aria-current={current === item.href ? 'page' : undefined}>{item.label}</PageLink>)}</nav>
      </header>}
      <main id="main-content" tabIndex={-1} key={pathname}>
        {route.page === 'art' && <ArtPage />}
        {route.page === 'music' && <MusicPage />}
        {route.page === 'research' && <ResearchPage />}
        {route.page === 'detail' && (work ? <ArtworkPage work={work} /> : <NotFoundPage />)}
        {route.page === 'not-found' && <NotFoundPage />}
      </main>
      {route.page !== 'detail' && <footer className="site-footer">
        <PageLink href="/" className="footer-name">{site.name}</PageLink>
        <fieldset className="theme-control"><legend className="sr-only">Color theme</legend>{THEMES.map(([value, label]) => <button data-cursor={`${label} theme`} key={value} aria-pressed={themeSetting === value} onClick={() => setThemeSetting(value)}>{label}</button>)}</fieldset>
      </footer>}
    </div>
  )
}
