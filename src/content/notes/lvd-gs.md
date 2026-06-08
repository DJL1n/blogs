---
title: "LVD-GS: Gaussian Splatting SLAM for Dynamic Scenes via Hierarchical Explicit-Implicit Representation Collaboration Rendering"
date: 2026-06-08
updated: 2026-06-08
summary: LVD-GS 是一个 LiDAR-Visual 3DGS-SLAM 系统，面向大规模动态室外场景。核心：LiDAR 几何 + Grounded SAM semantic + DINO feature → Sem-Geo-DINO 多层次协同表示 → RGB/depth/semantic/DINO 渲染优化；动态 mask = open-world 显式分割 + implicit residual uncertainty。不是 monocular / 输入不对等 / 但 multi-representation consistency 与动态 mask 融合思路可借鉴。

tags:
  - GS-SLAM
relatedNotes: []
category: 文献笔记
importance: 2
draft: false
type: note
---

# LVD-GS: Gaussian Splatting SLAM for Dynamic Scenes via Hierarchical Explicit-Implicit Representation Collaboration Rendering

> ICASSP 2026. LiDAR-Visual 3DGS-SLAM for large-scale dynamic outdoor scenes.
> 📄 论文全文：arXiv 2510.16385

## 0. 一句话结论

LVD-GS 是一个 LiDAR-Visual 3DGS-SLAM 系统，面向大规模动态室外场景。核心：LiDAR 几何 + Grounded SAM semantic + DINO feature → Sem-Geo-DINO 多层次协同表示 → RGB/depth/semantic/DINO 渲染优化；动态 mask = open-world 显式分割 + implicit residual uncertainty。不是 monocular / 输入不对等 / 但 multi-representation consistency 与动态 mask 融合思路可借鉴。

---

## 1. 与 monocular GS-SLAM 的关键区别

| | 普通 monocular GS-SLAM | LVD-GS |
|---|---|---|
| 输入 | RGB | LiDAR + RGB |
| 几何来源 | predicted depth / multi-view | LiDAR projection + DepthLab densification |
| 表示 | RGB/depth rendering | RGB + depth + semantic + DINO |
| 动态处理 | 语义 mask / uncertainty | explicit open-world seg + implicit residual |
| 尺度 | monocular scale drift | LiDAR metric scale |
| 位姿 | photometric/rendering tracking | multi-layer + scan-to-map (KISS-ICP-like) |

---

## 2. Pipeline

```
RGB + LiDAR point cloud
  → LiDAR projection → sparse depth → DepthLab densification
  → Grounded SAM → open-world semantic mask + DINO feature
  → Sem-Geo-DINO hierarchical representation
  → 3DGS init from LiDAR points
  → collaborative rendering: RGB + depth + semantic + DINO
  → multi-scale loss optimization
  → explicit dynamic mask (open-world seg) + implicit (residual uncertainty)
  → fused dynamic keypoint / region filtering
  → pose estimation + Gaussian map optimization
  → localized submaps
```

---

## 3. 核心机制

### Hierarchical Representation Collaboration ★
不只优化 RGB+depth。同时渲染并约束：
- Color loss (RGB)
- Depth loss (LiDAR + DepthLab)
- Semantic loss (Grounded SAM mask, cross-entropy, **detach gradient 不污染几何**)
- DINO feature loss (相似度约束)

消融证明 Representation Collaboration 对 ATE 改善最大（10.54→2.97）。

### Explicit-Implicit Joint Dynamic Modeling
- **Explicit**: Grounded SAM open-world segmentation → dynamic object mask
- **Implicit**: DINO-depth fused → per-pixel Gaussian → uncertainty → residual → motion mask
- 两者融合 → fine-grained dynamic mask → filter dynamic keypoints

消融：加 Dynamic Modeling 后 PSNR 20.07→22.79，两者都加→25.43。

### LiDAR-Visual geometry
- LiDAR projection → sparse depth
- DepthLab densification → denser depth
- LiDAR points → 3DGS initialization
- KISS-ICP-like scan-to-map registration for pose refinement

### Localized submaps
控制内存，适用于大规模场景。

---

## 4. 实验

### Pose Estimation (ATE-RMSE, KITTI)
| Method | K03 | K05 | K06 | K07 | K09 | K10 |
|---|---|---|---|---|---|---|
| MonoGS | 57.27 | 51.47 | 93.81 | 51.23 | 81.23 | 61.96 |
| SplaTAM | 10.31 | 37.13 | 53.78 | 32.82 | 70.23 | 33.96 |
| S3POGS | 6.36 | 5.94 | 9.34 | 5.63 | 8.64 | 6.52 |
| **LVD-GS** | **1.74** | **1.37** | **0.69** | **0.62** | **2.19** | **1.45** |

### Novel View Synthesis (PSNR/SSIM)
| Method | KITTI PSNR | KITTI SSIM | nuScenes PSNR | nuScenes SSIM |
|---|---|---|---|---|
| LoopSplat | 16.43 | 0.740 | 23.07 | 0.761 |
| S3POGS | 19.73 | 0.646 | 24.25 | 0.827 |
| **LVD-GS** | **21.24** | **0.810** | **28.73** | **0.893** |

### Ablation
| Dyn. Model | Rep. Collab. | PSNR | SSIM | ATE |
|---|---|---|---|---|
| ✗ | ✗ | 20.07 | 0.724 | 10.54 |
| ✓ | ✗ | 22.79 | 0.780 | 8.42 |
| ✗ | ✓ | 23.27 | 0.804 | **2.97** |
| ✓ | ✓ | **25.43** | **0.847** | 1.27 |

Representation Collaboration 对 ATE 影响最大。Dynamic Modeling 主要提升渲染质量和鲁棒性。

---

## 5. 强项

1. **Sem-Geo-DINO multi-representation** — 不止 RGB+depth，含语义和 DINO feature
2. **Explicit-implicit dynamic mask 融合** — 开放世界分割 + residual uncertainty
3. **LiDAR 初始化 Gaussian + scan-to-map** — 解决 metric scale
4. **室外动态场景 ATE 和 NVS 强**
5. **消融清晰** — Rep. Collab. 对 ATE 贡献最大

---

## 6. 局限

1. **不是 monocular** — 依赖 LiDAR，不可直接用于你的单目主线
2. **输入不对等** — LiDAR + VFM + DepthLab，baseline 比较需谨慎
3. **系统复杂度高** — Grounded SAM + DINO + DepthLab + LiDAR + KISS-ICP
4. **动态是 suppression，不是 full dynamic modeling**
5. **没有 GS feedback 安全边界设计**

---

## 7. 对 SkelGS-SLAM 的启发

### ★ Multi-representation evidence → anchor maturity
LVD-GS 证明 RGB/depth/photometric 不够，室外动态需要 geometry + semantic + DINO feature + residual uncertainty 多层证据。对应你的 anchor admission：candidate anchor 需通过 tracking repeatability + depth stability + normal consistency + texture + DINO consistency + flow consistency + dynamic uncertainty → admit/reject。

### ★ Dynamic mask 不应只靠语义分割
Explicit (segmentation) + implicit (residual uncertainty) 融合 → 更细粒度。支持你：动态去除不应做成独立语义模块，应嵌入几何成熟度判断。

### LiDAR oracle → monocular geometry certification motivation
LVD-GS 证明有 LiDAR 时 GS 稳定。单目难度在于缺少 metric geometry carrier → 必须用 anchor maturity / certified packet 模拟。

### DINO feature as read-only maturity evidence
候选 anchor 在多视角中 DINO feature 稳定 → 更可能是 static persistent surface。不进 pose optimization，不进 GS 前端。与安全边界兼容。

---

## 8. 55 → 56 篇

LVD-GS 适合作为 multi-evidence geometry admission / dynamic uncertainty / representation collaboration 的相关工作支撑，不适合作为 monocular 主系统基座。

---

## Related extracted notes

### Concepts
- [Multi-Representation-Geometry-Admission](Multi-Representation-Geometry-Admission) — Sem-Geo-DINO layers for anchor maturity
- [Explicit-Implicit-Dynamic-Fusion](Explicit-Implicit-Dynamic-Fusion) — open-world seg + residual uncertainty

### Methods
- [LVD-GS-Architecture](LVD-GS-Architecture) — LiDAR-Visual + Hierarchical Rep + Dynamic Modeling
- [Multi-Evidence-Anchor-Admission](Multi-Evidence-Anchor-Admission) — translating Sem-Geo-DINO to anchor gate

### Project
- [SkelGS-SLAM: LVD-GS 分析](10_Projects/SkelGS-SLAM/decision-log)
