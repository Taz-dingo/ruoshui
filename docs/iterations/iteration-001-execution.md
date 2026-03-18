# Iteration 001 Execution Checklist

## 目标

把 `Iteration 001` 从“有记录模板”推进到“有可执行命令骨架”，并明确本机当前还缺哪些工具。

## 本机当前状态

截至 `2026-03-18`，本机命令检查结果如下：

- `colmap`：已安装（`/opt/homebrew/bin/colmap`）
- `ns-process-data`：已安装（位于 `./.venv-iteration001/bin/ns-process-data`）
- `ns-train`：已安装（位于 `./.venv-iteration001/bin/ns-train`）
- `ffmpeg`：已安装（`/opt/homebrew/bin/ffmpeg`）
- `uv`：已安装
- `python3`：已安装

补充执行结果：

- `python3 scripts/materialize_poc_subset.py --mode symlink` 已成功执行
- `assets/staging/poc-001/images` 当前已物化 `180` 个唯一命名输入
- 已创建独立环境：`./.venv-iteration001`（`Python 3.11.15`）
- 已确认 `./.venv-iteration001/bin/ns-process-data` 与 `./.venv-iteration001/bin/ns-train` 可用
- 已将 `numpy` 从 `2.4.3` 降至 `1.26.4`，修复 `opencv-python 4.6.0.66` 的 ABI 冲突
- 已新增 `scripts/colmap_compat.sh`，兼容 `nerfstudio 0.3.4` 与 `COLMAP 4.0.1` 的版本号与参数差异
- 已启动首轮命令：`ns-process-data images --data assets/staging/poc-001/images --output-dir outputs/iteration-001/processed --colmap-cmd scripts/colmap_compat.sh --matching-method exhaustive`
- 当前状态：`ns-process-data` 已完成，`COLMAP` 匹配跑满 `16110` 对图像对，并成功生成 `sparse/0`、`transforms.json` 与 `sparse_pc.ply`；`splatfacto` 初始化可启动，但训练在本机因 `gsplat` 缺少 CUDA 后端而中断

## 为什么先做 staging

`PoC 001` 目前虽然只包含 `180` 张图片，但样本内部已经存在 `10` 组裸文件名重名。

因此不能直接把 `data/poc-001-files.txt` 里的图片平铺到一个训练目录里，否则文件会撞名。

当前解决方案：

- 保持 `assets/raw` 只读
- 在 `assets/staging/poc-001/images` 中生成派生输入
- 对派生输入使用连续且唯一的文件名
- 用 `assets/staging/poc-001/manifest.json` 保存映射关系

## 已准备好的命令

### 1. 物化 `PoC 001` 到 staging

```bash
python3 scripts/materialize_poc_subset.py --mode symlink
```

默认输出：

- `assets/staging/poc-001/images`
- `assets/staging/poc-001/manifest.json`

### 2. 重新生成 `PoC` 子集（如需）

```bash
python3 scripts/select_poc_subset.py --sample-size 180
```

### 3. 重新生成素材盘点（如需）

```bash
python3 scripts/analyze_assets.py
```

## 推荐实验链路

优先采用 `Nerfstudio + COLMAP` 的第一轮基础链路：

1. 准备 staging 图片目录
2. 用 `ns-process-data images` 处理图片并恢复位姿
3. 用 `ns-train splatfacto` 训练第一版 splat
4. 评估结果是否值得继续扩大素材范围

## 命令骨架

在工具安装完成后，第一轮建议先试这组命令：

```bash
python3 scripts/materialize_poc_subset.py --mode symlink
ns-process-data images --data assets/staging/poc-001/images --output-dir outputs/iteration-001/processed
ns-train splatfacto --data outputs/iteration-001/processed
```

## `COLMAP` 低层 fallback

如果后面不想先依赖 `ns-process-data`，可以直接保留一条更底层的 `COLMAP` 参考链路：

```bash
colmap feature_extractor --image_path assets/staging/poc-001/images --database_path outputs/iteration-001/colmap/database.db
colmap exhaustive_matcher --database_path outputs/iteration-001/colmap/database.db
colmap mapper --image_path assets/staging/poc-001/images --database_path outputs/iteration-001/colmap/database.db --output_path outputs/iteration-001/colmap/sparse
```

## 当前阻塞项

当前真正的阻塞已从“位姿恢复”切换为“训练硬件”：

- `ns-process-data` 已完成
- `transforms.json`、`sparse_pc.ply` 与 `colmap/sparse/0` 已生成
- 当前阻塞是本机无法提供 `gsplat` 所需的 `CUDA` 训练后端

本轮额外观察到：

- 系统默认 `python3` 为 `3.14.3`，因此后续继续沿用独立 `Python 3.11` 环境更稳妥
- `Nerfstudio` 已固定在 `./.venv-iteration001` 的 `Python 3.11` 环境内
- `Nerfstudio 0.3.4` 默认拉入的 `numpy 2.x` 与 `opencv-python 4.6.0.66` 不兼容，已通过 `numpy<2` 修复
- Homebrew 的 `COLMAP 4.0.1` 与 `nerfstudio 0.3.4` 的老接口存在差异，已通过仓库内 wrapper 兼容

## 下一步建议

最小下一步建议是：

1. 保留 `outputs/iteration-001/processed` 作为可迁移训练输入
2. 先按 `docs/iterations/iteration-001-cuda-handoff.md` 在新机器恢复环境与输入
3. 在具备 NVIDIA CUDA 的机器上运行 `ns-train splatfacto --output-dir outputs/iteration-001/train --vis tensorboard nerfstudio-data --data outputs/iteration-001/processed`
4. 观察首轮训练是否稳定收敛
5. 记录训练产物路径、耗时与主观质量

## 参考

- Nerfstudio custom data docs: [docs.nerf.studio/quickstart/custom_dataset.html](https://docs.nerf.studio/quickstart/custom_dataset.html)
- Nerfstudio Splatfacto docs: [docs.nerf.studio/nerfology/methods/splat.html](https://docs.nerf.studio/nerfology/methods/splat.html)
- COLMAP CLI docs: [colmap.github.io/cli.html](https://colmap.github.io/cli.html)
