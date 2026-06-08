---
title: "DROID-SLAM: Deep Visual SLAM for Monocular, Stereo, and RGB-D"
date: 2026-06-08
updated: 2026-06-08
summary: DROID-SLAM 是一个 learned dense SLAM 系统，核心是用 RAFT-style recurrent update operator 反复修正 dense correspondence，然后通过 differentiable Dense Bundle Adjustment，把这些 correspondence 修正映射成相机位姿和逐像素 inverse depth 的联合更新。

tags:
  - SLAM
  - dense-SLAM
  - monocular
  - Keyframe
  - Loop-Closure
  - GS-SLAM
relatedNotes: []
category: 文献笔记
importance: 2
draft: false
type: note
---

# DROID-SLAM: Deep Visual SLAM for Monocular, Stereo, and RGB-D

> NeurIPS 2021. 论文整理笔记。
> 📄 [PDF 原文](DROID-SLAM.pdf) (10 MB)

## 0. 一句话结论

DROID-SLAM 是一个 learned dense SLAM 系统，核心是用 RAFT-style recurrent update operator 反复修正 dense correspondence，然后通过 differentiable Dense Bundle Adjustment，把这些 correspondence 修正映射成相机位姿和逐像素 inverse depth 的联合更新。

本质：images → dense features / correlation volumes → recurrent correspondence revision → confidence-weighted dense BA → pose + inverse depth joint update → frontend local BA + backend global BA。

---

## 1. 核心问题

传统 SLAM 观测构建脆弱，深度学习匹配更强但缺乏真正全局几何优化。DROID-SLAM 将两者结合：learned dense correspondence + recurrent refinement + geometric dense BA layer。

它不属于 direct 也不属于 indirect：不像 indirect 先检测 sparse features，不像 direct 优化 photometric error；它使用全图 dense visual information 但优化的是 geometric reprojection-style error。

---

## 2. 输入与输出

### 输入
- Monocular RGB video / Stereo / RGB-D
- **需要相机内参**（与 MASt3R-SLAM 的 uncalibrated 不同）
- 只用 monocular 训练，测试时可直接用 stereo 或 RGB-D

### 输出
1. camera trajectory
2. keyframe poses
3. non-keyframe poses
4. dense inverse depth maps
5. dense 3D reconstruction

输出 dense depth / pointcloud-style reconstruction，不是 TSDF map 或 Gaussian map。

---

## 3. 核心状态变量

每帧两个状态变量：

- pose: G_t ∈ SE(3)
- inverse depth: d_t ∈ R^{H×W}_+

所有变量在 inference 中随新帧加入迭代更新。

---

## 4. Frame Graph 优化骨架

V = frames / keyframes, E = covisible frame pairs

如果 edge (i, j) 表示帧 I_i 和 I_j 有足够视野重叠。graph 动态构建，pose/depth 更新后可重新计算 visibility。包括：
- local temporal edges
- covisibility edges
- long-range loop edges → joint pose-depth graph optimisation

---

## 5. 网络结构总览

四块：feature extraction → correlation pyramid → recurrent update operator → dense bundle adjustment layer

整体循环：
```
当前 pose/depth
→ 根据几何投影预测 correspondence
→ 在 correlation volume 上 lookup visual evidence
→ ConvGRU 预测 flow revision + confidence + damping
→ DBA 求解 pose/depth 更新
→ 更新 pose/depth → 下一轮
```

---

## 6. Feature Extraction & Correlation Volume

### Feature extraction
- 6 个 residual blocks + 3 个 downsampling layers
- 输出分辨率 1/8 的 dense feature map
- 两个网络：feature network（构建 correlation volume）和 context network（提供上下文特征）

### 4D correlation volume
对 frame graph 每条边 (i, j)：

C_ij[u1, v1, u2, v2] = feature_i[u1, v1] · feature_j[u2, v2]

本质是 RAFT 思路：不先固定匹配点，保留 dense visual similarity field 供后续模块反复查询。后两个维度做 average pooling 构成 4-level correlation pyramid。

---

## 7. Recurrent Update Operator

### 当前几何先预测 correspondence
pixel p_i + inverse depth d_i → backproject → relative pose G_ij → project to frame j → p_ij

### 从 correlation volume lookup
围绕 p_ij 位置在 pyramid 上查询，输入 ConvGRU 的信息包括：
1. correlation lookup features
2. current flow (由 pose/depth 诱导)
3. previous BA residual
4. context features
5. hidden state

**关键：带 BA feedback 的 recurrent optimisation trace。**

### ConvGRU 输出
1. **revision flow r_ij** — 网络认为当前几何投影需要修正多少
2. **confidence map w_ij** — 每个 residual 在 DBA 中的权重
3. pixel-wise damping λ
4. upsampling mask

网络不直接说"pose 应该怎么动"，而是说"匹配位置错了多少、哪些像素可信"，然后 DBA 用几何方程求解。

---

## 8. Dense Bundle Adjustment Layer

### 目标函数
min Σ || p*_ij - Π_c(G'_ij ∘ Π_c^{-1}(p_i, d'_i)) ||²_Σij, Σ_ij = diag(w_ij)

网络预测 corrected correspondence p*_ij = p_ij + r_ij，DBA 求解哪组 pose + inverse depth 能让几何投影最接近。

### 为什么叫 Dense BA
传统 BA 优化 camera poses + sparse 3D landmarks；DROID 优化 camera poses + per-pixel inverse depth。与 BA-Net 不同：BA-Net 优化 depth basis 系数，DROID 直接优化逐像素 depth。

### 求解方式
Gauss-Newton，Hessian 有 block structure：
- pose block + depth block
- Schur complement 消元 depth → 解 reduced camera system → 恢复 depth update
- 训练时在 PyTorch 计算图中反向传播
- 推理时 custom CUDA kernel + sparse Cholesky

---

## 9. 推理系统：Frontend + Backend

两个异步线程：
- **Frontend**: new frame processing, feature extraction, keyframe selection, local BA
- **Backend**: global BA over keyframe history

官方支持 asynchronous multi-GPU（两个独立 Python processes）。

---

## 10. 初始化

1. 收集 frames 直到 12 帧
2. 只保留与前一帧 optical flow > 16 px 的帧
3. 构建初始 frame graph，3 timesteps 内 keyframes 加 edges
4. 运行 10 次 update operator

不是一帧帧贪心 tracking，而是先建小窗口再做 recurrent dense BA 初始化。

---

## 11. Frontend

新帧处理流程：
1. extract features
2. add frame to graph
3. 与 mean optical flow 最近的 3 个邻居连边
4. 用 linear motion model 初始化 pose
5. 运行若干次 update operator
6. 更新 keyframe poses 和 depths
7. keyframe removal：flow 小 → 冗余删除；没好删的 → 删最旧

---

## 12. Backend

全局 BA over keyframe history：
1. 对所有 keyframe pairs 计算 flow-based distance matrix
2. 先加 temporal edges
3. 按 flow distance 从小到大采样 covisibility edges
4. 抑制邻近重复 edges
5. 对整个 graph 运行 update operator
6. 做 global dense BA

用 RAFT memory-efficient implementation 避免爆显存。

---

## 13. Non-keyframe Pose Recovery

- Keyframes: full dense BA (pose + inverse depth)
- Non-keyframes: motion-only BA，估计相对邻近 keyframes 的 pose

---

## 14. Stereo & RGB-D 模式

只用 monocular 训练，测试时可接 stereo / RGB-D。

- **RGB-D**: depth 仍当变量（传感器 depth 有 noise/missing），只加 measured depth 平方误差约束
- **Stereo**: 左右相机当双倍 frames，DBA 层内固定 left-right relative pose

只要 sensor constraint 能写进 DBA，就能接进去。

---

## 15. 训练方式

### Gauge freedom 处理
Fix first pose（移除 6-DoF gauge）+ fix second pose（解决 scale freedom）

### Training sequence
7-frame video sequence，预计算 average optical flow，overlap < 50% 的 pair 设为 infinity。采样要求 adjacent frames flow 在 8–96px 之间。

### Loss
1. Pose loss: GT pose 和 predicted pose 在 SE(3) log space 的距离
2. Flow loss: predicted 与 GT 诱导的 optical flow 之差
3. 每次 iteration 输出上施加，γ = 0.9 逐步加权

---

## 16. 实验表现

TartanAir SLAM competition: monocular error 降低 62%, stereo 降低 60%
EuRoC monocular: 相比 ORB-SLAM3 降低 43% error

### 资源需求
- 推理 demo: ~11 GB GPU memory
- 训练: ≥24 GB, 官方 4×RTX 3090
- TartanAir / ETH3D 评估: 24 GB
- EuRoC / TUM: 1080Ti 可运行

---

## 17. 强项

1. **Dense temporal optimisation signal 极强** — graph edge 提供 correlation, correspondence, revision, confidence, BA residual, damping, update magnitude 等多种 signal
2. **Pose-depth joint update** — DBA 里联合更新 pose Δξ 和 depth Δd
3. **真正 frontend/backend SLAM 结构** — 初始化、local BA、keyframe selection、global BA、loop edges
4. **Stereo/RGB-D 泛化设计优雅** — learned component 和 geometric solver 分工清楚

---

## 18. 弱点与风险

1. **计算和显存成本高** — dense correlation + dense BA，至少 ~11 GB
2. **动态物体不是显式建模** — 靠 confidence/robustness 撑，无 semantic mask
3. **单目 scale/gauge 仍存在** — 需外部 metric depth prior 或 stereo/RGB-D
4. **Dense depth ≠ 高质量 surface** — 为 pose/depth consistency 服务，非 surface/mesh/Normal 优化
5. **Confidence 是 learned BA weight** — 非完整 Bayesian uncertainty，需二次校准

---

## 19. 与 MASt3R-SLAM 核心区别

| | MASt3R-SLAM | DROID-SLAM |
|---|---|---|
| 信息来源 | two-view 3D prior | dense visual correlation + recurrent flow |
| 匹配方式 | ray-based iterative projective | correlation volume lookup + revision |
| 几何优化 | second-order graph (keyframe) | differentiable dense BA |
| 内参需求 | generic central camera (uncalibrated) | 需要已知内参 |
| 强项 | wide-baseline, uncalibrated, pointmap prior | temporal optimisation, pose-depth joint, recurrent trace |

---

## 20. 与 DPVO 关系

| | DROID-SLAM | DPVO |
|---|---|---|
| 信号 | dense all-pixel | sparse patch |
| 速度 | 较慢 | ~3× faster |
| 显存 | ~11 GB | ~1/3 of DROID |
| 精度 | 更高 | accuracy-efficiency trade-off |

---

## 21. 对 SkelGS-SLAM 的借鉴

### 最值得挖的不是深度图，而是优化痕迹
可用信号：
- w_ij: per-pixel / per-edge confidence
- r_ij: 网络认为当前投影需要修正多少
- BA residual: p*_ij − projected
- Δd: depth update magnitude
- Δξ: pose update magnitude
- λ: damping / local depth instability
- frame graph edge survival: covisibility stability
- flow distance: baseline / redundancy signal

### Anchor 映射
- **admission**: low residual, high confidence, repeated visibility, small update magnitude, stable depth
- **rejection**: high residual, low confidence, large revision, inconsistent depth, unstable covisibility

### 定位
DROID-SLAM = temporal optimisation backbone，不是 final geometry oracle。

---

## 22. 最终判断

DROID/DPVO 比 MASt3R 更适合作为 anchor/packet coherence 的主时间骨架。

**最合理的研究定位：**
- DROID/DPVO: 时序优化骨架和 trust signal
- MASt3R: 强 two-view / loop / wide-baseline geometry proposal
- Depth-normal predictor: 更平滑 metric-like dense geometry
- CertifiedGeometryPacket / Anchor skeleton: 负责把这些信号变成 GS 可消费的稳定结构

一句话：MASt3R-SLAM 强在单对/宽基线 learned 3D prior；DROID-SLAM 强在 dense recurrent pose-depth optimisation；DPVO 强在轻量 temporal patch optimisation。Anchor/packet coherence 更需要 DROID/DPVO 的 temporal signal，但最终 GS geometry 仍须 certification。

---

## Related extracted notes

### Concepts
- [Dense-Bundle-Adjustment](Dense-Bundle-Adjustment) — 可微 dense BA layer
- [Recurrent-Correction-Update](Recurrent-Correction-Update) — RAFT-style recurrent revision
- [Correlation-Volume](Correlation-Volume) — 4D all-pairs correlation volume

### Methods
- [DROID-Frontend-Backend](DROID-Frontend-Backend) — frontend local BA + backend global BA 系统结构
- [DROID-Training-Gauge](DROID-Training-Gauge) — 显式 fix pose gauge 训练方法

### Project
- [SkelGS-SLAM: DROID-SLAM 分析结论](10_Projects/SkelGS-SLAM/decision-log)
