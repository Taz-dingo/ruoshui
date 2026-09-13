# 文档索引

GitHub 仓库是 Ruoshui 项目状态、任务、产品边界与工程记录的**唯一事实源（Single Source of Truth）**。Notion 只保留项目入口、简介和到这些文档的链接，不重复维护任务清单或状态快照。

## 默认入口

- [`project/state.md`](project/state.md)：当前已经成立的事实与尚未解决的事实；默认恢复入口。
- [`project/tasks.md`](project/tasks.md)：当前执行优先级与 checklist。
- [`project/spec.md`](project/spec.md)：稳定产品定义、范围与边界。
- [`project/plan.md`](project/plan.md)：阶段结构，不重复维护细粒度任务。
- [`project/engineering-memory.md`](project/engineering-memory.md)：deploy / debug / 验证链路的工程记忆。

## 维护原则

- 一条信息只在一个权威文档里维护，其他地方使用链接引用。
- `state.md` 不维护 TODO；`tasks.md` 不复制项目背景；`plan.md` 不复制 checklist；`spec.md` 只保留稳定边界。
- Notion 不维护 GitHub 文档的镜像文本，避免双向同步和内容漂移。
- 已结束的训练、素材 PoC 和历史交付记录进入 archive，默认不加载。

## 按需文档

- `project/**` focused docs：仅当前改动域命中时再读。
- [`archive/README.md`](archive/README.md)：已结束的训练和交付记录；默认不要加载。
