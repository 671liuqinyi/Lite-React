# lite-react 第一阶段设计：JSX -> vnode -> DOM

## 1. 背景与目标

这个仓库用于手写一个教学版 `lite-react`，通过逐步实现 React 的核心能力来理解底层原理。

第一阶段只解决一条最小闭环：

`JSX -> vnode -> DOM`

这一阶段的目标不是“做出一个能替代 React 的库”，而是把下面两个问题彻底讲清楚：

1. JSX 最终会变成什么样的 JavaScript 数据结构
2. 这个数据结构如何递归转换成真实 DOM

## 2. 第一阶段范围

### In Scope

第一阶段只支持以下能力：

- 使用 JSX 编写 `lite-react` demo
- 把 JSX 转换成自定义 `vnode`
- 把 `vnode` 渲染到真实 DOM
- 支持原生标签节点，例如 `div`、`span`、`button`
- 支持文本节点，例如字符串和数字
- 支持最基础的 props 设置
- 保留一个官方 React demo 作为对照组

### Out of Scope

第一阶段明确不做以下内容：

- 函数组件
- `useState`、`useEffect` 等 hooks
- diff / reconciliation
- fiber
- 更新调度
- 事件系统
- Fragment
- refs
- class component
- SSR

这部分能力都放到后续阶段。第一阶段只要求“首次挂载成功”，不要求“更新正确”。

## 3. 成功标准

当下面这些条件都成立时，说明第一阶段完成：

1. 访问官方 demo 页面时，仍然运行原生 React
2. 访问 `lite-react` demo 页面时，运行的是自定义实现
3. `lite-react` demo 能正确渲染嵌套标签和文本
4. JSX 中的基础 props 能反映到 DOM 上
5. 整个渲染过程可以用代码和日志清楚追踪

## 4. 总体方案

采用“双入口 + 自定义 JSX 工厂 + 最小 render”的方案。

### 4.1 对照组与实验组分离

- `index.html` 作为官方 React 对照组入口
- `lite.html` 作为 `lite-react` 实验组入口

这样做的原因：

- 两套实现互不干扰
- 学习时可以直接对比行为
- 以后逐步扩展 `lite-react` 时，不会破坏官方参考实现

### 4.2 JSX 继续保留，但只在 lite demo 中改为自定义工厂

第一阶段仍然使用 JSX，而不是手写 `createElement(...)`。

原因：

- 使用方式更接近真实 React
- 以后扩展函数组件时不需要重新改 demo 写法
- 学习重点可以放在“JSX 如何被降级成 vnode”

由于项目里需要同时保留官方 React demo，因此不改整个仓库的 JSX 编译配置，而是在 `lite-react` demo 中使用局部 JSX pragma，让 TSX 只对 `lite-react` 文件走自定义工厂。

## 5. 目录结构设计

建议目录调整为：

```text
.
├─ index.html
├─ lite.html
├─ src/
│  ├─ demo-react/
│  │  ├─ App.tsx
│  │  └─ main.tsx
│  ├─ demo-lite/
│  │  ├─ App.tsx
│  │  └─ main.tsx
│  ├─ lite-react/
│  │  ├─ createElement.ts
│  │  ├─ index.ts
│  │  └─ types.ts
│  └─ lite-react-dom/
│     ├─ index.ts
│     └─ render.ts
└─ docs/
   └─ superpowers/
      └─ specs/
         └─ 2026-04-12-lite-react-phase-1-design.md
```

### 5.1 各目录职责

`src/demo-react/`

- 官方 React 对照组
- 保留正常 React/ReactDOM 的用法
- 后续每个阶段都可以和 `lite-react` 做横向比较

`src/demo-lite/`

- `lite-react` 实验组
- 只用于验证当前阶段实现
- 第一阶段建议只渲染静态嵌套结构

`src/lite-react/`

- 负责 `JSX -> vnode`
- 产出最小 `createElement`
- 定义 `vnode` 类型和 children 归一化规则

`src/lite-react-dom/`

- 负责 `vnode -> DOM`
- 产出最小 `render`
- 递归创建和挂载真实 DOM

## 6. API 设计

第一阶段只公开两个核心 API：

```ts
createElement(type, props, ...children)
render(vnode, container)
```

对应职责如下：

### 6.1 `createElement`

输入：

- 元素类型 `type`
- 属性对象 `props`
- 可变子节点 `children`

输出：

- 一个普通 JavaScript 对象，也就是 `vnode`

### 6.2 `render`

输入：

- 根 `vnode`
- 容器节点 `container`

输出：

- 无返回值
- 直接在容器中创建并挂载真实 DOM

## 7. vnode 数据结构设计

第一阶段的 `vnode` 应当足够小，最好能让人一眼看懂。

推荐结构：

```ts
export const TEXT_ELEMENT = "TEXT_ELEMENT";

export type LiteElementType = string | typeof TEXT_ELEMENT;

export interface LiteVNode {
  type: LiteElementType;
  props: {
    children: LiteVNode[];
    [key: string]: unknown;
  };
}
```

### 7.1 为什么这样设计

`type`

- 原生标签直接存字符串，例如 `"div"`、`"span"`
- 文本节点使用特殊标记 `TEXT_ELEMENT`
- 第一阶段不支持函数，因此不需要 `Function` 类型

`props`

- 和 React 的思路保持一致
- 所有属性统一放到 `props` 中
- `children` 也归入 `props.children`

这种结构的优势是：

- 后续扩展函数组件时，只需要把 `type` 扩展为函数
- 后续做 diff 时，也可以直接围绕 `type + props + children` 展开
- 学习成本低，便于打印日志观察

### 7.2 文本节点设计

JSX 里的文本和数字不会直接保留原样，而是会被包装成专门的文本 `vnode`。

推荐形式：

```ts
{
  type: TEXT_ELEMENT,
  props: {
    nodeValue: "hello",
    children: []
  }
}
```

原因：

- 这样可以让渲染逻辑统一处理节点
- `render` 不需要分支处理“有时是对象、有时是原始值”的混乱情况

## 8. children 归一化规则

`createElement` 的核心工作不是“简单打包参数”，而是把 `children` 变成统一格式。

第一阶段建议采用以下规则：

1. 把 `children` 统一处理成数组
2. 把字符串和数字转换成文本 `vnode`
3. 忽略 `null`、`undefined`、`false`、`true`
4. 如果出现数组子节点，展开后继续归一化

这样做的好处是，`render` 层可以假设自己拿到的永远是规范化后的 `vnode[]`。

### 8.1 建议的心智模型

`createElement` 要做的是“清洗输入”，让运行时后面的每一步都更简单。

也就是说：

- `createElement` 负责统一形状
- `render` 负责消费这个统一形状

## 9. JSX 编译策略

这是第一阶段里最重要的设计点之一。

### 9.1 为什么不改全局 TSX 配置

因为项目需要同时存在：

- 一个官方 React demo
- 一个 `lite-react` demo

如果直接把全局 JSX 编译目标改成 `lite-react`，那么官方 demo 就会被一起切走，失去对照价值。

### 9.2 建议方案：在 lite demo 中使用局部 JSX pragma

`src/demo-lite/*.tsx` 顶部使用局部 JSX 注释，让这些文件的 JSX 编译到自定义 `createElement`。

核心思路是：

- 官方 demo 继续走 React 默认 JSX 编译
- lite demo 单独声明自己的 JSX 工厂

这样能在同一个仓库里保留两套运行时，同时不引入额外构建复杂度。

建议在 `src/demo-lite/*.tsx` 中采用接近下面的形式：

```tsx
/** @jsxRuntime classic */
/** @jsx createElement */
import { createElement } from "../lite-react";
```

这能明确表达两件事：

- 当前文件使用 classic JSX 降级方式
- JSX 最终调用的是自定义 `createElement`

### 9.3 为什么这一方案适合教学

因为它是“最少工程配置、最多原理暴露”的方案：

- 你能明确知道 JSX 最终落到了哪个函数
- 你不用为了第一阶段就拆分复杂构建配置
- 你可以更轻松地打印 `createElement` 的输入和输出

## 10. render 流程设计

第一阶段的 `render` 只做首次挂载，不处理更新。

整体流程如下：

```text
render(vnode, container)
  -> mount(vnode)
  -> 递归创建 DOM
  -> append 到 container
```

### 10.1 顶层 render

`render(vnode, container)` 的职责：

1. 清空容器
2. 调用内部递归挂载函数
3. 把生成的根 DOM 插入容器

第一阶段允许它采用“全量替换”思路：

- 每次调用 `render`，直接清空容器再重建
- 不考虑复用旧节点

这是一个明确的教学取舍：先把挂载逻辑讲清楚，再进入更新逻辑。

### 10.2 递归 mount

内部建议实现一个私有函数，例如：

```ts
function mount(vnode: LiteVNode): Node
```

它的逻辑如下：

1. 如果 `vnode.type === TEXT_ELEMENT`
2. 创建文本节点
3. 否则创建元素节点 `document.createElement(vnode.type)`
4. 遍历 props，给 DOM 设置属性
5. 递归处理 `props.children`
6. 依次追加到当前 DOM 节点
7. 返回创建好的 DOM 节点

### 10.3 props 挂载规则

第一阶段建议只支持最基础、最容易理解的属性映射：

- 忽略 `children`
- `className` 映射到 `class`
- 普通字符串/数字属性使用 `setAttribute`

第一阶段不建议处理：

- 事件，例如 `onClick`
- `style` 对象
- `dangerouslySetInnerHTML`

因为这些能力会明显增加分支复杂度，但对“JSX -> vnode -> DOM”这个学习目标帮助不大。

## 11. demo 设计

### 11.1 官方 React demo

官方 demo 继续保留一个简单交互示例，例如当前的 counter。

作用：

- 作为参照组
- 后续当 `lite-react` 逐步支持 hooks 和更新时，可以逐步向这个 demo 靠拢

### 11.2 lite-react demo

第一阶段的 `lite-react` demo 应保持极简，建议只渲染静态结构，例如：

```tsx
<section className="card">
  <h1>lite-react</h1>
  <p>JSX -> vnode -> DOM</p>
  <div>
    <span>nested</span>
    <span>children</span>
  </div>
</section>
```

这样设计的原因：

- 能验证嵌套节点
- 能验证文本节点
- 能验证基础 props
- 不会把问题扩散到事件和更新

同时建议 `lite.html` 直接挂载 `src/demo-lite/main.tsx`，而 `index.html` 继续挂载官方 React 的 `src/demo-react/main.tsx`，让两个入口的职责保持稳定。

## 12. 第一阶段推荐实现顺序

建议严格按下面顺序推进：

1. 写 `src/lite-react/types.ts`
2. 写文本节点辅助函数
3. 写 `createElement`
4. 打印 `vnode`，确认 JSX 已经成功转成对象
5. 写 `src/lite-react-dom/render.ts`
6. 先支持文本节点
7. 再支持原生标签节点
8. 最后给 lite demo 挂载页面

这个顺序的好处是每一步都能单独验证，不容易“写一大坨后一起排错”。

## 13. 日志与可观测性建议

为了教学效果，第一阶段建议主动保留少量日志，例如：

- `createElement` 收到了什么输入
- 生成的 `vnode` 长什么样
- `mount` 当前正在处理哪个节点

但日志需要保持克制，建议只在开发阶段保留，避免把代码变成纯调试脚本。

## 14. 错误处理策略

第一阶段不需要完整错误恢复机制，但应明确最小行为：

- 如果 `container` 不存在，直接抛错
- 如果 `vnode.type` 不是当前支持的类型，直接抛错
- 如果 props 中出现暂不支持的复杂值，不做静默魔法处理

这里的原则是：

第一阶段优先“暴露问题”，而不是“悄悄兜底”。

## 15. 测试策略

第一阶段不必先引入完整测试框架，但要有最小验证方式。

推荐分两层验证：

### 15.1 结构验证

通过 `console.log` 或断点确认：

- JSX 是否调用了自定义 `createElement`
- `children` 是否被归一化
- 文本节点是否被包装为 `TEXT_ELEMENT`

### 15.2 页面验证

在浏览器中确认：

- 标签层级正确
- 文本顺序正确
- `className` 等基础属性正确生效

## 16. 后续阶段衔接

第一阶段完成后，后面的演进顺序建议是：

1. 支持函数组件
2. 支持事件绑定
3. 支持重新渲染
4. 引入 `useState`
5. 进入最小 diff
6. 再讨论 fiber 和调度

这条顺序的核心思想是：

先把“声明式描述 UI”讲清楚，再进入“UI 如何更新”。

## 17. 实施结论

对于当前仓库，第一步最值得写的不是 hooks，也不是 fiber，而是以下三个核心文件：

1. `src/lite-react/createElement.ts`
2. `src/lite-react-dom/render.ts`
3. `src/demo-lite/main.tsx`

第一阶段完成后，你将得到一个最小但闭环的教学版运行时：

- 能用 JSX 编写 UI
- 能生成 `vnode`
- 能把 `vnode` 渲染成 DOM
- 能和官方 React demo 并排作为后续学习基线

这会是整个 `lite-react` 项目的真正起点。
