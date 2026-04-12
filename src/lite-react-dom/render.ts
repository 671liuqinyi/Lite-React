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

function mount(vnode: LiteVNode, path: string): Node {
  if (vnode.type === TEXT_ELEMENT) {
    return document.createTextNode(String(vnode.props.nodeValue ?? ""));
  }

  if (typeof vnode.type === "function") {
    // 这里用路径标识组件实例，让同一组件类型的多个实例也能各自拿回自己的 hooks 状态。
    return mount(runFunctionComponent(path, vnode.type, vnode.props), `${path}.0`);
  }

  const element = document.createElement(vnode.type);

  for (const [key, value] of Object.entries(vnode.props)) {
    setProp(element, key, value);
  }

  for (const [index, child] of vnode.props.children.entries()) {
    element.appendChild(mount(child, `${path}.${index}`));
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

  // 每次根渲染开始前重置 hooks 运行时上下文，但不清空同一个 root 的实例状态表。
  prepareToRenderRoot(currentRoot.id);
  container.replaceChildren(mount(vnode, "0"));
}
