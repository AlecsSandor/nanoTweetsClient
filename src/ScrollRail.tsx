import { useEffect, useRef, useState, type CSSProperties, type RefObject } from 'react';
import './ScrollRail.css';

interface ScrollRailProps {
  /** The scrollable element to track. If its content doesn't overflow
   *  (nothing to scroll), the dot just sits at the top. */
  targetRef: RefObject<HTMLDivElement>;
}

export default function ScrollRail({ targetRef }: ScrollRailProps) {
  const [progress, setProgress] = useState(0);
  const rafRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const el = targetRef.current;
    if (!el) return;

    const measure = () => {
      const max = el.scrollHeight - el.clientHeight;
      const p = max > 0 ? el.scrollTop / max : 0;
      setProgress(Math.min(1, Math.max(0, p)));
    };

    const onScroll = () => {
      if (rafRef.current) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = undefined;
        measure();
      });
    };

    measure();
    el.addEventListener('scroll', onScroll, { passive: true });

    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(el);

    return () => {
      el.removeEventListener('scroll', onScroll);
      resizeObserver.disconnect();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [targetRef]);

  return (
    <div className="scroll-rail">
      <div className="scroll-rail-line" />
      <div
        className="scroll-rail-dot"
        style={{ '--rail-progress': progress } as CSSProperties}
      />
    </div>
  );
}
