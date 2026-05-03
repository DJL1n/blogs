# 个人知识库型博客（Astro）

这是一个以长期维护为核心的 Astro 个人知识博客，支持 `blog / notes / important` 三类内容。

## 快速开始

```bash
npm install
npm run dev
```

## 发布

```bash
npm run build
```

## 路由

- `/` 首页
- `/blog` 长文列表
- `/notes` 短笔记列表
- `/important` 重要事项列表
- `/tags` 标签页
- `/tags/[tag]` 标签过滤
- `/about` 关于页
- `/rss.xml` RSS feed

## 内容

内容放在：

- `src/content/blog`
- `src/content/notes`
- `src/content/important`

创建与发布都应通过 Markdown 文件完成（非前端页面）：

```bash
npm run new:post
```

按提示输入后会在对应目录生成 `*.md`，站点会自动从该文件渲染为对应详情页。
详情页仍保留静态站点优势（快、稳定、可迁移），后续如果你想要“纯网页在线编辑”，可以再接一个后台服务（类似 Notion 风格的数据库/API）。

前置字段（Markdown frontmatter）：

- `title`
- `date`
- `updated`
- `summary`
- `tags`
- `category`
- `type`
- `importance`
- `draft`

## 说明

- 暗色模式通过本地 `theme` 存储。
- RSS / Sitemap 已接入。
