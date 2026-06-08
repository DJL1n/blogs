---
title: "VPGS-SLAM: Voxel-based Progressive 3D Gaussian SLAM in Large-Scale Scenes"
date: 2026-06-08
updated: 2026-06-08
summary: VPGS-SLAM 是一个面向大规模室内/室外场景的 RGB-D / point-cloud 3DGS-SLAM 框架。核心：multi-submap + voxel-based progressive Gaussian representation + anchor-conditioned neural Gaussians + 2D-3D fusion tracking + BEV loop detection + voxel ICP / rendering-loss loop correction + online distillation submap fusion。

tags:
  - SLAM
  - dense-SLAM
  - RGB-D
  - 3DGS
  - Anchor-Structured
  - Loop-Closure
  - Keyframe
  - GS-SLAM
relatedNotes: []
category: 文献笔记
importance: 2
draft: false
type: note
---

# VPGS-SLAM: Voxel-based Progressive 3D Gaussian SLAM in Large-Scale Scenes

> arXiv 2025. 论文整理笔记。
> 📄 [PDF 原文](VPGS-SLAM.pdf)

## 0. 一句话结论

VPGS-SLAM 是一个面向大规模室内/室外场景的 RGB-D / point-cloud 3DGS-SLAM 框架。核心：multi-submap + voxel-based progressive Gaussian representation + anchor-conditioned neural Gaussians + 2D-3D fusion tracking + BEV loop detection + voxel ICP / rendering-loss loop correction + online distillation submap fusion。

定位：首个面向 indoor + outdoor large-scale 场景的 3DGS-based SLAM framework。

---

## 1. 核心问题

早期 3DGS-SLAM 三个瓶颈：Redundant Gaussians → memory explosion；Render-loss tracking 在 motion blur/exposure/dramatic movement 下不稳；长序列无全局一致性。

VPGS 设计：multi-submap 分摊 memory；voxel-anchor 组织 neural Gaussians；2D-3D fusion tracking；loop + submap fusion 保证全局一致。

---

## 2. Input/Output

### Input
RGB frames + 3D points + known intrinsics（RGB-D / point-cloud 级别）

### Output
Camera poses + structured 3D Gaussian scene + voxel anchors + submaps + loop-corrected global map

---

## 3. 总体 Pipeline

```
RGB + 3D points → tracking (2D coarse + 3D ICP fine + adaptive)
→ keyframe/submap management
→ voxel-based progressive mapping (voxelize → anchor → neural Gaussians → grow/prune)
→ BEV loop closure → PGO + Gaussian anchor transform
→ online distillation submap fusion
→ global consistent Gaussian map
```

---

## 4. 核心表示：Voxel-based Progressive 3D Gaussian

### Voxel → Anchor → Neural Gaussians
Point cloud → voxelization → voxel centers → anchors。每个 anchor: position + feature + scaling factor + learnable offsets。Gaussian 属性由 anchor feature + viewing distance + direction 通过 MLP decoder 预测。

### Multi-resolution voxel size
近处 fine voxel（细节），远处 coarse voxel（效率）。与 OG-Mapping / Scaffold-GS 思想一致但用于 online large-scale SLAM。

---

## 5. Multi-Submap Progressive Representation

Global map = {S_1, ..., S_n}。每个 submap: voxel anchors + features + neural Gaussians + local keyframes。相机离开当前 submap 时动态分配新 submap。非关键 submap 可 deactivate（降低 online memory）。

### Expansion
Opacity low / rendered depth ≠ input depth → sample points → voxelize → anchors。避免重复：仅在 radius 内无已有 anchor 时添加。

### Grow/Prune
Gradient > threshold → grow；Opacity 长期低 → prune。

---

## 6. 2D-3D Fusion Tracking

### Coarse: 2D photometric
Render RGB/depth vs input → rendering loss → coarse pose

### Fine: 3D voxel Gaussian ICP
Input point cloud + coarse pose → transform to global → NN search in voxel Gaussian map → robust ICP (Geman-McClure) → refine pose

### Adaptive selection
2D quality < threshold → skip coarse 2D → direct 3D ICP。Evidence-quality adaptive。

---

## 7. Loop Closure

### Detection
BEVPlace++ → BEV descriptor → submap-level cosine similarity

### Correction
2D rendering loss + voxel ICP → pose graph optimization → update both camera poses + Gaussian anchor transforms

---

## 8. Submap Fusion

Loop closure 后重叠 submaps → overlapping image pairs → 分别渲染 RGB/depth → distillation loss → 互相融合对齐。

---

## 9. 实验表现

| Dataset | ATE | PSNR | Memory |
|---|---|---|---|
| Replica | **0.21 cm** | 35.82 | 70.81 MB |
| ScanNet | **7.6 cm** | — | — |
| KITTI | — | **21.37** | — |

Replica ATE 0.21 优于 SplaTAM 0.41 / MonoGS 0.34 / Gaussian-SLAM 0.32。KITTI PSNR 21.37 远超早期 GS-SLAM（~14–15）。Memory 70.81 MB vs SplaTAM 273 MB。

---

## 10. 强项

1. **真正面向 large-scale 3DGS-SLAM** — indoor + outdoor city-scale
2. **Voxel-anchor 减少 Gaussian 冗余** — submap deactivate + O(N) memory
3. **2D-3D fusion tracking 更稳** — adaptive evidence quality
4. **Loop + submap fusion** — PGO + anchor transform + distillation

---

## 11. 局限

1. **非 monocular** — 需要 3D points / RGB-D
2. **依赖良好 3D point input** — noise/scale/dynamic 影响大
3. **Map/frame 仍不轻** — Replica ~0.93s
4. **动态物体非核心处理**

---

## 12. 对 SkelGS-SLAM 的启发

1. **Submap 不只是窗口，而是 local geometry unit** — voxel anchors + submap lifecycle
2. **ChildGS 应由 voxel/anchor/LOD 控制** — 非 free Gaussian
3. **Tracking evidence 应 2D/3D quality adaptive** — 不同信号源动态权重
4. **Loop 后必须修 pose + Gaussian submap** — CoVersionedGeometryPacket 的系统意义
5. **Submap fusion 需要 distillation** — 不只是 pose 对齐

### 不建议照搬
- Predicted monocular depth → VPGS 3D input
- Voxel ICP without scale/static verification
- Loop fuse without geometry packet versioning

---

## 13. 最终定位

| 系统 | 定位 | 对 SkelGS-SLAM 价值 |
|---|---|---|
| **VPGS-SLAM** | **large-scale 3DGS-SLAM** | **submap/voxel-anchor/loop-fusion** |
| MGS-SLAM | monocular DPVO+MVS+GS | 最接近的系统参考 |
| OG-Mapping | octree anchor GS mapping | LOD growth |
| Scaffold-GS | anchor-conditioned GS | ChildGS 表示 |
| DPVO | temporal tracking | backbone |

---

## Related extracted notes

### Concepts
- [Submap-Geometry-Unit](Submap-Geometry-Unit) — submap as local geometry unit with voxel anchors
- [2D-3D-Fusion-Tracking](2D-3D-Fusion-Tracking) — evidence-quality adaptive tracking

### Methods
- [Large-Scale-GS-SLAM-Architecture](Large-Scale-GS-SLAM-Architecture) — VPGS large-scale pipeline
- [Submap-Fusion-Distillation](Submap-Fusion-Distillation) — online distillation for GS submap merge

### Project
- [SkelGS-SLAM: VPGS-SLAM 分析](10_Projects/SkelGS-SLAM/decision-log)
