declare namespace JSX {
  type Element = import("./types").LiteVNode;

  interface ElementChildrenAttribute {
    children: unknown;
  }

  interface IntrinsicElements {
    [elementName: string]: Record<string, unknown>;
  }
}
