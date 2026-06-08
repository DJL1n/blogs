---
title: Deep Patch Visual Odometry (DPVO)
date: 2026-06-08
updated: 2026-06-08
summary: DPVO 是一个 monocular visual odometry 系统，核心是用 sparse learned image patches 替代 DROID-SLAM 的 dense optical flow，再通过 recurrent update operator + differentiable BA 联合优化相机位姿和 patch inverse depth。

tags:
  - Visual-Odometry
  - monocular
  - Online
  - Feature-Matching
  - GS-SLAM
relatedNotes: []
category: 文献笔记
importance: 2
draft: false
type: note
---

# Deep Patch Visual Odometry (DPVO)

> NeurIPS 2023. 论文整理笔记。
> 📄 [PDF 原文](DPVO.pdf)
> 作者：Zachary Teed, Lahav Lipson, Jia Deng.

## 0. 一句话结论

DPVO 是一个 monocular visual odometry 系统，核心是用 sparse learned image patches 替代 DROID-SLAM 的 dense optical flow，再通过 recurrent update operator + differentiable BA 联合优化相机位姿和 patch inverse depth。

定位：DROID-SLAM 的 sparse patch 化版本。比 DROID 显存更低（57%/29%）、帧率更高（60/120 FPS）、更稳定。

---

## 1. 核心问题

DROID-SLAM 证明了 deep correspondence + recurrent update + differentiable BA 的有效性，但 dense flow 很重：显存高、计算重、fast motion 时 runtime 波动大。

DPVO 核心判断：dense flow 不是深度学习 VO 鲁棒性的必要条件。选择少量 patches 做 patch-level matching + confidence + outlier rejection + sparse BA，足以达到接近或超过 DROID-VO 的精度。

---

## 2. 输入与输出

### 输入
- Monocular RGB video + camera intrinsics
- 需要已知内参（非 uncalibrated）

### 输出
1. Camera trajectory
2. Keyframe poses
3. Patch inverse depths
4. Sparse point cloud / reconstruction
5. Optional COLMAP-format output

非 dense mapping 系统，非 GS renderer。

---

## 3. 核心状态变量

- Camera poses: T_i ∈ SE(3)
- Patches: P_k = {pixel coordinates, inverse depth} — small image patch + one inverse depth + source frame
- Patch graph: E = {(patch k, frame j)}

每个 patch 是 4 × p² homogeneous array (x, y, 1, d)，假设一个 patch 内共享常数深度（fronto-parallel plane）。

---

## 4. Patch Graph

Bipartite graph: nodes = patches + frames; edges = patch k connected to frame j。

默认 patch 与 source frame 前后 r 个 frames 建边。Patch 在所有 connected frames 中的 reprojection 组成该 patch 的 trajectory。

与 sparse keypoint VO 的区别：DPVO 不是 pairwise matching，而是在 patch graph 上维护 patch 的短期轨迹。

---

## 5. Patch Reprojection

Source frame i 中的 patch P_k 投影到 target frame j：
P'_kj ~ K T_j T_i^{-1} K^{-1} P_k

Correspondence 不是自由 optical flow，始终被当前 pose/depth 诱导。

---

## 6. Feature Extraction

两个 residual networks:
- **Matching feature network**: 视觉匹配相似度，构建 1/4 + 1/16 两层 pyramid
- **Context feature network**: recurrent update operator 的局部上下文

从 feature map 随机采样 p×p patches。实验发现随机采样少量 patches（64/帧）即可工作，且比 SIFT/ORB/SuperPoint 更好。

---

## 7. Recurrent Update Operator

每次 update operator 作用在 patch graph 上，为每条 edge 维护 hidden state：

```
current pose/depth
→ reproject patch to connected frame
→ local correlation lookup (7×7 grid, two pyramid levels)
→ 1D temporal convolution along patch trajectory
→ softmax aggregation / message passing across patch graph
→ transition block updates hidden state
→ factor head predicts 2D trajectory revision + confidence
→ differentiable BA updates poses + patch inverse depths
```

---

## 8. Local Correlation

对 edge (k, j)，在 reprojection 附近做 7×7 局部搜索。Patch 内每个像素的 feature 与目标 frame feature 在局部 7×7 位置做 inner product。在 1/4 和 1/16 两层 pyramid 上做，拼接结果。

与 DROID 不同：DROID 是全局 dense correlation，DPVO 是 sparse patch + 局部 geometric reprojection 附近的 correlation。

---

## 9. 1D Temporal Convolution

沿 patch trajectory 传播信息：取同一 patch 在相邻时间 edges 的特征，拼接后 linear projection。允许网络建模 patch appearance 随时间的变化。

---

## 10. Softmax Aggregation

两类 graph-based aggregation：
- **Patch aggregation**: 同 patch 不同 frame 的观测互相交流
- **Frame aggregation**: 同 source frame 的多个 patches 在同一 target frame 上互相交流

---

## 11. Factor Head

预测每条 edge 的两个量：
- δ_kj: 2D trajectory update / flow revision
- Σ_kj: confidence weight (sigmoid, 0-1)

网络说"当前几何投影应该往哪里修正？这个修正有多可信？"，BA 说"哪组 pose+depth 最能解释这些修正？"

Confidence 通过 BA pose supervision 学出，非直接监督。

---

## 12. Differentiable BA

min Σ || ω_ij(T, P_k) - [P'_kj + δ_kj] ||²_Σkj

优化变量：camera poses + patch inverse depths
固定：source patch pixel coordinates
观测：network-predicted trajectory revisions
权重：confidence Σ

两次 Gauss-Newton，Schur complement 消元。

---

## 13. VO 系统流程

### Initialization
8 帧初始化：累积 frames + patches，要求相邻帧 flow ≥ 8px，运行 12 次 update operator。

### Expansion
新帧 → extract features + patches → constant velocity pose init → median depth from prev 3 frames → add patch-frame edges

### Edge addition
每个 patch 最多连接 2r-1 个 frames → 约束 worst-case latency

### Optimization
每次加边后 1 update iteration + 2 BA iterations。固定除最近 10 个 keyframes 外的 poses，所有 patch depths 自由。Patch 离开 window 后移除。

### Keyframing
近 3 帧始终 keyframes；若 t-5 与 t-3 间 flow < 64px，删 t-4 keyframe。

---

## 14. 训练

TartanAir 监督训练。采样相邻帧 flow 在 16-72px 的 trajectories。

Loss: L = 10 L_pose + 0.1 L_flow。Pose 先 Umeyama alignment 再对 SE(3) log error 做监督。240k iterations, batch size 1, 单 RTX 3090 ~3.5 天。

---

## 15. 实验表现

### Runtime / Memory
| | Avg FPS | Worst FPS | Memory |
|---|---|---|---|
| DROID-VO | 40 | 11 | 100% |
| DPVO default | **60** | **48** | **57%** |
| DPVO fast | **120** | **98** | **29%** |

### TartanAir (ATE)
- DPVO default: 0.21
- DPVO fast: 0.28
- DROID-VO: 0.58
- DROID-SLAM (w/ loop): 0.33

### ICL-NUIM (ATE)
- DPVO default: 0.097
- DPVO fast: 0.093
- DROID-VO: 0.215
- DROID-SLAM: 0.189

---

## 16. 强项

1. **速度和显存优于 DROID** — default 60 FPS / 57% memory, fast 120 FPS / 29% memory
2. **Patch lifecycle** — source frame, connected frames, trajectory revisions δ, confidence Σ, depth updates, BA residuals, survival time
3. **Learned outlier rejection** — confidence 通过 pose supervision 学出
4. **运行时间更稳定** — 每个 patch 最多 2r-1 edges，约束 worst-case latency
5. **经典 VO 兼容结构** — DSO patch representation + learned matching + differentiable BA

---

## 17. 局限

1. **VO 不是完整 SLAM** — 无 loop closure / global optimization / relocalization
2. **Sparse patches 不提供 dense geometry** — 无 dense depth/normal/surface
3. **Patch depth 假设粗** — fronto-parallel，depth discontinuity / slanted surface 有误差
4. **Monocular scale 不稳定** — 评估需 scale alignment
5. **动态物体无显式建模** — 有 confidence weighting 但无 semantic dynamic mask

---

## 18. vs DROID-SLAM

| | DROID-SLAM | DPVO |
|---|---|---|
| 信号 | dense optical flow | sparse patches |
| Correlation | dense global | local 7×7 |
| BA | dense inverse depth | patch inverse depth |
| FPS | 40 (worst 11) | 60-120 (worst 48-98) |
| Memory | 100% | 29-57% |
| 精度 | dense signal richer | 推理更快、更稳定 |

---

## 19. vs MASt3R-SLAM

MASt3R-SLAM: wide-baseline geometry, dense pointmap, uncalibrated
DPVO: online high-rate tracking, patch lifecycle confidence, local pose-depth trace

非替代关系，可互补：DPVO 做 temporal skeleton，MASt3R 做 wide-baseline proposal。

---

## 20. vs LightGlue

LightGlue: pairwise sparse matcher, 无 depth/pose/BA
DPVO: online recurrent VO, 自采 patches, 自维护 graph, 自己做 BA

LightGlue 适合 side verification；DPVO 适合作为主 tracking frontend。

---

## 21. 对 SkelGS-SLAM / Anchor Skeleton 的价值

### 最适合作为 anchor temporal evidence source

DPVO patch graph 天然提供：
- **patch lifetime**: 在窗口内活了多久
- **edge confidence Σ**: 是否长期高
- **trajectory revision δ**: 是否长期小且稳定
- **BA residual**: 是否被同一 pose-depth 解释
- **depth update**: inverse depth 是否反复大幅变化
- **visibility**: 是否在多个 connected frames 中稳定可见
- **motion consistency**: 是否符合 camera-induced motion

### 合理流程
```
DPVO patch → anchor candidate
DPVO temporal evidence + depth/normal predictor + multi-view reprojection + free-space/surface-band gate → certified anchor
certified anchor → child Gaussian birth
```

### 不建议
```
DPVO patch depth → 直接 birth Gaussian
```

### 实验建议
1. **Shadow diagnostics** — 对每个 DPVO patch 记录所有信号，算 AnchorScore，不写回
2. **Anchor admission** — temporal gate → depth/normal gate → geometric gate → static support gate → CertifiedAnchor
3. **ChildGS** — CertifiedAnchor → local tangent frame → spawn child Gaussians

---

## 22. 最终定位

| 系统 | 定位 | 对 SkelGS-SLAM 价值 |
|---|---|---|
| **DPVO** | sparse patch recurrent VO | **temporal tracking + anchor trust backbone** |
| DROID-SLAM | dense recurrent pose-depth | richer but heavier temporal signal |
| MASt3R-SLAM | dense two-view geometry | robust geometry proposal |
| S3LAM | semantic cluster + structure | structural grouping |
| ESLAM | RGB-D TSDF implicit mapping | surface-band / free-space regularization |
| LightGlue | fast sparse matching | pair verification / loop / reloc |
| Scaffold-GS | structured GS backend | anchor-conditioned GS birth / ChildGS |

**一句话：DPVO = DROID 思想的 sparse patch 化版本；最适合作为 anchor skeleton / temporal trust backbone，但 GS birth 仍必须经过二次认证。**

---

## Related extracted notes

### Concepts
- [Patch-Graph-VO](Patch-Graph-VO) — sparse patch graph for VO
- [Patch-Lifecycle](Patch-Lifecycle) — patch temporal lifecycle as anchor maturity evidence

### Methods
- [DPVO-Temporal-Frontend](DPVO-Temporal-Frontend) — DPVO 作为 anchor temporal backbone 的集成
- [Patch-Temporal-Optimization](Patch-Temporal-Optimization) — recurrent patch tracking + differentiable BA methodology

### Project
- [SkelGS-SLAM: DPVO 分析结论](10_Projects/SkelGS-SLAM/decision-log)
