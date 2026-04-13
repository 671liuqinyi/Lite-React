/** @jsxRuntime classic */
/** @jsx createElement */
import {
  createElement,
  type LiteFunctionComponent,
  useState,
} from "../lite-react";

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

const Panel: LiteFunctionComponent<{ title: string }> = ({
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

const Counter: LiteFunctionComponent<{ label: string }> = ({ label }) => {
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

const KeyedCounterList: LiteFunctionComponent = () => {
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

const SliceDemo: LiteFunctionComponent = () => {
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

const App: LiteFunctionComponent<AppProps> = ({ title }) => {
  return (
    <section id="lite-root">
      <p>{"scheduler + time slicing + resumable fiber work"}</p>
      <Panel title={title}>
        <KeyedCounterList />
        <SliceDemo />
      </Panel>
    </section>
  );
};

export default App;
