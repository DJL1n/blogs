---
title: "Spann3R: 3D Reconstruction with Spatial Memory"
date: 2026-06-08
updated: 2026-06-08
summary: Spann3R 是一个基于 DUSt3R 范式的 dense 3D reconstruction 模型。核心是引入 external spatial memory，让每帧 pointmap 直接预测到初始帧全局坐标系，避免 DUSt3R 的 pairwise 后对齐。不是 SLAM tracking，不是 GS mapping。

tags:
  - Foundation-Model
  - Dense-Correspondence
  - Point-Cloud
  - Online
  - GS-SLAM
relatedNotes: []
category: 文献笔记
importance: 2
draft: false
type: note
---

# Spann3R: 3D Reconstruction with Spatial Memory

> 3DV 2025. 论文整理笔记。
> 📄 [PDF 原文](Spann3R.pdf)

## 0. 一句话结论

Spann3R 是一个基于 DUSt3R 范式的 dense 3D reconstruction 模型。核心是引入 external spatial memory，让每帧 pointmap 直接预测到初始帧全局坐标系，避免 DUSt3R 的 pairwise 后对齐。不是 SLAM tracking，不是 GS mapping。

定位：DUSt3R 的 sequence/memory 扩展版。

---

## 1. 核心问题

DUSt3R 的 pointmaps 是 pairwise local coordinate frame 下的预测。多视角重建需构建图像对图 + 全局 alignment。Spann3R 取消这一步：让每帧直接输出在初始帧坐标系下的 pointmap。

---

## 2. 输入与输出

### 输入
Ordered/unordered RGB image collection（无需 camera poses/intrinsics/SfM/depth/test-time optimisation）

### 输出
1. 每帧 global-coordinate pointmap（在初始帧坐标系）
2. 每帧 confidence
3. Spatial memory key/value features
4. Next-frame query feature

核心输出不是 camera trajectory，是 global-coordinate pointmaps。

---

## 3. 与 DUSt3R 关系

DUSt3R: image pair → local coordinate pointmaps → many pairs → global alignment
Spann3R: image sequence + spatial memory → each frame pointmap in common coordinate → no alignment

Spann3R = DUSt3R backbone + memory encoder + memory readout + query feature propagation。

---

## 4. 核心思想：Spatial Memory

三部分：dense working memory + sparse long-term memory + memory query mechanism。

### Memory 存什么
decoded feature + predicted pointmap → memory key/value。同时含有 geometry features 和 visual features，readout 可基于 appearance 和 distance。

### Memory query
Current frame ViT → visual feature V_t + previous query q_{t-1} → cross-attention over memory → fused feature M_t → V_t + M_t → decoders → global pointmap X_t → update memory → new q_t。

### Working memory
Recent 5 frames dense memory。新插入前与已有 key 做相似性比较，最大相似度低于阈值才插入。满了后最老的 drain 到 long-term。

### Long-term memory
Sparse。累计 attention weight，超过阈值后只保留 top-k tokens。实际 ~4000 tokens 对多数场景足够。

### Attention clipping
小 attention weights 对应远距/outlier memory values，如果不 clip 会污染 fused feature。Hard clipping + renormalize。

---

## 5. 网络结构

DUSt3R 权重初始化。ViT encoder + two intertwined decoders + lightweight memory encoder。Target decoder → memory query feature；reference decoder → pointmap + confidence。

---

## 6. Training

Confidence-aware regression loss + scale loss。Curriculum training: GPU memory 限制 → 5 帧/sequence，逐步增大 window，最后 25% epochs 减小回推理间隔。多数据集训练 (Habitat, ScanNet, ScanNet++, ARKitScenes, BlendedMVS, CO3D-v2 等)。

GitHub v1.01: 10-frame sequence, 15 个数据集混合，加入 dynamic-scene support。

---

## 7. 实验表现

### Scene-level reconstruction (7Scenes)
| Method | Acc mean | Comp mean | FPS |
|---|---|---|---|
| DUSt3R† | 0.0286 | 0.0391 | 0.78 |
| Spann3R | 0.0342 | 0.0470 | **65.49** |

Reconstruction quality competitive with DUSt3R, speed significantly faster.

### Few-view (7Scenes)
Spann3R: Acc 0.0239, Comp 0.0247, FPS 72.04

### DTU
Spann3R 弱于 DUSt3R（DTU 有 challenging trajectory 和 thin structures）。

### Drift 案例
Office-09: strong specular reflection → prediction drift（无 BA，可能 drift）。

---

## 8. 强项

1. **直接预测全局坐标 pointmap** — 大幅降低 test-time 优化成本
2. **不需要相机参数和位姿** — 继承 DUSt3R 范式
3. **Spatial memory 比 pair matching 更接近长期结构**
4. **在线速度高** — 几十 FPS reconstruction throughput
5. **Memory 设计对 anchor skeleton 启发大** — working + long-term + attention + clipping + sparsification

---

## 9. 局限

1. **没有 BA / global correction** — early error → memory 污染 → drift
2. **Loop closing 仍然困难** — accumulated errors / outliers
3. **Memory 会被 outliers 污染** — attention clipping 说明 learned memory ≠ reliable
4. **不输出显式 pose-depth optimization trace** — 无 DPVO/DROID 式 BA residual/confidence/lifecycle
5. **训练依赖大量 posed RGB-D 数据**

---

## 10. 对 SkelGS-SLAM 的启发

### Memory 设计可直接镜像到 anchor skeleton
- Working memory → recent active anchors / packet cache
- Long-term memory → mature certified anchors
- Attention query → anchor support retrieval
- Attention clipping → outlier/hard-reject gate
- Memory sparsification → only keep geometry-stable, high-support anchors

### 合理位置
Spann3R output → CandidateGeometryPacket → cross-check with DPVO + depth-normal + free-space → global correction → CertifiedGeometryPacket → GS

### 不合理位置
Spann3R pointmap → directly overwrite VideoBuffer depth/pose → directly birth Gaussian

### Memory 还不够
Spann3R 自己承认没有 BA 会 drift。你的系统需要：
- Spann3R-style memory (proposal)
- GO-SLAM-style correction (global BA)
- DPVO-style temporal evidence (lifecycle)
- GS-SLAM-style alpha feedback (gating)

---

## 11. 最终定位

| 系统 | 定位 | 对 SkelGS-SLAM 价值 |
|---|---|---|
| DPVO | temporal tracking | temporal backbone |
| MASt3R | pairwise 3D geometry | wide-baseline witness |
| **Spann3R** | **learned spatial memory reconstruction** | **memory abstraction / global pointmap proposal** |
| GO-SLAM | online global LC/BA | global correction |
| Scaffold-GS | structured GS backend | anchor-conditioned ChildGS |

Spann3R 最值得借鉴的不是"直接拿它做前端"，而是它的 memory 设计。但它没有 BA、loop correction 和 GS birth certification，只能作为 geometry proposal / memory abstraction，不能作为最终 geometry truth。

---

## Related extracted notes

### Concepts
- [Spatial-Memory-Reconstruction](Spatial-Memory-Reconstruction) — external spatial memory for global-coordinate pointmap
- [Dense-Sparse-Memory](Dense-Sparse-Memory) — working memory + long-term memory architecture

### Methods
- [Spann3R-Memory-Architecture](Spann3R-Memory-Architecture) — memory query, readout, consolidation, and clipping
- [Spatial-Memory-for-Anchor](Spatial-Memory-for-Anchor) — translating Spann3R memory design to anchor skeleton

### Project
- [SkelGS-SLAM: Spann3R 分析结论](10_Projects/SkelGS-SLAM/decision-log)
