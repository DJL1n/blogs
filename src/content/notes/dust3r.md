---
title: "DUSt3R: Geometric 3D Vision Made Easy"
date: 2026-06-08
updated: 2026-06-08
summary: DUSt3R 是一个 two-view / multi-view dense 3D reconstruction foundation model。核心：不再先估相机内参/外参/匹配/三角化，而是直接让 Transformer 从一对图像回归 dense 3D pointmaps。Dense and Unconstrained Stereo 3D Reconstruction。

tags:
  - Foundation-Model
  - Dense-Correspondence
  - Point-Cloud
  - Stereo
  - GS-SLAM
relatedNotes: []
category: 文献笔记
importance: 2
draft: false
type: note
---

# DUSt3R: Geometric 3D Vision Made Easy

> CVPR 2024. 论文整理笔记。
> 📄 [PDF 原文](DUSt3R.pdf)

## 0. 一句话结论

DUSt3R 是一个 two-view / multi-view dense 3D reconstruction foundation model。核心：不再先估相机内参/外参/匹配/三角化，而是直接让 Transformer 从一对图像回归 dense 3D pointmaps。Dense and Unconstrained Stereo 3D Reconstruction。

---

## 1. 核心问题

传统 MVS/SfM 需要：相机内参 K + 外参 T + 匹配 + epipolar geometry + triangulation + depth fusion。对 in-the-wild image collection 很麻烦。DUSt3R 反向思路：不要先恢复 camera geometry，直接预测每个像素在 3D 中的位置 → pointmap regression。

---

## 2. 输入与输出

### 输入
Two RGB images I1, I2（无需 intrinsics/extrinsics/pose/depth/feature matches）

### 输出
1. X1,1: image 1 pointmap in camera 1 frame
2. X2,1: image 2 pointmap in camera 1 frame（同一坐标系）
3. Confidence maps C1, C2

然后可恢复：depth, pixel matches, relative pose, camera intrinsics, 3D reconstruction。

---

## 3. 什么是 Pointmap

每个像素 → 完整 3D 坐标 (x, y, z)。与 depth map 区别：depth map 只有 z，需 K 反投影；pointmap 直接有完整 3D，无需先知道 K。Pointmap 是 camera-agnostic 3D coordinate field。

---

## 4. 核心范式

```
I1, I2 → transformer encoder-decoder
→ X1 (I1 pointmap in frame 1)
→ X2 (I2 pointmap in frame 1)
→ C1, C2 (confidence)
→ recover: depth, matches, pose, intrinsics, 3D recon
```

统一 monocular & binocular：单图可构造 I1, I1 pair 退化为单图 3D prediction。

---

## 5. 网络结构

Transformer encoder-decoder。Shared image encoder → cross-view transformer decoder → two pointmap heads → pointmaps + confidence。与传统 stereo（cost volume + disparity）完全不同。

---

## 6. 多视角重建：Global Alignment

Multi-view: pairwise forward pass → 各 pair 坐标系不同 → global alignment optimization 表达所有 pointmaps 到共同 reference frame。

Two-view: forward pass 即可。Multi-view: pairwise + global alignment。这也是 Spann3R 要解决的问题（直接预测 global-coordinate pointmap）。

---

## 7. 从 Pointmap 恢复几何量

- **Depth**: z component in camera frame
- **Pixel matches**: X1(p) ≈ X2(q) → p↔q
- **Relative pose**: 3D-3D alignment / PnP
- **Camera intrinsics**: 从 pointmap + coordinate 反推近似 camera model

传统几何任务变成 pointmap 输出上的后处理。

---

## 8. 与 MASt3R 关系

DUSt3R: pointmap + confidence，强 3D reconstruction，matching 精度不够
MASt3R: DUSt3R + dense local feature head + InfoNCE matching loss → 提升 matching 精度

DUSt3R = 3D reconstruction prior；MASt3R = DUSt3R + better matching。

---

## 9. 与 Spann3R 关系

DUSt3R: pairwise pointmap, multi-view 需 global alignment
Spann3R: DUSt3R backbone + spatial memory → 直接预测 global-coordinate pointmap

---

## 10. 与传统 SfM/MVS 区别

传统: feature matching → pose → triangulate → BA → MVS
DUSt3R: input pair → directly regress pointmaps → optional global alignment

优点：无需标定、无需传统 matching、对 sparse/unordered images 更友好、统一 depth/pose/matching。缺点：learned prior 非严格几何优化、多视角需 alignment、高分辨率成本高。

---

## 11. 强项

1. **不需要 camera calibration / pose** — 最大突破
2. **统一多个 3D vision tasks** — depth, matches, pose, camera, reconstruction
3. **对 wide-baseline 有强鲁棒性** — learned cross-view 3D prior
4. **作为 geometry proposal 非常强** — dense two-view geometry candidate

---

## 12. 局限

1. **不是 SLAM** — 无 online state / tracking / keyframe / loop / BA
2. **无 temporal residual / lifecycle evidence** — 只给 pairwise pointmap + confidence
3. **多视角 global alignment 可能出错** — scale drift / 动态 / 低重叠
4. **Confidence 不是严格 uncertainty**
5. **输出不适合直接 Gaussian birth** — scale / surface / pair-conditioned inconsistency

---

## 13. 对 SkelGS-SLAM 的价值

### 最适合作为 dense geometry proposal source
- Selected keyframe pair → DUSt3R pointmaps
- Depth candidate, point cloud candidate, wide-baseline edge
- DPVO drift 的外部对照
- Anchor candidate 的 pairwise support

### 不适合
- 高频 tracking / 长窗口 trajectory / 直接 GS input

### DUSt3R → CandidatePacket, 非 CertifiedPacket
```
DUSt3R output → CandidateGeometryPacket
→ DPVO temporal support
→ depth-normal consistency
→ scale/gauge check
→ free-space check
→ global graph consistency
→ CertifiedGeometryPacket
→ GS
```

### 作为 failure detector
DPVO stable + DUSt3R inconsistent → candidate risk ↑
DUSt3R strong + DPVO stable → anchor support ↑

### 对 anchor skeleton 的启发
Pointmap 可快速给出 dense local surface proposal，但 anchor 长期稳定仍需要 temporal + surface + pairwise + global + GS evidence。

---

## 14. 最终定位

| 系统 | 定位 | 对 SkelGS-SLAM 价值 |
|---|---|---|
| **DUSt3R** | **pairwise dense 3D foundation prior** | **foundational geometry proposal** |
| MASt3R | DUSt3R + better matching | wide-baseline witness |
| Spann3R | DUSt3R + spatial memory | sequence proposal |
| DPVO | temporal optimization | temporal backbone |
| GO-SLAM | global correction | global consistency |
| GS methods | GS backend | map reference |

DUSt3R 真正价值：把几何视觉从"先求相机再三角化"改成"直接回归 pointmap"。但对 GS-SLAM 来说，DUSt3R pointmap 只能是强 geometry proposal，不能是最终 geometry truth；必须经过 temporal/scale/normal/free-space/global consistency 认证。

---

## Related extracted notes

### Concepts
- [Pointmap-Regression](Pointmap-Regression) — pointmap vs depth map, direct 3D coordinate regression
- [Uncalibrated-Dense-Reconstruction](Uncalibrated-Dense-Reconstruction) — dense reconstruction without camera calibration/pose

### Methods
- [DUSt3R-Global-Alignment](DUSt3R-Global-Alignment) — DUSt3R's multi-view global alignment strategy
- [Pointmap-to-Geometry](Pointmap-to-Geometry) — deriving depth/matches/pose/intrinsics from pointmaps

### Project
- [SkelGS-SLAM: DUSt3R 分析结论](10_Projects/SkelGS-SLAM/decision-log)
