---
title: "ContextGS: Compact 3D Gaussian Splatting with Anchor Level Context Model"
date: 2026-06-08
updated: 2026-06-08
summary: ContextGS 是一个 3D Gaussian Splatting 压缩方法。构建在 Scaffold-GS 上，在 anchor level 做自回归上下文建模：先编码 coarse anchors，再用已编码的 coarse anchors 预测 finer anchors 的概率分布，然后做 entropy coding。不是 SLAM / tracking / geometry certification / online mapping。

tags:
  - 3DGS
  - Anchor-Structured
  - Compression
  - GS-SLAM
relatedNotes: []
category: 文献笔记
importance: 2
draft: false
type: note
---

# ContextGS: Compact 3D Gaussian Splatting with Anchor Level Context Model

> NeurIPS 2024. 论文整理笔记。
> 📄 [PDF 原文](ContextGS.pdf)

## 0. 一句话结论

ContextGS 是一个 3D Gaussian Splatting 压缩方法。构建在 Scaffold-GS 上，在 anchor level 做自回归上下文建模：先编码 coarse anchors，再用已编码的 coarse anchors 预测 finer anchors 的概率分布，然后做 entropy coding。不是 SLAM / tracking / geometry certification / online mapping。

定位：Scaffold-GS 表示上的压缩层。

---

## 1. 核心问题

3DGS 高质量实时渲染，但模型巨大（BungeeNeRF 平均 ~1.6 GB）。Scaffold-GS 通过 anchor 减少 Gaussian-level 冗余，但 anchor 之间仍有空间冗余。ContextGS：如何进一步压缩 anchor-level redundancy？

方案：hierarchical anchor levels + autoregressive context model + hyperprior feature + entropy coding。

---

## 2. 与 Scaffold-GS 关系

Scaffold-GS: anchor → Gaussian（解决 Gaussian-level 冗余）
ContextGS: anchors 编码压缩（解决 anchor-level 冗余）

Scaffold-GS 是结构化渲染表示；ContextGS 是该表示的压缩编码器。解码后渲染与 Scaffold-GS 一致，无额外开销。

---

## 3. 核心机制

### Anchor 分层
Level 0 (coarsest) → Level 1 → Level 2 (finest)。默认 3 levels。先编码 coarse，再编码 fine（coarse 作为 context）。

### Bottom-up partition
不同 voxel size 量化 anchors → 选同 voxel 内 index 最小 anchor 作 representative → 逐级得到 L0/L1/L2。自动确定 scale 避免手调。

### Anchor-level autoregressive context model
已解码 coarse anchors → 预测 finer anchor feature 分布 → 更省 bit。Context: 相邻已解码 anchor 的 feature + scaling → level-specific MLP → 预测当前 anchor feature 分布参数。

### Hyperprior feature
低维 quantized hyperprior vector per anchor。用于 coarsest level（无更粗 context）+ 辅助 finer level 预测。Quantized + factorized density model coding。

### Entropy coding training
L = rendering loss + entropy coding loss + masking/regularization。Rate-distortion trade-off。

---

## 4. 测试/解码流程

Bitstream → decode hyperprior → decode L0 anchors → context → decode L1 → context → decode L2 → full anchor features → Scaffold-GS render。渲染零额外开销。

---

## 5. 实验表现

### 压缩比
| Dataset | 3DGS | Scaffold-GS | ContextGS low | ContextGS high |
|---|---|---|---|---|
| Mip-NeRF360 | 744.7 MB | 253.9 MB | **12.68 MB** | 18.41 MB |
| T&T | 431.0 MB | 86.5 MB | **7.05 MB** | 11.80 MB |
| DeepBlend | 663.9 MB | 66.0 MB | **3.45 MB** | 6.60 MB |
| BungeeNeRF | 1616 MB | 183.0 MB | **14.00 MB** | 21.80 MB |

PSNR 相当或略高（压缩约束可能减少 overfitting）。

### 消融 (BungeeNeRF)
- Scaffold-GS: 183.0 MB, 26.62 PSNR
- w/o hyperprior+context: 18.67 MB, 26.93 PSNR
- Full: **14.00 MB, 26.90 PSNR**

---

## 6. 强项

1. **真正利用 anchor 之间空间依赖** — context model 捕捉邻域相关性
2. **压缩比极高** — >100× vs 3DGS, ~15× vs Scaffold-GS
3. **渲染零额外负担** — 解码后与 Scaffold-GS 相同
4. **约束还可能提升渲染质量** — 减少冗余/过拟合

---

## 7. 局限

1. **不是在线方法** — 不处理 tracking/pose/depth/loop/birth
2. **依赖 Scaffold-GS anchor 表示** — 非通用
3. **解决 storage 冗余，非 geometry correctness**
4. **自回归解码有编码/解压复杂度** — 适合存储分发，不适用于每帧实时

---

## 8. 对 SkelGS-SLAM 的启发

### Anchor memory 需要压缩和层级化
- Active anchors: 高精度可更新
- Mature anchors: 分层可压缩
- Frozen submap: context-coded

### Anchor 之间可以互相预测
- Compression: mature anchors → context coding
- Consistency: candidate anchor 与周围 certified anchors 完全不一致 → outlier/dynamic/depth error

### 适合放在 frozen GS submap 的 compact representation
- OnlineSubmapGS active: full precision
- FrozenSubmapGS: Scaffold/ChildGS structured
- **ArchivedSubmapGS: ContextGS-style compressed anchors**

### ContextGS anchor ≠ CertifiedAnchor
ContextGS anchor: rendering/compression unit
Your CertifiedAnchor: geometry certification unit

---

## 9. 最终定位

| 系统 | 定位 |
|---|---|
| ContextGS | mature/frozen anchor-GS map compression |
| Scaffold-GS | anchor → child Gaussian representation |
| OG-Mapping | octree anchor + online growth |
| MonoGS/SplaTAM/Gaussian-SLAM | GS-SLAM tracking/mapping |
| DPVO/DROID | temporal tracking evidence |
| MASt3R/DUSt3R/Spann3R | geometry proposal |
| **CertifiedGeometryPacket** | **your core safety layer** |

ContextGS 最值得借鉴的不是"怎么生成 anchor"，而是"anchor 成熟以后如何利用邻域上下文分层压缩"。它提示：未来的 SkelGS-SLAM 不应只有 active anchors，还应有 frozen/mature/compressed anchors。但这些 anchors 在被 ContextGS-style 压缩前，必须先经过你自己的 geometry certification。

---

## Related extracted notes

### Concepts
- [Anchor-Level-Context-Model](Anchor-Level-Context-Model) — autoregressive context model for anchor compression
- [Hierarchical-Anchor-Partition](Hierarchical-Anchor-Partition) — multi-level anchor partition for coarse-to-fine coding

### Methods
- [Anchor-Compression-for-SLAM](Anchor-Compression-for-SLAM) — translating ContextGS compression to frozen GS submap
- [Rate-Distortion-GS](Rate-Distortion-GS) — rate-distortion trade-off for GS map compression

### Project
- [SkelGS-SLAM: ContextGS 分析结论](10_Projects/SkelGS-SLAM/decision-log)
