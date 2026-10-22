# 交付报告：接受 PR（CONTRIBUTING + PR 模板 + 仓库设置）

> 结论：**green**（目标、范围、验收标准、失败模式逐项有工具证据）
>
> 说明：本报告由 `doublecheck_report` 汇总生成（spec 已记录于会话），其内置的“按维度并行 checker”工作流在本会话不可用（返回 `Verification: Not run`），因此每个维度的证据改由主代理用真实工具逐项复核，命令与返回值记录在下表。

## 1. 目标

让「dsh插件创作」仓库明确“接受外部 PR”：新增贡献指南与 PR 模板、在 README 声明，并把 GitHub 仓库设置为接受 PR 的合理形态（Issues/Discussions 开启、squash 合并、合并后删分支），全部有可复核证据。

## 2. 范围

- 仓库内：`CONTRIBUTING.md`、`.github/PULL_REQUEST_TEMPLATE.md`、`README.md` 项目状态段、`scripts/verify.mjs` 清单、`tests/project.test.mjs` 契约用例。
- 仓库外：GitHub Issues / Discussions / 合并策略 / 删除分支设置、仓库描述。
- 不涉及：CI 工作流、CLA/DCO、模式人格与 bundle 内容、检索验收结论。

## 3. 验收标准与证据

| # | 标准 | 证据（真实返回） |
| --- | --- | --- |
| 1 | CONTRIBUTING.md 写明接受 PR、无 SLA、门禁、生成物、密钥、MIT | 远端 `contents/CONTRIBUTING.md` → `{"name":"CONTRIBUTING.md","path":"CONTRIBUTING.md","size":3853}`；本地 `tests/project.test.mjs` 断言 8 个关键词与“禁止/不允许”措辞 |
| 2 | PR 模板含门禁、生成物、密钥、动机与验收证据 | 远端 `contents/.github/PULL_REQUEST_TEMPLATE.md` → `{"name":"PULL_REQUEST_TEMPLATE.md","size":1118}`；测试断言 `verify.mjs`/生成物/密钥/动机/验收 |
| 3 | README 声明“接受 PR，无 SLA”并链接 CONTRIBUTING.md | 远端 README raw 行：`**接受 PR（无 SLA）**…见 [CONTRIBUTING.md](CONTRIBUTING.md)` |
| 4 | verify 清单覆盖两个新文件；测试先红后绿 | 红：`not ok 10 - contributing contract … ENOENT CONTRIBUTING.md`；绿：`13/13 checks passed`、`# tests 11 / # pass 11 / # fail 0` |
| 5 | GitHub 设置：Issues/Discussions 开、squash 开、merge/rebase 关、合并删分支 | `gh api repos/Tnymph/dsh-plugin-creation` → `{"has_issues":true,"has_discussions":true,"allow_squash_merge":true,"allow_merge_commit":false,"allow_rebase_merge":false,"delete_branch_on_merge":true,"visibility":"public","license":"MIT"}`；GraphQL 复核 Discussions 已启用且有 6 个分类 |
| 6 | 门禁全绿、提交并推送、远端可见新文件 | `node scripts/verify.mjs` 13/13；`node --test` 11/11；远端 `main` = `e239008`；`git status -sb` 无未提交改动 |

## 4. 失败模式与处置

| 失败模式 | 处置 | 证据 |
| --- | --- | --- |
| 把“接受 PR”写成有 SLA 的承诺 | README 与 CONTRIBUTING 均显式“无 SLA”，测试锁 `无 SLA` 措辞 | 测试用例 + 远端 README 行 |
| 模板指导与 AGENTS.md 冲突（允许手改生成物） | CONTRIBUTING 明确生成物只能由 `build.mjs` 生成；`verify.mjs` 有 patch 同步检查 | `verify.mjs` 13/13 |
| 设置调整误关 Issues/Discussions | 改前读取、改后 `gh api` 逐项复核两次 | 见上表第 5 行 |
| 新文档触发占位词扫描 | 新文档不含占位写法；`verify.mjs` 占位检查 PASS | `PASS no unfinished placeholders` |
| 推送被镜像代理拦截 | 直连 `github.com:443` 变超时后，`origin` 改为镜像代理 + 一次性 `Authorization` 头；令牌不落盘 | `b2ce505..e455b0d`、`e455b0d..e239008` 推送成功 |

## 5. 测试时间线（红 → 绿）

1. 红：新增 contributing 契约用例 → `not ok 10`，`ENOENT …CONTRIBUTING.md`。
2. 实现：写入 CONTRIBUTING.md、PR 模板、README 声明、verify 清单。
3. 绿：`node scripts/verify.mjs` → `13/13 checks passed`；`node --test` → `# tests 11 / # pass 11 / # fail 0`。

## 6. 对抗性复核（主代理自审）

- 反对意见 1：“README 只是加了一行，贡献者仍不知道该做什么。” → 已提供 `CONTRIBUTING.md` 全流程 + PR 模板必填项，两条路径都可点开。
- 反对意见 2：“设置了 Discussions 但没分类，等于空壳。” → GraphQL 复核已有 6 个默认分类（Announcements/General/Ideas/Polls/Q&A/Show and tell）。
- 反对意见 3：“关掉 merge commit/rebase 会挡住贡献者。” → 与“历史线性 + squash 合并”一致，且 PR 模板已写明合并方式；如需改动，维护者可随时在设置页恢复。
- 反对意见 4：“无 SLA 与‘接受 PR’自相矛盾。” → 不矛盾：接受提交与承诺响应时限是两件事，文档两处都写清。

## 7. 未覆盖项

- `doublecheck_report` 的按维度并行 checker 未执行（工作流 seam 不可用），已用上表的人工工具复核替代；不声称该 checker 已运行。
- 未创建 GitHub Actions / CI；按非目标，不做。
