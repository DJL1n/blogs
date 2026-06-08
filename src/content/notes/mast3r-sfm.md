---
title: "MASt3R-SfM: a Fully-Integrated Solution for Unconstrained Structure-from-Motion"
date: 2026-06-08
updated: 2026-06-08
summary: MASt3R-SfM 是基于 MASt3R pair prior 的完整离线 SfM pipeline。核心：MASt3R encoder 做 retrieval → sparse scene graph → MASt3R decoder 生成 local pointmaps/sparse matches → coarse 3D alignment → fine 2D reprojection refinement（含 pseudo-track anchor depth）。不是 online SLAM / dynamic / real-time frontend。

tags:
  - Pairs
  - GS-SLAM
relatedNotes: []
category: 文献笔记
importance: 2
draft: false
type: note
---

# MASt3R-SfM: a Fully-Integrated Solution for Unconstrained Structure-from-Motion

> 3DV 2025. 论文整理笔记。
> 📄 [PDF 原文](MASt3R-SfM.pdf)

## 0. 一句话结论

MASt3R-SfM 是基于 MASt3R pair prior 的完整离线 SfM pipeline。核心：MASt3R encoder 做 retrieval → sparse scene graph → MASt3R decoder 生成 local pointmaps/sparse matches → coarse 3D alignment → fine 2D reprojection refinement（含 pseudo-track anchor depth）。不是 online SLAM / dynamic / real-time frontend。

---

## 1. 解决什么问题

传统 SfM（keypoint → matching → RANSAC → triangulation → BA）在低重叠、低纹理、无平移、无序图像集合时易失败。MASt3R-SfM 的回答：用 MASt3R pairwise 3D prior + retrieval graph + gradient-based global alignment 替代 pipeline 脆弱的每一步。

---

## 2. 与传统 SfM 的根本区别

| | 传统 SfM | MASt3R-SfM |
|---|---|---|
| 核心 | keypoint + triangulation + RANSAC | MASt3R pairwise pointmap prior |
| 无平移 | 退化 | 可工作 |
| 少视图 | registration 易失败 | 仍然鲁棒 |
| 无序集合 | 依赖高重叠 | baseline-agnostic |

---

## 3. 总体 Pipeline

```
Unordered images
→ MASt3R encoder → ASMK retrieval (training-free)
→ Sparse scene graph (keyframe core + NN edges)
→ MASt3R decoder on selected pairs → local pointmaps + matches
→ Coarse alignment (3D matching loss, Adam)
→ Fine refinement (2D reprojection + robust loss + anchor depth)
→ Global cameras + dense-ish geometry
```

---

## 4. 核心模块

### Image retrieval (MASt3R encoder + ASMK)
复用 MASt3R encoder token features，无需额外训练 retrieval 模型。ASMK: whitening + k-means quantization + residual aggregation + binary representation。

### Scene graph
Keyframe farthest-point-sampling → keyframe complete graph → remaining frames linked to nearest keyframe + kNN。边数线性。消融: retrieval graph 几乎达到 complete graph 精度，但快 10×。

### Local reconstruction
每条 graph edge 跑 MASt3R decoder（双向）。Encoder features 已缓存，只跑 decoder。

### Constrained pointmap
Raw MASt3R pointmap 不直接当真 → 投影到 pinhole camera model（intrinsics + extrinsics + depth）。几何服从成像模型。

### Coarse alignment
Sparse reciprocal matches 上的 3D matching loss（confidence-weighted, Adam）。给后续 refinement 提供初始化 basin。

### Fine refinement (BA-like)
2D reprojection error + robust loss function。Anchor depth pseudo-track: regular grid anchor depth + fixed relative offset，深度变量减少 ~64 倍。

---

## 5. 实验

### Tanks&Temples (vs COLMAP)
| Views | MASt3R-SfM ATE | COLMAP Reg |
|---|---|---|
| 25 | 0.0336 / 100% | 44.4% |
| 50 | 0.0261 / 100% | 73.3% |
| 100 | 0.0168 / 100% | 84.0% |
| 200 | 0.0130 / 100% | 91.1% |

### ETH3D unordered (RRA@5 / RTA@5)
COLMAP 49.0/47.8 → VGGSfM 65.4/58.9 → DF-SfM 74.2/70.7 → **MASt3R-SfM 81.2/79.7**

### FlowMap splits
MASt3R-SfM ≈ FlowMap，略弱于 DROID-SLAM（但 DROID 只支持 video setting）。

### CO3Dv2 / RealEstate10K
MASt3R-SfM mAA(30) = 88.0 / 86.8 vs DUSt3R-GA 76.7 / 67.7。

### Scene graph ablation
| Graph | ATE | #Pairs | Time |
|---|---|---|---|
| Complete | 0.01256 | 39,800 | 2.2h |
| Retrieval | **0.01243** | **2,758** | **14.3min** |

Retrieval graph 精度几乎一致，快 ~10×，显存 8.4 GB vs 29.9 GB。

---

## 6. 强项

1. **绕开传统 SfM 脆弱链条** — 不依赖 RANSAC / triangulation bootstrap
2. **少视图 / 低重叠 / 无序集合优势明显**
3. **MASt3R encoder retrieval 很优雅** — training-free，接近 complete graph 精度
4. **Constrained pointmap** — 神经 pointmap → 服从相机模型
5. **Pseudo-track anchor depth** — 低维 depth 参数化，减少自由度
6. **Coarse → fine 两阶段** — coarse 提供初始化 basin，fine 提升精度

---

## 7. 局限

1. **Offline global SfM** — 不是 online SLAM（200-view ~14min）
2. **假设静态场景** — 不处理动态
3. **默认 pinhole，无畸变建模**
4. **分辨率受 MASt3R 512 长边限制**
5. **纯旋转不是完全无失败** — 少数场景仍需 fix canonical depth

---

## 8. 对 SkelGS-SLAM 的启发

### ★ Constrained pointmap
MASt3R raw pointmap → 投影到受约束的几何变量（camera + depth）。对应你的系统：foundation model prior → CertifiedGeometryPacket（受 temporal / scale / normal / free-space 约束）。

### ★ Pseudo-track anchor depth → 你的 anchor skeleton
像素绑定到局部 anchor depth，共享几何变量，不是每个像素自由修复。可比改造：anchor support cell（local depth + normal + confidence + evidence）。

### Retrieval scene graph → submap/loop 参考
不是只靠时间邻域，也不是全连接。Keyframe core + NN edges + retrieval edges。

### 不能解决的核心痛点
不是 online SLAM / 缺乏 DPVO/DROID temporal residual / 不是 geometry certification。

---

## 9. MASt3R 家族定位

| 系统 | 定位 |
|---|---|
| **DUSt3R** | pairwise pointmap foundation prior |
| **MASt3R** | DUSt3R + matching head |
| **MASt3R-SfM** | offline global SfM pipeline |
| **MASt3R-SLAM** | online monocular dense SLAM |

---

## Related extracted notes

### Concepts
- [Constrained-Pointmap](Constrained-Pointmap) — raw pointmap → camera-model-constrained geometry
- [Anchor-Depth-Parameterization](Anchor-Depth-Parameterization) — pseudo-track anchor depth reduction

### Methods
- [Gradient-Based-SfM-Pipeline](Gradient-Based-SfM-Pipeline) — MASt3R-SfM full pipeline
- [Offline-SfM-to-Online-Anchor](Offline-SfM-to-Online-Anchor) — translating SfM concepts to online anchor skeleton

### Project
- [SkelGS-SLAM: MASt3R-SfM 分析](10_Projects/SkelGS-SLAM/decision-log)
