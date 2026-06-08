---
title: "MGS-SLAM: Monocular Sparse Tracking and Gaussian Mapping with Depth Smooth Regularization"
date: 2026-06-08
updated: 2026-06-08
summary: "MGS-SLAM 是一个 RGB-only monocular Gaussian SLAM 系统。核心是把 DPVO 稀疏 VO 前端 + MVS depth estimation + 3DGS dense mapping 后端接起来，通过 SDAR (Sparse-Dense Adjustment Ring) 保持尺度一致。最接近\"DPVO + monocular Gaussian mapping\"的参考系统之一。"

tags:
  - SLAM
  - dense-SLAM
  - monocular
  - 3DGS
  - Online
  - GS-SLAM
relatedNotes: []
category: 文献笔记
importance: 2
draft: false
type: note
---

# MGS-SLAM: Monocular Sparse Tracking and Gaussian Mapping with Depth Smooth Regularization

> IEEE RA-L 2024. 论文整理笔记。
> 📄 [PDF 原文](MGS-SLAM.pdf)

## 0. 一句话结论

MGS-SLAM 是一个 RGB-only monocular Gaussian SLAM 系统。核心是把 DPVO 稀疏 VO 前端 + MVS depth estimation + 3DGS dense mapping 后端接起来，通过 SDAR (Sparse-Dense Adjustment Ring) 保持尺度一致。最接近"DPVO + monocular Gaussian mapping"的参考系统之一。

---

## 1. 系统定位

Monocular RGB SLAM + sparse tracking (DPVO) + dense Gaussian mapping + learned MVS depth supervision。

不是 RGB-D GS-SLAM / MonoGS map-centric tracking / DROID/DPVO 简单复用 / global BA 系统。

---

## 2. 核心问题

早期 GS-SLAM 依赖 RGB-D；MonoGS monocular 但 GSM tracking 不稳。MGS-SLAM 解决：sparse VO 有 tracking 和尺度；Gaussian map 需要 dense depth；MVS depth 有噪声和尺度不稳定；三者必须闭环约束。

方案：DPVO sparse VO + MVS depth network + SDAR scale closure + 3DGS mapping + depth smooth regularization。

---

## 3. Input/Output

### Input
Monocular RGB stream（无需 RGB-D sensor，但内部用 MVS 生成 depth）

### Output
Camera trajectory, sparse VO map, MVS prior depth maps, optimized prior depth (SDAR), dense 3D Gaussian map, novel-view rendered RGB/depth。

---

## 4. 总体 Pipeline

```
RGB stream
→ DPVO frontend: patch graph tracking, pose, sparse point cloud
→ keyframe window
→ MVS network: estimate prior depth maps
→ SDAR step 1: sparse point cloud corrects prior depth scale/statistics
→ Gaussian backend: photometric + depth + smooth + isotropic losses
→ SDAR step 2: corrected depth → backproject → init new Gaussians
→ SDAR step 3: Gaussian-rendered depth → frontend depth init (scale closure)
```

---

## 5. Frontend: DPVO Sparse VO

DPVO-based: sparse patches, patch graph, reprojection optimization, 2D correction vector + confidence, BA → poses + patch depths + sparse point cloud。

为什么不用 GS 直接 tracking：MGS-SLAM 认为 GS map tracking 不稳，DPVO 更可靠。这支持你当前 DPVO 作为 temporal backbone 的路线。

---

## 6. MVS Prior Depth Network

FPN features → warping to 2D cost volume → coarse-to-fine depth decoding。在 ScanNet 上训练。Loss: scale-invariant + multi-view + normal loss。

作用：给 dense Gaussian mapping 提供 dense depth proposal。

---

## 7. Backend: 3D Gaussian Mapping

Gaussian representation: center, covariance, opacity, color。

职责：优化 frontend coarse pose + 构建优化 dense Gaussian map。

---

## 8. Mapping Losses

L = L_photo + L_depth + L_smooth + L_iso

- **L_photo**: rendered vs observed RGB (L1)
- **L_depth**: rendered depth vs SDAR-optimized prior depth
- **L_smooth**: depth smooth regularization（防止 MVS noisy depth 硬吃进 GS map）
- **L_iso**: isotropic loss（抑制 Gaussians 沿 view ray 拉伸）

---

## 9. Camera Pose from GS

DPVO coarse pose → Gaussian render → loss backprop → optimize Gaussians + pose。GS backend 允许优化 pose。

你的原则可以借鉴但要降级：GS pose refinement 只能作为 candidate/evaluator，不直接写 VideoBuffer truth。

---

## 10. SDAR: Sparse-Dense Adjustment Ring

### Step 1: Sparse → Dense correction
Sparse point cloud → project to prior depth camera → sparse depth map。Prior depth + sparse depth 统计分布假设正态 → mean/std 线性校正。

### Step 2: Corrected depth → Gaussian init
Corrected prior depth → backproject → downsample → new Gaussians。

### Step 3: Gaussian → Frontend feedback
Gaussian-rendered depth → frontend tracking frame depth init → scale closure。

SDAR 是 MGS-SLAM 最有价值的机制：sparse VO ↔ MVS depth ↔ GS map 形成尺度闭环。

---

## 11. 实验表现

### Tracking (Replica)
- DROID-VO avg: 0.70 cm
- DPVO avg: 0.54 cm
- MonoGS avg: 10.76 cm (多场景失败)
- MGS-SLAM: **优于 DPVO frontend**

### Novel view rendering (Replica)
优于 NICE-SLAM, Vox-Fusion, GO-SLAM, NICER-SLAM。

### Runtime
比 GS map-centric tracking 更快（DPVO 前端轻量）。

---

## 12. 强项

1. **很接近你当前 DPVO + GS 路线** — 明确分工：DPVO tracking, GS mapping, SDAR scale
2. **正视 monocular scale consistency** — SDAR 显式处理 sparse ↔ dense scale
3. **不直接相信 MVS depth** — SDAR correction + smooth loss
4. **DPVO ↔ GS 双向连接** — 但不是单向流水线

---

## 13. 局限

1. **没有真正解决"certification"** — 无 CertifiedGeometryPacket / anchor maturity / free-space / dynamic
2. **GS feedback 可能污染 frontend** — SDAR step 3 有风险
3. **MVS depth network 是额外依赖** — 泛化风险和 domain shift
4. **无显式 loop closure / global correction**
5. **动态场景不在核心范围**

---

## 14. 对 SkelGS-SLAM 的启发

### 最值借鉴
1. **DPVO frontend + GS backend 的系统分工**
2. **SDAR: sparse-dense scale closure** — 你 P-v5 / scale coherence 的参考
3. **Depth smooth loss** — predicted depth 不能硬吃进 GS
4. **Tracking keyframe vs mapping keyframe 分离**

### 需加强
- SDAR 用 mean/std 统计校正不够 → 你的版本应更强：temporal + normal + residual + free-space gate
- GS feedback 要有强 gate → certified anchor + high alpha + low residual
- Certification layer 必须存在

---

## 15. 最终定位

| 系统 | 定位 | 对 SkelGS-SLAM 价值 |
|---|---|---|
| **MGS-SLAM** | **monocular DPVO + MVS + GS** | **最接近你路线的参考系统** |
| DPVO | temporal tracking backbone | 前端 |
| MonoGS | monocular-first GS | map-centric 对比 |
| SplaTAM/GS-SLAM | RGB-D GS-SLAM | sensor depth baseline |
| GO-SLAM | global correction | global consistency |

MGS-SLAM 是目前最接近"DPVO + monocular Gaussian mapping"的参考系统。但它还不够安全：SDAR 是 sparse-dense scale correction，你需要的是 CertifiedGeometryPacket / CertifiedAnchor。

---

## Related extracted notes

### Concepts
- [Sparse-Dense-Scale-Alignment](Sparse-Dense-Scale-Alignment) — SDAR: sparse VO ↔ dense depth ↔ GS map scale closure
- [Monocular-GS-SLAM-Pipeline](Monocular-GS-SLAM-Pipeline) — DPVO + MVS depth + GS mapping system architecture

### Methods
- [SDAR-Mechanism](SDAR-Mechanism) — SDAR three-step scale correction
- [Predicted-Depth-GS-Supervision](Predicted-Depth-GS-Supervision) — depth smooth loss + sparse correction for GS supervision

### Project
- [SkelGS-SLAM: MGS-SLAM 分析](10_Projects/SkelGS-SLAM/decision-log)
