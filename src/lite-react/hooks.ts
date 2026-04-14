import type { LiteEffectCallback, LiteVNode } from "./types";
import type { LiteEffectHook, LiteFiberNode, LiteHook } from "./fiber";
import {
  finishHooks,
  prepareToUseHooks,
  registerRootRender,
  resolveDispatcher,
} from "./dispatcher";

function isEffectHook(
  hook: LiteHook | undefined | null,
): hook is LiteEffectHook {
  return hook?.kind === "EFFECT";
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

export { registerRootRender };

export function runFunctionComponent<TProps>(
  fiber: LiteFiberNode,
  component: (props: TProps) => LiteVNode,
  props: TProps,
) {
  const previousContext = prepareToUseHooks(fiber);

  try {
    // 组件执行前先挂上 dispatcher，公开 hooks API 只负责把调用转发给当前 dispatcher。
    return component(props);
  } finally {
    finishHooks(previousContext);
  }
}

export function useState<T>(initialValue: T) {
  return resolveDispatcher().useState(initialValue);
}

export function useRef<T>(initialValue: T) {
  return resolveDispatcher().useRef(initialValue);
}

export function useEffect(effect: LiteEffectCallback, deps?: readonly unknown[]) {
  return resolveDispatcher().useEffect(effect, deps);
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
