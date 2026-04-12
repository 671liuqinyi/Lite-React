import type { LiteVNode } from "./types";

type StateUpdater<T> = T | ((prevState: T) => T);

let hookStateMap = new Map<string, unknown[]>();
let currentInstanceId: string | null = null;
let currentHookIndex = 0;
let activeRootId: symbol | null = null;
let scheduleRootRender: (() => void) | null = null;

export function prepareToRenderRoot(rootId: symbol) {
  if (activeRootId !== rootId) {
    activeRootId = rootId;
    hookStateMap = new Map();
  }

  currentInstanceId = null;
  currentHookIndex = 0;
}

export function registerRootRender(callback: () => void) {
  scheduleRootRender = callback;
}

export function runFunctionComponent<TProps>(
  instanceId: string,
  component: (props: TProps) => LiteVNode,
  props: TProps,
) {
  const previousInstanceId = currentInstanceId;
  const previousHookIndex = currentHookIndex;

  currentInstanceId = instanceId;
  currentHookIndex = 0;

  try {
    // 进入某个组件实例时，后续的 useState 都会落到该实例自己的状态数组上。
    return component(props);
  } finally {
    currentInstanceId = previousInstanceId;
    currentHookIndex = previousHookIndex;
  }
}

export function useState<T>(initialValue: T) {
  if (!currentInstanceId) {
    throw new Error("useState can only be used inside a function component");
  }

  let instanceStates = hookStateMap.get(currentInstanceId);

  if (!instanceStates) {
    instanceStates = [];
    hookStateMap.set(currentInstanceId, instanceStates);
  }

  const states = instanceStates;
  const currentIndex = currentHookIndex;

  if (states[currentIndex] === undefined) {
    states[currentIndex] = initialValue;
  }

  const value = states[currentIndex] as T;

  function setState(nextState: StateUpdater<T>) {
    const previousValue = states[currentIndex] as T;

    states[currentIndex] =
      typeof nextState === "function"
        ? (nextState as (prevState: T) => T)(previousValue)
        : nextState;

    if (!scheduleRootRender) {
      throw new Error("Cannot rerender before a root render is registered");
    }

    scheduleRootRender();
  }

  currentHookIndex += 1;

  // 每个组件实例都有自己的 hooks 数组，这里只在当前实例的槽位里读写状态。
  return [value, setState] as const;
}
