# 博客主页交互动效改造 Spec

## 项目路径
`/Users/a0000/code/blogs/`

## 任务概述
为 Astro 博客首页添加三组交互动效组件，需确保构建通过、设计克制不花哨。

---

## 1. TiltedCard — 首页内容入口卡片 3D 悬停

**目标文件**：`src/pages/index.astro` + 新建组件

**具体做法**：

在 `src/components/` 下新建 `TiltedCard.tsx`，React 组件，代码来自 React Bits 的 TiltedCard：

```tsx
import React, { useRef } from 'react';

interface TiltedCardProps {
  children: React.ReactNode;
  className?: string;
  tiltDegree?: number;
}

const TiltedCard: React.FC<TiltedCardProps> = ({
  children,
  className = '',
  tiltDegree = 8,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = ((y - centerY) / centerY) * -tiltDegree;
    const rotateY = ((x - centerX) / centerX) * tiltDegree;
    cardRef.current.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
  };

  const handleMouseLeave = () => {
    if (!cardRef.current) return;
    cardRef.current.style.transform = 'perspective(800px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
    cardRef.current.style.transition = 'transform 0.4s ease-out';
  };

  const handleMouseEnter = () => {
    if (!cardRef.current) return;
    cardRef.current.style.transition = 'transform 0.1s ease-out';
  };

  return (
    <div
      ref={cardRef}
      className={className}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onMouseEnter={handleMouseEnter}
      style={{ willChange: 'transform', cursor: 'pointer' }}
    >
      {children}
    </div>
  );
};

export default TiltedCard;
```

**集成到 index.astro**：

在 `src/pages/index.astro` 中引入 TiltedCard 组件：
```
import TiltedCard from '../components/TiltedCard.tsx';
```
（注意 Astro 中 React 组件用 client:only）

找到内容入口卡片 section（三个 `.lane-card` 的 a 标签），用 TiltedCard 包裹每个卡片：
```astro
<TiltedCard tiltDegree={6}>
  <a href={lane.href} class={`lane-card card reveal reveal-delay-${Math.min(index + 1, 3)}`}>
    ...
  </a>
</TiltedCard>
```

现有的 `.lane-card` 样式要加 `transform-style: preserve-3d` 和适度阴影加深，让 3D 效果更明显。在 `global.css` 增加：
```css
.lane-card {
  transform-style: preserve-3d;
  transition: box-shadow 0.3s ease;
}
.lane-card:hover {
  box-shadow: 0 12px 40px rgba(0,0,0,0.08);
}
.dark .lane-card:hover {
  box-shadow: 0 12px 40px rgba(0,0,0,0.3);
}
```

同时给卡片内的文字层加一点 Z 轴偏移，让 hover 时有景深感：
```css
.lane-card strong,
.lane-card p,
.lane-card .lane-eyebrow,
.lane-card .lane-count {
  transform: translateZ(20px);
  /* 保留 */
}
```

---

## 2. Magnet — 导航栏链接磁吸效果

**Magnet 组件已存在**：`src/components/react-bits/Magnet/Magnet.tsx`（无需新建）

**目标文件**：`src/components/Header.astro`

**集成方式**：

在 Header.astro 中引入 Magnet：
```
import Magnet from './react-bits/Magnet/Magnet.tsx';
```

用 Magnet 包裹导航栏每个 nav-link：
```astro
<a href={link.href} class={`nav-link ${isActive(link.href) ? 'nav-link-active' : ''}`}>
  {link.label}
</a>
```
改成：
```astro
<Magnet padding={60} magnetStrength={3} wrapperClassName="inline-flex">
  <a href={link.href} class={`nav-link ${isActive(link.href) ? 'nav-link-active' : ''}`}>
    {link.label}
  </a>
</Magnet>
```

注意 React 组件在 Astro 里要用 `client:only="react"` 或者 `client:idle`。因为导航在几乎所有页面出现，用 `client:idle` 避免加载阻塞。

---

## 3. SplashCursor — 首页水波纹鼠标跟随

**新建组件**：`src/components/SplashCursor.tsx`

从 React Bits 的 SplashCursor 源码移植。要求：
- 仅首页加载（用 Astro 的 `client:visible` 或 `client:only` 控制）
- 透明度压到很低（opacity 0.15-0.2），不干扰内容阅读
- 单色，跟随主题色系（亮色模式下浅灰，暗色模式下深灰/白）
- 需要 Canvas 渲染，性能开销低

关键参数：
- 波纹数量限制在 8-12 个
- 波纹生命期 1.5s
- 鼠标移动触发新波纹
- 暗/亮主题自适应（通过检查 `document.documentElement.classList.contains('dark')`）

**集成到 BaseLayout.astro**：

在 `src/layouts/BaseLayout.astro` 中条件加载 SplashCursor——仅首页加载。
通过检查 Astro.url.pathname 判断：
```astro
{path === '/' && <SplashCursor client:visible />}
```

---

## 4. 验证要求

完成后执行：
1. `npm run build` — 必须 0 错误通过
2. `astro dev` 启动后截图首页，检查三组动效是否正常
3. 检查控制台无 React/JS 报错

## 5. Git

完成后 `git add . && git commit -m "feat: add interactive effects - TiltedCard, Magnet, SplashCursor"`
不要 push。
