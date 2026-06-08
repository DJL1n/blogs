---
title: "FlashSLAM: Accelerated RGB-D SLAM for Real-Time 3D Scene Reconstruction with Gaussian Splatting"
date: 2026-06-08
updated: 2026-06-08
summary: FlashSLAM 是一个 RGB-D Gaussian SLAM 系统，核心是把 GS tracking 从 render-loss 梯度下降改成 SuperPoint/LightGlue 特征匹配 + RGB-D 反投影 + SVD 3D-3D 刚体配准。不是 mono / dynamic / GS lifecycle innovation paper。

tags:
  - GS-SLAM
relatedNotes: []
category: 文献笔记
importance: 2
draft: false
type: note
---

# FlashSLAM: Accelerated RGB-D SLAM for Real-Time 3D Scene Reconstruction with Gaussian Splatting

> arXiv 2024. 论文整理笔记。
> 📄 [PDF 原文](FlashSLAM.pdf)

## 0. 一句话结论

FlashSLAM 是一个 RGB-D Gaussian SLAM 系统，核心是把 GS tracking 从 render-loss 梯度下降改成 SuperPoint/LightGlue 特征匹配 + RGB-D 反投影 + SVD 3D-3D 刚体配准。不是 mono / dynamic / GS lifecycle innovation paper。

---

## 1. 解决什么问题

现有 GS-SLAM (SplaTAM/MonoGS) tracking 依赖 constant velocity init + render-loss 梯度下降 pose optimization，在以下情况失败：
1. Sparse-view / 帧间间隔大
2. Rapid camera movement
3. Consumer RGB-D depth noise
4. Costly iterative rendering

FlashSLAM：superpoint+lightglue matching → 3D-3D SVD registration → 少量 GS refinement。

---

## 2. 核心机制

### Vision-based Camera Tracking
- SuperPoint keypoints + LightGlue matching
- RGB-D depth backprojection → 3D point sets
- SVD rigid registration (centroid → covariance → SVD → R, t)
- Dynamic depth truncation (70th percentile per-frame)
- Optional gradient-based GS render-loss refinement (0–70 iters)

### Gaussian Mapping
- Standard 3DGS (center, covariance, color, opacity)
- Add Gaussian where rendered_depth > observed_depth (missing foreground)
- ICP correction: new points aligned against visible Gaussians before insertion
- RGB + depth loss (L_total = photo + λ depth)

### Keyframe Selection
- Dense: visible Gaussian IoU < threshold → keyframe
- Sparse: every frame is keyframe

### Color Refinement (Loss-Weighted Sampling)
- Sample keyframes by loss-weighted probability
- High-loss frames more likely to be picked
- Only adjust existing Gaussians, no add/delete

---

## 3. 实验

### Replica Tracking (dense)
| Method | ATE |
|---|---|
| SplaTAM | **0.36 cm** |
| FlashSLAM | 0.55 cm |
| MonoGS | 0.58 cm |

### Sparse Tracking (Replica stride=40)
| Method | ATE |
|---|---|
| SplaTAM | 542.6 cm |
| MonoGS | 93.22 cm |
| **FlashSLAM** | **6.14 cm** |

### TUM Tracking
| Method | ATE |
|---|---|
| ORB-SLAM2 | 1.98 cm |
| MonoGS | 2.70 cm |
| **FlashSLAM** | 4.17 cm |
| SplaTAM | 5.48 cm |

### iPhone Self-captured (sparse photo)
| Method | ATE | PSNR |
|---|---|---|
| SplaTAM | 1207 cm ✗ | 16.15 |
| MonoGS | 1970 cm ✗ | 13.61 |
| **FlashSLAM** | **19.59 cm ✓** | **23.73** |

### Tracking Time
| Config | Time/frame |
|---|---|
| No refinement | **78 ms** |
| Full (50 iters) | 485 ms |
| SplaTAM | 1.88 s |
| MonoGS | 1.08 s |

---

## 4. 强项

1. **Tracking 不依赖 GS render loss** — 适合大位移/稀疏帧
2. **Sparse setting 明显优于 render-only GS-SLAM** — stride=40 仍保持 cm 级
3. **消费级 depth 友好** — depth truncation + ICP correction
4. **保留 3DGS mapping** — Replica PSNR 39.21
5. **Loss-weighted refinement** — 优化预算按残差分配

---

## 5. 局限

1. **强依赖 RGB-D** — 非 monocular
2. **低纹理场景匹配失败** → tracking 退化
3. **"Real-time" 打折** — full 约 0.5 s/frame
4. **Mapping 创新弱** — 标准 3DGS
5. **不处理动态**

---

## 6. 对 SkelGS-SLAM 的启发

### ★ 前端 tracking authority 不应来自 GS render loss
FlashSLAM 支持你：pose/depth/anchor 的 authority 应来自 DPVO/DROID/MASt3R/depth-normal，不是 GS rendered residual。

### LightGlue-like sparse long-range constraint
高频：DPVO/DROID window。低频：MASt3R/LightGlue retrieval → long-range correspondence evidence。Anchor admission：只有被高频 window + 低频 reobservation 同时支持的点才进入 mature。

### 新增 anchor 前 alignment check
FlashSLAM 在插入新 Gaussian 前做 ICP alignment。可改造：candidate anchor birth 必须能和已有 mature support 对齐，否则只保留为 weak candidate。

### 不建议借：RGB-D 3D-3D SVD 主前端
单目 predicted depth 会有 scale bias → 应 Sim(3) / scale-aware weak factor，不是 SE(3) rigid。

---

## 7. 36 → 37 篇

FlashSLAM 的"前端不应 GS render loss"判断 + "显式匹配 > render optimization" evidence，支持你当前不让 GS 反写前端的边界。

---

## Related extracted notes

### Concepts
- [Explicit-Tracking-vs-Render-Tracking](Explicit-Tracking-vs-Render-Tracking) — feature matching + registration > render-loss pose opt for sparse/large-motion
- [Alignment-Check-Before-Birth](Alignment-Check-Before-Birth) — new anchor/Gaussian must align with existing support

### Methods
- [FlashSLAM-Architecture](FlashSLAM-Architecture) — SuperPoint+LightGlue+SVD+GS pipeline
- [Loss-Weighted-Refinement](Loss-Weighted-Refinement) — optimization budget by residual

### Project
- [SkelGS-SLAM: FlashSLAM 分析](10_Projects/SkelGS-SLAM/decision-log)
