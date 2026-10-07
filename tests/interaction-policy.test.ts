import { test } from 'node:test'
import assert from 'node:assert/strict'
import { canUsePointerEffects, cursorHint, cursorPosition, pointerOffset } from '../src/lib/interaction-policy.ts'

const eligible = { enabled: true, finePointer: true, hover: true }

test('pointer effects run for a mouse with precise hover input', () => {
  assert.equal(canUsePointerEffects(eligible), true)
  assert.equal(canUsePointerEffects({ ...eligible, pointerType: 'touch' }), false)
  assert.equal(canUsePointerEffects({ ...eligible, pointerType: 'pen' }), false)
  assert.equal(canUsePointerEffects({ ...eligible, finePointer: false }), false)
  assert.equal(canUsePointerEffects({ ...eligible, hover: false }), false)
})

test('cursor describes real actions and updates disclosure hints', () => {
  assert.equal(cursorHint({ explicit: 'View work', tag: 'A' }), 'View work')
  assert.equal(cursorHint({ tag: 'A', external: true }), 'Visit')
  assert.equal(cursorHint({ tag: 'BUTTON', expanded: false }), 'Open')
  assert.equal(cursorHint({ tag: 'BUTTON', expanded: true }), 'Close')
  assert.equal(cursorHint({ tag: 'SUMMARY', detailsOpen: false }), 'Details')
  assert.equal(cursorHint({ tag: 'SUMMARY', detailsOpen: true }), 'Less')
  assert.equal(cursorHint({ explicit: 'Play', disabled: true }), '')
  assert.equal(cursorHint({ explicit: '' }), '')
  assert.equal(cursorHint({ tag: 'DIV' }), '')
})

test('hint length stays bounded', () => {
  assert.equal(cursorHint({ explicit: 'x'.repeat(100) }).length, 24)
})

test('magnetic and depth offsets stay bounded and center at zero', () => {
  const rect = { left: 10, top: 20, width: 100, height: 80 }
  assert.deepEqual(pointerOffset(60, 60, rect, 7), { x: 0, y: 0 })
  assert.deepEqual(pointerOffset(999, -999, rect, 7), { x: 7, y: -7 })
  assert.deepEqual(pointerOffset(0, 0, { ...rect, width: 0 }, 7), { x: 0, y: 0 })
})

test('hint badge stays inside viewport edges', () => {
  assert.deepEqual(cursorPosition(0, 0, 1440, 900), { x: 54, y: 54 })
  assert.deepEqual(cursorPosition(1440, 900, 1440, 900), { x: 1386, y: 846 })
  assert.deepEqual(cursorPosition(0, 0, 80, 60), { x: 40, y: 30 })
})
