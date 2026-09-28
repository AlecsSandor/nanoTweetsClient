import type { ApiTweet } from './api';

export interface TopAccount {
  username: string;
  avatarUrl?: string;
  /** How many of the currently loaded posts are from this account. */
  count: number;
}

const FALLBACK_GRADIENTS = [
  'linear-gradient(135deg, #7c5cff, #5cc8ff)',
  'linear-gradient(135deg, #ff6ec7, #ff9fd0)',
  'linear-gradient(135deg, #6effc0, #7fe0a0)',
  'linear-gradient(135deg, #ffe066, #ffd35c)',
  'linear-gradient(135deg, #ff8a5c, #ffb35c)',
];

/** Deterministic pick so the same handle always gets the same fallback color. */
export function fallbackGradientFor(username: string): string {
  let hash = 0;
  for (let i = 0; i < username.length; i += 1) {
    hash = (hash * 31 + username.charCodeAt(i)) | 0;
  }
  const index = Math.abs(hash) % FALLBACK_GRADIENTS.length;
  return FALLBACK_GRADIENTS[index];
}

/** The accounts appearing most often across the currently loaded posts. */
export function computeTopAccounts(tweets: ApiTweet[], limit = 5): TopAccount[] {
  const byUsername = new Map<string, TopAccount>();

  for (const t of tweets) {
    const existing = byUsername.get(t.authorUsername);
    if (existing) {
      existing.count += 1;
      if (!existing.avatarUrl && t.authorProfileImageUrl) {
        existing.avatarUrl = t.authorProfileImageUrl;
      }
    } else {
      byUsername.set(t.authorUsername, {
        username: t.authorUsername,
        avatarUrl: t.authorProfileImageUrl,
        count: 1,
      });
    }
  }

  return Array.from(byUsername.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}
