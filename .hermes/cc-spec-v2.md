# 博客高级互动特效 Spec v2

## 项目路径
`/Users/a0000/code/blogs/`

## 总体要求
高级感、炫技但不喧宾夺主。去掉之前的 Magnet 和 SplashCursor。保留 TiltedCard（需要的话可以加强）。新增以下两个效果。

---

## 1. Three.js 英雄区 3D 场景

**位置**：首页 `/` 的英雄区域（background layer）
**目标文件**：新建 `src/components/HeroScene.tsx`

### 技术栈
- 使用已安装的 `three`（^0.184.0）
- React 组件，通过 `client:load` 或 `client:visible` 加载
- Canvas 覆盖在 hero section 背景层，`pointer-events: none`，不影响交互

### 视觉设计

**场景内容**：
- 3-5 个飘浮的几何体：环面结（TorusKnot）、二十面体（Icosahedron）、八面体（Octahedron）
- 每个几何体缓慢自转（不同速度和轴向）
- 几何体材质：半透明，边缘带细线框（wireframe overlay）
- 颜色：跟随主题——亮色模式 `#8E9B8E`（莫兰迪绿灰），暗色模式 `#6B7C6B`，透明度 0.3-0.5

**鼠标交互**：
- 鼠标移动时几何体缓慢跟随旋转（parallax 效果，偏移量小，优雅）
- 鼠标滚动时几何体沿 Y 轴轻微浮动

**技术细节**：
- 使用 `@react-three/fiber` 或原生 Three.js 渲染
- 如果使用 `@react-three/fiber`，需要安装：`npm install @react-three/fiber @react-three/drei`
- 或者用原生 Three.js + useEffect

**集成到 `src/pages/index.astro`**：
```astro
import HeroScene from '../components/HeroScene';
...
<HeroScene client:visible />
```
放在 hero-section 后面，作为背景层。

### 样式
给场景容器：
```css
position: absolute;
top: 0;
left: 0;
width: 100%;
height: 100vh;
z-index: 0;
pointer-events: none;
```
英雄区需要 `position: relative; overflow: hidden;` 来容纳背景层。

---

## 2. 自定义鼠标指针

**目标文件**：新建 `src/components/CustomCursor.tsx`

### 视觉设计
- 两个元素：
  1. **外圈光环**：直径 32px，border 1px 半透明，跟随鼠标位置，带 0.15s 平滑
  2. **实心圆点**：直径 6px，跟随鼠标位置，无延迟
- 默认状态：外圈淡入淡出，颜色灰/白跟随主题
- Hover 链接和按钮时：外圈放大到 48px，圆点颜色变为主题绿 `#8E9B8E`
- 仅在非触屏设备上显示（检查 `!matchMedia('(hover: none)')`）

### 实现
- 使用 `useEffect` + `requestAnimationFrame` 驱动位置
- `pointer-events: none`，z-index 极高
- 使用 `lerp` 平滑插值

### 集成到 `src/layouts/BaseLayout.astro`
```astro
import CustomCursor from '../components/CustomCursor';
...
<CustomCursor client:only="react" />
```

### 样式
```css
position: fixed;
top: 0; left: 0;
width: 100vw;
height: 100vh;
z-index: 9999;
pointer-events: none;
```

---

## 3. 清理

- 删除 `src/components/react-bits/Magnet/Magnet.tsx`
- 删除 `src/components/SplashCursor.tsx`（如果还在）
- 删除 `src/components/react-bits/MagnetProvider.tsx`
- 从 `Header.astro` 中移除 Magnet 导入和使用
- 从 `BaseLayout.astro` 中移除 SplashCursor 导入和使用

---

## 4. 验证

1. `npm run build` — 0 错误
2. 检查 Three.js 场景不阻塞页面加载（`client:visible`）
3. 自定义鼠标在页面加载时自动启用
4. 触屏设备不显示自定义鼠标

---

## 5. Git

完成后 `git add . && git commit -m "feat: Three.js hero scene + custom cursor, remove cheap effects"`，不要 push。
