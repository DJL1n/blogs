---
title: "RTG-SLAM: Real-time 3D Reconstruction at Scale using Gaussian Splatting"
date: 2026-06-08
updated: 2026-06-08
summary: RTG-SLAM 是一个面向大场景的 RGB-D 实时 Gaussian SLAM 系统。核心：compact opaque/transparent Gaussian 表示 + depth rendering ≠ color blending + stable/unstable state management + 显式 birth 事件。

tags:
  - GS-SLAM
relatedNotes: []
category: 文献笔记
importance: 2
draft: false
type: note
---

# RTG-SLAM: Real-time 3D Reconstruction at Scale using Gaussian Splatting

> SIGGRAPH 2024. 论文整理笔记。
> 📄 [PDF 原文](RTG-SLAM.pdf)

## 0. 一句话结论

RTG-SLAM 是一个面向大场景的 RGB-D 实时 Gaussian SLAM 系统。核心：compact opaque/transparent Gaussian 表示 + depth rendering ≠ color blending + stable/unstable state management + 显式 birth 事件。

不是单目 / dynamic / 最高渲染上限 / DROID/DPVO frontend。

---

## 1. 解决什么问题

NeRF-SLAM 慢/内存大；普通 3DGS-SLAM 在线扫描 Gaussian 膨胀。RTG-SLAM：牺牲部分离线渲染上限，换取 RGB-D 大场景在线实时重建 (17 FPS, 低显存)。

---

## 2. 核心机制

### Compact Gaussian Representation
- **Opaque Gaussian**: 拟合真实表面和主颜色（surfel-like）
- **Transparent Gaussian**: 补 residual color，不破坏已有几何
- Depth rendering: ray-plane intersection with first opaque hit (可微)
- Color rendering: 标准 alpha blending

### Explicit Gaussian Adding (非 gradient densification)
三类事件触发 birth:
1. Light transmission high → newly observed → opaque Gaussian
2. Depth error large → new surface → opaque Gaussian
3. Color error large with correct depth → transparent Gaussian

### Stable / Unstable State Management
- Unstable: 新加入 / 拟合差 → 参与优化
- Stable: confidence count 达标 → 只被评估，不再优化
- 只优化 unstable Gaussians，只渲染 unstable 覆盖的像素
- Long-term unstable → 删除为 outlier

### Tracking
Frame-to-model ICP (depth/normal) + ORB-SLAM2-style backend graph optimization。

### Backend optimization
Keyframe selection (rot/trans threshold)。只优化 top color-error pixels。Online 阶段不 update Gaussian position。扫描结束后 full refinement。

---

## 3. 实验

### Speed / Memory
| Scene | RTG-SLAM | SplaTAM |
|---|---|---|
| Replica FPS | **17.24** | — |
| Azure Home FPS | **17.90** | 0.31 (OOM) |
| Azure Home Memory | **8.8 GB** | OOM |
| Gaussian Count | **987K** | 7,155K (before OOM) |

### Tracking (TUM-RGBD)
| Method | Avg ATE |
|---|---|
| RTG-SLAM | **1.06 cm** |
| Co-SLAM | 2.74 |
| ESLAM | 2.11 |
| Point-SLAM | 2.38 |
| SplaTAM | 3.39 |
| ORB-SLAM2 | 1.00 |

### Geometry (ScanNet++)
| Method | Acc | Acc Ratio |
|---|---|---|
| RTG-SLAM | **0.95** | **96.41** |
| SplaTAM | 1.32 | 95.31 |

---

## 4. 强项

1. **大场景实时扫描** — 17 FPS, 低显存, Azure Kinect 可用
2. **Compact Gaussian** — opaque/transparent 分工, surfel-like depth hit
3. **Depth rendering ≠ color blending** — 几何更像 hit point, 不是体 blob
4. **显式 birth 事件** — 新区域/深度误差/颜色误差, 不是 gradient densification
5. **Stable/unstable state** — 只优化不稳定的, 降低计算

---

## 5. 局限

1. **RGB-D 依赖** — 非 monocular
2. **默认静态室内** — 不处理动态
3. **反光/透明/光照变化** → Gaussian 状态不稳定
4. **渲染上限不如离线 3DGS**
5. **ICP 前端不适合 monocular**

---

## 6. 对 SkelGS-SLAM 的启发

### ★ Stable/unstable → anchor maturity
Unstable anchor: 支撑不足, candidate only。Stable anchor: 多帧确认, read-only static support, 可参与 certified packet。记录 confidence count / error count / birth frame / last observed / normal stability / dynamic-risk。

### ★ 显式 birth 事件 (非 gradient)
Anchor birth event = repeated high-gradient + depth-normal confirmed + scale-consistent + dynamic-risk low + not covered。这是显式几何事件，不是“梯度高就 densify”。

### Depth rendering ≠ color rendering
Appearance blending 和 geometry hit 是两件事。前端认证 geometry, GS 消费 certified geometry 只优化 appearance。

### Transparent Gaussian = residual appearance 层
不因颜色误差改 geometry。对应你: CertifiedGeometryPacket 负责几何, ChildGS/residual layer 负责外观。

### 不建议借: ICP 前端
RGB-D ICP 不适合 monocular predicted depth。

---

## 7. 35 篇论文定位

| 系统 | 定位 | 对你价值 |
|---|---|---|
| RTG-SLAM | RGB-D 大场景实时 GS | **primitive lifecycle / birth / state mgmt** |
| DGS-SLAM | RGB-D 动态去动态 | dynamic gate / provenance |
| ADD-SLAM | RGB-D 动态+ consistency | dynamic-risk / occlusion |
| RGBDS-SLAM | RGB-D 语义 pyramid | pyramid / multi-channel |
| MASt3R-SfM | 离线 SfM | constrained pointmap / anchor depth |

---

## Related extracted notes

### Concepts
- [Primitive-Lifecycle-State](Primitive-Lifecycle-State) — stable/unstable/outlier state for anchor
- [Explicit-Birth-Event](Explicit-Birth-Event) — geometry-triggered anchor birth, not gradient

### Methods
- [RTG-SLAM-Architecture](RTG-SLAM-Architecture) — compact GS + ICP + state mgmt pipeline
- [Stable-Unstable-Anchor-Maturity](Stable-Unstable-Anchor-Maturity) — translating RTG state to anchor maturity

### Project
- [SkelGS-SLAM: RTG-SLAM 分析](10_Projects/SkelGS-SLAM/decision-log)
