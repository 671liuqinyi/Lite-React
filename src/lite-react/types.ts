export const TEXT_ELEMENT = "TEXT_ELEMENT";

export type LiteProps = Record<string, unknown> & {
  children: LiteVNode[];
};

export type LiteFunctionComponent<
  P extends Record<string, unknown> = Record<string, unknown>,
> = {
  bivarianceHack(props: P): LiteVNode;
}["bivarianceHack"];

export type LiteElementType =
  | string
  | typeof TEXT_ELEMENT
  | LiteFunctionComponent<Record<string, unknown>>;

export interface LiteVNode {
  type: LiteElementType;
  props: LiteProps & {
    nodeValue?: string;
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
