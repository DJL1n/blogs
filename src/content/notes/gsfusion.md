---
title: "GSFusion: Online RGB-D Mapping Where Gaussian Splatting Meets TSDF Fusion"
date: 2026-06-08
updated: 2026-06-08
summary: GSFusion 是一个 online RGB-D mapping 系统。核心：TSDF 负责几何骨架 + 3D Gaussian 负责视觉外观；quadtree image segmentation 控制候选位置 + TSDF voxel check 做去重/admission gate。不是完整 SLAM（实验用 GT pose），但 Gaussian birth 由几何结构显式控制的方式非常值得借鉴。

tags:
  - GS-SLAM
relatedNotes: []
category: 文献笔记
importance: 2
draft: false
type: note
---

# GSFusion: Online RGB-D Mapping Where Gaussian Splatting Meets TSDF Fusion

> IEEE RA-L 2024. 论文整理笔记。
> 📄 [PDF 原文](GSFusion.pdf)

## 0. 一句话结论

GSFusion 是一个 online RGB-D mapping 系统。核心：TSDF 负责几何骨架 + 3D Gaussian 负责视觉外观；quadtree image segmentation 控制候选位置 + TSDF voxel check 做去重/admission gate。不是完整 SLAM（实验用 GT pose），但 Gaussian birth 由几何结构显式控制的方式非常值得借鉴。

---

## 1. 解决什么问题

TSDF 几何稳但视觉弱；3DGS 渲染强但易膨胀/漂浮/几何不一致。GSFusion：不让 Gaussian 单独承担几何建图，用 TSDF 建立几何底座，再用少量 Gaussian 表达视觉细节。

---

## 2. Pipeline

```
RGB-D frame + known pose
  → depth → octree TSDF fusion
  → RGB → quadtree contrast segmentation
  → quadrant center + depth → back-project 3D
  → nearest TSDF voxel weight check
  → initialize Gaussian only if weight == 1 (new region)
  → differentiable rendering → photometric online optimization
  → random keyframe optimization (anti-forgetting)
  → optional post-scan global optimization
```

**输出**: TSDF volumetric map + compact 3D Gaussian map。

---

## 3. 核心机制

### TSDF geometry carrier
基于 Supereight2 octree TSDF。Depth 观测 → ray marching → truncation band → weighted average update。为 Gaussian 提供显式三维空间索引。

### Quadtree Gaussian allocation
RGB 图像按 contrast 递归分割。低纹理区域用大 cell，高对比度边缘用小 cell。Cell center 回投 3D 作为候选 Gaussian 位置。

### TSDF voxel admission gate
候选 3D 点查最近 TSDF voxel：weight == 1 → 新区域 → 允许 birth；weight > 1 → 已有观测 → 拒绝 birth。显式几何 gate，不是 gradient densification。

### Gaussian initialization
Position = cell centre 回投，scale 根据 cell 空间 span 初始化，SH = cell RGB color。

### Online optimization
Differentiable rendering + photometric loss。Keyframe 多迭代，non-keyframe 少迭代 + 随机抽历史 keyframe 防遗忘。

### Global optimization
Post-scan optional，对最终质量提升明显。

---

## 4. 实验（GT pose，不评估 tracking）

### ScanNet++
| Method | PSNR | Mapping FPS | Model Size |
|---|---|---|---|
| SplaTAM | 25.22 | 0.19 | 206 MB |
| RTG-SLAM | 18.28 | 1.29 | 112 MB |
| **GSFusion (no global)** | 24.99 | **6.14** | **29 MB** |
| **GSFusion (global)** | **28.84** | — | — |

GSFusion 比 SplaTAM 快 ~30×，比 RTG-SLAM 快 ~5×，model size 最小。

### Replica
| Method | PSNR | SSIM | FPS |
|---|---|---|---|
| SplaTAM | 32.56 | 0.930 | 0.14 |
| RTG-SLAM | 33.38 | 0.929 | 8.34 |
| **GSFusion (global)** | **34.65** | **0.949** | **9.73** |

### Random keyframe optimization ablation
| Setting | PSNR | SSIM | FPS |
|---|---|---|---|
| w/o random | 24.22 | 0.849 | 9.70 |
| w/ random | **28.64** | **0.900** | **9.74** |

不含 tracking / loop closure / dynamic。

---

## 5. 强项

1. **Gaussian birth 有显式几何 gate** — quadtree + TSDF voxel check，非 gradient densification
2. **TSDF + GS hybrid** — 两种地图各司其职
3. **Compact** — ScanNet++ 29 MB vs SplaTAM 206 MB
4. **高效** — 6.14 FPS，比 RTG-SLAM 快 5×
5. **Random keyframe anti-forgetting** — 简单有效

---

## 6. 局限

1. **不是完整 SLAM** — 实验用 GT pose，不解决 tracking
2. **RGB-D 依赖** — non monocular
3. **最佳质量依赖 post-scan global optimization**
4. **不处理动态**
5. **TSDF 对透明/反光/depth missing 仍有限**

---

## 7. 对 SkelGS-SLAM 的启发

### ★ Geometry-gated GS birth
GSFusion 的最重要启发：stable geometry carrier → controlled GS admission。对应你的系统：anchor / certified geometry maturity → GS admission，不是 render residual → densification。

### ★ Quadtree → anchor budget allocation
Contrast-based image space allocation。可替换为：image gradient / track repeatability / multi-view parallax / depth-normal stability。

### TSDF voxel → anchor occupancy check
已有 mature anchor / GS group → 不重复 birth。只有 multi-view support 达 maturity → birth。

### 不能解决
Monocular scale / pose-depth coherence / dynamic / frontend tracking。

---

## Related extracted notes

### Concepts
- [Geometry-Gated-GS-Birth](Geometry-Gated-GS-Birth) — TSDF voxel / anchor maturity → GS admission
- [Hybrid-TSDF-GS-Map](Hybrid-TSDF-GS-Map) — 双地图各司其职

### Methods
- [GSFusion-Architecture](GSFusion-Architecture) — TSDF + quadtree + keyframe pipeline
- [Quadtree-Image-Budget](Quadtree-Image-Budget) — contrast-based image-space GS allocation

### Project
- [SkelGS-SLAM: GSFusion 分析](10_Projects/SkelGS-SLAM/decision-log)
