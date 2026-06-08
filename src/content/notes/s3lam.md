---
title: "S3LAM: Structured Scene SLAM"
date: 2026-06-08
updated: 2026-06-08
summary: S3LAM 是一个基于 ORB-SLAM2 的单目语义结构 SLAM。核心是把 panoptic segmentation 得到的语义实例信息注入 ORB-SLAM2 的 sparse map，把普通 ORB map points 聚成 object/structure clusters，对可近似为平面的 cluster 加入 point-plane structural constraint，改造 Bundle Adjustment。

tags:
  - SLAM
  - sparse-SLAM
  - monocular
  - Semantic
  - global-optimization
  - Loop-Closure
  - GS-SLAM
relatedNotes: []
category: 文献笔记
importance: 2
draft: false
type: note
---

# S3LAM: Structured Scene SLAM

> arXiv 2021 (v1 Sep 2021, v2 Mar 2022). 论文整理笔记。
> 📄 [PDF 原文](S3LAM.pdf) (1.2 MB)
> 作者：Mathieu Gonzalez, Eric Marchand, Amine Kacete, Jérôme Royan.

## 0. 一句话结论

S3LAM 是一个基于 ORB-SLAM2 的单目语义结构 SLAM。核心是把 panoptic segmentation 得到的语义实例信息注入 ORB-SLAM2 的 sparse map，把普通 ORB map points 聚成 object/structure clusters，对可近似为平面的 cluster 加入 point-plane structural constraint，改造 Bundle Adjustment。

压缩：ORB-SLAM2 sparse tracking/mapping → keyframe panoptic segmentation → map points semantic fusion → object/structure clusters → fit planes → planar-constrained BA → improved pose + structured semantic sparse map。

---

## 1. 核心问题

ORB-SLAM2 的地图是 camera poses + sparse 3D map points，缺乏语义和结构含义。很多室内/城市场景由桌子、地面、墙面、书本、键盘等语义结构组成，BA 只知道 reprojection error，不知道点属于哪个物体或结构。

S3LAM 的目标：让 sparse SLAM 地图从 unstructured sparse point cloud 变成 semantic clustered sparse structure map。

---

## 2. 系统定位

Monocular semantic SLAM + sparse feature-based SLAM + object/structure-aware BA。

- 不是 dense SLAM
- 不是 neural implicit SLAM
- 不是 GS-SLAM
- 不是 DROID-style learned recurrent BA
- 不是 MASt3R-style pointmap SLAM

本质：ORB-SLAM2 backbone + panoptic segmentation side channel + semantic map point clustering + plane fitting + planar regularized BA。

---

## 3. 输入与输出

### 输入
- Monocular RGB sequence
- 不需要 RGB-D 或 depth sensor
- 不需要专门的 plane estimation CNN

### 输出
1. Monocular camera trajectory
2. ORB-SLAM2 sparse map points
3. Semantic class distribution for map points
4. Object/structure clusters
5. Fitted planes for planar clusters
6. Planar-constrained optimized map

地图是 semantic sparse map，不是 dense mesh 或 Gaussian map。

---

## 4. 总体 Pipeline

```
输入 RGB frame
→ ORB-SLAM2 tracking / local mapping
→ keyframe panoptic segmentation
→ map point semantic probability fusion
→ semantic-instance cluster creation / merging
→ plane fitting for planar clusters
→ planar-constrained global BA
```

---

## 5. ORB-SLAM2 Backbone

底座是 ORB-SLAM2，继承其结构：
- tracking thread: ORB feature extraction, pose estimation, local map tracking
- local mapping thread: keyframe insertion, map point triangulation, local BA
- loop closing thread: place recognition, loop correction / pose graph optimization

结构先验是后加约束，不是像 DROID 或 MASt3R-SLAM 那样全流程可微或 pointmap prior 放到底层。

---

## 6. Panoptic Segmentation

### 为什么用 panoptic
- Bounding box 混有背景，需要额外 refinement
- Panoptic 给每个像素 class，同类多个 instance 分开
- 能同时分割 object 和 stuff/structure（floor, road）
- 自然知道哪些 keypoints 属于 detected object

### 不需要每帧跑
Panoptic 较重（当时 10–20 FPS），但低频分割对 mapping accuracy 影响较小。设计：high-frequency ORB-SLAM2 tracking + lower-frequency keyframe-level side process。

---

## 7. Map Point Semantic Fusion

对同一个 3D map point 的多次观测做 semantic probability fusion（Bayes-rule 风格）。每个 map point 变为：
- 3D position
- ORB descriptor / observations
- semantic probability distribution
- semantic class
- instance id

即使 panoptic segmentation 有噪声，融合后的语义更稳定。

---

## 8. Instance Tracking & Cluster Creation

### Instance ID 不稳定
Panoptic segmentation 的 instance id 在不同帧间不一致。两阶段策略：
1. **2D IoU tracking**: 当前帧 instance 与前后帧同类 instance 计算 IoU，取最大值
2. **3D cluster merge**: object 离开再回来时可能换 id → centroid distance < threshold 且 >80% descriptors match 则 merge

### Cluster 定义
```
cluster C_k = {points belonging to same semantic class and instance}
```
例如：C_table_1, C_keyboard_1, C_book_1, C_book_2, C_floor, C_road

---

## 9. Plane Fitting for Planar Clusters

对 a priori planar cluster，用 cluster 内 triangulated 3D map points 拟合平面：**SVD inside RANSAC loop**。

不需要 depth，不需要专门的 plane estimation CNN。

### Plane acceptance
检查 inliers 数量。不同 class 不同阈值（如 keyboard ≥ 50 inliers）。

---

## 10. Planar-constrained Bundle Adjustment

### 普通 BA
min Σ reprojection_error(observation_ij, project(T_i, X_j))

### S3LAM BA
min Σ reprojection residuals + Σ point-plane residuals for planar clusters

对属于 planar cluster 的每个 point 加 unary point-plane constraint：distance(X_j, π_k)。

### 关键设计
- **Soft regularizer**，不是硬投影到平面（避免过强先验拉坏地图）
- **Huber loss** 加权
- 根据 **plane uncertainty** 加权
- **不优化 plane 参数**（plane 是 fitted prior，不是 active landmark state）
- 用 g2o 实现：classical BA graph + unary constraint per planar point
- Point-plane error 超过 chi-squared 95th percentile → outlier

---

## 11. 实验表现

### 实时性
- S3LAM 本体 ~20 FPS（不含 segmentation network）
- Detectron2 panoptic inference: ~53–98 ms (RTX 2070)

### TUM RGB-D (monocular)

| Sequence | ORB-SLAM2 | S3LAM |
|---|---|---|
| fr1_xyz | 9.2 mm | 8.8 mm |
| fr1_floor | 18.1 mm | 14.7 mm |
| fr3_nost_text_near | 20.3 mm | 15.3 mm |
| fr3_nost_text_near loop | 14.5 mm | 10.9 mm |

强平面场景提升更明显；clutter 多的场景提升有限。

### KITTI raw
ATE mean: ORB-SLAM2 40.4 cm → S3LAM 34.2 cm。单序列 0926-0013: 18.0 → 7.5 cm。

### 结构一致性
fr1_desk plane normal median angle: 2.9°；fr3_nost_text_near: 0.8°。

---

## 12. 强项

1. **语义从"标签显示"推进到"几何约束"** — semantic cluster → structure prior → BA constraint
2. **对 man-made structured scenes 有明确收益** — 室内桌面/地面/书本/道路
3. **不需要 RGB-D / 专用平面 CNN** — 用 ORB triangulated 3D points 直接拟合
4. **结构约束是 soft regularizer** — Huber + uncertainty + outlier rejection，比 hard projection 安全
5. **设计模块化** — ORB-SLAM2 tracking + panoptic side-channel + cluster abstraction + plane fitting + g2o BA

---

## 13. 局限

1. **仍然是 sparse SLAM** — 不生成 dense surface，不提供 GS-ready geometry
2. **依赖 segmentation 质量** — segmentation 错 → cluster 错 → plane 错 → BA 污染
3. **Plane 只适合部分 class** — COCO 中约 25% 可用 plane，chair/sofa/plant 不适合
4. **Plane 不作为可优化 landmark** — fitted constraint 而非 joint variable
5. **动态物体不是核心处理对象**
6. **不属于 modern learned dense SLAM 路线**

---

## 14. 与 ORB-SLAM2 的关系

ORB-SLAM2 + semantic cluster map。最核心改动：
- MapPoint semantic probability
- Cluster abstraction
- Plane fitting
- Planar BA edge

---

## 15. 与 MASt3R-SLAM 的区别

| | MASt3R-SLAM | S3LAM |
|---|---|---|
| 前端 | learned two-view pointmap prior | ORB-SLAM2 sparse |
| 几何 | dense pointmap, ray camera | sparse points + plane prior |
| 语义 | 无 | panoptic segmentation + cluster |
| 优化 | keyframe graph second-order | g2o BA + point-plane regularizer |
| 目标 | dense monocular SLAM | semantic structured sparse SLAM |

---

## 16. 与 DROID-SLAM 的区别

| | DROID-SLAM | S3LAM |
|---|---|---|
| 核心信号 | dense correlation + recurrent + dense BA | sparse ORB + semantic side-channel |
| Temporal trust | 强（per-edge residual/confidence） | 弱（无） |
| 结构先验 | 无 | cluster-level plane prior |

---

## 17. 对 GS-SLAM / 3DGS 的启发

Gaussian 不应该只是 independent splats，可以属于 semantic/structural groups：
- floor Gaussians: share plane support prior
- table Gaussians: share local planar surface
- road Gaussians: share ground-plane prior

但 GS 优化对象不同（position/scale/rotation/opacity/SH），point-plane constraint 需改写为 anchor-to-plane / Gaussian center-to-plane / normal-to-plane residual。

---

## 18. 对 SkelGS-SLAM / Anchor 方向的具体启发

1. **Cluster 比单点更可靠** — anchor group / structural family 比孤立 anchor 更稳定
2. **Admission 应该是语义+几何双门控** — segmentation pass + temporal visibility + depth consistency + normal consistency + primitive fit + inlier threshold
3. **结构先验应该 soft** — regularizer 而非 hard writeback（与 no-writeback 一致）
4. **Plane 不够，但 primitive abstraction 很有用** — 可扩展到 line/edge, quadric, cuboid, local tangent patch
5. **补 DPVO/DROID 的短板** — DROID 给 temporal evidence，S3LAM 给 semantic/structural grouping

---

## 19. 结构化改造建议：Structured Anchor Layer

变量：
- anchor a_i: 3D position, normal, confidence, support observations, temporal residual history, semantic label, group id
- cluster C_k: semantic class, instance id, anchor members, fitted primitive, inlier ratio, maturity score
- primitive π_k: plane/tangent patch, normal, offset, uncertainty

Factors:
- reprojection/tracking residual
- depth consistency residual
- normal consistency residual
- anchor-to-primitive residual
- semantic support residual
- temporal survival score
- dynamic rejection score

---

## 20. 总体评价

S3LAM 的价值不在于比 DROID/MASt3R 更强，而在于提出清楚思路：SLAM map 不应只是几何点云；语义实例和结构 primitive 可以反过来约束几何优化。

对当前方向的最终判断：
- **不适合**作为主 tracking/depth-pose frontend
- **适合**作为 anchor group / structure prior / semantic support layer 的参考

**四篇论文的定位：**
- MASt3R-SLAM: strong two-view dense geometry prior
- DROID-SLAM: dense recurrent temporal optimization signal
- DPVO: lightweight sparse temporal optimization signal
- S3LAM: semantic cluster + structural primitive prior

---

## Related extracted notes

### Concepts
- [Semantic-Cluster-Structure-Prior](Semantic-Cluster-Structure-Prior) — 语义聚类 → 结构先验
- [Point-Plane-Regularizer](Point-Plane-Regularizer) — BA 中点平面 soft constraint

### Methods
- [Panoptic-SLAM-Fusion](Panoptic-SLAM-Fusion) — 2D panoptic → 3D semantic fusion
- [Structured-Anchor-Group](Structured-Anchor-Group) — anchor 从孤立点升级为语义/结构支撑 group

### Project
- [SkelGS-SLAM: S3LAM 分析结论](10_Projects/SkelGS-SLAM/decision-log)
