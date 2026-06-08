---
title: "OpenMonoGS-SLAM: Monocular Gaussian Splatting SLAM with Open-set Semantics"
date: 2026-06-08
updated: 2026-06-08
summary: OpenMonoGS-SLAM = MASt3R-SLAM geometry backbone + SAM multi-scale masks + CLIP language features + 3DGS semantic feature rendering + memory bank。只用 monocular RGB，构建可渲染、可开放词汇查询的 3D Gaussian semantic map。不是动态 SLAM / 不解决 pose-depth-scale coherence / 但 memory bank + multi-scale SAM + CLIP 的语义 map 架构很有参考价值。

tags:
  - GS-SLAM
relatedNotes: []
category: 文献笔记
importance: 2
draft: false
type: note
---

# OpenMonoGS-SLAM: Monocular Gaussian Splatting SLAM with Open-set Semantics

> arXiv 2025-12. Monocular RGB-only + open-set semantic 3DGS-SLAM.
> 📄 论文全文：arXiv 2412.12371 (注：未找到对应编号，引用时请确认)

## 0. 一句话结论

OpenMonoGS-SLAM = MASt3R-SLAM geometry backbone + SAM multi-scale masks + CLIP language features + 3DGS semantic feature rendering + memory bank。只用 monocular RGB，构建可渲染、可开放词汇查询的 3D Gaussian semantic map。不是动态 SLAM / 不解决 pose-depth-scale coherence / 但 memory bank + multi-scale SAM + CLIP 的语义 map 架构很有参考价值。

---

## 1. 解决什么问题

**几何缺口**：monocular GS-SLAM 的几何精度和稳定性仍弱于 RGB-D 系统 → 用 MASt3R-SLAM 当 backbone。
**语义缺口**：现有 semantic GS-SLAM 多为 closed-set / 固定类别 → SAM + CLIP + memory bank → open-set text-prompt segmentation。

---

## 2. Pipeline

```
Monocular RGB → MASt3R-SLAM tracking (pointmap + ray-error)
→ MASt3R pointmap → 3DGS init (pos/rot/scale/opacity/RGB + learnable semantic feature)
→ SAM multi-scale masks → lift to 3D via MASt3R depth → scale-conditioned membership
→ CLIP masked embeddings → online memory bank (compact representative features)
→ Rendering: RGB + semantic feature map
→ Loss: photometric + multi-view semantic contrastive + CLIP regression
→ Output: camera trajectory + photorealistic 3DGS + open-set semantic feature field
```

额外的 mapping frames（tracking keyframes 太稀疏 → 补充 mapping frames 作为优化监督）。

---

## 3. 核心机制

### MASt3R-SLAM backbone
Tracking + pointmap estimation 来自 MASt3R-SLAM（ray-error optimization + confidence-weighted robust pose）。几何不是论文创新的重点。

### Per-Gaussian learnable semantic feature
每个 Gaussian 额外存 low-dimensional semantic feature（不是完整 CLIP 向量）。渲染时 alpha blending 得到 per-pixel semantic feature map。

### Multi-scale SAM supervision ★
SAM masks 有固有多粒度问题（chair/chair leg/chair back 重叠）。方案：
1. Lift SAM masks 到 3D via MASt3R depth + intrinsics
2. 按 3D spatial extent 分配 scale level
3. Scale-conditioned membership: fine scale 小 mask 抑制大 mask → 局部部件；coarse scale 大 mask 保留 → 整体对象

消融：full multi-scale > coarse-only > fine-only。

### Multi-view semantic contrastive loss
同一对象/区域在不同视角的 rendered semantic feature 拉近，不同区域推远。跨视角一致性 + 结构正则。

### Memory bank ★
- 不直接存高维 CLIP 在 Gaussian 上
- Gaussian 存 low-dimensional feature
- Online bank: 新 CLIP embedding 相似度低于阈值 → append
- Attention readout: low-dim Gaussian feature → attention to bank → 高维 CLIP semantics

消融：w/o memory → mIoU 0.660 → 0.520（↓21%）。

### Losses
1. Photometric (L1 + SSIM)
2. Multi-view semantic contrastive
3. CLIP regression (language-guided alignment)

---

## 4. 实验

### Replica Open-set mIoU
| Method | mIoU |
|---|---|
| Feature 3DGS | 0.571 |
| Gaussian Grouping | 0.690 |
| **OpenMonoGS** | **0.845** |

### Replica Tracking
| Method | ATE |
|---|---|
| MonoGS | 30.48 cm |
| Photo-SLAM | 10.63 cm |
| SEGS-SLAM | 9.25 cm |
| **OpenMonoGS** | **1.60 cm** |

(ATE 提升主要来自 MASt3R-SLAM backbone)

### ScanNet
| Method | ATE | PSNR | SSIM |
|---|---|---|---|
| **OpenMonoGS** | **5.39** | **26.21** | **0.860** |
| Splat-SLAM | 8.25 | 24.12 | 0.796 |
| SEGS-SLAM | 7.66 | 23.62 | 0.846 |

### Ablation
| Setting | mIoU | PSNR |
|---|---|---|
| w/o contrastive | 0.477 | 34.02 |
| w/o regression | 0.616 | 34.30 |
| w/o memory | 0.520 | 34.38 |
| Full | **0.660** | **34.47** |

---

## 5. 强项

1. **Monocular RGB-only + open-set semantic** — 不依赖 depth 和 3D label
2. **Memory bank** — low-dim Gaussian feature + high-dim CLIP prototype
3. **Multi-scale SAM supervision** — 处理对象/部件粒度
4. **Open-set mIoU 0.845** — 明显高于 Feature 3DGS / Gaussian Grouping
5. **ScanNet / Replica tracking+rendering+semantic 结果较强**

---

## 6. 局限

1. **几何前端依赖 MASt3R-SLAM** — 不解决 pose-depth-scale coherence 根本问题
2. **VFM pipeline 重** — MASt3R + SAM + CLIP + Grounded-SAM
3. **动态场景鲁棒性不足** — 论文自己承认
4. **不是实时** — 30K mapping iterations
5. **Closed-set mIoU 0.896 使用 GT semantic IDs 辅助** — 不等于纯 open-set

---

## 7. 对 SkelGS-SLAM 的启发

### ★ Memory bank 架构
Primitive 存 low-dimensional feature → global memory bank 存 high-dimensional prototype。对应你的 anchor：compact semantic/risk descriptor + bank of object/region/dynamic prototypes。比每个 anchor 存高维 CLIP/DINO 更可控。

### ★ Multi-scale → multi-level anchor admission
Coarse: 大面/大物体稳定支持。Mid: 边界/法线过渡。Fine: 高频细节 GS birth。与 RGBDS-SLAM pyramid + RTG-SLAM lifecycle 合并。

### ★ Semantic consistency as backend regularizer
同一 mature anchor 区域 → semantic feature 一致。不同对象/dynamic-risk → 分离。但只作 backend regularizer，不反向影响 pose/depth/anchor。

### 不建议借
- MASt3R-SLAM 几何前端直接作为你的几何认证 authority
- SAM/CLIP 语义作为 anchor birth / packet admission 决定因子

---

## 8. 57 → 58 篇

OpenMonoGS-SLAM 不适合作为你的几何主线，适合作为 semantic Gaussian backend / open-vocabulary map / compact semantic memory 的参考。

---

## Related extracted notes

### Concepts
- [Compact-Semantic-Memory](Compact-Semantic-Memory) — low-dim feature + high-dim prototype bank
- [Multi-Scale-Anchor-Admission](Multi-Scale-Anchor-Admission) — coarse/fine multi-level anchor maturity

### Methods
- [OpenMonoGS-SLAM-Architecture](OpenMonoGS-SLAM-Architecture) — MASt3R + SAM + CLIP + memory bank
- [Semantic-Backend-Regularizer](Semantic-Backend-Regularizer) — semantic consistency as GS backend regularizer

### Project
- [SkelGS-SLAM: OpenMonoGS-SLAM 分析](10_Projects/SkelGS-SLAM/decision-log)
