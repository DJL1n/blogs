# 个人知识库型博客（Astro）

这是一个以长期维护为核心的 Astro 个人知识博客，支持 `blog / notes / important` 三类内容。

## 快速开始

```bash
npm install
npm run dev
```

### 一键启动（双击）

- macOS：双击 `start-blog.command`
- Windows：双击 `start-blog.bat`

脚本会自动：
- 切换到博客目录
- 检查依赖（首次未安装会自动执行一次 `npm install`）
- 启动 `astro dev --host 127.0.0.1 --port 4321 --open`

关闭启动窗口（或按 `Ctrl + C`）会自动结束 `astro dev` 编译进程。

### 打包成 macOS 应用（推荐）

如果你想要“一个真正双击启动的图标应用”，可以先执行：

```bash
npm run make:launcher:mac
```

会在项目根目录生成 `博客启动器.app`。

使用方式：
- 双击 `博客启动器.app`，它会打开一个终端窗口并执行本地启动脚本
- 终端窗口关闭即停止 `astro dev`

说明：该 `.app` 是基于当前项目路径生成的，若项目迁移到新目录，请重新执行一次 `npm run make:launcher:mac`。

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
- `/editor` 写作助手页（生成 Markdown）
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
另外可以直接打开 `/editor` 在网页里填写信息，自动生成标准 frontmatter 文本，再复制到文件提交。
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
