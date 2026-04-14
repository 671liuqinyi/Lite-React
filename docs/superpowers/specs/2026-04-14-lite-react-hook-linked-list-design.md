# lite-react Hook 链表化设计

## 1. 背景

当前 `lite-react` 的 hook 存储方式是：

- 每个函数组件 Fiber 在自身节点上挂一个 `hooks?: LiteHook[]`
- `useState / useEffect / useRef` 通过 `currentHookIndex` 按数组下标读取旧 hook
- 新一轮渲染时重新创建一个 hook 数组，并把旧数组里的状态按位置拷贝过来

这套实现足够完成教学版 hook 功能，但它与 React Fiber 内部的心智模型还有明显差异：

1. React 在函数组件 Fiber 上维护的是以 `memoizedState` 为头节点的 hook 单链表，而不是数组
2. hook 的复用依赖“当前正在处理的旧 hook 指针”和“当前正在构建的新 hook 指针”前进，而不是数组下标
3. 当前 devtools 只能展示 `hooks: ["STATE", "EFFECT"]` 这一类拍平后的结果，无法体现 hook 底层其实是顺序串联的结构

这一阶段的目标，是把 hook 的底层实现升级成更接近 React 的链表模型，同时让 devtools 也能同步反映这一点。

## 2. 目标

本次设计要实现以下目标：

1. 把 Fiber 上的 hook 存储从数组改成单链表
2. 让 `useState / useEffect / useRef` 基于链表顺序读取旧 hook 并创建新 hook
3. 保持对外 API 不变
4. 保持现有调度、commit、cleanup、passive effect 时机不变
5. 更新 devtools 序列化协议，使其从链表读取 hook 信息
6. 让 devtools 面板在保留简洁性的同时，明确展示“hook 底层是链表”的教学信息

## 3. 范围

### In Scope

- `src/lite-react/fiber.ts` 的 hook 数据结构调整
- `src/lite-react/hooks.ts` 的 hook 读取与构建流程重写
- `src/lite-react/devtools.ts` 的 hook 序列化逻辑调整
- devtools 面板对 hook 信息展示的增强
- 对应单元测试与回归测试

### Out of Scope

- 修改 `useState / useEffect / useRef` 的外部 API
- 新增 `useMemo / useCallback / useReducer`
- 引入 React 那种 update queue 环形链表
- 引入 lanes、优先级、bailout 等更复杂的 Fiber 特性
- 把 Fiber 图和 hook 链表图拆成两块完全独立的可视化面板

## 4. 方案对比

### 方案 A：仅内部链表化，devtools 继续拍平成旧数组展示

优点：

- devtools 改动最小
- 对 UI 几乎没有影响

缺点：

- 教学价值不完整
- 用户看不到“链表化之后到底变了什么”

不采用。

### 方案 B：内部链表化，devtools 序列化增加链表信息，但面板仍以易读摘要为主

优点：

- 内部实现更接近 React
- devtools 能体现 hook 链表语义
- UI 复杂度可控，不会把 Fiber 图搞得太乱

缺点：

- 需要同时改 runtime 和 devtools 协议

本次采用该方案。

### 方案 C：内部链表化，并把 hook 链表节点直接画进 Mermaid 图

优点：

- 视觉上最直观

缺点：

- 图会快速变复杂
- Fiber 树与 hook 链混在一起后可读性明显下降
- 当前教学版面板空间有限

暂不采用。

## 5. 总体设计

本次改造保持现有 render/commit 主流程不变，只替换函数组件 Fiber 上 hook 的存储与遍历方式：

```text
函数组件开始渲染
  -> currentHook / workInProgressHook 指针初始化
  -> useState/useEffect/useRef 按调用顺序消费旧链表
  -> 为当前 Fiber 构造新链表
  -> commit 后按 Fiber 子树遍历 hook 链表执行 effect/cleanup
  -> devtools 从 memoizedState 链表序列化 hook 摘要
```

核心原则：

1. Fiber 树结构不改
2. hook 的外部 API 不改
3. hook 的调用顺序约束不改
4. effect 仍然只在 commit 之后执行
5. devtools 仍然显示易读摘要，但摘要来自链表遍历结果

## 6. 数据结构设计

### 6.1 Fiber 结构

当前：

```ts
hooks?: LiteHook[];
```

调整为：

```ts
memoizedState: LiteHookNode | null;
```

说明：

- `memoizedState` 命名更接近 React Fiber
- 只允许函数组件 Fiber 真正使用这条链
- host/root Fiber 也保留该字段，但默认是 `null`，方便统一访问

### 6.2 Hook 节点

新增统一的 hook 链表节点基类：

```ts
type LiteHookNodeBase = {
  kind: "STATE" | "EFFECT" | "REF";
  next: LiteHookNode | null;
};
```

在此基础上扩展出三种 hook 节点：

```ts
type LiteStateHookNode = LiteHookNodeBase & {
  kind: "STATE";
  state: unknown;
  queue: LiteStateAction[];
};

type LiteEffectHookNode = LiteHookNodeBase & {
  kind: "EFFECT";
  deps: LiteEffectDeps;
  effect: LiteEffectCallback;
  cleanup?: LiteEffectCleanup;
  shouldRun: boolean;
};

type LiteRefHookNode = LiteHookNodeBase & {
  kind: "REF";
  ref: LiteRefObject<unknown>;
};
```

最终导出统一联合类型：

```ts
type LiteHookNode = LiteStateHookNode | LiteEffectHookNode | LiteRefHookNode;
```

## 7. hooks 运行时设计

### 7.1 渲染期全局指针

当前实现依赖：

- `currentFunctionFiber`
- `currentHookIndex`

调整后改成：

- `currentFunctionFiber`: 当前正在渲染的函数组件 Fiber
- `currentHookCursor`: 指向旧 Fiber 链表中“当前要消费的 hook 节点”
- `workInProgressHookTail`: 指向当前新链表的尾节点

进入函数组件渲染时：

```ts
currentFunctionFiber = fiber;
currentHookCursor = fiber.alternate?.memoizedState ?? null;
workInProgressHookTail = null;
fiber.memoizedState = null;
```

### 7.2 新 hook 节点挂载

新增一个统一辅助函数，负责把新 hook 节点接到当前 Fiber 的链表尾部：

```ts
appendHookNode(fiber, hook)
```

行为：

- 如果 `fiber.memoizedState` 为空，当前节点成为头节点
- 否则接到 `workInProgressHookTail.next`
- 更新 `workInProgressHookTail`

### 7.3 旧 hook 节点消费

新增辅助函数：

```ts
consumeOldHook()
```

行为：

- 读取当前 `currentHookCursor`
- 返回该旧节点
- 再把 `currentHookCursor` 前移到 `oldHook.next`

这样 `useState / useEffect / useRef` 都按顺序消费旧链表，而不是通过数组下标读取。

### 7.4 useState

`useState` 的状态迁移规则保持不变：

- 第一次渲染时使用 `initialValue`
- 更新时从旧 hook 节点读取 `state`
- 再按旧节点的 `queue` 回放 action

但实现从：

- `oldHook = fiber.alternate?.hooks?.[currentHookIndex]`

改成：

- `oldHook = consumeOldHook()`

新的状态节点会被挂到新链表上。

### 7.5 useRef

`useRef` 仍保持“ref 对象跨渲染稳定”：

- 如果旧节点存在，复用旧 `ref`
- 否则创建 `{ current: initialValue }`

只不过这个旧节点不再来自数组，而是来自旧链表。

### 7.6 useEffect

`useEffect` 仍保持：

- 在 render 期只记录 effect 元信息
- 在 commit 之后统一执行
- deps 不变时跳过 effect
- effect 重跑前先调用旧 cleanup

`cleanup` 和 `shouldRun` 仍保留在 effect hook 节点上。

## 8. effect 与 cleanup 遍历设计

当前 `cleanupFiberEffects` 与 `flushPassiveEffects` 是：

- 先遍历 Fiber 子树
- 再遍历每个 Fiber 的 `hooks[]`

调整后改成：

- 先遍历 Fiber 子树
- 再遍历每个 Fiber 的 `memoizedState` 链表

新增辅助函数：

```ts
visitHookList(
  hook: LiteHookNode | null,
  visitor: (hook: LiteHookNode) => void,
)
```

这样 effect/cleanup 的逻辑基本不变，只是 hook 容器从数组变成链表。

## 9. devtools 设计

### 9.1 序列化协议

当前 Fiber 快照中的 hook 信息只有：

```ts
hooks: string[];
```

调整为：

```ts
hooks: string[];
hookCount: number;
hookChain: string;
```

含义：

- `hooks`: 仍保留按顺序拍平的 hook 类型数组，兼容当前面板的易读摘要
- `hookCount`: 明确告诉用户当前 Fiber 上有多少个 hook 节点
- `hookChain`: 用形如 `STATE -> REF -> EFFECT` 的字符串体现底层链表顺序

这样既保留简洁摘要，也把“链表”这个教学概念明确暴露出来。

### 9.2 面板展示

当前节点标签只有：

- type
- key
- effectTag
- hooks

调整后节点标签增加：

- `hookCount: N`
- `hookChain: STATE -> REF -> EFFECT`

展示原则：

1. 仍然以单节点文本摘要为主
2. 不把 hook 链单独画成子图
3. 让用户能一眼看出顺序和数量

## 10. 兼容性与约束

本次改造必须保持以下行为不变：

1. `useState` 多次更新后状态正确累积
2. 多个 hook 按调用顺序稳定对应
3. `useRef` 返回对象跨渲染保持同一引用
4. `useEffect` 只在 commit 后执行
5. deps 未变化时不重复执行 effect
6. 组件卸载时 cleanup 正常执行
7. 时间切片与 work loop 调度行为不变

## 11. 测试策略

### 11.1 runtime 回归测试

重点验证：

1. 多个 `useState / useRef / useEffect` 混用时，链表顺序与旧行为一致
2. `setState` 仍能从旧链表状态节点恢复并回放队列
3. `useRef` 在重渲染前后保持同一个对象
4. `useEffect` cleanup 与 rerun 时机不变

### 11.2 devtools 回归测试

重点验证：

1. `serializeFiberTree()` 能从链表读取 hook 信息
2. `hooks` 顺序与调用顺序一致
3. `hookCount` 和 `hookChain` 序列化正确

### 11.3 demo 验证

使用现有 `demo-lite` todo 场景人工观察：

1. 不同函数组件节点能显示不同 hook 数量
2. 某些组件显示 `STATE -> REF -> EFFECT` 这种链式摘要
3. 交互后 devtools 面板仍然正常刷新

## 12. 风险与应对

### 风险 1：旧 hook 指针推进错误，导致 hook 顺序错位

应对：

- 把“消费旧 hook”封装成一个独立函数
- 为多 hook 混用场景补测试

### 风险 2：effect cleanup 遍历遗漏

应对：

- 引入统一的 hook 链表遍历辅助函数
- 用现有 effect/cleanup 回归测试兜底

### 风险 3：devtools UI 过度复杂

应对：

- 不单独画 hook 链子图
- 只在节点文本中增加 `hookCount` 和 `hookChain`

## 13. 实施结论

本次将采用：

- Fiber 持有 `memoizedState` 头节点
- hook 改为单链表节点
- render 期通过“旧链表游标 + 新链表尾指针”构建下一轮 hook 链
- devtools 通过链表遍历生成 `hooks / hookCount / hookChain`

这样可以在不改变外部 API 的前提下，让 `lite-react` 的 hook 存储与 React 更接近，同时保留清晰、可教学的 devtools 展示。
