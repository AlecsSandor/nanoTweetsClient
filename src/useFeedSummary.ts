import { useCallback, useEffect, useRef, useState } from 'react';
import type { ApiTweet } from './api';
import { generateText, GeminiApiError } from './geminiApi';

/** How many of the newest posts feed each summary. */
const POSTS_TO_SUMMARIZE = 5;
/** Length the model is asked to stay under. */
const SUMMARY_MAX_CHARS = 150;
/**
 * Byte budget for the post text in one prompt. The service rejects prompts
 * over MAX_PROMPT_BYTES (default 8192) with a 413; this leaves headroom for
 * the instruction text. Lower it if you lower the service's limit.
 */
const PROMPT_BYTE_BUDGET = 6500;
/**
 * Minimum gap between request *starts*. The service has one shared
 * 20-requests/minute ceiling (GENERATE_RATE_LIMIT_PER_MINUTE); 4s keeps this
 * client at ≤15/min even during a burst of posts.
 */
const MIN_INTERVAL_MS = 4000;
/** After a 429, stay quiet for this long. */
const RATE_LIMIT_BACKOFF_MS = 15_000;
/** Also summarize once after the first page loads, so the box isn't empty until a live post arrives. */
const SUMMARIZE_ON_LOAD = true;
/** Safety ceiling if the model ignores the length request (the UI clamps to 4 lines anyway). */
const DISPLAY_CHAR_CEILING = 240;

const encoder = new TextEncoder();

function truncateToBytes(s: string, maxBytes: number): string {
  let out = s.slice(0, maxBytes); // chars <= bytes, so this is a cheap first cut
  while (encoder.encode(out).length > maxBytes) out = out.slice(0, -1);
  return out;
}

/** Builds the prompt from the text of the newest posts only. Null if there's nothing to summarize. */
function buildPrompt(tweets: ApiTweet[]): string | null {
  const posts = tweets
    .slice(0, POSTS_TO_SUMMARIZE)
    .map((t) => t.fullText.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  if (!posts.length) return null;

  const perPost = Math.floor(PROMPT_BYTE_BUDGET / posts.length);
  const list = posts.map((p, i) => `${i + 1}. ${truncateToBytes(p, perPost)}`).join('\n');

  return (
    `Produce a short summary of the following posts, max ${SUMMARY_MAX_CHARS} characters. ` +
    `Reply with only the summary — no preamble, no quotation marks.\n\nPosts:\n${list}`
  );
}

function clamp(text: string): string {
  if (text.length <= DISPLAY_CHAR_CEILING) return text;
  const cut = text.slice(0, DISPLAY_CHAR_CEILING - 1);
  return cut.slice(0, cut.lastIndexOf(' ') > 0 ? cut.lastIndexOf(' ') : undefined) + '…';
}

export interface FeedSummary {
  /** Latest summary. Stays on the last good one while a new one is loading or if a request fails. */
  text: string;
  /** True from the moment a new summary is wanted until its answer (or failure) arrives. */
  pending: boolean;
  /** True if the most recent attempt failed. */
  failed: boolean;
}

/**
 * Keeps a Gemini-written summary of the newest posts up to date.
 *
 * Triggers: each new live post (`liveCount` bump) and, optionally, once after
 * the first page loads. Requests are coalesced: at most one in flight and at
 * most one waiting, and the waiting one is built from the newest posts at the
 * moment it actually sends — so a burst of posts costs one or two calls, not N.
 */
export function useFeedSummary(tweets: ApiTweet[], liveCount: number, initialLoading: boolean): FeedSummary {
  const [text, setText] = useState('');
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);

  const tweetsRef = useRef(tweets);
  tweetsRef.current = tweets;

  const mounted = useRef(true);
  const wanted = useRef(false); // a fresh summary has been asked for and not yet sent
  const inFlight = useRef(false);
  const nextAllowedAt = useRef(0);
  const timer = useRef<number | undefined>(undefined);
  const controllerRef = useRef<AbortController | null>(null);

  // Sends the wanted request if nothing is in flight and the spacing allows it;
  // otherwise schedules itself for when it does. Only touches refs + stable
  // setters, so the closure never goes stale.
  const pump = useCallback(function pump() {
    if (!mounted.current || !wanted.current || inFlight.current || timer.current !== undefined) return;

    const wait = nextAllowedAt.current - Date.now();
    if (wait > 0) {
      timer.current = window.setTimeout(() => {
        timer.current = undefined;
        pump();
      }, wait);
      return;
    }

    wanted.current = false;
    const prompt = buildPrompt(tweetsRef.current);
    if (!prompt) {
      setPending(false);
      return;
    }

    inFlight.current = true;
    nextAllowedAt.current = Date.now() + MIN_INTERVAL_MS;
    const controller = new AbortController();
    controllerRef.current = controller;

    generateText(prompt, controller.signal)
      .then((summary) => {
        if (!mounted.current) return;
        setText(clamp(summary));
        setFailed(false);
      })
      .catch((err) => {
        if (!mounted.current || controller.signal.aborted) return;
        if (err instanceof GeminiApiError && err.status === 429) {
          nextAllowedAt.current = Date.now() + RATE_LIMIT_BACKOFF_MS;
        }
        console.warn('Summary request failed', err);
        setFailed(true);
      })
      .finally(() => {
        inFlight.current = false;
        if (controllerRef.current === controller) controllerRef.current = null;
        if (!mounted.current) return;
        if (wanted.current) pump();
        else setPending(false);
      });
  }, []);

  const request = useCallback(() => {
    wanted.current = true;
    setPending(true);
    pump();
  }, [pump]);

  // Mount/unmount bookkeeping (also keeps React StrictMode's double-mount honest).
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      window.clearTimeout(timer.current);
      timer.current = undefined;
      controllerRef.current?.abort();
    };
  }, []);

  // A new post arrived over the live stream.
  useEffect(() => {
    if (liveCount > 0) request();
  }, [liveCount, request]);

  // One summary after the first page loads.
  const didInitial = useRef(false);
  useEffect(() => {
    if (!SUMMARIZE_ON_LOAD || didInitial.current || initialLoading || tweets.length === 0) return;
    didInitial.current = true;
    request();
  }, [initialLoading, tweets.length, request]);

  return { text, pending, failed };
}
