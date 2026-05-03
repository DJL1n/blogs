# Astro 个人知识库博客实施计划（MVP）

## 一、目标
先交付一个“可靠写作系统”，而非复杂产品系统。

- 能写、能看、能部署
- 支持内容组织（blog / notes / important）
- 支持标签、分类、草稿、更新时间
- 支持 RSS 与 Sitemap，且可直接部署到 Cloudflare Pages

## 二、目录与内容模型
### 1. 集合定义
建立 3 个 Content Collections：
- `blog`
- `notes`
- `important`

统一字段建议：
- `title`: string
- `date`: date
- `updated`: date
- `summary`: string
- `tags`: string[]
- `category`: string
- `type`: enum (`blog`, `note`, `important`)
- `importance`: number（1-5）
- `draft`: boolean

### 2. 文章目录（页面）
- `/` 首页：聚合最近内容入口
- `/blog` 列表：长文
- `/notes` 列表：短笔记
- `/important` 列表：重要事项
- `/tags` 与 `/tags/[tag]`：标签索引
- `/about`：说明页
- `/{type}/[slug]`：详情页
- `/rss.xml`：RSS 输出
- `sitemap`：构建自动生成

### 3. 结构（建议）
- `src/content/blog`
- `src/content/notes`
- `src/content/important`
- `src/pages/index.astro`
- `src/pages/blog/index.astro`
- `src/pages/blog/[...slug].astro`
- `src/pages/notes/index.astro`
- `src/pages/notes/[...slug].astro`
- `src/pages/important/index.astro`
- `src/pages/important/[...slug].astro`
- `src/pages/tags/index.astro`
- `src/pages/tags/[tag].astro`
- `src/pages/about.astro`
- `src/pages/rss.xml.ts`
- `src/pages/sitemap.xml.ts`（或插件配置）
- `src/layouts/{BaseLayout.astro,PostLayout.astro}`
- `src/components/{Header.astro,Footer.astro,PostCard.astro,TagList.astro,SearchBox.astro}`

## 三、MVP 任务清单
### 阶段 1：可运行的基础站点
1. 初始化项目（Astro + Tailwind + TypeScript）
2. Content Collections 配置
3. 首页 + 列表 + 详情
4. 标签页与分类页
5. RSS + Sitemap
6. 暗色模式切换
7. 代码高亮配置
8. 首页和列表支持按 `draft` 过滤

### 阶段 2：发布与运维
1. GitHub 仓库与基础协作规范
2. Cloudflare Pages 部署
3. README 说明清楚构建/发布流程
4. 准备 3-5 篇示例内容（blog/notes/important 各 1-2 篇）

### 阶段 3：增强（预留）
- 全文搜索
- 相关文章
- 阅读时长
- 目录 TOC
- 文章更新时间展示
- 重要程度排序
- 年份归档、项目归档、死链检查

## 四、实施顺序
1. 先搭站点骨架与集合 schema
2. 再做内容查询与渲染
3. 最后接入 RSS/Sitemap 与部署
4. 验证后只补充样式细节与体验优化

## 五、内容写作规范（简化）
1. 先写 `notes`
2. 内容变成长文后迁移到 `blog`
3. 配置/决策类信息放 `important`
4. 每周统一整理 `tags` 与 `summary`
5. `important` 禁止记录敏感凭据（密码/API key/token）
