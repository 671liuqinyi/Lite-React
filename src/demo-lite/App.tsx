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

const App: LiteFunctionComponent<AppProps> = ({ title }) => {
  const [count, setCount] = useState(0);

  return (
    <section id="lite-root" className="demo-card">
      <h1>{title}</h1>
      <p>{"Event binding + root rerender + useState"}</p>
      <button onClick={() => setCount((value) => value + 1)}>
        {`Count is ${count}`}
      </button>
    </section>
  );
};

export default App;
