# 莫兰迪配色视觉改造方案

## 1. Tailwind Config 扩展

在 `tailwind.config.mjs` 的 `theme.extend` 中添加：

```js
colors: {
  morandi: {
    bg: '#F4F3EF',       // 背景米纸白
    card: '#FFFFFF',      // 卡片白
    text: '#3D404A',      // 主文字深铅灰
    muted: '#8A8F99',     // 次要文字雾霾灰
    accent: '#8E9B8E',    // 强调色灰豆绿
    'accent-hover': '#737D73',
    'tag-bg': '#EAE8E1',  // 标签底暖灰米
    border: '#E0DDD5',    // 分割线银鼠色
  }
}
```

## 2. 全局样式 (global.css) 修改

- body 背景：`#F4F3EF`，文字：`#3D404A`
- 卡片/区块加极淡阴影和圆角
- 导航栏加薄底边和半透明毛玻璃效果
- 搜索框改大圆角 + focus 时莫兰迪绿光环
- 所有标签改成胶囊 pill 形状（rounded-full），悬停变色
- 笔记列表项加卡片背景 + 微阴影 + hover 上浮效果

## 3. 组件级调整

- 首页 hero 区域的标签改成柔和 pill
- 笔记列表每项变成卡片容器
- 标签页标签云改成胶囊网格
- 保持原有暗色模式，暗色下也做对应的莫兰迪灰调适配（不要纯黑）

## 注意事项

- 所有颜色用 morandi 自定义色值，不走 Tailwind 默认颜色
- 不要改 prose 内部的排版（那部分现在没问题）
- 保持 `transition` 平滑，不要突兀变化
- 保持响应式布局不变
