# Pull Request

## 这个 PR 做了什么

<!-- 一两句说清改动与动机；关联 Issue 写 `Closes #123` -->

## 改动范围

- [ ] 模式人格 / patch 模板（`modes/`）
- [ ] bundle 清单（`bundles/*/package.json`、`README.md`）
- [ ] 脚本 / 测试 / schema（`scripts/`、`tests/`、`schema/`）
- [ ] 文档（`README.md`、`docs/`、`examples/`）

## 门禁结果（必填）

- [ ] 已运行 `node scripts/build.mjs`（或说明本次改动为何不需要重新生成）
- [ ] `node scripts/verify.mjs` 通过，末行输出：`______`
- [ ] `node --test` 通过，输出：`# pass __ / # fail __`
- [ ] 若为受限会话：已写明无法执行的命令、报错原文与替代证据（见 `docs/troubleshooting.md`）

## 生成物与密钥（必填）

- [ ] 未手改 `bundles/*/cordis.patch.yml`（该文件由 `build.mjs` 生成）
- [ ] 未提交任何密钥、token、cookie 或凭据文件

## 动机与验收证据

- 为什么改：
- 怎么验证（命令 / 输出 / 产物路径）：

## 许可

- [ ] 我同意以 MIT 许可发布本贡献（入站=出站，无需 CLA / DCO）
