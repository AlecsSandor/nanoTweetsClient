import { useEffect, useRef, useState, type RefObject } from 'react';
import { CalendarIcon, HeartIcon, RepeatIcon, ReplyIcon, CloseIcon, XLogoIcon, ArrowUpRightIcon } from './icons';
import HotnessMeter from './HotnessMeter';
import AnimatedCount from './AnimatedCount';
import type { ListItem } from './data';
import './TweetList.css';

interface TweetListProps {
  items: ListItem[];
  /** Forwarded to the scrollable list container, e.g. so a ScrollRail
   *  outside this component can track its scroll position. Optional. */
  scrollRef?: RefObject<HTMLDivElement>;
  onLoadMore: () => void;
  hasMore: boolean;
  loadingMore: boolean;
  initialLoading: boolean;
  error: string | null;
}

export default function TweetList({
  items,
  scrollRef,
  onLoadMore,
  hasMore,
  loadingMore,
  initialLoading,
  error,
}: TweetListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const toggle = (id: string) => {
    setExpandedId((cur) => (cur === id ? null : id));
  };

  // Infinite scroll: load the next (older) page once the sentinel right
  // after the last loaded item comes into view.
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) onLoadMore();
      },
      { root: scrollRef?.current ?? null, rootMargin: '400px' },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [onLoadMore, scrollRef]);

  return (
    <div className="card-wrap">
      <div className="spacer">
        <div className="frame" />
        <div className="glow" />
        <div className="editor-wrap">
          <div className="fade-top" />
          <div className="fade-bottom" />
          <div className="editor" ref={scrollRef}>
            <div className="list">
              {items.map((item, i) => {
                const expanded = expandedId === item.id;
                const entranceDelayMs = Math.round((0.03 + i * 0.04) * 1000);
                // Let the item slide into place first, then count the likes up.
                const countDelayMs = entranceDelayMs + 300;
                return (
                  <div
                    key={item.id}
                    className={`item${expanded ? ' expanded' : ''}`}
                    style={{ animationDelay: `${0.03 + i * 0.04}s` }}
                    onClick={() => toggle(item.id)}
                  >
                    <div className="item-header">
                      <div className="icon-spacer">
                        <div className="icon-frame" />
                        <div className="icon-box">
                          {item.authorAvatarUrl ? (
                            <img
                              className="icon-avatar"
                              src={item.authorAvatarUrl}
                              alt={`@${item.authorUsername}`}
                            />
                          ) : (
                            <span className="icon-fallback">
                              {item.authorUsername.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="item-text">
                        <div className="item-title-row">
                          <span className="item-title">{item.title}</span>
                          <HotnessMeter value={item.hotness} />
                        </div>
                        <div className="item-sub">{item.subtitle}</div>
                      </div>

                      <div className="item-meta">
                        <span className="meta-chip">
                          <CalendarIcon />
                          {item.createdAt}
                        </span>
                        <span className="meta-chip">
                          <HeartIcon />
                          <AnimatedCount value={String(item.likeCount)} delayMs={countDelayMs} />
                        </span>
                      </div>

                      <button
                        className="close-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedId(null);
                        }}
                        aria-label="Collapse"
                      >
                        <CloseIcon width={13} height={13} />
                      </button>
                    </div>

                    <div className="item-full">
                      <div className="item-full-row">
                        {item.media && (
                          <div className="item-media">
                            {item.media.type === 'video' ? (
                              <video src={item.media.src} controls playsInline />
                            ) : (
                              <img src={item.media.src} alt="" loading="lazy" />
                            )}
                          </div>
                        )}

                        <div className="item-full-text">{item.full}</div>
                      </div>

                      <div className="item-full-footer">
                        <div className="item-meta-full">
                          <span className="meta-chip">
                            <CalendarIcon />
                            {item.createdAt}
                          </span>
                          <span className="meta-chip">
                            <HeartIcon />
                            <AnimatedCount value={String(item.likeCount)} delayMs={countDelayMs} />
                          </span>
                          <span className="meta-chip">
                            <RepeatIcon />
                            {item.retweetCount}
                          </span>
                          <span className="meta-chip">
                            <ReplyIcon />
                            {item.replyCount}
                          </span>
                        </div>

                        {item.link && (
                          <a
                            className="open-link-pill"
                            href={item.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <XLogoIcon width={11} height={11} />
                            <ArrowUpRightIcon className="open-link-arrow" width={12} height={12} />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {initialLoading && items.length === 0 && (
                <div className="list-status">Loading…</div>
              )}
              {error && items.length === 0 && <div className="list-status">{error}</div>}
              {!initialLoading && items.length === 0 && !error && (
                <div className="list-status">Nothing here yet.</div>
              )}

              <div ref={sentinelRef} className="list-sentinel" />
              {loadingMore && <div className="list-status">Loading more…</div>}
              {!hasMore && items.length > 0 && <div className="list-status">That's everything.</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
