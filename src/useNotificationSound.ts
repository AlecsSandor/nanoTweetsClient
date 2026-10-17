import { useCallback, useEffect, useRef, useState } from 'react';

const STORAGE_KEY = 'notification-sound-muted';
/** Minimum gap between chimes, so a burst of posts doesn't machine-gun. */
const MIN_GAP_MS = 1500;
/** 0–1. Kept low; it's a nudge, not an alarm. */
const VOLUME = 0.12;
/** Two quick rising notes (A5 → E6), each [frequency Hz, start offset s]. */
const NOTES: Array<[number, number]> = [
  [880, 0],
  [1318.5, 0.09],
];
const NOTE_DURATION_S = 0.22;

function readMuted(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

function chime(ctx: AudioContext) {
  const t0 = ctx.currentTime;
  for (const [freq, offset] of NOTES) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    // Quick attack, exponential decay: a soft "ding" with no click.
    gain.gain.setValueAtTime(0.0001, t0 + offset);
    gain.gain.exponentialRampToValueAtTime(VOLUME, t0 + offset + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + offset + NOTE_DURATION_S);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t0 + offset);
    osc.stop(t0 + offset + NOTE_DURATION_S + 0.05);
  }
}

/**
 * Plays a short chime each time `liveCount` goes up (a new post arrived over
 * the live stream). Browsers block audio until the user has interacted with
 * the page, so the AudioContext is unlocked on the first click/tap/keypress;
 * posts arriving before that are silent.
 */
export function useNotificationSound(liveCount: number) {
  const [muted, setMuted] = useState(readMuted);
  const mutedRef = useRef(muted);
  mutedRef.current = muted;

  const ctxRef = useRef<AudioContext | null>(null);
  const lastPlayedAt = useRef(0);
  const prevCount = useRef(liveCount);

  useEffect(() => {
    const unlock = () => {
      if (!ctxRef.current) {
        const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Ctor) return;
        ctxRef.current = new Ctor();
      }
      void ctxRef.current.resume();
    };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  useEffect(() => {
    const increased = liveCount > prevCount.current;
    prevCount.current = liveCount;
    if (!increased || mutedRef.current) return;

    const ctx = ctxRef.current;
    if (!ctx || ctx.state !== 'running') return; // not unlocked yet
    if (Date.now() - lastPlayedAt.current < MIN_GAP_MS) return;
    lastPlayedAt.current = Date.now();
    chime(ctx);
  }, [liveCount]);

  const toggleMuted = useCallback(() => {
    const next = !mutedRef.current;
    setMuted(next);
    try {
      localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
    } catch {
      /* storage unavailable: the choice just won't persist */
    }
  }, []);

  return { muted, toggleMuted };
}
