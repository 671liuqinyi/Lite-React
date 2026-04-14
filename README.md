# lite-react

一个用于学习 React 原理的轻量版实现仓库。

这个项目是从零实现一套简化版运行时与渲染器，并用 Monorepo 方式组织成接近 React 官方仓库的结构，方便按模块学习：

- JSX / `createElement`
- Fiber 节点组织
- Hooks 调用与状态持久化
- Reconciler 与提交阶段
- `requestIdleCallback` 时间切片
- 可视化 Fiber 树 devtools

## 项目展示

在线展示地址：https://lite-react.vercel.app/

## 项目目标

这个仓库主要服务于两个目标：

1. 用尽量小的代码量理解 React 运行时的核心机制
2. 用更接近真实工程的 Monorepo 结构组织 runtime、renderer、demo 和调试工具

已实现功能：

- 已拆分为 `lite-react` 核心层和 `lite-react-dom` 渲染层
- 已实现 `useState`、`useEffect`、`useRef`
- 已实现简化版 Fiber Reconciler 和 Keyed Diff
- 已实现基于 `requestIdleCallback` 的可中断工作循环
- 已提供 `vite-plugin-lite-react-devtools`，可以在页面中可视化 Fiber 树

## 仓库结构

```text
lite-react/
├─ packages/
│  ├─ lite-react/                       # 核心运行时：createElement、Fiber、hooks、dispatcher
│  ├─ lite-react-dom/                   # DOM 渲染器：render、调度、commit、reconcile
│  └─ vite-plugin-lite-react-devtools/  # 调试插件：运行时面板、Mermaid Fiber 可视化
├─ fixtures/
│  ├─ demo-lite/                        # 使用自研 lite-react 的演示应用
│  └─ demo-react/                       # 使用官方 React 的对照演示
├─ package.json                         # 根工作区脚本
└─ pnpm-workspace.yaml                  # Monorepo workspace 配置
```

### packages

- `packages/lite-react`
  负责 `createElement`、Fiber 类型、Hooks 运行时、Dispatcher、devtools 事件接口
- `packages/lite-react-dom`
  负责 DOM 节点创建、diff、commit、删除、副作用调度、时间切片工作循环
- `packages/vite-plugin-lite-react-devtools`
  负责在 Vite 页面中注入 devtools 面板，并通过 Mermaid 渲染 Fiber 树

### fixtures

- `fixtures/demo-lite`
  运行自研框架，适合观察 Fiber、Hooks 和 devtools 的行为
- `fixtures/demo-react`
  运行官方 React，用来做 API 使用体验上的对照

## 快速开始

### 环境要求

- Node.js 18+
- pnpm 9+

### 安装依赖

```bash
pnpm install
```

### 启动自研框架演示

```bash
pnpm dev:lite
```

启动后打开终端输出的本地地址即可。

这个 demo 会加载：

- `lite-react`
- `lite-react-dom`
- `vite-plugin-lite-react-devtools`

适合观察：

- 组件渲染
- `useState` 更新
- `useEffect` 执行时机
- Keyed Diff
- Fiber 树快照和提交事件

### 启动官方 React 对照演示

```bash
pnpm dev:react
```

这个 demo 使用官方 `react` / `react-dom`，主要用于和 `demo-lite` 做行为与写法对照。

## 常用命令

| 命令 | 说明 |
| --- | --- |
| `pnpm dev:lite` | 启动 `fixtures/demo-lite` |
| `pnpm dev:react` | 启动 `fixtures/demo-react` |
| `pnpm build:lite` | 构建 `demo-lite` |
| `pnpm build:react` | 构建 `demo-react` |
| `pnpm build` | 构建两个 demo |
| `pnpm test` | 运行全部测试 |
| `pnpm typecheck` | 执行 TypeScript 校验 |
| `pnpm lint` | 执行 ESLint |

## 当前实现

### 1. 运行时与渲染器解耦

仓库已经按 Monorepo 方式拆成多个 workspace 包：

- `lite-react` 负责声明和维护运行时能力
- `lite-react-dom` 负责宿主环境渲染
- demo 通过包名直接消费工作区包，而不是使用跨目录相对路径

整体结构接近 React 仓库中 `packages/*` + `fixtures/*` 的组织方式。

### 2. Fiber 与工作循环

当前实现了简化版 Fiber 节点结构，包含：

- `parent`
- `child`
- `sibling`
- `alternate`
- `effectTag`
- `memoizedState`

渲染阶段会把工作拆成一个个 unit of work，在空闲时间片中继续推进；如果时间预算耗尽，就把剩余工作留到下一轮 idle callback。

### 3. Hooks 运行时

当前已支持以下 Hooks：

- `useState`
- `useEffect`
- `useRef`

实现方式上，Hooks 会挂在 Fiber 的 `memoizedState` 上，并以链表形式维护。调用时通过 Dispatcher 区分 mount / update 阶段，再把公开 API 调度到当前执行上下文。

### 4. Reconciler

当前已支持的提交效果包括：

- `PLACEMENT`
- `UPDATE`
- `DELETION`

同时也支持基于 `key` 的子节点复用和重排，能在列表场景里观察节点复用、删除和 DOM 顺序调整。

### 5. Devtools 可视化

`vite-plugin-lite-react-devtools` 会在页面中注入调试面板，并在 render scheduled / render commit 事件之间展示运行过程。

面板能力包括：

- 订阅 Fiber 渲染事件
- 渲染当前提交后的 Fiber 快照
- 使用 Mermaid 把 Fiber 树转换成可视化图
- 在页面右下角展示可拖拽缩放的调试面板

## 推荐阅读顺序

推荐按下面顺序阅读，从“虚拟节点 -> Fiber -> 调度 -> 提交 -> 可视化”串起来：

1. `packages/lite-react/src/createElement.ts`
2. `packages/lite-react/src/fiber.ts`
3. `packages/lite-react/src/dispatcher.ts`
4. `packages/lite-react/src/hooks.ts`
5. `packages/lite-react-dom/src/render.ts`
6. `packages/lite-react-dom/src/scheduler.ts`
7. `packages/lite-react/src/devtools.ts`
8. `packages/vite-plugin-lite-react-devtools/src/client.ts`

## 测试说明

当前仓库已经包含针对核心行为的测试，覆盖范围主要包括：

- `createElement` 行为
- Dispatcher mount / update 分发
- Hooks 链表与状态复用
- `useEffect` 执行与 cleanup
- DOM 更新与 keyed diff
- 时间切片调度
- devtools 事件与插件注入

运行全部测试：

```bash
pnpm test
```

## 未来优化方向

项目目前优化方向如下：

- 支持更多 Hooks，例如 `useMemo`、`useCallback`
- 补充事件系统或合成事件层
- 使用 `messageChannel` 替换 `requestIdleCallback` 实现，渲染更加主动。
- 引入更清晰的 render / reconcile / commit 分层
- 增加更多 fixture，用于验证边界场景
- 为 devtools 增加节点选中、高亮和提交历史

