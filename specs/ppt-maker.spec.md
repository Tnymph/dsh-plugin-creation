# ppt-maker · 验收 spec

版本：v0.1　日期：2026-10-23　状态：离线门禁通过（23/23、17/17），两个 bundle 已安装，冒烟通过（PARTIAL：1 个图片 placeholder），PP-1…PP-5 待执行

## 目标

交付 `ppt-maker` 演示文稿制作子代理模式（preset `ppt-maker` + 工具 `ppt_maker`），把 brief 变成可放映、可编辑、可目检的三件套，并保证：

- 讲者备注逐页强制；
- 图片只来自用户、必须可替换、禁止自行生成图片；
- 缺关键素材时回 `NEED_INPUT` 并列出结构化请求，不硬做、不编造。

## 验收标准

| ID | 标准 | 验证方式 |
| --- | --- | --- |
| AC-1 | 仓库门禁全绿：`node scripts/build.mjs`、`node scripts/verify.mjs`、`node --test` | 命令输出 |
| AC-2 | 两个 bundle 按序安装后 `list_bundles` 含 `dsh-ppt-maker` 与 `dsh-ppt-maker-tool`，`list_plugins` 中 `preset-ppt-maker`、`ppt-maker` 均 active，无 `Unknown agent preset` | `plugin_manager` 返回 |
| AC-2b | 反证：单独安装工具包（不先装 preset）必须报 `Unknown agent preset: ppt-maker` | 独立会话实测 |
| AC-3 | 新会话工具目录出现 `ppt_maker`；DSH 重启后仍可见 | 会话 + 重启 |
| AC-4 | P1 标准答辩：12 页左右、听众评委、每页备注 ≥ 60 字、`ppt_check` 0 error、`ppt_render` 目检通过 | 真实调用 + 产物 |
| AC-5 | P2 品牌路演：brief 给品牌色/logo 时生效；图片槽位登记为 provided | 产物 `deck.json` / `MANIFEST.md` |
| AC-6 | P3 缺关键信息（“做个 AI 的 PPT”）：返回 `NEED_INPUT` + `requests.md`，不生成 deck | 产物目录 + 校验器 |
| AC-7 | N1 非目标：要求编造 2026 市场数据 → 拒绝编造，给出 `NEED_INPUT`/`PARTIAL` 与来源缺口 | 对话记录 |
| AC-8 | S1 结构：9 个必需文件齐全；`node scripts/check-ppt-output.mjs out/<slug>` 退出码 0 | 校验器 |
| AC-9 | 图片可替换：用户覆盖 `assets/<slot>.png` 后跑 `revise`，`MANIFEST.md` 变 provided，`ppt_check` 仍 0 error | 二次调用 |
| AC-10 | 卸载顺序：先卸 `dsh-ppt-maker-tool` 再卸 `dsh-ppt-maker`，无残留；按序重装后工具仍可见 | `plugin_manager` + 新会话 |
| AC-11 | 人格禁止生成图片：persona 含 `sci_draw` 禁令与 `assets/MANIFEST.md` 槽位规则；产物 `assets/` 无未登记文件（校验器拦截） | `verify.mjs` + 校验器 |

## 非目标

- 不做自由设计稿/手绘报（版式由主题与模板决定）；
- 不做在线协作、云存储、自动邮件分发；
- 不替用户生成事实性图片、截图、证书、客户 logo；
- 不默认联网检索；需要时由 brief 显式打开；
- 不自动安装到 profile（安装是显式动作）。

## 风险

| 风险 | 说明 | 缓解 |
| --- | --- | --- |
| `dsh-ppt` 未启用 | 宿主级工具缺失，子代理无法生成 | 人格返回 `FAILED` 并说明；install.md 列为前置条件 |
| `deck.json` 格式随插件升级变化 | 校验器按 `slides[].notes` 与 `assets/` 约定检查，字段名变化会误报 | 升级后先跑 P1 冒烟与校验器，再改 schema/validator |
| 图片被替换后未跑 revise | `MANIFEST` 仍 placeholder 但文件已在 | 校验器报错提示跑 revise |
| 备注质量 | 校验器只查长度，不查内容质量 | 人格给出备注四要素；在线验收人工抽查 |
| 长文档转 PPT 页数失控 | 内容多、页数少导致溢出 | 人格要求提前规划并在 `ppt_check` 后拆页 |
