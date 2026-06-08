# HeroScene 升级 Spec v3 — Bloom 粒子星系

**目标文件**：`src/components/HeroScene.tsx`（完整重写）

## 视觉目标
一个充满科技感的 3D 粒子星系，带 Bloom 辉光，鼠标交互，暗色背景下发光粒子在莫兰迪绿灰色系中缓慢旋转。让人打开页面就想截图。

## 技术实现

### 依赖
`three` 已安装。需要安装 `postprocessing` 实现 Bloom，或者直接用 Three.js 的 `EffectComposer` + `UnrealBloomPass`：
```bash
npm install three-stdlib
```

### 场景结构

**粒子系统（核心）**：
- 2000-3000 个粒子
- 形成环面结（TorusKnot）形状分布或螺旋星系形状
- 粒子颜色：莫兰迪绿灰 `#8E9B8E`，带透明度渐变
- 粒子大小：0.08-0.15，根据位置有大小变化
- 渲染方式：`THREE.Points` + `THREE.BufferGeometry` + `THREE.PointsMaterial`

**Bloom 辉光**：
- 使用 `EffectComposer` + `UnrealBloomPass`
- strength: 0.8-1.2（有存在感但不刺眼）
- radius: 0.3
- threshold: 0.1

**鼠标交互**：
- 粒子系统整体跟随鼠标做平滑旋转（比现有 parallax 更明显一些）
- 鼠标位置影响粒子的轻微偏移（类似磁场效果）

**附加几何体**：
- 保留 1-2 个透明线框几何体（环面结或二十面体）在粒子云中作为点缀
- 几何体材质为半透明，带发光边缘

**相机**：
- 初始位置：`[0, 0, 5]`
- 自动缓慢围绕 Y 轴旋转（0.002 rad/frame）
- 鼠标交互叠加在这之上

### 暗亮主题适配
- 亮色模式：粒子颜色 `#8E9B8E`，透明度 0.6，背景透明
- 暗色模式：粒子颜色 `#6B7C6B`，透明度 0.8，背景透明
- Bloom 强度在亮色模式降低到 0.5

### 性能
- `dpr={[1, 1.5]}` 限制像素比
- 粒子数根据设备性能动态调整（移动端降为 1000）
- `useFrame` 中限制计算量

## 验证
1. `npm run build` — 0 错误
2. 首页加载后 3D 场景 1s 内出现
3. 粒子有发光/辉光效果
4. 鼠标移动时场景平滑跟随
5. Bloom 不明显干扰文字可读性

## Git
```bash
git add . && git commit -m "upgrade HeroScene: bloom particle galaxy"
```
