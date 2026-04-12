import { TEXT_ELEMENT, type LiteVNode } from "../lite-react";

function setProp(element: HTMLElement, key: string, value: unknown) {
  if (key === "children") {
    return;
  }

  if (key === "className") {
    element.setAttribute("class", String(value));
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
    return mount(vnode.type(vnode.props));
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
  container.replaceChildren(mount(vnode));
}
