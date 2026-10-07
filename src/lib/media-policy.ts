type AutoplayState = {
  autoplay: boolean
  inView: boolean
  hidden: boolean
  saveData: boolean
  manualPause: boolean
  muted: boolean
  failed: boolean
}

export function shouldAutoplay(state: AutoplayState) {
  return state.autoplay && state.inView && !state.hidden
    && !state.saveData && !state.manualPause && state.muted && !state.failed
}

export function isMediaVisible(isIntersecting: boolean, intersectionRatio: number) {
  return isIntersecting && intersectionRatio >= 0.3
}

export function isPlaybackFailure(error: { name?: string }) {
  return error.name !== 'NotAllowedError' && error.name !== 'AbortError'
}
