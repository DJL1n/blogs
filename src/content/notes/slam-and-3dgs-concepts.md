---
title: 'SLAM/3DGS 常用术语简明索引（BA、Graph、Submap）'
date: '2026-05-04'
updated: '2026-05-04'
summary: '按功能分组整理 BA、位姿图优化、前端/建图、3DGS 与评估中的核心术语，给出简洁定义。'
tags: ['三维重建']
category: '概念'
type: 'note'
importance: 4
draft: false
---

## 1) BA 与优化类型

- BA（Bundle Adjustment/光束法平差）：同时优化相机位姿和 3D 点（或深度/地图参数），核心是最小化重投影误差。
- Feature BA：使用特征匹配点（SIFT/ORB/SuperPoint/LoFTR）做 BA，通常优化 `pose + landmarks`。
- Local BA：只优化局部窗口（如最近 k 帧 keyframe），在线友好。
- Global BA：优化所有/大多数 keyframe，修正全局漂移，通常离线或收尾阶段。
- Local Feature BA：局部窗口内的特征 BA。
- Global Feature BA：全局或近全局的特征 BA。
- Pose-only BA：只优化位姿、不优化地图点。
- Depth/Geometric BA：以深度一致性或几何约束为目标。
- Photometric BA / Direct Optimization：以像素颜色差异为目标。
- PGO（Pose Graph Optimization）：仅优化关键帧位姿图（边是位姿约束），不直接优化 3D 点。
- Sim3 / SE(3)：位姿空间。SE(3)=旋转+平移；Sim(3)=旋转+平移+尺度。
- Robust Loss：鲁棒损失（Huber/Cauchy/Tukey），抑制外点。

## 2) 位姿与跟踪相关

- Pose / Camera Pose：相机在世界中的位姿（如 `T_cw`、`T_wc`）。
- Relative Pose：两帧之间相对位姿。
- Trajectory：整条位姿序列。
- Tracking：当前帧位姿估计过程，可能是 frame-to-frame 或 frame-to-map。
- Keyframe：关键帧，代表性强、可用于建图/优化。
- Frontend：前端，做帧过滤、初始位姿、关键帧选择、前置匹配。
- Optical Flow：像素/特征点的视觉运动估计。
- Feature Matching：跨帧找对应特征。
- Feature Track：同一 3D 点在多帧的 2D 观测链。
- Relative pose error（RPE）: 相邻位姿误差（局部运动质量）。
- Absolute trajectory error（ATE）: 全局轨迹误差（漂移水平）。

## 3) 地图与三维重建

- Mapping：依据观测更新地图。
- Map Representation：地图表达形式（稀疏点云、体素、TSDF、mesh、NeRF、3DGS 等）。
- Landmark：被多视图观测的 3D 路标点。
- Point Cloud：点云。
- Depth Map：每像素深度。
- Inverse Depth（或 disparity）：深度倒数，常用于数值稳定。
- Confidence Map：每像素/估计的可靠性图。
- Normal Map：每像素法向场。
- Triangulation：由多视图特征匹配反推 3D 点。
- MVS：多视图立体重建。
- SfM：由图像恢复相机与 3D 结构。
- TSDF：体素级截断符号距离场。
- Surfel：面元表示。

## 4) 3DGS / 神经渲染相关

- 3DGS（3D Gaussian Splatting）：用高斯核表示场景。
- Gaussian：参数包括位置、旋转、尺度、透明度、颜色/SH。
- Gaussian Birth：新增关键帧时创建高斯。
- Densification：按误差分裂/复制高斯增密。
- Pruning：删除无用或低贡献高斯。
- Opacity Reset：重置透明度，避免训练状态异常。
- Anchor / Owner Keyframe：高斯的归属关键帧。
- Viewpoint：渲染视角。
- Differentiable Rendering：可反传渲染，支持梯度优化。
- SH（Spherical Harmonics）：3DGS 中用于角度相关颜色表达。
- Rendering Loss / Photometric Error：重建图与观测图像像素差异。
- Gaussian map optimization：对高斯参数做优化，通常不直接负责大规模位姿点云 BA。

## 5) 图优化与约束术语

- Edge：图优化中的约束边。
- Odom Edge：相邻帧里程计约束。
- Loop Edge：回环约束，纠正长期漂移。
- Prior：先验约束（如 prior edge）。
- Residual：单项误差项（reprojection/geometric/photometric/pose-graph）。
- Loop Closure：回环闭合，检测到旧位置并约束图。
- Place Recognition：地点识别，用于回环候选。
- Relocalization：丢失后重定位。
- Global Consistency：全局轨迹/地图一致性。
- Submap：子地图；按段管理长序列。
- Active Submap：当前可更新子图。
- Pending Submap：待提交但未冻结子图。
- Frozen Submap：已冻结子图。
- Submap Alignment / Fusion：子图之间对齐与融合。

## 6) 误差与指标（训练/重建评估）

- Reprojection Error：3D 投影到图像后与观测 2D 的差。
- Geometric Error：深度重投影、点到点/点到平面等几何误差。
- Photometric Error：像素亮度/颜色差。
- PSNR：峰值信噪比（重建图像越高越好）。
- SSIM：结构相似度。
- LPIPS：感知质量指标，越低越好。
- Chamfer Distance：点云距离指标。
- F-score：重建表面与真值的 precision/recall 平衡指标。

## 7) 最简结论（与你代码的常见映射）

- `Feature BA` 描述“用什么观测”，非特定范围。
- `Local/Global BA` 描述“优化范围”。
- `GlobalOptimizationBackend`：常见为 Pose Graph Optimization（以 pose 为主）。
- `FeatureTrackBackend`：常见为 Feature BA（可局部/全局）。
- `LocalGeometryBackend`：常见为局部几何细化（pose 或 depth 相关）。
- `GSBackEnd`：常见为高斯地图优化（rendering/GS 参数）。
