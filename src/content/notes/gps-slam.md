---
title: "GPS-SLAM: Gaussian-Plus-SDF SLAM — High-fidelity 3D Reconstruction at 150+ fps"
date: 2026-06-08
updated: 2026-06-08
summary: GPS-SLAM 是一个 RGB-D 超高速重建系统。核心拆成两层：SDF 负责主体几何、基础颜色和 tracking；3D Gaussians 只负责 SDF 表达不足的高频外观残差。不是全场景 Gaussian SLAM；Gaussian = residual appearance overlay。150+ FPS。

tags:
  - SLAM
  - dense-SLAM
  - RGB-D
  - 3DGS
  - Hybrid-Representation
  - Online
  - GS-SLAM
relatedNotes: []
category: 文献笔记
importance: 2
draft: false
type: note
---

# GPS-SLAM: Gaussian-Plus-SDF SLAM — High-fidelity 3D Reconstruction at 150+ fps

> CVPR 2025. 论文整理笔记。
> 📄 [PDF 原文](GPS-SLAM.pdf)

## 0. 一句话结论

GPS-SLAM 是一个 RGB-D 超高速重建系统。核心拆成两层：SDF 负责主体几何、基础颜色和 tracking；3D Gaussians 只负责 SDF 表达不足的高频外观残差。不是全场景 Gaussian SLAM；Gaussian = residual appearance overlay。150+ FPS。

---

## 1. 系统定位

RGB-D dense reconstruction/mapping + SDF fusion + residual Gaussian appearance refinement + ICP/SDF tracking。不是 monocular / learned VO / full Gaussian map-centric / offline GS。

---

## 2. 核心问题

Gaussian-based RGB-D SLAM（SplaTAM/GS-SLAM）<20 FPS，需要大量 Gaussians + iterations。SDF fusion 极快（~0.1ms/frame）但颜色 blur/holes/artifacts。GPS-SLAM 折中：SDF 做主体几何和基础颜色，Gaussian 只修颜色残差。

---

## 3. Input/Output

### Input
RGB-D stream + camera intrinsics

### Output
Camera trajectory, colorized SDF volume, sparse residual 3D Gaussians, rendered RGB, SDF depth/mesh, high-fidelity reconstruction。

---

## 4. 核心表示：Gaussian-Plus-SDF

### SDF 层
Truncated signed distance + initial RGB on surface voxels。用途：depth fusion + surface + base color + tracking + depth-culling。

### Gaussian 层
Sparse residual Gaussian radiance field。只在 SDF color error 高/高频细节区域添加。~50% fewer Gaussians, ~75% fewer optimization iterations。

---

## 5. Rendering：两阶段

### Stage 1: SDF raycasting → SDF depth + color maps

### Stage 2: Depth-culling Gaussian splatting
Gaussians splat with SDF depth test：太远截断，接近 surface 则叠加残差颜色。Order-independent blending（无排序）。

### Final color = SDF color + Gaussian residual weighted correction。

---

## 6. 系统流程

```
RGB-D frame → SDF tracking (ICP)
→ SDF integration (depth + RGB → hash table)
→ Gaussian management (high color-error regions → add/remove)
→ Gaussian optimization (photometric, residual only)
→ SDF raycast + Gaussian residual splatting → rendering
```

---

## 7. Tracking：SDF-based alignment / ICP

非 Gaussian render tracking。Replica ATE 0.17 cm (ICP-level)。TUM 3.08 cm（depth noise 敏感）。

---

## 8. 实验表现

### Runtime
- Replica: 250+ FPS
- Azure Kinect: 150+ FPS
- ScanNet++: ~79 FPS

### Replica office0 detail
| Method | FPS | Gaussians | PSNR |
|---|---|---|---|
| RTG-SLAM | 17.15 | 268,779 | 38.62 |
| GS-ICP SLAM | 174.20 | 1,679,211 | 37.33 |
| **GPS-SLAM** | **380.72** | **137,200** | **41.15** |

### Novel view (ScanNet++)
GPS-SLAM: PSNR 25.81, SSIM 0.872 — comparable quality, significantly faster。

---

## 9. 强项

1. **速度极强** — 150–380 FPS，比 Gaussian RGB-D SLAM 快一个数量级
2. **分工清晰** — SDF: geometry+base color+tracking; Gaussian: residual appearance only
3. **Gaussian 数量少** — Replica office0 137k vs GS-ICP 1.67M
4. **避免 GS 几何伪影** — 几何主体是 SDF
5. **"GS = residual layer on certified geometry" — 完全支持你的方向**

---

## 10. 局限

1. **依赖 RGB-D** — 非 monocular
2. **Tracking 对 depth noise 敏感** — TUM ATE 3.08 cm
3. **Geometry 来自 SDF，不来自 Gaussian**
4. **不处理动态场景**
5. **无 global loop / BA**

---

## 11. 对 SkelGS-SLAM 的启发

### ★ 最重要：GS 不一定是主几何
GPS-SLAM 从系统层面支持你的"geometry first, GS after certification"。

### CertifiedGeometry-Plus-GS
```
RGB → DPVO/MASt3R/SLAM3R proposals
→ CertifiedGeometryPacket / CertifiedAnchorField
→ Gaussian residual appearance layer only
```
比 "predicted depth → full Gaussian map" 安全很多。

### ChildGS 可重新定义成 residual GS
- 几何型 ChildGS: 表达局部 surface
- **外观型 ChildGS: 只在 certified surface 上修正 color residual** ← GPS-SLAM 路线

### SDF depth-culling → free-space / surface-band gate
CertifiedGeometryPacket depth → cull/downweight inconsistent Gaussians。

### Gaussian birth = residual error trigger on certified geometry
if certified surface exists + color residual high + geometry stable + local GS density low → add residual ChildGS。不是 arbitrary render residual → birth。

---

## 12. 最终定位

| 系统 | 定位 | 对 SkelGS-SLAM 价值 |
|---|---|---|
| **GPS-SLAM** | **SDF + residual GS** | **geometry-first / GS-as-residual 设计参考** |
| GS-SDF | LiDAR→NSDF→GS init+shape reg | geometry teacher |
| ESLAM/GO-SLAM | SDF/neural field | surface/free-space |
| SplaTAM/MonoGS/GS-SLAM | full Gaussian map | GS baseline |
| MGS-SLAM | DPVO+MVS+GS | monocular scale closure |
| VPGS/OG-Mapping/Scaffold-GS | anchor/voxel GS | ChildGS structure |

---

## Related extracted notes

### Concepts
- [Residual-GS-Layer](Residual-GS-Layer) — Gaussian as appearance residual on certified geometry
- [Geometry-First-GS-Pipeline](Geometry-First-GS-Pipeline) — geometry teacher before GS layer

### Methods
- [GPS-SLAM-Architecture](GPS-SLAM-Architecture) — SDF + residual GS pipeline
- [Certified-GS-Residual](Certified-GS-Residual) — translating residual GS design to monocular setting

### Project
- [SkelGS-SLAM: GPS-SLAM 分析](10_Projects/SkelGS-SLAM/decision-log)
