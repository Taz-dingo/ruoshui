# Iteration 001 Execution Checklist

## 目标

把 `Iteration 001` 从“有记录模板”推进到“有可执行命令骨架”，并明确本机当前还缺哪些工具。

## 本机当前状态

截至 `2026-03-18`，本机命令检查结果如下：

- `colmap`：未安装
- `ns-process-data`：未安装
- `ns-train`：未安装
- `ffmpeg`：未安装
- `uv`：已安装
- `python3`：已安装

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

在真正开始实验前，至少还缺：

- `COLMAP`
- `Nerfstudio`
- `FFmpeg`

## 下一步建议

最小下一步建议是：

1. 确认准备用哪条工具链开始（推荐先 `Nerfstudio + COLMAP`）
2. 安装缺失依赖
3. 把实际安装方式和版本写回 `docs/iterations/iteration-001-validation.md`
4. 开始跑第一轮处理命令

## 参考

- Nerfstudio custom data docs: [docs.nerf.studio/quickstart/custom_dataset.html](https://docs.nerf.studio/quickstart/custom_dataset.html)
- Nerfstudio Splatfacto docs: [docs.nerf.studio/nerfology/methods/splat.html](https://docs.nerf.studio/nerfology/methods/splat.html)
- COLMAP CLI docs: [colmap.github.io/cli.html](https://colmap.github.io/cli.html)
