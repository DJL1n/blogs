---
title: "DGS-SLAM: Gaussian Splatting SLAM in Dynamic Environment"
date: 2026-06-08
updated: 2026-06-08
summary: DGS-SLAM 是一个 RGB-D 动态环境下的 Gaussian Splatting SLAM 系统。核心：online instance video segmentation + robust residual mask → 动态过滤贯穿 tracking、Gaussian insertion、window optimization、keyframe management。不建模动态物体，只保证静态 Gaussian map 和 pose 不被污染。

tags:
  - GS-SLAM
relatedNotes: []
category: 文献笔记
importance: 2
draft: false
type: note
---

# DGS-SLAM: Gaussian Splatting SLAM in Dynamic Environment

> arXiv 2024. 论文整理笔记。
> 📄 [PDF 原文](DGS-SLAM.pdf)

⚠️ 注意区分：这篇是 DGS-SLAM (kmk97/DGS-SLAM)，不是 NeurIPS 2024 的 DG-SLAM (fudan-zvg/DG-SLAM)。

## 0. 一句话结论

DGS-SLAM 是一个 RGB-D 动态环境下的 Gaussian Splatting SLAM 系统。核心：online instance video segmentation + robust residual mask → 动态过滤贯穿 tracking、Gaussian insertion、window optimization、keyframe management。不建模动态物体，只保证静态 Gaussian map 和 pose 不被污染。

---

## 1. 解决什么问题

普通 GS-SLAM (SplaTAM/MonoGS) 默认静态场景，动态物体会：
1. tracking 误导：动态物体 residual 拉偏 pose
2. mapping 污染：动态物体写入 Gaussian map → ghosting/拖影/重影

DGS-SLAM 把动态过滤接入 GS-SLAM 全 pipeline，不是只在 tracking 前做一次 mask。

---

## 2. 核心机制

### Pose Tracking
Frame-to-model: render RGB/depth → dynamic mask (Track Anything) + opacity mask (unmapped) → valid static pixels only → color+depth residual → optimize pose。

### Dynamic Mask + Robust Mask
- Segmentation: Track Anything (lightweight tiny)
- Robust: rendered vs input photometric residual → histogram/perecentile outlier → smoothed。补漏 shadow/边界/artifact。

### Gaussian Insertion & Pruning
First frame: depth unprojection, exclude dynamic regions, fill depth holes。New keyframe: insert Gaussians 时排除动态区域和 invalid depth。沿用 3DGS/MonoGS densification/pruning。

### Loop-aware Keyframe Management
每个 Gaussian 记录 source keyframe ID。当前帧可见 Gaussians 中若某历史 keyframe ID 占比高 → loop/re-visit → 将该 keyframe 重新加入优化 window。

### Backend Window Optimization
Gaussian map params + selected keyframe poses。RGB+depth residual + isotropic regularization。

---

## 3. 实验

### NVS (TUM dynamic)
| Method | PSNR | SSIM | LPIPS |
|---|---|---|---|
| SplaTAM | 15.55 | 0.633 | 0.413 |
| MonoGS | 15.89 | 0.621 | 0.358 |
| **DGS-SLAM** | **20.63** | **0.807** | **0.186** |

### Tracking (TUM dynamic)
| Method | Avg ATE |
|---|---|
| SplaTAM | 166.0 cm |
| MonoGS | 37.7 cm |
| **DGS-SLAM** | **3.0 cm** |

### Tracking (Bonn dynamic)
| Method | Avg ATE |
|---|---|
| ORB-SLAM3 | 29.8 cm |
| MonoGS | 32.9 cm |
| **DGS-SLAM** | **7.3 cm** |
| DynaSLAM | 4.8 cm |

### Ablation (Bonn)
| Setting | ATE |
|---|---|
| w/o Both | 9.04 cm |
| w/o Robust | 8.34 cm |
| w/o Loop | 8.01 cm |
| Full | **7.32 cm** |

### Runtime
~1.6 FPS (不含 segmentation)，MonoGS ~1.07 FPS。

---

## 4. 强项

1. **动态过滤贯穿全 pipeline** — tracking + insertion + window + keyframe，不只是前处理 mask
2. **Robust residual mask 补漏** — 阴影/边界/artifact，segmentation 不完美时有用
3. **Gaussian source keyframe ID → loop-aware window** — primitive 自带历史连接，实用

---

## 5. 局限

1. **RGB-D 依赖** — 非 monocular
2. **外部分割依赖** — Track Anything
3. **不建模动态物体** — 只过滤
4. **速度较慢** — ~1.6 FPS
5. **Residual mask 有闭环风险** — map error → residual mask → 固化错误

---

## 6. 对 SkelGS-SLAM 的启发

### ★ Gaussian birth 必须有 dynamic gate
Dynamic-risk 高 / temporal repeatability 低 / depth-normal 差 → 不允许 anchor birth / CertifiedPacket / GS birth。在你的系统里是 pre-GS geometry evidence，不是 GS render residual。

### ★ Source keyframe ID / birth provenance
每个 anchor 记录 birth frame id / packet id / supporting observations / maturity。用于 loop-aware reobservation、maturity、submap overlap。

### Robust mask 的"后验补漏"思想
Segmentation 不是最终结论 → 必须被几何一致性验证。你的版本：DPVO/DROID/HI-SLAM2 prediction + MASt3R consistency + read-only anchor support，不是 GS render。

### 不建议借：GS residual 直接影响前端
DGS-SLAM 的核心闭环（GS render → residual mask → tracking/mapping）在你的 pre-certification 阶段危险。你的边界：frontend authority = DPVO/DROID/anchor；backend evaluator = GS rendering only evaluates, 不反向改 pose/depth/anchor。

---

## Related extracted notes

### Concepts
- [Dynamic-Gate-Through-Pipeline](Dynamic-Gate-Through-Pipeline) — 动态过滤贯穿 tracking + mapping
- [Primitive-Birth-Provenance](Primitive-Birth-Provenance) — source keyframe ID for GS primitive

### Methods
- [DGS-SLAM-Architecture](DGS-SLAM-Architecture) — 动态 + GS pipeline with robust mask
- [Robust-Mask-Residual](Robust-Mask-Residual) — photometric residual histogram for outlier detection

### Project
- [SkelGS-SLAM: DGS-SLAM 分析](10_Projects/SkelGS-SLAM/decision-log)
