#!/usr/bin/env node
// Scaffold a new subagent mode pair from templates/mode/.
//
//   node scripts/new-mode.mjs <mode-id> [--name "Display name"] [--desc "One line"]
//
// Creates:
//   modes/<mode-id>/persona.md
//   modes/<mode-id>/preset.patch.template.yml
//   modes/<mode-id>/tool.patch.template.yml
//   bundles/<mode-id>/{package.json,README.md}
//   bundles/<mode-id>-tool/{package.json,README.md}
// then prints the remaining steps. It never overwrites existing files:
// scaffold, write the persona, run `node scripts/build.mjs`.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { listModes } from './build.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const MODE_ID_RE = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/
const TOOL_NAME_RE = /^[a-z][a-z0-9_]*$/

function parseArgs(argv) {
  const args = { modeId: undefined, name: undefined, desc: undefined }
  const rest = []
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--name') args.name = argv[++i]
    else if (arg === '--desc') args.desc = argv[++i]
    else rest.push(arg)
  }
  args.modeId = rest[0]
  return args
}

function fail(message) {
  console.error(`error: ${message}`)
  process.exit(1)
}

const args = parseArgs(process.argv.slice(2))
if (!args.modeId) fail('usage: node scripts/new-mode.mjs <mode-id> [--name "..."] [--desc "..."]')
if (!MODE_ID_RE.test(args.modeId)) fail(`invalid mode id "${args.modeId}"; use lowercase kebab-case, e.g. patent-family-analyzer`)

const toolName = args.modeId.replaceAll('-', '_')
if (!TOOL_NAME_RE.test(toolName)) fail(`derived tool name "${toolName}" is not a valid tool identifier`)

const modeDir = join(ROOT, 'modes', args.modeId)
const presetBundle = join(ROOT, 'bundles', args.modeId)
const toolBundle = join(ROOT, 'bundles', `${args.modeId}-tool`)
for (const dir of [modeDir, presetBundle, toolBundle]) {
  if (existsSync(dir)) fail(`${dir} already exists; pick a new id or edit it instead`)
}

const existing = listModes(ROOT)
const order = 20 + existing.length
const name = args.name ?? args.modeId
const desc = args.desc ?? `${name} 专精子代理模式`

const persona = readFileSync(join(ROOT, 'templates', 'mode', 'persona.md.tpl'), 'utf8')
  .replaceAll('{{MODE_ID}}', args.modeId)
  .replaceAll('{{MODE_DESCRIPTION}}', desc)
const presetTemplate = readFileSync(join(ROOT, 'templates', 'mode', 'preset.patch.template.yml'), 'utf8')
  .replaceAll('{{MODE_ID}}', args.modeId)
  .replaceAll('{{ORDER}}', String(order))
const toolTemplate = readFileSync(join(ROOT, 'templates', 'mode', 'tool.patch.template.yml'), 'utf8')
  .replaceAll('{{MODE_ID}}', args.modeId)
  .replaceAll('{{TOOL_NAME}}', toolName)

const presetPkg = {
  name: `dsh-${args.modeId}`,
  version: '0.1.0',
  private: true,
  description: `DeepSeek Harness bundle 1/2: the ${args.modeId} Agent preset. Install this before bundles/${args.modeId}-tool.`,
  license: 'MIT',
  keywords: ['deepseek-harness', 'dsh', 'bundle', 'preset', 'subagent'],
  dsh: { bundle: { patch: './cordis.patch.yml' } },
  files: ['cordis.patch.yml', 'README.md'],
}

const toolPkg = {
  name: `dsh-${args.modeId}-tool`,
  version: '0.1.0',
  private: true,
  description: `DeepSeek Harness bundle 2/2: the host delegation tool ${toolName}, bound to the ${args.modeId} Agent preset. Install bundles/${args.modeId} first.`,
  license: 'MIT',
  keywords: ['deepseek-harness', 'dsh', 'bundle', 'subagent', 'tool'],
  dsh: { bundle: { patch: './cordis.patch.yml' } },
  files: ['cordis.patch.yml', 'README.md'],
}

const presetReadme = `# dsh-${args.modeId}（bundle 1/2 · preset）

第 1 个 bundle：${name} 的 Agent preset（\`${args.modeId}\`）。

先安装本 bundle，再安装 \`bundles/${args.modeId}-tool\`；工具行在加载时校验 \`agentPreset\`，
preset 必须由更早的 patch 事务声明，否则报 \`Unknown agent preset: ${args.modeId}\`。

\`\`\`
plugin_manager({ action: "install_bundle", target: "<repo>\\\\bundles\\\\${args.modeId}" })
plugin_manager({ action: "install_bundle", target: "<repo>\\\\bundles\\\\${args.modeId}-tool" })
\`\`\`

\`cordis.patch.yml\` 由 \`../../scripts/build.mjs\` 生成，不要手改。
`

const toolReadme = `# dsh-${args.modeId}-tool（bundle 2/2 · tool）

第 2 个 bundle：宿主级委派工具 \`${toolName}\`（\`@deepseek-ai/dsh-tool-subagent\`，\`agentPreset: ${args.modeId}\`）。

前置条件：\`bundles/${args.modeId}\` 已安装并激活。卸载顺序与安装相反：先卸本 bundle。

\`cordis.patch.yml\` 由 \`../../scripts/build.mjs\` 生成，不要手改。
`

mkdirSync(modeDir, { recursive: true })
mkdirSync(presetBundle, { recursive: true })
mkdirSync(toolBundle, { recursive: true })
writeFileSync(join(modeDir, 'persona.md'), persona, 'utf8')
writeFileSync(join(modeDir, 'preset.patch.template.yml'), presetTemplate, 'utf8')
writeFileSync(join(modeDir, 'tool.patch.template.yml'), toolTemplate, 'utf8')
writeFileSync(join(presetBundle, 'package.json'), `${JSON.stringify(presetPkg, null, 2)}\n`, 'utf8')
writeFileSync(join(presetBundle, 'README.md'), presetReadme, 'utf8')
writeFileSync(join(toolBundle, 'package.json'), `${JSON.stringify(toolPkg, null, 2)}\n`, 'utf8')
writeFileSync(join(toolBundle, 'README.md'), toolReadme, 'utf8')

console.log(`scaffolded modes/${args.modeId} and bundles/${args.modeId}, bundles/${args.modeId}-tool`)
console.log(`  preset id : ${args.modeId}`)
console.log(`  tool name : ${toolName}`)
console.log(`  order     : ${order}`)
console.log('')
console.log('next:')
console.log(`  1. write the persona: modes/${args.modeId}/persona.md`)
console.log(`  2. extend the preset tool list: modes/${args.modeId}/preset.patch.template.yml`)
console.log('  3. node scripts/build.mjs   # generates both patches')
console.log('  4. node scripts/verify.mjs  # contract gate')
