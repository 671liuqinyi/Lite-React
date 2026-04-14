import {
  TEXT_ELEMENT,
  type LiteChild,
  type LiteElementType,
  type LiteKey,
  type LiteProps,
  type LiteVNode,
} from "./types";

function createTextElement(value: string | number): LiteVNode {
  return {
    type: TEXT_ELEMENT,
    key: null,
    props: {
      nodeValue: String(value),
      children: [],
    },
  };
}

function normalizeKey(value: unknown): LiteKey | null {
  if (typeof value === "string" || typeof value === "number") {
    return value;
  }

  return null;
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
  const nextProps: Record<string, unknown> = {
    ...(props ?? {}),
  };
  const key = normalizeKey(nextProps.key);

  delete nextProps.key;

  return {
    type,
    key,
    props: {
      ...nextProps,
      // 先把 children 统一整理成 vnode 数组，后面的 render 只处理一种形状。
      children: children.flatMap(normalizeChild),
    } as LiteProps,
  };
}

export { TEXT_ELEMENT } from "./types";
export type {
  LiteChild,
  LiteFunctionComponent,
  LiteKey,
  LiteProps,
  LiteVNode,
} from "./types";
