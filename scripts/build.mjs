#!/usr/bin/env node
// Generate the two bundle patches for every mode under modes/<mode>/.
//
// Why two bundles instead of one: a host-level `@deepseek-ai/dsh-tool-subagent`
// row validates its `agentPreset` against the preset registry while the patch
// transaction loads. A preset row inserted by the SAME transaction is not
// visible to that check yet, so a single bundle that inserts both rows fails
// with `Unknown agent preset: <id>`. Splitting the delivery into
//   1. bundles/<mode>/      — the Agent preset
//   2. bundles/<mode>-tool/ — the host delegation tool
// makes the second install a separate transaction where the preset is already
// declared. tests/project.test.mjs locks this split in place.
//
// Mode sources:
//   modes/<mode>/persona.md                 — the subagent persona
//   modes/<mode>/preset.patch.template.yml  — preset row, {{PERSONA_BLOCK}} placeholder
//   modes/<mode>/tool.patch.template.yml    — tool row
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
export const DEFAULT_ROOT = join(HERE, '..')
export const PERSONA_BLOCK_INDENT = 16
export const DEFAULT_MODE = 'paper-patent-scout'

function readNorm(root, parts) {
  return readFileSync(join(root, ...parts), 'utf8').replace(/\r\n/g, '\n')
}

export function modeDir(root, modeId) {
  return join(root, 'modes', modeId)
}

/** Bundle directory pair for a mode: the preset bundle and the tool bundle. */
export function bundlePaths(root, modeId) {
  return {
    preset: join(root, 'bundles', modeId),
    tool: join(root, 'bundles', `${modeId}-tool`),
  }
}

/** Every mode directory that has a persona source, sorted. */
export function listModes(root = DEFAULT_ROOT) {
  const modesRoot = join(root, 'modes')
  if (!existsSync(modesRoot)) return []
  return readdirSync(modesRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => existsSync(join(modesRoot, name, 'persona.md')))
    .sort()
}

/** Render the preset patch YAML for one mode. Pure: no writes. */
export function buildPresetPatch(root = DEFAULT_ROOT, modeId = DEFAULT_MODE) {
  const persona = readNorm(root, ['modes', modeId, 'persona.md']).trimEnd()
  if (!persona) throw new Error(`modes/${modeId}/persona.md is empty`)
  if (persona.includes('\t')) {
    throw new Error(`modes/${modeId}/persona.md contains a tab; YAML block scalars must use spaces`)
  }
  const template = readNorm(root, ['modes', modeId, 'preset.patch.template.yml'])
  if (!template.includes('{{PERSONA_BLOCK}}')) {
    throw new Error(`modes/${modeId}/preset.patch.template.yml is missing the {{PERSONA_BLOCK}} placeholder`)
  }
  const indent = ' '.repeat(PERSONA_BLOCK_INDENT)
  const block = persona
    .split('\n')
    .map((line) => (line.length === 0 ? '' : indent + line))
    .join('\n')
  return template.replace('{{PERSONA_BLOCK}}', block)
}

/** Render the tool patch YAML for one mode. Pure: no writes. */
export function buildToolPatch(root = DEFAULT_ROOT, modeId = DEFAULT_MODE) {
  const patch = readNorm(root, ['modes', modeId, 'tool.patch.template.yml'])
  if (patch.includes('{{')) {
    throw new Error(`modes/${modeId}/tool.patch.template.yml still contains a scaffold placeholder`)
  }
  if (!patch.includes('@deepseek-ai/dsh-tool-subagent')) {
    throw new Error(`modes/${modeId}/tool.patch.template.yml must mount @deepseek-ai/dsh-tool-subagent`)
  }
  return patch
}

export function buildAll(root = DEFAULT_ROOT) {
  const modes = listModes(root)
  if (modes.length === 0) throw new Error('no modes found under modes/')
  return modes.map((modeId) => {
    const paths = bundlePaths(root, modeId)
    const presetPatch = buildPresetPatch(root, modeId)
    const toolPatch = buildToolPatch(root, modeId)
    for (const dir of [paths.preset, paths.tool]) {
      if (!existsSync(join(dir, 'package.json'))) {
        throw new Error(`${dir} is missing package.json; scaffold the bundle pair before building`)
      }
    }
    const presetOut = join(paths.preset, 'cordis.patch.yml')
    const toolOut = join(paths.tool, 'cordis.patch.yml')
    writeFileSync(presetOut, presetPatch, 'utf8')
    writeFileSync(toolOut, toolPatch, 'utf8')
    return {
      modeId,
      preset: { patch: presetPatch, out: presetOut },
      tool: { patch: toolPatch, out: toolOut },
    }
  })
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  for (const { modeId, preset, tool } of buildAll(DEFAULT_ROOT)) {
    console.log(`wrote ${preset.out} (${preset.patch.split('\n').length} lines) · preset of ${modeId}`)
    console.log(`wrote ${tool.out} (${tool.patch.split('\n').length} lines) · tool of ${modeId}`)
  }
}
