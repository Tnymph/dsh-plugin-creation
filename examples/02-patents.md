# 示例 02 · 纯专利检索

## 调用

```
paper_patent_scout({
  description: "专利扫描：配送机器人电梯协同",
  prompt: `检索"配送机器人与电梯协同控制"相关专利，地域优先中国与美国，2018 年至今。
要求：
- 专利 10 件，能读到权利要求全文的优先；
- 附 CPC/IPC 分类号与法律状态；
- 输出到 scout-output/robot-elevator-patents/；
- 输出语言：中文。`
})
```

## 子代理内部动作（预期）

1. 专利检索式：
   - `site:patents.google.com robot elevator coordination patent`
   - `配送机器人 电梯 协同 专利`
   - `delivery robot elevator control patent CN`
2. `web_search` 发现候选链接 → 逐条 `read_page("https://patents.google.com/patent/<PUB>/<lang>")` 核验。
3. 抽取：标题、摘要、Current Assignee、发明人、申请/公开日、法律状态、CPC/IPC、引用。
4. 同族合并（去 kind code），保留最新公开，族号写 `family_id`。
5. `web_fetch` 只试 1 次，失败即改用 `read_page`，不重试。
6. 去重、评分、写文件。

## 预期返回

```
STATUS: DONE
配送机器人-电梯协同专利集中在 2019–2023 年的中日韩申请人，检出 10 件（A 级 6 件，读到权利要求 1）。
关键发现：
1. 电梯呼叫与机器人路径规划的联合调度是主要保护点 [PAT02]（A，claim 1）
2. 部分早期申请已失效或驳回，需注意法律状态 [PAT06]（B）
3. 2024 年后出现"多梯多机"权利要求布局 [PAT09]（A）
产出：E:\...\scout-output\robot-elevator-patents\evidence.md
局限：仅覆盖 Google Patents 可渲染页面；2 件仅有摘要级证据；未做同族全球展开。
```

## 预期文件

```
scout-output/robot-elevator-patents/
├── evidence.md      # 首行 STATUS: DONE
├── papers.json      # []
├── patents.json     # 10 条，schema: patent，patent_number 保留 kind code
├── candidates.csv   # 10 行，identifier = 公开号
├── references.bib   # 10 条 @misc，含 number/assignee
├── run.json
└── search-log.md
```

## 反例（不该发生）

- 把 `US11887367` 写成 `US11887367B1`（未见到 kind code 却补全）；
- 用 `web_fetch` 反复重试 `patents.google.com`；
- 只凭搜索 snippet 给出 `evidence_level: A`。
