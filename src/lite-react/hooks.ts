import type { LiteFiberNode, LiteHook, LiteStateAction } from "./fiber";
import type { LiteVNode } from "./types";

type StateUpdater<T> = T | ((prevState: T) => T);

let currentFunctionFiber: LiteFiberNode | null = null;
let currentHookIndex = 0;
let scheduleRootRender: (() => void) | null = null;

export function registerRootRender(callback: () => void) {
  scheduleRootRender = callback;
}

export function runFunctionComponent<TProps>(
  fiber: LiteFiberNode,
  component: (props: TProps) => LiteVNode,
  props: TProps,
) {
  const previousFiber = currentFunctionFiber;
  const previousHookIndex = currentHookIndex;

  currentFunctionFiber = fiber;
  currentHookIndex = 0;
  fiber.hooks = [];

  try {
    // 进入当前函数组件 Fiber 后，后续 hooks 都会写到这次工作树节点上。
    return component(props);
  } finally {
    currentFunctionFiber = previousFiber;
    currentHookIndex = previousHookIndex;
  }
}

export function useState<T>(initialValue: T) {
  if (!currentFunctionFiber) {
    throw new Error("useState can only be used inside a function component");
  }

  const oldHook = currentFunctionFiber.alternate?.hooks?.[
    currentHookIndex
  ] as LiteHook | undefined;

  const hook: LiteHook = {
    state: oldHook ? oldHook.state : initialValue,
    queue: [],
  };

  for (const action of oldHook?.queue ?? []) {
    hook.state = action(hook.state);
  }

  const currentFiber = currentFunctionFiber;
  const value = hook.state as T;

  function setState(nextState: StateUpdater<T>) {
    const action: LiteStateAction = (prevState) =>
      typeof nextState === "function"
        ? (nextState as (prevState: T) => T)(prevState as T)
        : nextState;

    hook.queue.push(action);

    if (!scheduleRootRender) {
      throw new Error("Cannot rerender before a root render is registered");
    }

    scheduleRootRender();
  }

  currentHookIndex += 1;
  currentFiber.hooks?.push(hook);

  // 每一轮渲染都会在当前 Fiber 上重新生成 hooks，并从 alternate 读回旧状态。
  return [value, setState] as const;
}
