import {
  TEXT_ELEMENT,
  type LiteKey,
  type LiteVNode,
} from "../lite-react";
import { ROOT_ELEMENT, type LiteFiberNode } from "../lite-react/fiber";
import {
  publishLiteDevtoolsEvent,
  serializeFiberTree,
} from "../lite-react/devtools";
import {
  cleanupFiberEffects,
  flushPassiveEffects,
  registerRootRender,
  runFunctionComponent,
} from "../lite-react/hooks";
import {
  scheduleIdleWork,
  shouldYield,
  type LiteIdleDeadline,
} from "./scheduler";

let currentRoot: LiteFiberNode | null = null;
let workInProgressRoot: LiteFiberNode | null = null;
let nextUnitOfWork: LiteFiberNode | null = null;
let deletions: LiteFiberNode[] = [];
let isWorkLoopScheduled = false;
let currentRenderId = 0;

function isEventProp(key: string) {
  return key.startsWith("on");
}

function isTextNode(node: Node): node is Text {
  return node.nodeType === Node.TEXT_NODE;
}

function toEventName(key: string) {
  return key.slice(2).toLowerCase();
}

function removeDomProp(dom: Node, key: string) {
  if (isTextNode(dom)) {
    if (key === "nodeValue") {
      dom.nodeValue = "";
    }
    return;
  }

  if (!(dom instanceof Element)) {
    return;
  }

  if (key === "className") {
    dom.removeAttribute("class");
    return;
  }

  dom.removeAttribute(key);
}

function setDomProp(dom: Node, key: string, value: unknown) {
  if (isTextNode(dom)) {
    if (key === "nodeValue") {
      dom.nodeValue = String(value ?? "");
    }
    return;
  }

  if (!(dom instanceof Element)) {
    return;
  }

  if (key === "className") {
    dom.setAttribute("class", String(value));
    return;
  }

  dom.setAttribute(key, String(value));
}

function updateDom(
  dom: Node,
  prevProps: Record<string, unknown>,
  nextProps: Record<string, unknown>,
) {
  const keys = new Set([...Object.keys(prevProps), ...Object.keys(nextProps)]);

  for (const key of keys) {
    if (key === "children") {
      continue;
    }

    if (isEventProp(key)) {
      const previousHandler = prevProps[key];
      const nextHandler = nextProps[key];
      const eventName = toEventName(key);

      if (
        typeof previousHandler === "function" &&
        previousHandler !== nextHandler
      ) {
        dom.removeEventListener(eventName, previousHandler as EventListener);
      }

      if (typeof nextHandler === "function" && previousHandler !== nextHandler) {
        dom.addEventListener(eventName, nextHandler as EventListener);
      }

      continue;
    }

    const hasNextValue =
      key in nextProps &&
      nextProps[key] !== null &&
      nextProps[key] !== undefined &&
      nextProps[key] !== false;

    if (!hasNextValue) {
      if (key in prevProps) {
        removeDomProp(dom, key);
      }
      continue;
    }

    if (prevProps[key] !== nextProps[key]) {
      setDomProp(dom, key, nextProps[key]);
    }
  }
}

function createDom(fiber: LiteFiberNode): Node {
  if (fiber.type === TEXT_ELEMENT) {
    return document.createTextNode(String(fiber.props.nodeValue ?? ""));
  }

  if (typeof fiber.type !== "string" || fiber.type === ROOT_ELEMENT) {
    throw new Error("Only host fibers can create DOM nodes");
  }

  const dom = document.createElement(fiber.type);
  updateDom(dom, {}, fiber.props);
  return dom;
}

function createFiberFromElement(
  element: LiteVNode,
  parent: LiteFiberNode,
  oldFiber: LiteFiberNode | null,
  effectTag: "PLACEMENT" | "UPDATE",
): LiteFiberNode {
  return {
    type: element.type,
    key: element.key,
    props: element.props,
    dom: effectTag === "UPDATE" ? oldFiber?.dom ?? null : null,
    parent,
    child: null,
    sibling: null,
    alternate: effectTag === "UPDATE" ? oldFiber : null,
    effectTag,
  };
}

function collectOldFibers(firstOldFiber: LiteFiberNode | null) {
  const oldFibers: LiteFiberNode[] = [];
  const keyedOldFibers = new Map<LiteKey, LiteFiberNode>();
  const unkeyedOldFibers: LiteFiberNode[] = [];

  let oldFiber = firstOldFiber;

  while (oldFiber) {
    oldFibers.push(oldFiber);

    if (oldFiber.key === null) {
      unkeyedOldFibers.push(oldFiber);
    } else {
      keyedOldFibers.set(oldFiber.key, oldFiber);
    }

    oldFiber = oldFiber.sibling;
  }

  return {
    oldFibers,
    keyedOldFibers,
    unkeyedOldFibers,
  };
}

function reconcileChildren(
  workInProgressFiber: LiteFiberNode,
  elements: LiteVNode[],
) {
  const { oldFibers, keyedOldFibers, unkeyedOldFibers } = collectOldFibers(
    workInProgressFiber.alternate?.child ?? null,
  );
  const usedOldFibers = new Set<LiteFiberNode>();
  let previousSibling: LiteFiberNode | null = null;
  let unkeyedIndex = 0;

  // Prefer keyed matching first, then fall back to positional reuse.
  for (const [index, element] of elements.entries()) {
    let matchedOldFiber: LiteFiberNode | null =
      element.key !== null
        ? keyedOldFibers.get(element.key) ?? null
        : unkeyedOldFibers[unkeyedIndex] ?? null;

    if (matchedOldFiber && usedOldFibers.has(matchedOldFiber)) {
      matchedOldFiber = null;
    }

    if (element.key === null && matchedOldFiber) {
      unkeyedIndex += 1;
    }

    const sameType = !!matchedOldFiber && element.type === matchedOldFiber.type;
    let newFiber: LiteFiberNode;

    if (sameType && matchedOldFiber) {
      usedOldFibers.add(matchedOldFiber);
      newFiber = createFiberFromElement(
        element,
        workInProgressFiber,
        matchedOldFiber,
        "UPDATE",
      );
    } else {
      if (matchedOldFiber) {
        usedOldFibers.add(matchedOldFiber);
        matchedOldFiber.effectTag = "DELETION";
        deletions.push(matchedOldFiber);
      }

      newFiber = createFiberFromElement(
        element,
        workInProgressFiber,
        null,
        "PLACEMENT",
      );
    }

    if (index === 0) {
      workInProgressFiber.child = newFiber;
    } else if (previousSibling) {
      previousSibling.sibling = newFiber;
    }

    previousSibling = newFiber;
  }

  for (const oldFiber of oldFibers) {
    if (usedOldFibers.has(oldFiber)) {
      continue;
    }

    oldFiber.effectTag = "DELETION";
    deletions.push(oldFiber);
  }
}

function updateFunctionComponent(fiber: LiteFiberNode) {
  if (typeof fiber.type !== "function") {
    throw new Error("Expected a function component fiber");
  }

  const child = runFunctionComponent(fiber, fiber.type, fiber.props);
  reconcileChildren(fiber, [child]);
}

function updateHostComponent(fiber: LiteFiberNode) {
  if (fiber.type !== ROOT_ELEMENT && !fiber.dom) {
    fiber.dom = createDom(fiber);
  }

  reconcileChildren(fiber, fiber.props.children);
}

function performUnitOfWork(fiber: LiteFiberNode): LiteFiberNode | null {
  if (typeof fiber.type === "function") {
    updateFunctionComponent(fiber);
  } else {
    updateHostComponent(fiber);
  }

  if (fiber.child) {
    return fiber.child;
  }

  let nextFiber: LiteFiberNode | null = fiber;

  while (nextFiber) {
    if (nextFiber.sibling) {
      return nextFiber.sibling;
    }

    nextFiber = nextFiber.parent;
  }

  return null;
}

function findHostParent(fiber: LiteFiberNode) {
  let parentFiber = fiber.parent;

  while (parentFiber && !parentFiber.dom) {
    parentFiber = parentFiber.parent;
  }

  if (!parentFiber?.dom) {
    throw new Error("Missing host parent during commit");
  }

  return parentFiber.dom;
}

function findFirstHostDom(fiber: LiteFiberNode | null): Node | null {
  if (!fiber) {
    return null;
  }

  if (fiber.dom) {
    return fiber.dom;
  }

  return findFirstHostDom(fiber.child);
}

function syncHostChildrenOrder(fiber: LiteFiberNode) {
  if (!fiber.dom || isTextNode(fiber.dom)) {
    return;
  }

  let child = fiber.child;

  while (child) {
    const childDom = findFirstHostDom(child);

    if (childDom) {
      fiber.dom.appendChild(childDom);
    }

    child = child.sibling;
  }
}

function commitDeletion(fiber: LiteFiberNode, domParent: Node) {
  // 组件卸载时要先递归执行 cleanup，再删除对应宿主节点。
  cleanupFiberEffects(fiber);

  // 函数组件本身没有 DOM，需要一路向下找到真正的宿主节点。
  if (fiber.dom) {
    domParent.removeChild(fiber.dom);
    return;
  }

  if (fiber.child) {
    commitDeletion(fiber.child, domParent);
  }
}

function commitWork(fiber: LiteFiberNode | null) {
  if (!fiber) {
    return;
  }

  const domParent = findHostParent(fiber);

  if (fiber.effectTag === "PLACEMENT" && fiber.dom) {
    domParent.appendChild(fiber.dom);
  } else if (fiber.effectTag === "UPDATE" && fiber.dom && fiber.alternate) {
    updateDom(fiber.dom, fiber.alternate.props, fiber.props);
  } else if (fiber.effectTag === "DELETION") {
    commitDeletion(fiber, domParent);
    return;
  }

  commitWork(fiber.child);

  if (fiber.type === ROOT_ELEMENT || typeof fiber.type === "string") {
    // Re-append direct host children so keyed reorders reach the real DOM.
    syncHostChildrenOrder(fiber);
  }

  commitWork(fiber.sibling);
}

function commitRoot() {
  const committedRenderId = currentRenderId;

  for (const fiber of deletions) {
    commitWork(fiber);
  }

  commitWork(workInProgressRoot?.child ?? null);
  currentRoot = workInProgressRoot;
  workInProgressRoot = null;
  nextUnitOfWork = null;
  deletions = [];

  // devtools 只在 commit 完成后发布快照，避免看到半成品 Fiber 树。
  publishLiteDevtoolsEvent({
    type: "render:commit",
    renderId: committedRenderId,
    timestamp: Date.now(),
    snapshot: serializeFiberTree(currentRoot),
  });

  // useEffect 只在 commit 完成后执行，保证副作用读到的是新 DOM。
  flushPassiveEffects(currentRoot);
}

function performWorkUntilDeadline(deadline: LiteIdleDeadline) {
  isWorkLoopScheduled = false;

  while (nextUnitOfWork && !shouldYield(deadline)) {
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork);
  }

  if (workInProgressRoot) {
    if (!nextUnitOfWork) {
      commitRoot();
    } else {
      ensureWorkLoopScheduled();
    }
  }
}

function ensureWorkLoopScheduled() {
  if (isWorkLoopScheduled) {
    return;
  }

  isWorkLoopScheduled = true;
  scheduleIdleWork(performWorkUntilDeadline);
}

export function render(vnode: LiteVNode, container: HTMLElement) {
  currentRenderId += 1;
  publishLiteDevtoolsEvent({
    type: "render:scheduled",
    renderId: currentRenderId,
    timestamp: Date.now(),
  });

  const alternateRoot =
    currentRoot && currentRoot.dom === container ? currentRoot : null;

  if (!alternateRoot) {
    container.replaceChildren();
  }

  workInProgressRoot = {
    type: ROOT_ELEMENT,
    key: null,
    dom: container,
    props: {
      children: [vnode],
    },
    parent: null,
    child: null,
    sibling: null,
    alternate: alternateRoot,
  };

  deletions = [];
  nextUnitOfWork = workInProgressRoot;

  registerRootRender(() => {
    const currentVNode = currentRoot?.props.children[0];
    const currentContainer = currentRoot?.dom;

    if (!currentVNode || !(currentContainer instanceof HTMLElement)) {
      throw new Error("Missing current root during rerender");
    }

    render(currentVNode, currentContainer);
  });

  ensureWorkLoopScheduled();
}
