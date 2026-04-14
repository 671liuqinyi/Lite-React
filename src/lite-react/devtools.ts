import { ROOT_ELEMENT, type LiteFiberNode, type LiteHook } from "./fiber";
import { TEXT_ELEMENT } from "./types";

export type LiteFiberSnapshot = {
  id: string;
  type: string;
  key: string | number | null;
  effectTag: string | null;
  hooks: string[];
  children: LiteFiberSnapshot[];
};

export type LiteDevtoolsEvent =
  | {
      type: "render:scheduled";
      renderId: number;
      timestamp: number;
    }
  | {
      type: "render:commit";
      renderId: number;
      timestamp: number;
      snapshot: LiteFiberSnapshot | null;
    };

export type LiteDevtoolsListener = (event: LiteDevtoolsEvent) => void;

export type LiteDevtoolsHook = {
  publish(event: LiteDevtoolsEvent): void;
  subscribe(listener: LiteDevtoolsListener): () => void;
};

type GlobalWithLiteDevtools = typeof globalThis & {
  __LITE_REACT_DEVTOOLS__?: LiteDevtoolsHook;
};

let devtoolsHookForTest: LiteDevtoolsHook | null = null;

function getGlobalHost() {
  return globalThis as GlobalWithLiteDevtools;
}

function getHookKinds(hooks: LiteHook[] | undefined) {
  return (hooks ?? []).map((hook) => hook.kind);
}

function getFiberTypeLabel(fiber: LiteFiberNode) {
  if (fiber.type === ROOT_ELEMENT) {
    return "ROOT";
  }

  if (fiber.type === TEXT_ELEMENT) {
    return "TEXT";
  }

  if (typeof fiber.type === "string") {
    return fiber.type;
  }

  if (typeof fiber.type === "function") {
    const component = fiber.type as (typeof fiber.type) & {
      displayName?: string;
    };

    return component.displayName || component.name || "Anonymous";
  }

  return "Unknown";
}

function collectSnapshotChildren(
  fiber: LiteFiberNode | null,
  path: string,
): LiteFiberSnapshot[] {
  const children: LiteFiberSnapshot[] = [];
  let currentChild = fiber;
  let index = 0;

  while (currentChild) {
    const snapshot = serializeFiberTree(currentChild, `${path}.${index}`);

    if (snapshot) {
      children.push(snapshot);
    }

    currentChild = currentChild.sibling;
    index += 1;
  }

  return children;
}

export function createLiteDevtoolsHook(): LiteDevtoolsHook {
  const listeners = new Set<LiteDevtoolsListener>();

  return {
    publish(event) {
      for (const listener of listeners) {
        listener(event);
      }
    },
    subscribe(listener) {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },
  };
}

export function getLiteDevtoolsHook() {
  if (devtoolsHookForTest) {
    return devtoolsHookForTest;
  }

  return getGlobalHost().__LITE_REACT_DEVTOOLS__ ?? null;
}

export function ensureLiteDevtoolsHook() {
  const host = getGlobalHost();

  if (!host.__LITE_REACT_DEVTOOLS__) {
    host.__LITE_REACT_DEVTOOLS__ = createLiteDevtoolsHook();
  }

  return host.__LITE_REACT_DEVTOOLS__;
}

export function setLiteDevtoolsHookForTest(hook: LiteDevtoolsHook | null) {
  devtoolsHookForTest = hook;
}

export function publishLiteDevtoolsEvent(event: LiteDevtoolsEvent) {
  getLiteDevtoolsHook()?.publish(event);
}

export function serializeFiberTree(
  fiber: LiteFiberNode | null,
  path = "root",
): LiteFiberSnapshot | null {
  if (!fiber) {
    return null;
  }

  // Fiber 快照要切断 parent / sibling / DOM 引用，只保留可视化需要的信息。
  return {
    id: path.replace(/[^a-zA-Z0-9_.-]/g, "-"),
    type: getFiberTypeLabel(fiber),
    key: fiber.key,
    effectTag: fiber.effectTag ?? null,
    hooks: getHookKinds(fiber.hooks),
    children: collectSnapshotChildren(fiber.child, path),
  };
}
