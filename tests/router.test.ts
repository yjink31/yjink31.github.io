import { test } from 'node:test'
import assert from 'node:assert/strict'

// This harness models only APIs used by the router. It does not claim to test
// native dialog behavior, media decoding, rendering, or browser accessibility.
test('history router behavior with mocked browser APIs', async (suite) => {
  const originals = new Map<string, PropertyDescriptor | undefined>()
  const install = (name: string, value: unknown) => {
    originals.set(name, Object.getOwnPropertyDescriptor(globalThis, name))
    Object.defineProperty(globalThis, name, { configurable: true, writable: true, value })
  }

  let focused: FakeElement | null = null
  const setFocus = (element: FakeElement) => { focused = element }
  class FakeElement {
    id: string
    constructor(id: string) { this.id = id }
    focus() { setFocus(this) }
  }
  const title = new FakeElement('page-title')
  const artwork = new FakeElement('work-water-lilies')
  const elements = new Map([[title.id, title], [artwork.id, artwork]])
  const handlers = new Map<string, () => void>()
  const location = { pathname: '/', href: 'http://localhost/' }
  let reducedMotion = false
  let backCalls = 0
  const entries: Array<{ path: string; state: Record<string, unknown> }> = [{ path: '/', state: {} }]
  let entryIndex = 0
  const history = {
    get state() { return entries[entryIndex].state },
    scrollRestoration: 'auto',
    replaceState(state: Record<string, unknown>) { entries[entryIndex].state = state },
    pushState(state: Record<string, unknown>, _title: string, path: string) {
      entries.splice(entryIndex + 1)
      entries.push({ state, path })
      entryIndex++
      location.pathname = path
    },
    back() {
      backCalls++
      if (!entryIndex) return
      entryIndex--
      location.pathname = entries[entryIndex].path
      handlers.get('popstate')?.()
    },
    forward() {
      if (entryIndex >= entries.length - 1) return
      entryIndex++
      location.pathname = entries[entryIndex].path
      handlers.get('popstate')?.()
    },
  }
  const fakeWindow = {
    location,
    history,
    scrollY: 0,
    matchMedia: () => ({ matches: reducedMotion }),
    scrollTo({ top }: { top: number }) { fakeWindow.scrollY = top },
    addEventListener(name: string, handler: () => void) { handlers.set(name, handler) },
    removeEventListener(name: string) { handlers.delete(name) },
  }
  type Transition = { ready: Promise<void>; finished: Promise<void>; skipTransition: () => void }
  const imageFrame = (slug: string, rect: { x: number; y: number; width: number; height: number }) => {
    const attributes = new Map([['src', `/media/${slug}.jpg`], ['srcset', '/media/large.jpg 1200w']])
    const image = { complete: true, naturalWidth: 1200, currentSrc: `/media/${slug}.jpg`, src: `/media/${slug}.jpg`,
      getAttribute: (name: string) => attributes.get(name) ?? null,
      setAttribute: (name: string, value: string) => attributes.set(name, value),
      removeAttribute: (name: string) => attributes.delete(name), getAnimations: () => [] }
    const style = { viewTransitionName: '', removeProperty() { style.viewTransitionName = '' } }
    return { slug, style, image, classList: { add() {}, remove() {} }, querySelector: () => image, getBoundingClientRect: () => rect }
  }
  let imageFrames: Array<ReturnType<typeof imageFrame>> = []
  const animationCalls: Array<{ frames: Array<Record<string, string>>; options: { pseudoElement: string }; cancelled: boolean }> = []
  const fakeDocument = {
    documentElement: {
      dataset: {} as Record<string, string>,
      animate(frames: Array<Record<string, string>>, options: { pseudoElement: string }) {
        const call = { frames, options, cancelled: false }
        animationCalls.push(call)
        return { cancel() { call.cancelled = true } }
      },
    },
    get activeElement() { return focused },
    querySelectorAll: () => imageFrames,
    querySelector: (selector: string) => imageFrames.find((frame) => selector === `[data-work-image="${frame.slug}"]`) ?? null,
    getElementById: (id: string) => elements.get(id) ?? null,
    startViewTransition: undefined as undefined | ((render: () => void) => Transition),
  }

  install('window', fakeWindow)
  install('document', fakeDocument)
  install('HTMLElement', FakeElement)
  suite.after(() => {
    originals.forEach((descriptor, name) => {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor)
      else Reflect.deleteProperty(globalThis, name)
    })
  })

  const { navigate } = await import('../src/lib/router.ts')

  await suite.test('initialization preserves the history entry and disables native scroll restoration', () => {
    assert.equal(history.scrollRestoration, 'manual')
    assert.equal(typeof history.state.portfolioKey, 'string')
    assert.equal(entries.length, 1)
  })

  await suite.test('navigation updates history, resets scroll, and focuses the destination heading', () => {
    fakeWindow.scrollY = 500
    navigate('/art')
    assert.equal(location.pathname, '/art')
    assert.equal(history.state.from, '/')
    assert.equal(fakeWindow.scrollY, 0)
    assert.equal(focused, title)
  })

  await suite.test('navigating to the current page does not create duplicate history', () => {
    const count = entries.length
    navigate('/art')
    assert.equal(entries.length, count)
  })

  await suite.test('Back to Art returns to its existing entry and restores originating artwork focus and scroll', () => {
    // The collection is the front page, so the detail is entered from '/' and Back to Art
    // returns to that same entry instead of pushing a second copy.
    navigate('/')
    fakeWindow.scrollY = 1100
    artwork.focus()
    navigate('/art/water-lilies')
    assert.equal(fakeWindow.scrollY, 0)
    const count = entries.length
    navigate('/')
    assert.equal(backCalls, 1)
    assert.equal(entries.length, count)
    assert.equal(location.pathname, '/')
    assert.equal(fakeWindow.scrollY, 1100)
    assert.equal(focused, artwork)
  })

  await suite.test('browser forward revisits the detail entry with its saved position', () => {
    history.forward()
    assert.equal(location.pathname, '/art/water-lilies')
    assert.equal(fakeWindow.scrollY, 0)
    assert.equal(focused, title)
  })

  await suite.test('missing saved focus targets fall back to the destination heading', () => {
    const removed = new FakeElement('removed-link')
    removed.focus()
    fakeWindow.scrollY = 260
    navigate('/music')
    history.back()
    assert.equal(location.pathname, '/art/water-lilies')
    assert.equal(fakeWindow.scrollY, 260)
    assert.equal(focused, title)
  })

  await suite.test('the OS animation setting does not disable view transitions', async () => {
    // Motion is unconditional: a visitor whose operating system asks for reduced motion
    // still gets the same route choreography, so the preference is never read here.
    let finish = () => {}
    const finished = new Promise<void>((resolve) => { finish = resolve })
    let calls = 0
    fakeDocument.startViewTransition = (render) => {
      calls++
      render()
      return { ready: Promise.resolve(), finished, skipTransition() {} }
    }
    reducedMotion = true
    navigate('/research')
    assert.equal(calls, 1)
    assert.equal(location.pathname, '/research')
    assert.equal(focused, title)
    reducedMotion = false
    finish()
    await finished
    await Promise.resolve()
    assert.equal(fakeDocument.documentElement.dataset.transition, undefined)
    fakeDocument.startViewTransition = undefined
  })

  await suite.test('interrupted transition callbacks cannot reset the newer destination', () => {
    const callbacks: Array<() => void> = []
    let skips = 0
    fakeDocument.startViewTransition = (render) => {
      callbacks.push(render)
      return { ready: Promise.resolve(), finished: Promise.resolve(), skipTransition() { skips++ } }
    }
    navigate('/music')
    navigate('/art')
    assert.equal(skips, 1)
    fakeWindow.scrollY = 99
    artwork.focus()
    callbacks[0]()
    assert.equal(fakeWindow.scrollY, 99)
    assert.equal(focused, artwork)
    callbacks[1]()
    assert.equal(fakeWindow.scrollY, 0)
    assert.equal(focused, title)
    assert.equal(location.pathname, '/art')
    fakeDocument.startViewTransition = undefined
  })

  await suite.test('matched artwork transition uses fixed dimensions and cancels its animation after completion', async () => {
    let finish = () => {}
    const finished = new Promise<void>((resolve) => { finish = resolve })
    imageFrames = [imageFrame('water-lilies', { x: 10, y: 20, width: 400, height: 300 }), imageFrame('unrelated-work', { x: 900, y: 20, width: 100, height: 100 })]
    const source = imageFrames[0]
    const unrelated = imageFrames[1]
    fakeDocument.startViewTransition = (render) => {
      assert.equal(source.style.viewTransitionName, 'selected-work')
      assert.equal(unrelated.style.viewTransitionName, '')
      imageFrames = [imageFrame('water-lilies', { x: 50, y: 60, width: 800, height: 600 })]
      render()
      return { ready: Promise.resolve(), finished, skipTransition() {} }
    }
    navigate('/art/water-lilies')
    await Promise.resolve()
    const animation = animationCalls.at(-1)!
    assert.equal(animation.options.pseudoElement, '::view-transition-group(selected-work)')
    assert.equal(imageFrames[0].image.getAttribute('srcset'), null)
    assert.equal(fakeDocument.documentElement.dataset.transition, 'work')
    assert.equal(animation.frames[0].width, animation.frames[1].width)
    assert.equal(animation.frames[0].height, animation.frames[1].height)
    assert.match(animation.frames[0].transform, /scale\(0\.5, 0\.5\)/)
    assert.match(animation.frames[1].transform, /translate\(50px, 60px\) scale\(1\)/)
    assert.equal(animation.cancelled, false)
    finish()
    await finished
    await Promise.resolve()
    assert.equal(animation.cancelled, true)
    assert.equal(source.style.viewTransitionName, '')
    assert.equal(imageFrames[0].style.viewTransitionName, '')
    assert.equal(imageFrames[0].image.getAttribute('srcset'), '/media/large.jpg 1200w')
    assert.equal(fakeDocument.documentElement.dataset.transition, undefined)
    imageFrames = []
    fakeDocument.startViewTransition = undefined
  })

  await suite.test('failed transition snapshots do not block navigation or cause unhandled rejection', async () => {
    fakeDocument.startViewTransition = (render) => {
      render()
      return { ready: Promise.reject(new Error('snapshot unavailable')), finished: Promise.resolve(), skipTransition() {} }
    }
    navigate('/research')
    await Promise.resolve()
    assert.equal(location.pathname, '/research')
    assert.equal(focused, title)
    assert.equal(fakeWindow.scrollY, 0)
    await Promise.resolve()
    assert.equal(fakeDocument.documentElement.dataset.transition, undefined)
    fakeDocument.startViewTransition = undefined
  })

  await suite.test('unrelated route changes never name artwork images', async () => {
    const unrelated = imageFrame('water-lilies', { x: 10, y: 20, width: 400, height: 300 })
    imageFrames = [unrelated]
    fakeDocument.startViewTransition = (render) => {
      assert.equal(unrelated.style.viewTransitionName, '')
      assert.equal(fakeDocument.documentElement.dataset.transition, 'page')
      render()
      return { ready: Promise.resolve(), finished: Promise.resolve(), skipTransition() {} }
    }
    const count = animationCalls.length
    navigate('/music')
    await Promise.resolve()
    await Promise.resolve()
    assert.equal(animationCalls.length, count)
    assert.equal(unrelated.image.getAttribute('srcset'), '/media/large.jpg 1200w')
    imageFrames = []
    fakeDocument.startViewTransition = undefined
  })

  await suite.test('a mid-flight scroll ends the transition instead of pinning the snapshot to the screen', async () => {
    let skips = 0
    imageFrames = [imageFrame('water-lilies', { x: 10, y: 20, width: 400, height: 300 })]
    fakeDocument.startViewTransition = (render) => {
      imageFrames = [imageFrame('water-lilies', { x: 50, y: 60, width: 800, height: 600 })]
      render()
      return { ready: Promise.resolve(), finished: Promise.resolve(), skipTransition() { skips++ } }
    }
    navigate('/art/water-lilies')
    await Promise.resolve()
    const scroll = handlers.get('scroll')
    assert.ok(scroll, 'the router watches scroll while a transition is running')
    // Restoring the destination scroll position must not end its own transition.
    fakeWindow.scrollY = 6
    scroll()
    assert.equal(skips, 0)
    fakeWindow.scrollY = 400
    scroll()
    assert.equal(skips, 1)
    fakeDocument.startViewTransition = undefined
    imageFrames = []
  })
})
