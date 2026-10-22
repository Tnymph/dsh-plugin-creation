# 示例 03 · 论文 + 专利混合

## 调用

```
paper_patent_scout({
  description: "调研：服务机器人 SLAM 产业化",
  prompt: `主题：服务机器人 SLAM（同步定位与建图）在商用场景的落地。
范围：论文 20 条（2019 起）+ 专利 12 件（CN/US/EP）；
输出到 scout-output/service-robot-slam-2026-10-21/；
中文产出；已知需核验：arXiv 2401.00000（若存在请核实编号）。
另请给出一页"技术路线 → 代表性论文/专利"的对照表。`
})
```

## 子代理内部动作（预期）

- 论文：`search_papers` 两轮 + `search_arxiv` 补预印本 + 引文扩展；
- 专利：`web_search` 发现 + `read_page` 核验，按 CPC `G01C21/`、`G05D1/` 等实际页面分类号组织；
- `known_items`：用 `search_arxiv`/`get_semantic_paper_detail` 核实给定编号；不存在则明确写"未检索到，编号可能有误"，**不得**编造该文；
- 去重后合并同一工作的 arXiv 版与期刊版；
- `evidence.md` 增加一节"技术路线对照表"（路线 | 代表论文 | 代表专利 | 成熟度）。

## 预期返回

```
STATUS: PARTIAL
服务机器人 SLAM 的商用落地集中在激光+视觉融合与多传感器标定，论文检出 18 条、专利 12 件（A 级论文 5 条、专利 7 件）。
关键发现：
1. 视觉 SLAM 在动态人流场景的鲁棒性仍是主要瓶颈 [P04][PAT03]（A）
2. 国产厂商在"建图-调度一体化"上有密集布局 [PAT07]（A）
3. 给定编号 arXiv 2401.00000 未检索到，疑似有误，未采用
产出：E:\...\scout-output\service-robot-slam-2026-10-21\evidence.md
局限：论文目标 20 条仅达 18；2 条专利仅摘要级。
```

> 注：示例中的编号、结论均为演示格式，不代表真实检索结果；真实运行必须以工具返回为准。

## 预期文件

与示例 01/02 相同的 7 个文件；`papers.json` 18 条 + `patents.json` 12 条 = `evidence.md` 表格 30 行；`candidates.csv` 可截断至 25 行，但需在 `run.json`.coverage 说明截断规则。
