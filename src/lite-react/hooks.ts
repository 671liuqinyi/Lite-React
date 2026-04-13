import type {
  LiteEffectCallback,
  LiteEffectDeps,
  LiteRefObject,
  LiteVNode,
} from "./types";
import type {
  LiteEffectHook,
  LiteFiberNode,
  LiteHook,
  LiteRefHook,
  LiteStateAction,
  LiteStateHook,
} from "./fiber";

type StateUpdater<T> = T | ((prevState: T) => T);

let currentFunctionFiber: LiteFiberNode | null = null;
let currentHookIndex = 0;
let scheduleRootRender: (() => void) | null = null;

function isStateHook(hook: LiteHook | undefined): hook is LiteStateHook {
  return hook?.kind === "STATE";
}

function isEffectHook(hook: LiteHook | undefined): hook is LiteEffectHook {
  return hook?.kind === "EFFECT";
}

function isRefHook(hook: LiteHook | undefined): hook is LiteRefHook {
  return hook?.kind === "REF";
}

function getCurrentFunctionFiber(hookName: string) {
  if (!currentFunctionFiber) {
    throw new Error(`${hookName} can only be used inside a function component`);
  }

  return currentFunctionFiber;
}

function getOldHook(fiber: LiteFiberNode) {
  return fiber.alternate?.hooks?.[currentHookIndex];
}

function pushHook(fiber: LiteFiberNode, hook: LiteHook) {
  currentHookIndex += 1;
  fiber.hooks?.push(hook);
}

function areHookInputsEqual(
  previousDeps: LiteEffectDeps,
  nextDeps: LiteEffectDeps,
) {
  if (!previousDeps || !nextDeps) {
    return false;
  }

  if (previousDeps.length !== nextDeps.length) {
    return false;
  }

  return previousDeps.every((value, index) =>
    Object.is(value, nextDeps[index]),
  );
}

function visitFiberSubtree(
  fiber: LiteFiberNode | null,
  visitor: (node: LiteFiberNode) => void,
) {
  if (!fiber) {
    return;
  }

  visitor(fiber);

  let child = fiber.child;

  while (child) {
    visitFiberSubtree(child, visitor);
    child = child.sibling;
  }
}

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
  const fiber = getCurrentFunctionFiber("useState");
  const oldHook = getOldHook(fiber);

  if (oldHook && !isStateHook(oldHook)) {
    throw new Error("Hook order mismatch: expected a state hook");
  }

  const hook: LiteStateHook = {
    kind: "STATE",
    state: oldHook ? oldHook.state : initialValue,
    queue: [],
  };

  for (const action of oldHook?.queue ?? []) {
    hook.state = action(hook.state);
  }

  const currentFiber = fiber;
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

  pushHook(currentFiber, hook);

  // 每一轮渲染都会重新创建 hook 记录，并从 alternate 读回旧状态队列。
  return [value, setState] as const;
}

export function useRef<T>(initialValue: T): LiteRefObject<T> {
  const fiber = getCurrentFunctionFiber("useRef");
  const oldHook = getOldHook(fiber);

  if (oldHook && !isRefHook(oldHook)) {
    throw new Error("Hook order mismatch: expected a ref hook");
  }

  const refObject = oldHook
    ? (oldHook.ref as LiteRefObject<T>)
    : { current: initialValue };

  const hook: LiteRefHook = {
    kind: "REF",
    ref: refObject as LiteRefObject<unknown>,
  };

  pushHook(fiber, hook);
  return refObject;
}

export function useEffect(effect: LiteEffectCallback, deps?: readonly unknown[]) {
  const fiber = getCurrentFunctionFiber("useEffect");
  const oldHook = getOldHook(fiber);

  if (oldHook && !isEffectHook(oldHook)) {
    throw new Error("Hook order mismatch: expected an effect hook");
  }

  const hook: LiteEffectHook = {
    kind: "EFFECT",
    deps,
    effect,
    cleanup: oldHook?.cleanup,
    shouldRun: !oldHook || !areHookInputsEqual(oldHook.deps, deps),
  };

  pushHook(fiber, hook);
}

export function cleanupFiberEffects(fiber: LiteFiberNode | null) {
  visitFiberSubtree(fiber, (node) => {
    for (const hook of node.hooks ?? []) {
      if (!isEffectHook(hook) || typeof hook.cleanup !== "function") {
        continue;
      }

      hook.cleanup();
      hook.cleanup = undefined;
      hook.shouldRun = false;
    }
  });
}

export function flushPassiveEffects(root: LiteFiberNode | null) {
  visitFiberSubtree(root, (fiber) => {
    for (const hook of fiber.hooks ?? []) {
      if (!isEffectHook(hook) || !hook.shouldRun) {
        continue;
      }

      if (typeof hook.cleanup === "function") {
        hook.cleanup();
      }

      const nextCleanup = hook.effect();
      hook.cleanup =
        typeof nextCleanup === "function" ? nextCleanup : undefined;
      hook.shouldRun = false;
    }
  });
}
