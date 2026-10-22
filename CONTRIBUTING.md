# 贡献指南（CONTRIBUTING）

## 先说清楚：我们接受 PR，但不承诺时限

本仓库由 **DeepSeek 模型接管创作**，作者**不具备持续更新与维护能力**。因此：

- **接受 PR**：欢迎新模式、现有模式的改进、脚本与测试增强、文档与排障补充；合并后的代码同样以 MIT 开放。
- **审核与合并无 SLA**：维护者尽力而为，可能长期不回复，也可能直接合并或关闭；请勿把“已提交 PR”理解为“会被及时处理”。
- **不接受把项目改造成需要长期维护的形态**：CI 矩阵、发布流水线、自动发版、依赖机器人等，请先开 Issue 讨论，不要直接提 PR。

## 提交前必须通过的离线门禁

在仓库根目录执行：

```powershell
node scripts/build.mjs     # 由 modes/*/*.template.yml 重新生成 bundles/*/cordis.patch.yml
node scripts/verify.mjs    # 契约检查（当前 13 项：清单、bundle、patch 同步、人格、schema、文档、示例、脚手架、占位）
node --test                # 结构测试（含 check-output 校验器用例）
```

三条全绿才算可评审。**受限会话**（沙箱禁止 `spawn`、禁止写 `bundles/`）无法跑全量时，按 `docs/troubleshooting.md` 降级取证：

- `node tests/project.test.mjs`（不 spawn 子进程的结构测试）；
- `node scripts/verify.mjs`（只读检查，不需要写权限）；
- 在 PR 描述里写明**哪条命令无法执行、报错原文、替代证据**。禁止把未执行的命令写成通过。

## 硬性规则

1. **生成物禁止手改**：`bundles/*/cordis.patch.yml` 只能由 `node scripts/build.mjs` 从 `modes/*/*.template.yml` 生成；直接编辑会被 `verify.mjs` 的“patch 与模板同步”检查拦下。
2. **人格与部署不漂移**：改 `modes/<mode>/persona.md` 后必须重跑 `build.mjs`。
3. **不写空占位**：不提交未完成的段落或未实现的文件声明（占位写法由 `verify.mjs` 扫描）。
4. **密钥零容忍**：禁止提交任何 API key、token、cookie、`.credentials.yaml` 或抓包内容；AI4Scholar 凭证由 DSH 插件管理，仓库内只写变量名。
5. **不编造检索结果**：示例与验收记录里的论文/专利编号必须来自真实工具返回，或明确标注“演示格式，不代表真实结果”。
6. **顺序敏感**：preset 行必须在工具行之前，工具行的 `agentPreset` 必须等于 preset 的 `config.id`；本项目固定两个 bundle 按序安装，请勿合并回一个包（原因见 `docs/architecture.md` 的实测证据）。
7. **一个 PR 只做一件事**：不要把格式化、重命名与功能改动混在一起，便于逐项复核。

## PR 流程

1. Fork 仓库，新建分支：`feat/<slug>`、`fix/<slug>`、`docs/<slug>`。
2. 按 `.github/PULL_REQUEST_TEMPLATE.md` 填写：动机、改动范围、门禁结果、验收证据。
3. 推送后在 PR 里贴上 `verify.mjs` 与 `node --test` 的末行输出。
4. 合并方式：**Squash merge**；合并后自动删除分支，历史保持线性。

## 许可

**MIT 入站=出站**：提交 PR 即表示你同意以 MIT 许可发布你的贡献。不需要 CLA，也不需要 DCO `Signed-off-by`。

## 沟通渠道

- **Issues**：bug、安装失败、检索质量问题。检索类问题请附 `run.json` 的 `limitations` 与 `search-log.md` 片段（先脱敏，勿贴密钥）。
- **Discussions**：想法、模式需求、用法讨论。
- 审核无 SLA；请勿重复催更或 @ 维护者。

## 本地开发速览

- 新增模式：`node scripts/new-mode.mjs <mode-id>`，生成 `modes/<id>/` 三件套与 `bundles/<id>/`、`bundles/<id>-tool/` 两套清单。
- 目录职责与提交纪律：见 `AGENTS.md`。
- 当前模式、安装顺序与验收状态：见 `README.md` 与 `tests/acceptance-log.md`。
