# Spec · paper-patent-scout

状态：v0.2（两个 bundle 按序交付，已实现并待在线验收）
对应需求：`需求文档.md` R1–R11
实现位置：`modes/paper-patent-scout/`（源）→ `bundles/paper-patent-scout/`（preset 包）+ `bundles/paper-patent-scout-tool/`（工具包）

## 1. 目标

在 DeepSeek Harness 中提供一个**可安装、可卸载、可复用**的论文与专利检索子代理模式：主代理一次调用即可拿到带证据分级、去重、去伪的检索台账，而不是一段无法核验的答案。

## 2. 输入契约

调用方式：工具 `paper_patent_scout({ description, prompt })`，`prompt` 即 mission，字段见 `modes/paper-patent-scout/persona.md`「输入契约」。

- 必需：`topic`（主题/关键词）；可选：`types`、`time_range`、`jurisdictions`、`max_results`、`output_dir`、`output_language`、`known_items`、`constraints`。
- 缺 `topic` → 子代理必须返回 `STATUS: NEED_INPUT` 并列出缺失字段，不得凭空选题。

## 3. 输出契约

文件与字段见 `modes/paper-patent-scout/output-contract.md` 与 `schema/output.schema.json`；共 7 个文件：`evidence.md`、`papers.json`、`patents.json`、`candidates.csv`、`references.bib`、`run.json`、`search-log.md`。

## 4. 功能需求映射

| 需求 | 实现 |
| --- | --- |
| R1 论文检索 | persona「论文通道」+ `search_papers` 优先 |
| R2 专利检索 | persona「专利通道」+ `web_search` + `read_page` |
| R3 去重 | persona「去重合并」+ playbook §5 |
| R4 相关性评分 | rubric 0–5 |
| R5 证据分级 | A/B/C |
| R6 可追溯 | 每条必带 `url`；`run.json` 记录 queries/counts |
| R7 不编造 | 绝对规则 1–4；自检清单 |
| R8 结构化产出 | JSON/CSV/BibTeX + schema |
| R9 状态码 | DONE/PARTIAL/INSUFFICIENT/NEED_INPUT/FAILED |
| R10 可安装交付 | 两个 bundle：preset 包 + 工具包，按序安装 |
| R11 可扩展模式工厂 | `templates/mode/` + `scripts/new-mode.mjs` 生成同构两个包 |

## 5. 非目标

- 不做专利侵权分析、FTO、权利要求比对（未来模式）。
- 不做文献综述写作、不生成图、不做 PPT。
- 不接入付费专利库（Derwent/CNKI/Incopat），v0.1 只用免费通道。
- 不自动安装到用户 profile（安装是显式动作，见 `docs/install.md`）。

## 6. 验收标准

每条可观察、可复验；执行见 `tests/acceptance.md`。

| ID | 标准 |
| --- | --- |
| AC-1 | `node scripts/verify.mjs` 全部 PASS，且 `node --test` 通过 |
| AC-2 | 依次 `install_bundle` 两个包：`list_bundles` 含 `dsh-paper-patent-scout` 与 `dsh-paper-patent-scout-tool`；`list_plugins` 中 `preset-paper-patent-scout` 与 `paper-patent-scout` 均 active、无 failed，且工具包安装结果不含 `Unknown agent preset` |
| AC-2b | 反向验证：先装工具包（或工具包单独安装）必须失败并给出 `Unknown agent preset`，证明拆包是必要约束而非猜测 |
| AC-3 | 新会话工具目录出现 `paper_patent_scout`，参数只需 `description` + `prompt` |
| AC-4 | 冒烟任务（酒店服务机器人）返回 `STATUS:` 摘要，产出 7 个文件，`evidence.md` 首行为 STATUS |
| AC-5 | 冒烟产出中 `papers.json` + `patents.json` 条数与 `evidence.md` 表格行数一致，且每条都有 `url`/`relevance`/`evidence_level` |
| AC-6 | 随机构造一个不存在的 DOI/专利号，抽查产出中不存在该编号（不编造） |
| AC-7 | 缺失 `topic` 的任务返回 `NEED_INPUT` 且不创建输出目录 |
| AC-8 | 极窄主题（如"某虚构方法 2025 年唯一论文"）返回 `INSUFFICIENT` 或 `PARTIAL`，不得硬凑 DONE |
| AC-9 | 反序 `remove_bundle`（先工具包、后 preset 包）后工具与 preset 消失，profile 恢复 |
| AC-10 | persona 与产物语言跟随 mission；中文任务产出中文台账 |
| AC-11 | `node scripts/check-output.mjs <输出目录>` 对任意 P1–P3 产物退出码 0（状态行一致、表行数 = 记录数、bib/CSV/`counts.included` 一致、必填字段齐全且无额外键） |

## 7. 风险

| 风险 | 影响 | 缓解 |
| --- | --- | --- |
| 无专利 API，Google Patents 依赖 `read_page` | 专利覆盖不全 | 多检索式 + 备选源；局限写进 `run.json` |
| AI4Scholar 计费 | 预算不可控 | 首尾查余额、写入 `run.json`；工具调用上限 40 |
| 子代理"看起来完整"但漏标证据等级 | 质量下滑 | 自检清单 + 验收 AC-5/AC-6 |
| 两包安装顺序被用户颠倒 | 工具行激活失败 | 工具包 README + 本 spec AC-2b + `verify.mjs` 拆包检查 |
| 热加载与重启的加载顺序差异 | 重启后工具行可能失效 | `docs/install.md` 要求重启复查；启动顺序由 `dsh.profile.bundles` 保证 |
| persona 太长挤占子上下文 | 检索轮次减少 | persona 只保留纪律与契约，细节放 docs/playbook |

## 8. 变更记录

| 版本 | 日期 | 变更 |
| --- | --- | --- |
| v0.1 | 2026-10-21 | 首版：preset + host-level 工具、7 文件输出契约、免费专利通道 |
| v0.2 | 2026-10-21 | 拆成 preset 包与工具包按序安装：实测同事务插入触达 `Unknown agent preset`；新增 AC-2/AC-2b |
| v0.3 | 2026-10-21 | 新增 `scripts/check-output.mjs` 产物校验器（S1 机器化）与 AC-11；安装文档第 5 步改用校验器判定 |
