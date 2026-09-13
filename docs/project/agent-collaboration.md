# Agent 协作契约

最后更新：`2026-09-06`

本文件定义若水在人机协同开发中的长期工作方式。目标不是依赖 Agent “自觉保持质量”，而是让仓库本身逐步成为约束系统：**人负责意图、边界、取舍与验收；Agent 负责高吞吐实现；类型、测试、脚本和 CI 负责把关键约束变成事实。**

这套做法参考 DSH 的 Agent-heavy 工程实践，但采用适合个人项目的 DSH-lite，不追求额外 ceremony。

## 1. Authority map：一个事实只有一个 owner

- `AGENTS.md`：长期 standing orders 和文档路由，不写百科全书。
- `state.md`：当前已经成立 / 尚未成立的事实。
- `tasks.md`：当前执行顺序与 checklist。
- `spec.md`：稳定产品边界与产品 contract。
- `plan.md`：阶段结构。
- `design.md`：viewer 的视觉与交互设计 contract。
- `engineering-memory.md`：只放会改变 deploy / debug / 验证默认做法的短规则。
- `docs/decisions/**`：只记录真正重要的设计理由、备选方案与 trade-off。
- source / schema / tests / scripts：可执行事实；如果和 prose 冲突，应先判断哪一侧已经过期并同步 owner，而不是复制第二份解释。

禁止为了“让 Agent 看得到”而把同一事实复制到多个 active docs。其他文档引用 owner 即可。

## 2. 人和 Agent 的职责边界

### 人负责

- 定义问题、产品意图、不能破坏的 invariant 和验收结果。
- 对跨模块架构、用户可见行为、数据不可逆变化做最终取舍。
- 对需要主观判断的 UI / 视觉 / 内容质量做验收。

### Agent 负责

- 在既定 contract 内选择实现细节，不自行扩大产品范围或改变架构 contract。
- 优先复用已有 seam / primitive / domain model；新增抽象必须有当前真实 consumer。
- 修改事实时同步最小 owner doc；重要 rationale 变化时新增或更新 decision record。
- 主动把重复出现、可机械判断的重要规则转成类型、schema、test 或 script gate。

## 3. Soft rule → hard gate

一条规则只要同时满足“重要”且“可机械判断”，就不应长期只存在于 Prompt / 文档里。

优先级：

1. 类型 / schema 让非法状态难以表达；
2. unit / integration test 验证局部行为；
3. verifier script 检查项目特有结构或 freshness；
4. root package script 暴露稳定 gate；
5. CI 执行 exhaustive gates。

本地开发只跑覆盖当前修改面的最小 gate，保持反馈快速；合并前再跑完整 gate。

Content & Community v1 中应优先机械化的 invariant 包括：Story 正文和图片至少一项非空、最多 12 张图、v1 最多一个位置、公开写入必须绑定 User、普通读取路径不得隐式创建业务数据、Revision 审核通过前旧 Published Revision 继续生效。

## 4. 每次非平凡改动的闭环

### 开始前

1. 读 `state.md`；需要执行顺序再读 `tasks.md`。
2. 确认本次修改的 owner doc、invariant 与明确验收结果。
3. UI 读 `design.md`；跨模块 / 数据模型重大决策读相关 decision。
4. 先找已有 extension point，避免在核心路径旁边再造一套平行实现。

### 实现中

1. 只解决当前 slice，不顺手扩 scope。
2. 新增重要 invariant 时同时判断能否机械化。
3. 真实状态必须有明确 owner；避免隐式全局状态、重复缓存和不可重建状态。
4. 只跑最小相关验证，快速循环。

### 合并前

1. 跑当前 slice 的完整相关 gates。
2. 用户可见流程至少走一次真实入口 / 真实副作用的 smoke 或 e2e，不接受“Agent 说已经成功”作为证据。
3. 检查 duplicate truth、dead code、旧 fallback、实验产物和未声明 limitation。
4. 更新最小 owner doc；若 trade-off 改变则同步 decision。

### 合并后

已落地的 active docs 只描述当前真实系统。完全被替代的方案移入 archive / history，不能继续冒充 current authority。

## 5. 防腐规则

- **No speculative abstraction**：没有当前 consumer，不为“以后也许会用”增加 framework、配置或兼容层。
- **One path by default**：同一生产能力默认只有一个主路径；实验 / fallback 必须明确标记，并在不再需要时删除或归档。
- **Enforce at the real boundary**：权限、状态转换、数据约束在真正做决定的 service / schema 层执行，不依赖 UI 隐藏按钮。
- **Reconstructible state**：重要状态能从持久数据与显式配置重建，不依赖某次 Agent session 或浏览器里不可见的隐式上下文。
- **Real-world verification**：核心 journey 验真实页面、真实 API / D1 / R2 副作用和生产入口；mock 只用于昂贵或非确定性外部边界。
- **Small authority surface**：standing orders 保持短；解释放 owner docs，rationale 放 decisions，历史放 archive。

## 6. Decision 何时值得记录

满足任一条件时写 `docs/decisions/YYYY-MM-DD-<topic>.md`：

- 会影响多个模块或长期数据模型；
- 有两个以上都合理、未来很可能被重新争论的方案；
- 存在明确被拒绝的方案，需要阻止未来 Agent 重试；
- 改动不可逆或迁移成本明显。

Decision 至少记录：Context、Decision、Invariants、Alternatives considered、Consequences、Deferred work。小的实现选择不要写 ADR。

## 7. 当前参考

DSH 中最值得若水长期借鉴的不是具体目录，而是三件事：**mechanical gates over prose、one fact one home、保存为什么而不只保存现在是什么**。若水规模更小，因此只采用能显著降低 Agent 漂移和重复劳动的最小集合。
