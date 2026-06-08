---
title: "GS-SLAM: Dense Visual SLAM with 3D Gaussian Splatting"
date: 2026-06-08
updated: 2026-06-08
summary: GS-SLAM 是一个 RGB-D dense visual SLAM 系统，核心把 3DGS 作为场景地图表示，用可微 splatting 同时支持 RGB-D 渲染、camera tracking、mapping 优化和 Gaussian 增删。不是 monocular SLAM / DPVO/DROID learned VO / offline NVS。

tags:
  - SLAM
  - dense-SLAM
  - RGB-D
  - 3DGS
  - Online
  - Keyframe
  - GS-SLAM
relatedNotes: []
category: 文献笔记
importance: 2
draft: false
type: note
---

# GS-SLAM: Dense Visual SLAM with 3D Gaussian Splatting

> CVPR 2024. 论文整理笔记。
> 📄 [PDF 原文](GS-SLAM.pdf)

## 0. 一句话结论

GS-SLAM 是一个 RGB-D dense visual SLAM 系统，核心把 3DGS 作为场景地图表示，用可微 splatting 同时支持 RGB-D 渲染、camera tracking、mapping 优化和 Gaussian 增删。不是 monocular SLAM / DPVO/DROID learned VO / offline NVS。

定位：RGB-D 条件下的 3DGS-SLAM early baseline / backend reference。

---

## 1. 系统定位

RGB-D dense SLAM + explicit 3D Gaussian map + differentiable splatting tracking + adaptive online mapping。输入 sequential RGB-D + known intrinsics，输出 camera trajectory + 3D Gaussian map。

---

## 2. Input/Output

### Input
RGB-D sequence + known intrinsics K

### Output
Camera trajectory, 3D Gaussian map, rendered RGB/depth, mesh evaluation, novel-view rendering。

---

## 3. 总体 Pipeline

```
RGB-D frame → constant velocity pose init
→ tracking: render RGB-D from Gaussian map → coarse-to-fine pose opt
→ keyframe decision
→ mapping: expand Gaussians (add + delete) → color + depth loss optimization
→ BA: random keyframes → joint optimize poses + Gaussians
```

---

## 4. Gaussian 表示

Position μ + 3D covariance Σ (scale + quaternion) + opacity α + SH color (1-degree)。Color + depth splatting rendering。

---

## 5. Adaptive Gaussian Expansion

### First frame init
Uniform sample 50% pixels → depth back-project → Gaussian position。RGB init color, predefined opacity, density-based covariance。

### Adding step (subsequent keyframes)
Render RGB-D + cumulative opacity from existing Gaussians → unreliable pixels if:
- cumulative opacity too low (map not covered)
- rendered depth far from observed depth (geometry wrong/missing)
→ add new Gaussians from these regions

### Deleting step
Visible Gaussians → project to current depth → compare Gaussian depth with observed depth → if not near surface → reduce opacity (delete/weaken)。

Sensor-depth-gated: 核心安全来源是 RGB-D depth。

---

## 6. Mapping Loss

Photometric color loss + geometric depth loss。不只约束外观，也约束几何。

---

## 7. Tracking: Coarse-to-Fine

### Coarse stage
Uniform sampled pixels → low-cost render → coarse pose。减少 detailed artifacts 影响。

### Fine stage
Coarse pose + depth observation → select reliable 3D Gaussians → full-resolution render → refine pose。忽略 artifact-producing / noisy Gaussians。

核心：GS map feedback 必须被 gating；不能让坏 Gaussian 污染 pose。

---

## 8. BA: Random Keyframe Joint Optimization

Phase 1: fix poses, optimize Gaussians
Phase 2: optimize Gaussians + keyframe poses

基于 rendered RGB-D loss 的 keyframe-level joint optimization，非 DROID-style correspondence BA。

---

## 9. 实验表现

### Runtime
- System: ~8.34 FPS
- Tracking iteration: ~11.9 ms
- Mapping iteration: ~12.8 ms
- Render: ~400 FPS
- Gaussian map memory: ~198 MB (主要来自 SH coefficients)

### Mapping (Replica)
- Depth L1: 1.16 cm
- Precision: 74.0%

---

## 10. 强项

1. **证明 3DGS 可进入 RGB-D SLAM 主循环**
2. **Splatting 渲染比 NeRF ray marching 更适合在线**
3. **Adaptive expansion: adding + deletion 是在线 GS mapping 基础**
4. **Coarse-to-fine tracking：GS feedback 必须 gated**

---

## 11. 局限

1. **依赖 RGB-D depth** — Gaussian init/expansion/deletion 都依赖 sensor depth
2. **Memory 较大** — ~198 MB, SH coefficient 是主因
3. **无强全局 loop closure / global BA**
4. **Gaussian 是 rendering primitive，非严格 surface**
5. **不显式处理动态场景**

---

## 12. 对比

| | GS-SLAM | SplaTAM | Gaussian-SLAM | MonoGS | OG-Mapping |
|---|---|---|---|---|---|
| Input | RGB-D | RGB-D | RGB-D | mono-first | RGB-D+pose |
| Gaussian | anisotropic+SH | isotropic | anisotropic | anisotropic | anchor-structured |
| Expansion | add+delete | silhouette+dt | alpha+NN | rendered dt guess | octree+LOD |
| Tracking | coarse-to-fine | silhouette mask | render+opt | direct GS Jacobian | external pose |
| Memory | ~198 MB | ~275 MB | submap | — | 34.6 MB |

---

## 13. 对 SkelGS-SLAM 的启发

1. **Gaussian birth 必须有 geometry gate** — GS-SLAM 用 sensor depth；你的系统用 CertifiedGeometryPacket
2. **GS feedback 必须只用 reliable Gaussians** — coarse-to-fine + alpha/confidence mask
3. **Adaptive deletion → anchor-level quarantine** — 错误反映到 anchor 可信度
4. **BA-like random keyframe → dynamic packet window** — 结合 GO-SLAM/OG-Mapping
5. **GS map 不能默认可信** — 支持"GS 不直接参与 CertifiedPacket"原则

### 不建议照搬
- RGB-D depth-driven birth/deletion
- Direct map-based tracking as main frontend
- SH-heavy explicit Gaussian without compression

---

## 14. 最终定位

| 系统 | 定位 |
|---|---|
| **GS-SLAM** | **RGB-D 3DGS SLAM early baseline** |
| SplaTAM | RGB-D + silhouette gate |
| Gaussian-SLAM | RGB-D + submap |
| MonoGS | monocular-first + covisibility |
| OG-Mapping | octree anchor + LOD |
| Scaffold-GS | anchor-conditioned offline GS |
| ContextGS | anchor-level compression |
| DPVO/DROID | temporal tracking |
| GO-SLAM | global correction |
| MASt3R/DUSt3R/Spann3R | geometry proposal |

---

## Related extracted notes

### Concepts
- [Adaptive-Gaussian-Expansion](Adaptive-Gaussian-Expansion) — adding + deletion for online GS mapping
- [Coarse-to-Fine-GS-Tracking](Coarse-to-Fine-GS-Tracking) — coarse-to-fine pose tracking with reliable Gaussian selection

### Methods
- [GS-SLAM-RGBD-Pipeline](GS-SLAM-RGBD-Pipeline) — GS-SLAM's full RGB-D pipeline with expansion/tracking/BA
- [VideoBuffer-to-GS-Feedback](VideoBuffer-to-GS-Feedback) — translating reliable Gaussian selection to feedback gate

### Project
- [SkelGS-SLAM: GS-SLAM (RGB-D) 分析](10_Projects/SkelGS-SLAM/decision-log)
