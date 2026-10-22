# 示例 4：演示文稿（ppt_maker）

## 场景

课题组的论文要投会议，需要一份 12 页中文答辩 PPT，听众是评委，素材是实验结果 CSV、两张架构图与实验室 logo。

## 调用

```
ppt_maker({
  description: "答辩 PPT：固态电池热失控预警",
  prompt: [
    "主题：固态电池热失控早期预警方法",
    "场景：答辩；听众：评委；时长：12 分钟；页数：12；语言：zh",
    "视觉主题：data；品牌：主色 #0B5FFF，logo 在 materials/logo.png，页脚「XX 实验室」",
    "必须覆盖：研究背景、传感方案、特征提取、预警决策、实验对比（误报率/检测延迟）、结论与展望",
    "素材：materials/metrics.csv（实验数据）、materials/fig-architecture.png（架构图）、materials/logo.png",
    "禁止内容：不出现未发表的数据；不要编造对比方法",
    "联网检索：不允许",
    "输出目录：out/defense-thermal/",
    "需要：每页讲者备注、PDF 目检；图片必须可替换"
  ].join("\n")
})
```

## 期望产出

`out/defense-thermal/` 下：

- `deck.pptx`、`deck.html`、`deck.json`
- `outline.md`（每页标题 + 要点 + 来源）
- `notes.md`（12 段讲者备注，每段 ≥ 60 字）
- `sources.md`（实验数据来自 CSV 的列与行；架构图来自用户素材）
- `assets/MANIFEST.md`（架构图 provided；logo provided）
- `run.json`、`REPORT.md`（首行 `STATUS: DONE`）

返回摘要形如：

```
STATUS: DONE
页数: 12（答辩 / 评委 / data）
文件: out/defense-thermal/（deck.pptx、deck.html、deck.json、notes.md、sources.md、assets/MANIFEST.md、run.json、REPORT.md）
检查: ppt_check 0 error；render 已目检
缺口: 无
下一步: 无
```

## 机器校验

```powershell
node scripts/check-ppt-output.mjs out/defense-thermal
```

期望退出码 0；若某页漏了备注、`MANIFEST` 与实际文件不一致、或 `assets/` 出现未登记图片，校验器会失败并指出具体槽位/页。

## 缺素材时的期望

如果没有给实验数据 CSV，正确反应是：

```
STATUS: NEED_INPUT
```

并写 `requests.md`：缺 `metrics.csv`（列：模型、误报率、检测延迟）、为什么要（第 5 页对比与结论）、放哪里（`out/<slug>/materials/metrics.csv`）、拿到后能继续到哪一步。**不会**生成一份用假数据填满的 deck。
