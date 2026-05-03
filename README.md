# 个人知识库型博客（Astro）

这是一个以长期维护为核心的个人知识博客，采用 Astro + Markdown/MDX + Tailwind CSS + GitHub + Cloudflare Pages。

目标：
- 长期可维护
- 写作高效
- 标签与分类清晰
- 易于搜索、易于迁移
- 支持 Codex 迭代更新

## 技术路线
- Astro（静态优先，首屏快）
- Markdown/MDX（内容文件化）
- Content Collections（类型校验与结构化查询）
- Tailwind CSS（样式系统）
- GitHub（版本管理）
- Cloudflare Pages（自动构建与预览）

## 内容分类
- `blog`：长文、教程、复盘
- `notes`：短技巧、常见问题、命令清单
- `important`：决策记录、配置日志、项目变更记录（不含敏感信息）

## 拟建页面
- `/` 首页
- `/blog` 正式文章
- `/notes` 短笔记
- `/important` 重要事项
- `/tags` 标签页
- `/about` 关于页
- 详情页 `/[类型]/[slug]`
- `/rss.xml`
- Sitemap

## 内容字段
- `title`, `date`, `updated`, `summary`, `tags`, `category`, `type`, `importance`, `draft`

## 项目结构（预期）
- `src/content/{blog,notes,important}/`
- `src/layouts/`
- `src/pages/{index.astro,blog,notes,important,tags,about.astro,rss.xml.js}`
- `src/components/{Header.astro,Footer.astro,PostCard.astro,TagList.astro}`
- `public/`
- `astro.config.mjs`, `package.json`, `tsconfig.json`

## 执行计划
详见 `implementation_plan.md`。
