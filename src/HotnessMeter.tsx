import type { CSSProperties } from 'react';
import './HotnessMeter.css';

interface HotnessMeterProps {
  /** 0 (cold) to 1 (on fire). */
  value: number;
  /** Total number of bars in the meter. */
  bars?: number;
}

// Below this, bars are green/amber and stay calm. From here up to 1 (red)
// the bars start to glow and pulse, faster and stronger as it gets hotter.
const GLOW_START = 0.55;

// Green -> amber -> red as the hue rotates down from ~140deg to 0deg.
function hueForHotness(clamped: number) {
  return 140 * (1 - clamped);
}

export default function HotnessMeter({ value, bars = 6 }: HotnessMeterProps) {
  const clamped = Math.max(0, Math.min(1, value));
  const filled = Math.max(1, Math.round(clamped * bars));
  const hue = hueForHotness(clamped);
  const color = `hsl(${hue.toFixed(0)}, 75%, 45%)`;
  const glowColor = `hsla(${hue.toFixed(0)}, 90%, 50%, 0.65)`;

  // 0 below GLOW_START, ramping to 1 at full hotness.
  const glowIntensity = Math.max(0, (clamped - GLOW_START) / (1 - GLOW_START));
  const isHot = glowIntensity > 0.01;

  // Softer/slower at low intensity, quicker/stronger as hotness climbs.
  const duration = 2.4 - 1.5 * glowIntensity; // seconds, ~2.4s -> ~0.9s
  const blur = 3 + 9 * glowIntensity; // px, ~3px -> ~12px

  const meterStyle: CSSProperties = {
    '--hotness-glow-color': glowColor,
    '--hotness-glow-duration': `${duration.toFixed(2)}s`,
    '--hotness-glow-blur': `${blur.toFixed(1)}px`,
  } as CSSProperties;

  return (
    <div
      className={`hotness-meter${isHot ? ' hotness-hot' : ''}`}
      style={meterStyle}
      role="img"
      aria-label={`Hotness: ${Math.round(clamped * 100)}%`}
      title={`Hotness: ${Math.round(clamped * 100)}%`}
    >
      {Array.from({ length: bars }).map((_, i) => (
        <span
          key={i}
          className={`hotness-bar${i < filled ? ' filled' : ''}`}
          style={i < filled ? { background: color } : undefined}
        />
      ))}
    </div>
  );
}
