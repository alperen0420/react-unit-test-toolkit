import { useState } from 'react';

type CounterProps = {
  initialValue?: number;
  max?: number;
};

export function Counter({ initialValue = 0, max = 10 }: CounterProps) {
  const [count, setCount] = useState(initialValue);
  const limitReached = count >= max;
  return (
    <section>
      <output role="status" aria-label="count">{count}</output>
      <button disabled={limitReached} onClick={() => setCount(n => n + 1)}>Increase</button>
      {limitReached && <p>Maximum reached</p>}
    </section>
  );
}
