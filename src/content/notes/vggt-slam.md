---
title: "VGGT-SLAM: Dense RGB SLAM Optimized on the SL(4) Manifold"
date: 2026-06-08
updated: 2026-06-08
summary: VGGT-SLAM 的核心是把长视频切成 VGGT feed-forward submap，每个 submap 由 VGGT 一次生成 camera/depth/point cloud；由于未标定单目子图可能有 projective ambiguity（不止 Sim(3) gauge），用 SL(4) 15-DOF homography 在因子图中全局对齐所有子图。

tags:
  - GS-SLAM
relatedNotes: []
category: 文献笔记
importance: 2
draft: false
type: note
---

# VGGT-SLAM: Dense RGB SLAM Optimized on the SL(4) Manifold

> NeurIPS 2025 Main Conference. 论文整理笔记。
> 📄 [PDF 原文](VGGT-SLAM.pdf)

⚠️ 注意：这是 VGGT-SLAM 1.0（仓库 version1.0 分支）。2.0 已在 RSS 2026 发表，移除 1.0 的 15-DOF drift / planar degeneracy。

## 0. 一句话结论

VGGT-SLAM 的核心是把长视频切成 VGGT feed-forward submap，每个 submap 由 VGGT 一次生成 camera/depth/point cloud；由于未标定单目子图可能有 projective ambiguity（不止 Sim(3) gauge），用 SL(4) 15-DOF homography 在因子图中全局对齐所有子图。

不是 GS-SLAM / 不是高频实时 / 不处理动态 / 不是 GS backend。

---

## 1. 解决什么问题

VGGT 很强但显存限制（24GB RTX 4090 约 60 帧）。长视频需分 submap。问题：VGGT 子图是未标定单目 feed-forward 产物，子图间误差可能不是简单 Sim(3) scale，可能有 shear/stretch/perspective distortion。VGGT-SLAM 用 SL(4) 处理这种 projective ambiguity。

---

## 2. Pipeline

```
RGB video → keyframe selection (Lucas-Kanade disparity)
→ local window → VGGT feed-forward → submap (camera + depth + point cloud + confidence)
→ overlapping adjacent submaps → 5-pt RANSAC SL(4) relative homography
→ SALAD retrieval → loop frames → add to current submap → relative SL(4) homography
→ SL(4) factor graph (LM on Lie algebra) → globally aligned dense point cloud
```

---

## 3. 核心机制

### VGGT submap generator
Multi-frame feed-forward (不是 pairwise)。利用 VGGT camera head 预测 intrinsics/extrinsics → 反投影 depth → dense point cloud。与 MASt3R 的区别：VGGT 是多帧联合推理，不是两帧匹配。

### Keyframe selection
Lucas-Kanade disparity threshold。减少帧数 + 保证视差 → 改善 VGGT depth。

### SL(4) homography
未标定单目子图对齐需要 15-DOF projective transform，不是 7-DOF Sim(3)。5-pt RANSAC 求解，det=1 归一化。处理 shear/stretch/perspective。

### Loop closure
SALAD retrieval → loop frames 加入当前 submap VGGT 推理 → 利用同一帧在不同子图的点云对应估计 SL(4)，不需显式特征匹配。

### Factor graph optimization
Submap = node。Relative SL(4) = edge。LM over Lie algebra tangent space。

---

## 4. 实验

### 7-Scenes (uncalibrated)
| Method | ATE |
|---|---|
| DROID-SLAM (uncal) | 0.078 m |
| MASt3R-SLAM (uncal) | 0.066 m |
| **VGGT-SLAM SL(4)** | **0.067 m** |
| DROID-SLAM (cal) | 0.049 m |
| MASt3R-SLAM (cal) | 0.047 m |

### TUM RGB-D (uncalibrated)
| Method | ATE |
|---|---|
| DROID-SLAM (uncal) | 0.158 m |
| MASt3R-SLAM (uncal) | 0.060 m |
| **VGGT-SLAM SL(4)** | **0.053 m** |

### Dense reconstruction (7-Scenes)
| Method | Acc | Comp | Chamfer |
|---|---|---|---|
| MASt3R-SLAM (uncal) | 0.068 | **0.045** | 0.056 |
| **VGGT-SLAM SL(4)** | **0.052** | 0.058 | **0.055** |

---

## 5. 强项

1. **处理 projective ambiguity** — 不止 scale gauge，SL(4) 能表达更一般的几何歧义
2. **完全 RGB-only，不需要已知相机内参**
3. **Multi-frame feed-forward** — 比 pairwise 利用更多全局 attention
4. **因子图结构清晰** — submap = node，homography = edge，loop = non-seq edge

---

## 6. 局限

1. **SL(4) 15-DOF 太自由** — 可能产生额外 drift（shear/stretch/perspective）
2. **平面退化** — TUM floor 场景失败
3. **不是高频实时** — 1.0 不是实时 VO
4. **对 VGGT depth outlier 敏感**
5. **不处理动态 / 不是 GS backend**

---

## 7. 对 SkelGS-SLAM 的启发

### ★ Projective ambiguity awareness
Foundation model 几何误差可能不止 Sim(3)，可能包含 anisotropic stretch/shear/perspective。如果你只做 Sim(3) 检查，可能漏掉。

### SL(4) 不应直接放入在线前端
太自由。安全做法：在线用 Sim(3)/scale-aware，低频用 SL(4) diagnostic 检测 non-Sim(3) residual。

### Submap-level provenance
Submap = local geometry packet bundle + source frames + predictor + constraints。对应你的 CertifiedGeometryPacket: 不只是 per-frame data, 而是 versioned local submap packet。

### Loop = geometry verification
Loop retrieval 不只修 pose，也验证 anchor 是否仍一致。可做 anchor re-observation, packet consistency, dynamic-risk reclassification。

---

## 8. 41 → 42 篇

VGGT-SLAM 不适合作为主前端，但值得作为"foundation model 几何歧义边界"的提醒。

---

## Related extracted notes

### Concepts
- [Projective-Ambiguity-Awareness](Projective-Ambiguity-Awareness) — foundation model error ≠ just Sim(3)
- [Feed-Forward-Submap](Feed-Forward-Submap) — multi-frame feedforward submap

### Methods
- [VGGT-SLAM-Architecture](VGGT-SLAM-Architecture) — VGGT submaps + SL(4) factor graph pipeline
- [SL4-Submap-Alignment](SL4-Submap-Alignment) — 15-DOF projective submap alignment

### Project
- [SkelGS-SLAM: VGGT-SLAM 分析](10_Projects/SkelGS-SLAM/decision-log)
