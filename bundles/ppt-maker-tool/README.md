# dsh-ppt-maker-tool（bundle 2/2 · tool）

第 2 个 bundle：宿主级委派工具 `ppt_maker`（`@deepseek-ai/dsh-tool-subagent`，`agentPreset: ppt-maker`，`maxDepth: 1`）。

## 前置条件

- `bundles/ppt-maker` 已安装并激活；
- 宿主已启用 `dsh-ppt` 插件（工具链由子代理继承）。

## 安装

```
plugin_manager({ action: "install_bundle", target: "<repo>\\bundles\\ppt-maker-tool" })
```

成功后任意会话可用：

```
ppt_maker({
  description: "答辩 PPT：固态电池热失控预警",
  prompt: "做一份 12 页中文答辩 PPT，听众是评委，必须覆盖 ……，素材在 materials/，输出到 out/defense-thermal/，需要讲者备注与 PDF 目检。"
})
```

## 卸载

本包必须先于 preset 包卸载；否则工具行会指向已消失的 preset。

```
plugin_manager({ action: "remove_bundle", target: "dsh-ppt-maker-tool" })
plugin_manager({ action: "remove_bundle", target: "dsh-ppt-maker" })
```

`cordis.patch.yml` 由 `../../scripts/build.mjs` 生成，不要手改。
