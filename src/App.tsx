import { useMemo, useRef } from 'react';
import TweetList from './TweetList';
import OrbStatus from './OrbStatus';
import ScrollRail from './ScrollRail';
import AccountStack from './AccountStack';
import { useTweetFeed } from './useTweetFeed';
import { useFeedSummary } from './useFeedSummary';
import { buildListItems } from './data';
import { computeTopAccounts } from './accounts';
import './App.css';

export default function App() {
  const listScrollRef = useRef<HTMLDivElement>(null);
  const { tweets, initialLoading, loadingMore, hasMore, error, liveCount, loadMore } = useTweetFeed();
  const summary = useFeedSummary(tweets, liveCount, initialLoading);

  // Recomputed whenever the loaded/streamed tweet set changes, since hotness
  // and the top-accounts ranking are both relative to what's currently loaded.
  const items = useMemo(() => buildListItems(tweets), [tweets]);
  const topAccounts = useMemo(() => computeTopAccounts(tweets, 5), [tweets]);

  return (
    <div className="app-root">
      <div className="app-layout">
        <AccountStack accounts={topAccounts} />

        <div className="app-center">
          <OrbStatus text={summary.text} pending={summary.pending} failed={summary.failed} />
          <TweetList
            items={items}
            scrollRef={listScrollRef}
            onLoadMore={loadMore}
            hasMore={hasMore}
            loadingMore={loadingMore}
            initialLoading={initialLoading}
            error={error}
          />
        </div>

        <ScrollRail targetRef={listScrollRef} />
      </div>
    </div>
  );
}
