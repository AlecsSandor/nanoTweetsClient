import { useCallback, useEffect, useRef, useState } from 'react';
import { connectTweetStream, fetchTweetPage, type ApiTweet } from './api';

const PAGE_SIZE = 20;

export interface TweetFeedState {
  /** Newest first. Grows at the tail as older pages load, at the head as SSE delivers new posts. */
  tweets: ApiTweet[];
  initialLoading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  error: string | null;
  loadMore: () => void;
}

export function useTweetFeed(): TweetFeedState {
  const [tweets, setTweets] = useState<ApiTweet[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cursorRef = useRef<string | null>(null);
  const seenIds = useRef<Set<string>>(new Set());
  const fetchingRef = useRef(false);

  const addTweets = useCallback((incoming: ApiTweet[], mode: 'append' | 'prepend') => {
    const fresh = incoming.filter((t) => !seenIds.current.has(t.id));
    if (!fresh.length) return;
    fresh.forEach((t) => seenIds.current.add(t.id));
    setTweets((prev) => (mode === 'prepend' ? [...fresh, ...prev] : [...prev, ...fresh]));
  }, []);

  const loadMore = useCallback(() => {
    if (fetchingRef.current || !hasMore) return;
    fetchingRef.current = true;
    setLoadingMore(true);
    fetchTweetPage(cursorRef.current, PAGE_SIZE)
      .then((page) => {
        addTweets(page.tweets, 'append');
        cursorRef.current = page.nextCursor;
        setHasMore(Boolean(page.nextCursor));
        setError(null);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load more posts');
      })
      .finally(() => {
        fetchingRef.current = false;
        setLoadingMore(false);
      });
  }, [addTweets, hasMore]);

  // Initial page.
  useEffect(() => {
    let cancelled = false;
    fetchingRef.current = true;
    fetchTweetPage(null, PAGE_SIZE)
      .then((page) => {
        if (cancelled) return;
        addTweets(page.tweets, 'append');
        cursorRef.current = page.nextCursor;
        setHasMore(Boolean(page.nextCursor));
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load posts');
      })
      .finally(() => {
        fetchingRef.current = false;
        if (!cancelled) setInitialLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // Run once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Live feed — new posts get prepended as they arrive.
  useEffect(() => {
    const close = connectTweetStream({
      onTweet: (tweet) => addTweets([tweet], 'prepend'),
    });
    return close;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { tweets, initialLoading, loadingMore, hasMore, error, loadMore };
}
