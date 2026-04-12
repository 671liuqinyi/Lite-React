# lite-react 第三阶段设计：事件绑定、根级重渲染与最小 useState

## 1. 背景与目标

第一阶段完成了：

`JSX -> vnode -> DOM`

第二阶段完成了：

`函数组件首次挂载`

当前的 `lite-react` 已经能写出：

- 原生标签 JSX
- 文本节点
- 函数组件
- 首次挂载函数组件返回的 `vnode`

但它还不能做 React 最重要的交互链路：

`用户事件 -> 状态更新 -> 组件重新执行 -> UI 变化`

第三阶段的目标是用最小、最教学化的方式打通这条链路。

这一阶段要回答的问题是：

1. JSX 里的 `onClick` 如何绑定到真实 DOM
2. `useState` 最小实现到底需要保存什么
3. 调用 `setState` 后，如何触发一次重新渲染
4. 为什么最早期实现可以接受“根节点全量重渲染”

## 2. 第三阶段范围

### In Scope

第三阶段只支持以下能力：

- 原生 DOM 节点的 `onClick` 事件绑定
- 函数组件中的最小 `useState`
- `setState` 触发根级全量重渲染
- 同一个函数组件内多个 `useState`
- `lite-react` demo 改造成一个可点击计数器

### Out of Scope

第三阶段明确不做以下内容：

- 多组件之间独立的 hook 状态隔离
- `useEffect`
- `props.children`
- 组件嵌套组件时的复杂 hook 管理
- 批量更新
- diff / reconciliation
- fiber
- 事件合成系统
- `onClick` 以外的更多事件族

这一阶段只做最小教学版交互系统，不追求 React 完整语义。

## 3. 成功标准

当下面这些条件成立时，说明第三阶段完成：

1. `render` 能把 `onClick` 绑定到真实 DOM
2. `useState(0)` 首次渲染能返回 `[0, setState]`
3. 点击按钮后，`setState` 会触发一次根级重渲染
4. 组件重新执行后，页面文本从旧状态更新为新状态
5. 现有原生标签与函数组件首次挂载能力不回退

## 4. 总体方案

采用“根级全量重渲染 + hooks 数组 + 调用顺序索引”的教学版方案。

### 4.1 为什么先用根级全量重渲染

`setState` 后最直接的做法是：

1. 更新状态
2. 重新执行根组件树
3. 用新的 DOM 全量替换旧 DOM

这种方式虽然不高效，但在教学阶段非常合适，因为它把核心问题压缩到了最小：

- 状态存在哪里
- 组件如何重新执行
- UI 为什么会更新

先把这条链讲清楚，再进入局部更新、diff、fiber，会更顺。

### 4.2 为什么 hooks 用“数组 + 索引”

这一阶段不建立复杂组件实例系统，而是采用 React 教学里最经典的最小模型：

- 用一个模块级 `hookStates[]` 保存状态值
- 用一个模块级 `hookIndex` 记录当前执行到第几个 hook
- 每次根渲染前把 `hookIndex` 重置为 `0`
- 每次调用 `useState` 时，读取当前槽位并让索引加一

这样能非常直观地说明一件事：

`useState` 依赖的是调用顺序，而不是变量名。

## 5. 架构设计

第三阶段建议把逻辑分成两个小系统：

### 5.1 渲染器侧：事件绑定与重渲染入口

`lite-react-dom` 需要补两类能力：

- DOM 属性处理中识别 `onClick`
- 提供一个根级重新渲染入口

这里可以引入很小的根渲染注册逻辑，例如保存：

- 上一次根 `vnode`
- 根容器 `container`

或者更进一步，保存一个“生成根 `vnode` 的函数”。

### 5.2 hooks 侧：状态读写

`lite-react` 需要新增一个最小 hooks 模块，负责：

- 保存 `hookStates`
- 管理 `hookIndex`
- 暴露 `useState`
- 暴露一个供渲染器调用的“渲染开始重置索引”方法
- 暴露一个供 `setState` 调用的“请求重渲染”方法

这两层之间只需要极小接口，不需要引入完整 dispatcher。

## 6. API 设计

第三阶段建议新增和扩展下面这些 API：

### 6.1 `useState`

```ts
const [count, setCount] = useState(0);
```

约束：

- 只支持在函数组件执行期间调用
- 初始值首次渲染生效
- `setState(next)` 直接覆盖当前槽位
- `setState((prev) => next)` 也可以支持，这样更接近 React

### 6.2 根渲染注册

为了让 `setState` 触发重渲染，运行时需要一个可复用入口。

建议把 `render(vnode, container)` 扩展成：

- 首次调用时记录当前根 `vnode` 和根容器
- 每次真正渲染前重置 hook 索引
- `setState` 时复用这组信息再执行一次 `render`

这一阶段不需要对外暴露新的 public API；内部机制能跑通就够了。

## 7. useState 设计

### 7.1 存储结构

建议新增一个模块，例如：

- `hookStates: unknown[]`
- `hookIndex: number`

第一次 `useState(initialValue)`：

- 如果当前槽位为空，就写入初始值
- 返回当前值和一个绑定当前槽位的 `setState`

后续重新渲染时：

- 仍然按相同顺序调用 `useState`
- 通过相同的索引读回上一次状态

### 7.2 setState 设计

`setState` 可以支持两种输入：

```ts
setState(1)
setState((prev) => prev + 1)
```

实现时建议统一成：

1. 取出当前槽位旧值
2. 计算新值
3. 写回 `hookStates[currentIndex]`
4. 调用根级重渲染

## 8. render / mount 设计

### 8.1 事件绑定

第三阶段里，`setProp` 需要新增事件分支：

- 如果 key 是 `onClick`
- 且 value 是函数
- 则绑定到真实 DOM 节点

建议只支持这一条最小规则，不抽象成完整事件系统。

### 8.2 根级重渲染

这一阶段可以接受下面这种行为：

- 首次 `render(vnode, container)` 保存根信息
- `setState` 触发时再次执行 `render(rootVNode, rootContainer)`
- `render` 仍然调用 `replaceChildren(...)`

这意味着每次点击都会整棵根树重建，但正好符合教学目标。

### 8.3 hook 索引重置

每次根渲染开始前，都必须重置 `hookIndex = 0`。

否则第二次渲染时：

- 第一个 `useState` 会错读到第二个槽位
- 后续所有状态都会错位

这也是第三阶段里最值得强调的一个关键点。

## 9. demo 设计

`demo-lite` 建议升级成最小 counter：

```tsx
function App(props: { title: string }) {
  const [count, setCount] = useState(0);

  return (
    <section id="lite-root" className="demo-card">
      <h1>{props.title}</h1>
      <button onClick={() => setCount((value) => value + 1)}>
        Count is {count}
      </button>
    </section>
  );
}
```

这样可以一次验证三件事：

- 函数组件仍然可用
- 事件能正确绑定
- `useState` 能触发 UI 更新

## 10. 测试策略

第三阶段建议继续严格使用 TDD。

### 10.1 事件绑定测试

测试：

- 渲染一个带 `onClick` 的按钮
- 触发按钮 `click()`
- 断言回调被执行

### 10.2 useState 初始值测试

测试：

- 定义一个使用 `useState(0)` 的组件
- 首次渲染
- 断言页面上显示 `0`

### 10.3 setState 重渲染测试

测试：

- 定义一个使用 `useState` 的 counter 组件
- 首次渲染时显示 `Count is 0`
- 点击按钮
- 断言页面文本变为 `Count is 1`

这是第三阶段最关键的回归测试。

## 11. 错误处理策略

第三阶段不追求完整边界防御，但建议明确：

- 如果在组件外调用 `useState`，允许抛出运行时错误
- 如果 hook 调用顺序变化，行为不保证正确
- 如果没有已注册的根渲染信息却调用了 `setState`，允许直接抛错

原则仍然是：

优先清楚暴露约束，而不是伪装支持。

## 12. 推荐实现顺序

建议按下面顺序推进：

1. 先写 `onClick` 绑定测试
2. 确认测试先失败
3. 实现事件绑定
4. 再写 `useState` 初始渲染测试
5. 确认测试先失败
6. 实现最小 hooks 存储
7. 再写点击后状态更新测试
8. 确认测试先失败
9. 实现根级重渲染入口
10. 最后把 demo 改成交互计数器

这个顺序的好处是：

- 事件系统、状态系统、重渲染系统分层验证
- 每一层都能明确看到自己解决了什么问题

## 13. 后续阶段衔接

第三阶段完成后，更自然的下一步是：

1. 多组件 hooks 状态隔离
2. `props.children`
3. 最小 diff

因为第三阶段解决的是“能更新”，下一步才应该进入“如何更合理地更新”。

## 14. 实施结论

第三阶段最重要的不是性能，而是把这条最核心链路跑通：

`onClick`
-> `setState`
-> 根级重渲染
-> 组件重新执行
-> 文本更新

完成后，`lite-react` 会第一次真正拥有交互能力。

这会是进入 diff、fiber 之前最有价值的一步。
