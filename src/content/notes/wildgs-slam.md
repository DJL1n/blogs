---
title: "WildGS-SLAM: Monocular Gaussian Splatting SLAM in Dynamic Environments"
date: 2026-06-08
updated: 2026-06-08
summary: WildGS-SLAM 是一个面向动态场景的 monocular RGB Gaussian SLAM 系统。核心：DROID-style tracking + DINOv2 uncertainty MLP + Metric3D depth + uncertainty-aware DBA + uncertainty-weighted 3DGS static mapping。动态移除不依赖语义类别，通过 per-sequence uncertainty 降权动态/遮挡/不一致区域。

tags:
  - SLAM
  - dense-SLAM
  - monocular
  - 3DGS
  - Semantic
  - Online
  - GS-SLAM
relatedNotes: []
category: 文献笔记
importance: 2
draft: false
type: note
---

# WildGS-SLAM: Monocular Gaussian Splatting SLAM in Dynamic Environments

> CVPR 2025. 论文整理笔记。
> 📄 [PDF 原文](WildGS-SLAM.pdf)

## 0. 一句话结论

WildGS-SLAM 是一个面向动态场景的 monocular RGB Gaussian SLAM 系统。核心：DROID-style tracking + DINOv2 uncertainty MLP + Metric3D depth + uncertainty-aware DBA + uncertainty-weighted 3DGS static mapping。动态移除不依赖语义类别，通过 per-sequence uncertainty 降权动态/遮挡/不一致区域。

---

## 1. 系统定位

Monocular RGB dynamic-scene SLAM + DROID-style dense tracking + uncertainty-aware dynamic removal + 3D Gaussian static map。

---

## 2. 核心问题

传统 SLAM 假设静态，动态物体会污染 pose 和 GS map。很多 dynamic SLAM 依赖语义类别/RGB-D depth。WildGS-SLAM 回答：用 per-sequence uncertainty（DINOv2 + online MLP）替代语义先验，同时降权 dynamic regions in tracking + mapping。

---

## 3. Pipeline

```
RGB → DINOv2 feature + uncertainty MLP → per-pixel uncertainty
     → Metric3D V2 metric depth
     → DROID-style tracking (uncertainty-aware DBA + metric depth reg)
     → keyframe pose + depth
     → GS map expansion (metric depth as proxy)
     → uncertainty-weighted GS mapping (RGB/depth loss × uncertainty)
     → online uncertainty MLP update (detached from GS gradients)
     → final global BA + map refinement
```

---

## 4. 核心一：DINOv2 + uncertainty MLP

### 输入特征
3D-aware finetuned DINOv2 → shallow MLP → uncertainty map。在线训练，随帧流增量适配。

### Uncertainty loss
Modified SSIM loss + depth L1 (Metric3D) + regularization。

### 独立优化
Uncertainty MLP 和 3D Gaussian map 独立训练，互不传梯度。防止互相作弊。

### 输出
per-pixel uncertainty → DBA weight + mapping weight。

---

## 5. 核心二：uncertainty-aware DBA

DROID-style DBA + uncertainty map 作为 Mahalanobis weighting。Dynamic pixels → low weight in DBA → 不影响 pose/depth optimization。Metric3D depth 作为 early stabilizer（uncertainty MLP 未收敛时）。

---

## 6. 核心三：uncertainty-weighted GS mapping

Metric3D proxy depth → Gaussian expansion。Loss weighted by uncertainty: color (L1+SSIM) × u_weight + depth × u_weight + isotropic reg。Pose update → deform GS map。

---

## 7. Final global BA + map refinement

Keyframe poses 全局优化。去除 disparity regularization（multiview 足够）。Fix poses → optimize uncertainty MLP + GS map（all keyframes）。

---

## 8. 实验表现

### Tracking
| Dataset | WildGS-SLAM | Best baseline |
|---|---|---|
| Wild-SLAM MoCap | **0.46 cm** | DROID-SLAM 16.17, MonoGS 47.99 |
| Bonn Dynamic | **2.31 cm** | DROID-SLAM 4.91 |
| TUM Dynamic | **1.51 cm** | DROID-SLAM 1.62 |

### Static scenes (TUM)
ATE **1.1 cm** — 与 Splat-SLAM 持平，dynamic handling 不显著退化。

### Runtime
Full: ~0.5 FPS；Fast: ~2 FPS。

---

## 9. Ablation 关键结论

### Disparity regularization
Online: useful；Final global BA: remove it（multiview more accurate）。

### Uncertainty vs semantic mask
WildGS-SLAM uncertainty > MonST3R mask > YOLOv8+SAM mask in ATE。

### Failure cases
- Shopping: 复杂静态纹理 → uncertainty 误判
- Wandering: 动态物体长时间静止+遮挡 → 无法移除

---

## 10. 强项

1. **动态移除不依赖语义类别** — DINOv2 + online uncertainty
2. **Uncertainty 同时用于 tracking + mapping**
3. **DROID-style dense frontend** — 比 GS render tracking 更适合动态
4. **Uncertainty MLP 在线适配**
5. **独立优化避免 uncertainty 和 GS 互相作弊**

---

## 11. 局限

1. **速度慢** — full ~0.5 FPS, fast ~2 FPS
2. **仍依赖 monocular metric depth prior** — Metric3D
3. **Uncertainty ≠ 严格 dynamic probability** — 复杂纹理可能误判
4. **依赖静态背景可见性** — 长期遮挡可能失败
5. **无显式 object motion model**

---

## 12. 对 SkelGS-SLAM 的启发

### ★ Uncertainty 进入 CandidatePacket 作为 dynamic risk
WildGS-SLAM 把 uncertainty 作为 tracking/mapping 权重。你的系统可以改成：
DPVO residual + MASt3R disagreement + depth-normal inconsistency + GS residual + DINOv2 → per-packet uncertainty / dynamic risk。

### 动态区域不入 CertifiedAnchor
High uncertainty/high dynamic risk → no certificate, no GS birth, quarantine。

### 但仅靠 uncertainty 不够
WildGS failure case 说明复杂静态纹理可能误判。应融合 temporal residual + multi-view visibility + free-space + normal + anchor survival + loop revisiting。

### Predicted depth = early stabilizer, not truth
Online 有用，final global BA 应 remove disparity reg。

### GS feedback 和 uncertainty 独立优化
避免互相作弊。

---

## 13. 最终定位

| 系统 | 定位 | 对 SkelGS-SLAM 价值 |
|---|---|---|
| **WildGS-SLAM** | **mono dynamic GS-SLAM** | **uncertainty / dynamic removal reference** |
| MGS-SLAM | DPVO+MVS+GS | scale closure |
| HI-SLAM2 | dense+priors+JDSA+GS | geometry alignment |
| MonoGS/Splat-SLAM | monocular GS | static baseline |

---

## Related extracted notes

### Concepts
- [Uncertainty-Dynamic-Filtering](Uncertainty-Dynamic-Filtering) — per-sequence uncertainty for dynamic distractor removal
- [Static-Dynamic-Side-Channel](Static-Dynamic-Side-Channel) — uncertainty as side-channel, not main geometry

### Methods
- [WildGS-SLAM-Architecture](WildGS-SLAM-Architecture) — DROID + uncertainty + GS dynamic pipeline
- [Certified-Dynamic-Gate](Certified-Dynamic-Gate) — translating uncertainty to anchor admission

### Project
- [SkelGS-SLAM: WildGS-SLAM 分析](10_Projects/SkelGS-SLAM/decision-log)
