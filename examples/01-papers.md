# 示例 01 · 纯论文检索

## 调用

```
paper_patent_scout({
  description: "文献扫描：酒店服务机器人调度",
  prompt: `检索 2020 年至今关于"酒店服务机器人调度与多机协同"的论文。
要求：
- 论文 15 条，中英文都要，优先方法类与实证评估；
- 输出到 scout-output/hotel-robot-scheduling-2026-10-21/；
- 输出语言：中文；每条标注证据等级与相关度；
- 综述只保留近 3 年的 1-2 篇。`
})
```

## 子代理内部动作（预期）

1. 关键词表：`hotel service robot`、`delivery robot`、`multi-robot scheduling`、`task allocation`、`酒店服务机器人`、`多机协同`。
2. `search_papers` 1–2 条组合式 → 记录命中数。
3. 年份/类型收窄；`search_arxiv` 补预印本；top 3–5 篇做 1 层引文扩展。
4. 关键结论用 `search_semantic_snippets` 定位，必要处 `read_semantic_paper` 读方法段。
5. 去重、评分、写 7 个文件。

## 预期返回

```
STATUS: DONE
酒店服务机器人调度研究近 5 年集中在多机任务分配与电梯协同，检出 15 条（A 级 4 条）。
关键发现：
1. 基于拍卖的任务分配在酒店场景验证充分 [P03]（A）
2. 电梯-机器人协同调度是 2023 年后的新热点 [P07]（B）
3. 真实酒店部署的实证研究仍少 [P11]（B）
产出：E:\...\scout-output\hotel-robot-scheduling-2026-10-21\evidence.md（含 6 个附件）
局限：中文核心期刊未覆盖；2 条仅有摘要级证据。
```

## 预期文件

```
scout-output/hotel-robot-scheduling-2026-10-21/
├── evidence.md      # 首行 STATUS: DONE
├── papers.json      # 15 条，schema: paper
├── patents.json     # []
├── candidates.csv   # 15 行
├── references.bib   # 15 条，key = P01…P15
├── run.json         # counts.included = 15
└── search-log.md
```
