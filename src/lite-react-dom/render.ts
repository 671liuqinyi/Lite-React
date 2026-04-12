import { TEXT_ELEMENT, type LiteVNode } from "../lite-react";
import {
  prepareToRenderRoot,
  registerRootRender,
  runFunctionComponent,
} from "../lite-react/hooks";

type RootRecord = {
  id: symbol;
  container: HTMLElement;
  vnode: LiteVNode;
};

let currentRoot: RootRecord | null = null;

function setProp(element: HTMLElement, key: string, value: unknown) {
  if (key === "children") {
    return;
  }

  if (key === "className") {
    element.setAttribute("class", String(value));
    return;
  }

  if (key === "onClick" && typeof value === "function") {
    element.addEventListener("click", value as EventListener);
    return;
  }

  element.setAttribute(key, String(value));
}

function mount(vnode: LiteVNode): Node {
  if (vnode.type === TEXT_ELEMENT) {
    return document.createTextNode(String(vnode.props.nodeValue ?? ""));
  }

  if (typeof vnode.type === "function") {
    // 函数组件本质上是“接收 props，返回 vnode”的普通函数。
    return mount(runFunctionComponent(vnode.type, vnode.props));
  }

  const element = document.createElement(vnode.type);

  for (const [key, value] of Object.entries(vnode.props)) {
    setProp(element, key, value);
  }

  for (const child of vnode.props.children) {
    element.appendChild(mount(child));
  }

  return element;
}

export function render(vnode: LiteVNode, container: HTMLElement) {
  if (!currentRoot || currentRoot.container !== container) {
    currentRoot = {
      id: Symbol("lite-root"),
      container,
      vnode,
    };
  } else {
    currentRoot = {
      ...currentRoot,
      vnode,
    };
  }

  registerRootRender(() => {
    if (!currentRoot) {
      throw new Error("Missing current root during rerender");
    }

    render(currentRoot.vnode, currentRoot.container);
  });

  // 每次根渲染开始前重置 hook 索引，确保 useState 按调用顺序读取正确槽位。
  prepareToRenderRoot(currentRoot.id);
  container.replaceChildren(mount(vnode));
}
