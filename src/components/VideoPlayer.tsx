import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { isMediaVisible, isPlaybackFailure, shouldAutoplay } from '@/lib/media-policy'

// The player is content-free: the caller supplies what it plays, so every source
// comes from the content files rather than a default buried in a component.
type VideoPlayerProps = {
  autoplay?: boolean
  label?: string
  src: string
  poster: string
  caption?: string
  demo?: boolean
}

/** The corner mark for sound: drawn rather than an emoji, so it follows the theme's ink. */
function SoundIcon({ muted }: { muted: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor"
      strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d="M4 9.5h3.5L13 5.5v13L7.5 14.5H4z" />
      {muted
        ? <path d="M16.5 9.5l4.5 5M21 9.5l-4.5 5" />
        : <path d="M16.6 8.2a5.4 5.4 0 0 1 0 7.6M19.4 5.8a8.8 8.8 0 0 1 0 12.4" />}
    </svg>
  )
}

export function VideoPlayer({
  autoplay = false,
  label = 'Preview video',
  src,
  poster,
  caption,
  demo = false,
}: VideoPlayerProps) {
  const video = useRef<HTMLVideoElement>(null)
  const manualPause = useRef(false)
  const duration = useRef(0)
  // While a drag is in flight the bar owns its position, so playback updates cannot fight it.
  const dragging = useRef(false)
  const [playing, setPlaying] = useState(false)
  const [muted, setMuted] = useState(true)
  const [progress, setProgress] = useState(0)
  const [failed, setFailed] = useState(false)
  const [buffering, setBuffering] = useState(false)
  const [hasPlayed, setHasPlayed] = useState(false)

  useEffect(() => {
    const element = video.current
    if (!element) return
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection
    let inView = false
    let disposed = false
    const pauseOthers = () => {
      document.querySelectorAll('video').forEach((other) => {
        if (other !== element) other.pause()
      })
    }
    const maybePlay = () => {
      if (shouldAutoplay({ autoplay, inView, hidden: document.hidden,
        saveData: Boolean(connection?.saveData), manualPause: manualPause.current, muted: element.muted, failed })) {
        element.play().catch(() => { if (!disposed) setPlaying(false) })
      }
    }
    const observer = new IntersectionObserver(([entry]) => {
      inView = isMediaVisible(entry.isIntersecting, entry.intersectionRatio)
      if (inView) maybePlay()
      else element.pause()
    }, { threshold: [0, 0.3] })
    const visibility = () => { if (document.hidden) element.pause(); else maybePlay() }
    element.addEventListener('play', pauseOthers)
    document.addEventListener('visibilitychange', visibility)
    observer.observe(element)
    return () => {
      disposed = true
      observer.disconnect()
      element.pause()
      element.removeEventListener('play', pauseOthers)
      document.removeEventListener('visibilitychange', visibility)
    }
  }, [autoplay, failed, src])

  const play = () => {
    if (!video.current) return
    manualPause.current = false
    video.current.play().catch((error: DOMException) => {
      // Browser autoplay/permission rejection is not a broken media file.
      if (isPlaybackFailure(error)) setFailed(true)
    })
  }

  const togglePlayback = () => {
    if (playing) {
      manualPause.current = true
      video.current?.pause()
    } else play()
  }

  const toggleSound = () => {
    if (!video.current) return
    const nextMuted = !muted
    video.current.muted = nextMuted
    setMuted(nextMuted)
    if (!nextMuted) play()
  }

  /** Keep the bar in step with playback, unless the reader is dragging it. */
  const syncProgress = (element: HTMLVideoElement) => {
    duration.current = Number.isFinite(element.duration) ? element.duration : 0
    if (!dragging.current && duration.current > 0) setProgress(Math.min(1, element.currentTime / duration.current))
  }

  const seek = (fraction: number) => {
    setProgress(fraction)
    if (video.current && duration.current > 0) video.current.currentTime = fraction * duration.current
  }

  const state = failed ? 'Video unavailable' : buffering && playing ? 'Buffering' : playing ? 'Playing' : 'Paused'

  return (
    <div className="video-player">
      <div className="video-stage">
        <video ref={video} aria-label={label} src={src} poster={poster} muted={muted} playsInline loop={demo} preload="none"
          onPlay={() => { setPlaying(true); setHasPlayed(true) }}
          onPause={() => { setPlaying(false); setBuffering(false) }}
          onTimeUpdate={(event) => syncProgress(event.currentTarget)}
          onDurationChange={(event) => syncProgress(event.currentTarget)}
          onWaiting={() => setBuffering(true)} onPlaying={() => setBuffering(false)}
          onEnded={() => { setPlaying(false); setProgress(1) }}
          onError={() => setFailed(true)} />
        {/* The whole frame is the play/pause control, so hovering anywhere over the video
            shows the hint and pressing anywhere toggles playback. */}
        {!failed && <button type="button" className="video-toggle" data-cursor={playing ? 'Pause' : 'Play'}
          aria-label={`${playing ? 'Pause' : 'Play'} ${label}`} onClick={togglePlayback} />}
        {/* The poster's own mark: an indicator, not a second control, until something plays. */}
        {!hasPlayed && !failed && <div className="video-overlay" aria-hidden="true"><span className="play-button">▶</span></div>}
        {/* Sound is a small square in the corner, above the play/pause surface. */}
        {!failed && <button type="button" className="video-sound" data-cursor={muted ? 'Play sound' : 'Mute'}
          aria-label={muted ? `Play sound for ${label}` : `Mute ${label}`} aria-pressed={!muted} onClick={toggleSound}>
          <SoundIcon muted={muted} />
        </button>}
        {failed && <div className="video-error" role="status"><p>Video unavailable.</p><button className="button" onClick={() => {
          setFailed(false)
          setBuffering(false)
          setProgress(0)
          video.current?.load()
          play()
        }}>Retry</button></div>}
      </div>
      {/* A small bar under the video: it shows progress, and dragging it seeks. */}
      <input type="range" className="video-progress" min={0} max={1} step={0.001} value={progress}
        aria-label={`Seek ${label}`} disabled={failed}
        style={{ '--video-progress': progress } as CSSProperties}
        onChange={(event) => seek(Number(event.currentTarget.value))}
        onPointerDown={() => { dragging.current = true }}
        onPointerUp={() => { dragging.current = false; if (video.current) syncProgress(video.current) }}
        onPointerCancel={() => { dragging.current = false }} />
      <span className="video-state sr-only" role="status">{state}</span>
      {caption && <p className="media-note">{caption}</p>}
    </div>
  )
}
