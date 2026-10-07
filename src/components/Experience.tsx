'use client'

import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import Lenis from 'lenis'
import { motion, useMotionValue, useSpring } from 'motion/react'
import { canUsePointerEffects, cursorHint, cursorPosition, pointerOffset } from '@/lib/interaction-policy'
import { linkAccent } from '@/lib/routes'
import { registerScrollController } from '@/lib/scroll-controller'

export function SmoothScroll() {
  useEffect(() => {
    const lenis = new Lenis({ autoRaf: true, lerp: 0.085, smoothWheel: true, syncTouch: false, anchors: true,
      prevent: (element) => Boolean(element.closest('dialog, [data-lenis-prevent]')) })
    const unregister = registerScrollController((top) => {
      lenis.resize()
      lenis.scrollTo(top, { immediate: true, force: true })
    })
    const syncModal = () => {
      if (document.querySelector('dialog[open]')) lenis.stop()
      else if (lenis.isStopped) lenis.start()
    }
    const observer = new MutationObserver(syncModal)
    observer.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['open'] })
    syncModal()
    return () => { observer.disconnect(); unregister(); lenis.destroy() }
  }, [])
  return null
}

export function ExperienceCursor() {
  const root = useRef<HTMLDivElement>(null)
  const label = useRef<HTMLSpanElement>(null)
  const x = useMotionValue(-200)
  const y = useMotionValue(-200)
  const followX = useSpring(x, { stiffness: 600, damping: 42, mass: 0.35 })
  const followY = useSpring(y, { stiffness: 600, damping: 42, mass: 0.35 })
  const size = useSpring(0.12, { stiffness: 320, damping: 24 })
  const labelOpacity = useMotionValue(0)
  const press = useSpring(1, { stiffness: 600, damping: 25 })

  useEffect(() => {
    const element = root.current
    if (!element) return
    const fine = window.matchMedia('(pointer: fine) and (hover: hover)')
    let surface: HTMLElement | null = null
    let lastX = 0
    let lastY = 0
    let visible = false
    let hint = ''

    const resetSurface = () => {
      if (!surface) return
      surface.style.removeProperty('--pointer-x')
      surface.style.removeProperty('--pointer-y')
      surface.style.removeProperty('--rotate-x')
      surface.style.removeProperty('--rotate-y')
      surface.style.removeProperty('--light-x')
      surface.style.removeProperty('--light-y')
      surface = null
    }
    const hide = () => {
      visible = false
      resetSurface()
      element.dataset.visible = 'false'
      document.documentElement.classList.remove('cursor-active')
    }
    const updateTarget = (candidate: Element) => {
      const native = candidate.closest('input, textarea, select, [contenteditable="true"], video[controls], [data-cursor-native], dialog')
      if (native) { hide(); return }
      document.documentElement.classList.add('cursor-active')
      element.dataset.visible = 'true'
      const next = candidate.closest<HTMLElement>('[data-cursor], a, button, summary')
      const expanded = next?.getAttribute('aria-expanded')
      hint = next ? cursorHint({ explicit: next.getAttribute('data-cursor'), tag: next.tagName,
        disabled: next.matches(':disabled, [aria-disabled="true"]'),
        expanded: expanded === null ? undefined : expanded === 'true',
        detailsOpen: next.closest('details')?.open, external: next.getAttribute('target') === '_blank' }) : ''
      if (label.current && label.current.textContent !== hint) label.current.textContent = hint
      labelOpacity.set(hint ? 1 : 0)
      size.set(hint ? 1 : next ? 0.3 : 0.12)
      element.dataset.hint = hint ? 'true' : 'false'
      // Preview where the link leads, not the identity of the page it sits on.
      element.dataset.accent = linkAccent(next?.closest('a[href]')?.getAttribute('href')) ?? ''
      const nextSurface = candidate.closest<HTMLElement>('[data-magnetic], [data-depth], [data-light]')
      if (surface !== nextSurface) { resetSurface(); surface = nextSurface }
    }
    // Re-read whatever sits under the pointer. A View Transition briefly reports nothing at
    // a point, and that is not the pointer leaving, so an unresolved point keeps the cursor
    // exactly as it was instead of hiding it for the length of the animation.
    const syncAt = (atX: number, atY: number) => {
      const at = document.elementFromPoint(atX, atY)
      if (at) updateTarget(at)
    }
    const move = (event: PointerEvent) => {
      if (!canUsePointerEffects({ enabled: true, finePointer: fine.matches, hover: fine.matches, pointerType: event.pointerType })) {
        hide(); return
      }
      lastX = event.clientX
      lastY = event.clientY
      if (event.target instanceof Element) updateTarget(event.target)
      else hide()
      const position = cursorPosition(lastX, lastY, window.innerWidth, window.innerHeight, hint ? 54 : 12)
      if (!visible) { followX.jump(position.x); followY.jump(position.y) }
      visible = true
      x.set(position.x)
      y.set(position.y)
      if (surface) {
        const offset = pointerOffset(lastX, lastY, surface.getBoundingClientRect(), surface.hasAttribute('data-magnetic') ? 7 : 1)
        surface.style.setProperty('--pointer-x', `${offset.x}px`)
        surface.style.setProperty('--pointer-y', `${offset.y}px`)
        surface.style.setProperty('--rotate-x', `${-offset.y * 2.2}deg`)
        surface.style.setProperty('--rotate-y', `${offset.x * 2.2}deg`)
        if (surface.hasAttribute('data-light')) {
          surface.style.setProperty('--light-x', `${(offset.x + 1) * 50}%`)
          surface.style.setProperty('--light-y', `${(offset.y + 1) * 50}%`)
        }
      }
    }
    const down = () => press.set(0.84)
    const up = () => { press.set(1); syncAt(lastX, lastY) }
    const keyboard = (event: KeyboardEvent) => { if (event.key === 'Tab') hide() }
    const leave = (event: PointerEvent) => { if (!event.relatedTarget) hide() }
    const syncHover = () => { if (visible) syncAt(lastX, lastY) }
    const preferences = () => { if (!fine.matches) hide() }
    const observer = new MutationObserver(syncHover)
    observer.observe(document.body, { subtree: true, childList: true, attributes: true,
      attributeFilter: ['data-cursor', 'aria-expanded', 'disabled', 'open'] })
    window.addEventListener('pointermove', move, { passive: true })
    window.addEventListener('pointerdown', down)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
    window.addEventListener('pointerout', leave)
    window.addEventListener('blur', hide)
    window.addEventListener('keydown', keyboard)
    fine.addEventListener('change', preferences)
    return () => {
      hide(); observer.disconnect()
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerdown', down)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
      window.removeEventListener('pointerout', leave)
      window.removeEventListener('blur', hide)
      window.removeEventListener('keydown', keyboard)
      fine.removeEventListener('change', preferences)
    }
    // The cursor owns no route state. Re-running this effect on navigation would hide it
    // through the cleanup and leave it hidden until the next pointer move, which is the
    // whole artwork animation, so the dependencies stay free of anything route-shaped.
  }, [x, y, followX, followY, size, labelOpacity, press])

  return createPortal(
    <motion.div ref={root} className="experience-cursor" aria-hidden="true" data-visible="false" style={{ x: followX, y: followY }}>
      <motion.div className="cursor-press" style={{ scale: press }}>
        <motion.div className="cursor-disc" style={{ scale: size }} />
        <motion.span ref={label} className="cursor-label" style={{ opacity: labelOpacity }} />
      </motion.div>
    </motion.div>, document.body,
  )
}
