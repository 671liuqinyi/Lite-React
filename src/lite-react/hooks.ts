import type { LiteVNode } from "./types";

type StateUpdater<T> = T | ((prevState: T) => T);

let hookStates: unknown[] = [];
let hookIndex = 0;
let activeRootId: symbol | null = null;
let scheduleRootRender: (() => void) | null = null;
let isRenderingFunctionComponent = false;

export function prepareToRenderRoot(rootId: symbol) {
  if (activeRootId !== rootId) {
    activeRootId = rootId;
    hookStates = [];
  }

  hookIndex = 0;
}

export function registerRootRender(callback: () => void) {
  scheduleRootRender = callback;
}

export function runFunctionComponent<TProps>(
  component: (props: TProps) => LiteVNode,
  props: TProps,
) {
  isRenderingFunctionComponent = true;

  try {
    return component(props);
  } finally {
    isRenderingFunctionComponent = false;
  }
}

export function useState<T>(initialValue: T) {
  if (!isRenderingFunctionComponent) {
    throw new Error("useState can only be used inside a function component");
  }

  const currentIndex = hookIndex;

  if (hookStates[currentIndex] === undefined) {
    hookStates[currentIndex] = initialValue;
  }

  const value = hookStates[currentIndex] as T;

  function setState(nextState: StateUpdater<T>) {
    const previousValue = hookStates[currentIndex] as T;

    hookStates[currentIndex] =
      typeof nextState === "function"
        ? (nextState as (prevState: T) => T)(previousValue)
        : nextState;

    if (!scheduleRootRender) {
      throw new Error("Cannot rerender before a root render is registered");
    }

    scheduleRootRender();
  }

  hookIndex += 1;

  // 这里先用“数组槽位 + 调用顺序”保存状态，便于理解 useState 的最小原理。
  return [value, setState] as const;
}
