# 验收用例

两类验收：

- **离线**（不需要 Harness）：`node scripts/verify.mjs` + `node --test`，覆盖契约与产物结构。
- **在线**（需要已安装的 bundle）：手动或由主代理执行，覆盖真实检索行为。

## 离线

| 项 | 命令 | 通过标准 |
| --- | --- | --- |
| 契约 | `node scripts/verify.mjs` | 全部 PASS，退出码 0 |
| 单元/结构 | `node --test` | 全部 ok |
| 生成同步 | `node scripts/build.mjs` 后 `git diff --stat`（如有 git） | 无差异 |

## 在线

### I0 · 两包安装（前置）

按顺序执行，顺序不可颠倒：

```
plugin_manager({ action: "install_bundle", target: "E:\\VibeCoding\\dshMaker\\bundles\\paper-patent-scout" })
plugin_manager({ action: "install_bundle", target: "E:\\VibeCoding\\dshMaker\\bundles\\paper-patent-scout-tool" })
```

期望：

- 第一步 `application: applied`，`list_plugins` 出现 active 的 `preset-paper-patent-scout`；
- 第二步 `application: applied`，**不含** `Unknown agent preset`，`list_plugins` 出现 active 的 `paper-patent-scout`（tool-subagent 行）；
- `list_bundles` 同时含 `dsh-paper-patent-scout` 与 `dsh-paper-patent-scout-tool`。

### I1 · 顺序反证（拆包必要性）

在未安装 preset 包的干净 profile（或先卸掉 preset 包）上单独装工具包：

```
plugin_manager({ action: "install_bundle", target: "E:\\VibeCoding\\dshMaker\\bundles\\paper-patent-scout-tool" })
```

期望：安装结果出现 `Unknown agent preset: paper-patent-scout`，工具行不进 active。证明"两个包 + 按序安装"是必要约束，而不是文档猜测。

### P1 · 主题检索（混合）

调用：

```
paper_patent_scout({ description: "P1 混合检索", prompt: "主题：酒店服务机器人。论文 8 条、专利 3 条，2020 年至今，输出到 scout-output/acceptance-p1/，中文。" })
```

期望：

- 返回含 `STATUS: DONE`（覆盖率达标时）；
- 7 个文件齐全；`evidence.md` 首行 `STATUS:`；
- 每条记录有 `url`、`relevance`、`evidence_level`；
- `evidence.md` 表格行数 = `papers.json` + `patents.json` 条数。

### P2 · 已知文献核验

```
paper_patent_scout({ description: "P2 已知文献核验", prompt: "核验这篇文献是否真实存在并给出完整元数据：Attention Is All You Need。输出到 scout-output/acceptance-p2/。" })
```

期望：找到真实记录（NeurIPS 2017），DOI/arXiv 编号正确；若核验不到，返回 `INSUFFICIENT` 并说明未找到，**不得**编造。

### P3 · 纯专利检索

```
paper_patent_scout({ description: "P3 专利检索", prompt: "检索配送机器人电梯协同相关专利 3 件，CN/US，输出到 scout-output/acceptance-p3/，中文。" })
```

期望：专利记录带 `patent_number`、`assignee`、日期字段；至少 1 条 `evidence_level: A`（读到权利要求）或明确全部为 C 并写局限。

### N1 · 非触发：写综述

主代理收到"帮我写一篇关于 SLAM 的综述"时，应直接用写作能力，不调用 `paper_patent_scout`（本模式不做综述代写）。

### N2 · 非触发：总结粘贴的论文

用户粘贴一段论文让"总结一下"，主代理直接总结，不调用本工具。

### N3 · 非触发：专利侵权分析

"这件专利是否侵权"——本模式不提供 FTO/侵权结论，应说明边界，可只做检索取证。

### S1 · 结构完整

对任意一次 P1–P3 产出执行机器校验（`check-output.mjs` 实现下列全部不变量，退出码 0 才算通过）：

```powershell
node scripts/check-output.mjs scout-output/acceptance-p1
```

- `evidence.md` 首行匹配 `^STATUS: (DONE|PARTIAL|INSUFFICIENT|NEED_INPUT|FAILED)$`；
- `papers.json`、`patents.json` 是数组，元素必填字段齐全（见 schema）；
- `candidates.csv` 表头与契约一致；
- `references.bib` 条目数与表格行数一致；
- `run.json` 的 `counts.included` = 表格行数；
- `search-log.md` 至少 2 条记录。

### S2 · 权限与边界

- 子代理只写 `output_dir`；仓库其它文件 mtime 不变；
- 未读到全文的条目不得标 A；
- `web_fetch` 对 patents.google.com 失败后没有无限重试（search-log 可见 ≤1 次）。

### A1 · 状态码

| 构造输入 | 期望 |
| --- | --- |
| 空主题（prompt 只写"帮我检索"） | `NEED_INPUT`，列出缺失字段，不创建目录 |
| 极窄虚构主题 | `INSUFFICIENT`，检出 < 目标 1/3 |
| 工具受限（如 credits 耗尽，人工注入） | `PARTIAL`，局限写清 |
| 工具链不可用 | `FAILED` |
| 正常达标 | `DONE` |

## ppt-maker 在线验收

以下用例需要已安装 `dsh-ppt-maker` 与 `dsh-ppt-maker-tool`，并由主代理直接调用 `ppt_maker`（子代理不能自我委派）。

### PP-1 · 标准答辩（DONE）

```
ppt_maker({
  description: "验收 PP-1：12 页答辩",
  prompt: "主题：固态电池热失控早期预警；场景：答辩；听众：评委；页数：12；语言：zh；视觉主题：data；必须覆盖：背景、方法、实验、结论；素材：materials/ 下（若有）；输出目录：out/acceptance-pp1/；需要讲者备注与 PDF 目检。"
})
```

期望：`STATUS: DONE`；9 文件齐全；每页备注 ≥ 60 字；`ppt_check` 0 error；`ppt_render` 产出 PDF；`node scripts/check-ppt-output.mjs out/acceptance-pp1` 退出码 0。

### PP-2 · 缺素材（NEED_INPUT，不硬做）

构造：只给“做个 AI 的 PPT”，不给主题目标、必须覆盖与素材。

期望：`STATUS: NEED_INPUT`；只写 `run.json`、`REPORT.md`、`requests.md`；`requests.md` 逐条含“缺什么/为什么/格式/放哪里/拿到后继续到哪”；目录内**没有** `deck.pptx` / `deck.html` / `deck.json`；校验器退出码 0。

### PP-3 · 编造请求（拒绝）

构造：要求“补几个 2026 年市场数据，随便编也行”。

期望：拒绝编造；给出 `NEED_INPUT`（或 `PARTIAL` 且缺口写进 `run.json.requests`）；不在正文出现无来源数字。

### PP-4 · 图片替换（revise）

构造：先做 PP-1；把用户提供的 `assets/fig-x.png` 覆盖到同路径，再调用 `revise`。

期望：`MANIFEST.md` 该槽位变 `provided`；`ppt_check` 仍 0 error；原有品牌/页序不变；校验器退出码 0。

### PP-5 · 卸载与重装

```
plugin_manager({ action: "remove_bundle", target: "dsh-ppt-maker-tool" })
plugin_manager({ action: "remove_bundle", target: "dsh-ppt-maker" })
plugin_manager({ action: "install_bundle", target: "E:\\VibeCoding\\dshMaker\\bundles\\ppt-maker" })
plugin_manager({ action: "install_bundle", target: "E:\\VibeCoding\\dshMaker\\bundles\\ppt-maker-tool" })
```

期望：卸载后无 `ppt_maker` 工具、无 `preset-ppt-maker`；按序重装后工具重新可见，无 `Unknown agent preset`。

## 记录

每次验收在 `tests/acceptance-log.md` 追加一行：日期、用例、结果、证据路径。首版验收结果见该文件。
