---
title: "MASt3R-SLAM: Real-Time Dense SLAM with 3D Reconstruction Priors"
date: 2026-06-08
updated: 2026-06-08
summary: MASt3R-SLAM 是一个以 MASt3R two-view 3D reconstruction prior 为底座的实时单目 dense SLAM 系统。 它不是传统 ORB/DSO 那类 sparse/photometric SLAM，也不是 DROID 那种 dense flow + recurrent BA 系统，而是把 MASt3R 输出的 pointmap、confidence、dense feature、ray camera model 统一用于：

tags:
  - SLAM
  - dense-SLAM
  - monocular
  - Foundation-Model
  - Point-Cloud
  - Loop-Closure
  - GS-SLAM
relatedNotes: []
category: 文献笔记
importance: 2
draft: false
type: note
---

# MASt3R-SLAM: Real-Time Dense SLAM with 3D Reconstruction Priors

> CVPR 2025. 论文整理笔记。
> 📄 [PDF 原文](MASt3R-SLAM.pdf) (2.4 MB)

## 0. 一句话结论

MASt3R-SLAM 是一个以 MASt3R two-view 3D reconstruction prior 为底座的实时单目 dense SLAM 系统。
它不是传统 ORB/DSO 那类 sparse/photometric SLAM，也不是 DROID 那种 dense flow + recurrent BA 系统，而是把 MASt3R 输出的 pointmap、confidence、dense feature、ray camera model 统一用于：

tracking → local pointmap fusion → keyframe graph construction → loop closure → global optimisation → relocalisation

官方论文目标是从单目 RGB 视频中实时得到全局一致的相机轨迹和 dense geometry，论文称系统在 RTX 4090 上约 15 FPS。

---

## 1. 核心问题

传统单目 SLAM 的主要困难：
- RGB-only → 没有真实深度 → 尺度不确定
- pose / depth / camera model / matching 强耦合
- 稠密几何更难保持多视角一致

MASt3R-SLAM 的不同点：把 two-view 3D reconstruction prior 当作统一几何来源。MASt3R / DUSt3R 直接从两张图预测在共同坐标系下的 dense pointmap，相当于把匹配、深度、相对几何都压进了一个 learned two-view prior。

本质：
- 不是：image → depth → pose → map
- 而是：image pair → common-frame pointmaps + matches → ray-based pose tracking → pointmap fusion → keyframe graph optimisation

---

## 2. 系统输入与输出

### 输入
- RGB video stream
- 可以无相机内参（仅假设 generic central camera model，所有光线通过唯一相机中心）

### 输出
1. keyframe poses
2. current frame tracking pose
3. globally consistent trajectory
4. fused dense pointmap / dense geometry
5. loop-closed keyframe graph

输出的是 dense geometry / pointmap map，不是 Gaussian map，也不是 NeRF map。

---

## 3. MASt3R 和 MASt3R-SLAM 的关系

| | MASt3R | MASt3R-SLAM |
|---|---|---|
| 定位 | 两视图几何先验网络 | 在线 SLAM 系统 |
| 输入 | image pair | RGB video stream |
| 输出 | pointmaps, confidence, dense matching features | poses, trajectories, dense geometry, keyframe graph |
| 角色 | building block | 完整系统 |

---

## 4. 核心数据表示

### Pointmap
对每个像素 p，网络预测一个 3D 点 X(p)。这些 3D 点是在两视图共同坐标系中预测的。MASt3R 额外输出 pointmap confidence、dense local features、feature confidence。

### Ray camera model
把 pointmap 归一化成 ray: `ray(p) = normalize(X(p))`。每一帧的 pointmap 都定义了一个 implicit central camera model，可以不使用固定内参。

### Pose / scale 表示
MASt3R-SLAM 把 pose 放在带 scale 的表示中处理（Sim(3)-like 7DoF pose: T = {R, t, s}），解决 MASt3R prediction 的 scale inconsistency。

---

## 5. 总体 Pipeline

```
输入新 RGB frame I_t
1. 与当前 keyframe 做 MASt3R two-view prediction
2. 得到 pairwise pointmaps / confidence / features
3. 用 efficient pointmap matching 建立 dense correspondence
4. 用 ray-based residual 估计当前帧相对 keyframe 的 pose
5. 将当前帧 pointmap 融合进 keyframe canonical pointmap
6. 判断是否生成新 keyframe
7. 新 keyframe 加入 backend graph
8. 用 MASt3R feature retrieval 查 loop candidates
9. 对 candidate pair 解码、匹配、加 loop edge
10. backend 用 second-order global optimisation 优化 keyframe graph
11. 若 tracking lost，则用 retrieval + matching 做 relocalisation
```

---

## 6. Efficient Pointmap Matching

核心工程贡献之一。不做全局 brute-force dense matching（O(N²)），而是利用 pointmap 定义的 ray field，把匹配看作局部优化问题。

### 方法
- 给定 reference frame 的 ray image + source frame 的 3D point
- 找到 reference image 中一个像素 u，使得 ray_ref(u) 与 transformed point direction 最接近
- 优化 angular error between rays
- 用 analytical Jacobians + Levenberg-Marquardt 求解，通常 10 次内收敛

### 加速
- Tracking 时用上一帧 matches 初始化
- 3D distance 太大的 matches 标记为 outlier 并失效
- 几何投影后再用 MASt3R per-pixel features 做局部 coarse-to-fine 搜索

### 性能
- Tracking matching: ~2 ms
- Graph edge construction: 几毫秒
- 原始 MASt3R matching: ~2000 ms（消融实验数据）

---

## 7. Tracking

Keyframe-based tracking，估计 current frame 相对 last keyframe 的 transformation。

### Ray-based tracking residual
用 ray error 而不是 3D point error：
- `normalize(X_ref) vs normalize(T X_cur)`
- 对深度误差更不敏感
- angular error 有界，对 outlier 更稳
- 加小权重 distance consistency term 防止 pure rotation 退化

### 优化方式
Gauss-Newton + IRLS + analytical Jacobian + robust weighting。

---

## 8. Pointmap Fusion

当前帧 pointmap 被融合进 keyframe 的 canonical pointmap（多帧 weighted average fusion）。
- 过滤 geometry estimate
- 也 filter camera model 本身（camera model 由 rays 定义）
- 利用多个 viewpoint 平均掉噪声，提高 canonical pointmap coherence

---

## 9. Keyframe Selection

触发条件：valid matches 数量不足，或 unique keyframe pixels 覆盖不足。新 keyframe 加入 graph 后添加与前一 keyframe 的双向 edge。

---

## 10. Graph Construction & Loop Closure

### Sequential edges
K_i ↔ K_{i-1} 保证局部时间连续性。

### Loop closure
不是 bag-of-words ORB loop，也不是 retrieval + PnP，而是：
1. MASt3R feature retrieval（改造 ASMK 为 incremental online）
2. MASt3R decoder verification（对 candidate pair 解码）
3. Pointmap matching（足够 matches 才加 edge）
4. Graph edge insertion

---

## 11. Backend Global Optimisation

目标：所有 keyframe poses 和 canonical pointmaps 在全局上更一致。

### 核心要素
- 优化变量：keyframe poses T_i ∈ Sim(3)，canonical pointmaps P_i
- Residual：ray error + 小权重 distance residual
- 算法：Gauss-Newton + sparse Cholesky decomposition
- 每个新 keyframe 最多 10 次 iteration
- **限制：没有在 full global optimisation 中 refine all geometry**

---

## 12. Relocalisation

Tracking lost 时触发：查询 retrieval database → 找到 candidate keyframes → 验证足够 matches → 加入 graph 作为新 keyframe → 恢复 tracking。

---

## 13. Known Calibration 模式

| | 无标定 | 有标定 |
|---|---|---|
| Pointmap | 完全自由 | 只 query depth，沿 known camera rays backproject |
| Residual | ray angular error | pixel reprojection error |

---

## 14. 实验表现

### Pose accuracy (ATE, m)

| Dataset | MASt3R-SLAM calib | DROID-SLAM | MASt3R-SLAM uncalib |
|---|---|---|---|
| TUM RGB-D | 0.030 | 0.038 | 0.060 |
| 7-Scenes | 0.047 | 0.049 | 0.066 |

### 消融关键结论
1. Matching 速度：0.5 ms (w/o feature refinement) / 2 ms (with) vs 原始 MASt3R ~2000 ms
2. Ray error vs point error ATE: 0.097 vs 0.155
3. Loop closure 效果：TUM ATE 0.064 → 0.030；EuRoC Vicon 0.233 → 0.029

---

## 15. 主要优点

1. 对 in-the-wild 单目视频更友好（强 two-view 3D prior）
2. 同时提供 pose 和 dense geometry（pointmap prior 有较强局部表面一致性）
3. 不强依赖固定内参（generic central camera model）
4. Matching 设计实用（GPU-friendly iterative projective matching）
5. 完整系统级设计（retrieval → loop verification → graph edge → global optimisation → relocalisation）

---

## 16. 主要局限

1. **Full global optimisation 没有 refine all geometry** — 最重要的局限
2. Scale inconsistency 仍然存在（只是被缓解，不是被彻底解决）
3. Decoder full resolution 是瓶颈
4. 对非针孔/强畸变的 learned prediction 可能退化（MASt3R 训练数据主要是 pinhole images）
5. 对动态物体不是专门设计

---

## 17. 与 DROID-SLAM / DPVO 的关键区别

| | MASt3R-SLAM | DROID-SLAM | DPVO |
|---|---|---|---|
| 核心信号 | two-view pointmap prior | dense correlation + recurrent update | sparse patch-level recurrent VO |
| 匹配 | ray-based iterative projective | correlation volume + dense BA | patch graph + differentiable BA |
| Pose 表示 | Sim(3) | SE(3) + inverse depth | SE(3) |
| 几何输出 | dense pointmap | dense inverse depth | sparse patches |
| 宽基线能力 | 强 | 弱 | 弱 |
| 无标定能力 | 强 | 弱 | 弱 |
| Temporal signal | 弱 | 强 | 强 |
| 实时性 | ~15 FPS (4090) | 实时 (同等硬件) | 更高帧率 |

---

## 18. 对 SkelGS-SLAM / GS frontend 的启发

### 可借鉴
1. **Ray residual** — direction/ray consistency 为主，depth/distance 为弱约束
2. **Canonical pointmap fusion** — raw two-view output → multi-view weighted fusion → GS birth
3. **Loop edge 必须 decoder verification** — retrieval candidate 不能直接成为约束
4. **Sim(3) gauge 显式建模** — scale 不能只靠后处理

### 不建议照搬作为 GS 前端终点
1. 不输出 GS-ready uncertainty
2. 没有 full global geometry refinement
3. Pointmap fusion 是 keyframe-local
4. 不显式处理 dynamic ownership

**合理定位：MASt3R-SLAM = strong geometric proposal generator，不是 final certified GS geometry provider。**

---

## 19. 关键判断

MASt3R-SLAM 的最大价值：证明 MASt3R two-view pointmap prior 可以被系统化成实时 dense SLAM，ray-based matching/tracking/graph optimisation 是可行的。

最大不足：还没有解决 full global pointmap refinement，即 pose-depth-scale-normal-confidence-GS birth 的统一一致性问题。

对你项目的现实结论：
- 鲁棒 monocular dense SLAM/GS demo → 值得作为 strong frontend 或 baseline
- 证明 GS 前端 geometry packet 的一致性改进 → 更适合作为对照和机制来源

最准确的定位：
- 强 two-view geometric prior SLAM: **MASt3R-SLAM**
- 强 temporal optimisation signal VO/SLAM: **DROID/DPVO**
- anchor/packet coherence 方向：吸收 MASt3R-SLAM 的 ray-consistency 和 canonical fusion，但 temporal trust/lifecycle/uncertainty 更可能来自 DPVO/DROID-style signals

---

## Related extracted notes

### Concepts
- [Ray-Camera-Model](Ray-Camera-Model) — ray 作为隐式相机模型
- [Canonical-Pointmap-Fusion](Canonical-Pointmap-Fusion) — 多视角 pointmap 加权融合
- [Ray-Residual](Ray-Residual) — 用方向误差代替 3D 深度误差

### Methods
- [Iterative-Projective-Pointmap-Matching](Iterative-Projective-Pointmap-Matching) — 高效 ray-based 匹配算法
- [Sim3-Pose-Representation](Sim3-Pose-Representation) — 显式处理 scale 的 pose 表示

### Project
- [SkelGS-SLAM: MASt3R-SLAM 分析结论](10_Projects/SkelGS-SLAM/decision-log)
