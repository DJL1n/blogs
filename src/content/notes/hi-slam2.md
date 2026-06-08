---
title: "HI-SLAM2: Geometry-Aware Gaussian SLAM for Fast Monocular Scene Reconstruction"
date: 2026-06-08
updated: 2026-06-08
summary: HI-SLAM2 是一个 RGB-only monocular dense Gaussian SLAM 系统。核心：DROID-like dense tracking + monocular depth/normal priors + JDSA grid-scale alignment + online PGBA + 3DGS mapping + Gaussian deformation after pose updates + offline full BA + joint pose-map refinement。

tags:
  - SLAM
  - dense-SLAM
  - monocular
  - 3DGS
  - Loop-Closure
  - Keyframe
  - GS-SLAM
relatedNotes: []
category: 文献笔记
importance: 2
draft: false
type: note
---

# HI-SLAM2: Geometry-Aware Gaussian SLAM for Fast Monocular Scene Reconstruction

> IEEE T-RO 2025 / ICRA 2026. 论文整理笔记。
> 📄 [PDF 原文](HI-SLAM2.pdf)

## 0. 一句话结论

HI-SLAM2 是一个 RGB-only monocular dense Gaussian SLAM 系统。核心：DROID-like dense tracking + monocular depth/normal priors + JDSA grid-scale alignment + online PGBA + 3DGS mapping + Gaussian deformation after pose updates + offline full BA + joint pose-map refinement。

对你而言是目前最重要的系统级参考之一 — 与你"monocular + dense/sparse tracking + predicted depth + GS + scale alignment + global correction"的路线高度重合。

---

## 1. 系统定位

Monocular RGB dense SLAM + learning-based dense tracking + depth/normal priors + 3DGS mapping + online loop closure + offline full refinement。

---

## 2. 总体 Pipeline

```
RGB → Online tracker (DROID-like dense + monocular priors + JDSA)
     → Online loop closing (PGBA + scale correction)
     → Continuous mapper (aligned depth → 3DGS + depth/normal/scale losses)
     → Map update after pose changes (deform Gaussian mean/orientation/scale)
     → Offline refinement (post-keyframes + full BA + joint pose-map)
     → TSDF fusion from rendered depths → mesh
```

---

## 3. JDSA: Joint Depth and Scale Alignment ★ 核心创新

Monocular depth prior 有 spatially varying scale distortion，single scale alignment 不够。

HI-SLAM2 为每个 depth prior 估计一个 2D depth scale grid。每个 pixel scale = bilinear interpolation of grid coefficients。Scale alignment 和 local BA 交替进行，不是全塞进一个大优化里（避免 scale drift 和收敛困难）。

与 MGS-SLAM 的 mean/std sparse-dense alignment 相比，JDSA 更细 — 允许 spatially varying 而非全局单一 scale。

---

## 4. Online Tracking

DROID-like recurrent optical flow → dense per-pixel correspondences → keyframe graph BA (pose + inverse depth)。Keyframe 触发后提取 monocular depth prior（进入 tracking/BA/JDSA）和 normal prior（进入 mapper）。

---

## 5. Online Loop Closing: PGBA

Loop candidates by: flow distance + orientation difference + frame gap。PGBA with scale correction: per-keyframe scale adjustment + relative pose factors from dense correspondences。PGBA 后: depth maps scale update + Gaussian primitives deform。

---

## 6. 3DGS Map

### Unbiased depth rendering
Ray-Gaussian intersection depth（not Gaussian center z）。显著改善 depth accuracy。

### Gaussian deformation after pose correction
Mean / orientation / scale 根据 anchor keyframe pose change 显式变形。保留几何关系，适应 refined poses。

### Gaussian insertion
Aligned depth → backproject → downsample → pos init。Unit orientation, NN scale init, opacity 0.5, RGB from keyframe。

### Losses
Photometric L1 + depth + normal (cosine embedding) + scale regularization。

---

## 7. Offline Refinement

Post-keyframe insertion (coverage gaps) + full BA (all overlapping pairs) + joint pose-map refinement (Adam, rasterization pose Jacobians)。

---

## 8. 实验表现

### Tracking
| Dataset | HI-SLAM2 | Comparison |
|---|---|---|
| Replica | **0.26 cm** | SplaTAM 0.36, DROID-SLAM 0.33, MGS-SLAM 0.32 |
| ScanNet | **7.07 cm** | GO-SLAM 8.10, Splat-SLAM 7.58 |

### Geometry (Replica)
Accuracy **1.57 cm**, Completeness 3.49 cm, Completion ratio 85.25% — 明显优于 HI-SLAM / GO-SLAM / Splat-SLAM。

### JDSA ablation
- One-scale prior: Abs Diff 0.147
- Scale-grid prior: 0.074
- BA + JDSA: 0.046
- Final rendered depth: **0.015**

---

## 9. 强项

1. **单目 RGB 下几何和渲染都强** — 不是 trade-off
2. **JDSA 是关键模块** — spatially varying scale alignment
3. **Gaussian map 跟随 pose graph 更新** — deformation
4. **Normal prior 进入 GS geometry** — 提升几何
5. **层级优化结构完整** — local BA → PGBA → full BA → joint refinement

---

## 10. 局限

1. **假设静态环境** — 无 dynamic ownership
2. **Loop detection 仍不够强** — proximity-based, ETH3D 有局限
3. **City-scale 仍需 submap** — optimization budget 限制
4. **Gaussian birth 仍基于 estimated depth** — 无 multi-source certified admission
5. **3DGS map memory / submap 问题存在**

---

## 11. 对 SkelGS-SLAM 的启发

### 最重要系统级参考之一
与你"monocular + dense/sparse tracking + predicted depth + GS + scale alignment + global correction"的路线高度重合。

### JDSA → 你的 scale/gauge certification
扩展为 multi-evidence Certified Scale Alignment: depth prior + DPVO patch depth + MASt3R pointmap + normal prior + GS rendered depth + anchor support。

### Gaussian deformation → CoVersionedGeometryPacket
Pose/depth version changed → child Gaussians inherit transform + stale Gaussians re-certified。

### 升级点：aligned depth → Gaussian → certified geometry → Gaussian
HI-SLAM2 的入口是 aligned estimated depth。你的入口应是 multi-source certified packet。

### Normal prior 支持你 depth-normal estimator
HI-SLAM2 用 normal 提升 geometry。你应继续放在 packet certification 中。

### Loop detection 可改进
MASt3R/LightGlue wide-baseline verification + dense graph correction。

---

## 12. 最终定位

| 系统 | 定位 | 对 SkelGS-SLAM 价值 |
|---|---|---|
| **HI-SLAM2** | **mono dense SLAM + priors + 3DGS** | **最重要系统参考 / JDSA / deformation** |
| MGS-SLAM | DPVO + MVS + GS | DPVO 路线参考 |
| GO-SLAM | dense + BA + SDF | global correction 参考 |
| MonoGS | monocular-first GS | map-centric 对比 |
| SplaTAM/GS-SLAM | RGB-D GS-SLAM | sensor depth baseline |

HI-SLAM2 是目前最接近"monocular RGB + dense tracking + predicted geometry + 3DGS + global correction"的完整系统。

你的研究空间在于：把它的"aligned estimated depth → Gaussian"升级成"multi-evidence certified geometry → Gaussian"。

---

## Related extracted notes

### Concepts
- [JDSA-Scale-Alignment](JDSA-Scale-Alignment) — spatially varying scale grid for monocular depth
- [Gaussian-Map-Deformation](Gaussian-Map-Deformation) — Gaussian mean/orientation/scale update after pose correction

### Methods
- [HI-SLAM2-Architecture](HI-SLAM2-Architecture) — hybrid online/offline monocular GS-SLAM pipeline
- [Certified-JDSA](Certified-JDSA) — extending JDSA to multi-evidence scale/gauge certification

### Project
- [SkelGS-SLAM: HI-SLAM2 分析](10_Projects/SkelGS-SLAM/decision-log)
