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
