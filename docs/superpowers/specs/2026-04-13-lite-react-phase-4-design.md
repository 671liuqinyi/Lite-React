# lite-react 第四阶段设计：props.children、组件嵌套与实例级 hooks 状态隔离

## 1. 背景与目标

前三个阶段已经依次完成了：

- `JSX -> vnode -> DOM`
- 函数组件首次挂载
- `onClick -> setState -> 根级重渲染`

当前的 `lite-react` 已经具备最小交互能力，但还停留在一个非常平的模型里：

- 组件虽然能嵌套使用，但缺少明确的 `props.children` 支持
- hooks 状态仍然偏向“整棵树按调用顺序串起来”的教学版实现
- 同一组件类型的多个实例虽然在部分稳定场景下能工作，但没有真正的“实例级状态隔离”设计

第四阶段的目标是把组件树能力补完整，并明确把 hooks 状态从“全局顺序模型”升级成“按组件实例隔离”的模型。

这一阶段要回答的问题是：

1. JSX 里的子节点如何作为 `props.children` 传给函数组件
2. 组件如何在组件里继续渲染其他组件
3. 两个相同类型的组件实例为什么不会串 state
4. 在不引入 diff 的前提下，怎样给组件实例分配稳定身份

## 2. 第四阶段范围

### In Scope

第四阶段只支持以下能力：

- `props.children`
- 组件嵌套组件
- 同一组件类型的多个实例各自维护独立 `useState`
- 保持根级全量重渲染模型不变
- 用新的 demo 证明多个 `Counter` 实例互不影响

### Out of Scope

第四阶段明确不做以下内容：

- `key`
- 局部 diff
- fiber
- 结构剧烈变化后的高级实例复用策略
- `useEffect`
- `context`
- class component

这一阶段解决的是“组件树能正确表达和隔离状态”，不解决“如何高效更新”。

## 3. 成功标准

当下面这些条件成立时，说明第四阶段完成：

1. 函数组件可以通过 `props.children` 渲染包裹内容
2. 组件中渲染组件可以正常工作
3. 两个同类型组件实例都能各自持有自己的 state
4. 点击左侧 `Counter` 只更新左侧，不影响右侧
5. 第三阶段已有的事件绑定与根级重渲染能力不回退

## 4. 总体方案

采用“实例路径 + 每个实例一份 hooks 数组”的最小方案。

### 4.1 为什么不用单一全局 hooks 数组继续往前撑

第三阶段的全局 `hookStates[] + hookIndex` 模型非常适合解释 `useState` 的基础原理，但它把整棵树的 hooks 都串在一条全局序列上。

这在教学上足够解释“状态为什么能更新”，但并不能很好表达“状态属于哪个组件实例”。

第四阶段要把心智模型升级成：

- 每个组件实例有自己的 hooks 存储
- `useState` 读写的是“当前实例”的 hooks 数组

### 4.2 为什么先用“实例路径”识别组件实例

在不引入 diff 和 fiber 的前提下，最简单的实例身份方案就是：

- 渲染树遍历时，为每个函数组件生成一个路径
- 路径稳定时，组件实例身份也稳定
- 用这个路径作为 hooks 状态表的 key

这不是 React 最终形态，但非常适合当前阶段：

- 实现简单
- 容易打印和调试
- 足以解释“为什么两个 `<Counter />` 不会共用 state”

## 5. 类型设计

当前 `LiteFunctionComponent<P>` 的 `props` 类型并没有明确包含 `children`。

第四阶段建议新增一个轻量组件 props 扩展：

```ts
export type LiteComponentProps = {
  children?: LiteVNode[];
};
```

然后把组件类型改成：

```ts
export type LiteFunctionComponent<P extends Record<string, unknown> = Record<string, never>> =
  (props: P & LiteComponentProps) => LiteVNode;
```

这样：

- 不传子节点时，`children` 是可选的
- 传了子节点时，组件里可以显式读取 `props.children`

## 6. createElement 设计

`createElement` 的运行时行为这一阶段基本不需要大改，因为它本来就会把 children 归一化进 `props.children`。

第四阶段主要补的是：

- 类型层正式承认组件 props 里存在 `children`

也就是说，`createElement` 的职责仍然保持纯粹：

- 只负责描述节点
- 不负责实例分配
- 不负责 hooks 管理

## 7. render / mount 设计

### 7.1 组件实例路径

建议把 `mount` 改成接收当前节点路径，例如：

```ts
function mount(vnode: LiteVNode, path: string): Node
```

渲染根节点时：

- 根路径可以从 `"0"` 开始

渲染子节点时：

- 子节点路径可以按 `parentPath + "." + childIndex` 派生

函数组件本身使用自己的路径作为实例 ID。

### 7.2 组件返回树的继续挂载

当 `mount` 遇到函数组件时：

1. 用当前路径作为组件实例 ID
2. 调用 hooks 运行时进入该实例上下文
3. 执行组件函数
4. 对其返回的 `vnode` 继续递归 `mount`

这会让“组件实例身份”和“组件返回子树”自然串起来。

## 8. hooks 设计

### 8.1 状态存储

第四阶段建议把当前的：

- `hookStates: unknown[]`

升级为：

- `Map<instanceId, unknown[]>`

这样每个组件实例都有自己的状态数组。

### 8.2 当前实例上下文

hooks 运行时需要维护：

- 当前正在渲染的组件实例 ID
- 当前实例内部的 hook 索引

进入函数组件时：

- 切换到该实例
- 重置该实例的 `hookIndex`

退出函数组件时：

- 恢复上一个实例上下文

这样嵌套组件时，父子组件的 hooks 不会互相污染。

### 8.3 根渲染切换

根渲染仍然使用第三阶段已有的根级重渲染入口。

只是当 root 变化时：

- 清空整张实例状态表

当 root 不变时：

- 沿用已有实例状态

## 9. 测试策略

第四阶段建议新增 3 组核心测试：

### 9.1 `props.children` 测试

测试组件：

- `Panel` 接收 `title` 和 `children`
- 渲染标题和传入的 children

断言：

- children 最终出现在 DOM 中

### 9.2 嵌套组件测试

测试结构：

- `App -> Layout -> Label`

断言：

- 嵌套组件最终能正确展开成 DOM

### 9.3 同类型多实例状态隔离测试

测试结构：

- `App` 里渲染两个 `<Counter label="A" />` 和 `<Counter label="B" />`

行为：

- 点击第一个按钮

断言：

- 第一个按钮从 `A:0` 变为 `A:1`
- 第二个按钮仍然是 `B:0`

这会是第四阶段最关键的验证点。

## 10. demo 设计

`demo-lite` 建议改成一个“父组件 + 两个子 counter”的示例，例如：

```tsx
function Counter(props: { label: string }) {
  const [count, setCount] = useState(0);

  return (
    <button onClick={() => setCount((value) => value + 1)}>
      {props.label}:{count}
    </button>
  );
}

function App() {
  return (
    <section>
      <Panel title="Counters">
        <Counter label="A" />
        <Counter label="B" />
      </Panel>
    </section>
  );
}
```

这样一页就能同时展示：

- `props.children`
- 组件嵌套
- 多实例状态隔离

## 11. 错误处理策略

第四阶段仍然不做复杂恢复，只明确边界：

- 没有实例上下文时调用 `useState`，继续抛错
- 树结构变化超出当前实例路径策略的稳定范围时，不保证状态复用完全符合真实 React

原则仍然是：

优先把约束说清楚，而不是伪装支持。

## 12. 推荐实现顺序

建议按下面顺序推进：

1. 先写 `props.children` 测试
2. 再写嵌套组件测试
3. 再写同类型多实例状态隔离测试
4. 先扩展类型层
5. 再改 hooks 存储结构
6. 再改 `mount` 路径传递
7. 最后升级 demo

这个顺序的好处是：

- 先把外部行为钉住
- 再逐层调整内部实现

## 13. 后续阶段衔接

第四阶段完成后，最自然的下一步就是：

1. 最小 diff
2. `key`
3. 更合理的节点复用

因为到这一步，组件树和实例状态已经成型，下一步才该进入“如何更高效更新”。

## 14. 实施结论

第四阶段的核心不是再加一个 API，而是把 `lite-react` 的内部模型从“全局教学版 hooks”升级成“组件树实例模型”。

完成后，你会得到一个更接近 React 心智模型的运行时：

- children 真正属于组件 props
- 组件可以稳定嵌套组件
- 同一组件类型的多个实例各自维护自己的 state

这会是进入 diff 之前非常关键的一步。
