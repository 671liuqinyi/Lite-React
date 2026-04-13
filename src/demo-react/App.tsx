import { createElement, useEffect, useRef, useState } from "react";

// The classic JSX pragma consumes this binding during TSX compilation.
void createElement;

type AppProps = {
  title: string;
};

const keyedItems = [
  { id: "a", label: "A" },
  { id: "b", label: "B" },
  { id: "c", label: "C" },
];

const largeItems = Array.from({ length: 120 }, (_, index) => ({
  id: `item-${index}`,
  label: `Item ${index}`,
}));

const Panel: React.FC<{ title: string; children: React.ReactNode }> = ({
  title,
  children,
}) => {
  return (
    <section className="demo-card">
      <h1>{title}</h1>
      <div className="demo-row">{children ?? []}</div>
    </section>
  );
};

const Counter: React.FC<{ label: string }> = ({ label }) => {
  const [count, setCount] = useState(0);

  return (
    <button
      className={count > 0 ? "active" : "idle"}
      onClick={() => setCount((value) => value + 1)}
    >
      {`${label}:${count}`}
    </button>
  );
};

const KeyedCounterList: React.FC = () => {
  const [reversed, setReversed] = useState(false);
  const items = reversed ? [...keyedItems].reverse() : keyedItems;

  return (
    <section className="demo-stack">
      <button onClick={() => setReversed((value) => !value)}>
        {reversed ? "restore order" : "reverse order"}
      </button>
      <div className="demo-row">
        {items.map((item) => (
          <Counter key={item.id} label={item.label} />
        ))}
      </div>
    </section>
  );
};

const SliceDemo: React.FC = () => {
  const [expanded, setExpanded] = useState(false);
  const items = expanded ? largeItems : largeItems.slice(0, 6);

  return (
    <section className="demo-stack">
      <button onClick={() => setExpanded((value) => !value)}>
        {expanded ? "render small list" : "render large list"}
      </button>
      <p>
        {
          "In browsers with requestIdleCallback, this update can be processed in slices."
        }
      </p>
      <ul>
        {items.map((item) => (
          <li key={item.id}>{item.label}</li>
        ))}
      </ul>
    </section>
  );
};

/* eslint-disable react-hooks/refs */
const EffectRefDemo: React.FC = () => {
  const [count, setCount] = useState(0);
  const previousCountRef = useRef<number | null>(null);
  const cleanupCountRef = useRef(0);

  useEffect(() => {
    previousCountRef.current = count;

    // useEffect 的 cleanup 会在下一次依赖变更前执行。
    return () => {
      cleanupCountRef.current += 1;
    };
  }, [count]);

  return (
    <section className="demo-stack">
      {/* 教学示例里故意渲染 ref 快照，方便观察 effect/ref 的“晚一拍”行为。 */}
      <p>
        {
          "useEffect writes refs after commit, so these values appear one render later on purpose."
        }
      </p>
      <button onClick={() => setCount((value) => value + 1)}>
        {`count: ${count}`}
      </button>
      <p>{`previous count from ref: ${previousCountRef.current ?? "none"}`}</p>
      <p>{`cleanup count from ref: ${cleanupCountRef.current}`}</p>
    </section>
  );
};
/* eslint-enable react-hooks/refs */

const App: React.FC<AppProps> = ({ title }) => {
  return (
    <section id="lite-root">
      <p>{"scheduler + time slicing + resumable fiber work"}</p>
      <Panel title={title}>
        <KeyedCounterList />
        <SliceDemo />
        <EffectRefDemo />
      </Panel>
    </section>
  );
};

export default App;
