import { describe, expect, it } from "vitest";
import { createElement } from "../../lite-react";
import { render } from "../index";

describe("render", () => {
  it("renders nested native elements into a container", () => {
    const container = document.createElement("div");
    const vnode = createElement(
      "section",
      { id: "card", className: "demo-card" },
      createElement("h1", null, "lite-react"),
      createElement("p", null, "JSX -> vnode -> DOM"),
    );

    render(vnode, container);

    expect(container.innerHTML).toBe(
      '<section id="card" class="demo-card"><h1>lite-react</h1><p>JSX -&gt; vnode -&gt; DOM</p></section>',
    );
  });

  it("replaces the container contents on each render", () => {
    const container = document.createElement("div");
    container.innerHTML = "<span>stale</span>";

    render(createElement("div", null, "fresh"), container);

    expect(container.innerHTML).toBe("<div>fresh</div>");
  });
});
