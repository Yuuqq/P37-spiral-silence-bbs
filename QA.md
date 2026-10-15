# P37 QA

## Environment

- **Browser**: Chrome 110+（自动化用 jsdom 29）
- **Date**: 2026-10-15
- **How**: `npm test`，外加对照 `index.html` 默认滑块

## Functional Test Cases

1. **默认参数仿真**
   - Steps: 用 `index.html` 的默认滑块（恐惧孤立 70、点踩 55、注意力 22、媒体偏置 0、死硬派 6、A 占比 50），地址栏 `?seed=42`，连续单步 10 次。再开一份同样的页面再跑一遍。
   - Expected: 两次的智能体、帖子和历史曲线一致。换一个 seed 则不一致。
   - Actual: `npm test` 覆盖
   - Pass/Fail: **Pass**（以测试脚本为准）

2. **私下表**
   - Steps: 运行后拖动「A 占比」到 80，不按重置。再只拖「恐惧孤立」。
   - Expected: 私下表变成智能体里 A 的真实比例（80%）。只拖恐惧孤立不会改写立场，沉默率按当前发声概率更新，不会被写成 0。
   - Actual: `npm test` 覆盖
   - Pass/Fail: **Pass**

3. **点赞焦点**
   - Steps: 帖子出现后聚焦「赞」，再单步一次。
   - Expected: 同一个按钮节点还在，不会因为整表重绘而消失。
   - Actual: `npm test` 覆盖节点身份
   - Pass/Fail: **Pass**

### 与界面一致的范围

- [x] 智能体发帖与 +A帖 / +B帖 投放
- [x] 点赞点踩
- [x] 热度排序和可见度衰减
- [ ] 自由文本发帖框（界面里没有，不要再勾成已有）

## Accessibility Checks

- [x] 参数滑块有可见 label
- [x] 赞/踩按钮有 aria-label，曲线图有 `role="img"`
- [ ] 键盘走查和对比度未在本轮用真实浏览器重做

## Privacy Checks

- [x] 仿真不上传帖子或观点
- [x] 页面底部有本地处理说明
- [x] `pm-metrics.js` 只写本地存储

## Known Issues

- **Issue**: `../shared/` 脚本随页面加载。共享仓库若被改，会直接影响本工具。Service Worker 只缓存同域 GET，缓存名已按 P37 隔离。
- **Severity**: Medium（供应链，不是本仓库里的 XSS）
- **Workaround**: 课堂环境使用已固定的 shared 版本；离线前先在线打开一次。

## Sign-Off

- 本文件只记录上面这些已跑过的检查，不再盖章「暂无已知严重问题」。
