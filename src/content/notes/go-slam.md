---
title: "GO-SLAM: Global Optimization for Consistent 3D Instant Reconstruction"
date: 2026-06-08
updated: 2026-06-08
summary: GO-SLAM 是一个 dense visual SLAM 系统，核心贡献是把 DROID 式 learned pose-depth optimization 从局部 VO/SLAM 推到在线全局优化，并同时更新 neural implicit SDF map。支持 monocular / stereo / RGB-D。

tags:
  - SLAM
  - dense-SLAM
  - monocular
  - Stereo
  - RGB-D
  - Loop-Closure
  - global-optimization
  - GS-SLAM
relatedNotes: []
category: 文献笔记
importance: 2
draft: false
type: note
---

# GO-SLAM: Global Optimization for Consistent 3D Instant Reconstruction

> ICCV 2023. 论文整理笔记。
> 📄 [PDF 原文](GO-SLAM.pdf)
> 作者：Youmin Zhang, Fabio Tosi, Stefano Mattoccia, Matteo Poggi.

## 0. 一句话结论

GO-SLAM 是一个 dense visual SLAM 系统，核心贡献是把 DROID 式 learned pose-depth optimization 从局部 VO/SLAM 推到在线全局优化，并同时更新 neural implicit SDF map。支持 monocular / stereo / RGB-D。

定位：DROID-SLAM tracking backbone 的全局一致 dense reconstruction 扩展版。

---

## 1. 核心问题

Neural implicit SLAM（iMAP, NICE-SLAM）小场景可工作，但缺少 loop closure 和 global BA → camera drift 累积 → implicit map 被错误 pose/depth 写坏 → 重建变形。DROID-SLAM pose 很强但 global BA 主要在 tracking 结束后离线做。

GO-SLAM 目标：每来新帧 → 局部 tracking → keyframe 判断 → loop closure → keyframe graph → online full BA → instant SDF mapping。

---

## 2. 输入与输出

### 输入
Monocular / Stereo / RGB-D（三种均支持）

### 输出
1. Globally optimized camera trajectory
2. Optimized keyframe dense inverse depths
3. Implicit SDF scene representation (hash grid + MLP)
4. Rendered depth / color
5. Reconstructed mesh (marching cubes)

---

## 3. 总体架构

三个并行线程：
1. **Front-end tracking**: 当前帧 tracking + keyframe 初始化 + loop closing
2. **Back-end tracking**: online full BA，全局 keyframe pose/depth refinement
3. **Instant mapping**: 根据最新 optimized pose/depth 高频更新 neural implicit SDF map

---

## 4. Front-end Tracking

基于 DROID-SLAM / RAFT-style recurrent update operator。比较新帧和 last keyframe 的 optical flow，大于阈值则提升为新 keyframe。

---

## 5. Loop Closure

基于 co-visibility / rigid flow matrix：
1. 维护 keyframe buffer
2. 构建 co-visibility matrix（local recent × all historical）
3. 选择高 co-visibility edges
4. 抑制冗余邻近 edges
5. 连续三次 loop candidate 通过 mean flow 阈值才接受

非传统 ORB BoW，而是 learned dense geometry / flow consistency → keyframe graph edge → DBA correction。

---

## 6. Dense BA Objective

延续 DROID-SLAM 的可微 dense BA。优化 keyframe poses G + dense inverse depths d，目标让 pose/depth 诱导的投影与 recurrent update operator 预测的 corrected flow 一致，用网络预测的 confidence 加权。damped Gauss-Newton 求解。

---

## 7. Back-end Full BA

Separate thread 跑 full BA。根据高 co-visibility + temporal adjacency 重建 keyframe graph，edge suppression 控制冗余。运行中持续修正历史 keyframes。

与 DROID-SLAM 关键区别：DROID global BA 更偏离线/后处理；GO-SLAM 是 online full BA。

---

## 8. Instant Mapping

### Keyframe selection
1. Latest two keyframes
2. Keyframes not yet optimized by mapping
3. Pose/depth change 最大的 top 10
4. Stratified sampled 10 historical keyframes

### Representation
Multi-resolution hash encoding (Instant-NGP) + shallow MLP:
- SDF Φ(x) + geometry feature g
- Color Ω(x) from g + SDF gradient

### Rendering
NeuS-style unbiased volume rendering：N_strat + N_imp samples per ray → SDF→opacity → accumulated RGB+depth。

---

## 9. Loss

L = λc Lc + λdep Ldep + λeik Leik + λsdf Lsdf

- Lc: rendered color vs RGB (L1)
- Ldep: rendered depth vs keyframe depth (variance-weighted)
- Leik: ‖∇SDF‖ ≈ 1 (Eikonal)
- Lsdf: near-surface SDF supervision + free-space penalty (truncation 16 cm)

消融：RGB loss alone F-score 34.64 → 加 depth/SDF/Eikonal 后 85.56。

---

## 10. 实验表现

### TUM RGB-D monocular ATE
- GO-SLAM: **0.035 m**
- DROID-SLAM: 0.038 m

### EuRoC stereo ATE
- GO-SLAM: 0.024 m
- DROID-SLAM: 0.024 m

### Replica
- ~8 FPS, max ~18 GB GPU memory
- 提供 globally dense consistent 3D reconstruction

---

## 11. 强项

1. **真正 online global consistency** — loop closure + full BA 在线运行
2. **DROID-style learned geometry 做 LC/BA** — learned dense flow/confidence，比 sparse ORB 更强
3. **Mapping 随最新 global geometry 更新** — 选择 pose/depth 变化最大的 keyframes 更新
4. **支持 monocular/stereo/RGB-D** — 比 ESLAM/Gaussian-SLAM 更泛化
5. **SDF/free-space 约束强于纯 photometric mapping** — ablation 明确

---

## 12. 局限

1. **不是 GS-SLAM** — implicit SDF，非 Gaussian map
2. **计算和显存重** — ~8 FPS, ~18 GB GPU
3. **依赖 DROID 前端** — pretrained DROID weights
4. **Monocular scale 仍需谨慎** — 不天然给 metric scale
5. **Mapping 直接信任 global BA 输出** — 不解决 GS birth 安全性认证

---

## 13. 对 SkelGS-SLAM 的启发

### 最值得借鉴
1. **Online global keyframe graph correction** — 仅 DPVO 短窗口不够，需 loop + global BA
2. **Mapping 对 pose/depth 更新敏感** — CoVersionedGeometryPacket 的系统级理由
3. **GO-SLAM mapping selection → GS packet refresh 策略**
   - latest + unoptimized + pose-difference top 10 + stratified old
4. **SDF/free-space loss → GS birth gate** — surface band / free-space 约束

### 合理路线
```
DPVO/DROID candidate geometry
→ global keyframe graph / loop correction
→ CertifiedGeometryPacket
→ GS birth / submap update
```

### 定位
GO-SLAM = global geometry correction architecture reference
DPVO = temporal tracking signal source
MASt3R = dense geometry proposal
ESLAM = SDF/free-space discipline
Gaussian-SLAM/Scaffold-GS = GS backend
CertifiedGeometryPacket/anchor skeleton = 核心研究层

---

## Related extracted notes

### Concepts
- [Online-Global-Pose-Graph](Online-Global-Pose-Graph) — online loop closure + full BA for learned dense SLAM
- [Versioned-Geometry-Update](Versioned-Geometry-Update) — mapping must respond to global pose/depth corrections

### Methods
- [GO-SLAM-Architecture](GO-SLAM-Architecture) — three parallel threads: front-end tracking, back-end tracking, instant mapping
- [Global-Correction-Mapping](Global-Correction-Mapping) — geometry-version-aware mapping refresh

### Project
- [SkelGS-SLAM: GO-SLAM 分析结论](10_Projects/SkelGS-SLAM/decision-log)
