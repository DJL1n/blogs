# 内容写作工作流（Markdown + 模板）

你的网站现在是“内容优先、页面自动渲染”，不是把每篇文章手写成前端代码。

## 一句话结论

- 文章源文件保存在 `src/content/{blog,notes,important}` 里的 `*.md` 文件。
- Astro 在构建时读取这些 Markdown 文件，自动渲染到 `/[type]/[slug]` 详情页。
- 所以“新建/修改内容”的入口是 **MD 文件**，不是页面路由里实时编辑。

## 目录结构

- `src/content/blog/`：长文/复盘
- `src/content/notes/`：短笔记
- `src/content/important/`：决策记录、配置记录

## 统一的 Frontmatter

每篇文章至少需要：

- `title`
- `date`
- `updated`
- `summary`
- `tags`
- `category`
- `type`（`blog`、`note`、`important`）
- `importance`（1-5）
- `draft`

示例：

```md
---
title: "Mac 刷新 DNS 缓存"
date: 2026-05-03
updated: 2026-05-03
summary: "记录 macOS 下刷新 DNS 缓存的命令和场景。"
tags: ["macOS", "network", "dns"]
category: "技巧"
type: "note"
importance: 2
draft: false
---
```

正文直接写 Markdown/MDX，页面会自动渲染。

## 推荐新增文章方式（推荐）

### 方式 A：网页写作器（推荐）

1. 打开站点 `/editor` 页面（顶部导航里有「写作」入口）。
2. 填写标题、类型、分类、标签、正文。
3. 点击「生成 Markdown」。
4. 点击「复制内容」粘贴到新文件，或「下载 .md」后放到对应目录。
5. 提交 Git。

路径映射：

- `note` -> `src/content/notes`
- `blog` -> `src/content/blog`
- `important` -> `src/content/important`

### 方式 B：命令行模板（适合批量）

1. 在终端运行：

```bash
npm run new:post
```

2. 按提示输入类型、标题、摘要、分类、标签等。
3. 命令会生成 `src/content/<type>/<slug>.md`（`note` 会生成到 `notes`），并带上标准模板。
4. 编辑该 md 文件内容，确认后提交：

```bash
git add src/content/<type>/<slug>.md
git commit -m "chore(content): add ..."
```

## 进阶：纯参数命令

```bash
npm run new:post -- --type note --title "Git 常用撤销命令" --category "工具" --tags "git,workflow"
```

## “在网页里直接新建 + 保存”是怎么回事

现在是静态站点（无数据库/后端），所以不能在网页直接写入本地 Markdown 文件后自动落库。
如果你后续坚持这种体验，需要再加一层服务端（Notion API、Headless CMS、GitHub API 编辑器等）。
当前阶段为了长期可维护和稳定发布，这种静态源文件方式是更可靠的。
