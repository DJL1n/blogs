---
title: "VarSplat: Uncertainty-aware 3D Gaussian Splatting for Robust RGB-D SLAM"
date: 2026-06-08
updated: 2026-06-08
summary: VarSplat = RGB-D submap GS-SLAM (LoopSplat/Gaussian-SLAM style) + 每个 Gaussian 学一个 appearance variance σ² + 用 total variance law 通过 alpha compositing 渲染 per-pixel uncertainty + 用于 tracking / loop detection / submap registration 的三级加权。不是 monocular / 不处理动态 / 但 reliability 作为 primitive-level state 的设计非常值得借鉴。

tags:
  - GS-SLAM
relatedNotes: []
category: 文献笔记
importance: 2
draft: false
type: note
---

# VarSplat: Uncertainty-aware 3D Gaussian Splatting for Robust RGB-D SLAM

> arXiv 2026-03. RGB-D submap GS-SLAM + learned per-splat appearance variance.
> 📄 [PDF 原文](VarSplat.pdf)

## 0. 一句话结论

VarSplat = RGB-D submap GS-SLAM (LoopSplat/Gaussian-SLAM style) + 每个 Gaussian 学一个 appearance variance σ² + 用 total variance law 通过 alpha compositing 渲染 per-pixel uncertainty + 用于 tracking / loop detection / submap registration 的三级加权。不是 monocular / 不处理动态 / 但 reliability 作为 primitive-level state 的设计非常值得借鉴。

---

## 1. 解决什么问题

低纹理、反光、透明、深度边界、遮挡边缘的像素在 photometric tracking 中不可靠。现有 3DGS-SLAM 多数隐式处理 measurement reliability。VarSplat：让 3DGS map 自己学 appearance variance，在 tracking / loop / registration 中降权不可靠区域。

---

## 2. 与 WildGS / CG-SLAM 的区别

| 方法 | uncertainty 来源 | 用途 |
|---|---|---|
| WildGS-SLAM | DINOv2 / pretrained features | 动态过滤 |
| CG-SLAM | depth-driven geometric uncertainty | tracking / Gaussian selection |
| **VarSplat** | **per-splat learned appearance variance** | **tracking + loop + registration** |

VarSplat: uncertainty 是 Gaussian primitive 可学习参数，不是外部预测器。

---

## 3. Pipeline

```
RGB-D → submaps (Gaussian-SLAM/LoopSplat style)
  → each Gaussian: μ, α, Σ, SH + σ² (appearance variance)
  → mapping: jointly optimize pose + geometry + SH + σ²
  → tracking: freeze σ², render uncertainty map, weight RGB-D loss
  → loop detection: submap-level reliability from per-splat variance → rescore descriptors
  → submap registration: uncertainty-weighted photometric loss
  → TSDF fusion → global GS refinement (no uncertainty weights)
```

---

## 4. 核心机制

### Per-splat appearance variance σ²
每个 Gaussian 额外参数，表示该 splat 平均颜色周围的观测不确定性。不是 spatial covariance，不是 SH color。

### Total variance law → per-pixel uncertainty
Var(Y) = E[Var(Y|X)] + Var(E[Y|X]) → per-pixel variance = expected per-splat variance + variance from splat color mixture。通过 alpha blending 的一阶/二阶矩得到 differentiable per-pixel uncertainty map。

### Variance training
NLL-style (square L2 + log σ²)。RGB + depth 梯度都更新 σ²。不同纹理、反光、透明、depth boundary 区域自动学出高 variance。

### Uncertainty-aware tracking
Median-centered log scaling → per-pixel confidence weight。高 variance pixel 降权，低 variance pixel 强约束。RGB 比 depth 更容易受视角变化影响 → 用 uncertainty 加权 RGB。

### Uncertainty-aware loop detection
Per-splat variance → submap reliability ratio → rescore NetVLAD similarity。高 variance overlap → 不可靠 loop candidate。

### Uncertainty-aware submap registration
Variance-derived per-pixel weight in photometric registration loss。

### Submap + global map
Submap-based (centroid/tracking uncertainty threshold)。TSDF fusion → global Gaussian init → color-only refinement。

---

## 5. 实验

### Tracking (ATE RMSE)
| Dataset | VarSplat | LoopSplat | CG-SLAM | Gaussian-SLAM |
|---|---|---|---|---|
| Replica | **0.23 cm** | 0.26 | 0.27 | 0.31 |
| ScanNet++ | **1.69 cm** | 2.05 | — | 2.68 |
| TUM-RGBD | **3.20 cm** | 3.33 | 4.0 | — |
| ScanNet | **6.5 cm** | 7.7 | 8.1 | — |

### Ablation (ScanNet)
| Setting | ATE |
|---|---|
| No uncertainty | 8.20 |
| Tracking only | 7.63 |
| T + Loop | 7.49 |
| T + Loop + Registration | **6.53** |
| Without freeze variance | 7.17 |

### Rendering (Replica)
| Method | PSNR | SSIM |
|---|---|---|
| VarSplat | 37.15 | 0.986 |
| LoopSplat | 36.67 | 0.983 |

VarSplat 主要收益在 tracking/alignment robustness，rendering 小幅提升。

---

## 6. 强项

1. **Uncertainty 是 map-native** — 每个 Gaussian 内 σ²，不是外部预测器
2. **Total variance law** — 数学上贴合 alpha compositing
3. **三级使用** — tracking + loop + registration
4. **真实 noisy / large-motion 数据上收益明显** — ScanNet++ 2.05→1.69 cm

---

## 7. 局限

1. **RGB-D 依赖** — mono scale 不解决
2. **主要 appearance variance，非完整 geometry uncertainty**
3. **计算/显存成本增加** — mapping 1.9 s/frame
4. **默认静态** — dynamic 不处理
5. **Learned variance 可能被当成"残差垃圾桶"** — NLL 形式可缓解，但风险存在

---

## 8. 对 SkelGS-SLAM 的启发

### ★ 每个 map primitive 应有 reliability state
VarSplat 的 anchor = position + normal + scale + confidence + dynamic-risk + appearance variance + support count + error count + birth packet id。anchor 不只是几何点，是带 uncertainty 的长期 primitive。

### ★ 分层使用 uncertainty
Pre-GS uncertainty: DPVO/DROID residual + depth-normal consistency + MASt3R pairwise + anchor repeatability + dynamic-risk。
Post-GS uncertainty: VarSplat-style appearance variance，只用于 GS backend，不反向改 pose/depth/anchor。

### ★ 三级 uncertainty 使用
Short-range: DPVO/DROID window residual weighting。
Mid-range: submap overlap / anchor registration。
Long-range: retrieval/loop verification。

### AnchorReliability admission gate
temporal_repeatability + depth_scale_consistency + normal_stability + flow_support - dynamic_risk - appearance_variance - occlusion_boundary_risk。
low → weak candidate；medium → local support only；high → mature read-only + GS birth。

### 不能直接借：GS-rendered uncertainty 反向控制 pose/depth/anchor
VarSplat 在 RGB-D coupled GS-SLAM 中合理，但你当前 no GS feedback 边界是其逆方向。

---

## 9. 53 → 54 篇

VarSplat 很值得作为 "anchor primitive 必须携带 uncertainty state" 的参考，但不适合作为单目前端几何认证主线。

---

## Related extracted notes

### Concepts
- [Primitive-Level-Reliability](Primitive-Level-Reliability) — 每个 anchor/Gaussian 应有 uncertainty state
- [Appearance-vs-Geometry-Uncertainty](Appearance-vs-Geometry-Uncertainty) — 两层 uncertainty 分开建模

### Methods
- [VarSplat-Architecture](VarSplat-Architecture) — per-splat variance + total variance law + 三级 uncertainty
- [AnchorReliability-Admission-Gate](AnchorReliability-Admission-Gate) — 将 VarSplat 的 reliability 改为 anchor admission 证据

### Project
- [SkelGS-SLAM: VarSplat 分析](10_Projects/SkelGS-SLAM/decision-log)
