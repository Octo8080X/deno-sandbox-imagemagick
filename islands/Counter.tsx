import type { Signal } from "@preact/signals";
import { Button } from "../components/Button.tsx";

interface CounterProps {
  count: Signal<number>;
}

export default function Counter(props: CounterProps) {
  return (
    <div class="flex flex-col items-center gap-3">
      <div class="join shadow">
        <Button
          id="decrement"
          class="btn-secondary join-item"
          onClick={() => props.count.value -= 1}
        >
          -1
        </Button>
        <span class="join-item badge badge-lg bg-base-200 text-base-content">
          {props.count.value}
        </span>
        <Button
          id="increment"
          class="btn-primary join-item"
          onClick={() => props.count.value += 1}
        >
          +1
        </Button>
      </div>
      <p class="text-sm text-base-content/70">Tap to change the count</p>
    </div>
  );
}
