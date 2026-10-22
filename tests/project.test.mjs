import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { runChecks } from '../scripts/verify.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const read = (...p) => readFileSync(join(root, ...p), 'utf8')

test('project contract: all artifacts exist and stay coherent', () => {
  const report = runChecks(root)
  const failed = report.results.filter((r) => !r.pass)
  assert.equal(
    failed.length,
    0,
    `failing checks:\n${failed.map((f) => `- ${f.name}: ${f.detail}`).join('\n')}`,
  )
  assert.ok(report.results.length >= 10, 'expected a substantive check list')
})

test('persona encodes the non-fabrication and patent-channel rules', () => {
  const persona = read('modes', 'paper-patent-scout', 'persona.md')
  for (const needle of [
    '不编造',
    '训练记忆不是证据',
    'read_page',
    'web_fetch',
    'evidence_level',
    'NEED_INPUT',
    'STATUS',
    'references.bib',
    'candidates.csv',
    'run.json',
    'search-log.md',
  ]) {
    assert.ok(persona.includes(needle), `persona.md missing: ${needle}`)
  }
  assert.ok(persona.length > 4000, 'persona.md looks too thin to be a specialist prompt')
})

test('preset bundle declares only the preset row', () => {
  const patch = read('bundles', 'paper-patent-scout', 'cordis.patch.yml')
  assert.match(patch, /id: preset-paper-patent-scout/)
  assert.match(patch, /name: '@deepseek-ai\/dsh-agent-preset'/)
  assert.match(patch, /^\s+id: paper-patent-scout$/m)
  assert.ok(
    !patch.includes("name: '@deepseek-ai/dsh-tool-subagent'"),
    'the tool row belongs to bundles/paper-patent-scout-tool: a same-transaction insert races the preset check',
  )
  assert.ok(!patch.includes('\t'), 'patch must not contain tabs')
})

test('tool bundle declares only the host delegation tool and matches the preset', () => {
  const toolPatch = read('bundles', 'paper-patent-scout-tool', 'cordis.patch.yml')
  const presetPatch = read('bundles', 'paper-patent-scout', 'cordis.patch.yml')
  assert.match(toolPatch, /name: '@deepseek-ai\/dsh-tool-subagent'/)
  assert.match(toolPatch, /toolName: paper_patent_scout/)
  assert.match(toolPatch, /provider: spawn/)
  assert.match(toolPatch, /maxDepth: 1/)
  assert.ok(
    !toolPatch.includes("name: '@deepseek-ai/dsh-agent-preset'"),
    'the preset declaration belongs to bundles/paper-patent-scout',
  )
  const presetId = presetPatch.match(/^\s{8}id: (paper-patent-scout)$/m)?.[1]
  const agentPreset = toolPatch.match(/agentPreset: (paper-patent-scout)$/m)?.[1]
  assert.equal(agentPreset, presetId, 'agentPreset must equal the preset config.id')
  assert.ok(!toolPatch.includes('\t'), 'patch must not contain tabs')
})

test('install doc fixes the two-step order', () => {
  const install = read('docs', 'install.md')
  const toolAt = install.indexOf('bundles\\paper-patent-scout-tool')
  assert.ok(toolAt > 0, 'install.md must name the tool bundle path')
  const beforeTool = install.slice(0, toolAt)
  assert.ok(
    beforeTool.includes('bundles\\paper-patent-scout'),
    'install.md must install the preset bundle before the tool bundle',
  )
  assert.ok(beforeTool.includes('install_bundle'), 'install.md must show the preset install command first')
})

test('persona handles a missing AI4Scholar key and names the optional extra files', () => {
  const persona = read('modes', 'paper-patent-scout', 'persona.md')
  assert.ok(
    persona.includes('AI4Scholar API key is not configured'),
    'persona must name the exact key-missing error so the agent recognizes it instead of retrying',
  )
  assert.ok(/arXiv/.test(persona), 'persona must point at the free arXiv fallback')
  assert.ok(
    /brief\.json/.test(persona) && /report\.md/.test(persona),
    'persona must mention the optional brief.json / report.md so callers and the agent agree on extras',
  )
  assert.ok(
    persona.includes('任务显式给出更低的目标'),
    'persona must let an explicit mission target override the default DONE thresholds',
  )
  const troubleshooting = read('docs', 'troubleshooting.md')
  assert.ok(
    troubleshooting.includes('AI4Scholar API key is not configured'),
    'troubleshooting must document the missing-key symptom and its fix',
  )
})

test('contributing contract: PR accepted without SLA, gate and generated-artifact rules stated', () => {
  const contributing = read('CONTRIBUTING.md')
  for (const needle of [
    '接受 PR',
    '无 SLA',
    'node scripts/build.mjs',
    'node scripts/verify.mjs',
    'node --test',
    'cordis.patch.yml',
    '密钥',
    'MIT',
  ]) {
    assert.ok(contributing.includes(needle), `CONTRIBUTING.md missing: ${needle}`)
  }
  assert.ok(
    /不允许|禁止/.test(contributing),
    'CONTRIBUTING.md must state the forbidden actions (generated files, secrets) explicitly',
  )
  const template = read('.github', 'PULL_REQUEST_TEMPLATE.md')
  for (const needle of ['verify.mjs', '生成物', '密钥', '动机', '验收']) {
    assert.ok(template.includes(needle), `PULL_REQUEST_TEMPLATE.md missing: ${needle}`)
  }
  const readme = read('README.md')
  assert.ok(readme.includes('CONTRIBUTING.md'), 'README must point contributors at CONTRIBUTING.md')
  assert.ok(/无 SLA/.test(readme), 'README must state PR review has no SLA')
})

test('output schema is valid JSON with the record definitions we emit', () => {
  const schema = JSON.parse(read('schema', 'output.schema.json'))
  assert.ok(schema.$defs, 'schema needs $defs')
  for (const def of ['paper', 'patent', 'run']) {
    assert.ok(schema.$defs[def], `schema missing $defs.${def}`)
  }
  assert.deepEqual(
    [...schema.$defs.paper.required].sort(),
    [
      'abstract',
      'authors',
      'doi',
      'evidence_level',
      'id',
      'key_findings',
      'relevance',
      'title',
      'type',
      'url',
      'year',
    ].sort(),
  )
  assert.deepEqual(
    [...schema.$defs.patent.required].sort(),
    [
      'assignee',
      'evidence_level',
      'id',
      'key_findings',
      'patent_number',
      'relevance',
      'title',
      'type',
      'url',
    ].sort(),
  )
})
