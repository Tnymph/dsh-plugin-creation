# dsh-paper-patent-scout-tool（bundle 2/2 · tool）

这是**两个 bundle 配对交付**中的第 2 个：安装后提供宿主级委派工具 **`paper_patent_scout`**（`@deepseek-ai/dsh-tool-subagent`，provider `spawn`，`agentPreset: paper-patent-scout`，`maxDepth: 1`），任何会话都能直接调用该模式。

它不包含 preset 声明。**前置条件**：`../paper-patent-scout`（bundle 1）已安装 —— 工具行在加载时校验 `agentPreset`，preset 必须在更早的 patch 事务里声明，否则激活报 `Unknown agent preset: paper-patent-scout`。

## 内容

| 文件 | 作用 |
| --- | --- |
| `package.json` | bundle 清单；`dsh.bundle.patch` 指向 `./cordis.patch.yml` |
| `cordis.patch.yml` | 单个 insert：`paper-patent-scout`（工具行） |

`cordis.patch.yml` 由 `../../scripts/build.mjs` 从 `../../modes/paper-patent-scout/tool.patch.template.yml` 生成，不要手改。

## 安装（第 2 步）

前提是 bundle 1 已安装并已激活（`list_plugins` 能看到 `preset-paper-patent-scout`）：

```
plugin_manager({ action: "install_bundle", target: "E:\\VibeCoding\\dshMaker\\bundles\\paper-patent-scout-tool" })
```

安装结果中不应出现 `Unknown agent preset`；`list_plugins` 应出现 `paper-patent-scout`（tool-subagent 行）。完整步骤见 `../../docs/install.md`。

## 卸载（先卸本 bundle）

```
plugin_manager({ action: "remove_bundle", target: "dsh-paper-patent-scout-tool" })
```

## 失败时的处理

- 报 `Unknown agent preset: paper-patent-scout`：bundle 1 未安装，或安装顺序反了。先装 bundle 1，再重装本 bundle。
- 想确认已激活哪些行：`plugin_manager({ action: "list_plugins", target: "paper-patent-scout" })`。

## 约束

- 不声明 `engines.dsh` / `peerDependencies`：本地目录安装的版本预检会读取本清单，多余约束只会挡住安装。
- 不含运行时代码与安装脚本，纯声明式 patch。
