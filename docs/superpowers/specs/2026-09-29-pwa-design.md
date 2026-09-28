# SproutNote PWA Design

## Goal

Turn the existing GitHub Pages site into an installable Progressive Web App without adding accounts, a server, or a second website.

## User experience

- The existing URL remains the only URL.
- Phone, tablet, Mac, Windows, and Chromebook users can install the site from the photo screen.
- iPhone and iPad receive the correct Safari “Add to Home Screen” instruction when the browser does not expose an install prompt.
- After one successful online visit, the app shell and bundled demo assets can open offline.
- Existing local-only class, child, photo, observation, template, and history data remain unchanged.

## Technical design

- A web app manifest declares the `/sproutnote/` start URL, standalone display mode, colors, language, and 192/512 icons.
- A same-origin service worker caches the app shell, then uses network-first navigation with a cached app fallback and cache-first static assets.
- React registers the service worker only after `window.load` and stores the browser's `beforeinstallprompt` event for the install button.
- No background sync, push notification, account, or cross-device database is added.

## Acceptance criteria

1. Manifest and icon URLs return HTTP 200 beneath the GitHub Pages base path.
2. The manifest is installable and opens in standalone display mode at `/sproutnote/`.
3. The service worker controls the app after registration/reload and provides a cached navigation fallback.
4. The “安裝 Web App” button invokes the native install prompt where supported and otherwise gives platform-appropriate instructions.
5. Existing automated tests pass, the production build succeeds, and desktop/mobile layout checks show no horizontal overflow or console error.
6. Local data semantics do not change: data stays in the current browser/device and does not sync automatically.
