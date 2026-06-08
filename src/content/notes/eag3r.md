---
title: "EAG3R: Event-Augmented 3D Geometry Estimation for Dynamic and Extreme-Lighting Scenes"
date: 2026-06-08
updated: 2026-06-08
summary: EAG3R = MonST3R + event stream：Retinex-inspired LightUp/SNR map + lightweight event adapter + cross-attention + SNR-aware fusion + event-based photometric consistency loss。不是 GS-SLAM / 不是在线前端 / 但观测可靠性建模和 SNR-aware fusion 思想对你的 geometry packet certification 很有启发。

tags:
  - GS-SLAM
relatedNotes: []
category: 文献笔记
importance: 2
draft: false
type: note
---

# EAG3R: Event-Augmented 3D Geometry Estimation for Dynamic and Extreme-Lighting Scenes

> MonST3R + event camera. CVPR/NIPS style dynamic pointmap geometry with event fusion.
> 📄 论文全文：arXiv (待确认)

## 0. 一句话结论

EAG3R = MonST3R + event stream：Retinex-inspired LightUp/SNR map + lightweight event adapter + cross-attention + SNR-aware fusion + event-based photometric consistency loss。不是 GS-SLAM / 不是在线前端 / 但观测可靠性建模和 SNR-aware fusion 思想对你的 geometry packet certification 很有启发。

---

## 1. 解决什么问题

RGB-only pointmap (DUSt3R/MonST3R) 在低光照、过曝、快速运动、运动模糊条件下退化。Event camera 在这些条件下仍能提供高频运动和边缘结构。EAG3R：把 event 加入 MonST3R pointmap 框架，在低光动态场景中提升 depth / pose / dynamic reconstruction。

---

## 2. Pipeline

```
Low-light / dynamic RGB video + synchronized event stream
  → Retinex-inspired LightUp → enhanced RGB + SNR map
  → event voxelization → Swin Transformer event adapter
  → RGB-event cross-attention (event query, RGB K/V)
  → SNR-aware feature fusion (SNR·F_rgb + (1-SNR)·F_event)
  → MonST3R decoder → pairwise pointmaps
  → Global optimization:
      pointmap alignment
      trajectory smoothness
      optical flow consistency
      event-based photometric consistency ★
  → global dynamic point cloud + per-frame camera poses + depth + intrinsics
```

---

## 3. 核心机制

### Retinex-inspired LightUp + SNR map
Not just image enhancement. 核心是估计 SNR map（哪些区域 RGB 可靠，哪些应依赖 event）。消融证明单独 LightUp 无帮助甚至变差，SNR-aware fusion 才关键。

### Lightweight Event Adapter
Swin Transformer, self-supervised event pretraining. 冻结 RGB encoder, 只训 event adapter + 新增模块。不破坏预训练 pointmap backbone。

### SNR-aware Feature Fusion ★
High SNR → RGB feature dominant。Low SNR → event feature dominant。F_fused = Projection(concat(SNR·F_rgb, (1-SNR)·F_event))。Multi-stage adaptive fusion > simple add > attention only。

### Event-based Photometric Consistency Loss ★
Global optimization 中额外约束：
- Observed: event stream → Harris patch → aggregate polarity → brightness increment
- Predicted: pose+depth→motion field→image gradient→predicted brightness change
- 归一化后计算残差 → 不依赖绝对 event contrast threshold
- 低光下比 RGB flow 更可靠的 motion-geometry 约束

### 训练/测试
Train: MVSEC outdoor_day2 (normal daylight)。Test: MVSEC outdoor_night1-3 (zero-shot 低光)。MonST3R ViT-B decoder + DPT heads + Enhancement Net + Event Adapter。

---

## 4. 实验

### Depth (MVSEC Night, zero-shot)
| Method | Night1 Abs Rel | Night1 δ<1.25 | Night3 Abs Rel | Night3 δ<1.25 |
|---|---|---|---|---|
| DUSt3R | 0.407 | 0.393 | 0.463 | 0.335 |
| MonST3R | 0.370 | 0.373 | 0.317 | 0.453 |
| MonST3R LightUp | 0.370 | 0.369 | 0.329 | 0.441 |
| **EAG3R** | **0.353** | **0.491** | **0.288** | **0.533** |

### Pose (MVSEC Night)
| Method | Night1 ATE | Night1 RPE trans | Night1 RPE rot |
|---|---|---|---|
| DUSt3R | 1.474 | 0.914 | 2.995 |
| MonST3R | 0.559 | 0.317 | 0.369 |
| **EAG3R** | **0.482** | **0.201** | **0.143** |

### Ablation (Night3 depth)
| Variant | Abs Rel |
|---|---|
| MonST3R Baseline | 0.317 |
| + Event | 0.297 |
| + Event + LightUp | 0.291 |
| + Event + LightUp + SNR Fusion | **0.288** |

---

## 5. 强项

1. **Clear problem** — RGB-only pointmap fails in low-light/fast motion
2. **SNR-aware fusion** — not just enhancement, region-adaptive reliability
3. **Event photometric consistency loss** — event constraint in global optimization
4. **Zero-shot low-light generalization** — trained on normal daylight
5. **Lightweight adapter** — freeze RGB backbone, only train adapter

---

## 6. 局限

1. **依赖 event camera** — 不能直接迁移到普通 RGB
2. **真实 RGB-event-depth-pose 数据稀缺** — synthetic events 不稳定
3. **不是实时 SLAM / 不是 GS-SLAM** — 偏离线 pointmap geometry
4. **没有解决 persistent map / loop / GS birth / GS feedback safety**

---

## 7. 对 SkelGS-SLAM 的启发

### ★ SNR-aware fusion → packet reliability gating
EAG3R 证明不应假设 RGB 处处可靠。对应你：每个 candidate anchor / surface patch 应有 local observation reliability（SNR / texture / flow consistency / depth-normal stability / track repeatability / dynamic inconsistency）。高可靠 → 可进 anchor maturity / GS birth。低可靠 → transient only / 禁止 birth。

### ★ Event photometric consistency → motion-geometry coherence
如果 pose/depth 正确 → predicted brightness change ≈ observed event。支持你可以用额外运动源（flow / temporal gradient / track）作为 pose-depth-scale coherence 认证信号。

### ★ 动态去除应嵌入几何一致性，不是语义模块
EAG3R 没有语义分割动态物体。通过 event 和 motion consistency 发现动态。支持你：流与相机运动不一致 / depth-normal 不稳定 / track repeatability 低 → 不应进入 persistent anchor/GS map。

### 不能直接替代 DPVO/DROID
Not real-time / no GS safety boundary。

---

## 8. 61 → 62 篇

EAG3R 支持你"GS birth 必须经过几何认证，而不是直接消费前端输出"的方向。但它本身是 event-camera geometry frontend，不是 monocular GS-SLAM。

---

## Related extracted notes

### Concepts
- [SNR-Aware-Reliability-Gating](SNR-Aware-Reliability-Gating) — 区域自适应观测可靠性，决定 anchor admission
- [Motion-Geometry-Coherence-Loss](Motion-Geometry-Coherence-Loss) — 运动约束作为 pose-depth 一致性认证信号

### Methods
- [EAG3R-Architecture](EAG3R-Architecture) — MonST3R + event adapter + SNR fusion + event loss
- [Event-Augmented-Geometry-Candidate](Event-Augmented-Geometry-Candidate) — event 作为额外认证信号源

### Project
- [SkelGS-SLAM: EAG3R 分析](10_Projects/SkelGS-SLAM/decision-log)
