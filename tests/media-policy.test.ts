import { test } from 'node:test'
import assert from 'node:assert/strict'
import { isMediaVisible, isPlaybackFailure, shouldAutoplay } from '../src/lib/media-policy.ts'

const eligible = {
  autoplay: true,
  inView: true,
  hidden: false,
  saveData: false,
  manualPause: false,
  muted: true,
  failed: false,
}

test('featured video autoplays only when all safety conditions hold', () => {
  assert.equal(shouldAutoplay(eligible), true)
  for (const condition of ['autoplay', 'inView', 'muted']) {
    assert.equal(shouldAutoplay({ ...eligible, [condition]: false }), false, condition)
  }
  for (const condition of ['hidden', 'saveData', 'manualPause', 'failed']) {
    assert.equal(shouldAutoplay({ ...eligible, [condition]: true }), false, condition)
  }
})

test('audio never starts automatically after unmuting and re-entering the viewport', () => {
  assert.equal(shouldAutoplay({ ...eligible, muted: false }), false)
})

test('video visibility requires at least thirty percent intersection', () => {
  assert.equal(isMediaVisible(true, 0.3), true)
  assert.equal(isMediaVisible(true, 1), true)
  assert.equal(isMediaVisible(true, 0.299), false)
  assert.equal(isMediaVisible(true, 0), false)
  assert.equal(isMediaVisible(false, 1), false)
})

test('browser permission and aborted playback are not labeled as broken media', () => {
  assert.equal(isPlaybackFailure({ name: 'NotAllowedError' }), false)
  assert.equal(isPlaybackFailure({ name: 'AbortError' }), false)
  assert.equal(isPlaybackFailure({ name: 'NotSupportedError' }), true)
  assert.equal(isPlaybackFailure({ name: 'NetworkError' }), true)
})
