import { afterEach, describe, expect, it } from "vitest";
import {
  createElement,
  type LiteFunctionComponent,
  useEffect,
  useRef,
  useState,
} from "../../lite-react";
import { render } from "../index";
import {
  setScheduleIdleWorkForTest,
  type LiteIdleDeadline,
  type LiteIdleWorkCallback,
} from "../scheduler";

function createDeadline(budget: number): LiteIdleDeadline {
  let remaining = budget;

  return {
    didTimeout: false,
    timeRemaining() {
      const current = remaining;

      remaining -= 1;
      return current;
    },
  };
}

afterEach(() => {
  setScheduleIdleWorkForTest(null);
});

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

  it("binds onClick handlers to DOM elements", () => {
    const container = document.createElement("div");
    let clicked = 0;

    render(
      createElement(
        "button",
        {
          onClick: () => {
            clicked += 1;
          },
        },
        "click me",
      ),
      container,
    );

    const button = container.querySelector("button");

    if (!button) {
      throw new Error("Expected a button element");
    }

    button.click();

    expect(clicked).toBe(1);
  });

  it("renders the initial useState value inside a function component", () => {
    const container = document.createElement("div");

    function Counter() {
      const [count] = useState(0);

      return createElement("button", null, `Count is ${count}`);
    }

    render(createElement(Counter, null), container);

    expect(container.innerHTML).toBe("<button>Count is 0</button>");
  });

  it("rerenders the root when setState is called from an onClick handler", () => {
    const container = document.createElement("div");

    function Counter() {
      const [count, setCount] = useState(0);

      return createElement(
        "button",
        {
          onClick: () => setCount((value) => value + 1),
        },
        `Count is ${count}`,
      );
    }

    render(createElement(Counter, null), container);

    const button = container.querySelector("button");

    if (!button) {
      throw new Error("Expected a button element");
    }

    button.click();

    expect(container.innerHTML).toBe("<button>Count is 1</button>");
  });

  it("passes JSX children into function component props", () => {
    const container = document.createElement("div");

    const Panel: LiteFunctionComponent<{ title: string }> = ({
      title,
      children,
    }) => {
      return createElement(
        "section",
        { className: "panel" },
        createElement("h2", null, title),
        children ?? [],
      );
    };

    render(
      createElement(
        Panel,
        { title: "Counters" },
        createElement("span", null, "inside child"),
      ),
      container,
    );

    expect(container.innerHTML).toBe(
      '<section class="panel"><h2>Counters</h2><span>inside child</span></section>',
    );
  });

  it("renders components nested inside other components", () => {
    const container = document.createElement("div");

    const Label: LiteFunctionComponent<{ text: string }> = ({ text }) => {
      return createElement("span", null, text);
    };

    const Layout: LiteFunctionComponent = ({ children }) => {
      return createElement("div", { className: "layout" }, children ?? []);
    };

    const App: LiteFunctionComponent = () => {
      return createElement(
        Layout,
        null,
        createElement(Label, { text: "nested component" }),
      );
    };

    render(createElement(App, null), container);

    expect(container.innerHTML).toBe(
      '<div class="layout"><span>nested component</span></div>',
    );
  });

  it("keeps state isolated between two instances of the same component type", () => {
    const container = document.createElement("div");

    const Counter: LiteFunctionComponent<{ label: string }> = ({ label }) => {
      const [count, setCount] = useState(0);

      return createElement(
        "button",
        {
          onClick: () => setCount((value) => value + 1),
        },
        `${label}:${count}`,
      );
    };

    const App: LiteFunctionComponent = () => {
      return createElement(
        "section",
        null,
        createElement(Counter, { label: "A" }),
        createElement(Counter, { label: "B" }),
      );
    };

    render(createElement(App, null), container);

    const buttons = container.querySelectorAll("button");

    if (buttons.length !== 2) {
      throw new Error("Expected two button elements");
    }

    buttons[0]?.click();

    expect(container.innerHTML).toBe(
      "<section><button>A:1</button><button>B:0</button></section>",
    );
  });

  it("reuses the same host DOM node when rerendering the same type", () => {
    const container = document.createElement("div");

    render(
      createElement("button", { className: "idle" }, "Count 0"),
      container,
    );

    const firstButton = container.querySelector("button");

    if (!firstButton) {
      throw new Error("Expected a button element");
    }

    render(
      createElement("button", { className: "active" }, "Count 1"),
      container,
    );

    const secondButton = container.querySelector("button");

    expect(secondButton).toBe(firstButton);
    expect(secondButton?.className).toBe("active");
    expect(secondButton?.textContent).toBe("Count 1");
  });

  it("keeps the same button DOM node during useState updates", () => {
    const container = document.createElement("div");

    const ToggleButton: LiteFunctionComponent = () => {
      const [active, setActive] = useState(false);

      return createElement(
        "button",
        {
          className: active ? "active" : "idle",
          onClick: () => setActive((value) => !value),
        },
        active ? "active" : "idle",
      );
    };

    render(createElement(ToggleButton, null), container);

    const firstButton = container.querySelector("button");

    if (!firstButton) {
      throw new Error("Expected a button element");
    }

    firstButton.click();

    const secondButton = container.querySelector("button");

    expect(secondButton).toBe(firstButton);
    expect(secondButton?.className).toBe("active");
    expect(secondButton?.textContent).toBe("active");
  });

  it("removes trailing children while keeping unaffected siblings", () => {
    const container = document.createElement("div");

    const App: LiteFunctionComponent<{ showExtra: boolean }> = ({
      showExtra,
    }) => {
      return createElement(
        "section",
        null,
        createElement("button", null, "keep"),
        showExtra ? createElement("span", null, "extra") : null,
      );
    };

    render(createElement(App, { showExtra: true }), container);

    const firstButton = container.querySelector("button");

    if (!firstButton) {
      throw new Error("Expected a button element");
    }

    render(createElement(App, { showExtra: false }), container);

    const secondButton = container.querySelector("button");

    expect(secondButton).toBe(firstButton);
    expect(container.querySelector("span")).toBeNull();
    expect(container.innerHTML).toBe("<section><button>keep</button></section>");
  });

  it("does not forward key onto host DOM attributes", () => {
    const container = document.createElement("div");

    render(
      createElement("button", { key: "cta", id: "demo" }, "click"),
      container,
    );

    const button = container.querySelector("button");

    if (!button) {
      throw new Error("Expected a button element");
    }

    expect(button.getAttribute("key")).toBeNull();
  });

  it("preserves keyed component state when a list is reordered", () => {
    const container = document.createElement("div");

    const Counter: LiteFunctionComponent<{ label: string }> = ({ label }) => {
      const [count, setCount] = useState(0);

      return createElement(
        "button",
        {
          onClick: () => setCount((value) => value + 1),
        },
        `${label}:${count}`,
      );
    };

    const List: LiteFunctionComponent<{
      items: Array<{ id: string; label: string }>;
    }> = ({ items }) => {
      return createElement(
        "section",
        null,
        items.map((item) =>
          createElement(Counter, {
            key: item.id,
            label: item.label,
          }),
        ),
      );
    };

    render(
      createElement(List, {
        items: [
          { id: "a", label: "A" },
          { id: "b", label: "B" },
        ],
      }),
      container,
    );

    const firstRenderButtons = container.querySelectorAll("button");
    const firstAButton = firstRenderButtons[0];

    if (!firstAButton) {
      throw new Error("Expected the first counter button");
    }

    firstAButton.click();

    render(
      createElement(List, {
        items: [
          { id: "b", label: "B" },
          { id: "a", label: "A" },
        ],
      }),
      container,
    );

    const secondRenderButtons = container.querySelectorAll("button");

    expect(secondRenderButtons[0]?.textContent).toBe("B:0");
    expect(secondRenderButtons[1]?.textContent).toBe("A:1");
    expect(secondRenderButtons[1]).toBe(firstAButton);
  });

  it("reuses keyed host siblings across insertions and deletions", () => {
    const container = document.createElement("div");

    function renderList(items: string[]) {
      render(
        createElement(
          "section",
          null,
          items.map((item) => createElement("span", { key: item }, item)),
        ),
        container,
      );
    }

    renderList(["A", "B"]);

    const firstPassSpans = container.querySelectorAll("span");
    const originalB = firstPassSpans[1];

    renderList(["X", "A", "B"]);

    const secondPassSpans = container.querySelectorAll("span");

    expect(Array.from(secondPassSpans).map((node) => node.textContent)).toEqual(
      ["X", "A", "B"],
    );
    expect(secondPassSpans[2]).toBe(originalB);

    renderList(["X", "B"]);

    const thirdPassSpans = container.querySelectorAll("span");

    expect(Array.from(thirdPassSpans).map((node) => node.textContent)).toEqual([
      "X",
      "B",
    ]);
    expect(thirdPassSpans[1]).toBe(originalB);
  });

  it("splits unfinished render work across multiple idle callbacks", () => {
    const callbacks: LiteIdleWorkCallback[] = [];
    const container = document.createElement("div");

    setScheduleIdleWorkForTest((callback) => {
      callbacks.push(callback);
    });

    render(
      createElement(
        "section",
        null,
        createElement("h1", null, "title"),
        createElement("p", null, "first"),
        createElement("p", null, "second"),
      ),
      container,
    );

    expect(container.innerHTML).toBe("");
    expect(callbacks).toHaveLength(1);

    callbacks.shift()?.(createDeadline(2));

    expect(container.innerHTML).toBe("");
    expect(callbacks).toHaveLength(1);

    callbacks.shift()?.(createDeadline(50));

    expect(container.innerHTML).toBe(
      "<section><h1>title</h1><p>first</p><p>second</p></section>",
    );
  });

  it("schedules state updates through idle callbacks when work is sliced", () => {
    const callbacks: LiteIdleWorkCallback[] = [];
    const container = document.createElement("div");

    setScheduleIdleWorkForTest((callback) => {
      callbacks.push(callback);
    });

    const Counter: LiteFunctionComponent = () => {
      const [count, setCount] = useState(0);

      return createElement(
        "button",
        {
          onClick: () => setCount((value) => value + 1),
        },
        `Count is ${count}`,
      );
    };

    render(createElement(Counter, null), container);

    callbacks.shift()?.(createDeadline(20));

    const button = container.querySelector("button");

    if (!button) {
      throw new Error("Expected a button element");
    }

    button.click();

    expect(container.innerHTML).toBe("<button>Count is 0</button>");
    expect(callbacks).toHaveLength(1);

    callbacks.shift()?.(createDeadline(1));

    expect(container.innerHTML).toBe("<button>Count is 0</button>");
    expect(callbacks).toHaveLength(1);

    callbacks.shift()?.(createDeadline(20));

    expect(container.innerHTML).toBe("<button>Count is 1</button>");
  });

  it("runs useEffect only after the DOM commit finishes", () => {
    const container = document.createElement("div");
    const snapshots: string[] = [];

    const App: LiteFunctionComponent = () => {
      useEffect(() => {
        snapshots.push(container.innerHTML);
      }, []);

      return createElement("section", null, "effect");
    };

    render(createElement(App, null), container);

    expect(container.innerHTML).toBe("<section>effect</section>");
    expect(snapshots).toEqual(["<section>effect</section>"]);
  });

  it("reruns useEffect only when deps change and calls cleanup first", () => {
    const container = document.createElement("div");
    const events: string[] = [];

    const App: LiteFunctionComponent<{ value: number }> = ({ value }) => {
      useEffect(() => {
        events.push(`effect:${value}`);

        return () => {
          events.push(`cleanup:${value}`);
        };
      }, [value]);

      return createElement("span", null, String(value));
    };

    render(createElement(App, { value: 1 }), container);
    render(createElement(App, { value: 1 }), container);
    render(createElement(App, { value: 2 }), container);

    expect(events).toEqual(["effect:1", "cleanup:1", "effect:2"]);
  });

  it("runs useEffect cleanup when a component is unmounted", () => {
    const container = document.createElement("div");
    const events: string[] = [];

    const App: LiteFunctionComponent = () => {
      useEffect(() => {
        events.push("mount");

        return () => {
          events.push("cleanup");
        };
      }, []);

      return createElement("section", null, "demo");
    };

    render(createElement(App, null), container);
    render(createElement("div", null, "gone"), container);

    expect(events).toEqual(["mount", "cleanup"]);
  });

  it("keeps the same ref object across rerenders", () => {
    const container = document.createElement("div");
    const seenRefs: Array<{ current: number }> = [];

    /* eslint-disable react-hooks/refs */
    const App: LiteFunctionComponent = () => {
      const [count, setCount] = useState(0);
      const valueRef = useRef(0);

      useEffect(() => {
        seenRefs.push(valueRef);
      }, [count]);

      return createElement(
        "button",
        {
          onClick: () => {
            valueRef.current += 1;
            setCount(valueRef.current);
          },
        },
        `count:${count}`,
      );
    };
    /* eslint-enable react-hooks/refs */

    render(createElement(App, null), container);

    const button = container.querySelector("button");

    if (!button) {
      throw new Error("Expected a button element");
    }

    button.click();

    expect(container.innerHTML).toBe("<button>count:1</button>");
    expect(seenRefs).toHaveLength(2);
    expect(seenRefs[1]).toBe(seenRefs[0]);
    expect(seenRefs[1]?.current).toBe(1);
  });

  it("does not rerender when ref.current changes by itself", () => {
    const container = document.createElement("div");

    /* eslint-disable react-hooks/refs */
    const App: LiteFunctionComponent = () => {
      const clickCountRef = useRef(0);

      return createElement(
        "button",
        {
          onClick: () => {
            clickCountRef.current += 1;
          },
        },
        "stable",
      );
    };
    /* eslint-enable react-hooks/refs */

    render(createElement(App, null), container);

    const button = container.querySelector("button");

    if (!button) {
      throw new Error("Expected a button element");
    }

    button.click();

    expect(container.innerHTML).toBe("<button>stable</button>");
  });

  it("waits until the final commit before running useEffect in sliced work", () => {
    const callbacks: LiteIdleWorkCallback[] = [];
    const container = document.createElement("div");
    const effects: string[] = [];

    setScheduleIdleWorkForTest((callback) => {
      callbacks.push(callback);
    });

    const App: LiteFunctionComponent = () => {
      useEffect(() => {
        effects.push(container.innerHTML);
      }, []);

      return createElement(
        "section",
        null,
        createElement("h1", null, "title"),
        createElement("p", null, "body"),
      );
    };

    render(createElement(App, null), container);

    callbacks.shift()?.(createDeadline(2));

    expect(container.innerHTML).toBe("");
    expect(effects).toEqual([]);

    callbacks.shift()?.(createDeadline(50));

    expect(effects).toEqual([
      "<section><h1>title</h1><p>body</p></section>",
    ]);
  });
});
