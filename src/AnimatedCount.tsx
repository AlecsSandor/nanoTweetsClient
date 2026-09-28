import { useEffect, useRef, useState } from 'react';

interface AnimatedCountProps {
  /** The final value to display, e.g. "128". Non-numeric values are shown as-is. */
  value: string;
  /** How long the count-up takes, in ms. */
  durationMs?: number;
  /** Delay before the count-up starts, in ms — lets it sync with the item's entrance. */
  delayMs?: number;
}

export default function AnimatedCount({ value, durationMs = 650, delayMs = 0 }: AnimatedCountProps) {
  const target = Number(value);
  const isNumeric = value.trim() !== '' && Number.isFinite(target);

  const [display, setDisplay] = useState(isNumeric ? 0 : target);
  const rafRef = useRef<number | undefined>(undefined);
  const timeoutRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!isNumeric) return;

    let start: number | null = null;

    const tick = (ts: number) => {
      if (start === null) start = ts;
      const progress = Math.min(1, (ts - start) / durationMs);
      const eased = 1 - (1 - progress) ** 3; // ease-out cubic
      setDisplay(Math.round(eased * target));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    timeoutRef.current = window.setTimeout(() => {
      rafRef.current = requestAnimationFrame(tick);
    }, delayMs);

    return () => {
      window.clearTimeout(timeoutRef.current);
      if (rafRef.current !== undefined) cancelAnimationFrame(rafRef.current);
    };
    // Only run once per mount — this animates an item's entrance, not later value changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <>{isNumeric ? display : value}</>;
}
