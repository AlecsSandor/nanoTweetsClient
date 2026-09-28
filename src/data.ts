import type { ApiMedia, ApiTweet } from './api';

export interface ListItemMedia {
  type: 'image' | 'video';
  src: string;
}

export interface ListItem {
  id: string;
  authorUsername: string;
  authorAvatarUrl?: string;
  /** "@handle" — rendered in the item title. */
  title: string;
  /** Caption text — same string is used collapsed (CSS truncates to one line) and expanded. */
  subtitle: string;
  full: string;
  media?: ListItemMedia;
  link?: string;
  createdAt: string;
  likeCount: number;
  retweetCount: number;
  replyCount: number;
  /** 0 (cold) to 1 (on fire), relative to the hottest post currently loaded. */
  hotness: number;
}

function mapMedia(media: ApiMedia[] | undefined): ListItemMedia | undefined {
  const first = media?.[0];
  if (!first) return undefined;
  if (first.type === 'video' || first.type === 'animated_gif') {
    return { type: 'video', src: first.thumbnailUrl ?? first.url };
  }
  return { type: 'image', src: first.url };
}

export function formatRelativeTime(iso: string): string {
  const diffSec = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (diffSec < 60) return 'just now';
  const min = Math.round(diffSec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  if (day < 7) return `${day}d ago`;
  const week = Math.round(day / 7);
  if (week < 5) return `${week}w ago`;
  const month = Math.round(day / 30);
  if (month < 12) return `${month}mo ago`;
  const year = Math.round(day / 365);
  return `${year}y ago`;
}

/**
 * Builds what the list renders, plus each item's hotness: engagement
 * (likes + retweets + replies) relative to the most-engaged post in the
 * currently loaded set. Recompute this whenever the tweet list changes
 * (new page loaded, or a live post arrives) so hotness stays relative to
 * everything on screen.
 */
export function buildListItems(tweets: ApiTweet[]): ListItem[] {
  const engagement = tweets.map((t) => t.likeCount + t.retweetCount + t.replyCount);
  const maxEngagement = Math.max(1, ...engagement);

  return tweets.map((t, i) => ({
    id: t.id,
    authorUsername: t.authorUsername,
    authorAvatarUrl: t.authorProfileImageUrl,
    title: `@${t.authorUsername}`,
    subtitle: t.fullText,
    full: t.fullText,
    media: mapMedia(t.media),
    link: t.link,
    createdAt: formatRelativeTime(t.createdAt),
    likeCount: t.likeCount,
    retweetCount: t.retweetCount,
    replyCount: t.replyCount,
    hotness: engagement[i] / maxEngagement,
  }));
}
