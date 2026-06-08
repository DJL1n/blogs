---
title: "VGGT: Visual Geometry Grounded Transformer"
date: 2026-06-08
updated: 2026-06-08
summary: VGGT 是一个大规模 feed-forward 视觉几何 Transformer。输入一张到数百张同一场景图像，一次前向直接预测所有视角的 camera parameters、depth maps、point maps、3D point tracks。不是 SLAM / 不是在线系统 / 但可作为 multi-view geometry packet producer 和 SLAM 前端的上限对照。

tags:
  - GS-SLAM
relatedNotes: []
category: 文献笔记
importance: 2
draft: false
type: note
---

# VGGT: Visual Geometry Grounded Transformer

> CVPR 2025, Best Paper Award. Oxford VGG + Meta AI.
> 📄 [PDF 原文](VGGT.pdf)

## 0. 一句话结论

VGGT 是一个大规模 feed-forward 视觉几何 Transformer。输入一张到数百张同一场景图像，一次前向直接预测所有视角的 camera parameters、depth maps、point maps、3D point tracks。不是 SLAM / 不是在线系统 / 但可作为 multi-view geometry packet producer 和 SLAM 前端的上限对照。

---

## 1. 与 DUSt3R / MASt3R 的关键区别

| | MASt3R/DUSt3R | VGGT |
|---|---|---|
| 输入 | 两张图 (pairwise) | N 张图 (1 到数百) |
| 多视图关系 | pairwise → post-fusion/alignment | global attention 内部处理 |
| 输出 | pointmap + confidence | camera + depth + pointmap + track |
| 坐标系 | pairwise canonical | 第一帧为 world frame |
| 后处理 | 需要 global alignment / BA | 可选 BA |

VGGT 的本质升级：从 pairwise geometry model → multi-view scene-level geometry foundation model。

---

## 2. 架构

```
N RGB images
  → DINOv2 patchification (pretrained, 14×14 tokens)
  → + camera token (per image, 1st frame special)
  → + register token (4 per image)
  → Alternating-Attention Transformer (24 blocks)
       frame-wise self-attention (单帧内)
       global self-attention (跨帧)
  → camera head → q, t, f
  → DPT head → depth, pointmap, tracking feature
  → tracking module (CoTracker2-based)
```

### Alternating-Attention (AA)
Frame-wise self-attention 整理单帧结构；global self-attention 跨帧对齐。无 cross-attention。Ablation 证明 AA > cross-attention > pure global self-attention。

### Camera token + register token
Camera token 预测该帧 camera params。第一帧特殊 token → identity pose + world frame。Register token (4 per image) 辅助 DINOv2 patch tokens。

### Prediction heads
- Camera head: rotation quaternion + translation + FOV (principal point 假设在图像中心)
- DPT head: depth + pointmap + tracking feature + confidence/uncertainty
- Tracking module: CoTracker2，使用 VGGT backbone 的 tracking features

### 多任务联合训练
同时预测 camera / depth / pointmap / track。Ablation 证明去掉任一任务，pointmap 指标都下降。

---

## 3. 训练设置

```
Params: ~1.2B
Blocks: 24 AA
Hidden: 1024, heads: 16
Optimizer: AdamW, 160K iters
Peak LR: 2e-4, warmup 8K iters
Frames per scene: 2–24
Total frames per batch: 48
Max input: 518 px
Hardware: 64 A100, 9 days
Loss: L_camera + L_depth + L_pmap + 0.05 L_track
Depth/pmap loss: uncertainty-weighted + gradient term
```

---

## 4. 实验结果

### Camera pose (10-view, AUC@30)
| Method | Re10K | CO3Dv2 | Time |
|---|---|---|---|
| MASt3R | 76.4 | 81.8 | ~9s |
| VGGSfM v2 | 78.9 | 83.4 | ~10s |
| **VGGT feed-forward** | **85.3** | **88.2** | **~0.2s** |
| VGGT + BA | 93.5 | 91.8 | ~1.8s |

### Multi-view depth (DTU)
VGGT (no GT camera): Overall 0.382 → 接近使用 GT camera 的 MVS 方法。DUSt3R (no GT camera): 1.741。

### Point map (ETH3D)
| Method | Acc ↓ | Overall ↓ |
|---|---|---|
| MASt3R | 0.968 | 0.826 |
| VGGT depth+camera | **0.873** | **0.677** |

(Depth+camera unproject > point head)

### Image matching (ScanNet-1500)
VGGT tracking head AUC@10: 55.2 > Roma 53.4 > SuperGlue/LoFTR/etc.

### Downstream: NVS
Fine-tune VGGT backbone to NVS → GSO PSNR 30.41 (no GT camera needed)。

### Downstream: Dynamic tracking
VGGT backbone → CoTracker2 → TAP-Vid δ_vis_avg 78.9→84.0。

---

## 5. 强项

1. **Multi-view feed-forward** — 从 pairwise 到 scene-level，全局 attention 学跨帧关系
2. **Joint prediction** — camera/depth/pointmap/track 统一 backbone
3. **速度-精度平衡** — 0.2s feed-forward 已超过需要后处理优化的方法
4. **3D foundation model 潜力** — 可迁移到 NVS / dynamic tracking
5. **Depth+camera unproject > point head** — 推理时更可靠

---

## 6. 局限

1. **不是 SLAM** — 不维护长期地图 / 增量 BA / 回环 / 状态递推
2. **缺乏在线几何可解释性** — 非 factor graph，无可审计残差
3. **显存压力** — 1.2B params, global attention 在大量帧下吃显存
4. **静态场景假设** — 主任务是静态多视图重建，动态非刚体不保证
5. **Principal point 假设简化** — center only, 无畸变

---

## 7. 对 SkelGS-SLAM 的启发

### ★ Multi-view geometry packet producer
VGGT 一次输出 camera/depth/pointmap/track/confidence = unified geometry packet。和你的 CertifiedGeometryPacket 方向一致，但 VGGT 是 neural prediction，不是 online-certified。

### ★ 可用作离线 teacher / verifier
- 与 DPVO/DROID/HI-SLAM2 输出做一致性检查 (shadow evidence，不写回)
- 作为 pre-GS depth-pose-point coherence verifier
- 作为 MASt3R 路线的强对照实验

### ★ VGGT depth + camera > point head
推理时 depth+camera unproject 比直接 point head 更可靠。对你而言：VGGT depth + camera → unproject pointcloud 可能比直接 pointmap 更适合 GS birth 候选。

### ★ Tracking features → anchor evidence
跨视图 track consistency / pointmap repeatability / depth-camera consistency → anchor static_score / repeatability / depth_stability / view_support。

### 不建议：直接作为实时 SLAM 前端
缺在线状态 / 非逐帧低延迟 / 无动态场景建模。主前端保留 DPVO/DROID/HI-SLAM2。

---

## 8. 实验路线建议

Step 1: 离线跑 VGGT keyframe window (10–32 帧)
Step 2: 只评估几何 (ATE, depth scale, normal consistency)，不接 GS
Step 3: 作为 GS 初始化源 (A. current pose+depth, B. VGGT pose+depth, C. current pose+VGGT depth…)
Step 4: 作为 read-only CertifiedGeometryPacket shadow test (不写回)

---

## 9. 45 → 46 篇

VGGT 是目前最值得用来验证 multi-view geometry packet 上限的模型之一；但它解决的是 feed-forward reconstruction，不是完整 SLAM。

---

## Related extracted notes

### Concepts
- [Multi-View-Geometry-Packet](Multi-View-Geometry-Packet) — VGGT 一次输出 camera+depth+pointmap+track
- [Feed-Forward-vs-Optimization](Feed-Forward-vs-Optimization) — neural prediction vs factor graph geometry

### Methods
- [VGGT-Architecture](VGGT-Architecture) — DINOv2 + AA + DPT heads
- [VGGT-as-Geometry-Candidate](VGGT-as-Geometry-Candidate) — VGGT 作为离线 teacher / verifier / GS birth candidate

### Project
- [SkelGS-SLAM: VGGT 分析](10_Projects/SkelGS-SLAM/decision-log)
