---
title: "SLAM3R: Real-Time Dense Scene Reconstruction from Monocular RGB Videos"
date: 2026-06-08
updated: 2026-06-08
summary: SLAM3R 是一个 RGB-only monocular dense reconstruction / dense SLAM 系统。核心：sliding-window I2P local pointmap reconstruction + L2W learned local-to-world registration + no explicit camera parameter solving + 20+ FPS。不是 3DGS-SLAM / DPVO/DROID recurrent BA / explicit pose graph system。

tags:
  - SLAM
  - dense-SLAM
  - monocular
  - Foundation-Model
  - Dense-Correspondence
  - Point-Cloud
  - GS-SLAM
relatedNotes: []
category: 文献笔记
importance: 2
draft: false
type: note
---

# SLAM3R: Real-Time Dense Scene Reconstruction from Monocular RGB Videos

> CVPR 2025 Highlight. 论文整理笔记。
> 📄 [PDF 原文](SLAM3R.pdf)

## 0. 一句话结论

SLAM3R 是一个 RGB-only monocular dense reconstruction / dense SLAM 系统。核心：sliding-window I2P local pointmap reconstruction + L2W learned local-to-world registration + no explicit camera parameter solving + 20+ FPS。不是 3DGS-SLAM / DPVO/DROID recurrent BA / explicit pose graph system。

---

## 1. 系统定位

RGB-only dense reconstruction / dense SLAM + DUSt3R-style pointmap + sliding-window local reconstruction + learned global registration。

---

## 2. 核心问题

传统 SfM/MVS pipeline 需显式相机内参/外参/匹配/BA/MVS。DUSt3R pairwise 强但多视图对齐成本高。SLAM3R 回答：不要显式求解相机参数，直接用网络做局部重建 + 学习式全局注册。

---

## 3. Input/Output

### Input
Monocular RGB video（无需 depth / pose / intrinsics / SfM / LiDAR）

### Output
Dense global pointcloud / pointmaps + per-frame predictions + confidence maps

---

## 4. 总体 Pipeline

```
RGB video → sliding window clips
→ I2P: local window pointmaps (keyframe coordinate)
→ Scene initialization from first window
→ Reservoir of registered scene frames
→ Retrieval: select top-k correlated frames
→ L2W: local pointmaps → global coordinate pointmaps
→ Incremental fusion → dense global pointcloud
```

---

## 5. I2P: Inner-Window Local Reconstruction

### 目的
Short video clip → keyframe-referenced multi-frame dense 3D pointmaps。

### 与 DUSt3R 关系
受 DUSt3R 启发但改进为 multi-view window reconstruction。DUSt3R 是 pairwise；I2P 支持 multiple supporting frames。

### 网络结构
Multi-branch ViT: shared image encoder + keyframe decoder (multi-view cross-attention + max-pooling) + supporting decoder (DUSt3R-style, cross-attention only with keyframe) + point regression head + confidence head。

### Keyframe decoder
Queries = keyframe tokens, keys/values = supporting tokens。Different supporting images independently cross-attend, then max-pooling aggregate multi-view evidence。

### 输出
Dense 3D pointmaps + confidence maps。Canonical scale normalization within window。

---

## 6. L2W: Local-to-World Global Registration

### 目的
把 I2P 新窗口的 local pointmap 注册到已有 global coordinate system。

### Scene initialization
First window: try each frame as keyframe → select highest total confidence → define world coordinate。

### Reservoir + retrieval
Bounded reservoir sampling of registered frames。Retrieval selects top-k best-correlated (visual similarity + baseline suitability)。

### Points embedding
I2P pointmaps → geometric tokens + visual tokens → joint appearance+geometry token。

### Decoders
Registration decoder: local → global。Scene decoder: refine geometry without changing coordinate。

### L2W loss
No canonical normalization — output scale must align with existing scene frames。

---

## 7. 实验表现

### 7-Scenes
| Method | Acc | Comp | FPS |
|---|---|---|---|
| DUSt3R | 2.19 | 3.24 | 1 |
| Spann3R | 3.42 | 2.41 | 50 |
| **SLAM3R** | **2.13** | **2.34** | **25** |

### Replica
| Method | Acc | Comp | FPS |
|---|---|---|---|
| DROID-SLAM | 5.50 | 12.29 | 20 |
| GO-SLAM | 3.81 | 4.79 | 8 |
| Spann3R | 10.32 | 13.33 | 50 |
| **SLAM3R** | **3.57** | **2.62** | **24** |

---

## 8. 强项

1. **RGB-only real-time dense reconstruction** — 20+ FPS, no depth/pose
2. **不显式求解 camera parameters** — feed-forward, 无 iterative BA
3. **I2P 比 pairwise DUSt3R 更适合视频** — multi-view cross-attention
4. **L2W 避免 DUSt3R 昂贵 global alignment**
5. **Retrieval 增强长期参考** — implicit relocalization

---

## 9. 局限

1. **无显式 BA / pose graph** — large-scale 仍 drift
2. **不是 tracking-first SLAM** — 无 explicit pose tracking / loop
3. **无 DPVO/DROID temporal residual trace** — 无 patch lifecycle / BA signal
4. **Pointmap 仍不是 GS-ready geometry** — 需 certification
5. **不能替代 DPVO/DROID temporal backbone**

---

## 10. 对 SkelGS-SLAM 的启发

### 强 geometry proposal source
SLAM3R pointmaps → CandidateGeometry → compare with DPVO/MASt3R/depth-normal → coherence check。

### 不能替代 DPVO temporal backbone
SLAM3R 无 patch residual/confidence/lifecycle。主 tracking backbone 仍应是 DPVO/DROID。

### I2P window design → packet 启发
Multi-frame local evidence → candidate packet。但 packet 还需 certification。

### L2W → CoVersionedGeometryPacket
Local → global registration 和 Candidate → Certified 有结构相似性，但需加 explicit checks。

### Retrieval → submap/anchor reference selection
不只是最近帧，而是从历史中检索最佳参考。

### 支持"proposal ≠ certificate" 判断
SLAM3R 自己承认无 BA 会 drift → proposal 不能直接当 truth。

---

## 11. 建议系统位置

```
RGB → DPVO/DROID (temporal)
     → MASt3R (pairwise witness)
     → SLAM3R (multi-frame dense proposal)
     → depth-normal predictor (metric surface)
     → global correction (scale/pose/submap)
     → CertifiedGeometryPacket (fuse + gate)
     → GS backend (anchor ChildGS + gated feedback)
```

---

## 12. 最终定位

| 系统 | 定位 | 对 SkelGS-SLAM 价值 |
|---|---|---|
| **SLAM3R** | **RGB-only dense reconstruction** | **dense proposal / learned reg / retrieval** |
| DUSt3R | pairwise pointmap prior | foundation |
| Spann3R | spatial memory | memory proposal |
| DPVO/DROID | temporal optimization | temporal backbone |
| GO-SLAM | global correction | global consistency |
| GS-SLAM variants | GS backend | map reference |

---

## Related extracted notes

### Concepts
- [I2P-Local-Reconstruction](I2P-Local-Reconstruction) — sliding-window multi-frame pointmap reconstruction
- [L2W-Global-Registration](L2W-Global-Registration) — learned local-to-world pointmap registration

### Methods
- [SLAM3R-Architecture](SLAM3R-Architecture) — I2P + L2W + retrieval + reservoir pipeline
- [Retrieval-Guided-Registration](Retrieval-Guided-Registration) — historical reference selection for global registration

### Project
- [SkelGS-SLAM: SLAM3R 分析](10_Projects/SkelGS-SLAM/decision-log)
