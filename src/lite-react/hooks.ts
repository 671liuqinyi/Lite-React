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
let currentHookCursor: LiteHook | null = null;
let workInProgressHookTail: LiteHook | null = null;
let scheduleRootRender: (() => void) | null = null;

function isStateHook(hook: LiteHook | undefined | null): hook is LiteStateHook {
  return hook?.kind === "STATE";
}

function isEffectHook(
  hook: LiteHook | undefined | null,
): hook is LiteEffectHook {
  return hook?.kind === "EFFECT";
}

function isRefHook(hook: LiteHook | undefined | null): hook is LiteRefHook {
  return hook?.kind === "REF";
}

function getCurrentFunctionFiber(hookName: string) {
  if (!currentFunctionFiber) {
    throw new Error(`${hookName} can only be used inside a function component`);
  }

  return currentFunctionFiber;
}

function consumeOldHook() {
  const hook = currentHookCursor;

  if (currentHookCursor) {
    currentHookCursor = currentHookCursor.next;
  }

  return hook;
}

function appendHookNode(fiber: LiteFiberNode, hook: LiteHook) {
  hook.next = null;

  if (!fiber.memoizedState) {
    fiber.memoizedState = hook;
  } else if (workInProgressHookTail) {
    workInProgressHookTail.next = hook;
  }

  workInProgressHookTail = hook;
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

function visitHookList(
  hook: LiteHook | null,
  visitor: (node: LiteHook) => void,
) {
  let current = hook;

  while (current) {
    visitor(current);
    current = current.next;
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
  const previousHookCursor = currentHookCursor;
  const previousHookTail = workInProgressHookTail;

  currentFunctionFiber = fiber;
  currentHookCursor = fiber.alternate?.memoizedState ?? null;
  workInProgressHookTail = null;
  fiber.memoizedState = null;

  try {
    // 这里让当前函数组件按“旧链表游标 -> 新链表尾指针”的方式重建 hook。
    return component(props);
  } finally {
    currentFunctionFiber = previousFiber;
    currentHookCursor = previousHookCursor;
    workInProgressHookTail = previousHookTail;
  }
}

export function useState<T>(initialValue: T) {
  const fiber = getCurrentFunctionFiber("useState");
  const oldHook = consumeOldHook();

  if (oldHook && !isStateHook(oldHook)) {
    throw new Error("Hook order mismatch: expected a state hook");
  }

  const hook: LiteStateHook = {
    kind: "STATE",
    state: oldHook ? oldHook.state : initialValue,
    queue: [],
    next: null,
  };

  for (const action of oldHook?.queue ?? []) {
    hook.state = action(hook.state);
  }

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

  appendHookNode(fiber, hook);

  // 每轮渲染都会基于 alternate 上的旧节点，串出一条新的 hook 链表。
  return [value, setState] as const;
}

export function useRef<T>(initialValue: T): LiteRefObject<T> {
  const fiber = getCurrentFunctionFiber("useRef");
  const oldHook = consumeOldHook();

  if (oldHook && !isRefHook(oldHook)) {
    throw new Error("Hook order mismatch: expected a ref hook");
  }

  const refObject = oldHook
    ? (oldHook.ref as LiteRefObject<T>)
    : { current: initialValue };

  const hook: LiteRefHook = {
    kind: "REF",
    ref: refObject as LiteRefObject<unknown>,
    next: null,
  };

  appendHookNode(fiber, hook);
  return refObject;
}

export function useEffect(effect: LiteEffectCallback, deps?: readonly unknown[]) {
  const fiber = getCurrentFunctionFiber("useEffect");
  const oldHook = consumeOldHook();

  if (oldHook && !isEffectHook(oldHook)) {
    throw new Error("Hook order mismatch: expected an effect hook");
  }

  const hook: LiteEffectHook = {
    kind: "EFFECT",
    deps,
    effect,
    cleanup: oldHook?.cleanup,
    shouldRun: !oldHook || !areHookInputsEqual(oldHook.deps, deps),
    next: null,
  };

  appendHookNode(fiber, hook);
}

export function cleanupFiberEffects(fiber: LiteFiberNode | null) {
  visitFiberSubtree(fiber, (node) => {
    visitHookList(node.memoizedState, (hook) => {
      if (!isEffectHook(hook) || typeof hook.cleanup !== "function") {
        return;
      }

      hook.cleanup();
      hook.cleanup = undefined;
      hook.shouldRun = false;
    });
  });
}

export function flushPassiveEffects(root: LiteFiberNode | null) {
  visitFiberSubtree(root, (fiber) => {
    visitHookList(fiber.memoizedState, (hook) => {
      if (!isEffectHook(hook) || !hook.shouldRun) {
        return;
      }

      if (typeof hook.cleanup === "function") {
        hook.cleanup();
      }

      const nextCleanup = hook.effect();
      hook.cleanup =
        typeof nextCleanup === "function" ? nextCleanup : undefined;
      hook.shouldRun = false;
    });
  });
}
