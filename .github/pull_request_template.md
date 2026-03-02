## 变更概述

- 本次变更目的：
- 影响范围：

## 数据治理影响声明（必填）

- 是否涉及数据管道/治理/进化逻辑：`是/否`
- 若是，请说明：
  - 数据来源或合成依据：
  - 真实性/质量/合规风险：
  - 已执行治理检查（quality/semantic/compliance）：

## 变更 -> 测试映射（必填）

- 代码变更点：
  - `path/to/file1` -> `tests/...`
  - `path/to/file2` -> `tests/...`
- 本地测试命令与结果：
  - `PYTHONPATH=. pytest tests/unit tests/integration tests/e2e -v`
  - 结果：`xx passed`

## 回归与人工验证

- 自动化回归是否通过：`是/否`
- 若有无法自动化覆盖项，人工验证步骤：
  - 步骤1：
  - 步骤2：

## Checklist

- [ ] 我已补充或更新相关测试（unit/integration/e2e 至少一类）
- [ ] 我已填写“数据治理影响声明”
- [ ] 我已填写“变更 -> 测试映射”
- [ ] 我确认未引入与当前任务无关的变更
