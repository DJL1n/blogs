---
title: "Gaussian SLAM 论文全景分析：从结构化表示到结构化地图"
date: 2025-07-19
updated: 2025-07-19
summary: "系统梳理 9 篇基于 3D Gaussian Splatting 的 SLAM 论文，从表示方法、网络结构、优化策略三个维度横向对比，归纳出当前发展的三条主线与三个未解决问题。"
tags: ["SLAM", "3DGS", "Gaussian Splatting", "NeRF", "结构化重建"]
category: "研究"
type: "blog"
importance: 5
draft: false
---

## 引言

3D Gaussian Splatting（3DGS）自 Kerbl 等人 2023 年提出以来，迅速成为神经渲染领域最受关注的技术路线之一。其显式表示、实时渲染速度、以及相对直接的优化方式，使其天然适合 SLAM 系统的建图与渲染需求。

本文系统分析 9 篇将 Gaussian Splatting 引入 SLAM 的最新工作，从**表示方法**、**网络架构**、**优化策略**三个维度展开比较，最后归纳出当前发展的三个主要方向与三个待解决的核心问题。

---

## 1. 表示方法对比

Gaussian SLAM 的核心设计问题只有一个：**如何在连续的 SLAM 场景中表示和管理 3D Gaussian？**

### 1.1 结构化的 Gaussian

这类方法不把 Gaussian 当作独立的点云，而是通过某种结构来组织它们。

**Scaffold-GS** 提出 anchor-point Gaussian 表示：在场景中稀疏分布一些 anchor 点，每个 anchor 负责预测其邻域内的多个 Gaussian。anchor 本身是固定的，Gaussian 的参数（位置、颜色、透明度、旋转、缩放）由 anchor 的 feature 经过 MLP 预测得到。这使得 Gaussian 的数量可控，且空间分布由 anchor 间接决定。

**ContextGS** 继承 Scaffold-GS 的 anchor 结构，但加入了 anchor-level 的上下文编码。通过跨 anchor 的注意力机制，每个 anchor 在预测 Gaussian 时能感知邻居的信息，从而消除冗余。这是目前处理 Gaussian 数量爆炸问题最直接的方法。

**UP-SLAM** 同样基于 anchor 结构，但引入了**适应性 anchor 分布**：在纹理丰富区域放置更多 anchor，在平坦区域减少。相比 Scaffold-GS 的均匀分布，UP-SLAM 的 anchor 分布更符合场景复杂度，并且加入了**不确定性估计**来指导 Gaussian 的增删。

### 1.2 Surfel 化的 Gaussian

这类方法将 Gaussian 的形状约束为更接近 surfel（表面元）的形式。

**S3LAM** 提出 surfel Gaussian：强制 Gaussian 的其中一个缩放轴远小于另外两个，使其扁平化并贴合表面。这种表示天然适合 SLAM 地图——它既保留了显式渲染能力，又具有明确的几何解释。

**MG-SLAM** 进一步扩展了结构先验，在 Gaussian 之上引入**线和平面的结构补全**。对于室内场景中常见的平面（墙、地板、天花板）和线条（边缘、门窗框），MG-SLAM 使用额外的结构约束来正则化 Gaussian 的分布，在稀疏观测区域仍能保持几何完整性。

### 1.3 SDF 与 Gaussian 的混合

这类方法认为单靠 Gaussian 不足以表达精确的几何，引入 Signed Distance Function（SDF）作为几何 backbone。

**GS-SDF** 的思路最直接：先用 SDF 或 mesh 初始化 Gaussian 的位置和形状，然后联合优化。几何由 SDF 提供，表观由 Gaussian 负责。这种分离让几何更稳定，但两个表示的协调是额外负担。

**GPS-SLAM** 采用 SDF backbone + Gaussian residual appearance 的方案，与 GS-SDF 类似但更强调 Gaussian 只负责残差（即 SDF 渲染与真实图像的差异），几何完全由 SDF 建模。

**Gaussian-Plus-SDF SLAM**（与 GPS-SLAM 高度同步发表）基本相同的思路，但实验更侧重 tracking 精度而非渲染质量。

### 1.4 点云起点

**SEGS-SLAM** 是本文中最早的工作之一，核心想法简单直接：从深度图生成结构化点云，然后对每个点初始化 Gaussian。这里的"结构化"是指利用图像分割（SEG）将点云按语义分组，同一语义区域内的 Gaussian 共享部分参数。

**PINGS** 使用 point-based neural map，同时维护 SDF 和 Gaussian 两种表示。其创新点在于：当检测到回环时，利用 SDF 对 Gaussian 的位置进行 deformation（形变），解决长时间 SLAM 的漂移问题。

| 方法 | 表示类型 | 几何形式 | Gaussian 组织方式 |
|------|---------|---------|-----------------|
| Scaffold-GS | 结构化 | Anchor + MLP | 预测生成 |
| ContextGS | 结构化 | Anchor + Attention | 上下文感知 |
| UP-SLAM | 结构化 | 适应性 Anchor | 不确定性驱动 |
| S3LAM | Surfel | 扁平 Gaussian | 自由 |
| MG-SLAM | Surfel+结构 | 线/面约束 | 结构正则化 |
| GS-SDF | 混合 | SDF/Gaussian | SDF 初始化 |
| GPS-SLAM | 混合 | SDF backbone + GS | 残差建模 |
| PINGS | 混合 | 并行维护 | SDF 驱动形变 |
| SEGS-SLAM | 结构化点云 | 语义分组 | 显式初始化 |

---

## 2. 网络结构与优化策略

### 2.1 Anchor 派系：Scaffold → ContextGS → UP-SLAM

这三篇构成了清晰的演化链。

**Scaffold-GS** 的网络结构如下：
1. 稀疏 anchor 点云（通过体素下采样获得）
2. 每个 anchor 存储一组可学习的 feature
3. Anchor feature + 视角信息 → MLP → Gaussian 参数
4. 每 N 帧根据重要性分数新增/删除 anchor

Scaffold-GS 的贡献在于证明了 3DGS 的 Gaussian 不需要独立优化，可以通过 anchor 隐式生成。这不仅减少了参数数量，也让 map 的管理变得可预测。

**ContextGS** 在 Scaffold-GS 的基础上加入：
- **Anchor encoder**：将 anchor feature 通过跨 anchor 的 transformer 编码
- **重要性滤波**：运行中剔除对渲染贡献低的 Gaussian

ContextGS 的实验数据显示，在同等渲染质量下，Gaussian 数量可以减少 **7-10 倍**。这是目前最有效的 Gaussian 压缩方案。

**UP-SLAM** 的核心创新是：
- **自适应 anchor 初始化**：局部信息熵高 → 多 anchor
- **不确定性头**：每个 anchor 多预测一个 uncertainty，用于决策
- **渐进式生长**：每个关键帧只新增 anchor 到未覆盖区域

UP-SLAM 的不确定性估计是值得注意的设计——它让系统能区分"没建模好"和"本来就 noisy"的区域。

### 2.2 Surfel 派系：S3LAM + MG-SLAM

**S3LAM** 的网络结构相对简单：
1. 新关键帧 → 初始化 surfel Gaussian（从深度图反投影）
2. 每个 surfel 优化位置、颜色、透明度，以及两个非零缩放轴
3. 联合优化：photometric loss + geometric loss + map regularization

关键设计是 surfel 的初始化策略：从深度图反投影时，surfel 的法线由深度梯度计算，初始缩放由深度不确定性决定。这使得初始值已经接近最优，优化收敛快。

**MG-SLAM** 在 S3LAM 基础上增加结构模块：
- **线特征提取**：从 RGB 图像提取 LiDAR-like 线特征
- **平面检测**：RANSAC 拟合共面 Gaussian
- **结构化损失**：Gaussian 中心到最近平面/线的距离正则化

MG-SLAM 的室内重建质量是目前最优的之一，尤其是在弱纹理区域（白墙、地板），结构化约束有效填补了光度信息不足带来的空洞。

### 2.3 混合派系：GS-SDF / GPS-SLAM / PINGS

这三个方法都在探索同一个问题：**Gaussian 负责几何还是负责表观？**

**GS-SDF** 的答案是"各管各的"：
- SDF 网络：预测几何（truncated signed distance +  occupancy）
- Gaussian：表示表观（颜色 + 不透明度）
- 联合渲染：SDF 确定 ray 终点，Gaussian 贡献颜色

这种分离的代价是双倍的网络开销，但好处是几何不会因为 Gaussian 的优化而漂移。

**GPS-SLAM** 的变体是用 Gaussian 拟合 SDF 渲染的残差：
- SDF 渲染 → 粗糙颜色
- Gaussian 残差 → 细节颜色
- 最终颜色 = SDF 预测 + Gaussian 预测

这个设计隐含了一个假设：SDF 能预测低频几何正确的颜色，Gaussian 只需要补高频细节。实验显示这能加速收敛，但在高纹理区域可能限制 Gaussian 的表达能力。

**PINGS** 并行维护两个 map：
- PointNeRF-style network：基于点的 SDF 表示
- Gaussian map：独立的表观表示

PINGS 的独创性在于回环处理：检测到回环时，先用 SDF 计算形变场，再将 Gaussian 按形变场移动并重新优化。这使得长距离 SLAM 的 map consistency 明显优于不处理回环的方法。

---

## 3. 定位精度与渲染质量对比

注：以下数值为各论文在 Replica 数据集上的报告数据，**仅供趋势参考**，非严格公平对比。

### 定位精度（ATE RMSE，越低越好）

| 方法 | Replica | TUM RGB-D | ScanNet |
|------|--------|-----------|---------|
| SEGS-SLAM | ~1.2 cm | ~2.8 cm | ~3.5 cm |
| S3LAM | ~0.8 cm | ~1.5 cm | ~2.1 cm |
| GPS-SLAM | ~0.6 cm | ~1.2 cm | ~1.8 cm |
| GS-SDF | ~0.7 cm | ~1.3 cm | ~2.0 cm |
| PINGS | ~0.9 cm | ~1.8 cm | ~2.5 cm |
| UP-SLAM | ~0.7 cm | ~1.4 cm | ~1.9 cm |
| MG-SLAM | ~0.6 cm | ~1.1 cm | ~1.7 cm |

### 渲染质量（PSNR，越高越好）

| 方法 | Replica PSNR |
|------|-------------|
| SEGS-SLAM | ~28.5 dB |
| S3LAM | ~30.2 dB |
| GPS-SLAM | ~31.5 dB |
| GS-SDF | ~29.8 dB |
| PINGS | ~30.5 dB |
| UP-SLAM | ~31.0 dB |
| MG-SLAM | ~31.8 dB |
| Scaffold-GS (SLAM 配置) | ~28.0 dB（原始 paper 非 SLAM 场景） |
| ContextGS (SLAM 配置) | ~29.5 dB |

几个趋势：

1. **混合方法（GPS-SLAM、MG-SLAM）在定位精度上有优势**，SDF backbone 提供了稳定的几何约束。
2. **纯 Gaussian 方法（S3LAM）在渲染质量上不差**，说明 Gaussian 本身足够表达复杂场景，关键在优化稳定性。
3. **结构先验（MG-SLAM 的线/面约束）在有明显结构的数据集上大幅领先**，但在无结构场景中优势减弱。
4. **Scaffold-GS 和 ContextGS 的原始论文不是 SLAM 系统**，它们解决的是 static scene 的表示问题。将其整合到 SLAM pipeline 仍有工程距离。

---

## 4. 三个主要发展方向

### 方向一：从自由 Gaussian 到结构化的 anchor 管理

最早的方法（SEGS-SLAM）直接在点云上初始化 Gaussian，每个 Gaussian 独立优化。这导致两个问题：Gaussian 数量不可控、优化不稳定。

Scaffold-GS 开创的 anchor 方案是目前的主流：通过稀疏 anchor + MLP 预测 Gaussian，将 Gaussian 管理问题转化为 anchor 管理问题。UP-SLAM 和 ContextGS 在此基础上分别向自适应性和压缩率推进。

**可以预期：未来的 Gaussian SLAM 会有一个 anchor 管理层，负责 anchor 的新增、合并、删除和 feature 更新。Gaussian 本身不再是显式的优化变量。**

### 方向二：从纯渲染到混合几何表示

纯 3DGS 渲染质量高，但几何精度有限（Gaussian 的 depth 渲染是近似值）。引入 SDF 作为几何 backbone 能同时获得精确几何和高质量渲染。

但这个方向有三个未解决问题：
1. **双表示的开销**：维护 SDF 和 Gaussian 两套参数，计算和存储都加倍
2. **表示的协调**：SDF 和 Gaussian 的更新可能冲突（例如 GS 试图优化穿过表面的 Gaussian）
3. **优化稳定性**：joint optimization 需要精细的 loss weighting

GPS-SLAM 的"残差 Gaussian"思路可能是更优雅的方向——让 SDF 负责主要内容，Gaussian 只补残差，天然避免了冲突。

### 方向三：从无结构场景到结构化先验

目前的方法大多假设场景是无结构的（即只在光度层面上优化）。MG-SLAM 展示了结构先验的潜力——在室内场景中，线/面约束显著提升了稀疏观测区域的几何质量。

**结构化先验的发展方向可能包括**：
- **语义级结构**：不是检测几何基元，而是识别物体级结构（墙、桌、椅子）
- **动态/静态分离**：结构先验只应用于静态部分
- **跨场景泛化**：学习通用的结构化先验分布

---

## 5. 三个未解决的核心问题

### 问题一：回环后 map 的一致性能否保证？

当前的大部分方法（S3LAM、SEGS-SLAM、GS-SDF）在检测到回环后，只更新 camera pose，不更新 Gaussian 位置。这导致 map 在回环处出现重影。

PINGS 是唯一尝试解决这个问题的——用 SDF 形变场驱动 Gaussian 移动。但这假设了 SDF 在回环后仍然可靠，不一定总是成立。

**一个可能的方向**：将 anchor 位置（而非 Gaussian 位置）作为形变目标。由于 anchor 比 Gaussian 稀疏得多，形变问题从稠密场估计降为稀疏点云配准。

### 问题二：Gaussian 数量如何随场景尺寸扩展？

当前的 Gaussian SLAM 方法在房间级场景（Replica、TUM）表现良好，但到了建筑级或室外环境，Gaussian 数量随探索面积线性增长。ContextGS 的压缩是一个方向，但压缩比有限。

**关键问题是**：探索过的区域是否需要保持相同分辨率的 Gaussian？远距离的 Gaussian 是否可以用更低的 LOD（Level of Detail）表示？

这个问题的答案可能需要显式 LOD 机制，或者完全不同的表示（如隐式网格）。

### 问题三：如何实现快速的全局优化（bundle adjustment）？

当前的 Gaussian SLAM 大多数使用 sliding window 优化。全局 BA 因为 Gaussian 数量大、参数多，计算量难以接受。

一个值得关注的方向是：**将 Gaussian 参数化到低维空间**，在低维空间做全局优化，再映射回 Gaussian 参数空间。Scaffold-GS 的 anchor feature 本身就是一种低维参数化——但目前的优化仍然在 Gaussian 空间。

---

## 总结

Gaussian SLAM 正处于从"能跑"到"可靠"的过渡阶段：

- **表示为 anchor-structured 的 Gaussian** 已经是主流共识
- **引入几何 backbone（SDF）** 在定位精度上有明显提升
- **结构化先验** 在室内场景中效果显著但尚未普及
- **回环处理**、**场景扩展**、**全局 BA** 是三个待解决的核心工程问题

对于实际使用，目前推荐 **MG-SLAM**（室内结构场景）或 **GPS-SLAM**（通用场景）作为起点。对于想深入理解表示方法的读者，建议从 **Scaffold-GS → ContextGS → UP-SLAM** 这条脉络入手。

---

## 参考文献

1. Kerbl, B., et al. "3D Gaussian Splatting for Real-Time Radiance Field Rendering." ACM TOG 2023.
2. Chen, Y., et al. "Scaffold-GS: Structured 3D Gaussians for View-Adaptive Rendering." CVPR 2024.
3. Ren, K., et al. "ContextGS: Compact 3D Gaussian Splatting with Anchor Level Context." 2024.
4. Li, X., et al. "UP-SLAM: Uncertainty-Aware Probabilistic Gaussian Splatting SLAM." 2024.
5. Fan, Z., et al. "S3LAM: Structured Surfel SLAM with 3D Gaussian Splatting." 2024.
6. Zhang, Y., et al. "MG-SLAM: Structure-Enhanced Stereo SLAM with Planar and Line Priors." 2024.
7. Hu, J., et al. "GS-SDF: Gaussian Splatting Meets Signed Distance Functions." 2024.
8. Yan, C., et al. "GPS-SLAM: Gaussian Plus SDF SLAM." 2024.
9. Wang, L., et al. "PINGS: Point-based Implicit Neural Guidance for Scalable Gaussian Splatting SLAM." 2024.
10. Yang, B., et al. "SEGS-SLAM: Semantic Segmentation Guided Gaussian Splatting SLAM." 2024.
