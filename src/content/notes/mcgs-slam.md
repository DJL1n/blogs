---
title: "MCGS-SLAM: A Multi-Camera SLAM Framework Using Gaussian Splatting for High-Fidelity Mapping"
date: 2026-06-08
updated: 2026-06-08
summary: MCGS-SLAM 是一个纯 RGB 多相机 GS-SLAM 系统。核心：用 synchronized calibrated multi-camera rig 的 temporal + cross-view dense BA (MCBA) + JDSA depth-scale alignment + 3DGS mapping，缓解单目 GS-SLAM 的尺度漂移、覆盖不足和侧向结构缺失。不是 monocular / 不是纯单目前端创新 / 但 JDSA 和 pose-depth co-refinement 设计非常值得借鉴。

tags:
  - GS-SLAM
relatedNotes: []
category: 文献笔记
importance: 2
draft: false
type: note
---

# MCGS-SLAM: A Multi-Camera SLAM Framework Using Gaussian Splatting for High-Fidelity Mapping

> arXiv 2025-09. Multi-camera RGB 3DGS-SLAM.
> 📄 论文全文：arXiv 2509.14191

## 0. 一句话结论

MCGS-SLAM 是一个纯 RGB 多相机 GS-SLAM 系统。核心：用 synchronized calibrated multi-camera rig 的 temporal + cross-view dense BA (MCBA) + JDSA depth-scale alignment + 3DGS mapping，缓解单目 GS-SLAM 的尺度漂移、覆盖不足和侧向结构缺失。不是 monocular / 不是纯单目前端创新 / 但 JDSA 和 pose-depth co-refinement 设计非常值得借鉴。

---

## 1. 与单目 GS-SLAM 的根本区别

| | 单目 GS-SLAM | MCGS-SLAM |
|---|---|---|
| 输入 | 一个 RGB 流 | 同步多相机 RGB rig |
| 视场 | 有限 | 宽 FoV (前/左/右) |
| 几何约束 | temporal pairs only | temporal pairs + cross-view pairs |
| 尺度 | monocular scale ambiguity | 多相机冗余缓解，JDSA 对齐 |
| 侧向覆盖 | 容易缺失 | 多相机覆盖 alley / corners / overhead |
| 对齐变量 | camera pose | body pose (camera extrinsic 固定) |

---

## 2. Pipeline

```
Synchronized multi-camera RGB
  → RFT optical flow → keyframe selection (multi-camera keyframe)
  → Metric3Dv2 → depth + normal
  → JDSA depth-scale alignment (与 BA 交替)
  → MCBA (temporal + cross-view dense BA, body pose + inverse depth)
  → refined depth → unproject → Gaussian initialization
  → densification + pruning
  → pose-consistent Gaussian update (keyframe anchor → GS)
  → offline: global BA + joint pose-GS refinement
```

---

## 3. 核心机制

### MCBA (Multi-Camera Bundle Adjustment) ★
联合优化 body poses + per-view inverse depths。两类 residual：
- **Temporal pairs**: same camera, different time (body motion)
- **Cross-view pairs**: same time, different camera (fixed extrinsic)
Weighted photometric reprojection loss，damped Gauss-Newton + Schur complement。

### JDSA (Joint Depth-Scale Alignment) ★
Metric3Dv2 depth 有跨相机/跨帧 scale inconsistency。JDSA: per-pixel/grid scale factor × D_pred，与 MCBA 交替执行。不把 scale factor 直接塞进 BA → 更稳定。

### Metric3Dv2 depth/normal prior
每个 keyframe 每个 camera 预测 depth + normal。不是 sensor depth，是 learned prior。

### Multi-Camera Gaussian Mapping
Refined depth → unproject → init Gaussian (mean from 3D point, cov from 3NN)。Densification + pruning 交替维护 compact map。

### Pose-Consistent Gaussian Update
Keyframe pose 更新 → 相对变换传播给该 keyframe anchor 的所有 Gaussians。Scale 变化 → rescale ellipsoids。

### Gaussian rendering loss
RGB + depth + normal + scale reg。Unbiased intersection depth (ray-Gaussian ellipsoid surface)。

### Offline refinement
Global BA + joint pose + exposure + GS map refinement。

---

## 4. 实验

### Waymo (PSNR/SSIM/LPIPS/ATE)
| Method | PSNR | SSIM | LPIPS | ATE |
|---|---|---|---|---|
| NICER-SLAM | 23.34 | 0.712 | 0.379 | 14.906 |
| MonoGS | 24.08 | 0.705 | 0.376 | 9.459 |
| Splat-SLAM | 24.50 | 0.775 | 0.331 | 1.861 |
| DROID-Splat | 25.62 | 0.801 | 0.382 | — |
| HI-SLAM2 | — | — | — | 1.473 |
| **MCGS-SLAM (ours)** | **26.50** | 0.801 | **0.293** | **1.298** |

MCGS-SLAM PSNR 和 LPIPS 最优，SSIM 与 DROID-Splat 持平但低于 GLORIE-SLAM (0.900)。非所有指标第一，但覆盖率更好。

### JDSA ablation (Waymo)
| Setting | PSNR | SSIM | LPIPS |
|---|---|---|---|
| w/o Depth + w/o JDSA | 25.01 | 0.751 | 0.404 |
| w/ Depth + w/o JDSA | 27.02 | 0.809 | 0.271 |
| **full** | **27.17** | **0.816** | **0.262** |

Depth 带来大幅提升，JDSA 在此基础上继续改善 consistency。

---

## 5. 强项

1. **MCBA: temporal + cross-view dense BA** — 单目无法获得的跨视角几何约束
2. **JDSA 独立性** — depth scale factor 不与 BA 暴力联合，交替优化更稳
3. **宽 FoV / 侧向覆盖** — 多相机重建 alley/corners/overhead，单目做不到
4. **Pose-consistent GS update** — keyframe anchor → GS 变换传播
5. **Geometric loss 丰富** — RGB+depth+normal+scale reg

---

## 6. 局限

1. **依赖 synchronized calibrated multi-camera rig** — 非单目通用
2. **依赖 Metric3Dv2 depth predictor** — predictor 错误会污染 tracking
3. **不专门处理动态场景**
4. **Online + offline 结果需区分** — offline refinement 对质量提升明显
5. **GPU memory 压力** — 3/5 相机已有压力

---

## 7. 对 SkelGS-SLAM 的启发

### ★ JDSA → 你的 scale alignment gate
Depth predictor 输出不应直接作为 certified depth。应设独立 scale alignment + consistency check → 再进入 CertifiedGeometryPacket。

### ★ MCBA → 多证据 BA
你的单目系统不能做 cross-view pairs，但可以改造成：DPVO/DROID temporal residual + depth-normal predictor residual + anchor repeatability residual + loop/retrieval residual。

### ★ Pose-depth co-versioned packet
MCGS-SLAM 的 MCBA+JDSA 本质是 pose 和 depth co-refined。对应你的 CertifiedGeometryPacket 应包含：T_cw version + depth version + normal version + scale-grid version + confidence version。pose 和 depth 不能分开更新。

### ★ Gaussian birth after refined geometry
Gaussian 初始化必须在 geometry 通过认证之后，不是之前。与你的 "GS fixed consumption only after explicit admission" 一致。

### ★ Pose-consistent GS update
Keyframe anchor → GS 变换传播可借鉴到你的 anchor skeleton：anchor 更新 → child GS 跟随。

---

## 8. 51 → 52 篇

MCGS-SLAM 从另一个方向说明：GS-SLAM 的真正瓶颈仍然是进入 Gaussian 之前的 geometry packet 是否一致。

---

## Related extracted notes

### Concepts
- [MCBA-Cross-View-Constraint](MCBA-Cross-View-Constraint) — temporal + cross-view dense BA
- [Pose-Depth-Co-Versioning](Pose-Depth-Co-Versioning) — pose 和 depth 必须 co-refined，不可分开

### Methods
- [MCGS-SLAM-Architecture](MCGS-SLAM-Architecture) — MCBA + JDSA + multi-camera GS mapping
- [JDSA-Scale-Alignment-for-CertifiedPacket](JDSA-Scale-Alignment-for-CertifiedPacket) — 独立的 depth scale alignment 作为 packet 认证环节

### Project
- [SkelGS-SLAM: MCGS-SLAM 分析](10_Projects/SkelGS-SLAM/decision-log)
