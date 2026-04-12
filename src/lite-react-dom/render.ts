import { TEXT_ELEMENT, type LiteVNode } from "../lite-react";
import { ROOT_ELEMENT, type LiteFiberNode } from "../lite-react/fiber";
import { registerRootRender, runFunctionComponent } from "../lite-react/hooks";

let currentRoot: LiteFiberNode | null = null;
let workInProgressRoot: LiteFiberNode | null = null;
let nextUnitOfWork: LiteFiberNode | null = null;
let deletions: LiteFiberNode[] = [];

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

function reconcileChildren(
  workInProgressFiber: LiteFiberNode,
  elements: LiteVNode[],
) {
  let index = 0;
  let oldFiber = workInProgressFiber.alternate?.child ?? null;
  let previousSibling: LiteFiberNode | null = null;

  // 用新 vnode 数组和旧 Fiber 子链并排比较，生成下一轮工作树。
  while (index < elements.length || oldFiber) {
    const element = elements[index];
    const sameType = !!element && !!oldFiber && element.type === oldFiber.type;
    let newFiber: LiteFiberNode | null = null;

    if (sameType && oldFiber) {
      newFiber = {
        type: oldFiber.type,
        props: element.props,
        dom: oldFiber.dom,
        parent: workInProgressFiber,
        child: null,
        sibling: null,
        alternate: oldFiber,
        effectTag: "UPDATE",
      };
    }

    if (element && !sameType) {
      newFiber = {
        type: element.type,
        props: element.props,
        dom: null,
        parent: workInProgressFiber,
        child: null,
        sibling: null,
        alternate: null,
        effectTag: "PLACEMENT",
      };
    }

    if (oldFiber && !sameType) {
      oldFiber.effectTag = "DELETION";
      deletions.push(oldFiber);
    }

    if (index === 0) {
      workInProgressFiber.child = newFiber;
    } else if (previousSibling && newFiber) {
      previousSibling.sibling = newFiber;
    }

    previousSibling = newFiber;
    oldFiber = oldFiber?.sibling ?? null;
    index += 1;
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

function commitDeletion(fiber: LiteFiberNode, domParent: Node) {
  // 函数组件本身没有 DOM，需要一路向下找到真正要删除的宿主节点。
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
  commitWork(fiber.sibling);
}

function commitRoot() {
  for (const fiber of deletions) {
    commitWork(fiber);
  }

  commitWork(workInProgressRoot?.child ?? null);
  currentRoot = workInProgressRoot;
  workInProgressRoot = null;
  nextUnitOfWork = null;
  deletions = [];
}

function workLoop() {
  while (nextUnitOfWork) {
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork);
  }

  if (workInProgressRoot) {
    commitRoot();
  }
}

export function render(vnode: LiteVNode, container: HTMLElement) {
  const alternateRoot =
    currentRoot && currentRoot.dom === container ? currentRoot : null;

  if (!alternateRoot) {
    container.replaceChildren();
  }

  workInProgressRoot = {
    type: ROOT_ELEMENT,
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

  workLoop();
}
