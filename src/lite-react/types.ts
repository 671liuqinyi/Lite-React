export const TEXT_ELEMENT = "TEXT_ELEMENT";

export type LiteKey = string | number;

export type LiteProps = Record<string, unknown> & {
  children: LiteVNode[];
};

export type LiteComponentProps = {
  children?: LiteVNode | LiteVNode[];
};

export type LiteFunctionComponent<
  P extends Record<string, unknown> = Record<string, never>,
> = {
  bivarianceHack(props: P & LiteComponentProps): LiteVNode;
}["bivarianceHack"];

export type LiteElementType =
  | string
  | typeof TEXT_ELEMENT
  | LiteFunctionComponent<Record<string, unknown>>;

export interface LiteVNode {
  type: LiteElementType;
  key: LiteKey | null;
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
