import {
  TEXT_ELEMENT,
  type LiteChild,
  type LiteElementType,
  type LiteProps,
  type LiteVNode,
} from "./types";

function createTextElement(value: string | number): LiteVNode {
  return {
    type: TEXT_ELEMENT,
    props: {
      nodeValue: String(value),
      children: [],
    },
  };
}

function normalizeChild(child: LiteChild): LiteVNode[] {
  if (Array.isArray(child)) {
    return child.flatMap(normalizeChild);
  }

  if (
    child === null ||
    child === undefined ||
    child === false ||
    child === true
  ) {
    return [];
  }

  if (typeof child === "string" || typeof child === "number") {
    return [createTextElement(child)];
  }

  return [child];
}

export function createElement(
  type: LiteElementType,
  props: Record<string, unknown> | null,
  ...children: LiteChild[]
): LiteVNode {
  return {
    type,
    props: {
      ...(props ?? {}),
      // 先把 children 统一整理成 vnode 数组，后面的 render 就能只处理一种形状。
      children: children.flatMap(normalizeChild),
    } as LiteProps,
  };
}

export { TEXT_ELEMENT } from "./types";
export type { LiteChild, LiteFunctionComponent, LiteProps, LiteVNode } from "./types";
