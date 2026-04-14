import { describe, expect, it } from "vitest";
import { createElement } from "../../lite-react";
import { render } from "../../lite-react-dom";
import App from "../App.tsx";

function getButton(container: HTMLElement, action: string) {
  const button = container.querySelector(`[data-action='${action}']`);

  if (!(button instanceof HTMLButtonElement)) {
    throw new Error(`Expected button ${action} to exist`);
  }

  return button;
}

function getTodoItems(container: HTMLElement) {
  return Array.from(container.querySelectorAll("[data-role='todo-item']"));
}

describe("demo-lite todo showcase", () => {
  it("adds, toggles, filters, and clears todos", () => {
    const container = document.createElement("div");

    render(createElement(App, { title: "lite-react" }), container);

    expect(getTodoItems(container)).toHaveLength(3);

    getButton(container, "add-todo").click();
    expect(getTodoItems(container)).toHaveLength(4);

    getButton(container, "toggle-todo-1").click();

    const toggledTodo = container.querySelector("[data-todo-id='todo-1']");

    expect(toggledTodo?.getAttribute("data-state")).toBe("done");

    getButton(container, "filter-done").click();
    expect(getTodoItems(container)).toHaveLength(1);

    getButton(container, "clear-completed").click();
    expect(getTodoItems(container)).toHaveLength(0);
    expect(container.textContent).toContain("No todos in this view.");
  });
});
