---
title: A Survey on Collaborative SLAM with 3D Gaussian Splatting (CoGS-SLAM)
date: 2026-06-08
updated: 2026-06-08
summary: 这篇综述讨论多机器人/多智能体各自建局部 Gaussian map，在通信受限、位姿有漂移、外观不一致条件下融合成全局一致、可渲染、可语义查询的 3DGS 地图。不是新算法 / 不解决单目 tracking / 但为 submap/anchor/provenance/异步融合提供了系统背景。

tags:
  - GS-SLAM
relatedNotes: []
category: 文献笔记
importance: 2
draft: false
type: note
---

# A Survey on Collaborative SLAM with 3D Gaussian Splatting (CoGS-SLAM)

> arXiv 2025-10. Survey paper. 
> 📄 [PDF 原文](CoGS-SLAM-Survey.pdf)

## 0. 一句话结论

这篇综述讨论多机器人/多智能体各自建局部 Gaussian map，在通信受限、位姿有漂移、外观不一致条件下融合成全局一致、可渲染、可语义查询的 3DGS 地图。不是新算法 / 不解决单目 tracking / 但为 submap/anchor/provenance/异步融合提供了系统背景。

---

## 1. 核心问题

多机器人协同 GS-SLAM 比单机器人难点：

- 多 agent 轨迹需全局坐标系对齐
- inter-agent loop closure 验证
- 通信带宽限制
- 局部 Gaussian map 几何+外观+语义融合
- 中心化 vs 分布式
- 异步更新 (不同步帧率/通信延迟)

核心悖论：geometric alignment alone ≠ 视觉无缝。Pose 对齐了，颜色/opacity/SH/semantics 仍可能不一致。

---

## 2. 系统架构分类

| 架构 | 代表 | 优点 | 缺点 |
|---|---|---|---|
| Centralized | GRAND-SLAM, HAMMER, MAGiC-SLAM | 全局优化统一管理，融合质量可控 | server bottleneck, 单点故障, 通信压力 |
| Distributed | MAC-Ego3D, Di-NeRF, MCN-SLAM | 无服务器瓶颈，适合大规模 | 全局一致性难，异步复杂，收敛不稳 |

当前 3DGS collaborative 系统偏 centralized（因为 GS 训练/同步计算成本高），传统 collaborative SLAM 的趋势是从 centralized → distributed，但 GS 方向出现了"暂时反转"。

### Centralized pipeline
```
Agent: tracking + local mapping + local GS submap + semantic extraction + loop candidate
Server: inter-agent loop + submap merging + global GS refinement + PGO + semantic aggregation
```

### Distributed pipeline
```
Agent: local tracking + local map + compact representation
Communication: descriptors / compressed GS / neural summary
Consensus: relative pose + shared params + distillation loss + ADMM
```

---

## 3. 代表系统

| 系统 | 表示 | 架构 | 特点 |
|---|---|---|---|
| CP-SLAM | Neural Point | Centralized | federated averaging + PGO |
| MCN-SLAM | Hybrid Tri-plane+MLP | Distributed | online distillation |
| MNE-SLAM | Hybrid Planar-Grid+MLP | Distributed | online distillation |
| Di-NeRF | NeRF | Distributed | consensus ADMM |
| GRAND-SLAM | 3DGS | Centralized | PGO + coarse-to-fine loop, DINO semantic |
| HAMMER | 3DGS | Centralized | frame alignment + global opt, CLIP semantic |
| MAC-Ego3D | 3DGS | Distributed | multi-agent consensus |
| MAGiC-SLAM | 3DGS | Centralized | PGO, deformable GS, RGB-D |

---

## 4. 核心问题

### 4.1 Multi-agent consistency & alignment
不同 agent 坐标系、曝光、内参、GS 优化状态不同。先 coarse geometric alignment → 再 fine photometric/radiance refinement。

模式：semantic-guided registration / Gaussian consensus / deformable warping / view-consistency pruning。

### 4.2 Communication efficiency
不传原始 RGB-D 或完整 GS 图。传 compact summary / descriptor / neural parameter / low-opacity pruned submap。分阶段 loop：先 descriptor → 再 point cloud → 再相对位姿。

关键问题：哪些 Gaussian/pose/descriptor 对全局一致性贡献最大？

### 4.3 Shared GS representation + semantic distillation
Gaussian → unified carrier for geometry + appearance + uncertainty + semantics。CLIP/DINO 特征蒸馏进 GS。
难点：多 agent 同一物体视角/曝光/遮挡不同 → semantic feature 如何保持一致？

### 4.4 Asynchronous fusion
Agent 独立更新局部地图，通信可用时再参与全局优化。不等待所有 agent 同步。

---

## 5. 代表结果 (Multiagent Replica)

| Method | RMSE | PSNR | Time |
|---|---|---|---|
| CP-SLAM | 1.23 cm | 22.71 | 200+ min |
| MAGiC-SLAM | 0.25 cm | 34.26 | 133 min |
| MAC-Ego3D | **0.14 cm** | 40.04 | — |
| GRAND-SLAM | 0.25 cm | **41.35** | — |
| HAMMER | — | 37.28 | **8 min** |

⚠️ 合成数据 + 指标不统一，不适合绝对排名。

---

## 6. 数据集缺口

缺乏同时覆盖 photorealistic fidelity、semantic consistency、bandwidth、asynchronous、large-scale、real-world 的标准 CoGS-SLAM benchmark。

评价应覆盖四类：localization ATE、photorealistic PSNR/SSIM/LPIPS、system FPS/memory/bandwidth/latency、semantic consistency。

---

## 7. 开放方向

1. **实时同步与一致性** — geometry align ≠ visual seamless
2. **Robust inter-agent loop closure** — foundation descriptor + differentiable renderer validation
3. **Semantic + instance-level mapping** — SAM + instance uncertainty
4. **Multi-modal fusion** — LiDAR/IMU/thermal + GS
5. **Lifelong mapping** — change detection + forgetting + temporal GS management
6. **Scalability** — distributed under intermittent communication
7. **Sim2Real** — real large-scale dataset + domain adaptation

---

## 8. 对 SkelGS-SLAM 的启发

### ★ Submap/packet 应携带 provenance
CoGS-SLAM 核心是 local submap → global aligned。对应你的 CertifiedGeometryPacket 应该是 versioned local geometry submap（packet_id, source frames, pose/depth/normal version, anchor support, dynamic-risk, maturity state）。

### ★ 几何一致性 ≠ 视觉一致性
即使 pose/depth 通过几何认证，GS backend 仍需单独处理 appearance residual。ChildGS/residual layer 延后合理。

### ★ Anchor admission = 通信调度单机版
CoGS-SLAM 必须选最小传输统计量。你的单机系统：只让对 global consistency / GS quality 有贡献的 anchor 进入 mature set。

### ★ Intra-agent inter-submap loop
CoGS-SLAM 的 inter-agent loop 可映射为你的 inter-submap loop：retrieval candidate → consistency check → anchor reactivation → packet verification。

---

## 9. 47 → 48 篇

这篇不应该是你的主线技术论文，但适合作为 submap/anchor/provenance/异步融合/一致性验证的背景支撑。

---

## Related extracted notes

### Concepts
- [Submap-Level-Provenance](Submap-Level-Provenance) — versioned local geometry submap with source frames
- [Geometry-vs-Visual-Consistency](Geometry-vs-Visual-Consistency) — geometric align ≠ photometric seamless

### Methods
- [CoGS-SLAM-Architecture](CoGS-SLAM-Architecture) — centralized vs distributed multi-agent GS-SLAM
- [Intra-Agent-Submap-Loop](Intra-Agent-Submap-Loop) — retrieval + consistency + anchor reactivation

### Project
- [SkelGS-SLAM: CoGS-SLAM Survey 分析](10_Projects/SkelGS-SLAM/decision-log)
