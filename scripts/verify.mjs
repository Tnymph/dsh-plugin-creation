#!/usr/bin/env node
// Contract gate for this repository. Every check is deterministic and offline:
// it validates the generated deployment artifacts, the documented contracts and
// the mode scaffolding. Live DSH install/call verification is documented in
// tests/acceptance.md because it needs a running Harness.
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildPresetPatch, buildToolPatch, DEFAULT_MODE } from './build.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
export const DEFAULT_ROOT = join(HERE, '..')

const MODE = DEFAULT_MODE
const PRESET_ROW = `preset-${MODE}`
const TOOL_ROW = MODE

export const REQUIRED_FILES = [
  'README.md',
  'AGENTS.md',
  '需求文档.md',
  'schema/output.schema.json',
  'specs/paper-patent-scout.spec.md',
  'docs/architecture.md',
  'docs/retrieval-playbook.md',
  'docs/install.md',
  'docs/troubleshooting.md',
  'modes/paper-patent-scout/persona.md',
  'modes/paper-patent-scout/preset.patch.template.yml',
  'modes/paper-patent-scout/tool.patch.template.yml',
  'modes/paper-patent-scout/output-contract.md',
  'bundles/paper-patent-scout/package.json',
  'bundles/paper-patent-scout/README.md',
  'bundles/paper-patent-scout/cordis.patch.yml',
  'bundles/paper-patent-scout-tool/package.json',
  'bundles/paper-patent-scout-tool/README.md',
  'bundles/paper-patent-scout-tool/cordis.patch.yml',
  'templates/mode/persona.md.tpl',
  'templates/mode/preset.patch.template.yml',
  'templates/mode/tool.patch.template.yml',
  'examples/01-papers.md',
  'examples/02-patents.md',
  'examples/03-mixed.md',
  'scripts/build.mjs',
  'scripts/new-mode.mjs',
  'scripts/check-output.mjs',
  'tests/acceptance.md',
  'tests/acceptance-log.md',
  'tests/check-output.test.mjs',
  'tests/fixtures/valid-output/evidence.md',
  'tests/fixtures/broken-output/references.bib',
  'tests/fixtures/missing-field-output/papers.json',
  '.gitignore',
]

const PERSONA_NEEDLES = [
  '不编造',
  '训练记忆不是证据',
  'read_page',
  'web_fetch',
  'evidence_level',
  'STATUS',
  'NEED_INPUT',
  'references.bib',
  'candidates.csv',
  'run.json',
  'search-log.md',
  'get_ai4scholar_credits',
]

const DOC_NEEDLES = {
  'README.md': ['paper_patent_scout', 'paper-patent-scout-tool'],
  'docs/architecture.md': ['host-level', 'agent-preset', 'paper_patent_scout', 'paper-patent-scout-tool'],
  'docs/retrieval-playbook.md': ['read_page', 'search_papers', 'evidence_level'],
  'docs/install.md': ['plugin_manager', 'install_bundle', 'paper_patent_scout', 'paper-patent-scout-tool'],
  'docs/troubleshooting.md': ['fetch failed', 'read_page', 'Unknown agent preset'],
  'specs/paper-patent-scout.spec.md': ['验收', 'AC-', 'paper-patent-scout-tool'],
  'tests/acceptance.md': ['P1', 'P2', 'P3', 'N1', 'S1', 'S2'],
  '需求文档.md': ['需求', '验收', 'paper-patent-scout-tool'],
}

const PLACEHOLDER_MARKERS = [/\bTBD\b/, /\bTODO\b/, /待补/, /FIXME/]

function read(root, rel) {
  return readFileSync(join(root, rel), 'utf8')
}

function assert(cond, message) {
  if (!cond) throw new Error(message)
}

function deepEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b)
}

export function runChecks(root = DEFAULT_ROOT) {
  const results = []
  const check = (name, fn) => {
    try {
      const detail = fn()
      results.push({ name, pass: true, detail: detail || 'ok' })
    } catch (error) {
      results.push({ name, pass: false, detail: error instanceof Error ? error.message : String(error) })
    }
  }

  check('file manifest', () => {
    const missing = REQUIRED_FILES.filter((rel) => !existsSync(join(root, rel)))
    assert(missing.length === 0, `missing files: ${missing.join(', ')}`)
    return `${REQUIRED_FILES.length} files present`
  })

  check('bundle manifests stay minimal', () => {
    const expected = {
      'bundles/paper-patent-scout/package.json': 'dsh-paper-patent-scout',
      'bundles/paper-patent-scout-tool/package.json': 'dsh-paper-patent-scout-tool',
    }
    for (const [rel, name] of Object.entries(expected)) {
      const pkg = JSON.parse(read(root, rel))
      assert(pkg.name === name, `${rel}: unexpected name ${pkg.name}`)
      assert(pkg.dsh?.bundle?.patch === './cordis.patch.yml', `${rel}: dsh.bundle.patch must point at ./cordis.patch.yml`)
      for (const field of ['engines', 'peerDependencies', 'dependencies', 'devDependencies']) {
        assert(!(field in pkg), `${rel}: ${field} must stay out (local install must not be blocked)`)
      }
    }
    return 'two minimal manifests'
  })

  check('patches generated and in sync', () => {
    const pairs = [
      [buildPresetPatch(root), 'bundles/paper-patent-scout/cordis.patch.yml'],
      [buildToolPatch(root), 'bundles/paper-patent-scout-tool/cordis.patch.yml'],
    ]
    for (const [expected, rel] of pairs) {
      const committed = read(root, rel)
      assert(committed === expected, `${rel} is stale; run \`node scripts/build.mjs\``)
    }
    return `${pairs[0][0].split('\n').length} + ${pairs[1][0].split('\n').length} lines in sync`
  })

  check('preset bundle declares only the preset row', () => {
    const patch = read(root, 'bundles/paper-patent-scout/cordis.patch.yml')
    assert(!patch.includes('\t'), 'patch must not contain tabs')
    for (const needle of [
      `id: ${PRESET_ROW}`,
      "name: '@deepseek-ai/dsh-agent-preset'",
      `id: ${MODE}`,
      'order: 20',
      "name: '@deepseek-ai/dsh-persona'",
    ]) {
      assert(patch.includes(needle), `preset patch missing: ${needle}`)
    }
    assert(
      !patch.includes("name: '@deepseek-ai/dsh-tool-subagent'"),
      'the tool row must live in bundles/paper-patent-scout-tool: a same-transaction insert races the preset check',
    )
    return 'preset row only'
  })

  check('tool bundle declares only the delegation tool', () => {
    const patch = read(root, 'bundles/paper-patent-scout-tool/cordis.patch.yml')
    assert(!patch.includes('\t'), 'patch must not contain tabs')
    for (const needle of [
      `id: ${TOOL_ROW}`,
      "name: '@deepseek-ai/dsh-tool-subagent'",
      'toolName: paper_patent_scout',
      'provider: spawn',
      'maxDepth: 1',
    ]) {
      assert(patch.includes(needle), `tool patch missing: ${needle}`)
    }
    assert(
      !patch.includes("name: '@deepseek-ai/dsh-agent-preset'"),
      'the preset declaration must live in bundles/paper-patent-scout',
    )
    const presetPatch = read(root, 'bundles/paper-patent-scout/cordis.patch.yml')
    const presetId = presetPatch.match(/^\s{8}id: (paper-patent-scout)$/m)?.[1]
    const agentPreset = patch.match(/agentPreset: (paper-patent-scout)$/m)?.[1]
    assert(presetId === MODE, `preset patch has no config.id: ${MODE}`)
    assert(agentPreset === presetId, `agentPreset (${agentPreset}) must equal preset config.id (${presetId})`)
    return 'tool row only, agentPreset matches'
  })

  check('persona prompt', () => {
    const persona = read(root, 'modes/paper-patent-scout/persona.md')
    assert(persona.length > 4000, `persona.md is ${persona.length} chars; expected a substantive specialist prompt`)
    assert(!persona.includes('\t'), 'persona.md must not contain tabs')
    const missing = PERSONA_NEEDLES.filter((n) => !persona.includes(n))
    assert(missing.length === 0, `persona.md missing: ${missing.join(', ')}`)
    for (const heading of ['## 绝对规则', '## 检索策略', '## 输出契约', '## 自检清单']) {
      assert(persona.includes(heading), `persona.md missing section: ${heading}`)
    }
    return `${persona.length} chars`
  })

  check('patch templates', () => {
    const preset = read(root, 'modes/paper-patent-scout/preset.patch.template.yml')
    const tool = read(root, 'modes/paper-patent-scout/tool.patch.template.yml')
    assert(preset.includes('{{PERSONA_BLOCK}}'), 'preset template must contain {{PERSONA_BLOCK}}')
    assert(preset.trimStart().startsWith('#'), 'preset template should start with a generated-file header comment')
    assert(!preset.includes('\t'), 'preset template must not contain tabs')
    assert(tool.includes('@deepseek-ai/dsh-tool-subagent'), 'tool template must mount the delegation tool')
    assert(!tool.includes('{{'), 'tool template must not contain scaffold placeholders')
    return 'preset placeholder intact, tool template concrete'
  })

  check('output schema', () => {
    const schema = JSON.parse(read(root, 'schema/output.schema.json'))
    assert(schema.$defs, 'schema needs $defs')
    for (const def of ['paper', 'patent', 'run']) assert(schema.$defs[def], `schema missing $defs.${def}`)
    const paperRequired = [...schema.$defs.paper.required].sort()
    const expectedPaper = [
      'abstract', 'authors', 'doi', 'evidence_level', 'id', 'key_findings',
      'relevance', 'title', 'type', 'url', 'year',
    ].sort()
    assert(deepEqual(paperRequired, expectedPaper), `paper.required drifted: ${paperRequired.join(',')}`)
    const patentRequired = [...schema.$defs.patent.required].sort()
    const expectedPatent = [
      'assignee', 'evidence_level', 'id', 'key_findings', 'patent_number',
      'relevance', 'title', 'type', 'url',
    ].sort()
    assert(deepEqual(patentRequired, expectedPatent), `patent.required drifted: ${patentRequired.join(',')}`)
    assert(deepEqual(schema.$defs.paper.properties.evidence_level.enum, ['A', 'B', 'C']), 'evidence_level enum drifted')
    assert(deepEqual(schema.$defs.run.properties.status.enum, ['DONE', 'PARTIAL', 'INSUFFICIENT', 'NEED_INPUT', 'FAILED']), 'status enum drifted')
    return '5 statuses, A/B/C evidence, paper+patent+run'
  })

  check('output validator available', () => {
    const fixture = join(root, 'tests/fixtures/valid-output')
    for (const file of ['evidence.md', 'papers.json', 'patents.json', 'candidates.csv', 'references.bib', 'run.json', 'search-log.md']) {
      assert(existsSync(join(fixture, file)), `valid-output fixture missing ${file}`)
    }
    const script = read(root, 'scripts/check-output.mjs')
    for (const needle of ['bibMatchesRows', 'runIncludedMatchesRows', 'extraKeys']) {
      assert(script.includes(needle), `check-output.mjs missing ${needle}`)
    }
    return 'validator + fixtures present'
  })

  check('documents carry their contract', () => {
    for (const [rel, needles] of Object.entries(DOC_NEEDLES)) {
      const body = read(root, rel)
      assert(body.length > 500, `${rel} is too thin (${body.length} chars)`)
      const missing = needles.filter((n) => !body.includes(n))
      assert(missing.length === 0, `${rel} missing: ${missing.join(', ')}`)
    }
    return `${Object.keys(DOC_NEEDLES).length} documents checked`
  })

  check('examples invoke the mode', () => {
    for (const rel of ['examples/01-papers.md', 'examples/02-patents.md', 'examples/03-mixed.md']) {
      const body = read(root, rel)
      assert(body.includes('paper_patent_scout'), `${rel} must show the paper_patent_scout call`)
      assert(body.includes('scout-output/'), `${rel} must state the output directory convention`)
    }
    return '3 examples'
  })

  check('mode scaffolding', () => {
    const tplPersona = read(root, 'templates/mode/persona.md.tpl')
    const tplPreset = read(root, 'templates/mode/preset.patch.template.yml')
    const tplTool = read(root, 'templates/mode/tool.patch.template.yml')
    assert(tplPersona.includes('{{MODE_ID}}'), 'persona template must expose {{MODE_ID}}')
    assert(tplPreset.includes('{{MODE_ID}}'), 'preset template must expose {{MODE_ID}}')
    assert(tplPreset.includes('{{PERSONA_BLOCK}}'), 'preset template must expose {{PERSONA_BLOCK}}')
    assert(!tplTool.includes('{{PERSONA_BLOCK}}'), 'tool template must not carry the persona block')
    const scaffold = read(root, 'scripts/new-mode.mjs')
    assert(scaffold.includes('modes'), 'new-mode.mjs must write into modes/')
    assert(scaffold.includes('-tool'), 'new-mode.mjs must scaffold the paired tool bundle')
    return 'template pair + generator present'
  })

  check('no unfinished placeholders', () => {
    for (const rel of REQUIRED_FILES.filter((f) => /\.(md|yml)$/.test(f))) {
      const body = read(root, rel)
      for (const marker of PLACEHOLDER_MARKERS) {
        assert(!marker.test(body), `${rel} contains ${marker}`)
      }
    }
    return 'clean'
  })

  return { ok: results.every((r) => r.pass), results }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const report = runChecks(DEFAULT_ROOT)
  for (const r of report.results) {
    console.log(`${r.pass ? 'PASS' : 'FAIL'}  ${r.name}${r.pass ? '' : `  —  ${r.detail}`}`)
  }
  const failed = report.results.filter((r) => !r.pass).length
  console.log(`\n${report.results.length - failed}/${report.results.length} checks passed`)
  process.exit(report.ok ? 0 : 1)
}
