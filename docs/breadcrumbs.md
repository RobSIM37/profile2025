# GPT Breadcrumbs

Purpose: Re-align an AI assistant to this project’s concepts and coding standards at the start of a session. Read this file first, then follow the checklist.

Session Checklist
- Read this file end-to-end before any work.
- Skim the Component Manifest (component-manifest.json) to know available building blocks and contracts.
- Scan SPA routes (src/consts/routes.js) to map pages and guards.
- Accessibility is a Priority: ensure features meet baseline a11y (see Accessibility Priority below) and do not regress focus, semantics, or announcements.
- MANDATORY: Reuse existing global components/utilities in `src/components/ui/` (buttons, modal, inputs, tabs, icons, cards) instead of creating ad-hoc versions. If something is missing, add it to the global folder first.
- Keep changes minimal and focused; avoid refactors unless asked or required by the task.
- When adding reusable UI, elevate to `src/components/ui/` and add/update the manifest.
- Update Patch History on About page only with user-facing outcomes after work completes (no mid-patch fixes).

Light Houses Session Tips
- Prefer bit-string seeds: the puzzle state is encoded in `seed` as a length `size^2` binary string. Generating a new puzzle should update the URL via `history.replaceState`.
- For shareable links, include a lightweight signature (e.g., `sig=xmur3(salt, seed, level)`) to distinguish app-generated links from hand-edited ones.
- Gate progression on legitimate wins only (e.g., ignore “one-click” seeds and unsigned URLs when advancing levels).
- Enforce play caps judiciously (e.g., max moves, minimum lights-on ratio) and communicate rules in the UI.

Components & Utilities
- Global modal: `openModal({ title, body, actions, titleAlign, actionsAlign, onClose })` supports centering titles and button rows; includes focus trap and ARIA dialog semantics.
- Global accordions: `Accordion` and `makeAccordionGroup` for details/summary UIs.
- Global icons: `LighthouseIcon('lit'|'unlit', { size? })` mirrors in-game artwork; prefer it over text glyphs.
- Controls grid: `makeControlsGrid({ cols?, gap? })` lays out labeled rows with one/two/three control modes using fixed column widths.
 - Player configurator: `makePlayerConfigurator({...})` builds N player rows with cascading None logic; used by Memory and Knock It Off.
 - Timers: `makeTimer()` creates a one-shot timer with `.after(ms, fn)` and `.clear()` that avoids overlapping timeouts.
 - HUD stat: `HudStat({ label, value }) -> { root, val }` small labeled value tile for Level/Timer/etc.
 - Tag: `Tag({ text }) -> Element` pill-style label used for rule chips and inline metadata.

Global-First Requirement
- Always consume the pre-existing offerings in `src/components/ui/` for UI primitives and flows. Examples:
  - Use `Button` for actions; do not hand-roll `<button>` strings.
  - Use `openModal` instead of `alert/confirm` or custom overlays.
  - Use `numberField` and other input helpers for form controls.
  - Use `makeTabs` for tabbed chrome in gallery views.
  - Use `HudStat` for small status tiles and `Tag` for simple pill labels when showing chips/tags.
- Only introduce new primitives by adding them to `src/components/ui/` (with a manifest entry) so future work can reuse them.

Routing Notes
- The hash router matches by path only (ignores query after `?`). Always put dynamic state in the hash query string.
- When adding routes, update `src/consts/routes.js` and prefer lazy imports. Add guards in `beforeResolve` when needed.

Gallery & Assets
- Add gallery entries in `src/consts/galleryItems.js` and provide an asset under `assets/`. Keep art consistent with in-game visuals.
- Keep view chrome consistent: optional Demo/Source tabs may mount the game and a simple source browser.

 Core Principles
- DRY: share logic and styles; no duplication across projects.
- SRP: each module/class/function does one thing well.
- Components: clear input/output contracts; no hidden globals; return elements/strings explicitly.
- Elevate Reuse: prefer “global” components under `src/components/ui/` when multiple views can benefit.
- Styling: use existing site tokens and classes in `styling/` (e.g., `.button`, `.button-secondary`, `.button-warning`, `.button-subtle`, `.text-warning`, `.ui-field`, `.ui-control`, `--radius`, `--border`, `--warning`).
  - Honor `prefers-reduced-motion` in animations.
- Routing: use `src/consts/routes.js` for SPA routes; lazy-import views.
- Patches: keep Patch History newest-first; bullets should be user-visible outcomes only.

Accessibility Priority
- Landmarks: pages must include header, nav (labeled), main, and footer.
- Skip link: provide a visible-on-focus skip link that focuses `<main>` without changing SPA route; prefer JS `preventDefault()` handler.
- Focus management: on route changes, move focus to `<main>`; preserve and restore focus for modals.
- Live announcements: announce route/view changes via an `aria-live="polite"` region (e.g., `#route-announcer`).
- Focus-visible: interactive elements must have a clear `:focus-visible` style; avoid suppressing outlines globally.
- Controls and labels: ensure form controls have associated labels (`<label for>`, `aria-label`, or `aria-labelledby`).
- Modal semantics: use `openModal` which sets `role="dialog"`, `aria-modal`, labeledby/describedby, and traps focus.
- Reduced motion: honor `prefers-reduced-motion` across animations and background effects.
- Navigation state: apply `aria-current="page"` only on the active link; remove it elsewhere.
- Color tokens: use theme tokens for contrast; warning states use `--warning`, `.button-warning`, and `.text-warning`.

Project Layout (high level)
- src/components/ui/: shared UI primitives (buttons, tabs, inputs, modal, icons, cards)
- src/views/gallery/: feature demos (pipsSolver, timesweeper, knockitoff)
- src/views/about.js: About + Patch History tabs
- styling/: site-wide CSS
- src/consts/routes.js: lazy routes table + guards

Conventions
- Components should have small, explicit APIs. Example patterns:
  - HTML string factories (e.g., `Button`) for markup injection
  - Imperative DOM builders that return elements/handles (e.g., `makeTabs`, `openModal`)
  - Field helpers that return `{ wrapper, input }` (e.g., `numberField`)
- JS: ES modules; avoid default exports for utilities unless legacy requires.
- CSS: prefer using existing classes; add small scoped overrides when needed.
- Filenames: kebab-case for views; lowerCamel for helpers; folders kebab or camel consistent with existing structure.

When Creating/Updating Components
- Place new shared UI under `src/components/ui/`.
- Document the API in the manifest with: name, path, props/signature, returns, events/callbacks, and example usage.
- Keep component-side styling minimal; lean on site tokens.

Patch Notes Guidance
- Write only user-visible, intentional changes; omit in-session fixes.
- Title format: `YYYY-MM-DD--NN` where `YYYY-MM-DD` is today’s date and `NN` is a 2‑digit counter that increments with each additional patch on the same day.
- Implementation: `PatchEntry(date, iteration, [bullets])` where `date = 'YYYY-MM-DD'` and `iteration` is a number (rendered as 2 digits).

Quick Notes About Existing Globals
- `Button(options): string` - string HTML generator; variants `secondary`|`warning`|`subtle` supported. `subtle` removes the white ring (box-shadow); use for low-emphasis actions like Demo/Source tabs.
- `makeTabs({ items, activeId, onChange }) -> { root, setActive, getActive }` – tabs header utility.
- `numberField({ id, label, value, min, max, step }) -> { wrapper, input }` – standard labeled numeric field.
- `openModal({ title, body, actions, onClose }) -> { close }` – lightweight modal.
- `FaceIcon(kind, opts) -> SVGElement` – smiley/frowny icon.
- `Card({ title, tagline, img, link, alt }): string` – gallery card.
 - `makeControlsGrid({ cols?, gap? }) -> { root, addRow, getRow }` – 4-column labeled control rows; supports modes 'one'|'two'|'three' to control spans.
 - `HudStat({ label, value }) -> { root, val }` – small status tile.
 - `Tag({ text }) -> Element` – pill-style label for chips.

Assistant Reminders
- Use ripgrep (`rg`) for fast code search.
- Read files in small chunks; avoid excessive boilerplate.
- Keep answers concise; prefer bullet lists for clarity.
- Confirm assumptions early when scope is ambiguous.
 - STANDING ORDER: When introducing themed styles or visual behaviors, extract them into reusable global components or utility classes (e.g., ControlsGrid, .scroll-themed) and reuse across views instead of one-off, scoped tweaks.

Messaging System (WS)
- Overview: Frontend sends intent-based messages over WebSocket using a consistent envelope. Backend verifies JWT per message, authorizes by intent, dispatches to handlers, then replies or broadcasts based on room presence and handler policy.
- Envelope (client -> server): `{ auth: { jwt }, message: { intent, payload, requestId } }`
- Envelope (server -> client): `{ requestId?, intent?, ok, data?, error? }` where:
  - `requestId`: echoes request for direct replies; omitted for unsolicited/broadcasts.
  - `intent`: present on broadcasts so clients can subscribe by intent.
- Auth: JWT required on every message; backend reads HS256 or RS256 keys from env (see `backend/core/security/jwt.js`).
- Intents: Register handlers in `backend/src/registerIntents.js`; reuse claim roots from `backend/core/security/claims.js` to align FE/BE meaning.

Claims & Roles
- Claims: canonical roots live in `backend/core/security/claims.js` and match intent globs.
- New claims: `leaderboard.read`, `leaderboard.write`, `announce`.
- Roles map: see `backend/core/security/roles.js`.
- Access summary:
  - owner: `**` (all intents)
  - admin: `leaderboard.read`, `leaderboard.write`, `announce` plus standard admin claims
  - user: `leaderboard.read`, `leaderboard.write` plus user defaults
  - contributor: user defaults + `contribute.**` and leaderboard read/write
  - guest: `leaderboard.read` plus guest defaults

Backend Dispatch & Rooms
- Dispatch: `backend/index.js` parses envelope, verifies JWT, checks authz (`isAuthorized`), then routes via `core/intentionRouter`.
- Broadcast policy: If `payload.gameId` is present and handler returns success, the server broadcasts `{ intent, ok, data, error }` to that room unless handler sets `broadcast: false`. Otherwise, a direct reply is sent to the requester.
- Rooms API (server context): handlers receive `ctx` with `joinRoom(roomId)`, `leaveRoom(roomId)`, `broadcast(data, { gameId?, excludeSender? })`, `reply(data)`, and `rooms()`.
- System intents: `system.room.join` and `system.room.leave` accept `{ roomId? , gameId? }` and never broadcast. See `backend/src/handlers/system/*.js`.

Backend Structure (db and services)
- Core: framework plumbing lives in `backend/core/**` and should remain app‑agnostic.
- App code: feature code and handlers live under `backend/src/**`.
- Database layer: place shared DB access in `backend/src/lib/db.js` (or `backend/src/db/index.js` if you prefer a folder). Import from handlers with `require('../lib/db')`.
- Configuration: read credentials from env (Azure SQL + `@azure/identity`), avoid global singletons; export a small API (e.g., `getPool()`, `query(sql, params)`).
- Optional: if many handlers need it, consider wiring a db accessor onto `ctx` later; default is to import directly in handlers.

Frontend Client (vanilla JS)
- Location: `frontend/src/lib/ws.js`
- Initialize: import and connect once on app boot (done in `frontend/src/main.js`).
  - `import ws from '../lib/ws.js'`
  - `ws.connect({ url? , getToken? })` — default URL derives from current host, port 3001, and `wss` on HTTPS.
  - Provide JWT via `ws.setToken(token)` or a `getToken()` provider; token is attached on every `send()`.
- Send: `ws.send(intent, payload, { timeout? }) -> Promise<{ ok, data, error, requestId, intent? }>`
- Subscribe: `const off = ws.on('some.intent', (msg) => { ... })`
- Rooms: `ws.joinRoom({ roomId? , gameId? }|string)` and `ws.leaveRoom({ roomId? , gameId? }|string)`
- Correlation: Replies with a matching `requestId` resolve the promise from `send()`. Broadcasts (room messages) invoke `ws.on(intent, ...)` handlers.
- Reconnect: Auto‑reconnect with backoff after `close`.

Routing Integration (join/leave on navigation)
- Router event: After each navigation, the router dispatches a global `app:navigate` event with `{ path, prevPath }` (path is the route without hash query). See `frontend/src/router.js`.
- Helper: `ws.installRouteRoomSync({ deriveRoomId(path) })` joins/leaves rooms automatically on route changes.
  - Example (fixed lobby): `ws.installRouteRoomSync({ deriveRoomId: (p) => p.startsWith('/gallery/knuckle-bones/game') ? 'kb-lobby' : null })`
  - If you store room IDs in the hash query (recommended for shareable links), parse `window.location.hash` inside your `deriveRoomId` to read `?room=...` since the router’s `path` excludes query for matching.

Dev Tips (JWT)
- Mint a dev token: `npm run mint --prefix backend -- --secret <your-secret> --roles user --ttl 1h`
- Save in the browser: `ws.setToken('<JWT>')` from the dev console.
- Test round‑trip: `ws.send('system.ping', { echo: 'hi' }).then(console.log)`
