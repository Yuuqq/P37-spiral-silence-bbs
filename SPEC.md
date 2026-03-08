# P37 Spec - 沉默的螺旋互动论坛模拟

## 1. Summary

- **Project ID**: P37
- **Project Name**: 沉默的螺旋互动论坛模拟
- **Goal**: 模拟论坛中异见被主流意见逐步淹没的过程，参数可控
- **User Persona**: 新闻学生 / 研究者

## 2. Scope

- **In scope**:
  - 模拟论坛中异见被主流意见逐步淹没的过程
  - 参数可控
- **Out of scope**:
  - 后端代理或服务端逻辑
  - API Key 持久化存储

## 3. UX

- **Core workflow**: 用户输入 → 前端处理 → 结果展示
- **Inputs**: 参数调节（初始意见分布/从众系数）
- **Outputs**: 动态论坛仿真 + 意见分布图
- **States**: empty (初始) / loading (处理中) / error (失败) / success (完成)

## 4. Functional Requirements

1. FR-1: 模拟论坛中异见被主流意见逐步淹没的过程
2. FR-2: 结果可视化展示
3. FR-3: 错误状态可见提示

## 5. Non-Functional Requirements

- **Performance**: 核心任务 3 分钟内完成
- **Accessibility**: 键盘导航、aria-label、焦点可见、WCAG AA 对比度
- **Privacy**: 本地处理优先，不默认上传数据
- **Browser support**: 现代 Chromium (Chrome 110+)

## 6. Dependencies

- **Libraries/CDNs**: 无外部依赖
- **Local data**: 无

## 7. Risks & Mitigations

- **Risk**: 模型过于简化
- **Mitigation**: 标注为教学演示

## 8. Acceptance Criteria

- [ ] 发帖
- [ ] 点赞点踩
- [ ] 可见度衰减
- [ ] 纯静态页面可部署 GitHub Pages
- [ ] 移动端可用
- [ ] 隐私提示清晰可见
