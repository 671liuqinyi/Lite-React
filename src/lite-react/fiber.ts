import type { LiteElementType, LiteKey, LiteProps } from "./types";

export const ROOT_ELEMENT = "ROOT";

export type LiteEffectTag = "PLACEMENT" | "UPDATE" | "DELETION";

export type LiteStateAction = (prevState: unknown) => unknown;

export type LiteHook = {
  state: unknown;
  queue: LiteStateAction[];
};

export interface LiteFiberNode {
  type: LiteElementType | typeof ROOT_ELEMENT;
  key: LiteKey | null;
  props: LiteProps;
  dom: Node | null;
  parent: LiteFiberNode | null;
  child: LiteFiberNode | null;
  sibling: LiteFiberNode | null;
  alternate: LiteFiberNode | null;
  effectTag?: LiteEffectTag;
  hooks?: LiteHook[];
}
