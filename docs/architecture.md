# 架构说明

## 目标

把"论文 + 专利检索"做成 DeepSeek Harness 中**可复用的子代理模式**：主代理不必自己读一堆检索工具文档、不必把检索 SOP 塞进主上下文，而是把任务交给一个掌握专门人格与检索纪律的子代理，拿回可复核的台账。

## 交付形态：两个 bundle = preset + 委派工具

DSH 里"子代理模式"由两件事组成，缺一不可：

1. **Agent preset（人格 + 工具子集 + 提示词）** — 决定子代理是谁、能用什么工具、按什么纪律工作。
2. **委派入口（工具）** — 决定主代理怎么触发它、传什么参数、以什么名字出现在工具目录里。

本项目用**两个 bundle 分别声明**这两件事：

```
bundle dsh-paper-patent-scout              （第 1 个安装）
└── cordis.patch.yml
    └── insert: preset-paper-patent-scout  → @deepseek-ai/dsh-agent-preset
          config.id: paper-patent-scout, order 20
          plugins: persona / time-context / agent-instructions /
                   tool-fs / tool-fs-search / tool-web /
                   compaction group / tool-todo

bundle dsh-paper-patent-scout-tool         （第 2 个安装）
└── cordis.patch.yml
    └── insert: paper-patent-scout         → @deepseek-ai/dsh-tool-subagent
          config: provider spawn, toolName paper_patent_scout,
                  agentPreset paper-patent-scout, maxDepth 1
```

## 为什么拆成两个包（实测证据）

工具行的实现（`packages/subagent/tool-subagent/src/preset-selection.ts`）在**加载时**调用 preset registry 的 `readDocument(agentPreset)`；README 原文：

> A Host-mounted tool performs this check when it loads. This check does not activate candidate presets.

实测过程：

| 尝试 | 结果 |
| --- | --- |
| 一个 bundle，一次 `insert` 里放 preset 行 + 工具行 | 包安装成功，但工具行激活失败：`RemoteError: Unknown agent preset: paper-patent-scout` |
| 一个 bundle，拆成两次 `insert`（preset 行、工具行） | 同样失败 —— 同一安装事务内，preset 声明尚未完成 |
| 先装只含 preset 行的包，再装只含工具行的包 | 工具行激活成功，`paper_patent_scout` 出现在主会话工具目录 |

结论：**preset 声明必须落在更早的 patch 事务里**。因此仓库固定"一个模式两个 bundle、按序安装"，`verify.mjs` 与 `tests/project.test.mjs` 都会拦"preset 包含工具行 / 工具包含 preset 行"的回归。

代价是安装多一步、卸载要反序；收益是安装路径确定、可重复、可用门禁保护。

## 为什么是 host-level 工具

工具行挂在**宿主级**（不是某个 preset 内部），因此：

- 任何会话（包括默认 `standard` preset 的主代理）都能看到 `paper_patent_scout`；
- preset 只是子代理的运行环境，工具的可见性与调用入口独立；
- 这与已安装的 `dsh-ai4scholar` bundle 完全同构——它的 `ai4scholar` 行也是宿主级插入，所以 38 个学术工具在 standard 会话里直接可用。

工具本身不携带检索逻辑，检索逻辑全部在 preset 的 persona 里。工具是可替换的：将来若要换成 out-of-process 的 `dsh-subagent-dsh-sdk` provider（独立 profile、进程隔离），只改工具行的 `provider` 与 `maxDepth: provider-managed`，preset 与人格不变。

## 数据流

```
主代理 (standard preset)
   │  paper_patent_scout(description, prompt=<mission>)
   ▼
spawn provider ──► child agent, agentPreset = paper-patent-scout
   │                 ├─ AI4Scholar 学术工具（宿主全局注入：search_papers / read_* / get_* …）
   │                 ├─ web_search + read_page（专利：Google Patents）
   │                 ├─ tool-fs（写台账）
   │                 ├─ tool-fs-search（在图谱/仓库里找既有产出）
   │                 ├─ compaction（长报告不炸上下文）
   │                 └─ tool-todo（多轮检索的进度）
   ▼
scout-output/<slug>-<date>/
   ├── evidence.md   （首行 STATUS: …）
   ├── papers.json / patents.json
   ├── candidates.csv / references.bib
   ├── run.json
   └── search-log.md
   │
   ▼
子代理最终消息 = 摘要 + 状态 + 文件路径 + 局限
   │
   ▼
主代理读文件 / 汇总给用户
```

## 为什么 AI4Scholar 不在 preset 里重复挂载

`dsh-ai4scholar` 是宿主级 bundle，38 个工具已经注入每个会话。preset 里再挂一次会重复注册同名工具、报冲突并浪费上下文。因此 preset 只补 **AI4Scholar 没有的能力**：`web_search`、`read_page`、文件写入、压缩与 todo。

## 为什么专利走 web 通道

AI4Scholar 没有专利数据源。实测结论：

- `web_fetch`（HTTP 直取）访问 `patents.google.com` 一律 `fetch failed`；
- `read_page`（modsearch 桥，云端渲染）能成功抓取 `https://patents.google.com/patent/<PUB>/<lang>`，返回标题、摘要、申请人、发明人、申请/公开日期、法律状态、CPC、引用等；
- 因此专利通道 = `web_search` 发现 + `read_page` 核验；`web_fetch` 仅作一次兜底尝试。

详见 `docs/retrieval-playbook.md`。

## 与"只做一个模板"的区别

仓库分四层，模式只是最上面一层：

- `modes/<mode>/`：人格、检索 SOP、输出契约、两套 patch 模板（可复用、可评审）；
- `bundles/<mode>/` + `bundles/<mode>-tool/`：由 `scripts/build.mjs` 生成的两个声明式部署包（可安装、可回退）；
- `scripts/ + tests/ + docs/ + specs/ + schema/`：生成、校验、文档与验收基础设施；
- `templates/mode/` + `new-mode.mjs`：把"再做一个模式"变成一次脚手架调用。

新增模式 = 复制 `templates/mode/` → 改人格与工具集 → 生成两个 bundle → 跑 `node scripts/verify.mjs`。见 `scripts/new-mode.mjs`。
