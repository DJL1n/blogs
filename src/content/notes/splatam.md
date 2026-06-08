---
title: "SplaTAM: Splat, Track & Map 3D Gaussians for Dense RGB-D SLAM"
date: 2026-06-08
updated: 2026-06-08
summary: SplaTAM 是一个 RGB-D dense SLAM 系统，核心是直接把 3D Gaussian Splatting 当作地图表示，用可微 Gaussian rasterization 同时做 camera tracking 和 map optimization。不是单目 SLAM，不是 learned VO 前端。

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

# SplaTAM: Splat, Track & Map 3D Gaussians for Dense RGB-D SLAM

> CVPR 2024. 论文整理笔记。
> 📄 [PDF 原文](SplaTAM.pdf)

## 0. 一句话结论

SplaTAM 是一个 RGB-D dense SLAM 系统，核心是直接把 3D Gaussian Splatting 当作地图表示，用可微 Gaussian rasterization 同时做 camera tracking 和 map optimization。不是单目 SLAM，不是 learned VO 前端。

核心：RGB-D input + explicit 3D Gaussian map + differentiable color/depth/silhouette rendering + silhouette-masked tracking + depth-guided densification + RGB-D map optimization。

---

## 1. 核心问题

早期 radiance-field SLAM（iMAP, NICE-SLAM, Point-SLAM）用 implicit neural representation，计算慢、难编辑、不显式、易 catastrophic forgetting。3DGS 假设所有 training views 有已知 pose（COLMAP），SplaTAM 取消这个前提，在 RGB-D 位姿未知下同时估计 pose 和优化 Gaussian map。

---

## 2. 输入与输出

### 输入
RGB-D video stream + known camera intrinsics（unposed，但 depth 可用）

### 输出
1. Camera trajectory
2. Explicit 3D Gaussian map
3. Rendered RGB / depth / silhouette
4. Novel-view rendering

---

## 3. 地图表示：简化版 3D Gaussian

每个 Gaussian 仅 8 参数：RGB color (3) + center μ (3) + radius r (1) + opacity o (1)。Isotropic（各向同性），view-independent color。

vs vanilla 3DGS: anisotropic covariance + rotation + scale + SH color。SplaTAM 的简化利于在线优化。

---

## 4. 可微渲染

从 Gaussian map 渲染三种图：color image C(p), depth image D(p), silhouette image S(p)。Silhouette 累积 visibility/density presence，判断 pixel 是否已被 map 覆盖。

---

## 5. 总体 Pipeline

```
新 RGB-D frame
→ 1. Camera Tracking: 固定 Gaussian，优化 pose（仅 silhouette>0.99 区域算 loss）
→ 2. Gaussian Densification: silhouette low 或 depth 前方有新几何 → 新增 Gaussian
→ 3. Map Update: 固定 poses，优化 Gaussian params（选 overlap 大的 keyframes）
```

---

## 6. Camera Tracking

固定 Gaussian map，优化 camera pose。Loss: L_depth + 0.5 L_color（仅 S(p) > 0.99 的 pixels）。

Silhouette mask 捕捉 map 的 epistemic uncertainty。消融：不用 mask ATE=115.80cm，用 mask ATE=0.27cm。

Forward velocity propagation 做 pose 初始化。

---

## 7. Gaussian Densification

Densification mask：
1. Silhouette low: S(p) < 0.5（map 没覆盖）
2. Depth 前方有新几何: D_GT(p) < D_render(p) 且 depth error > λ median（λ=50）

与 Gaussian-SLAM 区别：SplaTAM 基于 silhouette/depth mask，更直接；Gaussian-SLAM 更强调 alpha + NN sparsity。

---

## 8. Map Update

优化 Gaussian params: μ, r, o, c。固定 poses。选 k 个 keyframes：current frame + most recent keyframe + overlap-top (k-2) previous keyframes。Overlap 计算：depth→point cloud → 多少点落在 keyframe frustum 内。

Cull 近 0 opacity 或过大 Gaussians。不用 silhouette mask（mapping 希望优化所有 pixels）。RGB loss 加 SSIM。

---

## 9. 消融关键

Replica/Room0:
- 只用 depth: ATE 86.03 cm, 直接失败
- 只用 color: ATE 1.38 cm, Depth L1 12.58 cm, PSNR 31.30
- Color + depth: ATE 0.27 cm, Depth L1 0.49 cm, PSNR 32.81

结论：RGB render loss 不能自动保证几何正确；depth/geometric loss 对 geometry 很关键。

---

## 10. 实验表现

### Tracking ATE RMSE
| Dataset | SplaTAM | Point-SLAM | ESLAM |
|---|---|---|---|
| ScanNet++ | **1.2 cm** | 343.8 cm | — |
| Replica | **0.36 cm** | 0.52 cm | 0.63 cm |
| TUM-RGBD | 5.48 cm | 8.92 cm | — |
| Orig-ScanNet | 11.88 cm | 12.19 cm | — |

### Novel view rendering (ScanNet++)
- SplaTAM: 24.41 dB PSNR (novel), 27.98 dB (training)
- Point-SLAM: 11.91 dB (novel), 14.46 dB (training, w/ GT depth)

### Runtime (Replica, RTX 3080 Ti)
- SplaTAM: tracking 1.00s/frame, mapping 1.44s/frame
- SplaTAM-S: tracking 0.19s/frame, mapping 0.33s/frame

---

## 11. 强项

1. **显式 Gaussian map 适合在线 SLAM** — 渲染快、可微快、可显式判断 map 覆盖
2. **Silhouette mask 是非常有效的 tracking gate** — 消融证明关键
3. **RGB + depth 共同约束不可替代** — 各有所用
4. **Gaussian densification 直接** — silhouette + depth discrepancy
5. **Novel view rendering 很强**

---

## 12. 局限

1. **需要 dense depth + known intrinsics** — 非 monocular
2. **对 motion blur / depth noise / 激进旋转敏感** — 无 learned temporal optimizer
3. **无 loop closure / global BA** — 长序列 drift 可能累积
4. **Gaussian 是 rendering primitive，非严格 surface**
5. **动态物体无显式建模**

---

## 13. 与 Gaussian-SLAM 区别

| | SplaTAM | Gaussian-SLAM |
|---|---|---|
| Map | single global Gaussian map | active/inactive sub-maps |
| Gaussian | isotropic | anisotropic |
| 核心机制 | silhouette mask | alpha + NN sparsity |
| Densification | silhouette + depth | alpha + NN check |
| Tracking | render-and-optimize | render-and-optimize |

---

## 14. 对 SkelGS-SLAM 的启发

### 最值得借鉴
1. **Silhouette/alpha 是 GS feedback 的安全门** — 只有 map 覆盖区域才参与 tracking loss
2. **Densification mask → monocular Gaussian birth gate**
   - rendered alpha low + certified geometry packet → Gaussian birth
3. **RGB-only render quality ≠ geometry good** — PSNR 高 ≠ depth/geometry 可靠
4. **Map update 选 overlap keyframes** — current + recent + overlap-top

### 合理架构
```
RGB → DPVO/DROID (temporal tracking)
     → MASt3R/depth-normal (geometry proposal)
     → CertifiedGeometryPacket (certification)
     → CertifiedAnchor (local support)
     → SplaTAM-like GS backend (render + alpha-gated feedback)
```

### 定位
SplaTAM = GS backend / silhouette-gated tracking / densification reference
不是 monocular frontend / temporal optimizer / geometry certifier

---

## Related extracted notes

### Concepts
- [Silhouette-Map-Coverage](Silhouette-Map-Coverage) — silhouette as map coverage / epistemic uncertainty signal for GS-SLAM
- [Isotropic-GS-SLAM](Isotropic-GS-SLAM) — simplified isotropic Gaussian for online SLAM

### Methods
- [Silhouette-Gated-Tracking](Silhouette-Gated-Tracking) — tracking with strict silhouette mask for map-based feedback
- [RGB-D-Densification-Mask](RGB-D-Densification-Mask) — silhouette + depth discrepancy for online Gaussian densification

### Project
- [SkelGS-SLAM: SplaTAM 分析结论](10_Projects/SkelGS-SLAM/decision-log)
