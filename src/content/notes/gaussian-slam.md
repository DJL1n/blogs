---
title: "Gaussian-SLAM: Photo-realistic Dense SLAM with Gaussian Splatting"
date: 2026-06-08
updated: 2026-06-08
summary: Gaussian-SLAM 是一个 RGB-D dense SLAM 系统，用 3D Gaussian Splatting 作为地图表示，同时做 tracking、mapping 和 photo-realistic rendering。不是单目 SLAM，不是 DROID/DPVO 那种 learned VO 前端，也不是 Scaffold-GS 那种离线 novel view synthesis。

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

# Gaussian-SLAM: Photo-realistic Dense SLAM with Gaussian Splatting

> ECCV 2024. 论文整理笔记。
> 📄 [PDF 原文](Gaussian-SLAM.pdf)
> 作者：Vladimir Yugay, Yue Li, Theo Gevers, Martin R. Oswald.

## 0. 一句话结论

Gaussian-SLAM 是一个 RGB-D dense SLAM 系统，用 3D Gaussian Splatting 作为地图表示，同时做 tracking、mapping 和 photo-realistic rendering。不是单目 SLAM，不是 DROID/DPVO 那种 learned VO 前端，也不是 Scaffold-GS 那种离线 novel view synthesis。

核心：RGB-D SLAM + 3D Gaussian map + submap-based online optimization + depth/color rendering loss + alpha/error-masked frame-to-model tracking。

---

## 1. 核心问题

Vanilla 3DGS 是离线渲染方法（COLMAP + 已知 poses + 全局优化），与 SLAM 场景冲突：序列式输入、pose 在线估计、不能每帧全局重训、Gaussian map 不能全放 GPU。

Gaussian-SLAM 的改造：
- RGB-D depth 直接 seed 新 Gaussians
- Sub-map 限制在线优化规模
- Rendered alpha mask + NN search 控制新增 Gaussian
- Depth rendering/depth loss 让 Gaussian map 编码几何
- Rendered color+depth 做 frame-to-model tracking

---

## 2. 输入与输出

### 输入
RGB-D sequence + camera intrinsics（非 monocular）

### 输出
1. Estimated camera trajectory
2. Active/inactive Gaussian sub-maps
3. Photo-realistic rendered RGB views
4. Rendered depth views
5. Mesh (TSDF fusion over rendered depths)

---

## 3. 总体 Pipeline

```
RGB-D frame → keyframe判断
→ tracking: active sub-map render → color/depth loss → optimize pose
→ mapping: back-project to dense point cloud → color gradient + alpha + NN check → seed new Gaussians → add to active sub-map
→ sub-map optimization: contributing keyframes' RGB-D loss → optimize Gaussian params
→ sub-map switching: motion threshold → new sub-map
```

---

## 4. 地图表示

### Gaussian 参数
μ (mean), Σ (covariance via R S S^T R^T), α (opacity), c (RGB color, 无 SH 以加速在线优化)。

### Sub-map 组织
全局 map = sub-map 1 + sub-map 2 + ... + active sub-map。新 sub-map 在 translation/Euler angle 超阈值时创建。任意时刻只处理 active sub-map。

---

## 5. Gaussian Seeding

### 第一个 keyframe
Uniform sample + high color-gradient region sample。

### 后续 keyframes
1. Render active sub-map → alpha map
2. Alpha 低于阈值的区域 → sample RGB-D points
3. NN search：搜索半径内无邻居 → 添加新 Gaussian（anisotropic, scale 由 NN distance 定义）

与 vanilla 3DGS 不同：不照搬 gradient split/clone。

---

## 6. Sub-map Optimization

优化变量：μ, scale/rotation, α, c。不 clone/prune（保留 depth sensor geometry density）。

至少 40% iterations 用在新 keyframe 上（避免新帧 underfit）。

---

## 7. 几何与颜色编码

Rendered depth = along-ray weighted average of Gaussian depths。Loss: L_map = λ_color (weighted L1 + SSIM) + λ_depth L_depth + λ_iso L_iso。

Isotropic regularization 防止 sparsely seeded Gaussians 过度 elongated。

---

## 8. Tracking

Frame-to-model tracking：constant speed init → 冻结 Gaussian → 优化 pose。

Loss: color error + depth error。使用 soft alpha mask（map 覆盖区域权重大）和 error/inlier mask（剔除大残差 pixel）。

Ablation：不用 mask ATE=12.77cm → 用 mask ATE=2.50cm (TUM fr1/desk)。

---

## 9. Keyframe / Sub-map 机制

- 每 5 帧 keyframe
- Sub-map 由 translation/Euler angle threshold 控制
- FAISS GPU NN search 做候选点选择
- Alpha threshold 控制 seeding

---

## 10. 实验表现

### Replica rendering
| Method | PSNR | SSIM | LPIPS |
|---|---|---|---|
| NICE-SLAM | 24.42 | 0.809 | 0.233 |
| ESLAM | 28.06 | 0.923 | 0.245 |
| Point-SLAM | 35.17 | 0.975 | 0.124 |
| SplaTAM | 34.11 | 0.97 | 0.10 |
| **Gaussian-SLAM** | **42.08** | **0.996** | **0.018** |

### Replica tracking ATE (cm)
- Gaussian-SLAM: **0.31**
- SplaTAM: 0.36, Point-SLAM: 0.52, ESLAM: 0.63

### TUM RGB-D ATE RMSE
- Gaussian-SLAM: 2.9 cm (avg), Point-SLAM: 3.0, SplaTAM: 3.3

### Runtime (Replica, A6000)
- Mapping: 24 ms/it, 0.93 s/frame
- Tracking: 14 ms/it, 0.83 s/frame
- Rendering: 2175 FPS

---

## 11. 强项

1. **Photo-realistic rendering 很强** — 显著超过早期 neural dense SLAM
2. **3DGS representation 适合实时渲染** — final rendering 2175 FPS
3. **Sub-map 让在线优化可扩展** — 只优化 active sub-map
4. **Controlled seeding 比 gradient densification 更适合 SLAM** — RGB-D + alpha + NN
5. **Alpha/error mask tracking 实用** — 只信任已重建+低残差区域

---

## 12. 局限

1. **RGB-D，非 monocular** — 核心依赖 depth sensor
2. **Tracking 仍受 motion blur 和 depth quality 影响**
3. **无 loop closure / global BA** — trajectory drift 不可避免
4. **Geometry 好但不是严格 surface representation** — Gaussian centers ≠ surface samples
5. **不显式处理动态物体**

---

## 13. 与相关工作的关系

| | vs 3DGS | vs ESLAM | vs SplaTAM | vs Scaffold-GS |
|---|---|---|---|---|
| 核心 | 离线→在线 | implicit→explicit | concurrent GS-SLAM | offline→online GS |
| Tracking | 无→frame-to-model | render-based | similar | N/A |
| Seeding | gradient | N/A | similar | anchor-conditioned |

---

## 14. 对 SkelGS-SLAM 的启发

### 最值得借鉴
1. **Controlled Gaussian seeding** — alpha mask + NN sparsity check，不照搬 gradient split
2. **Alpha mask for tracking feedback** — 避免坏/未完成 map 污染 pose/depth
3. **Sub-map active optimization** — 只优化当前活跃区域

### 合理迁移方向
RGB-D depth → Gaussian seeding → 改为 certified geometry packet → Gaussian seeding

### 不建议照搬
- RGB-D point cloud → seed Gaussian（你的系统无真实 depth）
- Render-and-optimize tracking（DPVO/DROID 更适合 monocular）

### 定位
Gaussian-SLAM = GS mapping / online Gaussian seeding / submap optimization reference
DPVO/DROID = temporal tracking backbone
MASt3R/depth-normal = geometry proposal source
CertifiedGeometryPacket = monocular geometry certification layer

---

## Related extracted notes

### Concepts
- [Submap-Gaussian-Organization](Submap-Gaussian-Organization) — submap-based Gaussian map for scalable SLAM
- [GS-Birth-Gate](GS-Birth-Gate) — controlled Gaussian seeding with alpha mask + NN check

### Methods
- [Render-and-Optimize-Tracking](Render-and-Optimize-Tracking) — frame-to-model tracking with alpha/error masks
- [Online-GS-Seeding-Strategy](Online-GS-Seeding-Strategy) — RGB-D driven controlled Gaussian seeding

### Project
- [SkelGS-SLAM: Gaussian-SLAM 分析结论](10_Projects/SkelGS-SLAM/decision-log)
