import type {
  LiteEffectCallback,
  LiteEffectCleanup,
  LiteEffectDeps,
  LiteElementType,
  LiteKey,
  LiteProps,
  LiteRefObject,
} from "./types";

export const ROOT_ELEMENT = "ROOT";

export type LiteEffectTag = "PLACEMENT" | "UPDATE" | "DELETION";
export type LiteHookKind = "STATE" | "EFFECT" | "REF";

export type LiteStateAction = (prevState: unknown) => unknown;

type LiteHookBase = {
  kind: LiteHookKind;
  next: LiteHook | null;
};

export type LiteStateHook = LiteHookBase & {
  kind: "STATE";
  state: unknown;
  queue: LiteStateAction[];
};

export type LiteEffectHook = LiteHookBase & {
  kind: "EFFECT";
  deps: LiteEffectDeps;
  effect: LiteEffectCallback;
  cleanup?: LiteEffectCleanup;
  shouldRun: boolean;
};

export type LiteRefHook = LiteHookBase & {
  kind: "REF";
  ref: LiteRefObject<unknown>;
};

export type LiteHook = LiteStateHook | LiteEffectHook | LiteRefHook;

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
  memoizedState: LiteHook | null;
}
