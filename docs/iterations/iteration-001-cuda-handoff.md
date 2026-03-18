# Iteration 001 CUDA Handoff

## 目的

让下一台具备 `NVIDIA CUDA` 的机器可以不重新摸索上下文，直接接着跑 `Iteration 001` 的首轮 `splatfacto` 训练。

## 当前结论

`Iteration 001` 已经完成首轮位姿恢复验证，结果明显通过“值得继续训练”的门槛：

- `PoC 001` 图片总数：`180`
- `COLMAP` 成功恢复位姿：`179 / 180`
- 位姿恢复覆盖率：`99.44%`
- 已生成 `transforms.json`
- 已生成 `sparse_pc.ply`
- 当前唯一实质阻塞：本机是 `Apple Silicon + MPS`，`gsplat` 训练仍需要 `CUDA`

因此，下一台机器的任务不是重做素材处理，而是直接继续训练。

## 下一台机器不需要重做的事情

以下内容已经完成，不要在 `NVIDIA` 机器上重复跑，除非输入数据损坏：

- 不需要重新盘点 `assets/raw`
- 不需要重新选择 `PoC 001`
- 不需要重新物化 `assets/staging/poc-001/images`
- 不需要重新跑 `ns-process-data`
- 不需要重新跑 `COLMAP`

下一台机器应直接复用已生成的数据集目录：`outputs/iteration-001/processed`

## 必须带过去的内容

最小必带目录：

- `outputs/iteration-001/processed`

建议一并带过去的上下文文件：

- `docs/project/state.md`
- `docs/project/tasks.md`
- `docs/iterations/iteration-001-execution.md`
- `docs/iterations/iteration-001-validation.md`
- 本文件 `docs/iterations/iteration-001-cuda-handoff.md`

关键产物确认：

- `outputs/iteration-001/processed/transforms.json`
- `outputs/iteration-001/processed/sparse_pc.ply`
- `outputs/iteration-001/processed/colmap/sparse/0`

## 推荐迁移方式

如果下一台机器也有这个仓库，最稳妥的做法是同步整个仓库，但至少保证 `outputs/iteration-001/processed` 被同步。

例如可用类似下面的方式迁移：

```bash
rsync -av --progress \
  outputs/iteration-001/processed \
  <cuda-machine>:/path/to/ruoshui/outputs/iteration-001/
```

如果是全仓库迁移，可直接同步仓库目录，再在新机器上重新创建独立虚拟环境。

## NVIDIA 机器的推荐前提

建议在新机器上满足以下条件：

- 已安装 `Python 3.11`
- 已安装 `uv`
- `torch.cuda.is_available()` 返回 `True`
- 有可用的 `NVIDIA` 驱动与 `CUDA` 运行环境

注意：

- 不要直接复制本机的 `./.venv-iteration001`
- 建议在 `NVIDIA` 机器上重新创建一个干净环境
- 当前仓库里的本地兼容补丁主要是为 `Apple Silicon` 过渡验证服务；在干净的 `CUDA` 环境里，优先先试纯净安装

## NVIDIA 机器的最短执行步骤

假设仓库路径仍为 `ruoshui`：

```bash
cd /path/to/ruoshui
uv venv .venv-iteration001 --python 3.11
uv pip install --python .venv-iteration001/bin/python --prerelease=allow 'nerfstudio==1.1.5'
```

先确认 CUDA 可用：

```bash
.venv-iteration001/bin/python - <<'PY'
import torch
print('torch', torch.__version__)
print('cuda', torch.cuda.is_available())
print('device_count', torch.cuda.device_count())
PY
```

期望至少看到：

- `cuda True`
- `device_count >= 1`

然后确认输入已在位：

```bash
test -f outputs/iteration-001/processed/transforms.json && echo transforms-ok
test -f outputs/iteration-001/processed/sparse_pc.ply && echo sparse-ply-ok
test -d outputs/iteration-001/processed/colmap/sparse/0 && echo sparse-dir-ok
```

最后直接启动训练：

```bash
.venv-iteration001/bin/ns-train splatfacto \
  --output-dir outputs/iteration-001/train \
  --vis tensorboard \
  nerfstudio-data \
  --data outputs/iteration-001/processed
```

## 预期训练行为

正常情况下，训练应当：

1. 读取 `outputs/iteration-001/processed/transforms.json`
2. 读取 `outputs/iteration-001/processed/sparse_pc.ply`
3. 创建新的训练目录，例如：
   - `outputs/iteration-001/train/unnamed/splatfacto/<timestamp>/config.yml`
   - `outputs/iteration-001/train/unnamed/splatfacto/<timestamp>/events.out.tfevents...`
   - `outputs/iteration-001/train/unnamed/splatfacto/<timestamp>/nerfstudio_models/`
4. 进入真正的训练 step，而不是在初始化时报错

## 成功标准

在 `CUDA` 机器上，本轮至少应达到以下任一条：

- `splatfacto` 成功开始迭代并持续输出 step 日志
- 生成首个 checkpoint
- 生成可继续评估的训练目录与中间产物

## 如果又失败，先看这几个点

### 1. `CUDA` 不可用

先确认：

```bash
.venv-iteration001/bin/python - <<'PY'
import torch
print(torch.cuda.is_available())
print(torch.cuda.device_count())
PY
```

### 2. 输入目录不完整

确认这几个文件存在：

```bash
ls outputs/iteration-001/processed/transforms.json
ls outputs/iteration-001/processed/sparse_pc.ply
ls outputs/iteration-001/processed/colmap/sparse/0
```

### 3. 又回到旧版 `nerfstudio`

确认版本：

```bash
.venv-iteration001/bin/python - <<'PY'
import importlib.metadata as m
print(m.version('nerfstudio'))
PY
```

期望版本：`1.1.5`

## 明确交接句

如果只看一句话，下一台 `NVIDIA CUDA` 机器要做的是：

- 复用 `outputs/iteration-001/processed`
- 新建干净 `Python 3.11` 环境
- 安装 `nerfstudio==1.1.5`
- 直接运行 `ns-train splatfacto ... nerfstudio-data --data outputs/iteration-001/processed`

