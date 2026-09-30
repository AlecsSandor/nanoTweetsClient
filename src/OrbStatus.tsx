import { useEffect, useRef, useState } from 'react';
import { ThinkingOrb, type OrbState } from './lib/thinking-orbs';
import './OrbStatus.css';

// Which of the nine orb animations plays while a summary is being generated
// vs. the rest of the time. Swap freely — see OrbState in lib/thinking-orbs.
const THINKING_STATE: OrbState = 'working';
const IDLE_STATE: OrbState = 'breathing';

const TYPE_SPEED_MS = 18;

interface OrbStatusProps {
  /** The latest summary (empty until the first one arrives). */
  text: string;
  /** A summary request is pending → thinking animation. */
  pending: boolean;
  /** The last summary request failed. */
  failed?: boolean;
}

function fallbackText(text: string, pending: boolean, failed: boolean): string {
  if (text) return text;
  if (pending) return 'Reading the latest posts\u2026';
  if (failed) return 'Couldn\u2019t summarize the latest posts right now.';
  return 'Waiting for posts\u2026';
}

export default function OrbStatus({ text, pending, failed = false }: OrbStatusProps) {
  const target = fallbackText(text, pending, failed);
  const [displayed, setDisplayed] = useState('');
  const typeTimer = useRef<number | undefined>(undefined);

  // Typewriter effect: reveal `target` one character at a time whenever it changes.
  useEffect(() => {
    setDisplayed('');
    let i = 0;
    window.clearInterval(typeTimer.current);
    typeTimer.current = window.setInterval(() => {
      i += 1;
      setDisplayed(target.slice(0, i));
      if (i >= target.length) {
        window.clearInterval(typeTimer.current);
      }
    }, TYPE_SPEED_MS);
    return () => window.clearInterval(typeTimer.current);
  }, [target]);

  return (
    <div className="orb-status">
      <div className="orb-status-icon">
        <ThinkingOrb state={pending ? THINKING_STATE : IDLE_STATE} size={32} theme="light" />
      </div>
      <div className="orb-status-text">
        {displayed}
        <span className="orb-cursor" />
      </div>
    </div>
  );
}
