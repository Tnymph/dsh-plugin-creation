# 检索手册（Retrieval Playbook）

面向维护者与验收者：解释 persona 里那套 SOP 为什么这样写，以及实测过的工具行为。

## 1. 工具现实（2026-10 在本机 DSH 实测）

| 通道 | 工具 | 结论 |
| --- | --- | --- |
| 论文 | `search_papers` | 一次调用合并 Semantic Scholar + PubMed（可加 arXiv / Google Scholar），去重排序；**首选** |
| 论文 | `search_semantic*` / `search_pubmed` / `search_arxiv` / `search_google_scholar` | 有独有过滤/排序/分页能力；不要对同一检索式重复调用 |
| 论文 | `get_semantic_paper_batch` / `get_pubmed_paper_batch` | 批量补元数据，一次 ≤ 50 条 |
| 论文 | `get_semantic_citations` / `get_semantic_references` | 引文链，各 1 层 |
| 全文 | `read_arxiv_paper` / `read_semantic_paper` / `read_by_doi` | 分片返回；只读结论相关片段 |
| 全文内定位 | `search_semantic_snippets` | 找证据句，比通读便宜 |
| 专利 | `web_search` | 可发现 `patents.google.com/patent/…` 链接（Firecrawl 结果） |
| 专利 | `read_page` | **可**渲染 Google Patents 详情页，字段完整 |
| 专利 | `web_fetch` | 对 `patents.google.com` 实测 `TypeError: fetch failed`；最多试 1 次 |
| 专利 | `web_fetch` 备选站 | Justia 403、"Just a moment"；PatentGuru 468 中文插页；不要硬攻 |

预算：AI4Scholar 工具按次计费。persona 规定任务首尾各查一次 `get_ai4scholar_credits`，把消耗写进 `run.json`。

## 2. 检索式构建

1. 拆概念：主题 → 2–5 个核心概念。
2. 每个概念做中英双语词表：同义词、缩写、常见错拼、上位词/下位词。例：
   - 酒店服务机器人 → `hotel service robot`, `service robot`, `delivery robot`, `hospitality robot`, `guest service robot`, `室内配送机器人`
3. 论文式：`("<概念A>" OR "<同义词>") AND ("<概念B>")`；先宽后窄。
4. 专利式：关键词 + 分类号 + 地域，例如 `site:patents.google.com hotel service robot`、`service robot patent CN G05D`。分类号必须来自实际页面/结果，不得凭记忆断言。
5. 引文扩展只在 top 结果上做，避免指数膨胀。

## 3. 论文通道 SOP

1. `search_papers` 跑 1–2 条组合式，记录命中数。
2. 按年份、类型（综述/实证）、语言收窄；arXiv 抓预印本，PubMed 抓生物医学。
3. top 3–5 篇做前向/后向引文扩展。
4. 元数据用 batch 接口补齐。
5. 关键结论需要原文支撑时：`search_semantic_snippets` 定位 → `read_*` 读该段 → 标 `evidence_level: A`。
6. 只读到摘要 → `B`；只有搜索片段 → `C`。

## 4. 专利通道 SOP

1. 发现：`web_search`，多写几条：
   - `site:patents.google.com <关键词>`
   - `<关键词> 专利`
   - `<keyword> patent <synonym> (CN|US|EP|WO)`
2. 核验：`read_page("https://patents.google.com/patent/<PUB>/<lang>")`
   - 抽：标题、摘要、Current Assignee、发明人、申请号/申请日、公开/授权日、法律状态、CPC/IPC、引用数、同族线索
3. 同族合并：去掉 kind code（`B1`/`B2`/`A1`）后相同即同族，保留最新一条，`family_id` 记录族号，族内其它公开号写进 `notes`。
4. 打不开：降级 `evidence_level: C` 并写 `limitations`；换 Espacenet/Justia/CNIPA 只作补充，不保证成功。
5. 专利号格式自检：US ⇒ `US\d{7,11}[A-Z]\d?`；CN ⇒ `CN\d{9}[A-Z]?`；EP ⇒ `EP\d{7}[A-Z]\d?`；WO ⇒ `WO\d{4}/\d{6}`。格式不符标 uncertain，不要"修正"。

## 5. 去重

- 论文：DOI > arXiv ID > PMID > 归一化标题（小写、去标点、压空格）+ 第一作者姓 + 年份。
- 预印本与期刊版合并为一条：`publication_status` 写版本关系（`preprint` → `published`），`notes` 说明。
- 专利：公开号去 kind code；`family_id` 相同视为一族。

## 6. 评分

0–5 分，锚点见 persona。经验：把"5 分"限定为"可直接引用的方法/权利要求"，通常只有 10–20% 命中；若 5 分占比过高，说明 rubric 被放宽了，需要复核。

## 7. 证据等级

| 等级 | 何时给 | 不可用于 |
| --- | --- | --- |
| A | 读到全文/权利要求全文，能指到段落/权利要求号 | — |
| B | 元数据 + 摘要 | 效果数字、保护范围细节 |
| C | 只有搜索片段或二手页面 | 任何确定性结论；只能作为待核实线索 |

## 8. 常见失败与处置

| 现象 | 处置 |
| --- | --- |
| `web_fetch` 对 patents.google.com `fetch failed` | 改用 `read_page`；只重试 1 次 |
| `read_page` 超时/空结果 | 降 C 级，记录局限，换 web_search snippet |
| 检索命中过多（>100） | 加限定词/年份/分类号，不要翻页硬扫 |
| 命中过少（<5） | 放宽同义词、拆概念、换语言；仍不足 → `PARTIAL`/`INSUFFICIENT` |
| 同一 DOI 多版本 | 合并，保留期刊版，预印本进 `notes` |
| AI4Scholar 额度不足 | 记 `limitations`，只做元数据级检索（B/C）并标 `PARTIAL` |

## 9. 预算

单次任务：论文 ≤25 条、专利 ≤15 条、工具调用 ≤40 次、全文读取 ≤8 篇。超预算时**降低目标并在 `coverage` 说明**，不允许静默截断。
