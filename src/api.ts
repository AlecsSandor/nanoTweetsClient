import { apiUrl, API_TOKEN } from './config';

export interface ApiMedia {
  type: 'photo' | 'image' | 'video' | 'animated_gif';
  url: string;
  thumbnailUrl?: string;
}

export interface ApiTweet {
  /** Always a string here — see parseJsonPreservingBigIds for why. */
  id: string;
  authorId: string;
  authorUsername: string;
  authorProfileImageUrl?: string;
  fullText: string;
  link: string;
  media: ApiMedia[];
  /** ISO 8601 timestamp. */
  createdAt: string;
  likeCount: number;
  retweetCount: number;
  replyCount: number;
}

export interface TweetsPage {
  tweets: ApiTweet[];
  nextCursor: string | null;
}

/**
 * The service's tweet `id` values are snowflake-style integers with ~19
 * digits — well past Number.MAX_SAFE_INTEGER (~9 * 10^15). A plain
 * `JSON.parse` silently rounds them, so two different tweets can come out
 * with the same numeric id (breaking de-dupe/keys). A `reviver` can't fix
 * this either, since the number has already lost precision by the time
 * JSON.parse hands it to the reviver.
 *
 * Fix: before parsing, quote any bare numeric `"id":<digits>` so it comes
 * out of JSON.parse as a string with every digit intact. This only touches
 * the top-level `id` field the service sends as a raw number; every other
 * id-like field (authorId, cursor, etc.) already arrives quoted.
 */
function parseJsonPreservingBigIds<T>(text: string): T {
  const safe = text.replace(/"id":(-?\d+)(?=[,}\s])/g, '"id":"$1"');
  return JSON.parse(safe) as T;
}

function authHeaders(): HeadersInit {
  return API_TOKEN ? { Authorization: `Bearer ${API_TOKEN}` } : {};
}

export async function fetchTweetPage(cursor: string | null, limit = 20): Promise<TweetsPage> {
  const url = apiUrl('/api/tweets');
  url.searchParams.set('limit', String(limit));
  if (cursor) url.searchParams.set('cursor', cursor);

  const res = await fetch(url, { headers: authHeaders() });
  if (!res.ok) throw new Error(`Failed to load tweets (${res.status})`);

  const text = await res.text();
  return parseJsonPreservingBigIds<TweetsPage>(text);
}

export interface TweetStreamHandlers {
  onTweet: (tweet: ApiTweet) => void;
  onOpen?: () => void;
  onError?: (event: Event) => void;
}

/** Connects to the live feed. Returns a cleanup function that closes it. */
export function connectTweetStream(handlers: TweetStreamHandlers): () => void {
  const url = apiUrl('/api/stream');
  if (API_TOKEN) url.searchParams.set('token', API_TOKEN);

  const source = new EventSource(url);

  source.onopen = () => handlers.onOpen?.();
  source.onmessage = (event) => {
    try {
      handlers.onTweet(parseJsonPreservingBigIds<ApiTweet>(event.data));
    } catch (err) {
      console.error('Failed to parse SSE tweet payload', err);
    }
  };
  source.onerror = (event) => handlers.onError?.(event);

  return () => source.close();
}
