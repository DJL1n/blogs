---
title: "OG-Mapping: Octree-based Structured 3D Gaussians for Online Dense Mapping"
date: 2026-06-08
updated: 2026-06-08
summary: OG-Mapping 是一个 RGB-D online dense mapping 系统（非完整 SLAM）。用 sparse octree + structured 3D Gaussians 做在线高保真建图。核心：RGB-D + pose → sparse octree → octree voxel center as anchor → anchor generates structured 3D Gaussians → coarse-to-fine progressive anchor growth → dynamic keyframe window。

tags:
  - dense-SLAM
  - RGB-D
  - 3DGS
  - Anchor-Structured
  - Online
  - GS-SLAM
relatedNotes: []
category: 文献笔记
importance: 2
draft: false
type: note
---

# OG-Mapping: Octree-based Structured 3D Gaussians for Online Dense Mapping

> arXiv 2024. 论文整理笔记。
> 📄 [PDF 原文](OG-Mapping.pdf)

## 0. 一句话结论

OG-Mapping 是一个 RGB-D online dense mapping 系统（非完整 SLAM）。用 sparse octree + structured 3D Gaussians 做在线高保真建图。核心：RGB-D + pose → sparse octree → octree voxel center as anchor → anchor generates structured 3D Gaussians → coarse-to-fine progressive anchor growth → dynamic keyframe window。

不是 monocular SLAM / tracking frontend / DPVO/DROID 替代品。

---

## 1. 系统定位

RGB-D online dense mapping backend。给定 camera poses，用 octree-organized structured Gaussian map。实验中为了专注 mapping，使用 GT pose。

定位：GS backend / structured map growth reference，不是 frontend replacement。

---

## 2. 核心问题

现有 RGB-D Gaussian online mapping 问题：
- 逐像素 depth projection → Gaussian 冗余
- Depth noise 直接污染 Gaussian birth
- Object edge / depth discontinuity 错误 densify
- 大场景显式存储大量 Gaussian 参数 → 模型体积大
- 固定 keyframe window → 新区域过拟合、旧区域遗忘

OG-Mapping 回答：用 sparse octree 捕捉粗结构 → anchor 管理局部 Gaussian → anchor feature + MLP 解码生成属性 → progressive LOD refinement → dynamic keyframe window。

---

## 3. 总体 Pipeline

```
RGB-D + pose → keyframe 判断
→ depth + pose voxelize → incrementally update sparse octree
→ coarsest voxel center → anchor
→ visible anchors → structured 3D Gaussians
→ render RGB/depth → color + depth + SSIM + scale loss
→ progressive refinement (level-aware anchor growth)
→ dynamic keyframe window optimization
→ compact online Gaussian map
```

---

## 4. 核心表示：Octree-structured Anchors

### Anchor
scene map = {anchors}。每个 anchor: position + level mark + scaling factor + learnable offsets + feature vector。

### Anchor → Gaussians
Visible anchors → generate 3D Gaussians。Gaussian position = anchor + offset × scaling factor。Color, opacity, quaternion, scale 由 view direction + distance + anchor feature 通过独立 MLP decoder 预测。

优势：不显式存储所有 Gaussian 参数 → compact model；anchor-level structure 抵抗 pixel-level depth noise。

---

## 5. Sparse Octree

新 keyframe → RGB-D depth + pose → 动态分配新 voxels → incrementally update sparse octree → 粗略覆盖所有可见区域。比逐像素 densification 更结构化。

避免 edge / depth noise 处错误 densify — projection-based 方法在 object edges 处错误添加额外 anchors，octree 更准确。

---

## 6. Progressive Refinement

Coarse anchor 快速覆盖场景结构 → coarse Gaussian scale 大，难以拟合高频细节 → under-optimized areas → 添加更细层级 anchor。

与 Scaffold-GS 区别：Scaffold-GS 用 error/gradient-based growth。OG-Mapping 认为 online 场景 fine-level Gaussians 没有足够 iterations 稳定 gradient → 改用 level-aware growth: gradient high + current anchor level + level hierarchy → 决定是否添加更细层级 anchor。

---

## 7. Dynamic Keyframe Window

每次 optimization iteration 动态更新 window 内容：新 keyframe 保留 + local keyframes (高 overlap) + global keyframes (低 overlap/分散) → 无放回采样。

解决：新区域充分优化 + 旧区域不遗忘 + 避免 fixed-window local minima。

Ablation (Replica)：dynamic global PSNR 38.56，优于 random/overlap/coverage-maximizing fixed windows。

---

## 8. Loss

L = color reconstruction + depth rendering + SSIM + Gaussian scale regularization。

---

## 9. 实验表现

### Replica
| Method | PSNR | SSIM | LPIPS | Size |
|---|---|---|---|---|
| MonoGS | 35.68 | 0.946 | 0.118 | — |
| SplaTAM | 35.78 | 0.976 | 0.068 | 275.1 MB |
| **OG-Mapping** | **38.56** | **0.976** | **0.048** | **34.6 MB** |

### ScanNet
| Method | PSNR | Size |
|---|---|---|
| MonoGS | 16.72 | — |
| SplaTAM | 20.15 | — |
| **OG-Mapping** | **25.61** | **36.1 MB** |

### Compactness (Replica)
- Ours: PSNR 38.56, FPS 5.6, Model 34.6 MB
- Ours-sparse: PSNR 37.00, FPS 8.5, Model 8.8 MB
- SplaTAM: PSNR 35.78, FPS 0.4, Model 275.1 MB

---

## 10. 强项

1. **把 Scaffold-GS 的 anchor-Gaussian 表示在线化** — sparse octree + RGB-D
2. **对 depth noise 更稳** — octree/structured 比 pixel-level projection 更鲁棒
3. **模型更紧凑** — anchor feature + MLP 替代显式存储 Gaussian 参数
4. **Dynamic window 改进在线 mapping** — 新区域优化 + 旧区域不忘

---

## 11. 局限

1. **依赖 RGB-D sensor** — 非 monocular
2. **依赖外部 pose** — 非 tracking 系统
3. **大场景仍可能 forgetting** — 需 submap
4. **MLP decoder 增加系统复杂度**

---

## 12. 对 SkelGS-SLAM 的启发

1. **Anchor 需要空间索引结构** — octree/voxel hierarchy 替代 flat anchor list
2. **Gaussian birth 应从 pixel-driven 改成 anchor/octree-driven**
   - certified geometry packet → octree says region lacks anchor → add CertifiedAnchor → spawn ChildGS
3. **Progressive LOD 适合 ChildGS** — coarse anchor 负责大结构，fine 只在 evidence 充分时添加
4. **Dynamic keyframe window → dynamic packet window**
   - keep current packet + local overlap + global historical + geometry-version-changed + loop-affected
5. **支持"先认证，再 birth"方向** — OG-Mapping 降低对 noisy depth 的直接依赖，你的 monocular 深度更不可靠，更应该坚持 certification 在前

### 不建议照搬
- RGB-D depth 直接建 octree
- GT/external pose
- 只做 mapping 不处理 tracking drift

---

## Related extracted notes

### Concepts
- [Octree-Anchor-Hierarchy](Octree-Anchor-Hierarchy) — octree-organized anchor hierarchy for structured GS map
- [Progressive-LOD-Growth](Progressive-LOD-Growth) — coarse-to-fine level-aware anchor growth

### Methods
- [Dynamic-Keyframe-Window](Dynamic-Keyframe-Window) — dynamic keyframe window for online mapping
- [Anchor-Octree-for-SLAM](Anchor-Octree-for-SLAM) — translating OG-Mapping's octree anchor to anchor skeleton

### Project
- [SkelGS-SLAM: OG-Mapping 分析结论](10_Projects/SkelGS-SLAM/decision-log)
