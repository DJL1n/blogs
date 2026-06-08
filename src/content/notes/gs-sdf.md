---
title: "GS-SDF: LiDAR-Augmented Gaussian Splatting and Neural SDF for Geometrically Consistent Rendering and Reconstruction"
date: 2026-06-08
updated: 2026-06-08
summary: GS-SDF 是一个 LiDAR-visual reconstruction/rendering 系统。核心：LiDAR point clouds → neural SDF (continuous geometry field) → SDF zero-level initializes 2D Gaussians → SDF shape regularization constrains Gaussian geometry → high-fidelity rendering + geometrically consistent surface。不是 monocular SLAM / GS tracking frontend / online mapping。

tags:
  - 3DGS
  - Neural-Implicit
  - Hybrid-Representation
  - Point-Cloud
  - GS-SLAM
relatedNotes: []
category: 文献笔记
importance: 2
draft: false
type: note
---

# GS-SDF: LiDAR-Augmented Gaussian Splatting and Neural SDF for Geometrically Consistent Rendering and Reconstruction

> arXiv 2025. 论文整理笔记。
> 📄 [PDF 原文](GS-SDF.pdf)

## 0. 一句话结论

GS-SDF 是一个 LiDAR-visual reconstruction/rendering 系统。核心：LiDAR point clouds → neural SDF (continuous geometry field) → SDF zero-level initializes 2D Gaussians → SDF shape regularization constrains Gaussian geometry → high-fidelity rendering + geometrically consistent surface。不是 monocular SLAM / GS tracking frontend / online mapping。

---

## 1. 系统定位

LiDAR-visual reconstruction/rendering + 2D Gaussian Splatting + neural SDF + geometry-guided Gaussian initialization + SDF-guided shape regularization。假设输入为 posed images + LiDAR point clouds。

---

## 2. 核心问题

3DGS/2DGS 渲染强但几何碎片化、漂浮、不连续；rendered depth/normal 正则在复杂场景不够。LiDAR 点云准确但稀疏，直接整合进 3DGS 困难。

GS-SDF 答案：LiDAR → NSDF (continuous manifold field) → 初始化 Gaussians + shape regularization。

---

## 3. 总体 Pipeline

```
posed images + LiDAR point clouds
→ Stage 1: train NSDF (hash encoding + MLP, BCE + Eikonal)
→ Stage 2: NSDF → marching cubes mesh → Gaussian initialization
   (center, normal/orientation, opacity, sky canvas)
→ Stage 3: color initialization (fix geometry, train color only)
→ Stage 4: joint optimization (photometric + render consistency + SDF shape reg)
→ output: consistent Gaussians + rendering + SDF surface
```

---

## 4. 表示一：2D Gaussian Splatting

Planar Gaussian disks (2DGS)，非 3D ellipsoid。每个 disk: center, local tangent vectors, scale, opacity, SH color, normal。更接近 surface primitive，适合与 SDF surface 对齐。

---

## 5. 表示二：Neural SDF (NSDF)

Hash encoding + MLP → signed distance value + scale factor。LiDAR rays 监督 (BCE/occupancy) + Eikonal regularization。把 sparse LiDAR 变成 continuous manifold geometry field。

---

## 6. SDF-aided Gaussian Initialization

### Position: NSDF → marching cubes → mesh vertices → Gaussian centers
比 SfM points / raw LiDAR 更准、更密、更抗 outlier。

### Orientation: SDF gradient → normal; principal curvature → second axis; Gram-Schmidt → full frame
不仅是位置，Gaussian orientation 也从 SDF 几何初始化。

### Opacity: SDF value + kernel → opacity init
### Sky: map-sized sphere uniform opaque Gaussians → 避免 foreground 漂去解释背景

---

## 7. Color Initialization

正式联合优化前，fix position/rotation/scale/opacity，只训练 color。防止 early photometric loss 拉坏 Gaussian geometry。

---

## 8. Geometric Regularization

### Rendering consistency
Rendered normal vs finite-difference normal from rendered depth。

但论文指出该正则 alone 在复杂场景中产生 false structure，不够。

### SDF-aided shape regularization ★
对每个 Gaussian disk surface 采样点 → query NSDF value → 对齐 zero-level。不只是 center regularization（中心拉到 surface），而是 shape regularization（整个 disk 贴合 surface）。监督 center + rotation + scale + opacity。

Ablation: center reg 改善但仍 blur；shape reg 保留砖块细节。

---

## 9. 强项

1. **LiDAR → continuous SDF prior** — 比 LiDAR depth loss 更强
2. **解决 GS 几何碎片化** — SDF zero-level shape regularization
3. **初始化和正则都作用在 geometry** — 不只是 loss
4. **2DGS disk 更适合 surface 对齐**
5. **初始化设计细** — position/orientation/opacity/sky/color 都考虑

---

## 10. 局限

1. **依赖 LiDAR / posed images** — 非 monocular
2. **不是 SLAM 前端** — 不负责 tracking/loop/dynamic
3. **NSDF 训练有额外成本**
4. **SDF prior 也有误差** — 稀疏区域/动态/玻璃/远距

---

## 11. 对 SkelGS-SLAM 的启发

### ★ 最重要：GS 几何需要外部连续几何场监督
Render-derived constraints 不足以保证 Gaussian geometry。你的系统需要：DPVO temporal + MASt3R pair + depth-normal + free-space + CertifiedGeometryPacket。

### CertifiedGeometryPacket ≈ 你的 NSDF teacher
Monocular 无 LiDAR NSDF，但可以构造 weak geometry teacher：DPVO + MASt3R + depth-normal + scale + free-space → CertifiedAnchorField。

### Shape regularization > center regularization
ChildGS 应约束整个 tangent plane，不只约束 center。

### 初始化比后期正则更重要
Birth 时初始化 normal/tangent/scale/opacity/confidence/support radius。

### 先锁 geometry 再训练 appearance
Stage 1: freeze geometry, train color; Stage 2: small bounded refinement; Stage 3: quarantine if geometry drifts。

### Sky/background 单独建模
Unbounded/low-confidence background 不要强行 birth Gaussians。

---

## 12. 最终定位

| 系统 | 定位 | 对 SkelGS-SLAM 价值 |
|---|---|---|
| **GS-SDF** | **LiDAR→NSDF→GS init+shape reg** | **geometry teacher / shape regularization** |
| GS-SLAM/SplaTAM | RGB-D GS-SLAM | sensor depth baseline |
| MGS-SLAM | monocular DPVO+MVS+GS | scale closure |
| VPGS-SLAM | large-scale submap GS | submap/anchor/loop |
| OG-Mapping | octree anchor GS | LOD growth |

GS-SDF 最值得借鉴的不是 LiDAR 本身，而是：先形成可信连续几何场 → 从这个场初始化 Gaussian → 用 shape-level regularization 约束 Gaussian → 不指望 RGB render loss 自己保证几何一致。

---

## Related extracted notes

### Concepts
- [SDF-Geometry-Teacher](SDF-Geometry-Teacher) — external continuous geometry field supervising GS
- [Shape-Regularization](Shape-Regularization) — disk-level shape alignment vs center-only

### Methods
- [NSDF-to-GS-Initialization](NSDF-to-GS-Initialization) — NSDF → Gaussian center/orientation/opacity
- [Certified-Geometry-Field](Certified-Geometry-Field) — translating GS-SDF's NSDF teacher to monocular setting

### Project
- [SkelGS-SLAM: GS-SDF 分析](10_Projects/SkelGS-SLAM/decision-log)
