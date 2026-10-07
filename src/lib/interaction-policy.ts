export function canUsePointerEffects({ enabled, finePointer, hover, pointerType = 'mouse' }: {
  enabled: boolean
  finePointer: boolean
  hover: boolean
  pointerType?: string
}) {
  // Pointer capability only: the motion preference never enters this decision.
  return enabled && finePointer && hover && pointerType === 'mouse'
}

export function pointerOffset(x: number, y: number, rect: { left: number; top: number; width: number; height: number }, strength: number) {
  if (rect.width <= 0 || rect.height <= 0) return { x: 0, y: 0 }
  const clamp = (value: number) => Math.max(-1, Math.min(1, value))
  return { x: clamp((x - rect.left - rect.width / 2) / (rect.width / 2)) * strength,
    y: clamp((y - rect.top - rect.height / 2) / (rect.height / 2)) * strength }
}

export function cursorPosition(x: number, y: number, width: number, height: number, radius = 54) {
  const clamp = (value: number, limit: number) => limit < radius * 2 ? limit / 2 : Math.max(radius, Math.min(limit - radius, value))
  return { x: clamp(x, width), y: clamp(y, height) }
}

export function cursorHint({ explicit, tag, disabled, expanded, detailsOpen, external }: {
  explicit?: string | null
  tag?: string
  disabled?: boolean
  expanded?: boolean
  detailsOpen?: boolean
  external?: boolean
}) {
  if (disabled) return ''
  if (explicit !== undefined && explicit !== null) return explicit.trim().slice(0, 24)
  if (tag === 'SUMMARY') return detailsOpen ? 'Less' : 'Details'
  if (tag === 'BUTTON') return expanded === undefined ? 'Select' : expanded ? 'Close' : 'Open'
  if (tag === 'A') return external ? 'Visit' : 'Explore'
  return ''
}
