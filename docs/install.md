# 安装与验证（两个 bundle，按序安装）

前置：DeepSeek Harness（本机 Desktop 版，GUI `http://127.0.0.1:64535`），profile `desktop`，对本机有写权限、已允许插件安装（`plugin_manager` 安装动作需要 danger-full-access 或批准）。

> **顺序是硬约束**：先装 preset bundle，再装工具 bundle。
> 工具行在加载时校验 `agentPreset`，而同一 patch 事务里插入的 preset 行对这次校验不可见。实测把两行写进一个包（或一个包里的两次 insert）都会报
> `RemoteError: Unknown agent preset: paper-patent-scout`。

## 1. 构建（改过 persona 后必须执行）

```powershell
cd E:\VibeCoding\dshMaker
node scripts/build.mjs      # 生成 bundles/paper-patent-scout/cordis.patch.yml 与 bundles/paper-patent-scout-tool/cordis.patch.yml
node scripts/verify.mjs     # 契约门禁，全部 PASS 才继续
```

## 2. 安装第 1 个 bundle（preset）

在 Harness 会话里：

```
plugin_manager({ action: "install_bundle", target: "E:\\VibeCoding\\dshMaker\\bundles\\paper-patent-scout" })
```

或 CLI：

```powershell
dsh plugin --profile desktop add file:E:\VibeCoding\dshMaker\bundles\paper-patent-scout
```

期望：`stage: enable`、`application: applied`，`list_bundles` 出现 `dsh-paper-patent-scout`，`list_plugins` 出现 active 的 `preset-paper-patent-scout`。

## 3. 安装第 2 个 bundle（宿主委派工具）

确认第 1 步已激活后，再装：

```
plugin_manager({ action: "install_bundle", target: "E:\\VibeCoding\\dshMaker\\bundles\\paper-patent-scout-tool" })
```

或 CLI：

```powershell
dsh plugin --profile desktop add file:E:\VibeCoding\dshMaker\bundles\paper-patent-scout-tool
```

期望：`application: applied`，且**没有** `Unknown agent preset` 字样；`list_plugins` 出现 active 的 `paper-patent-scout`（`@deepseek-ai/dsh-tool-subagent` 行）。

如果这里报 `Unknown agent preset: paper-patent-scout`：说明 preset bundle 没装或没激活。回到第 2 步重装，再重试本步；不要跳过顺序。

## 4. 验证安装（三层）

1. **bundle 层**
   ```
   plugin_manager({ action: "list_bundles" })
   ```
   期望两个包都在：`dsh-paper-patent-scout`、`dsh-paper-patent-scout-tool`。

2. **插件层**
   ```
   plugin_manager({ action: "list_plugins" })
   ```
   期望：
   - `preset-paper-patent-scout` 启用/active；
   - `paper-patent-scout`（tool-subagent 行）active；
   - 两者都没有 `fiberPhase: failed`。

3. **工具层**
   新开一个会话看工具目录，期望出现 `paper_patent_scout`（描述里带 `paper-patent-scout` 模式）。

安装完成后**建议重启 DSH 一次**：两包的启动顺序由 profile `package.json` 的 `dsh.profile.bundles` 数组保证（preset 包在前），但热加载路径与重启路径是两条代码路径，重启后应复查第 4 步。

## 5. 冒烟调用（一次真实检索）

在新会话里调用：

```
paper_patent_scout({
  description: "smoke: hotel service robot",
  prompt: "检索 2020 年以来酒店服务机器人（hotel service robot / delivery robot）相关论文与专利，论文 8 条、专利 3 条，输出到 scout-output/paper-patent-scout-smoke/，中文产出。"
})
```

期望：

- 子代理返回含 `STATUS:` 的摘要；
- `scout-output/paper-patent-scout-smoke/` 下出现 7 个文件；
- `evidence.md` 首行是 `STATUS: …`，表格行数与两个 JSON 一致；
- `node scripts/check-output.mjs scout-output/paper-patent-scout-smoke` 退出码 0（机器校验：状态行、表格行、bib 条数、CSV 行数、`counts.included`、必填字段与额外键）；
- 没有凭记忆补全的 DOI / 专利号。

## 6. 升级

改 `modes/paper-patent-scout/persona.md` 或两个模板 → `node scripts/build.mjs` → `node scripts/verify.mjs` → 先卸工具包、再卸 preset 包，然后按第 2、3 步重装（同名包已存在时 `install_bundle` 会拒绝，需先 `remove_bundle`）。

## 7. 卸载与回退（顺序相反）

```
plugin_manager({ action: "remove_bundle", target: "dsh-paper-patent-scout-tool" })
plugin_manager({ action: "remove_bundle", target: "dsh-paper-patent-scout" })
```

先卸工具包，避免工具行指向已消失的 preset。卸载后 `paper_patent_scout` 工具与 `paper-patent-scout` preset 一并消失，profile 恢复到安装前状态。产物目录 `scout-output/` 不受影响，可手动保留或删除。

## 9. 第二个模式：ppt-maker（同一套顺序）

`ppt-maker` 与检索模式同构，也拆成两个 bundle。**前提**：宿主已启用 `dsh-ppt` 插件（`ppt_*` 工具）。安装顺序同样是 preset → tool：

```
plugin_manager({ action: "install_bundle", target: "E:\\VibeCoding\\dshMaker\\bundles\\ppt-maker" })
plugin_manager({ action: "install_bundle", target: "E:\\VibeCoding\\dshMaker\\bundles\\ppt-maker-tool" })
```

期望：`list_bundles` 含 `dsh-ppt-maker` 与 `dsh-ppt-maker-tool`；`list_plugins` 中 `preset-ppt-maker` 与 `ppt-maker` active；新会话工具目录出现 `ppt_maker`；没有 `Unknown agent preset`。

反序会报 `Unknown agent preset: ppt-maker`；卸载时先卸 `dsh-ppt-maker-tool`，再卸 `dsh-ppt-maker`。

冒烟调用（缺素材时应回 `NEED_INPUT`，有素材时生成三件套）：

```
ppt_maker({
  description: "smoke: 3 页答辩 PPT",
  prompt: "主题：固态电池热失控预警；场景：答辩；听众：评委；页数：3；语言：zh；必须覆盖：背景、方法、结论；素材：无；输出目录：out/ppt-smoke/；需要讲者备注与 PDF 目检。"
})
```

期望：缺素材时只写 `run.json`、`REPORT.md`、`requests.md`，返回 `STATUS: NEED_INPUT`；有素材时 `out/ppt-smoke/` 满足 9 文件契约，且

```
node scripts/check-ppt-output.mjs out/ppt-smoke
```

退出码 0（备注、状态一致性、MANIFEST 槽位、assets 未登记文件都会被检查）。

## 8. 安全检查清单

- [ ] 两个 `cordis.patch.yml` 与 `scripts/build.mjs` 输出一致（`verify.mjs` 会拦）
- [ ] preset 包内无工具行、工具包内无 preset 行（`verify.mjs` 与 `tests/project.test.mjs` 都会拦）
- [ ] bundle 内无 `postinstall`、无运行时代码
- [ ] 安装只改 profile，不改用户工作区
- [ ] 卸载后可复现回退
