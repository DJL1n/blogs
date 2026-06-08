---
title: Gaussian Splatting SLAM (MonoGS)
date: 2026-06-08
updated: 2026-06-08
summary: Gaussian Splatting SLAM (MonoGS) 是第一个基于 3DGS 的在线 monocular SLAM 系统，也支持 RGB-D/stereo。核心是把 3DGS 作为 SLAM 的唯一地图表示，同时用于 tracking、mapping、keyframe management 和 novel view synthesis。

tags:
  - SLAM
  - monocular
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

# Gaussian Splatting SLAM (MonoGS)

> CVPR 2024. 论文整理笔记。
> 📄 [PDF 原文](MonoGS.pdf)

## 0. 一句话结论

Gaussian Splatting SLAM (MonoGS) 是第一个基于 3DGS 的在线 monocular SLAM 系统，也支持 RGB-D/stereo。核心是把 3DGS 作为 SLAM 的唯一地图表示，同时用于 tracking、mapping、keyframe management 和 novel view synthesis。

定位：monocular-first 3DGS SLAM + direct tracking against Gaussian map + analytic SE(3) camera-pose Jacobian + Gaussian covisibility keyframing。

---

## 1. 核心问题

原始 3DGS 离线、需已知 poses。MonoGS 关键问题：如何只用 3D Gaussians 同时完成 camera tracking、map construction、keyframe management 和 view synthesis？

---

## 2. 输入与输出

### 输入
Monocular RGB / RGB-D / Stereo（experimental）

### 输出
1. Camera trajectory
2. 3D Gaussian map
3. Novel-view RGB rendering
4. Depth rasterisation
5. Gaussian geometry visualization

---

## 3. 地图表示

3D Gaussians: color c + opacity α + mean μ_W + covariance Σ_W (anisotropic, 无 SH)。

SplaTAM 是 isotropic Gaussian；MonoGS 是 anisotropic 但省略 SH。

---

## 4. 总体 Pipeline

```
Input RGB/RGB-D → Tracking (pose opt)
→ Keyframing (Gaussian covisibility check)
→ Gaussian Insertion & Prune
→ Mapping (window optimization, keyframe management)
→ 3D Gaussian map
```

---

## 5. Tracking

只优化 camera pose，固定 Gaussian map。Monocular: min photometric residual L1。RGB-D: + geometric depth error。

**核心贡献：推导 3DGS 对 SE(3) camera pose 的 analytical Jacobian**（第一个针对 EWA splatting/3DGS 的 SE(3) camera-pose analytical Jacobian），用 Lie algebra minimal parameterisation。

Tracking 通常每帧至少 ~50 次 gradient descent iteration。

---

## 6. Keyframing: Gaussian Covisibility

触发条件：
1. 当前帧与上一 keyframe 的 Gaussian visibility IoU 低于阈值
2. 相对平移相对于 median depth 足够大

Covisibility 估计天然处理 occlusion（通过 alpha blending transmittance），无需额外启发式。

---

## 7. Gaussian Insertion & Pruning

### RGB-D
Depth backprojection → 3D point → Gaussian mean

### Monocular
1. 从当前 Gaussian map 渲染 depth
2. 有 depth estimate 的 pixels: 在该 depth 附近初始化 Gaussian（低方差）
3. 无 depth estimate 的 pixels: 在 rendered median depth 附近初始化（高方差）

**很危险** — 大量初始位置错误，靠后续优化和 pruning 清理。

### Pruning
- 最近 3 个 keyframes 内插入的 Gaussians
- 如果未被至少 3 个其他 frames 观测到 → prune（几何不稳定）

策略：insert many candidates → let optimisation + multi-view visibility reject unstable ones。

---

## 8. Mapping

Keyframes: W = W_k (current window) ∪ W_r (2 random historical keyframes)。

优化：selected keyframes' camera poses + Gaussian map G。目标：photometric residual + isotropic regularisation (+ geometric residual if depth available)。

---

## 9. Isotropic Regularisation

惩罚 Gaussian scale vector 与均值尺度的差异，鼓励接近球形。防止在线增量场景中 Gaussians 沿视线方向过度拉长（needle/elongated artifacts）。

**核心启示：GS photometric optimization 会制造几何假象；必须有几何 regularization/certification。**

---

## 10. 实验表现

### TUM RGB-D monocular ATE RMSE
- MonoGS: **3.96 cm**
- DSO: 4.72, DROID-VO: 5.14, DepthCov-VO: 5.43

### TUM RGB-D RGB-D ATE RMSE
- MonoGS: **1.47 cm** (优于 iMAP, NICE-SLAM, ESLAM, Point-SLAM 等)

### Replica RGB-D rendering
- MonoGS: PSNR **38.94**, SSIM 0.968, LPIPS 0.070, FPS **769**
- Point-SLAM: PSNR 35.17, FPS 1.33

### Convergence basin
3D Gaussian map 对 camera localisation 有明显更大的 convergence basin，优于 hash-grid SDF 和 MLP SDF。

---

## 11. 强项

1. **第一个真正 monocular-first 3DGS SLAM**
2. **3DGS 作为 tracking representation 的收敛盆大** — 优于 SDF/neural-field
3. **Gaussian covisibility 适合 keyframe management** — occlusion 由 alpha 自然处理
4. **直接处理复杂材质** — 透明、半透明、细线结构比 SDF 更自然

---

## 12. 局限

1. **无 loop closure** — local/windowed mapping
2. **Gaussian 不显式表示 surface/normal** — 需额外提取
3. **Monocular Gaussian insertion 很不安全** — 先 birth 后 prune
4. **Tracking 依赖 render-and-optimise** — 不如 learned temporal correspondence 鲁棒
5. **不是 dense geometry oracle** — center/scale/opacity ≠ surface

---

## 13. 对比

| | SplaTAM | MonoGS |
|---|---|---|
| 输入 | RGB-D | monocular-first |
| Gaussian | isotropic | anisotropic |
| 核心机制 | silhouette mask | analytic pose Jacobian |
| Keyframing | fixed interval | Gaussian covisibility |
| Regularisation | 无 | isotropic regularisation |

---

## 14. 对 SkelGS-SLAM 的启发

1. **3DGS 可以作为 tracking map** — convergence basin 大，GS feedback 不是完全不可用
2. **Gaussian covisibility → submap/keyframe overlap** — 基于 certified Gaussian 的 IoU
3. **Isotropic regularisation 是 GS 几何安全底线** — childGaussian scale 需 tangent-frame aligned
4. **"先 birth 后 prune" vs "先 certify 后 birth"** — 你的改进空间正在这里

### 合理组合
```
DPVO/DROID → temporal tracking
MASt3R → wide-baseline geometry
CertifiedGeometryPacket → certification gate
MonoGS-like GS backend → render + covisibility + regularisation
GS feedback → gated weak evidence only
```

### 定位
MonoGS = 3DGS map-centric SLAM reference / GS tracking convergence / covisibility / regularisation

---

## Related extracted notes

### Concepts
- [GS-Tracking-Representation](GS-Tracking-Representation) — 3DGS map as tracking representation with large convergence basin
- [Gaussian-Covisibility](Gaussian-Covisibility) — Gaussian covisibility for keyframe/overlap management

### Methods
- [MonoGS-Monocular-Insertion](MonoGS-Monocular-Insertion) — monocular Gaussian insertion with rendered depth + visibility pruning
- [Isotropic-Regularization](Isotropic-Regularization) — isotropic regularization to prevent ray-aligned elongation

### Project
- [SkelGS-SLAM: MonoGS 分析结论](10_Projects/SkelGS-SLAM/decision-log)
