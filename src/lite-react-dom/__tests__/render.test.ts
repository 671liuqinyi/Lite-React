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

  it("renders a function component on first mount", () => {
    const container = document.createElement("div");

    function App(props: { title: string }) {
      return createElement(
        "section",
        { id: "lite-root", className: "demo-card" },
        createElement("h1", null, props.title),
        createElement("p", null, "Function component mount"),
      );
    }

    render(createElement(App, { title: "lite-react" }), container);

    expect(container.innerHTML).toBe(
      '<section id="lite-root" class="demo-card"><h1>lite-react</h1><p>Function component mount</p></section>',
    );
  });
});
