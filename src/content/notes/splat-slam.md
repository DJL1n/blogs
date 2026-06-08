---
title: "Splat-SLAM: Globally Optimized RGB-only SLAM with 3D Gaussians"
date: 2026-06-08
updated: 2026-06-08
summary: Splat-SLAM 是一个 RGB-only dense SLAM + 3DGS system。核心：dense optical flow + DSPO (pose/disparity/scale joint opt) + local BA / loop BA / online global BA + proxy depth + deformable 3D Gaussian map (source keyframe anchoring + active deformation when pose/depth updates)。

tags:
  - GS-SLAM
relatedNotes: []
category: 文献笔记
importance: 2
draft: false
type: note
---

# Splat-SLAM: Globally Optimized RGB-only SLAM with 3D Gaussians

> CVPR Workshops 2025, VOCVALC. 论文整理笔记。
> 📄 [PDF 原文](Splat-SLAM.pdf)

## 0. 一句话结论

Splat-SLAM 是一个 RGB-only dense SLAM + 3DGS system。核心：dense optical flow + DSPO (pose/disparity/scale joint opt) + local BA / loop BA / online global BA + proxy depth + deformable 3D Gaussian map (source keyframe anchoring + active deformation when pose/depth updates)。

对你而言是目前最重要的 RGB-only GS-SLAM 机制参考之一。

---

## 1. 解决什么问题

RGB-only 3DGS-SLAM 的根本矛盾：GS map 高质量但需要稳定 geometry；RGB-only SLAM 的 depth/scale/pose 不稳定；loop/global BA 后旧 map 需要随 pose/depth 变形。Splat-SLAM 回答：DSPO 做 geometry authority（非 GS render loss），GS map 跟随几何状态主动变形。

---

## 2. Pipeline

```
RGB → recurrent optical flow → factor graph → DSPO/DBA (pose + disparity)
→ monocular depth estimator → scale/shift align → high/low-error depth classify
→ proxy depth = reliable multi-view + aligned monocular prior
→ loop closure (flow distance) + online global BA (每 20 keyframes)
→ 3DGS map: proxy depth unproject → Gaussian init
→ Gaussian anchoring: 每个 Gaussian 绑定 source keyframe
→ pose/depth update → deform Gaussian mean/scale/rotation
→ optimize: photometric + proxy-depth + scale reg + exposure comp
```

---

## 3. 核心机制

### DSPO (Disparity/Scale/Pose Optimization)
DROID-like dense flow → factor graph → Gauss-Newton optimize pose + per-pixel disparity。DBA objective 同时用于 local / loop / global BA。

### Monocular depth scale/shift alignment
Monocular depth 只作为 biased prior。Scale/shift 与 reliable multi-view depth 对齐。DBA objective 和 monocular-depth objective 交替优化，避免尺度歧义。High-error region 才用 monocular depth 修补。

### High/low-error disparity classification
跨 keyframe 几何一致性检查 → 3D L2 distance → 分类 reliable/unreliable depth。Monocular depth 只能修补 unreliable 区域。

### Proxy depth
= reliable multi-view depth + scale/shift-aligned monocular prior。替代 MonoGS RGB-only 缺少的深度支撑。

### Deformable 3D Gaussian map ★
每个 Gaussian 绑定 anchor (source) keyframe。Keyframe pose/depth 更新后 → 投影回 anchor keyframe → 根据 proxy depth 变化沿 optical axis 更新 mean + scale + rotation。无有效 depth 或出视野 → rigid deformation。

---

## 4. 实验

### Replica RGB-only
| Method | PSNR | ATE |
|---|---|---|
| **Splat-SLAM** | **36.45** | **0.35 cm** |
| MonoGS | 31.22 | 14.54 |
| GlORIE-SLAM | 31.04 | 0.35 |

### GT depth upper bound
GT depth → PSNR 39.33, Depth L1 2.14 → 说明仍受 monocular depth 质量限制。

### Map deformation ablation
Without: PSNR 37.86, Depth L1 2.60
With: PSNR 41.20, Depth L1 2.40

### Runtime
~1.24–3.67 FPS，不是高频实时。

---

## 5. 强项

1. **Geometry authority 清楚** — DSPO/DBA，非 GS render loss
2. **Monocular depth 使用精细** — scale/shift 对齐 + high-error 才用 + 交替优化
3. **3DGS map deformation** — 关键帧 pose/depth 更新后主动变形 Gaussian
4. **Gaussian anchoring** — 每个 Gaussian 绑定 source keyframe
5. **Rendering 质量 RGB-only 中强** — Replica PSNR 36.45

---

## 6. 局限

1. 仍受 monocular depth estimator 上限限制
2. 当前实现 ~1–4 FPS
3. 默认静态，不处理动态
4. Dense optical flow 在弱纹理/动态/强光照下可能退化
5. Deformation 仍是 anchor keyframe proxy depth 近似

---

## 7. 对 SkelGS-SLAM 的启发

### ★ Geometry authority 应该在 GS 之前
Splat-SLAM 支持你：GS 不应成为 pose/depth/scale authority。前端 DSPO/DROID/DPVO 先做 joint optimization → GS 消费 + deformation。

### ★ DSPO 对你比 MASt3R raw pointmap 更像答案
Dense correspondence → factor graph → pose + disparity joint optimization → monocular depth 只作为 aligned prior。对应你的系统：DPVO/DROID/HI-SLAM2 window = pose-depth authority；depth predictor = prior/regularizer。

### ★ Gaussian anchoring = 你的 anchor provenance
Gaussian 绑定 source keyframe / pose version。可迁移：anchor 记录 birth frame/packet/pose version/depth estimate → 当 geometry packet 更新时，知道哪些 anchor 受哪些 packet 影响。

### Proxy depth → CertifiedGeometryPacket depth 逻辑
可靠 multi-view depth → authority；predictor depth → weak prior only。但你要比 Splat-SLAM 更严格（你有 normal/free-space/dynamic 检查）。

### 警惕：map deformation 你不能直接照搬
Splat-SLAM 允许 tracking update → map deformation → 但你当前 no CertifiedPacket materialization / no anchor mutation。pre-certification 阶段只记录 deformation proposal，不写回。

---

## 8. 36 → 38 篇

Splat-SLAM 是你这批论文里最值得重点吸收的单目 GS-SLAM 机制之一。

---

## Related extracted notes

### Concepts
- [Geometry-Authority-Separation](Geometry-Authority-Separation) — DSPO/DBA authority, not GS render loss
- [Deformable-GS-Map](Deformable-GS-Map) — anchor keyframe GS with pose/depth update deformation

### Methods
- [Splat-SLAM-Architecture](Splat-SLAM-Architecture) — DSPO + proxy depth + deformable 3DGS pipeline
- [Proxy-Depth-Packet](Proxy-Depth-Packet) — reliable multi-view + aligned monocular prior as depth packet

### Project
- [SkelGS-SLAM: Splat-SLAM 分析](10_Projects/SkelGS-SLAM/decision-log)
