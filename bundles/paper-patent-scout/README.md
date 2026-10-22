# dsh-paper-patent-scout（bundle 1/2 · preset）

这是一个**两个 bundle 配对交付**中的第 1 个：安装后提供 **Agent preset `paper-patent-scout`**（专精论文与专利检索的子代理人格与工具集：persona、time-context、fs、web、compaction、todo）。

第 2 个 bundle 是 `../paper-patent-scout-tool`，提供宿主级委派工具 `paper_patent_scout`。**必须先安装本 bundle，再安装工具 bundle**：工具行在加载时校验 `agentPreset`，只能看到上一个 patch 事务已经声明的 preset；同一事务里插入 preset 行 + 工具行会失败并报 `Unknown agent preset: paper-patent-scout`。

## 内容

| 文件 | 作用 |
| --- | --- |
| `package.json` | bundle 清单；`dsh.bundle.patch` 指向 `./cordis.patch.yml` |
| `cordis.patch.yml` | 单个 insert：`preset-paper-patent-scout`（preset 行） |

`cordis.patch.yml` 由 `../../scripts/build.mjs` 从 `../../modes/paper-patent-scout/persona.md` 与 `preset.patch.template.yml` 生成，不要手改；改 persona 后重新生成。

## 安装（第 1 步）

在 Harness 中用 plugin_manager：

```
plugin_manager({ action: "install_bundle", target: "E:\\VibeCoding\\dshMaker\\bundles\\paper-patent-scout" })
```

然后安装第 2 个 bundle：

```
plugin_manager({ action: "install_bundle", target: "E:\\VibeCoding\\dshMaker\\bundles\\paper-patent-scout-tool" })
```

安装完成后新会话即可使用 `paper_patent_scout`。完整步骤、验证与回滚顺序见 `../../docs/install.md`。

## 卸载（顺序相反）

先卸工具 bundle，再卸 preset bundle：

```
plugin_manager({ action: "remove_bundle", target: "dsh-paper-patent-scout-tool" })
plugin_manager({ action: "remove_bundle", target: "dsh-paper-patent-scout" })
```

## 约束

- 不声明 `engines.dsh` / `peerDependencies`：本地目录安装时版本预检会读取本清单，多余的版本约束只会挡住安装。
- 不含运行时代码，纯声明式 patch，安装即生效、卸载即回退。
