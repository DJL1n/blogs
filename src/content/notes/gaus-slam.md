---
title: "GauS-SLAM: Dense RGB-D SLAM with Gaussian Surfels"
date: 2026-06-08
updated: 2026-06-08
summary: GauS-SLAM 是一个 RGB-D dense SLAM，核心是用 2D Gaussian surfel 替代普通 3D Gaussian，通过 surface-aware depth rendering（unbiased depth + depth adjustment + depth normalization）+ local map tracking 让 Gaussian map 能更可靠地参与相机位姿跟踪。不是 monocular / 不是实时高频 / 但证明了 Gaussian depth 几何一致性决定 tracking 质量。

tags:
  - GS-SLAM
relatedNotes: []
category: 文献笔记
importance: 2
draft: false
type: note
---

# GauS-SLAM: Dense RGB-D SLAM with Gaussian Surfels

> arXiv 2025. 论文整理笔记。
> 📄 [PDF 原文](GauS-SLAM.pdf)

## 0. 一句话结论

GauS-SLAM 是一个 RGB-D dense SLAM，核心是用 2D Gaussian surfel 替代普通 3D Gaussian，通过 surface-aware depth rendering（unbiased depth + depth adjustment + depth normalization）+ local map tracking 让 Gaussian map 能更可靠地参与相机位姿跟踪。不是 monocular / 不是实时高频 / 但证明了 Gaussian depth 几何一致性决定 tracking 质量。

---

## 1. 解决什么问题

3D Gaussian 的 depth rendering 在 SLAM tracking 中有三个问题：

1. **Geometry distortion** — 椭球 depth 随视角变化，rendered depth 有 bias
2. **Depth blending 污染** — 后景 Gaussian 即使权重小也会拉偏 depth
3. **Global map 干扰** — 被遮挡/不相关的 high-opacity Gaussian 仍会干扰 tracking

GauS-SLAM：2D Gaussian surfel + surface-aware depth rendering + local map。

---

## 2. Pipeline

```
RGB-D frame → constant velocity init
→ front-end local map tracking on 2D Gaussian surfels
    → surface-aware rendering (unbiased depth + adj + norm)
    → pose optimization (opacity ≥ 0.9 pixels only)
→ keyframe selection
→ incremental surfel attachment (opacity < 0.6) + edge growth
→ local map full → send to back-end
→ back-end: merge into global map
    → NetVLAD co-visible submap selection
    → submap BA + random optimization + final refinement
    → opacity < 0.05 pruning
```

---

## 3. 核心机制

### 2D Gaussian Surfel
替代 3D ellipsoid。每个 surfel = center + two tangent vectors + scale + rotation + opacity + color/SH。Ray 与 surfel 平面求交 depth（unbiased），不是 Gaussian center depth。

### Surface-Aware Depth Rendering ★
- **Unbiased depth**: ray-surfel intersection depth
- **Depth adjustment**: median depth 判断主要 visible surface → 远离 median 的 Gaussian 降权
- **Depth normalization**: 消除 accumulated opacity 差异导致的 depth scale bias

Ablation: w/o Unbiased Depth ATE 2.10 mm → full 0.60 mm；w/o Depth Normalization 1.92 mm。

### Camera Tracking
Frame-to-local-map。Tracking loss 只作用在 accumulated opacity 大于 0.9 的像素。不依赖 global map。

### Incremental Mapping
- Surfel attachment: opacity < 0.6 → depth backprojection → new surfel
- Edge growth: opacity 0.4–0.6 → rendered depth 作为伪 depth → 沿边界扩展
- Surfle 初始 orientation 来自 surface normal，scale 来自局部表面

### Local Map Front-End
每个 local map 有 RKF (reference keyframe)。Tracking 只在 local map 上做。Local map full → 送 backend merge → 新 local map。

### Back-End Merge + Submap BA
Local map → opacity reset 0.01 → merge into global → NetVLAD co-visible submap → BA → pruning (opacity < 0.05) → random optimization → final refinement。

---

## 4. 实验

### Replica
| Method | PSNR | ATE | Depth L1 | F1 |
|---|---|---|---|---|
| SplaTAM | 34.11 | 0.36 cm | 0.72 | 86.1 |
| Gaussian SLAM | 42.08 | 0.31 cm | 0.68 | 88.9 |
| **GauS-SLAM** | 40.25 | **0.06 cm** | **0.43** | **90.5** |

### ScanNet++ (前 250 帧)
| Method | Avg ATE |
|---|---|
| SplaTAM | 89.41 cm |
| MonoGS | 12.88 cm |
| LoopSplat | 2.05 cm |
| **GauS-SLAM** | **0.31 cm** |

### Depth rendering ablation
| Variant | ATE | PSNR |
|---|---|---|
| w/o Unbiased Depth | 2.10 mm | 36.06 |
| w/o Depth Adjustment | 0.85 mm | 38.10 |
| w/o Depth Normalization | 1.92 mm | 35.98 |
| Full | **0.60 mm** | **38.04** |

---

## 5. 强项

1. **Surface-aware depth rendering** — 明确分析 depth distortion 对 tracking 的破坏，做针对性修正
2. **2D Gaussian surfel** — 比 3D ellipsoid 更贴合表面，depth 更稳定
3. **Local map tracking** — 隔离 global map 干扰，Ablation 证明 fr3/office 绕物体场景 ATE 从 1.43cm→5.29cm 恶化
4. **Tracking 精度很高** — Replica 0.06 cm，ScanNet++ 0.31 cm

---

## 6. 局限

1. **RGB-D 依赖** — mono scale 不解决
2. **不是实时高频** — tracking ~1 s/frame
3. **对 motion blur / exposure variation / depth quality 敏感**
4. **Map merging 仍有冗余 Gaussian**
5. **Coupled GS tracking** — 和你的 no-GS-feedback 安全边界冲突

---

## 7. 对 SkelGS-SLAM 的启发

### ★ Rendered depth 必须为 tracking 服务，且必须多视角一致
GS PSNR 好 ≠ GS depth 可用于 pose。应设计 cross-view depth consistency 作为诊断指标。

### 2D Gaussian surfel 可作为 anchor-consumption primitive
Anchor → birth 2D surfel（normal/tangent/scale from certified packet）→ GS 只优化 appearance + small geometry correction。

### Local map = bounded-lag submap
Tracking 基于局部可见 map，不是 global map。与你 bounded-lag submap / no global writeback 一致。

### Surface-aware depth rendering → diagnostic
用 GauS-SLAM 的 geometry consistency test 作为 evaluation：局部 GS map → render depth → compare with frontend depth → 分析哪些 primitive 导致 geometry distortion。

### 不能直接借：coupled GS tracking
GauS-SLAM 是 GS 直接参与 tracking（coupled），你的安全边界是 GS 只消费 certified packet。它适合作为 "为什么 GS geometry 要可靠" 的证据，不是 mainline 架构。

---

## 8. 43 → 44 篇

| 系统 | 定位 |
|---|---|
| GSFusion | TSDF + GS hybrid |
| **GauS-SLAM** | **2D surfel + surface-aware depth** |

---

## Related extracted notes

### Concepts
- [Surface-Aware-Depth-Rendering](Surface-Aware-Depth-Rendering) — unbiased depth + adj + norm for tracking-grade GS
- [Local-Map-Tracking](Local-Map-Tracking) — tracking on local visible GS, not global map

### Methods
- [GauS-SLAM-Architecture](GauS-SLAM-Architecture) — 2D surfel + local map + submap backend
- [Surfel-Anchor-Bridge](Surfel-Anchor-Bridge) — translating 2D surfel to anchor-consumed primitive

### Project
- [SkelGS-SLAM: GauS-SLAM 分析](10_Projects/SkelGS-SLAM/decision-log)
