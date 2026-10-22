#!/usr/bin/env node
// Consistency validator for a ppt-maker output directory (out/<slug>/).
//
//   node scripts/check-ppt-output.mjs out/<slug>
//
// It is intentionally dependency-free and offline. It checks the *contract*
// (files, status agreement, per-slide speaker notes, replaceable image slots,
// no half-built deck on NEED_INPUT), not the visual quality of the deck:
// `ppt_check` + `ppt_render` are the subagent's responsibility, and the
// rendered pages are the human review surface.
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const REQUIRED_DECK_FILES = [
  'deck.pptx',
  'deck.html',
  'deck.json',
  'outline.md',
  'notes.md',
  'sources.md',
  'assets/MANIFEST.md',
]

export const REQUIRED_COMMON_FILES = ['run.json', 'REPORT.md']

const STATUSES = ['DONE', 'PARTIAL', 'NEED_INPUT', 'FAILED']
const SLOT_RE = /^[a-z0-9][a-z0-9-]*$/
const ASSET_SRC_RE = /^assets\/([a-z0-9][a-z0-9-]*)\.(png|jpe?g|webp|svg)$/
const MIN_NOTES_CHARS = 60

const read = (dir, rel) => readFileSync(join(dir, rel), 'utf8')

function parseManifest(text) {
  const rows = []
  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed.startsWith('|')) continue
    const cells = trimmed.replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim())
    if (cells.every((c) => /^:?-{3,}:?$/.test(c))) continue
    if (cells[0] === '槽位' || cells[0].toLowerCase() === 'slot') continue
    if (cells.length < 4) continue
    rows.push({ slot: cells[0], purpose: cells[1], file: cells[2], status: cells[3] })
  }
  return rows
}

function countNotesSections(text) {
  return text.split('\n').filter((line) => /^##\s+/.test(line)).length
}

export function checkPptOutput(dir) {
  const errors = []
  const warnings = []
  const result = {
    ok: false,
    dir,
    status: undefined,
    counts: { slides: 0, images_provided: 0, images_placeholder: 0 },
    checks: {},
    errors,
    warnings,
  }
  const fail = (message) => errors.push(message)

  if (!existsSync(dir)) {
    fail(`output directory does not exist: ${dir}`)
    return result
  }
  for (const rel of REQUIRED_COMMON_FILES) {
    if (!existsSync(join(dir, rel))) fail(`missing required file: ${rel}`)
  }
  if (errors.length > 0) return result

  let run
  try {
    run = JSON.parse(read(dir, 'run.json'))
  } catch (error) {
    fail(`run.json is not valid JSON: ${error instanceof Error ? error.message : String(error)}`)
    return result
  }
  const status = run.status
  result.status = status
  if (!STATUSES.includes(status)) fail(`run.json status must be one of ${STATUSES.join('/')}, got ${status}`)

  const report = read(dir, 'REPORT.md')
  const firstLine = report.split('\n').find((line) => line.trim().length > 0)?.trim() ?? ''
  const reportStatus = firstLine.match(/^STATUS:\s*([A-Z_]+)$/)?.[1]
  if (!reportStatus) fail('REPORT.md must start with a line like `STATUS: DONE`')
  else if (reportStatus !== status) fail(`REPORT.md STATUS (${reportStatus}) must equal run.json status (${status})`)

  if (status === 'NEED_INPUT') {
    if (!existsSync(join(dir, 'requests.md'))) fail('NEED_INPUT requires requests.md with the missing-material list')
    if (!Array.isArray(run.requests) || run.requests.length === 0) fail('NEED_INPUT requires a non-empty run.json.requests array')
    for (const rel of ['deck.pptx', 'deck.html', 'deck.json']) {
      if (existsSync(join(dir, rel))) fail(`NEED_INPUT must not ship a half-built deck: remove ${rel}`)
    }
    result.checks = {
      statusLine: true,
      runStatus: status,
      requests: existsSync(join(dir, 'requests.md')),
      deckForbidden: true,
      slides: 0,
      tableRows: 0,
      bibMatchesRows: true,
      imageSlots: 0,
    }
    result.ok = errors.length === 0
    return result
  }

  for (const rel of REQUIRED_DECK_FILES) {
    if (!existsSync(join(dir, rel))) fail(`missing required file: ${rel}`)
  }
  if (errors.length > 0) return result

  let deck
  try {
    deck = JSON.parse(read(dir, 'deck.json'))
  } catch (error) {
    fail(`deck.json is not valid JSON: ${error instanceof Error ? error.message : String(error)}`)
    return result
  }
  const slides = Array.isArray(deck.slides) ? deck.slides : []
  if (slides.length === 0) fail('deck.json must contain at least one slide')
  result.counts.slides = slides.length
  if (run.deck?.pages !== slides.length) fail(`run.json deck.pages (${run.deck?.pages}) must equal deck.json slides (${slides.length})`)
  if (run.counts?.slides !== slides.length) fail(`run.json counts.slides (${run.counts?.slides}) must equal deck.json slides (${slides.length})`)

  const notes = read(dir, 'notes.md')
  const notesSections = countNotesSections(notes)
  if (notesSections !== slides.length) {
    fail(`notes.md has ${notesSections} \`##\` sections; expected one per slide (${slides.length})`)
  }

  slides.forEach((slide, index) => {
    const label = `slide ${index + 1}`
    if (!slide || typeof slide !== 'object') {
      fail(`${label} is not an object`)
      return
    }
    if (typeof slide.title !== 'string' || slide.title.trim().length === 0) fail(`${label} has no title`)
    if (typeof slide.notes !== 'string' || slide.notes.trim().length < MIN_NOTES_CHARS) {
      fail(`${label} notes must be a string of at least ${MIN_NOTES_CHARS} chars (speaker notes are mandatory)`)
    }
    const image = slide.image
    if (image == null) return
    if (typeof image.src !== 'string') {
      fail(`${label} image.src must be a string`)
      return
    }
    if (/^https?:/i.test(image.src)) fail(`${label} image.src must not be a remote URL (${image.src})`)
    if (image.src.startsWith('data:') && !/^data:image\//i.test(image.src)) fail(`${label} image.src has an unsupported data URI`)
  })

  let rows = []
  try {
    rows = parseManifest(read(dir, 'assets/MANIFEST.md'))
  } catch (error) {
    fail(`assets/MANIFEST.md unreadable: ${error instanceof Error ? error.message : String(error)}`)
  }
  const slotNames = new Set()
  const provided = []
  const placeholders = []
  for (const row of rows) {
    if (!SLOT_RE.test(row.slot)) {
      fail(`MANIFEST slot "${row.slot}" must be lowercase kebab-case`)
      continue
    }
    if (slotNames.has(row.slot)) fail(`MANIFEST slot "${row.slot}" is duplicated`)
    slotNames.add(row.slot)
    if (row.status === 'provided') {
      provided.push(row)
      if (!ASSET_SRC_RE.test(row.file)) {
        fail(`MANIFEST slot "${row.slot}" provided file must look like assets/<slot>.<ext>, got ${row.file}`)
        continue
      }
      const fileSlot = row.file.match(ASSET_SRC_RE)?.[1]
      if (fileSlot !== row.slot) fail(`MANIFEST slot "${row.slot}" points at a different slot file: ${row.file}`)
      if (!existsSync(join(dir, row.file))) fail(`MANIFEST slot "${row.slot}" declares a missing file: ${row.file}`)
    } else if (row.status === 'placeholder') {
      placeholders.push(row)
      if (existsSync(join(dir, row.file))) {
        fail(`MANIFEST slot "${row.slot}" is still placeholder but the file exists; run a revise pass to mark it provided`)
      }
    } else {
      fail(`MANIFEST slot "${row.slot}" status must be provided or placeholder, got ${row.status}`)
    }
  }
  result.counts.images_provided = provided.length
  result.counts.images_placeholder = placeholders.length
  if (run.counts?.images_provided !== provided.length) {
    fail(`run.json counts.images_provided (${run.counts?.images_provided}) must equal MANIFEST provided rows (${provided.length})`)
  }
  if (run.counts?.images_placeholder !== placeholders.length) {
    fail(`run.json counts.images_placeholder (${run.counts?.images_placeholder}) must equal MANIFEST placeholder rows (${placeholders.length})`)
  }

  // Only user-provided assets may exist: every file under assets/ (except the
  // manifest) has to be declared as a provided slot. This is the machine check
  // behind the "no generated images" rule.
  const assetsDir = join(dir, 'assets')
  if (existsSync(assetsDir)) {
    const declared = new Set(provided.map((row) => row.file))
    for (const entry of readdirSync(assetsDir, { withFileTypes: true })) {
      if (entry.isDirectory()) continue
      if (entry.name === 'MANIFEST.md') continue
      const rel = `assets/${entry.name}`
      if (!declared.has(rel)) fail(`assets/${entry.name} is not declared as a provided slot (generated images are forbidden)`)
    }
  }

  const checks = run.checks ?? {}
  if (!checks.ppt_check) warnings.push('run.json.checks.ppt_check is empty; record the ppt_check outcome')
  if (!checks.render) warnings.push('run.json.checks.render is empty; record the render/inspection outcome')

  result.checks = {
    statusLine: reportStatus === status,
    runStatus: status,
    requests: true,
    deckForbidden: true,
    slides: slides.length,
    noteSections: notesSections,
    imageSlots: rows.length,
    provided: provided.length,
    placeholders: placeholders.length,
  }
  result.ok = errors.length === 0
  return result
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const dir = process.argv[2]
  if (!dir) {
    console.error('usage: node scripts/check-ppt-output.mjs <output-dir>')
    process.exit(2)
  }
  const report = checkPptOutput(dir)
  console.log(JSON.stringify(report, null, 2))
  process.exit(report.ok ? 0 : 1)
}
