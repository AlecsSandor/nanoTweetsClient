import { useEffect, useRef, useState } from 'react';
import { ThinkingOrb, type OrbState } from './lib/thinking-orbs';
import './OrbStatus.css';

interface StatusEntry {
  state: OrbState;
  text: string;
}

// Placeholder pool — orb state and text are picked together at random.
// Swap this out once real states/messages are wired up.
const POOL: StatusEntry[] = [
  { state: 'working', text: 'Reviewing your recent transactions for anything unusual before the weekly summary goes out.' },
  { state: 'searching', text: 'Looking through your linked accounts to find the best rate for this transfer.' },
  { state: 'solving', text: 'Reconciling the last few pending charges against your statement.' },
  { state: 'listening', text: 'Waiting for the bank to confirm the routing details you just entered.' },
  { state: 'connecting', text: 'Establishing a secure link with your card issuer to verify the payment.' },
  { state: 'weaving', text: 'Combining your spending categories into this month\u2019s budget breakdown.' },
  { state: 'composing', text: 'Putting together a short summary of where your money went this week.' },
  { state: 'breathing', text: 'Idle for a moment \u2014 everything looks in order right now.' },
  { state: 'shaping', text: 'Adjusting your savings goal based on the last few deposits.' },
];

const CYCLE_MS = 15200;
const TYPE_SPEED_MS = 18;

function pickNext(currentText: string): StatusEntry {
  let next = POOL[Math.floor(Math.random() * POOL.length)];
  while (POOL.length > 1 && next.text === currentText) {
    next = POOL[Math.floor(Math.random() * POOL.length)];
  }
  return next;
}

export default function OrbStatus() {
  const [entry, setEntry] = useState<StatusEntry>(() => POOL[0]);
  const [displayed, setDisplayed] = useState('');
  const typeTimer = useRef<number | undefined>(undefined);
  const cycleTimer = useRef<number | undefined>(undefined);

  // Typewriter effect: reveal `entry.text` one character at a time.
  useEffect(() => {
    setDisplayed('');
    let i = 0;
    window.clearInterval(typeTimer.current);
    typeTimer.current = window.setInterval(() => {
      i += 1;
      setDisplayed(entry.text.slice(0, i));
      if (i >= entry.text.length) {
        window.clearInterval(typeTimer.current);
      }
    }, TYPE_SPEED_MS);
    return () => window.clearInterval(typeTimer.current);
  }, [entry]);

  // Random cycling: pick a new state+text pair every CYCLE_MS.
  useEffect(() => {
    cycleTimer.current = window.setInterval(() => {
      setEntry((cur) => pickNext(cur.text));
    }, CYCLE_MS);
    return () => window.clearInterval(cycleTimer.current);
  }, []);

  return (
    <div className="orb-status">
      <div className="orb-status-icon">
        <ThinkingOrb state={entry.state} size={32} theme="light" />
      </div>
      <div className="orb-status-text">
        {displayed}
        <span className="orb-cursor" />
      </div>
    </div>
  );
}
