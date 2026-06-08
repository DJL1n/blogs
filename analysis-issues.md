# 项目问题分析

分析日期: 2026-05-23

---

## 🔴 功能性

### #1 日记页 `<meta name="robots">` 放在了 `<body>` 中
- **文件**: `diary/index.astro:11`、`diary/[slug].astro:28`
- **问题**: `<meta>` 标签写在了 body 里，不符合 HTML 规范，应在 `<head>` 中输出。
- **修复**: 将 meta 传入 BaseLayout 作为 props，在 head 中输出。
- **状态**: ✅ 已修复 — BaseLayout 新增 `noindex` prop，日记页移除 body 中的 meta

### #2 `site` 配置为 `https://example.com`
- **文件**: `astro.config.mjs:7`、`rss.xml.ts:14`
- **问题**: sitemap 和 RSS feed 中的链接全部为 `example.com`，部署后需要改为真实域名。
- **修复**: 替换为 `https://blogs.djl1n.me`。
- **状态**: ✅ 已修复

### #3 滚动揭示 (scroll-reveal) IntersectionObserver 重复
- **文件**: `BaseLayout.astro:92-107`、`index.astro:943-958`
- **问题**: 两处各自注册了 `.reveal` 的观测器。首页打开时二者同时运行，且 index.astro 版本未处理 prefers-reduced-motion。
- **修复**: 移除 index.astro 中的重复观测器。
- **状态**: ✅ 已修复

### #4 `surface-card-elevated` 使用了无效的 `@apply`
- **文件**: `global.css:274`
- **问题**: `@apply surface-card` 在 Tailwind 中不能引用自定义类。
- **修复**: 删除该规则，编辑器直接使用 `surface-card` 类。
- **状态**: ✅ 已修复

---

## 🟡 代码质量

### #5 `estimateReadingTime()` 在 4 个 slug 页面重复定义
- **文件**: `blog/[slug].astro`、`notes/[slug].astro`、`important/[slug].astro`、`diary/[slug].astro`
- **问题**: 相同函数重复四次。
- **修复**: 抽取到 `src/utils/reading-time.ts`。
- **状态**: ✅ 已修复

### #6 `editor.astro` 体积过大
- **文件**: `editor.astro`（1475 行 → ~300 行）
- **问题**: 单个组件涵盖解析、渲染、工具栏、保存、上传的全部逻辑。
- **修复**: 拆分为 `src/editor/markdown.ts`、`slash-menu.ts`、`EditorToolbar.astro`、`EditorMeta.astro`，核心脚本从 ~1007 行精简至 ~160 行。
- **状态**: ✅ 已修复

### #7 关联文章解析只在 notes 详情页实现
- **文件**: `notes/[slug].astro` 有内联的 `resolveRelatedPosts`，`blog`、`important` 缺失
- **修复**: 抽取到 `src/utils/related-posts.ts`，三集合详情页统一接入。
- **状态**: ✅ 已修复

### #8 Three.js 使用旧版本 r128 + CDN 加载
- **文件**: `index.astro`
- **问题**: r128（2021 年发布），CDN 加载增加外部依赖。
- **修复**: 升级为 npm `0.184.0`，改用 `import('three')` 动态导入。
- **状态**: ✅ 已修复

---

## 🟢 细节与边缘情况

### #9 日期格式化不一致
- **文件**: `index.astro` 用 `Intl.DateTimeFormat`，列表页用 `.toLocaleDateString('zh-CN')`
- **修复**: 统一为 `.toLocaleDateString('zh-CN')`。
- **状态**: ✅ 已修复

### #10 搜索结果 collection-grid 空态布局异常
- **文件**: `search.astro`
- **问题**: 0 条结果时仍 toggle `collection-grid`，可能产生空白列。
- **修复**: 空态时移除网格类，仅在有结果时添加。
- **状态**: ✅ 已修复

### #11 内容列表无分页
- **文件**: `/blog`、`/notes`、`/important` 索引页
- **修复**: 转换为 `[...page].astro` 使用 Astro `paginate()`，配置 pageSize=12，自动适配。
- **状态**: ✅ 已修复

### #12 搜索索引全量嵌入 HTML
- **文件**: `search.astro` — `define:vars` 序列化全部文章元数据
- **修复**: 生成独立的 `/search-index.json`，页面通过 `fetch()` 懒加载。
- **状态**: ✅ 已修复
