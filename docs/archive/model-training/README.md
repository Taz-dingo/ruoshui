# 模型训练阶段归档

本目录记录若水广场从原始航拍素材验证到 SOG Web 交付路线收敛的历史过程。训练与算法筛选已经结束；当前项目直接使用已验收的 `assets/hhuc.sog` 开展业务开发。

## 资产与 PoC

- [`assets/asset-inventory.md`](assets/asset-inventory.md)：原始素材盘点。
- [`assets/poc-001.md`](assets/poc-001.md)：首轮 PoC 抽样方案。
- [`assets/3dgs-experiment-path.md`](assets/3dgs-experiment-path.md)：首条 3DGS 验证链路。
- [`assets/asset-validation-template.md`](assets/asset-validation-template.md)：实验记录模板。
- [`assets/raw-asset-policy.md`](assets/raw-asset-policy.md)：原始素材命名与派生策略。

## 训练与算法筛选

- [`iterations/iteration-001.md`](iterations/iteration-001.md)：Nerfstudio/splatfacto 可行性验证。
  - [`执行清单`](iterations/iteration-001-execution.md)
  - [`真实验证记录`](iterations/iteration-001-validation.md)
  - [`CUDA 交接`](iterations/iteration-001-cuda-handoff.md)
- [`iterations/iteration-002.md`](iterations/iteration-002.md)：GaussianSplats3D 浏览器入口验证。
- [`iterations/iteration-003.md`](iterations/iteration-003.md)：Scaffold-GS、Octree-GS、CityGaussian 等路线筛选。
  - [`访问检查`](iterations/iteration-003-access-check.md)
  - [`算法筛选`](iterations/iteration-003-algorithm-screening.md)
  - [`清理扫描`](iterations/iteration-003-cleanup-scan.md)
  - [`Scaffold-GS 入口`](iterations/iteration-003-scaffoldgs-entry.md)
  - [`Octree-GS 入口`](iterations/iteration-003-octreegs-entry.md)
  - [`Octree-GS 参数检查`](iterations/iteration-003-octreegs-parameter-check.md)
  - [`Octree-GS baseline`](iterations/iteration-003-octreegs-baseline.md)
  - [`Octree-GS LOD 调优`](iterations/iteration-003-octreegs-lod-tuning.md)
  - [`CityGaussian 入口`](iterations/iteration-003-citygaussian-entry.md)

## 已停止的交付实验

- [`iterations/iteration-005-progressive-runtime.md`](iterations/iteration-005-progressive-runtime.md)：渐进式运行时实验。该路线已停止投入，正式 viewer 保持稳定单次加载。

## 已删除的执行入口

历史根目录 `scripts/`、`configs/` 和 `experiments/` 已删除，避免在业务开发阶段被误当作可维护主线。`data/`、`outputs/`、`assets/raw/` 与正式 SOG 资产仍保留，可用于审计历史结果。

归档中的旧命令和路径用于记录当时环境，不保证现在仍可执行。若未来明确重启训练，应新建独立方案和工具链，不要直接复活旧脚本。
