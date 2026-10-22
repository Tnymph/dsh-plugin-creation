import assert from 'node:assert/strict'
import test from 'node:test'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { checkPptOutput } from '../scripts/check-ppt-output.mjs'

const fixtures = join(dirname(fileURLToPath(import.meta.url)), 'fixtures')

test('valid deck: status, notes, replaceable slots all agree', () => {
  const report = checkPptOutput(join(fixtures, 'ppt-valid'))
  assert.equal(report.ok, true, report.errors.join('; '))
  assert.equal(report.status, 'DONE')
  assert.equal(report.counts.slides, 2)
  assert.equal(report.counts.images_provided, 1)
  assert.equal(report.counts.images_placeholder, 0)
  assert.equal(report.checks.noteSections, 2)
})

test('missing speaker notes is a contract violation', () => {
  const report = checkPptOutput(join(fixtures, 'ppt-broken-notes'))
  assert.equal(report.ok, false)
  assert.ok(
    report.errors.some((error) => /notes must be a string/.test(error)),
    `expected a notes error, got: ${report.errors.join('; ')}`,
  )
})

test('NEED_INPUT: no half-built deck, non-empty requests', () => {
  const report = checkPptOutput(join(fixtures, 'ppt-need-input'))
  assert.equal(report.ok, true, report.errors.join('; '))
  assert.equal(report.status, 'NEED_INPUT')
  assert.equal(report.counts.slides, 0)
  assert.equal(report.checks.requests, true)
})

test('missing directory fails closed', () => {
  const report = checkPptOutput(join(fixtures, 'does-not-exist'))
  assert.equal(report.ok, false)
  assert.ok(report.errors[0].startsWith('output directory does not exist'))
})
