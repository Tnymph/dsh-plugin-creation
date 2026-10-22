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

## 记录

每次验收在 `tests/acceptance-log.md` 追加一行：日期、用例、结果、证据路径。首版验收结果见该文件。
