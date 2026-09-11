# P37 沉默的螺旋：论坛舆论气候实验台

> 沉默的螺旋互动论坛模拟：私下观点 vs 可见舆论气候，点赞/点踩与可见度衰减如何让少数派逐步沉默

[![Live Demo](https://img.shields.io/badge/Live-Demo-c7491f?style=for-the-badge)](https://yuuqq.github.io/P37-spiral-silence-bbs/)
[![PWA](https://img.shields.io/badge/PWA-Offline_Ready-4ade80?style=for-the-badge)](#)

## 🚀 在线体验

**[https://yuuqq.github.io/P37-spiral-silence-bbs/](https://yuuqq.github.io/P37-spiral-silence-bbs/)**

支持安装为 PWA 应用，离线使用。

## ✨ 功能特性

- 🌗 暗色/亮色模式一键切换
- 🔍 `Ctrl+K` 跨工具搜索跳转
- 📱 PWA 离线支持（可安装到桌面/手机）
- ♿ 完整无障碍标签（aria-label）
- 🔒 所有数据仅在浏览器本地处理

## 💻 本地开发 (Local Development)

如果需要在本地运行本项目进行开发或调试，由于使用了 Service Worker 和 ES Modules 等特性，直接通过双击 HTML 文件（`file://` 协议）打开会导致跨域 (CORS) 或功能注册失败。请使用本地 HTTP 服务器启动，例如：

```bash
# 使用 Node.js 的 serve 工具
npx serve .

# 或者使用 Python 内置服务器
python -m http.server
# 或 Python 2: python -m SimpleHTTPServer
```
然后访问 `http://localhost:3000` 或 `http://localhost:8000`。

## 🛠️ 技术栈

- 纯 HTML + CSS + JavaScript（零依赖框架）
- CSS 变量设计令牌系统
- Service Worker 缓存策略

## 📦 共享模块

- `design-tokens.css` — 统一设计令牌与暗色模式
- `dark-toggle.js` — 🌗 暗色/亮色模式切换
- `cmd-palette.js` — 🔍 Ctrl+K 命令面板
- `toast.js` — 🔔 Toast 通知系统
- `onboarding.js` — 🎯 首次访问引导
- `sw.js` — 📱 PWA Service Worker
- `pm-metrics.js` — 📊 使用量遥测

## 📄 许可

本项目为新闻素养教学工具，仅供学习与研究使用。

---

*本项目是 [新闻素养工具箱](https://yuuqq.github.io/journalism-toolbox/) 的第 37 号工具。*
