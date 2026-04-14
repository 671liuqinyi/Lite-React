import type {
  LiteEffectCallback,
  LiteEffectDeps,
  LiteRefObject,
} from "./types";
import type {
  LiteEffectHook,
  LiteFiberNode,
  LiteHook,
  LiteRefHook,
  LiteStateAction,
  LiteStateHook,
} from "./fiber";

export type StateUpdater<T> = T | ((prevState: T) => T);

export type LiteHooksDispatcher = {
  useState<T>(
    initialValue: T,
  ): readonly [T, (nextState: StateUpdater<T>) => void];
  useRef<T>(initialValue: T): LiteRefObject<T>;
  useEffect(effect: LiteEffectCallback, deps?: readonly unknown[]): void;
};

export type HookRuntimeContextSnapshot = {
  currentDispatcher: LiteHooksDispatcher | null;
  currentFunctionFiber: LiteFiberNode | null;
  currentHookCursor: LiteHook | null;
  workInProgressHookTail: LiteHook | null;
};

let currentDispatcher: LiteHooksDispatcher | null = null;
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

function getCurrentFunctionFiber() {
  if (!currentFunctionFiber) {
    throw new Error("Hooks can only be called inside a function component");
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

function createStateSetter<T>(hook: LiteStateHook) {
  return function setState(nextState: StateUpdater<T>) {
    const action: LiteStateAction = (prevState) =>
      typeof nextState === "function"
        ? (nextState as (prevState: T) => T)(prevState as T)
        : nextState;

    hook.queue.push(action);

    if (!scheduleRootRender) {
      throw new Error("Cannot rerender before a root render is registered");
    }

    scheduleRootRender();
  };
}

function mountState<T>(initialValue: T) {
  const fiber = getCurrentFunctionFiber();
  const hook: LiteStateHook = {
    kind: "STATE",
    state: initialValue,
    queue: [],
    next: null,
  };

  appendHookNode(fiber, hook);
  return [hook.state as T, createStateSetter<T>(hook)] as const;
}

function updateState<T>(initialValue: T) {
  const fiber = getCurrentFunctionFiber();
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

  appendHookNode(fiber, hook);
  return [hook.state as T, createStateSetter<T>(hook)] as const;
}

function mountRef<T>(initialValue: T): LiteRefObject<T> {
  const fiber = getCurrentFunctionFiber();
  const refObject = { current: initialValue };
  const hook: LiteRefHook = {
    kind: "REF",
    ref: refObject as LiteRefObject<unknown>,
    next: null,
  };

  appendHookNode(fiber, hook);
  return refObject;
}

function updateRef<T>(initialValue: T): LiteRefObject<T> {
  const fiber = getCurrentFunctionFiber();
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

function mountEffect(effect: LiteEffectCallback, deps?: readonly unknown[]) {
  const fiber = getCurrentFunctionFiber();
  const hook: LiteEffectHook = {
    kind: "EFFECT",
    deps,
    effect,
    shouldRun: true,
    next: null,
  };

  appendHookNode(fiber, hook);
}

function updateEffect(effect: LiteEffectCallback, deps?: readonly unknown[]) {
  const fiber = getCurrentFunctionFiber();
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

export const HooksDispatcherOnMount: LiteHooksDispatcher = {
  useState: mountState,
  useRef: mountRef,
  useEffect: mountEffect,
};

export const HooksDispatcherOnUpdate: LiteHooksDispatcher = {
  useState: updateState,
  useRef: updateRef,
  useEffect: updateEffect,
};

export function registerRootRender(callback: () => void) {
  scheduleRootRender = callback;
}

export function resolveDispatcher() {
  if (!currentDispatcher) {
    throw new Error("Hooks can only be called inside a function component");
  }

  return currentDispatcher;
}

export function prepareToUseHooks(
  fiber: LiteFiberNode,
): HookRuntimeContextSnapshot {
  const previousContext: HookRuntimeContextSnapshot = {
    currentDispatcher,
    currentFunctionFiber,
    currentHookCursor,
    workInProgressHookTail,
  };

  currentFunctionFiber = fiber;
  currentHookCursor = fiber.alternate?.memoizedState ?? null;
  workInProgressHookTail = null;
  fiber.memoizedState = null;

  // 这里显式区分 mount / update dispatcher，让 hooks 的分发流程更接近 React。
  currentDispatcher =
    fiber.alternate?.memoizedState != null
      ? HooksDispatcherOnUpdate
      : HooksDispatcherOnMount;

  return previousContext;
}

export function finishHooks(previousContext: HookRuntimeContextSnapshot) {
  currentDispatcher = previousContext.currentDispatcher;
  currentFunctionFiber = previousContext.currentFunctionFiber;
  currentHookCursor = previousContext.currentHookCursor;
  workInProgressHookTail = previousContext.workInProgressHookTail;
}
