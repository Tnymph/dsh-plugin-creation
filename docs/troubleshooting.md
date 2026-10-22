# 故障排查

## 安装

| 现象 | 原因 | 处置 |
| --- | --- | --- |
| `Unknown agent preset: paper-patent-scout` | 工具 bundle 先于 preset bundle 安装，或 preset bundle 未激活 | 先装 `bundles/paper-patent-scout`，确认 `preset-paper-patent-scout` active，再装 `bundles/paper-patent-scout-tool`；顺序不可颠倒 |
| 两个 bundle 装进一个包 | 同事务插入 preset 行 + 工具行会触发上述校验失败 | 本项目已固定拆包；不要手工合并 `cordis.patch.yml` |
| `already-installed` | 同名 bundle 已在 profile 中 | 先 `remove_bundle`（工具包在先），再 `install_bundle`；或 bump 版本 |
| 版本预检失败 | bundle `package.json` 写了 `engines.dsh` / `peerDependencies` 且不满足 | 删除这两个字段（本项目刻意不写） |
| 安装后看不到 `paper_patent_scout` | ①工具 bundle 未启用 ②工具行加载失败 ③本会话是热加载、未见新工具 | 依次查 `list_bundles` → `list_plugins` 的 `fiberPhase` → 日志中 `agentPreset` 报错；仍无则重启 DSH 后复查 |
| `Config schema error` / 字段不识别 | 某插件配置字段名写错 | 对照 `docs/architecture.md` 与各包 README；`list_plugins` 会显示 failed 行 |

## 运行

| 现象 | 原因 | 处置 |
| --- | --- | --- |
| 子代理不会写文件 | preset 缺 `tool-fs` | 检查 preset `plugins` 列表 |
| 子代理搜不到论文 | AI4Scholar 未挂载/额度耗尽/未配凭证 | 新会话里直接调 `search_papers` 看是否可用；查 `get_ai4scholar_credits` |
| 工具返回 `AI4Scholar API key is not configured` | 本部署没配 AI4Scholar 凭证（已实测）：计费平台通道（Semantic Scholar / PubMed / Google Scholar、`get_ai4scholar_credits`）不可用；但免费路由仍可用——`search_arxiv` 可直接用，`search_papers` 显式限 `sources: ["arxiv"]` 也能返回真实结果，DOI 与 web 通道不受影响 | 配 key：Web UI → Settings → Plugins → AI4Scholar，或 `AI4SCHOLAR_API_KEY` 写入 `$DSH_HOME/.credentials.yaml`；不配也能用免费通道（arXiv + Google Patents），此时 `STATUS` 多为 `PARTIAL`，`limitations` 必须写明 "论文证据仅来自 arXiv" |
| 专利检索全是 C 级证据 | `web_fetch` 对 patents.google.com `fetch failed`，且未改用 `read_page` | 这是已知现象：专利详情必须走 `read_page`；确认 persona 未被改坏 |
| `read_page` 返回空/超时 | 云端渲染偶发失败 | 重试 1 次；换 `web_search` 的 snippet，降 C 级并写局限 |
| Justia 403 / PatentGuru 468 | 反爬 | 不要硬攻，换源或降级 |
| STATUS 与实际不符 | 子代理覆盖度判断过乐观 | 复核 `run.json`.counts 与表格行数；必要时重跑并强调"不足即 PARTIAL" |
| 产出条数与表格不一致 | 子代理漏写/多写 | 属于质量缺陷：按 `tests/acceptance.md` S1 复验，修 persona 的输出契约措辞 |
| 上下文被长报告撑爆 | compaction 未生效 | 确认 preset compaction group 存在；必要时把全文读取上限降到 5 篇 |

## 开发

| 现象 | 处置 |
| --- | --- |
| `verify.mjs` 报 "cordis.patch.yml is stale" | 跑 `node scripts/build.mjs`（它同时生成两个包） |
| `verify.mjs` 报 "preset patch contains the tool row" | 工具行必须在 `tool.patch.template.yml`，preset 模板只放 preset 行 |
| `verify.mjs` 报 persona 缺 key | 补齐 persona 对应章节，不要绕过检查 |
| `node --test` 报 `ERR_MODULE_NOT_FOUND` | 在仓库根目录运行 `node --test`；不要传 `tests/` 目录参数 |
| 受限沙箱里 `node --test` 报 `spawn EPERM` | 该沙箱禁止 fork 子进程；改用 `node tests/project.test.mjs` 直接运行，得到与 `node --test` 相同的用例结果（测试内容全绿即通过，运行器限制属环境问题） |
| 受限沙箱里 `node scripts/build.mjs` 报 `EPERM ... open 'bundles\\...'`（errno -4048） | 该沙箱禁止写 `bundles/`；build 需在有写权限的会话执行。无写权限时用 `node scripts/verify.mjs` 证明“生成物与人格不漂移” |
| 没有 git 可看 diff | 本目录未初始化 git；改动核对用 `verify.mjs` + 文件级清单（`tests/acceptance-log.md` 记录） |
| YAML 缩进错误导致插件不加载 | 用模板 + `build.mjs` 生成，不要手写 patch |

## 回滚（反序）

```
plugin_manager({ action: "remove_bundle", target: "dsh-paper-patent-scout-tool" })
plugin_manager({ action: "remove_bundle", target: "dsh-paper-patent-scout" })
```

如需彻底清理 profile 手工改动：检查 `C:\Users\t_nym\.dsh\profiles\desktop\package.json` 的 `dsh.profile.bundles` 与 `cordis.patch.yml`，删除对应行（本项目只通过 `install_bundle` 写入，正常卸载无需手改）。
