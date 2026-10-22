# dsh-ppt-maker（bundle 1/2 · preset）

第 1 个 bundle：演示文稿制作子代理 `ppt-maker` 的 Agent preset（人格 + fs/web/compaction/todo）。

## 前置条件

- 已启用 `dsh-ppt` 插件（`ppt_themes` / `ppt_templates` / `ppt_create` / `ppt_edit` / `ppt_check` / `ppt_render` / `ppt_undo`）。这些工具是宿主级挂载，本 preset 不重复声明；缺失时子代理会回 `FAILED` 并说明。
- 先安装本 bundle，再安装 `bundles/ppt-maker-tool`。工具行在加载时校验 `agentPreset`，preset 必须由更早的 patch 事务声明，否则报 `Unknown agent preset: ppt-maker`。

## 安装

```
plugin_manager({ action: "install_bundle", target: "<repo>\\bundles\\ppt-maker" })
plugin_manager({ action: "install_bundle", target: "<repo>\\bundles\\ppt-maker-tool" })
```

安装后在新会话看工具目录，应出现 `ppt_maker`。

## 卸载

先卸工具包，再卸本包：

```
plugin_manager({ action: "remove_bundle", target: "dsh-ppt-maker-tool" })
plugin_manager({ action: "remove_bundle", target: "dsh-ppt-maker" })
```

`cordis.patch.yml` 由 `../../scripts/build.mjs` 生成，不要手改；改人格后重新 build + verify。
