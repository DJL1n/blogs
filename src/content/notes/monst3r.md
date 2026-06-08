---
title: "MonST3R: A Simple Approach for Estimating Geometry in the Presence of Motion"
date: 2026-06-08
updated: 2026-06-08
summary: MonST3R 把 DUSt3R 的 pointmap 表示扩展到动态视频：不先估计 motion，而是直接为每个时刻预测 per-timestep pointmap。动态物体在不同时刻出现在不同空间位置，自然形成 time-varying point cloud。不是实时 SLAM / 不是 GS backend / 但为动态场景的 geometry-first 处理提供了干净思路。

tags:
  - GS-SLAM
relatedNotes: []
category: 文献笔记
importance: 2
draft: false
type: note
---

# MonST3R: A Simple Approach for Estimating Geometry in the Presence of Motion

> arXiv 2025. Motion DUSt3R: dynamic video geometry via per-timestep pointmap.
> 📄 [PDF 原文](MonST3R.pdf)

## 0. 一句话结论

MonST3R 把 DUSt3R 的 pointmap 表示扩展到动态视频：不先估计 motion，而是直接为每个时刻预测 per-timestep pointmap。动态物体在不同时刻出现在不同空间位置，自然形成 time-varying point cloud。不是实时 SLAM / 不是 GS backend / 但为动态场景的 geometry-first 处理提供了干净思路。

---

## 1. 和 DUSt3R 的关系

| | DUSt3R | MonST3R |
|---|---|---|
| 输入 | 两张图 (pairwise) | 动态视频 (pairwise within window) |
| pointmap | 静态场景，对齐到第一帧 | per-timestep，允许动态物体位置变化 |
| 训练 | 静态场景数据 | 动态视频 fine-tune (PointOdyssey / TartanAir / Spring / Waymo) |
| 动态问题 | 前景物体会错误对齐 | 每个时间点有自己的几何 |

DUSt3R 在动态场景的两个问题：moving foreground 错误对齐、前景深度被背景污染。MonST3R 直接用 per-timestep pointmap 绕开。

---

## 2. 核心表示：Per-timestep pointmap

不显式建模 motion / flow / object trajectory。
每个时间点一个 pointmap → 动态物体在不同时间占据不同 3D 位置。
"MonST3R does not force all points to satisfy static consistency."

---

## 3. 训练策略

- 冻结 encoder，只微调 decoder + head（消融证明 decoder&head fine-tune > full model > head-only）
- 数据集：PointOdyssey (50% dynamic) + TartanAir (25%) + Spring (5%) + Waymo (20%)
- 时间间隔采样 stride 1–9，大 stride 概率更高
- FOV augmentation（不同尺度 center crop 适应变化 intrinsics）

---

## 4. 下游任务

### Camera pose estimation
不用跨帧 epipolar（动态会破坏对应），改用 same-view 2D-3D + PnP + RANSAC + confidence mask。

### Confident static regions
比较两种 flow：
- 真实 optical flow
- camera-motion-induced flow (from pointmap + camera motion)
一致 → static；不一致 → dynamic / unreliable。

### Global optimization
Sliding temporal window（非全连接）。L = L_DUSt3R_alignment + λ_smooth L_smooth + λ_flow L_flow (on static regions)。

### Video depth
从 global representation 直接取 per-frame depthmap（非单独 video depth 模型）。

---

## 5. 实验结果

### Video depth (per-sequence scale & shift)
| Dataset | Abs Rel | δ<1.25 |
|---|---|---|
| Sintel | 0.335 | 58.5 |
| Bonn | 0.063 | 96.4 |
| KITTI | 0.104 | 89.5 |

### Camera pose
| Method | Sintel ATE | TUM-dyn ATE | ScanNet ATE |
|---|---|---|---|
| DPVO | 0.115 | — | — |
| LEAP-VO | **0.089** | **0.046** | 0.070 |
| CasualSAM | 0.141 | 0.045 | 0.158 |
| DUSt3R w/ mask | 0.417 | 0.127 | 0.081 |
| **MonST3R** | 0.108 | 0.074 | **0.068** |

MonST3R 不是绝对 pose SOTA，但 joint depth+pose+dynamic geometry 统一输出，且不依赖 GT intrinsics。

### Ablation
- 不 fine-tune: ATE 0.354 → 全部数据集 fine-tune: 0.108
- 去掉 flow loss: 0.108 → 0.140
- 去掉 static mask: 0.108 → 0.132

---

## 6. 局限

1. **不是实时 SLAM** — 60 帧推理 ~30s + global opt ~1min
2. **长期遮挡 / 长序列问题** — sliding window 限制
3. **OOD 敏感** — open fields 等场景仍可能失败
4. **Depth 评估依赖 scale/shift alignment** — 非可靠 metric depth
5. **动态 intrinsics** — 理论上可估，实际需 careful tuning

---

## 7. 对 SkelGS-SLAM 的启发

### ★ Geometry-first dynamic region discovery
MonST3R 的 confident static region = optical flow ≈ camera-induced flow。可改写为你的 anchor admission evidence：
- DPVO flow ≈ depth-induced flow → mature static support
- 不一致 → dynamic / unreliable / no GS birth

### ★ Per-timestep geometry 不强迫持久化
动态物体只应作为 per-timestep observation，不进入 persistent anchor / GS map。与你的 "anchor maturity / explicit admission" 一致。

### ★ 离线诊断工具
MonST3R → per-frame depth + pose + static/dynamic mask for evaluating your DPVO/DROID packet quality。

### ★ 不支持 MASt3R 作为动态 SLAM 底座
MonST3R 明确指出 DUSt3R 在动态场景中会错误对齐 moving foreground 或无法估计前景深度。支持你：原始 pointmap foundation model 不适合直接作为动态 SLAM 几何底座。

---

## 8. 49 → 50 篇

MonST3R 对你最有价值的不是接入主线，而是：
1. geometry-first 判断动态区域
2. 动态物体只作 per-timestep observation，不污染 persistent map
3. 作为诊断工具验证你的 packet 质量

---

## Related extracted notes

### Concepts
- [Per-Timestep-Pointmap](Per-Timestep-Pointmap) — 动态场景中每个时刻独立估计 geometry
- [Geometry-First-Dynamic-Detection](Geometry-First-Dynamic-Detection) — flow consistency 定义 static region

### Methods
- [MonST3R-Architecture](MonST3R-Architecture) — DUSt3R + dynamic fine-tune + video-specific losses
- [Dynamic-Region-as-Packet-Evidence](Dynamic-Region-as-Packet-Evidence) — 动态区域作为 anchor admission 负证据

### Project
- [SkelGS-SLAM: MonST3R 分析](10_Projects/SkelGS-SLAM/decision-log)
