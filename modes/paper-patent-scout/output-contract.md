# paper-patent-scout · 输出契约

本文件是 persona 中"输出契约"的展开版，供维护者与验收者使用；运行时行为以 `persona.md` 为准，两者冲突时先改本文件再改 persona，并同步 `schema/output.schema.json`。

## 目录

- 默认：`scout-output/<slug>-<YYYY-MM-DD>/`（相对调用方工作区）
- `<slug>`：主题的 ASCII 短名，小写、连字符，例如 `hotel-service-robot`
- 日期取任务开始日（本地时间）
- 调用方在 mission 里显式给出 `output_dir` 时以 mission 为准；只允许写该目录

## 七个文件

| 文件 | 格式 | 关键约束 |
| --- | --- | --- |
| `evidence.md` | Markdown | 首行必须是 `STATUS: <状态码>`；含任务、检索式、论文表、专利表、综合发现、覆盖度与局限 |
| `papers.json` | JSON 数组 | 元素符合 `schema/output.schema.json#/$defs/paper`；无结果写 `[]` |
| `patents.json` | JSON 数组 | 元素符合 `#/$defs/patent`；无结果写 `[]` |
| `candidates.csv` | CSV（UTF-8，逗号分隔，首行表头） | 列：`id,type,title,year,venue_or_assignee,identifier,relevance,evidence_level,url`；标题含逗号时用双引号包裹 |
| `references.bib` | BibTeX | 每条 key = 记录 `id`；论文 `@article`/`@inproceedings`，专利 `@misc` 含 `number`、`assignee`、`note` |
| `run.json` | JSON | 符合 `#/$defs/run`；`counts.included` = papers + patents 条数 |
| `search-log.md` | Markdown | 每次检索一行：时间、工具、检索式、命中数、去重后新增、备注 |

## 可选附加文件

以下文件**只能附加、不能替代**上面 7 个契约文件：

| 文件 | 用途 |
| --- | --- |
| `brief.json` | 任务书副本（调用方传入的 mission 原文 + 解析后的字段），便于复现 |
| `report.md` | 人读版报告；内容不得超出 `evidence.md` 的证据范围 |

## evidence.md 骨架

```markdown
STATUS: DONE

# <主题> · 论文与专利检索证据台账

- 任务日期：YYYY-MM-DD
- 检索范围：<年份> · <地域> · <文献类型>
- 命中 / 纳入：<found> / <included>（去重剔除 <n>，相关性剔除 <m>）

## 1. 检索式
| # | 通道 | 检索式 | 命中 |
| --- | --- | --- | --- |
| Q1 | papers | ... | 42 |

## 2. 论文证据表
| ID | 年份 | 标题 | 作者/机构 | 来源 | 相关度 | 证据 | 关键结论 | 链接 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |

## 3. 专利证据表
| ID | 公开号 | 标题 | 申请人 | 申请日/公开日 | 法律状态 | 相关度 | 证据 | 关键结论 | 链接 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |

## 4. 综合发现
1. ... [P01][PAT02]

## 5. 覆盖度与局限
- 覆盖：...
- 局限：...
- 建议补检：...
```

## 一致性规则

1. `evidence.md` 表格行数 = `papers.json` 条数 + `patents.json` 条数。
2. `candidates.csv` 行数 ≤ 表格行数；截断必须在 `run.json`.`coverage` 说明。
3. `references.bib` 条目数 = 表格行数（同一记录只一条）。
4. `run.json`.counts.included = 表格行数；found = 所有通道命中数之和（去重前）。
5. `STATUS` 与覆盖度自洽：不满足 DONE 门槛时不得写 DONE。

## 示例

完整示例见 `examples/01-papers.md`、`examples/02-patents.md`、`examples/03-mixed.md`；验收用例见 `tests/acceptance.md`。
