# NanoTweets

React + Vite frontend for the live X/Twitter-post microservice: a paginated
`GET /api/tweets` feed with infinite scroll, plus a live `GET /api/stream`
(SSE) feed that prepends new posts as they arrive.

## Setup

```
npm install
cp .env.example .env   # then fill in the two values below
npm run dev             # http://localhost:5173
```

`.env`:

- `VITE_API_BASE_URL` — base URL of the microservice. Leave empty to call
  the same origin this app is served from.
- `VITE_API_TOKEN` — must match `CLIENT_API_TOKEN` in the microservice's own
  `.env`. Sent as `Authorization: Bearer <token>` on `GET /api/tweets`, and
  as a `?token=` query param on the `/api/stream` SSE connection (the
  browser's `EventSource` can't set custom headers).

- `VITE_GEMINI_API_BASE_URL` — base URL of the Gemini microservice,
  including any path prefix the entry point uses, e.g.
  `https://api.veswip.com/gemini` (the app then calls
  `https://api.veswip.com/gemini/api/generate`). Leave empty to reuse
  `VITE_API_BASE_URL`, which only makes sense if the Gemini service is served
  from the same root as the tweets one.
- `VITE_GEMINI_API_TOKEN` — must match `CLIENT_API_TOKEN` in the Gemini
  service's own `.env`. Sent as `Authorization: Bearer <token>` on
  `POST /api/generate`.

The Gemini service's `ALLOWED_ORIGINS` must include this app's origin
(e.g. `http://localhost:5173` in dev), otherwise the browser's CORS check
blocks the call.

## Orb + summary text (Gemini)

The orb and the text beside it are driven by `src/useFeedSummary.ts`:

- **Trigger:** each new post delivered over the live stream (plus once after
  the first page loads — `SUMMARIZE_ON_LOAD`). Pagination never triggers it.
- **Prompt:** the text of the newest 5 posts only, asking for a summary of
  max 150 characters.
- **Orb:** `working` animation while a request is pending, `breathing`
  otherwise (`THINKING_STATE` / `IDLE_STATE` in `OrbStatus.tsx`).
- **Text:** typed out when the answer arrives; the previous summary stays on
  screen while the next one is loading, and if a request fails.
- **Cost guardrails:** at most one request in flight and one waiting, and the
  waiting one is built from the newest posts at the moment it is sent, so a
  burst of posts costs 1–2 calls, not one per post. Request starts are spaced
  ≥4s apart (the service allows 20/min), with a 15s back-off after a 429.

Heads-up: the Gemini service is billed per request, and
`VITE_GEMINI_API_TOKEN` ships in the browser bundle. That's the same model as
the tweets token, but here the token can spend money — if this app ever goes
public, route the call through your own backend instead.

## How the service's data maps onto the UI

No layout/CSS/animation changes — only what each piece renders and where
the data comes from changed:

| UI element | Comes from |
|---|---|
| Item icon (top-left avatar box) | `tweet.authorProfileImageUrl` (falls back to a letter avatar) |
| Item title | `@{tweet.authorUsername}` |
| Item subtitle (collapsed, 1 line via existing CSS) / full text (expanded) | `tweet.fullText` |
| Expanded media | `tweet.media[0]`, rendered as `<img>` or `<video>` depending on `type` |
| "Open on X" pill | `tweet.link` |
| Date / like / retweet / reply chips | `tweet.createdAt` (formatted as relative time), `likeCount`, `retweetCount`, `replyCount` |
| Hotness meter | computed client-side: `(likes + retweets + replies)` for that post, divided by the highest such total among all currently-loaded posts. Recomputed whenever the loaded set changes (new page, or a live post arriving) |
| Left avatar stack | the 5 accounts appearing most often among currently-loaded posts, ranked by post count, with avatar + `@handle` tooltip on hover |

`src/api.ts` — fetch + SSE client, and a note on why tweet ids are parsed
specially (see below).
`src/useTweetFeed.ts` — hook owning pagination cursor, dedupe, and the SSE
connection.
`src/data.ts` / `src/accounts.ts` — pure mapping/derivation functions
(list items + hotness, top accounts).

### A data-integrity note: tweet IDs

The service's tweet `id` values are ~19-digit integers, well past
`Number.MAX_SAFE_INTEGER`. Parsed with a plain `JSON.parse`, they silently
lose precision, which can make two different tweets collide on the same
(rounded) id — breaking de-dupe and React keys. `src/api.ts` works around
this by quoting the `id` field before parsing, so it comes out as an exact
string instead of a rounded number. If the service can be changed, the
cleaner long-term fix is to have it send `id` as a JSON string to begin
with.

## What's still here from the original scaffold

- `src/lib/thinking-orbs/` and `src/OrbStatus.tsx` — untouched, per your
  note.
- `src/ScrollRail.tsx` — untouched.
- `src/icons.tsx`, `src/HotnessMeter.tsx`, `src/AnimatedCount.tsx` —
  untouched (already generic enough to just feed real data through).
