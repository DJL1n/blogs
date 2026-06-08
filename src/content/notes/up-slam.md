---
title: "UP-SLAM: Adaptively Structured Gaussian SLAM with Uncertainty Prediction in Dynamic Environments"
date: 2026-06-08
updated: 2026-06-08
summary: UP-SLAM 是一个面向动态环境的 RGB-D Gaussian SLAM 系统。核心：ORB-SLAM3 tracking + training-free uncertainty estimator + probabilistic octree anchors + DINO feature-enriched GS map + temporal encoding + parallel tracking-mapping。不是 monocular / DROID/DPVO VO / pointmap prior / offline GS。

tags:
  - SLAM
  - dense-SLAM
  - RGB-D
  - 3DGS
  - Anchor-Structured
  - Semantic
  - Online
  - GS-SLAM
relatedNotes: []
category: 文献笔记
importance: 2
draft: false
type: note
---

# UP-SLAM: Adaptively Structured Gaussian SLAM with Uncertainty Prediction in Dynamic Environments

> ICRA 2026. 论文整理笔记。
> 📄 [PDF 原文](UP-SLAM.pdf)

## 0. 一句话结论

UP-SLAM 是一个面向动态环境的 RGB-D Gaussian SLAM 系统。核心：ORB-SLAM3 tracking + training-free uncertainty estimator + probabilistic octree anchors + DINO feature-enriched GS map + temporal encoding + parallel tracking-mapping。不是 monocular / DROID/DPVO VO / pointmap prior / offline GS。

---

## 1. 系统定位

RGB-D dynamic Gaussian SLAM + feature-based tracking (ORB-SLAM3) + structured 3DGS mapping + uncertainty-aware dynamic filtering。

---

## 2. 核心问题

3DGS-SLAM 默认静态，动态物体污染 tracking 和 mapping。顺序式 pipeline（先 tracking 再 mapping）延迟高。手工阈值初始化/剪枝在动态场景不可靠。UP-SLAM 回答：parallel tracking-mapping + probabilistic anchor + multi-modal uncertainty。

---

## 3. Pipeline

```
RGB-D stream
→ Tracking thread (ORB-SLAM3 + training-free uncertainty + motion mask)
→ Mapping thread (probabilistic octree anchors + DINO feature distillation
                   + uncertainty MLP + temporal encoding)
→ Gaussian attributes decoded from anchor features + view conditions
→ Color/depth/feature/uncertainty losses
```

---

## 4. Parallel tracking-mapping

Tracking 和 mapping 解耦并行。Tracking 用 ORB-SLAM3 + uncertainty motion mask 过滤动态 keypoints。Dynamic mask 不需要 map 收敛。Mapping 优化 structured Gaussian map + uncertainty MLP。

---

## 5. Training-free uncertainty estimator

不是预训练语义分割 / DINO MLP。利用当前 GS map 快速渲染得到的 multimodal residual（color、depth、DINO feature、transmittance）直接优化 uncertainty map。Tracking 初始化用 YOLOv8-seg 增强 mask completeness，但主要动态识别来自 residual-guided refinement。

---

## 6. Probabilistic octree anchors

Anchor 不是固定体素中心，而包含概率属性表示 motion degree / dynamic probability。Bayesian update: prior + observation + likelihood → updated probability。High dynamic probability → pruning/reduction，减少冗余和模型体积。Ablation: model size 从 22.92 MB → 7.01 MB。

---

## 7. Structured Gaussian decoding

Scaffold-GS style: anchor feature + relative direction/distance → MLP → Gaussian attributes (color, opacity, rotation, scale)。与 OG-Mapping / VPGS / SEGS-SLAM 同类。

---

## 8. DINO feature-enriched map

Low-dim Gaussian visual attribute → shallow MLP → high-dim DINO feature。用于 uncertainty prediction + dynamic mask refinement + downstream object navigation。

---

## 9. Temporal encoding

Sinusoidal positional encoding → temporal embedding → condition all MLPs。增强 rendering quality（abl: w/o Time PSNR 26.6 → Full 28.0）。

---

## 10. 实验表现

### Tracking (ATE RMSE)
- Bonn: **3.2 cm** vs Photo-SLAM 33.91, GS-SLAM 33.03
- MoCap: **1.08 cm** vs DG-SLAM 7.06
- TUM dynamic: **1.42 cm** vs DynaSLAM 1.52

### Rendering (Bonn)
- PSNR **28.0**, SSIM 0.904, LPIPS 0.117
- WildGS-SLAM RGB: 23.43 PSNR
- SplaTAM: 19.30 PSNR

### Runtime
- Avg 78 ms/frame, Model size **7.01 MB** (SplaTAM 29.9 MB)

---

## 11. 强项

1. **Parallel tracking/mapping** — 解耦，实时性
2. **Probabilistic octree anchors** — 动态场景 anchor 管理自动化
3. **Training-free uncertainty** — early stage 无需等 MLP 收敛
4. **DINO feature map** — downstream useful
5. **Compact model** — probabilistic update 控制体积

---

## 12. 局限

1. **RGB-D，非 monocular**
2. **ORB-SLAM3 feature tracking** — 不提供 DPVO patch lifecycle / DROID BA residual
3. **部分依赖 YOLOv8-seg** — 不是纯 open-set
4. **不显式建模动态物体运动**
5. **不是 geometry certification 框架**

---

## 13. 对 SkelGS-SLAM 的启发

### ProbabilisticAnchor → CertifiedAnchor 参考
UP-SLAM anchor probability = motion/occupancy。你的 CertifiedAnchor 应更丰富：temporal support + scale/depth/normal + static prob + dynamic risk + free-space + GS support。

### 概率更新替代硬阈值
UP-SLAM 批评手工阈值不可靠。你的 monocular 系统更应避免: depth conf > threshold → birth。应 Bayesian evidence accumulation。

### DINO feature distillation
Low-dim anchor feature + shallow MLP → high-dim semantic feature。可以扩展你的 anchor skeleton。

### tracking/mapping 解耦 → 支持 no-writeback
Frontend DPVO truth candidate。GS backend consumes only certified packets。Render residual = side-channel evaluator。

### Training-free estimator for early gate
WildGS MLP 在线早期可能不稳。UP-SLAM training-free alternative: early use residual-based uncertainty, later train feature-based MLP。

---

## 14. 最终定位

| 系统 | 定位 | 对 SkelGS-SLAM 价值 |
|---|---|---|
| **UP-SLAM** | **RGB-D dynamic GS-SLAM** | **probabilistic anchor / uncertainty / feature map** |
| WildGS-SLAM | mono dynamic GS-SLAM | uncertainty for mono |
| HI-SLAM2 | mono dense+priors+GS | scale/geom alignment |
| MGS-SLAM | DPVO+MVS+GS | DPVO 路线参考 |
| VPGS/OG-Mapping | structured GS map | anchor structure |

UP-SLAM 核心：probabilistic anchor + multi-modal uncertainty + parallel decoupling + DINO feature map。

---

## Related extracted notes

### Concepts
- [Probabilistic-Anchor-Update](Probabilistic-Anchor-Update) — Bayesian anchor probability for dynamic environments
- [Multi-Modal-Uncertainty](Multi-Modal-Uncertainty) — color/depth/DINO/transmittance residual fusion

### Methods
- [UP-SLAM-Architecture](UP-SLAM-Architecture) — parallel ORB-SLAM3 + probabilistic GS mapping
- [Certified-Probabilistic-Anchor](Certified-Probabilistic-Anchor) — extending probabilistic anchor to CertifiedAnchor

### Project
- [SkelGS-SLAM: UP-SLAM 分析](10_Projects/SkelGS-SLAM/decision-log)
