---
title: "GSO-SLAM: Bidirectionally Coupled Gaussian Splatting and Direct Visual Odometry"
date: 2026-06-08
updated: 2026-06-08
summary: "GSO-SLAM 是一个 real-time monocular dense SLAM 系统。核心：DSO direct VO + 2DGS under EM bidirectional coupling。不是 naive \"VO frontend + GS backend\" — DSO semi-dense depth 约束 GS，GS rendered depth 反过来初始化 / 正则 DSO depth。不引入额外深度预测网络。"

tags:
  - SLAM
  - dense-SLAM
  - monocular
  - 3DGS
  - Online
  - GS-SLAM
relatedNotes: []
category: 文献笔记
importance: 2
draft: false
type: note
---

# GSO-SLAM: Bidirectionally Coupled Gaussian Splatting and Direct Visual Odometry

> IEEE RA-L 2026. 论文整理笔记。
> 📄 [PDF 原文](GSO-SLAM.pdf)

## 0. 一句话结论

GSO-SLAM 是一个 real-time monocular dense SLAM 系统。核心：DSO direct VO + 2DGS under EM bidirectional coupling。不是 naive "VO frontend + GS backend" — DSO semi-dense depth 约束 GS，GS rendered depth 反过来初始化 / 正则 DSO depth。不引入额外深度预测网络。

---

## 1. 系统定位

Monocular RGB dense SLAM + direct visual odometry (DSO) + 2D Gaussian Splatting mapping + EM-based bidirectional coupling。

---

## 2. 核心问题

松耦合 VO+GS (VO→GS) 信息共享差。完全耦合 GS tracking 计算高。GSO-SLAM：用 DSO 已计算的 semi-dense depth / gradients / pixel associations 初始化 GS，让 GS rendered depth 反过来帮助 DSO，不提计算成本。

---

## 3. EM Formulation

### E-step: fix P,D → optimize G (GS mapping)
Loss: RGB L1+SSIM + semi-dense depth L1 + normal consistency

### M-step: fix G → optimize P,D (DSO BA + depth reg)
Depth init = weighted average of DSO depth + GS rendered depth
GS feedback: pseudo-observation, not direct writeback

---

## 4. Gaussian Splat Initialization ★

DSO 已有 image gradients、keyframe poses、pixel associations：
- Image gradients → 2D covariance Σ2D of projected splat
- Multiple keyframes → consolidate to 3D covariance Σ3D
- Eigen-decomposition → rotation R + scale S
- Min scale → 0 (2DGS style surface splat)

Ablation: KNN init 需额外 2700 iters; constant init 需 1200; proposed init 0 extra。

---

## 5. 为什么用 2DGS

2DGS ray-splat intersection → more multi-view consistent depth + better geometry for SLAM/surface reconstruction。省略 SH 降低复杂度。

---

## 6. Tracking

DSO two-frame direct image alignment → pose。Keyframe selection: FoV change / translation / exposure。Local BA: pose + brightness + inverse depth + intrinsics。

---

## 7. 实验表现

### Tracking
| Dataset | GSO-SLAM | Best mono baseline |
|---|---|---|
| Replica | **0.46 cm** | Photo-SLAM 1.03, MonoGS 17.03 |
| INS Corridor | **0.64 m** | Photo-SLAM w/LC 3.12, MonoGS 9.48 |

### Mapping (Replica)
PSNR **34.48**, SSIM 0.943, Depth L1 8.12 cm, **30 FPS**。
MonoGS: 0.84 FPS, SplaTAM: 0.21 FPS。GSO-SLAM 比 MonoGS 快 36×。

### Joint opt ablation
w/o: PSNR 34.10, ATE 0.688, Depth L1 9.744
w/: PSNR 34.48, ATE 0.462, Depth L1 8.124

---

## 8. 强项

1. **VO-GS 双向耦合** — EM framework，不是单向
2. **无额外深度网络** — 纯 DSO + 2DGS
3. **Gaussian 初始化很有价值** — 从前端 gradients/associations 估计 shape
4. **速度快** — 30 FPS, parallel E-step
5. **2DGS 更适合 direct VO coupling**

---

## 9. 局限

1. **Direct method 对光照/噪声/模糊敏感** — tracking accuracy < feature-based
2. **Semi-dense 高梯度像素限制** — textureless 区域 coverage 不足
3. **无显式 dynamic handling**
4. **无强 loop closure / global BA**
5. **非 metric-depth** — monocular scale
6. **GS depth 反馈仍可能污染前端** — 无 CertifiedPacket gate

---

## 10. 对 SkelGS-SLAM 的启发

### EM coupling 参考，但需加强安全门
GSO-SLAM 的 EM 不是 simple VO→GS。你的版本：E-step update GS only from CertifiedGeometryPacket; M-step update CandidateGeometry only using gated GS evidence。

### Gaussian 初始化不应只是 center birth
前端已有 gradients/associations/poses → 应初始化 covariance/orientation/scale。你的 ChildGS birth 可以借鉴：从 local image/geometry structure 初始化 shape，而不是 isotropic random。

### Semi-dense 局限支持你的 anchor skeleton
DSO 在 textureless 区域 coverage 不足 → 你需要更广覆盖的多源 certification。

### 不可替代 DPVO
DSO 受 motion blur/noise/exposure/dynamic 影响，DPVO/DROID 更适合主 temporal backbone。

---

## 11. 最终定位

| 系统 | 定位 | 对 SkelGS-SLAM 价值 |
|---|---|---|
| **GSO-SLAM** | **DSO+2DGS EM coupling** | **bidirectional coupling / GS init reference** |
| MGS-SLAM | DPVO+MVS+GS | DPVO 路线参考 |
| HI-SLAM2 | dense+priors+GS | geometry alignment |
| MonoGS | GS map-centric | mono GS baseline |
| GS-SDF/GPS-SLAM | geometry-first | teacher/residual |

---

## Related extracted notes

### Concepts
- [EM-VO-GS-Coupling](EM-VO-GS-Coupling) — bidirectional VO-GS information exchange under EM
- [Frontend-Gaussian-Initialization](Frontend-Gaussian-Initialization) — using VO gradients/associations for GS shape init

### Methods
- [GSO-SLAM-Architecture](GSO-SLAM-Architecture) — DSO + 2DGS + EM pipeline
- [Certified-EM-Coupling](Certified-EM-Coupling) — translating EM coupling to CertifiedGeometryPacket framework

### Project
- [SkelGS-SLAM: GSO-SLAM 分析](10_Projects/SkelGS-SLAM/decision-log)
