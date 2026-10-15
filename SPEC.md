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

- **Libraries/CDNs**: 页面运行时没有 npm 依赖。`index.html` 引用同站点 `../shared/` 的设计令牌和教学脚本（GitHub Pages 上由 `yuuqq.github.io/shared` 提供）。`jsdom` 只在本地 `npm test` 使用，不进页面。
- **Local data**: 无

## 7. Risks & Mitigations

- **Risk**: 模型过于简化
- **Mitigation**: 标注为教学演示

## 8. Acceptance Criteria

- [x] 智能体自动发帖，以及「+A帖 / +B帖」投放。页面没有自由文本发帖框
- [x] 点赞 / 点踩
- [x] 可见度衰减（热度排序）
- [x] 纯静态页面可部署 GitHub Pages
- [ ] 移动端可用（本轮未重新走查窄屏）
- [x] 隐私提示在页面底部可见
