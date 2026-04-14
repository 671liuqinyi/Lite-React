/** @jsxRuntime classic */
/** @jsx createElement */
import {
  createElement,
  type LiteFunctionComponent,
  useEffect,
  useRef,
  useState,
} from "../lite-react";

// The classic JSX pragma consumes this binding during TSX compilation.
void createElement;

type AppProps = {
  title: string;
};

type TodoFilter = "all" | "active" | "done";

type Todo = {
  id: string;
  title: string;
  note: string;
  done: boolean;
};

const pageStyle =
  "min-height:100vh;padding:32px;background:linear-gradient(180deg,#f7f3ec 0%,#ece2d5 100%);color:#2f251d;font-family:'Segoe UI',sans-serif;";
const introStyle =
  "max-width:980px;margin:0 auto 18px;line-height:1.6;font-size:15px;";
const panelStyle =
  "max-width:980px;margin:0 auto;padding:24px;border-radius:28px;border:1px solid rgba(79,61,44,0.12);background:rgba(255,252,246,0.92);box-shadow:0 22px 60px rgba(88,66,48,0.14);";
const panelGridStyle =
  "display:grid;grid-template-columns:minmax(0,2fr) minmax(240px,1fr);gap:20px;align-items:start;";
const sectionStyle = "display:flex;flex-direction:column;gap:14px;";
const controlRowStyle =
  "display:flex;flex-wrap:wrap;gap:10px;align-items:center;";
const ghostButtonStyle =
  "padding:10px 14px;border-radius:999px;border:1px solid rgba(87,68,50,0.18);background:#fffaf3;color:#392d22;font-size:13px;cursor:pointer;";
const solidButtonStyle =
  "padding:10px 16px;border-radius:999px;border:1px solid #523f30;background:#523f30;color:#fffaf4;font-size:13px;cursor:pointer;";
const listStyle =
  "list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:12px;";
const emptyStateStyle =
  "padding:16px;border-radius:18px;border:1px dashed rgba(82,63,48,0.22);background:rgba(255,250,243,0.8);font-size:14px;color:#6b5a4b;";
const asideStyle =
  "display:flex;flex-direction:column;gap:12px;padding:18px;border-radius:22px;background:linear-gradient(180deg,#fff8ee 0%,#f4eadf 100%);border:1px solid rgba(82,63,48,0.12);";
const hintListStyle =
  "margin:0;padding-left:18px;display:flex;flex-direction:column;gap:10px;line-height:1.5;font-size:13px;color:#5d4d40;";

const initialTodos: Todo[] = [
  {
    id: "todo-1",
    title: "Inspect commit snapshot",
    note: "Toggle this one first to produce an UPDATE tag in the panel.",
    done: false,
  },
  {
    id: "todo-2",
    title: "Add a new keyed item",
    note: "Use the add button to create a fresh placement in the Fiber tree.",
    done: false,
  },
  {
    id: "todo-3",
    title: "Clear a completed branch",
    note: "Finish one item, then clear completed to observe a deletion path.",
    done: false,
  },
];

const todoTemplates = [
  "Trace sibling reorder",
  "Watch keyed reuse",
  "Spot a passive effect",
  "Collapse a filtered branch",
];

const filterLabels: Record<TodoFilter, string> = {
  all: "All",
  active: "Active",
  done: "Done",
};

const Panel: LiteFunctionComponent<{ title: string }> = ({
  title,
  children,
}) => {
  return (
    <section style={panelStyle}>
      <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:18px;">
        <p style="margin:0;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:#8c725c;">
          {"fiber playground"}
        </p>
        <h1 style="margin:0;font-size:34px;line-height:1.05;">{title}</h1>
      </div>
      <div style={panelGridStyle}>{children ?? []}</div>
    </section>
  );
};

const StatChip: LiteFunctionComponent<{ label: string; value: string }> = ({
  label,
  value,
}) => {
  return (
    <div style="min-width:116px;padding:12px 14px;border-radius:18px;background:#fffdf9;border:1px solid rgba(82,63,48,0.12);">
      <p style="margin:0 0 6px;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#8c725c;">
        {label}
      </p>
      <strong style="font-size:20px;color:#2f251d;">{value}</strong>
    </div>
  );
};

const TodoItem: LiteFunctionComponent<{
  todo: Todo;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
}> = ({ todo, onToggle, onRemove }) => {
  const cardStyle = todo.done
    ? "display:flex;justify-content:space-between;gap:12px;padding:16px 18px;border-radius:22px;border:1px solid rgba(75,120,92,0.18);background:rgba(229,246,236,0.85);"
    : "display:flex;justify-content:space-between;gap:12px;padding:16px 18px;border-radius:22px;border:1px solid rgba(82,63,48,0.12);background:#fffdf9;";
  const titleStyle = todo.done
    ? "margin:0 0 6px;font-size:18px;text-decoration:line-through;color:#56705f;"
    : "margin:0 0 6px;font-size:18px;color:#2f251d;";

  return (
    <li
      data-role="todo-item"
      data-todo-id={todo.id}
      data-state={todo.done ? "done" : "active"}
      style={cardStyle}
    >
      <div style="display:flex;flex-direction:column;gap:6px;min-width:0;">
        <h2 style={titleStyle}>{todo.title}</h2>
        <p style="margin:0;font-size:13px;line-height:1.5;color:#6b5a4b;">
          {todo.note}
        </p>
      </div>
      <div style="display:flex;flex-direction:column;gap:8px;align-items:flex-end;">
        <button
          data-action={`toggle-${todo.id}`}
          style={todo.done ? ghostButtonStyle : solidButtonStyle}
          onClick={() => onToggle(todo.id)}
        >
          {todo.done ? "Reopen" : "Mark done"}
        </button>
        <button
          data-action={`remove-${todo.id}`}
          style={ghostButtonStyle}
          onClick={() => onRemove(todo.id)}
        >
          {"Remove"}
        </button>
      </div>
    </li>
  );
};

const TodoShowcase: LiteFunctionComponent = () => {
  const [todos, setTodos] = useState<Todo[]>(initialTodos);
  const [filter, setFilter] = useState<TodoFilter>("all");
  const [completedFirst, setCompletedFirst] = useState(false);
  const nextIdRef = useRef(initialTodos.length + 1);

  useEffect(() => {
    const openCount = todos.filter((todo) => !todo.done).length;
    const previousTitle = document.title;

    document.title = `lite-react todos (${openCount} open)`;

    return () => {
      document.title = previousTitle;
    };
  }, [todos]);

  function addTodo() {
    const nextId = nextIdRef.current;
    const template = todoTemplates[(nextId - 1) % todoTemplates.length];

    nextIdRef.current += 1;
    setTodos((items) => [
      {
        id: `todo-${nextId}`,
        title: `${template} #${nextId}`,
        note: "This new row should show up as a placement in the devtools tree.",
        done: false,
      },
      ...items,
    ]);
  }

  function toggleTodo(targetId: string) {
    setTodos((items) =>
      items.map((todo) =>
        todo.id === targetId ? { ...todo, done: !todo.done } : todo,
      ),
    );
  }

  function removeTodo(targetId: string) {
    setTodos((items) => items.filter((todo) => todo.id !== targetId));
  }

  function clearCompleted() {
    setTodos((items) => items.filter((todo) => !todo.done));
  }

  const activeCount = todos.filter((todo) => !todo.done).length;
  const doneCount = todos.length - activeCount;

  // 这里故意把筛选和排序放在渲染阶段计算，方便在 devtools 中观察 keyed Fiber 的复用与重排。
  const visibleTodos = todos.filter((todo) => {
    if (filter === "active") {
      return !todo.done;
    }

    if (filter === "done") {
      return todo.done;
    }

    return true;
  });
  const orderedTodos = completedFirst
    ? [...visibleTodos].sort(
        (left, right) => Number(right.done) - Number(left.done),
      )
    : visibleTodos;

  return (
    <section style={sectionStyle}>
      <div style={controlRowStyle}>
        <StatChip label="Total" value={String(todos.length)} />
        <StatChip label="Open" value={String(activeCount)} />
        <StatChip label="Done" value={String(doneCount)} />
      </div>

      <section style="display:flex;flex-direction:column;gap:12px;padding:18px;border-radius:24px;background:rgba(255,251,245,0.8);border:1px solid rgba(82,63,48,0.1);">
        <div style={controlRowStyle}>
          <button
            data-action="add-todo"
            style={solidButtonStyle}
            onClick={addTodo}
          >
            {"Add sample todo"}
          </button>
          <button
            data-action="toggle-sort"
            style={ghostButtonStyle}
            onClick={() => setCompletedFirst((value) => !value)}
          >
            {completedFirst ? "Original order" : "Done first"}
          </button>
          <button
            data-action="clear-completed"
            style={ghostButtonStyle}
            onClick={clearCompleted}
          >
            {"Clear completed"}
          </button>
        </div>

        <div style={controlRowStyle}>
          {(["all", "active", "done"] as TodoFilter[]).map((option) => (
            <button
              key={option}
              data-action={`filter-${option}`}
              style={filter === option ? solidButtonStyle : ghostButtonStyle}
              onClick={() => setFilter(option)}
            >
              {filterLabels[option]}
            </button>
          ))}
        </div>

        <ol data-role="todo-list" style={listStyle}>
          {orderedTodos.length > 0 ? (
            orderedTodos.map((todo) => (
              <TodoItem
                key={todo.id}
                todo={todo}
                onToggle={toggleTodo}
                onRemove={removeTodo}
              />
            ))
          ) : (
            <li style={emptyStateStyle}>{"No todos in this view."}</li>
          )}
        </ol>
      </section>
    </section>
  );
};

const DevtoolsGuide: LiteFunctionComponent = () => {
  return (
    <aside style={asideStyle}>
      <h2 style="margin:0;font-size:18px;color:#2f251d;">
        {"What to try in devtools"}
      </h2>
      <ul style={hintListStyle}>
        <li>{"Add sample todo: creates a fresh PLACEMENT branch."}</li>
        <li>
          {"Mark done: updates one keyed row without replacing siblings."}
        </li>
        <li>
          {"Filter Done: temporarily hides active rows and shrinks the tree."}
        </li>
        <li>
          {"Clear completed: removes a subtree and shows DELETION effects."}
        </li>
        <li>
          {"Done first: reorders keyed siblings so you can inspect reuse."}
        </li>
      </ul>
      <p style="margin:0;font-size:13px;line-height:1.6;color:#6b5a4b;">
        {
          "The todo board uses state, ref, and effect hooks together, so the devtools panel can show a richer Fiber graph than the earlier counter demos."
        }
      </p>
    </aside>
  );
};

const App: LiteFunctionComponent<AppProps> = ({ title }) => {
  return (
    <section id="lite-root" style={pageStyle}>
      <div style={introStyle}>
        <p style="margin:0;">
          {
            "Use this todo board to trigger placements, updates, deletions, filters, and keyed reorders, then watch the lite-react devtools panel update after each commit."
          }
        </p>
      </div>
      <Panel title={`${title} todo lab`}>
        <TodoShowcase />
        <DevtoolsGuide />
      </Panel>
    </section>
  );
};

export default App;
