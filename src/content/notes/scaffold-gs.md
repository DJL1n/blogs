---
title: "Scaffold-GS: Structured 3D Gaussians for View-Adaptive Rendering"
date: 2026-06-08
updated: 2026-06-08
summary: Scaffold-GS 是一个面向 novel view synthesis 的结构化 3D Gaussian 表示。不是 SLAM 系统。核心是用 sparse anchors 作为 scaffold/骨架，每个 anchor 局部生成 k 个 neural Gaussians，Gaussian 属性由 anchor feature + 当前视角方向 + 距离动态预测，渲染时只处理当前视锥内且 opacity 有意义的 Gaussians。

tags:
  - 3DGS
  - Anchor-Structured
  - GS-SLAM
relatedNotes: []
category: 文献笔记
importance: 2
draft: false
type: note
---

# Scaffold-GS: Structured 3D Gaussians for View-Adaptive Rendering

> CVPR 2024 Highlight. 论文整理笔记。
> 📄 [PDF 原文](Scaffold-GS.pdf)

## 0. 一句话结论

Scaffold-GS 是一个面向 novel view synthesis 的结构化 3D Gaussian 表示。不是 SLAM 系统。核心是用 sparse anchors 作为 scaffold/骨架，每个 anchor 局部生成 k 个 neural Gaussians，Gaussian 属性由 anchor feature + 当前视角方向 + 距离动态预测，渲染时只处理当前视锥内且 opacity 有意义的 Gaussians。

定位：vanilla 3DGS 的 free Gaussian cloud → anchor-conditioned Gaussian field。

---

## 1. 核心问题

Vanilla 3DGS 两个结构性问题：
1. **Gaussian 冗余严重** — 为拟合每个训练视角不断扩张/复制 Gaussian，存储大、扩展性差
2. **View-dependent effects 被静态"烘焙"进 Gaussian 参数** — SH color 和大量 Gaussian 硬拟合，大视角/多尺度/反光不稳

Scaffold-GS 目标：替代 vanilla 3DGS 的自由 Gaussian 组织方式。

---

## 2. 输入与输出

### 输入
- Posed images + COLMAP/SfM sparse point cloud
- 默认有 camera poses, intrinsics, training images
- 非 monocular SLAM 前端

### 输出
- 结构化 Gaussian 场景：anchors (position, feature, scale, offsets) + MLP predictors + render-time neural Gaussians

---

## 3. 核心表示：Anchor Scaffold + Neural Gaussians

两层结构：
- **Layer 1**: anchor scaffold — 稀疏 voxelized anchors 作为骨架
- **Layer 2**: neural Gaussians — 从 anchors 动态派生，视角相关属性

---

## 4. Anchor 初始化

SfM 点云 → voxelization: V = round(P/ε)·ε → 去重 → voxel centers as anchors。

每个 anchor v 包含：
- x_v: position
- f_v ∈ R³²: local context feature
- l_v ∈ R³: learnable scaling factor
- O_v ∈ R^{k×3}: k learnable local offsets (默认 k=10)

---

## 5. View-dependent Anchor Feature

每个 anchor 有 feature bank: {f_v, f_v↓1, f_v↓2}。

对当前相机位置 x_c，计算 distance δ_vc 和 direction d_vc。Tiny MLP F_w 预测融合权重：
{w, w1, w2} = Softmax(F_w(δ_vc, d_vc))

integrated anchor feature: f̂_v = w·f_v + w1·f_v↓1 + w2·f_v↓2

意义：同一 anchor 从不同距离/方向看，激活不同尺度/响应。

---

## 6. Neural Gaussian Derivation

每个 visible anchor 生成 k 个 neural Gaussians（默认 k=10）。

### 位置
μ_i = x_v + O_i · l_v (anchor center + offset × scale)

### 属性预测
MLPs 根据 f̂_v, δ_vc, d_vc 动态预测：
- F_α: opacity
- F_c: color
- F_s: scale
- F_q: quaternion

vanilla 3DGS: 属性固定；Scaffold-GS: 属性 = function(anchor feature, view direction, view distance)。

---

## 7. 渲染过滤

两层过滤：
1. **View frustum culling**: 只激活当前视锥内 anchors
2. **Opacity-based selection**: 只保留 opacity > 阈值的 neural Gaussians

Full filtering 可提升 FPS 近 2× (DB-PLAYROOM: 84→150 FPS)。

---

## 8. Loss

L = L1 + λ_SSIM L_SSIM + λ_vol L_vol

L_vol = Σ_i Prod(s_i) — volume regularization 鼓励 Gaussian 变小、减少冗余重叠。

设置：λ_SSIM=0.2, λ_vol=0.001。MLP: 2-layer, hidden dim 32。

---

## 9. Anchor Growing / Pruning

### Growing
1. Neural Gaussians 空间量化到 voxels
2. N 个 iteration 内累计 voxel 内 Gaussian 梯度
3. 平均梯度 > threshold 且 voxel 无 anchor → 添加新 anchor
4. 多分辨率 voxel grid：coarse 补 coverage，fine 补细节

### Pruning
- N 个 iteration 内 anchor 关联 neural Gaussians 的 opacity 累计一直很低 → 删除 anchor

### Observation threshold
- 只有被访问足够多次的 anchors 才允许 growing/pruning

---

## 10. 实验表现

### 质量

| Dataset | 3D-GS PSNR | Scaffold-GS PSNR |
|---|---|---|
| Mip-NeRF360 | 27.21 | 27.72 |
| Tanks&Temples | 23.14 | **24.04** |
| Deep Blending | 29.41 | **30.43** |

### 存储和速度

| Dataset | 3D-GS storage | Scaffold-GS storage | Reduction |
|---|---|---|---|
| Mip-NeRF360 | 721 MB | 171 MB | 4.2× |
| Tanks&Temples | 411 MB | 87 MB | 4.7× |
| Deep Blending | 676 MB | 66 MB | **10.2×** |

FPS 接近或略高于 3DGS。

### 多尺度场景 (BungeeNeRF)
- 3D-GS: 24.89 PSNR / 1606 MB
- Scaffold-GS: **27.01 PSNR / 203 MB** (7.9× reduction)

---

## 11. 强项

1. **表示更结构化** — anchor 约束 Gaussian 分布，不无组织漂移和膨胀
2. **存储显著更低** — 3.8× 到 10.2× storage reduction
3. **更适合 view-dependent effects** — opacity/scale/color/rotation 随视角/距离变化
4. **训练收敛更快** — anchor feature 编码局部结构
5. **Anchor feature 有可解释性** — K-means 聚类对应场景语义内容

---

## 12. 局限

1. **强依赖初始 SfM 点** — SfM 差则 scaffold coverage 差
2. **不是几何认证系统** — anchor 是 rendering anchor，非 certified geometric anchor
3. **不是在线 SLAM** — 默认有 COLMAP poses，不处理 online tracking/loop closure
4. **MLP 动态预测有额外复杂度**
5. **改善 view-adaptive rendering，但不保证真实几何更正确**

---

## 13. 与 vanilla 3DGS 核心区别

| | 3DGS | Scaffold-GS |
|---|---|---|
| Gaussian 组织 | 独立自由 | anchor-conditioned |
| 属性 | 固定优化 | 动态预测 (view-dependent) |
| 存储 | 大 (全部存) | 小 (anchor + MLP) |
| 视角适应 | SH color 硬拟合 | MLP 动态解码 |
| 生长 | densification (gradient) | gradient + observation gate |

---

## 14. 与 "Anchor Skeleton" 的区别

| | Scaffold-GS anchor | 你的 anchor skeleton |
|---|---|---|
| 目标 | rendering organization | geometry certification |
| 初始化 | SfM voxel | temporal tracking signal |
| 生长依据 | rendering gradient | track survival + residual + consistency |
| 剪枝依据 | opacity contribution | geometry support + observation count |
| 定位 | rendering primitive | geometric trust primitive |

---

## 15. 对 SkelGS-SLAM 的启发

1. **Anchor-conditioned Gaussian birth** — certified anchor → local offsets → spawn child Gaussians，而非直接 depth pixel → Gaussian
2. **ChildGS 形式** — parent anchor (position, normal, feature, scale, support) → child Gaussians (offset in local tangent frame, anisotropic scale, opacity, SH)
3. **Growing gate 不应只看 render gradient** — 应加 temporal + geometric 条件
4. **Pruning 不应只看 opacity** — 应加 observation count + residual + visibility
5. **View-adaptive appearance OK, view-adaptive geometry dangerous** — geometry 应 slow-changing multi-view consistent

### 最值得借鉴的结构路线

```
Certified geometric anchor
  → owns local support region
  → spawns child Gaussians
  → controls opacity/scale/orientation regularization
  → allows view-adaptive appearance
  → prevents free-floating Gaussian overgrowth
```

---

## 16. 最终定位

| 系统 | 定位 | 对 SkelGS-SLAM 价值 |
|---|---|---|
| DROID/DPVO | temporal optimization | tracking / temporal anchor support |
| MASt3R-SLAM | dense two-view geometry | robust geometry proposal |
| S3LAM | semantic cluster + structure | structural grouping |
| ESLAM | RGB-D TSDF implicit mapping | surface-band / free-space regularization |
| LightGlue | fast sparse matching | pair verification / loop / reloc |
| **Scaffold-GS** | **structured GS backend** | **anchor-conditioned GS birth / ChildGS** |

---

## Related extracted notes

### Concepts
- [Anchor-Scaffold-Representation](Anchor-Scaffold-Representation) — anchor-conditioned Gaussian representation
- [View-Adaptive-Rendering](View-Adaptive-Rendering) — view-dependent dynamic attribute prediction

### Methods
- [Anchor-Growing-Pruning](Anchor-Growing-Pruning) — evidence-gated anchor lifecycle
- [ChildGS-Local-Derivation](ChildGS-Local-Derivation) — parent anchor → child Gaussian structured birth

### Project
- [SkelGS-SLAM: Scaffold-GS 分析结论](10_Projects/SkelGS-SLAM/decision-log)
