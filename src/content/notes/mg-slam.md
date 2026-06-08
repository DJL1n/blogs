---
title: "MG-SLAM: Structure Gaussian Splatting SLAM with Manhattan World Hypothesis"
date: 2026-06-08
updated: 2026-06-08
summary: MG-SLAM 是一个 RGB-D Gaussian SLAM 系统，核心是把 Manhattan World 假设引入 3DGS-SLAM：点+线特征 tracking + line photometric loss + Manhattan 结构面补全 Gaussian map holes。不是 monocular / learned VO / offline GS。

tags:
  - SLAM
  - dense-SLAM
  - RGB-D
  - 3DGS
  - Semantic
  - Keyframe
  - GS-SLAM
relatedNotes: []
category: 文献笔记
importance: 2
draft: false
type: note
---

# MG-SLAM: Structure Gaussian Splatting SLAM with Manhattan World Hypothesis

> arXiv 2025. 论文整理笔记。
> 📄 [PDF 原文](MG-SLAM.pdf)

## 0. 一句话结论

MG-SLAM 是一个 RGB-D Gaussian SLAM 系统，核心是把 Manhattan World 假设引入 3DGS-SLAM：点+线特征 tracking + line photometric loss + Manhattan 结构面补全 Gaussian map holes。不是 monocular / learned VO / offline GS。

---

## 1. 系统定位

RGB-D dense Gaussian SLAM + feature-based tracking (point + line) + line/plane structural regularization + Manhattan World scene completion。

---

## 2. 核心问题

早期 GS-SLAM 两个短板：textureless 区域 tracking 不稳；floor/ceiling 等大平面被遮挡/视角不足，Gaussian map 出现 holes/gaps。MG-SLAM 用线段 tracking + Manhattan 结构面补全来解决。

---

## 3. Input/Output

### Input
RGB-D sequence + known intrinsics

### Output
Camera trajectory, 3D Gaussian dense map, rendered RGB/depth/semantic, completed planar surfaces, mesh。

---

## 4. 总体 Pipeline

两阶段：

### Stage 1: Online tracking + mapping
```
RGB-D → point feature + EDLines line segment + LBD matching
→ point + line reprojection/backprojection errors → pose / full BA
→ keyframe → 3D Gaussian map optimization
→ photometric + depth + line feature loss
```

### Stage 2: Structure completion + mesh
```
Extract semantic surfaces (floor/ceiling)
→ cluster 3D line directions → Manhattan calibration
→ identify rectangular surfaces → compute Gaussian density
→ detect holes → insert new Gaussians
→ PointNet++ predict colors → mesh extraction + normal reg
```

---

## 5. Tracking: 点+线特征

### Point reprojection error
RGB-D backprojection → 3D point → reproject → compare with 2D。Gaussian pyramid covariance。

### Line segment
EDLines extraction + LBD matching + RGB-D backprojection to 3D endpoints。
Two losses:
- Line reprojection: 3D line → project → fit 2D observed segment
- Line backprojection: 3D point to 3D line perpendicular distance

### Line fusion
Merge if: direction < 1°, endpoint distance < 10px, perpendicular distance < threshold。提高长线稳定性。

### Full BA
Point + line residuals + Huber cost。Levenberg-Marquardt。

---

## 6. Mapping: 3D Gaussian + line loss

### Gaussian map
Standard splatting: position, covariance, opacity, color, semantic feature。RGB/depth/semantic rendering。

### Mapping loss
Photometric + line feature photometric loss（约束线段/边缘区域重建精度）。

### Ablation (line贡献)
- 无 line: ATE 7.41 cm, PSNR 20.65
- +line: ATE 6.58, PSNR 22.89
- +fusion: ATE 5.95, PSNR 24.72
- +line photo loss: ATE 5.95, PSNR 25.69

---

## 7. Structure Optimization: 结构面补全

### Gaussian density
Surface grid point density = weighted Gaussian value + alpha。用于检测 holes。

### Map calibration
3D line directions → clustering → Manhattan axes → calibration matrix → transform Gaussian coordinates/rotation。

### Surface boundary detection
Semantic mask (floor/ceiling) + line segments + Manhattan axes → rectangular planes。

### Surface interpolation
Target plane → 2D grid → compute density → density < threshold → new Gaussian center → PointNet++ predicts color from surrounding pattern。

---

## 8. Mesh Generation

Flatten Gaussians toward surface + SDF/depth alignment + Manhattan normal regularization。

---

## 9. 强项

1. **结构线特征提升 textureless tracking** — line fusion/filtering
2. **不是只靠 GS render tracking** — feature-based 更稳更快
3. **能补全未观测平面** — Manhattan + semantic + line boundary → Gaussian completion
4. **结构先验进入 Gaussian map** — tracking + mapping + completion + mesh

---

## 10. 局限

1. **依赖 RGB-D** — 非 monocular
2. **Manhattan World 假设有边界** — 非正交/曲面/自然场景风险高
3. **补全的是"合理结构"，非真实观测** — hypothesized ≠ observed certified
4. **PointNet++ color 插值增加复杂度**
5. **不解决动态场景**

---

## 11. 对 SkelGS-SLAM 的启发

1. **结构先验可从"辅助语义"升级为"Gaussian birth 条件"** — CertifiedAnchorGroup + structure primitive → ChildGS completion
2. **线段可作为 anchor group boundary** — DPVO/MASt3R 不擅长的结构边界
3. **补全必须标记为 hypothesis** — observed certified vs hypothesized inferred
4. **Manhattan 应是 weak prior** — evidence-gated，非 hard rule
5. **支持 anchor group > isolated anchor** — surface/density/boundary/completion support

### 不建议照搬
- RGB-D backprojection assumption
- Manhattan plane completion as ground truth
- PointNet++ color interp as main pipeline
- Hypothesized Gaussians → strong tracking

---

## 12. 最终定位

| 系统 | 定位 | 对 SkelGS-SLAM 价值 |
|---|---|---|
| **MG-SLAM** | **RGB-D GS + Manhattan structure** | **line/plane completion / structure prior** |
| S3LAM | sparse semantic-plane | structural clustering |
| MGS-SLAM | monocular DPVO+MVS+GS | scale closure |
| VPGS-SLAM | large-scale GS | submap/anchor/loop |
| GS-SDF | SDF teacher + shape reg | geometry teacher |

---

## Related extracted notes

### Concepts
- [Manhattan-Structure-Prior](Manhattan-Structure-Prior) — line/plane structural prior for GS completion
- [Structure-Guided-GS-Completion](Structure-Guided-GS-Completion) — unobserved planar surface completion via structure

### Methods
- [MG-SLAM-Line-Tracking](MG-SLAM-Line-Tracking) — point + line feature tracking with line fusion/BA
- [Observed-vs-Hypothesized-Geometry](Observed-vs-Hypothesized-Geometry) — separating certified from hypothesized geometry

### Project
- [SkelGS-SLAM: MG-SLAM 分析](10_Projects/SkelGS-SLAM/decision-log)
