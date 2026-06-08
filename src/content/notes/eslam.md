---
title: "ESLAM: Efficient Dense SLAM System Based on Hybrid Representation of Signed Distance Fields"
date: 2026-06-08
updated: 2026-06-08
summary: ESLAM 是一个 RGB-D neural implicit dense SLAM 系统。核心不是 DROID 那种 learned dense BA，也不是 MASt3R 那种 two-view pointmap prior，而是用多尺度 tri-plane 特征 + shallow MLP decoder + TSDF 直接监督的高效 hybrid implicit representation，替代 iMAP/NICE-SLAM 中较重的 MLP 或 voxel-grid。

tags:
  - SLAM
  - dense-SLAM
  - RGB-D
  - Neural-Implicit
  - Online
  - Keyframe
  - GS-SLAM
relatedNotes: []
category: 文献笔记
importance: 2
draft: false
type: note
---

# ESLAM: Efficient Dense SLAM System Based on Hybrid Representation of Signed Distance Fields

> CVPR 2023 Highlight. 论文整理笔记。
> 📄 [PDF 原文](ESLAM.pdf)

## 0. 一句话结论

ESLAM 是一个 RGB-D neural implicit dense SLAM 系统。核心不是 DROID 那种 learned dense BA，也不是 MASt3R 那种 two-view pointmap prior，而是用多尺度 tri-plane 特征 + shallow MLP decoder + TSDF 直接监督的高效 hybrid implicit representation，替代 iMAP/NICE-SLAM 中较重的 MLP 或 voxel-grid。

压缩：RGB-D sequence → initialize pose + neural implicit TSDF map → tracking (Adam optimize pose by rendering loss) → mapping (optimize feature planes + shallow decoders + selected poses) → SDF volume rendering → marching cubes mesh。

---

## 1. 核心问题

iMAP / NICE-SLAM 的问题：
- **iMAP**: 大 MLP 表示全场景，易遗忘、优化慢、细节有限
- **NICE-SLAM**: voxel grid features O(L³) 增长，高分辨率显存/计算成本高，frozen pre-trained MLP 泛化受限

ESLAM 的改动：TSDF 替代 occupancy/density；axis-aligned feature planes 替代 3D voxel grid；shallow two-layer MLP 替代大 MLP；geometry/appearance 分开；tracking/mapping 用同一套 global loss。

---

## 2. 输入与输出

### 输入
- RGB-D frames (连续帧，初始位姿未知)
- 非 monocular，依赖 depth sensor

### 输出
1. camera poses {R_i | t_i}
2. implicit TSDF field ϕ_g
3. RGB appearance field ϕ_a
4. rendered depth / color
5. final dense mesh (marching cubes)

---

## 3. 核心表示：Hybrid Representation of SDF

### Tri-plane feature
三组正交平面存储场景特征：XY, XZ, YZ plane。任意 3D 点 p 投影到三个平面做 bilinear interpolation，特征相加后输入 decoder。

voxel grid: O(L³) vs tri-plane: O(3L²)。

### Multi-scale
- geometry: coarse (24 cm) + fine (6 cm)
- appearance: coarse (24 cm) + fine (3 cm)
- 所有 feature planes 32 channels

### Geometry / appearance 分离
Geometry planes 负责 TSDF，appearance planes 负责 RGB。Appearance 变化更频繁，分开可缓解 geometry forgetting。

---

## 4. TSDF 表示

ϕ_g(p) = 0: surface；> 0: free space；< 0: inside；|ϕ_g(p)| = 1: truncation distance T = 6 cm。

TSDF 有明确的 signed distance supervision，可直接用 RGB-D depth 构造 per-point loss，收敛比 occupancy/density 更快。

---

## 5. Shallow Decoders

两个 two-layer MLP（hidden 32 channels）：
- h_g: f_g(p) → TSDF ϕ_g(p)
- h_a: f_a(p) → raw RGB ϕ_a(p)

表达能力主要来自 feature planes，decoder 只负责 decode。优化更快、局部更新更直接。

---

## 6. SDF-based Volume Rendering

SDF → density: σ(p_n) = β · Sigmoid(-β · ϕ_g(p_n))，β 为 learnable sharpness。

Volume rendering 累积：
- rendered color: ĉ = Σ w_n · ϕ_a(p_n)
- rendered depth: d̂ = Σ w_n · z_n

---

## 7. Sampling 策略

每条 ray 两类点：stratified samples + importance/near-surface samples。

有 GT depth 时在 depth 附近 truncation band 均匀采样；无 GT depth 时基于 stratified weights 做 importance sampling。

Replica: N_strat=32, N_imp=8; ScanNet/TUM: N_strat=48, N_imp=8。

---

## 8. Loss Functions

L = λ_fs L_fs + λ_T-m L_T-m + λ_T-t L_T-t + λ_d L_d + λ_c L_c

Tracking 和 mapping 使用相同 global objective，weights 不同。

### Free-space loss L_fs
Camera center 到 measured surface 之间的点 → TSDF → 1。

### Truncation-region loss L_T
Surface 附近 truncation band 内的点，用 depth measurement 近似 signed distance。分 middle (L_T-m) 和 tail (L_T-t)。Mapping 时降低 tail 权重减少 occlusion artifacts。

### Rendered depth loss L_d
‖d̂(r) - D(r)‖²，只在有 measured depth 的 rays 上。

### Rendered color loss L_c
‖ĉ(r) - I(r)‖²，在所有 rays 上。

---

## 9. Mapping

优化变量：geometry/appearance feature planes + decoders + selected camera poses。

从 W 个 frames 中随机选 pixels：current frame + previous two keyframes + W-3 random keyframes。同时优化所有 scene parameters 和 camera poses（无需 staged optimization）。

---

## 10. Tracking

Adam optimizer，基于 global loss 做 gradient-based pose optimization。不用 second-order optimizer，不用 manifold operations。

Outlier 定义：|measured depth - rendered depth| > 10 × median rendered depth error。

与 DROID 完全不同：ESLAM 是 render-and-compare，DROID 是 recurrent correspondence + differentiable dense BA。

---

## 11. 实验表现

### Replica 平均
| Metric | iMAP* | NICE-SLAM | ESLAM |
|---|---|---|---|
| Depth L1 | 8.23 cm | 3.29 cm | **1.18 cm** |
| ATE Mean | 2.59 cm | 1.56 cm | **0.52 cm** |
| ATE RMSE | 3.42 cm | 2.05 cm | **0.63 cm** |

### ScanNet 平均
| Metric | iMAP* | NICE-SLAM | ESLAM |
|---|---|---|---|
| ATE Mean | 22.2 cm | 9.3 cm | **6.5 cm** |
| ATE RMSE | 26.6 cm | 10.7 cm | **7.4 cm** |

### Runtime (Replica room0)
| | iMAP* | NICE-SLAM | ESLAM |
|---|---|---|---|
| FPT | 5.20 s | 2.10 s | **0.18 s** |
| Parameters | 0.22M | 12.18M (O(L³)) | **6.79M (O(L²))** |

实验平台 RTX 3090。

---

## 12. 强项

1. **TSDF 让几何收敛更快** — depth measurement → explicit signed distance supervision
2. **Tri-plane 降低 memory growth** — O(L³) → O(L²)
3. **Geometry/appearance 解耦** — 缓解 geometry forgetting
4. **不需要 pre-training** — 在线优化，无 frozen decoder
5. **输出 dense mesh** — marching cubes 提取连续 surface

---

## 13. 局限

1. **RGB-D 系统，非单目** — 无 depth sensor 时 TSDF/free-space/truncation loss 不成立
2. **Tracking 不是强几何优化器** — Adam 优化，无 DROID-style recurrent BA trace
3. **动态场景无显式建模** — 有 outlier rejection 但非 dynamic-aware
4. **Large-scale 仍是 O(L²)** — 优于 O(L³) 但非 sublinear
5. **Mesh 好 ≠ radiance/rendering 最优** — 非 GS 优化目标

---

## 14. 与 NICE-SLAM / iMAP 区别

| | iMAP | NICE-SLAM | ESLAM |
|---|---|---|---|
| 表示 | single large MLP | hierarchical voxel grid | multi-scale tri-plane |
| Decoder | 大 MLP | frozen pre-trained | shallow train-from-scratch |
| Memory growth | N/A | O(L³) | O(L²) |
| 几何监督 | volume rendering | volume rendering | TSDF direct |

---

## 15. 与 DROID-SLAM 区别

| | DROID-SLAM | ESLAM |
|---|---|---|
| 输入 | mono/stereo/RGB-D | RGB-D |
| 核心 | dense correlation + recurrent + DBA | TSDF neural implicit + differentiable rendering |
| 状态 | pose + per-pixel depth | pose + feature planes + decoders |
| 强项 | tracking, temporal optimization | dense surface reconstruction, efficient implicit mapping |

---

## 16. 与 MASt3R-SLAM 区别

| | MASt3R-SLAM | ESLAM |
|---|---|---|
| 输入 | monocular RGB | RGB-D |
| 核心 | two-view pointmap prior | TSDF neural implicit field |
| Tracking | ray-based matching | render-and-optimize |
| 定位 | 前端几何 prior 系统 | RGB-D implicit dense mapping 系统 |

---

## 17. 与 S3LAM 区别

S3LAM: ORB-SLAM2 + semantic clusters + planar BA
ESLAM: neural implicit TSDF field + dense RGB-D mapping

S3LAM 关注 semantic/object/structure prior；ESLAM 关注 dense continuous SDF representation。

---

## 18. 与 GS-SLAM / 3DGS 的关系

### 可借鉴点

1. **Geometry/appearance 分离** — 不要让 color/render loss 过早支配 geometry birth
2. **Free-space supervision** — ray before surface: 不应 birth opaque Gaussians
3. **Near-surface truncation band** — surface-near: high confidence; tail: lower; occlusion: reject
4. **Smooth implicit surface prior** — Gaussian anchors 不应完全独立 birth，应有局部 smooth surface/tangent prior

---

## 19. 对 SkelGS-SLAM 的启发

### 不适合作为主基座
ESLAM 是 RGB-D neural implicit dense SLAM，不解决 monocular scale，不提供 DROID/DPVO 的 temporal tracking signal。

### 适合作为 geometry certification 思想来源

CertifiedGeometryPacket 可加以下 gate：
- **free-space check**: points z < z_s - τ 应为空
- **surface-band check**: points |z - z_s| < τ 应有 support
- **tail check**: farther from surface band → weak/ignore
- **occlusion check**: inconsistent depth behind visible surface → 不应 birth GS

### 支持判断
"Geometry 先于 rendering" — 不应让 GS render loss 修复坏 geometry，应先有 geometry packet / anchor certification。

### 可作为 RGB-D oracle / upper-bound baseline
回答：有真实 depth sensor 和 TSDF supervision 时 dense map 能做到什么质量？

---

## 20. 最终定位

| 系统 | 定位 |
|---|---|
| MASt3R-SLAM | strong monocular two-view pointmap prior |
| DROID-SLAM | dense recurrent pose-depth optimization |
| DPVO | lightweight sparse patch recurrent VO |
| S3LAM | semantic cluster + structural plane prior |
| **ESLAM** | **RGB-D TSDF neural implicit dense mapping** |

对 SkelGS-SLAM 的价值：
- tracking/temporal anchor support: **DROID/DPVO**
- two-view robust geometry: **MASt3R**
- semantic/structure grouping: **S3LAM**
- surface-band/free-space/implicit dense geometry regularization: **ESLAM**

---

## Related extracted notes

### Concepts
- [Tri-Plane-Feature](Tri-Plane-Feature) — axis-aligned tri-plane feature representation
- [TSDF-Direct-Supervision](TSDF-Direct-Supervision) — TSDF 直接几何监督

### Methods
- [Free-Space-Surface-Band-Gating](Free-Space-Surface-Band-Gating) — free-space + truncation-band + occlusion gate 设计
- [Geometry-Appearance-Decoupling](Geometry-Appearance-Decoupling) — 几何与外观特征解耦

### Project
- [SkelGS-SLAM: ESLAM 分析结论](10_Projects/SkelGS-SLAM/decision-log)
