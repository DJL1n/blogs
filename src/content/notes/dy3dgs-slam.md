---
title: "Dy3DGS-SLAM: Monocular 3D Gaussian Splatting SLAM for Dynamic Environments"
date: 2026-06-08
updated: 2026-06-08
summary: Dy3DGS-SLAM 的核心不是动态 4D Gaussian 建模，而是单目 RGB 条件下，用光流 + 单目深度估计得到更可靠的动态 mask，把动态区域从 tracking 和 3DGS mapping 中压低/剔除，从而重建干净静态场景。

tags:
  - GS-SLAM
relatedNotes: []
category: 文献笔记
importance: 2
draft: false
type: note
---

# Dy3DGS-SLAM: Monocular 3D Gaussian Splatting SLAM for Dynamic Environments

> arXiv 2025-06. 论文整理笔记。
> 📄 [PDF 原文](Dy3DGS-SLAM.pdf)

## 0. 一句话结论

Dy3DGS-SLAM 的核心不是动态 4D Gaussian 建模，而是单目 RGB 条件下，用光流 + 单目深度估计得到更可靠的动态 mask，把动态区域从 tracking 和 3DGS mapping 中压低/剔除，从而重建干净静态场景。

---

## 1. 解决什么问题

NeRF/3DGS-SLAM 默认静态场景。动态物体会：
1. Tracking 被错误光流误导 → pose 偏移
2. Depth 监督被污染 → map floaters/ghosts
3. GS 试图解释颜色残差 → artifacts

Dy3DGS 的回答：光流 + 单目深度 → 概率融合 mask → 同时影响 tracking loss 和 GS rendering loss。

---

## 2. Pipeline

```
RGB frames
  → optical flow network → motion mask
  → DepthAnythingV2 → depth mask
  → K-means cluster multiple motion objects
  → Bayesian fusion (光流+深度条件独立假设) → fused dynamic mask
  → tracking thread:
      pose estimation network (ResNet50, TartanVO-style)
      motion loss + depth scale constraint
      local BA (每10帧 keyframe, ≥4 keyframes 一组)
  → mapping thread:
      3DGS map
      dynamic pixel Gaussians → depth infinity pruning
      photometric loss + depth loss with dynamic penalty
  → static Gaussian map
```

---

## 3. 核心机制

### Dynamic Mask Fusion
- Optical flow: U-Net motion segmentation, flow anomaly → rough dynamic prior
- Depth: DepthAnythingV2, geometric boundary/occlusion cue
- K-means: 分离多个动态物体（不同深度/flow 分布不同）
- Bayesian fusion: P(dynamic|depth,flow) ∝ P(depth|dynamic)·P(flow|dynamic)·P(dynamic)，阈值 0.95

### Tracking
- Pose estimation network (ResNet50, TartanVO-style)
- Input: RGB + optical flow + depth + masks
- Motion loss: fused mask + depth scale constraint
- Local BA: 每10帧 keyframe, ≥4 keyframes/group
- Single network iteration（比 DytanVO 三次迭代更轻）

### GS Mapping
- Standard 3DGS
- Dynamic pixel GS → depth infinity pruning
- Photometric loss: static vs dynamic region 不同 penalty
- Depth loss: monocular depth vs GS-rendered depth, mask-weighted
- Loss weight 超参数: depth = 1

### Ablation
| Flow | Depth | Fusion | ATE |
|---|---|---|---|
| ✓ | × | × | 7.6 cm |
| × | ✓ | × | 94.8 cm |
| ✓ | ✓ | ✓ | **3.0 cm** |

Depth alone 不可靠，fusion 是核心贡献。

---

## 4. 实验

### BONN RGB-D
| Method | ATE |
|---|---|
| **Dy3DGS** | **4.5 cm** |
| DynaSLAM | 4.8 cm |
| DytanVO | 5.6 cm |
| SplaTAM | 96.1 cm |

### TUM RGB-D
| Method | ATE |
|---|---|
| DynaSLAM | **2.7 cm** |
| **Dy3DGS** | 4.7 cm |
| DytanVO | 11.2 cm |
| SplaTAM | 53.2 cm |

### Runtime
Tracking 17 FPS, mapping 430.5 ms, network update 10.3 ms。

---

## 5. 强项

1. **Multi-evidence dynamic fusion** — flow + depth + K-means + Bayesian，比单一 mask 更稳
2. **Tracking + mapping 双侧抑制** — 不是前处理 mask，而是同时影响 pose loss 和 GS loss
3. **单目 RGB** — 不依赖 RGB-D
4. **Ablation 清晰** — depth alone 94.8 cm vs fusion 3.0 cm

---

## 6. 局限

1. **不是动态场景重建** — 只剔除，不建模动态物体
2. **依赖外部网络** — motion seg / DepthAnythingV2 / ResNet50 pose net
3. **Mask 质量决定上限** — 漏检→污染，误检→约束变弱
4. **深度跨帧一致性无严格保证**
5. **Bayesian 独立假设在强运动/低纹理下可能失效**
6. **偏室内，无室外/大尺度验证**

---

## 7. 与 WildGS-SLAM 区别

| | Dy3DGS | WildGS |
|---|---|---|
| 动态线索 | optical flow + depth | DINOv2 uncertainty |
| 核心变量 | fused binary mask | uncertainty map |
| 风格 | 显式 mask 融合 | uncertainty-driven geom mapping |
| 对你价值 | multi-signal fusion 模板 | uncertainty/trust 方向更近 |

---

## 8. 对 SkelGS-SLAM 的启发

### ★ Multi-evidence dynamic probability → anchor dynamic evidence
p_static = fuse(flow residual, depth discontinuity, temporal repeatability, normal consistency, photometric residual)。用于 anchor birth gating / GS admission / tracking weight。

### DynamicEvidencePacket 可设计为：
per-pixel: p_static, flow_anomaly, depth_discontinuity, temporal_inconsistency, reprojection_residual
per-anchor: static_log_odds, temporal_repeatability, depth_normal_stability, dynamic_contamination_score

### p_static 决策规则：
- 低 → 不 birth anchor/Gaussian
- 中 → 弱观测，不进 CertifiedPacket
- 高 + temporal high → anchor maturity evidence

### 不建议借
- ResNet50 pose network（你要的是 DPVO/DROID/HI-SLAM2 在线几何信号，不是 supervised pose net）
- Bayesian independent assumption（你的 fusion 应基于 anchor evidence，不是单帧概率）

---

## 9. 40 → 41 篇

Dy3DGS 对你是 dynamic/uncertainty evidence 模块参考，不是 packet coherence 的完整答案。

---

## Related extracted notes

### Concepts
- [Multi-Evidence-Dynamic-Fusion](Multi-Evidence-Dynamic-Fusion) — flow + depth + clustering → dynamic probability
- [Dynamic-Suppression-Both-Sides](Dynamic-Suppression-Both-Sides) — dynamic evidence tracking + mapping

### Methods
- [Dy3DGS-SLAM-Architecture](Dy3DGS-SLAM-Architecture) — flow + depth fusion + pose net + GS pipeline
- [DynamicEvidencePacket](DynamicEvidencePacket) — per-pixel/per-anchor dynamic probability for anchor system

### Project
- [SkelGS-SLAM: Dy3DGS-SLAM 分析](10_Projects/SkelGS-SLAM/decision-log)
