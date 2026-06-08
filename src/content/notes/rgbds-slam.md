---
title: "RGBDS-SLAM: A RGB-D Semantic Dense SLAM Based on 3D Multi Level Pyramid Gaussian Splatting"
date: 2026-06-08
updated: 2026-06-08
summary: RGBDS-SLAM 是一个 RGB-D semantic dense SLAM 系统。核心：ORB-SLAM3 tracking + 3D Multi-Level Pyramid GS + RGB-depth-semantic 三通道联合优化。不是 monocular / dynamic / tracking-frontend-innovation paper。

tags:
  - GS-SLAM
relatedNotes: []
category: 文献笔记
importance: 2
draft: false
type: note
---

# RGBDS-SLAM: A RGB-D Semantic Dense SLAM Based on 3D Multi Level Pyramid Gaussian Splatting

> IEEE RA-L 2025. 论文整理笔记。
> 📄 [PDF 原文](RGBDS-SLAM.pdf)

## 0. 一句话结论

RGBDS-SLAM 是一个 RGB-D semantic dense SLAM 系统。核心：ORB-SLAM3 tracking + 3D Multi-Level Pyramid GS + RGB-depth-semantic 三通道联合优化。不是 monocular / dynamic / tracking-frontend-innovation paper。

定位：Photo-SLAM/ORB-SLAM3 系上的 semantic dense Gaussian mapping 增强。

---

## 1. 它解决什么问题

论文认为现有 3DGS-SLAM 三个问题：
1. 细节恢复不够（小物体/边界/纹理）
2. 不同区域 reconstruction consistency 不够
3. RGB、depth、semantic 多特征之间耦合弱

回答：MLP-GS（多尺度 pyramid）+ TCMF-RO（多特征紧耦合优化）。

---

## 2. 核心机制

### MLP-GS: 3D Multi-Level Pyramid Gaussian Splatting
Coarse-to-fine: n 层 image pyramid，分辨率逐层提高。先低分辨率学全局结构，再逐步补细节。Replica 默认 3 层。

### TCMF-RO: Tightly Coupled Multi-Features Reconstruction Optimization
RGB (L1+SSIM) + depth (L1) + semantic (L1+SSIM) 联合优化。三个通道在 Gaussian optimization 中互相约束。

### System
ORB-SLAM3 tracking + GaussianMapping thread + LoopClosing。
Gaussian 含 position / color / depth / semantics / opacity，三路 splatting。

---

## 3. 实验说明了什么

### RGB reconstruction (Replica)
| Method | PSNR | SSIM | LPIPS |
|---|---|---|---|
| RGBDS-SLAM | **38.85** | 0.967 | **0.035** |
| Photo-SLAM | 34.96 | 0.942 | 0.059 |
| SplaTAM | 34.11 | 0.970 | 0.100 |

PSNR 和 LPIPS 强；SSIM 不是全表第一。

### Depth / ATE / FPS
- Depth L1 **0.342 cm**（优于 SplaTAM 0.490）
- ATE RMSE 0.589 cm（不是最优：SplaTAM 0.360）
- Tracking 29.55 FPS, Mapping 32.22 FPS

### Semantic mIoU (Replica)
**94.32** > SGS-SLAM 92.72 > NEDS-SLAM 90.78

### Ablation (TCMF-RO)
| | PSNR | mIoU |
|---|---|---|
| w/o depth & semantic | 36.62 | / |
| full | 38.85 | 94.32 |

Depth + semantic 有提升，但边际增益不大。

---

## 4. 弱点

1. **不处理动态场景** — 未来工作
2. **RGB-D 假设** — 非 monocular
3. **语义输入不现实** — Replica 用 GT；真实场景依赖 SAM2（有误检）
4. **Tracking 创新弱** — ORB-SLAM3 base，ATE 非最优
5. **横向比较数据来自各原论文** — 非统一复现
6. **Semantic 边际增益有限** — ablation 显示 w/o depth 已接近 full

---

## 5. 对你项目的借鉴价值

### 可借鉴：Pyramid geometry acceptance
Coarse-to-fine 不只用于渲染，也可用于 anchor 准入：
- Level 0: 低频结构 / 大面
- Level 1: 中频边界 / 法线过渡
- Level 2: 高频细节 / 高梯度 anchor

### 可借鉴：Multi-channel Gaussian attributes
Gaussian 不只存 RGB，也可存 depth/normal/confidence/semantic-risk/maturity。

### 可借鉴：Joint loss 分阶段
RGB-depth-semantic 联合优化有用，但必须放在"已认证几何之后"，不能反向污染前端。

### 不建议直接借
- GS render loss 反哺 frontend
- ORB-SLAM3 tracking 替代 DPVO/DROID
- RGB-D depth assumption 直接迁移到 monocular

### 与其他论文对比
| | RGBDS-SLAM | ADD-SLAM |
|---|---|---|
| 场景 | 静态 RGB-D semantic | 动态 RGB-D |
| 对你项目价值 | backend mapping 增强 | dynamic-risk / consistency evidence |

---

## Related extracted notes

### Concepts
- [Multi-Level-Pyramid-GS](Multi-Level-Pyramid-GS) — coarse-to-fine pyramid for GS mapping
- [Multi-Channel-Gaussian-Attributes](Multi-Channel-Gaussian-Attributes) — RGB + depth + semantic as GS channels

### Methods
- [Pyramid-Anchor-Admission](Pyramid-Anchor-Admission) — translating pyramid GS to anchor admission
- [Joint-Multi-Feature-GS-Optimization](Joint-Multi-Feature-GS-Optimization) — RGB-depth-semantic joint loss

### Project
- [SkelGS-SLAM: RGBDS-SLAM 分析](10_Projects/SkelGS-SLAM/decision-log)
