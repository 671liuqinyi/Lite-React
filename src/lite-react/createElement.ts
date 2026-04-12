import { TEXT_ELEMENT, type LiteChild, type LiteVNode } from "./types";

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
  type: LiteVNode["type"],
  props: Record<string, unknown> | null,
  ...children: LiteChild[]
): LiteVNode {
  return {
    type,
    props: {
      ...(props ?? {}),
      children: children.flatMap(normalizeChild),
    },
  };
}

export { TEXT_ELEMENT } from "./types";
export type { LiteChild, LiteVNode } from "./types";
