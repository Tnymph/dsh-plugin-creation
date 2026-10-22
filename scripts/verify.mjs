#!/usr/bin/env node
// Contract gate for this repository. Every check is deterministic and offline:
// it validates the generated deployment artifacts, the documented contracts and
// the mode scaffolding. Live DSH install/call verification is documented in
// tests/acceptance.md because it needs a running Harness.
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildPresetPatch, buildToolPatch, listModes } from './build.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
export const DEFAULT_ROOT = join(HERE, '..')

/**
 * Per-mode contract: what a mode must declare and what its persona must encode.
 * Adding a mode means adding one entry here (plus the files and checks below).
 */
export const MODE_CONTRACTS = {
  'paper-patent-scout': {
    order: 20,
    toolName: 'paper_patent_scout',
    personaMinChars: 4000,
    personaNeedles: [
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
    ],
    personaHeadings: ['## 绝对规则', '## 检索策略', '## 输出契约', '## 自检清单'],
  },
  'ppt-maker': {
    order: 21,
    toolName: 'ppt_maker',
    personaMinChars: 4500,
    personaNeedles: [
      '不编造',
      'NEED_INPUT',
      '评委',
      '讲者备注',
      '可替换',
      'assets/MANIFEST.md',
      '禁止生成图片',
      'sci_draw',
      'ppt_create',
      'ppt_check',
      'ppt_render',
      'deck.pptx',
      'deck.json',
      'HTML',
      'STATUS',
    ],
    personaHeadings: ['## 二、绝对规则', '## 三、工作流', '## 六、输出契约', '## 九、自检清单'],
  },
}

export const REQUIRED_FILES = [
  'README.md',
  'AGENTS.md',
  '需求文档.md',
  'schema/output.schema.json',
  'schema/ppt-output.schema.json',
  'specs/paper-patent-scout.spec.md',
  'specs/ppt-maker.spec.md',
  'docs/architecture.md',
  'docs/retrieval-playbook.md',
  'docs/install.md',
  'docs/troubleshooting.md',
  'templates/mode/persona.md.tpl',
  'templates/mode/preset.patch.template.yml',
  'templates/mode/tool.patch.template.yml',
  'examples/01-papers.md',
  'examples/02-patents.md',
  'examples/03-mixed.md',
  'examples/04-ppt.md',
  'scripts/build.mjs',
  'scripts/new-mode.mjs',
  'scripts/check-output.mjs',
  'scripts/check-ppt-output.mjs',
  'tests/acceptance.md',
  'tests/acceptance-log.md',
  'tests/project.test.mjs',
  'tests/check-output.test.mjs',
  'tests/check-ppt-output.test.mjs',
  'tests/fixtures/valid-output/evidence.md',
  'tests/fixtures/broken-output/references.bib',
  'tests/fixtures/missing-field-output/papers.json',
  'tests/fixtures/ppt-valid/run.json',
  'tests/fixtures/ppt-broken-notes/deck.json',
  'tests/fixtures/ppt-need-input/requests.md',
  '.gitignore',
  'CONTRIBUTING.md',
  '.github/PULL_REQUEST_TEMPLATE.md',
]

const DOC_NEEDLES = {
  'README.md': ['paper_patent_scout', 'ppt_maker', 'paper-patent-scout-tool', 'ppt-maker-tool'],
  'docs/architecture.md': ['host-level', 'agent-preset', 'paper_patent_scout', 'ppt_maker', 'dsh-ppt'],
  'docs/retrieval-playbook.md': ['read_page', 'search_papers', 'evidence_level'],
  'docs/install.md': ['plugin_manager', 'install_bundle', 'paper_patent_scout', 'ppt_maker', 'ppt-maker-tool', 'Unknown agent preset'],
  'docs/troubleshooting.md': ['fetch failed', 'read_page', 'Unknown agent preset', 'ppt_check', 'ppt_render'],
  'specs/paper-patent-scout.spec.md': ['验收', 'AC-', 'paper-patent-scout-tool'],
  'specs/ppt-maker.spec.md': ['验收', 'AC-', 'ppt-maker-tool', '可替换', '讲者备注'],
  'tests/acceptance.md': ['P1', 'P2', 'P3', 'N1', 'S1', 'S2', 'ppt-maker'],
  '需求文档.md': ['需求', '验收', 'ppt-maker', '评委', '可替换'],
  'modes/ppt-maker/output-contract.md': ['讲者备注', 'MANIFEST.md', 'NEED_INPUT'],
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

function modeFiles(modeId) {
  return [
    `modes/${modeId}/persona.md`,
    `modes/${modeId}/preset.patch.template.yml`,
    `modes/${modeId}/tool.patch.template.yml`,
    `modes/${modeId}/output-contract.md`,
    `bundles/${modeId}/package.json`,
    `bundles/${modeId}/README.md`,
    `bundles/${modeId}/cordis.patch.yml`,
    `bundles/${modeId}-tool/package.json`,
    `bundles/${modeId}-tool/README.md`,
    `bundles/${modeId}-tool/cordis.patch.yml`,
  ]
}

export function allRequiredFiles() {
  return [...REQUIRED_FILES, ...Object.keys(MODE_CONTRACTS).flatMap(modeFiles)]
}

const PRESET_ROW = (modeId) => `preset-${modeId}`

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
    const files = allRequiredFiles()
    const missing = files.filter((rel) => !existsSync(join(root, rel)))
    assert(missing.length === 0, `missing files: ${missing.join(', ')}`)
    return `${files.length} files present`
  })

  // ---- per-mode mechanical checks (both bundles, templates, persona) ----
  for (const [modeId, contract] of Object.entries(MODE_CONTRACTS)) {
    const presetDir = `bundles/${modeId}`
    const toolDir = `bundles/${modeId}-tool`

    check(`mode ${modeId} · files present`, () => {
      const missing = modeFiles(modeId).filter((rel) => !existsSync(join(root, rel)))
      assert(missing.length === 0, `missing: ${missing.join(', ')}`)
      return `${modeFiles(modeId).length} files`
    })

    check(`mode ${modeId} · bundle manifests stay minimal`, () => {
      const expected = {
        [`${presetDir}/package.json`]: `dsh-${modeId}`,
        [`${toolDir}/package.json`]: `dsh-${modeId}-tool`,
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

    check(`mode ${modeId} · patches generated and in sync`, () => {
      const pairs = [
        [buildPresetPatch(root, modeId), `${presetDir}/cordis.patch.yml`],
        [buildToolPatch(root, modeId), `${toolDir}/cordis.patch.yml`],
      ]
      for (const [expected, rel] of pairs) {
        const committed = read(root, rel)
        assert(committed === expected, `${rel} is stale; run \`node scripts/build.mjs\``)
      }
      return `${pairs[0][0].split('\n').length} + ${pairs[1][0].split('\n').length} lines in sync`
    })

    check(`mode ${modeId} · preset bundle declares only the preset row`, () => {
      const patch = read(root, `${presetDir}/cordis.patch.yml`)
      assert(!patch.includes('\t'), 'patch must not contain tabs')
      for (const needle of [
        `id: ${PRESET_ROW(modeId)}`,
        "name: '@deepseek-ai/dsh-agent-preset'",
        `order: ${contract.order}`,
        "name: '@deepseek-ai/dsh-persona'",
      ]) {
        assert(patch.includes(needle), `preset patch missing: ${needle}`)
      }
      const presetId = patch.match(new RegExp(`^\\s{8}id: ${modeId}$`, 'm'))?.[0]
      assert(Boolean(presetId), `preset patch has no config.id: ${modeId}`)
      assert(
        !patch.includes("name: '@deepseek-ai/dsh-tool-subagent'"),
        `the tool row must live in ${toolDir}: a same-transaction insert races the preset check`,
      )
      return 'preset row only'
    })

    check(`mode ${modeId} · tool bundle declares only the delegation tool`, () => {
      const patch = read(root, `${toolDir}/cordis.patch.yml`)
      assert(!patch.includes('\t'), 'patch must not contain tabs')
      for (const needle of [
        `id: ${modeId}`,
        "name: '@deepseek-ai/dsh-tool-subagent'",
        `toolName: ${contract.toolName}`,
        'provider: spawn',
        'maxDepth: 1',
      ]) {
        assert(patch.includes(needle), `tool patch missing: ${needle}`)
      }
      assert(
        !patch.includes("name: '@deepseek-ai/dsh-agent-preset'"),
        `the preset declaration must live in ${presetDir}`,
      )
      const presetPatch = read(root, `${presetDir}/cordis.patch.yml`)
      const presetId = presetPatch.match(new RegExp(`^\\s{8}id: ${modeId}$`, 'm'))?.[1] ?? modeId
      const agentPreset = patch.match(new RegExp(`agentPreset: (${modeId})$`, 'm'))?.[1]
      assert(agentPreset === presetId, `agentPreset (${agentPreset}) must equal preset config.id (${presetId})`)
      return 'tool row only, agentPreset matches'
    })

    check(`mode ${modeId} · persona prompt`, () => {
      const persona = read(root, `modes/${modeId}/persona.md`)
      assert(
        persona.length > contract.personaMinChars,
        `persona.md is ${persona.length} chars; expected at least ${contract.personaMinChars}`,
      )
      assert(!persona.includes('\t'), 'persona.md must not contain tabs')
      const missing = contract.personaNeedles.filter((n) => !persona.includes(n))
      assert(missing.length === 0, `persona.md missing: ${missing.join(', ')}`)
      for (const heading of contract.personaHeadings) {
        assert(persona.includes(heading), `persona.md missing section: ${heading}`)
      }
      return `${persona.length} chars`
    })

    check(`mode ${modeId} · patch templates`, () => {
      const preset = read(root, `modes/${modeId}/preset.patch.template.yml`)
      const tool = read(root, `modes/${modeId}/tool.patch.template.yml`)
      assert(preset.includes('{{PERSONA_BLOCK}}'), 'preset template must contain {{PERSONA_BLOCK}}')
      assert(preset.trimStart().startsWith('#'), 'preset template should start with a generated-file header comment')
      assert(!preset.includes('\t'), 'preset template must not contain tabs')
      assert(tool.includes('@deepseek-ai/dsh-tool-subagent'), 'tool template must mount the delegation tool')
      assert(!tool.includes('{{'), 'tool template must not contain scaffold placeholders')
      return 'preset placeholder intact, tool template concrete'
    })
  }

  check('paper output schema', () => {
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
    assert(
      deepEqual(schema.$defs.run.properties.status.enum, ['DONE', 'PARTIAL', 'INSUFFICIENT', 'NEED_INPUT', 'FAILED']),
      'status enum drifted',
    )
    return '5 statuses, A/B/C evidence, paper+patent+run'
  })

  check('ppt output schema', () => {
    const schema = JSON.parse(read(root, 'schema/ppt-output.schema.json'))
    assert(schema.$defs?.slide && schema.$defs?.run, 'schema needs $defs.slide and $defs.run')
    assert(schema.$defs.slide.required.includes('notes'), 'slide.notes must be required (notes are mandatory)')
    assert(schema.$defs.slide.properties.notes.minLength >= 60, 'slide.notes minLength must be at least 60')
    const expectedRun = [
      'audience', 'checks', 'counts', 'deck', 'files', 'language', 'limitations',
      'mission', 'requests', 'status', 'theme',
    ].sort()
    assert(
      deepEqual([...schema.$defs.run.required].sort(), expectedRun),
      `run.required drifted: ${[...schema.$defs.run.required].sort().join(',')}`,
    )
    const statusRef = schema.$defs.run.properties.status
    const statusNode = statusRef.$ref
      ? schema.$defs[statusRef.$ref.replace('#/$defs/', '')]
      : statusRef
    assert(
      deepEqual(statusNode.enum, ['DONE', 'PARTIAL', 'NEED_INPUT', 'FAILED']),
      'ppt status enum drifted',
    )
    const slideImage = schema.$defs.slide.properties.image
    assert(JSON.stringify(slideImage).includes('assets/'), 'slide image must be an assets/ replaceable path')
    return '4 statuses, mandatory notes, assets path'
  })

  check('paper output validator available', () => {
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

  check('ppt output validator available', () => {
    for (const fixture of ['ppt-valid', 'ppt-broken-notes', 'ppt-need-input']) {
      assert(existsSync(join(root, 'tests/fixtures', fixture)), `fixture missing: ${fixture}`)
    }
    const script = read(root, 'scripts/check-ppt-output.mjs')
    for (const needle of ['MIN_NOTES_CHARS', 'MANIFEST.md', 'NEED_INPUT', 'placeholder']) {
      assert(script.includes(needle), `check-ppt-output.mjs missing ${needle}`)
    }
    return 'validator + three fixtures'
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

  check('examples invoke each mode', () => {
    for (const rel of ['examples/01-papers.md', 'examples/02-patents.md', 'examples/03-mixed.md']) {
      const body = read(root, rel)
      assert(body.includes('paper_patent_scout'), `${rel} must show the paper_patent_scout call`)
      assert(body.includes('scout-output/'), `${rel} must state the output directory convention`)
    }
    const ppt = read(root, 'examples/04-ppt.md')
    assert(ppt.includes('ppt_maker'), 'examples/04-ppt.md must show the ppt_maker call')
    assert(ppt.includes('out/'), 'examples/04-ppt.md must state the out/<slug>/ convention')
    return '3 paper examples + 1 ppt example'
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
    const modes = listModes(root)
    const missing = Object.keys(MODE_CONTRACTS).filter((modeId) => !modes.includes(modeId))
    assert(missing.length === 0, `modes/ missing mode sources: ${missing.join(', ')}`)
    return `${modes.length} modes on disk, template pair + generator present`
  })

  check('no unfinished placeholders', () => {
    for (const rel of allRequiredFiles().filter((f) => /\.(md|yml)$/.test(f))) {
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
