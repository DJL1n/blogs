---
title: "CAD-SLAM / ADD-SLAM: Consistency-Aware Dynamic SLAM with Dynamic-Static Decoupled Mapping"
date: 2026-06-08
updated: 2026-06-08
summary: ADD-SLAM 是一个 RGB-D 动态 dense SLAM 系统。核心：不用语义类别判断动态，而是用历史 Gaussian map 渲染与当前 RGB-D 观测的 color/depth 一致性检查发现动态区域，再用 MobileSAM 精细化 mask。Tracking 时排除动态区域，建图时把静态背景和动态物体分别建 Gaussian 表示。

tags:
  - GS-SLAM
relatedNotes: []
category: 文献笔记
importance: 2
draft: false
type: note
---

# CAD-SLAM / ADD-SLAM: Consistency-Aware Dynamic SLAM with Dynamic-Static Decoupled Mapping

> arXiv 2025 → v2 改名为 CAD-SLAM. 论文整理笔记。
> 📄 [PDF 原文](ADD-SLAM.pdf)

## 0. 一句话结论

ADD-SLAM 是一个 RGB-D 动态 dense SLAM 系统。核心：不用语义类别判断动态，而是用历史 Gaussian map 渲染与当前 RGB-D 观测的 color/depth 一致性检查发现动态区域，再用 MobileSAM 精细化 mask。Tracking 时排除动态区域，建图时把静态背景和动态物体分别建 Gaussian 表示。

动态识别更接近 SLAM 本质（跨时间一致性破坏），不是语义类别先验。

---

## 1. 系统定位

RGB-D dynamic dense SLAM + 3DGS representation + consistency-based dynamic detection + MobileSAM mask + dynamic-static composite mapping。

---

## 2. 三个核心模块

### Adaptive Dynamic Object Segmentation
- 历史 Gaussian map render vs 当前 RGB-D 观测 → color + depth inconsistency
- Observed depth < rendered depth → 新遮挡（动态物体）
- Observed depth > rendered depth → 暴露背景
- Inconsistency center → MobileSAM prompt → 完整动态 mask

### Dynamic Object Tracking
- Assign object ID → maintain mask + center per frame
- Next frame: use previous center as SAM prompt
- Termination: near boundary / area surge / center jump

### Dynamic-Static Composite Mapping
- Static map: remove dynamic Gaussians + fill exposed background
- Dynamic map: temporal Gaussian model per object

---

## 3. Tracking

Frame-to-model on static regions only (dynamic mask applied)。Keyframe DBA (DROID-style + dynamic mask)。Loop detection + global BA。

---

## 4. 实验结果

### Tracking (Bonn)
| Method | ATE RMSE |
|---|---|
| ADD-SLAM | **2.77 cm** |
| WildGS-SLAM RGB-D | 2.88 cm |
| DG-SLAM | 5.45 cm |

### Rendering (Bonn)
| Method | PSNR | SSIM |
|---|---|---|
| ADD-SLAM | 22.41 | **0.89** |
| MonoGS | 20.64 | 0.77 |
| SplaTAM | 17.95 | 0.72 |

### Ablation (mask方法对比)
- 无动态检测: 52.5 cm
- MaskDINO 语义分割: 5.5 cm
- 无 keyframe DBA: 3.3 cm
- 完整版: **2.7 cm**

---

## 5. 强项

1. **动态识别更接近 SLAM 本质** — 跨时间一致性破坏，非语义类别
2. **区分新遮挡 vs 暴露背景** — observed depth 与 rendered depth 比较
3. **Dynamic-static 分离** — tracking 排除干扰，mapping 保留信息
4. **Keyframe DBA 有效** — ablation 显示 DBA 明显贡献

---

## 6. 局限

1. **依赖 RGB-D** — 纯 monocular 直接迁移不稳
2. **依赖 MobileSAM** — mask 失败会传染全系统
3. **历史 Gaussian map 质量影响 dynamic residual** — 冷启动风险
4. **Temporal dynamic Gaussian 更偏渲染建模** — 非强运动估计
5. **Runtime 较重** — tracking ~1s, mapping ~1.1s

---

## 7. 对 SkelGS-SLAM 的启发

### ★ 最值借鉴：跨时间一致性破坏作为动态证据
改为 pre-GS consistency oracle：DPVO/DROID window depth-pose + stable anchor + certified static candidate + temporal repeatability，非 GS map render residual。

### 区分新遮挡 vs 暴露背景
Observed depth < historical → 不适合生成静态 anchor
Observed depth > historical → 等待多帧确认后补静态 anchor

### 可落地成 DynamicRiskEvidence，不是 Dynamic Mask 写回
仅用于 anchor admission suppression + packet risk + static weighting + tracking gating。暂不用于 VideoBuffer writeback / GS dynamic model。

---

## Related extracted notes

### Concepts
- [Consistency-Dynamic-Detection](Consistency-Dynamic-Detection) — cross-temporal consistency for dynamic detection
- [Occlusion-vs-Exposure-Cue](Occlusion-vs-Exposure-Cue) — distinguishing new occlusion from revealed background

### Methods
- [Dynamic-Static-Composite-Mapping](Dynamic-Static-Composite-Mapping) — separate GS maps for static and dynamic
- [Pre-GS-Consistency-Oracle](Pre-GS-Consistency-Oracle) — consistency from DPVO/anchor, not GS render

### Project
- [SkelGS-SLAM: ADD-SLAM 分析](10_Projects/SkelGS-SLAM/decision-log)
