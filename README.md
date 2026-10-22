# dshMaker · DSH 子代理模式工厂

> **项目状态（请先读）**
>
> - 本仓库（中文项目名：**dsh插件创作**；GitHub 仓库名：`dsh-plugin-creation`，仓库名只能用 ASCII，中文名见描述与本行）主要由 **DeepSeek 模型接管创作**：需求澄清之后的设计、实现、测试与验收记录由 AI 完成，人工只做需求决策与结果确认。
> - 作者**不具备持续更新与维护能力**：不承诺后续功能演进、兼容性跟进或问题修复；如 DSH 版本升级导致不可用，请自行调整或提 PR。
> - 以 **MIT 许可、现状（AS IS）** 开放，欢迎 fork、复制、改造与二次发布。
> - **接受 PR（无 SLA）**：欢迎外部贡献，但审核与合并不承诺时限；门禁、生成物与密钥规则见 [CONTRIBUTING.md](CONTRIBUTING.md)，讨论入口为 Issues / Discussions。

为 DeepSeek Harness 制作**可安装、可复用**的专精子代理模式。当前两个模式：`paper-patent-scout`（论文 + 专利检索）与 `ppt-maker`（演示文稿制作）。

## 为什么不是"一个模板"

一个模式要真正可用，需要四层东西同时到位，缺一层就会退化成"一段提示词"：

1. **人格与纪律**（`modes/<mode>/persona.md`）：身份、绝对规则、SOP、输出契约、自检清单；
2. **部署声明**（`bundles/<mode>/` 与 `bundles/<mode>-tool/`）：Agent preset + 宿主级委派工具，生成而非手写；
3. **结构契约**（`schema/`、`specs/`）：产物字段、状态码、验收标准；
4. **门禁与文档**（`scripts/`、`tests/`、`docs/`）：生成一致性、契约测试、安装/检索/排障手册。

本仓库把这四层做成工厂：新增模式 = 复制模板 → 写人格 → 生成 → 校验 → 按序安装两个 bundle。

### 为什么一个模式交付两个 bundle

DSH 的宿主级工具行（`@deepseek-ai/dsh-tool-subagent`）在**加载时**校验 `agentPreset`，只能看到更早的 patch 事务已经声明的 preset。实测：把 preset 行与工具行写进同一个 bundle，安装报 `Unknown agent preset: paper-patent-scout`（拆成两个 `- insert:` 也一样）。所以本项目固定拆成两个包、按序安装：

| 顺序 | bundle | 内容 | 包名 |
| --- | --- | --- | --- |
| 1 | `bundles/<mode>/` | Agent preset（人格 + 工具子集 + compaction） | `dsh-<mode>` |
| 2 | `bundles/<mode>-tool/` | 宿主级委派工具 `@deepseek-ai/dsh-tool-subagent` | `dsh-<mode>-tool` |

第二个安装是独立事务，此时 preset 已注册，校验通过。`verify.mjs` 与 `tests/project.test.mjs` 锁死"preset 包不含工具行、工具包不含 preset 行"。

## 当前模式

| 模式 | preset / 工具 | 用途 | 状态 |
| --- | --- | --- | --- |
| paper-patent-scout | `paper-patent-scout` / `paper_patent_scout` | 论文与专利检索，产出证据台账（Markdown/JSON/CSV/BibTeX） | v0.3 已安装；P1/P2/P3/AC-7 在线验收通过（见 `tests/acceptance-log.md`） |
| ppt-maker | `ppt-maker` / `ppt_maker` | 演示文稿制作：三件套（PPTX/HTML/JSON）+ 讲者备注 + 可替换图片槽位 | v0.1 已安装；冒烟 `out/ppt-smoke` 通过校验器（PARTIAL：1 个图片 placeholder）；PP-1…PP-5 待执行 |

## 快速开始

```powershell
cd E:\VibeCoding\dshMaker
node scripts/build.mjs        # 生成两个 bundle 的 cordis.patch.yml
node scripts/verify.mjs       # 契约门禁
node --test                   # 结构测试
```

跑过一次检索之后，用产物校验器按契约检查 7 个文件是否自洽（S1 用例的机器化版本）：

```powershell
node scripts/check-output.mjs scout-output/<slug>/
```

PPT 模式用另一只校验器检查备注、状态一致性与图片槽位（`deck.json`、`assets/MANIFEST.md`）：

```powershell
node scripts/check-ppt-output.mjs out/<slug>/
```

安装（在 DSH 会话中，**顺序不可颠倒**）：

```
plugin_manager({ action: "install_bundle", target: "E:\\VibeCoding\\dshMaker\\bundles\\paper-patent-scout" })
plugin_manager({ action: "install_bundle", target: "E:\\VibeCoding\\dshMaker\\bundles\\paper-patent-scout-tool" })
```

调用（任意会话）：

```
paper_patent_scout({
  description: "文献与专利扫描：酒店服务机器人",
  prompt: "检索 2020 年至今酒店服务机器人相关论文 15 条、专利 8 件，输出到 scout-output/hotel-robot/，中文台账。"
})
```

产出：`scout-output/hotel-robot/` 下 7 个文件（`evidence.md`、`papers.json`、`patents.json`、`candidates.csv`、`references.bib`、`run.json`、`search-log.md`），用 `node scripts/check-output.mjs scout-output/hotel-robot/` 校验一致性。详见 `modes/paper-patent-scout/output-contract.md`。

演示文稿模式同样两个 bundle、同样顺序（前置条件：宿主已启用 `dsh-ppt` 插件）：

```
plugin_manager({ action: "install_bundle", target: "E:\\VibeCoding\\dshMaker\\bundles\\ppt-maker" })
plugin_manager({ action: "install_bundle", target: "E:\\VibeCoding\\dshMaker\\bundles\\ppt-maker-tool" })
```

```
ppt_maker({
  description: "答辩 PPT：固态电池热失控预警",
  prompt: "主题：固态电池热失控早期预警；场景：答辩；听众：评委；页数：12；语言：zh；视觉主题：data；必须覆盖：背景、方法、实验、结论；素材：materials/（若有）；输出目录：out/defense-thermal/；需要讲者备注与 PDF 目检。"
})
```

产出 `out/defense-thermal/` 下 `deck.pptx`、`deck.html`、`deck.json`、`outline.md`、`notes.md`、`sources.md`、`assets/MANIFEST.md`、`run.json`、`REPORT.md`；缺关键素材时只写 `run.json`、`REPORT.md`、`requests.md` 并回 `NEED_INPUT`，不生成半成品。详见 `modes/ppt-maker/output-contract.md`。

## 目录结构

```
dshMaker/
├── AGENTS.md                     # 在本仓库工作的规则
├── 需求文档.md                    # 唯一需求来源
├── README.md
├── modes/
│   ├── paper-patent-scout/
│   │   ├── persona.md                  # 子代理人格（源）
│   │   ├── preset.patch.template.yml   # bundle 1 模板（含 {{PERSONA_BLOCK}}）
│   │   ├── tool.patch.template.yml     # bundle 2 模板（工具行）
│   │   └── output-contract.md          # 7 文件输出契约
│   └── ppt-maker/
│       ├── persona.md
│       ├── preset.patch.template.yml
│       ├── tool.patch.template.yml
│       └── output-contract.md          # 9 文件契约 + MANIFEST 槽位规则
├── bundles/
│   ├── paper-patent-scout/             # bundle 1/2：preset
│   │   ├── package.json
│   │   ├── cordis.patch.yml            # 生成物
│   │   └── README.md
│   ├── paper-patent-scout-tool/        # bundle 2/2：宿主委派工具
│   │   ├── package.json
│   │   ├── cordis.patch.yml            # 生成物
│   │   └── README.md
│   ├── ppt-maker/                      # 第二个模式的 preset 包
│   └── ppt-maker-tool/                 # 第二个模式的工具包
├── templates/mode/               # 新模式脚手架（persona + 两个 patch 模板）
├── scripts/
│   ├── build.mjs                 # persona → 两个 patch（多模式）
│   ├── verify.mjs                # 契约门禁（多模式 + 项目级）
│   ├── check-output.mjs          # 检索产物 7 文件一致性校验（S1）
│   ├── check-ppt-output.mjs      # PPT 产物校验（备注/状态/MANIFEST）
│   └── new-mode.mjs              # 脚手架生成器（含 -tool 包）
├── schema/
│   ├── output.schema.json        # 检索产物 schema
│   └── ppt-output.schema.json    # PPT 产物 schema
├── specs/
│   ├── paper-patent-scout.spec.md
│   └── ppt-maker.spec.md
├── docs/
│   ├── architecture.md           # 交付形态、数据流、决策
│   ├── retrieval-playbook.md     # 检索 SOP 与工具现实
│   ├── install.md                # 两 bundle 安装/验证/回退（含 ppt）
│   └── troubleshooting.md
├── examples/                     # 检索 + PPT 调用示例
└── tests/
    ├── project.test.mjs          # 契约测试
    ├── check-output.test.mjs     # 检索产物校验器测试
    ├── check-ppt-output.test.mjs # PPT 产物校验器测试
    ├── fixtures/                 # 两类校验器夹具
    ├── acceptance.md             # 在线验收用例 P1–P3/N1–N3/S1–S2 + PP-1—PP-5
    └── acceptance-log.md         # 验收记录
```

## 关键设计决策

| 决策 | 理由 |
| --- | --- |
| preset 与宿主级工具**分包交付、按序安装** | 实测同一事务插入 preset 行 + 工具行会报 `Unknown agent preset`；拆包后第二次安装是独立事务，preset 已注册，校验通过 |
| preset 定人格与工具子集 | 子代理只拿到检索需要的工具（fs/web/compaction/todo + 全局 AI4Scholar），不被主会话的写代码工具淹没 |
| 专利走 `web_search` + `read_page` | 无专利 API；实测 `web_fetch` 对 patents.google.com `fetch failed`，`read_page` 可渲染全文 |
| persona 用 Markdown 源、YAML 生成 | 避免转义错误与部署漂移；`verify.mjs` 拦不同步 |
| 输出 7 个文件 | 人读（evidence.md）+ 机读（JSON/CSV）+ 引用（bib）+ 审计（run.json/search-log） |
| 不声明 engines/peerDependencies | 本地目录安装的版本预检读取本清单，多余约束会挡安装 |
| 免费专利通道 | 用户明确选择不接付费专利库；覆盖局限写进 `run.json` |
| PPT 复用宿主 `dsh-ppt`，不造生成器 | 生成需要排版、图表、渲染引擎，重复造轮子只会更差；子代理的价值在编排、事实核对与目检 |
| 讲者备注进 schema 而非"建议" | 备注是答辩/汇报的刚需；长度与逐页一致性可由校验器强制，避免"看起来有备注" |
| 图片只从 `assets/` 来且必须登记 | 用户要求图片可替换、禁止 AI 生成；槽位 + MANIFEST 让替换是一次覆盖 + revise，生成图会被校验器拦下 |
| 缺素材回 `NEED_INPUT` 且禁止 deck | 用户要求"不硬做"；校验器拒绝带 deck 的 `NEED_INPUT`，把纪律变成可执行的闸门 |

## 扩展新模式

```powershell
node scripts/new-mode.mjs patent-family-analyzer --name "专利同族分析" --desc "……"
# 然后编辑 modes/patent-family-analyzer/persona.md 与两个 bundle 的 README
node scripts/build.mjs
node scripts/verify.mjs
```

脚手架会自动分配 preset `order`、推导工具名（连字符 → 下划线），生成 `bundles/<id>/` 与 `bundles/<id>-tool/` 两套清单与模板。

## 已知限制

- 专利仅覆盖 Google Patents 可渲染页面与搜索片段，无付费库、无同族全球展开；
- 中文核心期刊（CNKI/万方）未覆盖；
- AI4Scholar 工具计费，`run.json` 记录消耗，预算上限写在 persona；
- 本机 AI4Scholar 未配置 API key 时，Semantic Scholar / PubMed / Google Scholar 不可用，模式降级为 arXiv + web 通道并标 `PARTIAL`（见 `docs/troubleshooting.md`）；
- 在线验收（`tests/acceptance.md`）需要已安装的两个 bundle，离线门禁不覆盖真实检索质量；
- 重启 DSH 后工具仍可见：已实测一次（AC-3，新进程仍出现 `paper_patent_scout`）；profile 中两个 bundle 的依赖不要手工删。
- `ppt-maker` 依赖宿主 `dsh-ppt` 插件（`ppt_*` 工具）；插件被禁用时子代理回 `FAILED` 并说明，不会静默降级。`ppt_render` 需要 LibreOffice Kit，不可用时产物降为 `PARTIAL`（未目检）。

## 验收状态

- 离线：`node scripts/verify.mjs`（23/23）、`node --test`（17/17）—— 见 `tests/acceptance-log.md`。两个模式各 7 项结构检查 + 9 项项目级检查（含 PPT 产物校验器正/反例）。
- 在线（模式一）：P1 酒店服务机器人（8 篇 + 3 件）、P2 Attention Is All You Need 核验、P3 配送机器人电梯协同（3 件）、AC-7 空主题 `NEED_INPUT`、专利专项 `ssb-patents`（5 件，含 3 件授权 Active）均由真实 `paper_patent_scout` 调用完成，`check-output.mjs` 全部 `ok: true`；主代理另做了外部源抽查（arXiv 标题/DOI、Google Patents 原文）。
- 在线（模式二）：已安装 `dsh-ppt-maker` + `dsh-ppt-maker-tool`；`ppt_maker` 冒烟生成 `out/ppt-smoke`（3 页、备注 167/342/285 字、`ppt_check` 0 error、PDF+PNG 目检、1 个图片 placeholder → `PARTIAL`），`check-ppt-output.mjs` 退出码 0；PP-1…PP-5 待执行。
- 已执行：AC-9 反序卸载与按序重装、AC-3 重启后工具目录复检（均通过，证据见 `tests/acceptance-log.md`）。
- 受限沙箱会话无法执行 `node --test`（spawn 限制）与 `build.mjs`（写 `bundles/` 限制），降级取证方式见 `docs/troubleshooting.md`。

## 维护与推送（维护者本机环境相关）

- 本仓库**不承诺持续更新**；DSH 版本升级后若出现新的加载/校验错误，先查 `docs/troubleshooting.md`，再改 `modes/`→`bundles/`→文档。
- 本机 `~/.gitconfig` 把 `https://github.com/` 与 `git@github.com:` 重写到镜像代理 `https://ghfast.top/...`；同时本网络对 `github.com:443` 的直连会超时。因此 `origin` 设为代理地址 `https://ghfast.top/https://github.com/Tnymph/dsh-plugin-creation.git`（读取匿名可用）。
- 推送需要认证，用 `gh` 的令牌走一次性 HTTP 头；令牌不写入 `.git/config` 或任何仓库文件：

```powershell
$t = gh auth token
$b64 = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("x-access-token:$t"))
git -c "http.https://ghfast.top/.extraheader=AUTHORIZATION: basic $b64" push
```

- 若直连 GitHub 可用（或不在镜像环境），也可以把 `origin` 换回 `https://github.com/Tnymph/dsh-plugin-creation.git` 后正常 `git push`。
- 若在另一台机器/正常网络克隆本仓库，直接 `git clone https://github.com/Tnymph/dsh-plugin-creation.git` 即可，无需上述绕行。
