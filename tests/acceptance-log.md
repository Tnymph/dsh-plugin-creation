# 验收记录

每次验收追加一行：日期 | 用例 | 结果 | 证据。只写实际跑过的命令与实际输出，不预填“通过”。

## 2026-10-21 · v0.2 离线门禁（全绿）

| 用例 | 命令 | 结果 | 证据 |
| --- | --- | --- | --- |
| 离线-1 | `node scripts/build.mjs` | 通过 | `wrote ...\bundles\paper-patent-scout\cordis.patch.yml (206 lines) · preset of paper-patent-scout`；`wrote ...\bundles\paper-patent-scout-tool\cordis.patch.yml (16 lines) · tool of paper-patent-scout` |
| 离线-2 | `node scripts/verify.mjs` | 通过 | `12/12 checks passed`（多出的一项为 `tool bundle declares only the delegation tool`） |
| 离线-3 | `node --test` | 通过 | `# tests 7 / # pass 7 / # fail 0` |

历史修复（已解决，留档）：

| 现象 | 原因 | 修复 |
| --- | --- | --- |
| verify：`AGENTS.md contains /\bTBD\b/` | 规则文本里写了占位标记字面量 | 改写为“未完成的占位标记”，保留规则语义 |
| `node --test tests/` → `ERR_MODULE_NOT_FOUND`，`tests:1:1` | Node 22 把目录参数当模块入口 | 门禁统一为 `node --test`（自动发现 `*.test.mjs`），文档同步 |
| README/docs 出现 U+FFFD 乱码 | 写入时字符损坏 | 定点替换后 `grep` 复查为 0 处 |
| 单包安装报 `RemoteError: Unknown agent preset: paper-patent-scout` | 工具行在加载时校验 preset 已注册；同一安装事务内插入的 preset 行尚未生效 | 拆成两个 bundle、按序两次安装（见 I1/I0） |

## 2026-10-21 · I1 反证：一个包同时装 preset 与工具会失败

| 步骤 | 命令 | 实际输出 |
| --- | --- | --- |
| 1 | `plugin_manager install_bundle E:\VibeCoding\dshMaker\bundles\paper-patent-scout`（当时该包同时含 preset 行与工具行） | `stage: enable, application: failed`；`dsh: warning: 1 entry did not activate / paper-patent-scout (@deepseek-ai/dsh-tool-subagent): RemoteError: Unknown agent preset: paper-patent-scout` |
| 2 | 把单个 insert 列表拆成两个 patch 操作后重装 | 仍 `application: failed`，同一诊断 —— 同一事务内顺序不解决问题 |
| 3 | 反向实验：先装只含 preset 行的包，再装只含工具行的临时包 | 两次 `application: applied`，工具成功激活 |

结论：工具行的 preset 校验发生在自身 mount 时，必须让 preset 在更早的安装事务里注册。这就是 `-tool` 分包存在的唯一原因。

## 2026-10-21 · I0 正向：按序安装两个 bundle

| 步骤 | 命令 | 结果 |
| --- | --- | --- |
| 1 | `remove_bundle dsh-paper-patent-scout-tool` | `application: applied` |
| 2 | `remove_bundle dsh-paper-patent-scout` | `application: applied` |
| 3 | `install_bundle E:\VibeCoding\dshMaker\bundles\paper-patent-scout` | `stage: enable, application: applied` |
| 4 | `install_bundle E:\VibeCoding\dshMaker\bundles\paper-patent-scout-tool` | `stage: enable, application: applied` |

`plugin_manager list_bundles` 证据：`dsh-paper-patent-scout`（rows: `preset-paper-patent-scout` → `@deepseek-ai/dsh-agent-preset`）与 `dsh-paper-patent-scout-tool`（rows: `paper-patent-scout` → `@deepseek-ai/dsh-tool-subagent`）均 `enabled: true, installed: true`，无 `Unknown agent preset`。

工具可见证据：宿主在工具激活后重发的会话提示中委派段变为 “Start independent delegations with `subagent` or `subagent_fork` or `paper_patent_scout`…”。

## 2026-10-21 · P1 冒烟检索（真实调用）

| 项 | 值 |
| --- | --- |
| 调用 | `paper_patent_scout`，任务书：主题“检索式增强生成（RAG）中的检索质量评估”，中英双语，时间不限，最多 8 篇/5 件 |
| 子代理 | `818460f4-0995-42e7-8e1d-07eff4e9c60b` |
| 产出目录 | `E:\VibeCoding\dshMaker\scout-output\smoke-rag-retrieval\` |
| 文件 | `brief.json` `report.md` `results.csv` `evidence.md` `papers.json` `patents.json` `candidates.csv` `references.bib` `run.json` `search-log.md`（10 个，7 文件契约 + 2 附加文件 + brief） |
| 状态 | `STATUS: DONE`，论文 3 / 专利 2 |
| 论文 | P01 arXiv 2608.11030（DOI 10.1109/CSCWD68734.2026.11582454）、P02 arXiv 2506.00527、P03 arXiv 2411.18583 |
| 专利 | CN118013020A（授权 CN118013020B）、CN119577115A |

主代理抽查（不依赖子代理自述）：

- `search_arxiv` 复核 P01 标题返回同一条记录与同 DOI —— 非编造。
- `read_page` 复核 `https://patents.google.com/patent/CN118013020A/zh`：申请号 CN202410054081.0、申请日 2024-04-09、公开日 2024-05-10、申请人 北京星河智源科技有限公司 与 知呱呱（天津）大数据技术有限公司、状态 Active —— 与子代理 `patents.json` 一致。
- 子代理在 `limitations` 中主动记录：Semantic Scholar / PubMed / Google Scholar 因缺少 AI4Scholar key 不可用，改用 arXiv + web 通道。

## 2026-10-21 · P1 暴露的契约缺口（已修，红→绿）

| 问题 | 修复 | 验证 |
| --- | --- | --- |
| AI4Scholar key 缺失时，人格没有明确降级规则，子代理可能误报 `FAILED` | `persona.md` 增补降级规则：遇到 `AI4Scholar API key is not configured` 立即标注 `limitations`、改用 arXiv/web/DOI 通道、状态最高只能 `PARTIAL`（若任务目标不依赖该通道则照常 `DONE`） | `node --test` 新增 persona 断言，7/7 通过 |
| “只写 7 个文件”与实用附加文件冲突 | 明确 `brief.json`、`report.md` 为可选附加文件，不替代契约文件 | 同上 |
| `DONE` 判定没有说明“任务目标可覆盖” | 状态表补 `DONE`（目标达成，或任务显式给出更低目标） | 同上 |

## 2026-10-21 · P1 官方用例：酒店服务机器人（真实调用）

| 项 | 值 |
| --- | --- |
| 调用 | `paper_patent_scout({ description: "P1 混合检索", prompt: "主题：酒店服务机器人。论文 8 条、专利 3 条，2020 年至今，输出到 scout-output/acceptance-p1/，中文。" })` |
| 子代理 | `003e7581-0c5e-4a99-b4c1-587b278d83f8` |
| 产出 | `scout-output/acceptance-p1/`，7 个契约文件 |
| 状态 | `STATUS: DONE`，论文 8 / 专利 3，表格 11 行 |
| 机器校验 | `node scripts/check-output.mjs scout-output/acceptance-p1` → `ok: true`，exit 0 |
| 结论 | 8/8 论文（Crossref 期刊 + arXiv）、3/3 专利（CN113256217B、CN115229821A、CN114785842B），专利三件均读到权利要求（A 级） |

主代理抽查（不依赖子代理自述）：

- `search_arxiv` 复核 P07：返回同一标题、同一 arXiv 编号 2009.00594、同一 DOI 10.1109/EIT.2019.8834040 —— 非编造。
- `read_page` 复核 `https://patents.google.com/patent/CN113256217B/zh`：标题、申请人 `Beijing Yuanjing Technology Co ltd`、申请日 2021-06-11、授权公告 2021-11-16、状态 Active —— 与 `patents.json` 一致。
- 子代理自述的通道局限与实际一致：`search_papers`（Semantic Scholar + PubMed）报 key 未配置且未重试，改用 `sources:["arxiv"]`、Crossref（`web_fetch`）与 Google Patents（`read_page`）。

## 2026-10-21 · P2 已知文献核验（真实调用）

| 项 | 值 |
| --- | --- |
| 调用 | `paper_patent_scout({ description: "P2 已知文献核验", prompt: "核验这篇文献是否真实存在并给出完整元数据：Attention Is All You Need。输出到 scout-output/acceptance-p2/。" })` |
| 子代理 | `8e41b404-8e47-492b-ba41-bf086e7213c5` |
| 产出 | `scout-output/acceptance-p2/`，7 个契约文件 |
| 状态 | `STATUS: DONE`，命中 15 / 纳入 1，证据 A |
| 机器校验 | `node scripts/check-output.mjs scout-output/acceptance-p2` → `ok: true`，exit 0 |

核验结论：真实存在。arXiv 1706.03762、NeurIPS 2017 proceedings 摘要页 + 官方 BibTeX + Metadata.json、正式版 PDF、ACM DL 五处独立返回同一标题与 8 位作者；会议版页码 5998–6008（Metadata.json）。附带发现：同一摘要的 BLEU 数值有三处版本差异（proceedings 摘要页 27.5/41.1、Metadata.json 28.4/41.0、arXiv v7 28.4/41.8），引用须声明版本。

落盘溯源（如实记录）：本轮早先由我派出的 depth-1 包装子代理抢在真实调用前写过同名目录（18:24:41），它不是 `paper_patent_scout` 的输出。真实调用完成后 7 个文件全部被重写（mtime 18:27:46–18:28:19，晚于该子代理 18:24:xx 的启动），因此上表证据取自真实调用，包装子代理的产物已被覆盖。

## 2026-10-21 · P3 纯专利检索（真实调用）

| 项 | 值 |
| --- | --- |
| 调用 | `paper_patent_scout({ description: "P3 专利检索", prompt: "检索配送机器人电梯协同相关专利 3 件，CN/US，输出到 scout-output/acceptance-p3/，中文。" })` |
| 子代理 | `59926776-efd0-47a5-be6a-640438b8f23d` |
| 产出 | `scout-output/acceptance-p3/`，7 个契约文件（`papers.json` 为 `[]`，符合纯专利任务） |
| 状态 | `STATUS: DONE`，专利 3 件 |
| 机器校验 | `node scripts/check-output.mjs scout-output/acceptance-p3` → `ok: true`，exit 0 |

结果：CN111392530B（Rajax，授权，A）、CN117886185A（盛视科技/Maxvision，Pending，A，读到权利要求 1–10）、US8958910B2（Hitachi，授权，B——页面在 50,000 字符处截断，仅摘要+背景+发明内容）。子代理主动声明未做同族/引文扩展、未核 CNIPA 登记簿、申请人英文名未回译。

## 2026-10-21 · AC-7 空主题 → NEED_INPUT（真实调用）

| 项 | 值 |
| --- | --- |
| 调用 | `paper_patent_scout({ description: "AC-7 空主题", prompt: "帮我检索" })` |
| 子代理 | `29feaf57-e607-4c4f-804b-b0b593ac359f` |
| 产出 | 无目录、无文件（清单核对：调用后 `scout-output/` 仍为既有条目） |
| 收尾 | `STATUS: NEED_INPUT`，列出缺失字段（topic、types、time_range、jurisdictions、max_results、output_dir、known_items、constraints）并给三个可选方向 |

## 2026-10-21 · S1 / S2 结构校验（机器化）

| 用例 | 证据 |
| --- | --- |
| S1 结构 | 三次产出全部 `check-output.mjs ok: true`（表格行数 = 记录数、bib 条数 = 表格行数、CSV 数据行 ≤ 表格行数、`counts.included` 一致、必填字段齐全且无额外键） |
| S2 权限 | 三次产出的写操作只落在各自 `output_dir`；仓库 `modes/`、`bundles/`、`scripts/`、`schema/`、`tests/` 无写入（子代理自述与目录 mtime 一致） || S2 重试上限 | P1 `search-log.md` 记录 `search_papers` 报 key 未配置后**未重试**；`web_fetch` 对 patents.google.com 失败后改用 `read_page`，未循环重试 |
| AC-6 不编造 | 抽查 P07（arXiv 2009.00594）与 PAT01（CN113256217B）均与外部源一致；未在三次产出中发现无来源的 DOI/专利号 |

修复记录（本轮新增）：

| 问题 | 修复 | 验证 |
| --- | --- | --- |
| S1 只能人工核对 | 新增 `scripts/check-output.mjs`（状态行/表行/bib/CSV/`counts.included`/字段白名单 一次算完），并加 `tests/check-output.test.mjs` + 三个 fixture（合法、缺 bib、缺 doi） | 先红（3 项 fail）后绿；`verify.mjs` 增第 13 项 `output validator available` |
| 包装子代理会绕过工具、直接按契约写目录（伪造验收证据的风险） | 验收只认 `paper_patent_scout` 真实调用的产物；包装产物已被真实调用覆盖，并在本文件注明 | P2 段落“落盘溯源” |

## 2026-10-21 · AC-9 反序卸载与按序重装（真实执行）

| 步骤 | 真实返回 |
| --- | --- |
| 1. `remove_bundle dsh-paper-patent-scout-tool`（先卸工具包） | `stage: remove, application: applied` |
| 2. `remove_bundle dsh-paper-patent-scout`（再卸 preset 包） | `stage: remove, application: applied` |
| 3. `list_bundles`（limit 100，total 34） | 两个包名均不在列表中；`overrides` 里也不再有 `preset-paper-patent-scout` / `paper-patent-scout` |
| 4. `install_bundle bundles\paper-patent-scout`（先装 preset 包） | `stage: enable, enabled: true, application: applied` |
| 5. `install_bundle bundles\paper-patent-scout-tool`（再装工具包） | `stage: enable, enabled: true, application: applied` |
| 6. 工具可见性 | 重装后系统提示的委派段再次出现 `Start independent delegations with \`paper_patent_scout\` …` |

结论：反序卸载不报错、不会残留孤儿 preset 行；按序重装后工具重新出现在模型可调用目录，与本模式的安装契约一致。

## 2026-10-22 · AC-3 重启后长期可见性（已通过）

| 观测点 | 证据 |
| --- | --- |
| 进程重启 | Web GUI 端口由 `127.0.0.1:64535` 变为 `127.0.0.1:55937`，会话为新进程 |
| 工具仍在目录 | 新进程的系统提示委派段为 `Start independent delegations with \`paper_patent_scout\` or \`subagent\` or \`subagent_fork\`…` |
| 结论 | 两个 bundle 的安装写入 profile 清单，重启后 preset 与工具行均被加载，满足“后续调用”的长期可用要求 |

## 2026-10-22 · 专利专项跑批 `scout-output/ssb-patents`（真实调用）

| 项 | 证据 |
| --- | --- |
| 任务 | 固态电池热失控早期检测，中国发明专利，5 件 |
| 产出 | 契约 7 文件：`evidence.md`（8386B）、`patents.json`（8934B）、`papers.json`（`[]`）、`candidates.csv`、`results.csv`、`references.bib`、`search-log.md`、`run.json`；`scout-output/ssb-patents/` 下无多余文件 |
| 状态 | `evidence.md` 首行 `STATUS: DONE`，`run.json.status` 一致 |
| 机器校验 | `node scripts/check-output.mjs scout-output/ssb-patents` → `ok: true`（表行 5 = 专利 5、bib 5 条、CSV 5 行、`counts.included` 5、五条记录与 `run` 均无缺字段/无额外键） |
| 结果 | CN119624886B（授权 Active）、CN115061048A（公开）、CN115863852A（公开）、CN120446770B（授权）、CN121476985B（授权） |
| 主代理外部复核 | `read_page https://patents.google.com/patent/CN119624886B/zh` 独立读到：标题“固态电池热故障诊断与在线预警方法”、Current Assignee `State Grid Integrated Energy Service Group Co Ltd`、申请号 CN202411671240.4A、申请日 2024-11-21、A 公开 2025-03-14、B 授权 2026-04-10、Legal status Active、Anticipated expiration 2044-11-21 —— 与 `patents.json` PAT01 一致 |
| 结论 | 纯专利任务可独立完成，证据等级 A（读到说明书与权利要求），无编造迹象 |

## 2026-10-22 · 受限会话门禁降级（环境限制，非仓库缺陷）

在**受限沙箱会话**（禁止 `spawn` 子进程、禁止写 `bundles/`）中执行门禁时遇到：

| 命令 | 受限会话表现 | 原因 | 仓库侧的替代证据 |
| --- | --- | --- | --- |
| `node --test` | `spawn EPERM`（Node 测试运行器为每个测试文件 spawn 子进程） | 沙箱禁止进程创建 | `node tests/project.test.mjs` 直接运行，7/7 通过 = 测试内容本身全绿 |
| `node scripts/build.mjs` | `EPERM ... open 'bundles\paper-patent-scout\cordis.patch.yml'`（errno -4048） | 沙箱拒绝写 `bundles/` | “生成物与人格不漂移”由 `verify.mjs` 的 `patches generated and in sync` 项校验；构建需在具备写权限的会话执行 |
| `git status/diff` | `fatal: not a git repository` | 本目录未初始化 git | 改动核对以文件级清单与 `verify.mjs` 为准 |

在**具备写权限的会话**（本会话，danger-full-access）中三条门禁均正常：`build.mjs` 写出 preset 206 行 + tool 16 行，`verify.mjs` 13/13，`node --test` 10/10。降级写法已写入 `docs/troubleshooting.md`。加入 `ppt-maker` 后，同一会话的最新门禁为：`build.mjs` 写出两个模式共 4 个 patch（206 + 16 + 225 + 16 行），`verify.mjs` 23/23，`node --test` 17/17。

## 2026-10-23 · ppt-maker 离线门禁（v0.1，已通过）

| 项 | 证据 |
| --- | --- |
| 生成 | `node scripts/build.mjs` → `bundles/ppt-maker/cordis.patch.yml`（225 行）+ `bundles/ppt-maker-tool/cordis.patch.yml`（16 行），与 `modes/ppt-maker/*.template.yml` 同步 |
| 契约门禁 | `node scripts/verify.mjs` → `23/23 checks passed`（两个模式各 7 项 + 项目级 9 项；新增 ppt schema、ppt validator、两模式文档与示例检查） |
| 测试 | `node --test` → `# tests 17 / # pass 17 / # fail 0`（新增 `check-ppt-output.test.mjs` 4 例 + `project.test.mjs` 中 ppt 契约 2 例） |
| 校验器正例 | `node scripts/check-ppt-output.mjs tests/fixtures/ppt-valid` → `ok: true`，exit 0（2 页、1 个 provided 槽位、备注段 2） |
| 校验器反例 | `... tests/fixtures/ppt-broken-notes` → `ok: false`，exit 1，error 为 `slide 2 notes must be a string of at least 60 chars (speaker notes are mandatory)` |
| NEED_INPUT 形态 | `... tests/fixtures/ppt-need-input` → `ok: true`，exit 0；`status: NEED_INPUT`、`deckForbidden: true`、requests 非空 |
| 红→绿记录 | 首次跑门禁时 `verify` 报 `ppt status enum drifted`（schema 的 run.status 用 `$ref` 指向 `$defs.status`，校验器未解引用）；`project.test` 两处断言失败（`/id: ppt-maker$/` 缺 `m`；run.status 同样是 `$ref`）。修复后 23/23 + 17/17 |
| 后续执行 | 安装与冒烟见下两节（APP-0、`ppt_maker` 冒烟均通过）；PP-1…PP-5 在线验收待执行 |

## 2026-10-23 · ppt-maker 安装（APP-0，已通过）

| 步骤 | 真实返回 |
| --- | --- |
| 装 preset 包 | `plugin_manager install_bundle E:\VibeCoding\dshMaker\bundles\ppt-maker` → `stage: enable, target: dsh-ppt-maker, enabled: true, application: applied`；pnpm `+ dsh-ppt-maker 0.1.0 <- ...`；仅有与本项目无关的 `llm-deepseek-account` warning |
| 装工具包 | `install_bundle ...\ppt-maker-tool` → `stage: enable, target: dsh-ppt-maker-tool, enabled: true, application: applied`；无 `Unknown agent preset` |
| bundle 列表 | `list_bundles`（total 40）：`dsh-ppt-maker` 行 `preset-ppt-maker`（`@deepseek-ai/dsh-agent-preset`）、`dsh-ppt-maker-tool` 行 `ppt-maker`（`@deepseek-ai/dsh-tool-subagent`），均 installed/enabled |
| profile 顺序 | `dsh.profile.bundles` 末六项为 `dsh-paper-patent-scout`、`dsh-paper-patent-scout-tool`、`dsh-ops`、`dsh-cost-meter`、`dsh-ppt-maker`、`dsh-ppt-maker-tool`（preset 在工具之前） |
| 工具可见 | 新系统提示委派段为 `Start independent delegations with \`paper_patent_scout\` or \`ppt_maker\` or \`subagent\` or \`subagent_fork\`…` |

## 2026-10-23 · `ppt_maker` 冒烟（真实调用，PARTIAL 合理）

| 项 | 证据 |
| --- | --- |
| 调用 | 主代理直接调 `ppt_maker`（child `de7b13ca-12a3-4f59-aa3e-05ba2d0d77d4`），brief：3 页中文评审简介、听众评委、主题 `data`、素材仅限仓库文档、禁用生成图、`out/ppt-smoke/` |
| 产出 | `out/ppt-smoke/`：`deck.pptx`（15623B）、`deck.html`（48242B）、`deck.json`（15971B）、`outline.md`、`notes.md`、`sources.md`、`assets/MANIFEST.md`、`run.json`、`REPORT.md` + `render/artifacts/document.pdf` 与 3 张 PNG |
| 状态 | `REPORT.md` 首行与 `run.json.status` 均为 `PARTIAL`：第 2 页有 1 个 placeholder 图片槽位（brief 明确“无图片素材，用 placeholder”），未生成图、未用网络图；其余 9 文件齐全 |
| 备注 | `deck.json` 3 页，`notes` 长度 167 / 342 / 285 字符，`notes.md` 3 段一致；`run.json.checks.ppt_check` = `0 error / 0 warning（revision 3，3 页）` |
| 目检 | `ppt_render` 输出 PDF + 3 PNG；主代理查看第 1、3 页：标题/表格/页码正常，无溢出与错位 |
| 机器校验 | `node scripts/check-ppt-output.mjs out/ppt-smoke` → `ok: true`，`status: PARTIAL`，`slides: 3`、`images_placeholder: 1`、`noteSections: 3`、`imageSlots: 1`，exit 0 |
| 结论 | 工具链端到端可用；缺图片素材时按契约降级 `PARTIAL` 并给出替换路径，符合“图片必须可替换、不得自行生成”的约束 |

## 已知限制（如实记录）

- AI4Scholar 未配置 API key：论文通道实际只剩 arXiv + `web_search` + `read_page` + `download_by_doi`，Semantic Scholar/PubMed/Google Scholar 不可用。
- 专利通道没有官方 API，靠 `web_search` + `read_page` 读 Google Patents 页面；`web_fetch` 对 patents.google.com 直接 `fetch failed`。
- 受限沙箱会话无法执行 `node --test`（fork 限制）与 `build.mjs`（写 `bundles/` 限制），需在有写权限的会话跑完整门禁，或按 `docs/troubleshooting.md` 用替代命令取证。
- 重启后长期可见性已验证一次（AC-3）；后续若手动删除 profile 中的 bundle 依赖，需要重新 `install_bundle`。
- `ppt-maker` 依赖宿主 `dsh-ppt` 插件与 LibreOffice Kit（`ppt_render`）；缺失时状态降级为 `FAILED` / `PARTIAL`，不静默交付。
