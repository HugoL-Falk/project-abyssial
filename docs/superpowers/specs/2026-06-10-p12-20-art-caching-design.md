# P12-20 Art Caching Design

## Goal

Card art (`.jpeg` files in `/public/cards/`) must be available offline after a connected session. The game already caches JS/CSS/HTML via Workbox precache but omits JPEG — images break as soon as the dev server or Railway goes offline.

## Use Case

Player boots the game connected, plays a session (art loads normally), then disconnects and continues playtesting. All previously viewed card art must render from cache. Unviewed card art may be missing the first time — that is acceptable.

## Root Cause

`vite.config.ts` `workbox.globPatterns` is `['**/*.{js,css,html,ico,png,svg,woff2}']`. The `jpeg` extension is absent, so Workbox never precaches card images. No runtime cache rule exists for the `/cards/` path either.

## Approach

Add a **Workbox runtime cache rule** for `/cards/*.jpeg` using the **StaleWhileRevalidate** strategy. The existing precache configuration is unchanged.

**Why StaleWhileRevalidate over CacheFirst:**  
Art is being actively regenerated (P10-11 is open). StaleWhileRevalidate returns the cached version immediately (offline works) while silently fetching a fresh copy in the background whenever connected — so regenerated art updates automatically without any cache name bumping.

**Why not precaching JPEG:**  
Precaching would download all 37MB on service worker install. Runtime caching downloads on first view, spreading the cost across the session.

**Videos excluded:**  
`intro.mp4` (112MB) and `menu.mp4` (133MB) exceed practical service worker storage limits on mobile. They remain uncached — video failure is cosmetic, missing card art is not.

## Configuration

**File:** `vite.config.ts` — `workbox` block only.

```ts
workbox: {
  globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
  runtimeCaching: [
    {
      urlPattern: /\/cards\/.*\.jpe?g$/,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'card-art-v1',
        expiration: {
          maxEntries: 200,
          maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
        },
      },
    },
  ],
},
```

**Cache parameters:**
- `cacheName: 'card-art-v1'` — explicit name for cache inspector visibility
- `maxEntries: 200` — headroom above current 108 files for future cards
- `maxAgeSeconds: 30 days` — long enough that entries never expire during a playtest cycle
- URL pattern covers `.jpeg` and `.jpg` via `jpe?g`

## Behaviour After Change

| Scenario | Before | After |
|---|---|---|
| Online, card viewed for first time | Image loads from network | Image loads from network; cached |
| Online, card viewed again | Image loads from network | Image loads from cache instantly; fresh copy fetched silently |
| Offline, card previously viewed | Image missing | Image loads from cache |
| Offline, card never viewed | Image missing | Image missing (expected) |

## Verification

1. Build and serve (`npm run build && npm run preview`)
2. Open browser DevTools → Application → Cache Storage → confirm `card-art-v1` populates as cards are drawn
3. Enable offline mode in DevTools → draw cards previously seen → art renders correctly
4. Draw a card not previously seen offline → placeholder sigil renders (expected)

## Scope

Single file: `vite.config.ts`. No component changes, no new files, no type changes.
