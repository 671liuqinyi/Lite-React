export const TEXT_ELEMENT = "TEXT_ELEMENT";

export type LiteElementType = string | typeof TEXT_ELEMENT;

export interface LiteVNode {
  type: LiteElementType;
  props: {
    children: LiteVNode[];
    nodeValue?: string;
    [key: string]: unknown;
  };
}

export type LiteChild =
  | LiteVNode
  | string
  | number
  | boolean
  | null
  | undefined
  | LiteChild[];
