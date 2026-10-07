'use client'

import { useEffect, useRef } from 'react'
import { motion, useMotionValue, useScroll, useTransform } from 'motion/react'
import { Color, LinearFilter, Mesh, OrthographicCamera, PlaneGeometry, Scene, ShaderMaterial, Vector2, WebGLRenderer, WebGLRenderTarget } from 'three'
import { ATMOSPHERE_FPS, atmosphereDisplaySize, atmosphereOpacity, atmosphereSize, pointerImpulse, pointerInAtmosphere, shouldRenderAtmosphere, simulationDelta } from '@/lib/atmosphere'
import vertexShader from '@/shaders/atmosphere.vert?raw'
import flowShader from '@/shaders/atmosphere-flow.frag?raw'
import patternShader from '@/shaders/atmosphere-pattern.frag?raw'
import displayShader from '@/shaders/atmosphere-display.frag?raw'

/** One reader for the hero's stylesheet numbers, so a missing token has a single fallback. */
function cssNumber(styles: CSSStyleDeclaration, name: string, fallback: number) {
  const value = parseFloat(styles.getPropertyValue(name))
  return Number.isFinite(value) ? value : fallback
}

// The new reference's fixed-point filament pattern, in the hero's own warm palette,
// with a direct cursor lens and an RGBA8 wake. Three passes: the wake, the hundred-step
// pattern at the layer's low edge, and a display pass at the canvas's own resolution that
// softens the pattern and gives the cursor a sharp, dithered lens over it — a stylesheet
// blur could not be lifted for one region. Motion values drive document-relative fading
// without per-frame React state.
export default function MeAtmosphere() {
  const host = useRef<HTMLDivElement>(null)
  const { scrollY } = useScroll()
  const height = useMotionValue(1)
  const origin = useMotionValue(0)
  const opacity = useTransform(() => atmosphereOpacity(scrollY.get() - origin.get(), height.get()))

  useEffect(() => {
    const element = host.current
    if (!element) return
    const hero = document.querySelector('.me-hero')
    let bounds = { left: 0, top: 0, width: 1, height: 1 }
    let resizeRenderer = () => {}
    const measure = () => {
      // Full-bleed: the shell caps at 1544px, but the atmosphere spans the whole viewport edge to edge.
      element.style.width = `${document.documentElement.clientWidth}px`
      const shellRect = element.parentElement?.getBoundingClientRect()
      if (shellRect) {
        element.style.left = `${-shellRect.left}px`
        // The hero now sits below the collection, so the layer is anchored to the hero's
        // own top rather than the shell's, and covers exactly the hero's height.
        const heroTop = hero ? hero.getBoundingClientRect().top : shellRect.top
        element.style.top = `${heroTop - shellRect.top}px`
      }
      const rect = element.getBoundingClientRect()
      const heroRect = hero?.getBoundingClientRect()
      const measuredHeight = Math.max(1, heroRect ? heroRect.height : window.innerHeight)
      bounds = { left: rect.left, top: rect.top + window.scrollY, width: Math.max(1, rect.width), height: measuredHeight }
      origin.set(bounds.top)
      height.set(measuredHeight)
      resizeRenderer()
    }
    const sizeObserver = new ResizeObserver(measure)
    if (hero) sizeObserver.observe(hero)
    if (element.parentElement) sizeObserver.observe(element.parentElement)
    window.addEventListener('resize', measure)
    measure()
    const cleanupMeasurement = () => { sizeObserver.disconnect(); window.removeEventListener('resize', measure) }

    let renderer: WebGLRenderer
    try {
      renderer = new WebGLRenderer({ antialias: false, alpha: false, depth: false, stencil: false, powerPreference: 'low-power', precision: 'mediump' })
    } catch {
      return cleanupMeasurement // The anchored, fading CSS fallback remains.
    }
    const canvas = renderer.domElement
    canvas.setAttribute('aria-hidden', 'true')
    element.appendChild(canvas)
    renderer.setPixelRatio(1)
    const camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1)
    const scene = new Scene()
    const geometry = new PlaneGeometry(2, 2)
    const makeTarget = () => new WebGLRenderTarget(1, 1, { minFilter: LinearFilter, magFilter: LinearFilter, depthBuffer: false, stencilBuffer: false })
    let read = makeTarget()
    let write = makeTarget()
    const pattern = makeTarget()
    const pointer = new Vector2(0.5, 0.5)
    const previous = new Vector2(0.5, 0.5)
    const impulse = new Vector2()
    const flow = new ShaderMaterial({ vertexShader, fragmentShader: flowShader, depthTest: false, depthWrite: false,
      uniforms: { uPrevious: { value: read.texture }, uTexel: { value: new Vector2() }, uPointer: { value: pointer },
        uImpulse: { value: impulse }, uAspect: { value: 1 }, uDelta: { value: 0 }, uActive: { value: 0 } } })
    const patternPass = new ShaderMaterial({ vertexShader, fragmentShader: patternShader, depthTest: false, depthWrite: false,
      uniforms: { uField: { value: read.texture }, uAspect: { value: 1 }, uTime: { value: 0 } } })
    const display = new ShaderMaterial({ vertexShader, fragmentShader: displayShader, depthTest: false, depthWrite: false,
      uniforms: { uPattern: { value: pattern.texture }, uField: { value: read.texture },
        uPatternTexel: { value: new Vector2() }, uBlur: { value: 2.0 },
        uPointer: { value: pointer }, uHover: { value: 0 }, uAspect: { value: 1 },
        uSurface: { value: new Color() }, uDeep: { value: new Color() }, uWarm: { value: new Color() },
        uStrength: { value: 1 } } })
    const quad = new Mesh(geometry, flow)
    quad.frustumCulled = false
    scene.add(quad)

    let frame = 0
    let last = 0
    let time = 4
    let active = 0
    let hover = 0
    let visible = opacity.get() > 0
    let contextLost = false
    let shaderFailed = false
    let disposed = false
    let needsClear = true
    let hasPointer = false
    let cursor: { x: number; y: number } | null = null
    let pausedForOverlay = false
    const scheme = window.matchMedia('(prefers-color-scheme: dark)')
    const colors = () => {
      const styles = getComputedStyle(document.documentElement)
      display.uniforms.uSurface.value.setStyle(styles.getPropertyValue('--surface').trim())
      display.uniforms.uDeep.value.setStyle(styles.getPropertyValue('--atmosphere-deep').trim())
      display.uniforms.uWarm.value.setStyle(styles.getPropertyValue('--atmosphere-warm').trim())
      // How much pigment the hero shows, so the light surface reads as clearly as the dark one.
      const strength = cssNumber(styles, '--atmosphere-strength', 1)
      display.uniforms.uStrength.value = strength > 0 ? strength : 1
    }
    // The soft focus stays a stylesheet token, so the hero's softness remains one knob.
    const softFocusPx = () => cssNumber(getComputedStyle(element), '--atmosphere-blur', 16)
    const canRender = () => !disposed && !shaderFailed && !pausedForOverlay && shouldRenderAtmosphere({ visible, hidden: document.hidden, contextLost })
    const stop = () => { cancelAnimationFrame(frame); frame = 0; last = 0 }
    const clear = () => {
      renderer.setClearColor(new Color(0, 0.5, 0.5), 1)
      for (const target of [read, write]) { renderer.setRenderTarget(target); renderer.clear() }
      renderer.setRenderTarget(null)
      needsClear = false
    }
    const draw = (now: number) => {
      frame = 0
      if (!canRender()) return
      if (last && now - last < 1000 / ATMOSPHERE_FPS - 1) { frame = requestAnimationFrame(draw); return }
      const delta = simulationDelta(last ? (now - last) / 1000 : 1 / ATMOSPHERE_FPS)
      last = now
      time += delta
      if (needsClear) clear()
      const force = pointerImpulse(previous, pointer, delta)
      impulse.set(force.x, force.y)
      previous.copy(pointer)
      active *= Math.exp(-delta * 1.3)
      hover += ((hasPointer ? 1 : 0) - hover) * (1 - Math.exp(-delta * 8))
      flow.uniforms.uActive.value = active
      flow.uniforms.uDelta.value = delta
      flow.uniforms.uPrevious.value = read.texture
      quad.material = flow
      renderer.setRenderTarget(write)
      renderer.render(scene, camera)
      ;[read, write] = [write, read]
      patternPass.uniforms.uTime.value = time
      patternPass.uniforms.uField.value = read.texture
      quad.material = patternPass
      renderer.setRenderTarget(pattern)
      renderer.render(scene, camera)
      display.uniforms.uField.value = read.texture
      display.uniforms.uHover.value = hover
      quad.material = display
      renderer.setRenderTarget(null)
      renderer.render(scene, camera)
      if (!shaderFailed) element.dataset.ready = 'true'
      if (canRender()) frame = requestAnimationFrame(draw)
    }
    const start = () => { if (!frame && canRender()) frame = requestAnimationFrame(draw) }
    const sync = () => {
      pausedForOverlay = Boolean(document.querySelector('dialog[open]')) || Boolean(document.documentElement.dataset.transition)
      if (pausedForOverlay || document.hidden) { cursor = null; hasPointer = false; active = 0 }
      if (canRender()) start(); else stop()
    }
    const updatePointer = (scrolling = false) => {
      if (!cursor) return
      const next = pointerInAtmosphere(cursor.x, cursor.y, bounds, window.scrollY)
      if (!next.inside) { hasPointer = false; active = 0; return }
      if (!hasPointer || scrolling) previous.set(next.x, next.y)
      pointer.set(next.x, next.y)
      hasPointer = true
      if (!scrolling) active = 1
    }
    resizeRenderer = () => {
      const size = atmosphereSize(bounds.width, bounds.height)
      const displaySize = atmosphereDisplaySize(bounds.width, bounds.height)
      renderer.setSize(displaySize.width, displaySize.height, false)
      read.setSize(size.width, size.height)
      write.setSize(size.width, size.height)
      pattern.setSize(size.width, size.height)
      const aspect = bounds.width / bounds.height
      flow.uniforms.uTexel.value.set(1 / size.width, 1 / size.height)
      flow.uniforms.uAspect.value = aspect
      patternPass.uniforms.uAspect.value = aspect
      // The stylesheet owns the soft focus; the display pass needs it measured in the
      // pattern's own texels, which are wider than a screen pixel.
      display.uniforms.uPatternTexel.value.set(1 / size.width, 1 / size.height)
      display.uniforms.uBlur.value = softFocusPx() / (bounds.width / size.width)
      display.uniforms.uAspect.value = aspect
      updatePointer(true)
      needsClear = true
      start()
    }
    const move = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse' || !canRender()) return
      cursor = { x: event.clientX, y: event.clientY }
      updatePointer()
    }
    const leave = () => { cursor = null; hasPointer = false; active = 0 }
    const pointerOut = (event: PointerEvent) => { if (!event.relatedTarget) leave() }
    const lost = (event: Event) => { event.preventDefault(); contextLost = true; element.dataset.ready = 'false'; stop() }
    const restored = () => { contextLost = false; needsClear = true; sync() }
    const theme = () => { colors(); start() }
    renderer.debug.onShaderError = () => { shaderFailed = true; element.dataset.ready = 'false'; stop() }
    colors()
    resizeRenderer()
    quad.material = flow
    renderer.compile(scene, camera)
    quad.material = patternPass
    renderer.compile(scene, camera)
    quad.material = display
    renderer.compile(scene, camera)
    const unsubscribeFade = opacity.on('change', (value) => { visible = value > 0; sync() })
    const unsubscribeScroll = scrollY.on('change', () => updatePointer(true))
    const themeObserver = new MutationObserver(theme)
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    const overlayObserver = new MutationObserver(sync)
    overlayObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-transition'] })
    overlayObserver.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['open'] })
    window.addEventListener('pointermove', move, { passive: true })
    window.addEventListener('pointerout', pointerOut)
    window.addEventListener('blur', leave)
    document.addEventListener('visibilitychange', sync)
    canvas.addEventListener('webglcontextlost', lost)
    canvas.addEventListener('webglcontextrestored', restored)
    scheme.addEventListener('change', theme)
    sync()

    return () => {
      disposed = true
      stop()
      cleanupMeasurement(); unsubscribeFade(); unsubscribeScroll()
      themeObserver.disconnect(); overlayObserver.disconnect()
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerout', pointerOut)
      window.removeEventListener('blur', leave)
      document.removeEventListener('visibilitychange', sync)
      canvas.removeEventListener('webglcontextlost', lost)
      canvas.removeEventListener('webglcontextrestored', restored)
      scheme.removeEventListener('change', theme)
      geometry.dispose(); flow.dispose(); patternPass.dispose(); display.dispose(); read.dispose(); write.dispose(); pattern.dispose()
      renderer.dispose(); renderer.forceContextLoss()
      canvas.remove()
    }
  }, [scrollY, height, origin, opacity])

  return <motion.div ref={host} className="me-atmosphere" aria-hidden="true" style={{ height, opacity }} />
}
