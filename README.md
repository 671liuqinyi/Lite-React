# lite-react

一个用于学习 React 原理的轻量版实现仓库，现已调整为更接近 React 官方仓库思路的 monorepo 结构。

## 目录结构

- `packages/lite-react`
  负责 `createElement`、Fiber、hooks、dispatcher 和 devtools hook
- `packages/lite-react-dom`
  负责 DOM renderer 和调度逻辑
- `packages/vite-plugin-lite-react-devtools`
  负责 Vite devtools 插件和浏览器面板
- `fixtures/demo-lite`
  使用自研框架的演示应用
- `fixtures/demo-react`
  使用官方 React 的对照演示

## 常用命令

- `pnpm dev:lite`
  启动 `lite-react` 演示应用
- `pnpm dev:react`
  启动官方 React 对照演示
- `pnpm test`
  运行 monorepo 下的测试
- `pnpm typecheck`
  运行 TypeScript 工程校验
- `pnpm build`
  构建两个 fixture

## 设计说明

这次调整的重点是把“框架源码”和“演示应用”拆分成独立工作区包：

- demo 不再通过相对路径直接访问框架目录
- 包之间通过 `workspace:*` 依赖和导出入口协作
- 根目录只承担 workspace 协调和共享配置职责

这样更适合继续学习 React 风格的包边界、fixtures 和多包协作方式。
