# ppt-maker · 输出契约

本文件是 persona「输出契约」的展开版，供维护者与验收者使用。运行时行为以 `persona.md` 为准；两者冲突时先改本文件，再改 persona，并同步 `schema/ppt-output.schema.json` 与 `scripts/check-ppt-output.mjs`。

## 目录

- 默认：`out/<slug>/`（相对调用方工作区）；`<slug>` 为 ASCII 小写连字符短名，例如 `thesis-defense-2026`
- 调用方在 brief 里显式给出 `output_dir` 时以 brief 为准；**只允许写该目录**
- 目录内 `assets/` 只放用户提供/授权的图片与 `MANIFEST.md`

## 文件清单

| 文件 | 格式 | 关键约束 |
| --- | --- | --- |
| `deck.pptx` | PPTX | 可编辑；每页有备注；图片来自 `assets/` |
| `deck.html` | HTML | 独立放映页；允许 CSS/SVG 装饰，不得含生成式图片冒充素材 |
| `deck.json` | dsh-ppt JSON 工程 | `slides[].notes` 每页 ≥ 60 字符；图片 `src` 为 `assets/` 相对路径 |
| `outline.md` | Markdown | 每页标题 + 要点 + 来源标记 |
| `notes.md` | Markdown | 逐页讲者备注，与 `deck.json` 一致；标题形如 `## 第 N 页 · 标题` |
| `sources.md` | Markdown | 每条事实的来源：文件+定位 / URL / 用户口述；装饰图形单独说明 |
| `assets/MANIFEST.md` | Markdown 表格 | 每个图片槽位：槽位、用途、文件、状态（provided/placeholder）、建议比例、替换说明 |
| `run.json` | JSON | 符合 `schema/ppt-output.schema.json#/$defs/run`；三处状态一致之一 |
| `REPORT.md` | Markdown | 首行 `STATUS: <状态码>`；页面清单、检查与渲染结果、缺口与下一步 |
| `render/` | PDF/PNG | 可选；目检证据 |
| `requests.md` | Markdown | 仅 `NEED_INPUT`；材料请求清单 |

## MANIFEST.md 表格格式

```markdown
| 槽位 | 用途 | 文件 | 状态 | 建议比例 | 替换说明 |
| --- | --- | --- | --- | --- | --- |
| fig-architecture | 第 4 页系统架构 | assets/fig-architecture.png | provided | 16:9 | 同名替换后跑 revise |
| fig-dashboard | 第 6 页监控截图 | assets/fig-dashboard.png | placeholder | 16:9 | 等用户提供；页面已标图片位 |
```

规则：

- 每行 6 列，列序固定；`状态` 只能是 `provided` 或 `placeholder`
- `provided` 的行必须有对应文件；`placeholder` 的行不得有文件（页面用文字标注图片位）
- `assets/` 下除 `MANIFEST.md` 外的每个文件都必须被某个 `provided` 行引用（防止混入生成图）
- 槽位名用小写连字符，同一目录内唯一

## run.json 字段

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `mission` | string | 任务摘要（由 brief 归一） |
| `status` | enum | `DONE` / `PARTIAL` / `NEED_INPUT` / `FAILED` |
| `audience` | string | 听众，默认 `评委` |
| `language` | string | `zh` / `en` / `bilingual` |
| `theme` | string | `swiss` / `velvet` / `data` / `soft` / `bold` |
| `deck` | object | `{slug, pages}` |
| `counts` | object | `{slides, images_provided, images_placeholder}` |
| `checks` | object | `{ppt_check: "0error"|"errors", render: "pdf"|"png+pdf"|"none"}` |
| `requests` | string[] | 缺料请求；`NEED_INPUT` 时非空 |
| `files` | string[] | 实际交付文件（相对 output_dir） |
| `limitations` | string[] | 已知限制（字体、工具、素材） |

## NEED_INPUT 时的最小产出

只写 `run.json`、`REPORT.md`、`requests.md`（可选 `outline.md` 草案），**不得**生成 `deck.pptx` / `deck.html` / `deck.json`。校验器会拒绝带 deck 的 NEED_INPUT 目录。

## 状态一致性

`REPORT.md` 首行、`run.json.status`、子代理返回摘要的 `STATUS:` 三处必须相同。`DONE` 的附加条件：无 placeholder、`ppt_check` 0 error、已渲染目检。
