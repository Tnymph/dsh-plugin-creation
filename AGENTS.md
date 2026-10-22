# AGENTS.md · 在本仓库工作的规则

本仓库是 **DSH 子代理模式工厂**：`modes/` 存模式源（人格 + 契约），`bundles/` 存可安装的声明式部署包，`scripts/` 负责生成与校验。

## 唯一需求来源

`需求文档.md` 是需求的唯一来源。需求、spec、人格、实现冲突时：**先改需求文档，再改 spec，再改实现**。不允许"代码先行、文档后补"。

## 目录职责

| 路径 | 职责 | 谁写 |
| --- | --- | --- |
| `modes/<mode>/persona.md` | 子代理人格与工作契约 | 人 |
| `modes/<mode>/preset.patch.template.yml` | preset 层部署模板（含 `{{PERSONA_BLOCK}}`） | 人 |
| `modes/<mode>/tool.patch.template.yml` | 委派工具层部署模板（含 `{{TOOL_NAME}}`） | 人 |
| `bundles/<mode>/cordis.patch.yml` | **生成物**，禁止手改 | `scripts/build.mjs` |
| `bundles/<mode>/package.json` | bundle 清单（preset 包） | 人 |
| `bundles/<mode>-tool/` | 工具包（清单 + 生成的 patch） | 人 / `scripts/build.mjs` |
| `schema/` | 产出记录的结构定义（当前：`output.schema.json` 检索、`ppt-output.schema.json` PPT） | 人 |
| `specs/` | 每个模式的可验收 spec | 人 |
| `docs/` | 架构、检索手册、安装、排障 | 人 |
| `tests/` | 契约测试与在线验收用例/记录（两模式共享 `project.test.mjs`，校验器各有测试与夹具） | 人 |
| `scripts/` | build / verify / check-output / check-ppt-output / new-mode | 人 |

## 必须遵守

1. **先写失败测试，再改实现。** 改 bundle、脚本或 schema 时，先在 `tests/project.test.mjs` 或新增测试里写会失败的断言，跑出红色，再实现到绿色。测试文件本身可直接改。
2. **人格与部署不漂移。** 改 `persona.md` 后必须跑 `node scripts/build.mjs`；`verify.mjs` 会拦不同步。
3. **不写空占位。** 不提交未完成的占位标记（常见占位写法由 `verify.mjs` 扫描），也不声明未实现的文件。
4. **bundle 清单保持最小。** 不写 `engines.dsh`、`peerDependencies`、`dependencies`（本地目录安装的版本预检会读取本清单，多余约束会挡住安装）；bundle 内不放运行时代码与 `postinstall`。
5. **顺序敏感。** patch 里 preset 行必须在工具行之前；工具行的 `agentPreset` 必须等于 preset 的 `config.id`。
6. **不在人格里塞实现细节。** persona 只写身份、纪律、SOP、输出契约与自检；细节放 `docs/retrieval-playbook.md`。
7. **不编造检索结果。** 示例与验收记录里的论文/专利编号要么是真实返回，要么明确标注"演示格式，不代表真实结果"。
8. **安装是显式动作。** 不自动改用户 profile；安装/卸载通过 `plugin_manager`，步骤写进 `docs/install.md`。
9. **写入仓库外需白名单 + 备份 + 记录。** 本仓库默认只写自身目录；`scout-output/` 属于运行产物，可随时删除。
10. **无密钥。** 不提交任何 API key、cookie、token；AI4Scholar 凭证由 DSH 插件管理。

## 提交前门禁

```powershell
node scripts/build.mjs
node scripts/verify.mjs
node --test
```

三者全绿才算完成。在线验收按 `tests/acceptance.md` 执行，结果追加到 `tests/acceptance-log.md`。

> 受限沙箱的降级取证：若会话禁止 `spawn` 子进程，`node --test` 会报 `spawn EPERM`，改用 `node tests/project.test.mjs`；若禁止写 `bundles/`，`build.mjs` 会报 `EPERM`，改由有写权限的会话执行 build。降级只能在记录中如实标注“环境限制”，不得把未执行的命令写成通过（详见 `docs/troubleshooting.md`）。

## 每轮结束前的自检（模仿 ZcodeSubAgentMaker 的纪律）

1. 是否回答了用户最初那句话？有没有偷换目标？
2. 有没有自相矛盾或过度承诺（例如声称"已安装"但没跑 `install_bundle`）？
3. 安全/权限/隐私/合规风险：有没有越界写、外部暴露关键词、未标注的版权内容？
4. 验收证据是否可执行（命令、输出、文件路径）？
5. 哪些是事实（工具返回），哪些是假设？假设是否已标注？
6. 能修的当场修；修不了的写进"剩余缺口与风险"，并给出默认建议。
