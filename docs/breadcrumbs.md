# GPT Breadcrumbs

Purpose: Re-align an AI assistant to this project’s concepts and coding standards at the start of a session. Read this file first, then follow the checklist.

Session Checklist
- Read this file end-to-end before any work.
- Skim the Component Manifest (component-manifest.json) to know available building blocks and contracts.
- Scan SPA routes (src/consts/routes.js) to map pages and guards.
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

Global-First Requirement
- Always consume the pre-existing offerings in `src/components/ui/` for UI primitives and flows. Examples:
  - Use `Button` for actions; do not hand-roll `<button>` strings.
  - Use `openModal` instead of `alert/confirm` or custom overlays.
  - Use `numberField` and other input helpers for form controls.
  - Use `makeTabs` for tabbed chrome in gallery views.
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
- Styling: use existing site tokens and classes in `styling/` (e.g., `.button`, `.button-secondary`, `.button-warning`, `.text-warning`, `.ui-field`, `.ui-control`, `--radius`, `--border`, `--warning`).
  - Honor `prefers-reduced-motion` in animations.
- Routing: use `src/consts/routes.js` for SPA routes; lazy-import views.
- Patches: keep Patch History newest-first; bullets should be user-visible outcomes only.

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
- `Button(options): string` – string HTML generator; variant `secondary` supported.
- `makeTabs({ items, activeId, onChange }) -> { root, setActive, getActive }` – tabs header utility.
- `numberField({ id, label, value, min, max, step }) -> { wrapper, input }` – standard labeled numeric field.
- `openModal({ title, body, actions, onClose }) -> { close }` – lightweight modal.
- `FaceIcon(kind, opts) -> SVGElement` – smiley/frowny icon.
- `Card({ title, tagline, img, link, alt }): string` – gallery card.
 - `makeControlsGrid({ cols?, gap? }) -> { root, addRow, getRow }` – 4-column labeled control rows; supports modes 'one'|'two'|'three' to control spans.

Assistant Reminders
- Use ripgrep (`rg`) for fast code search.
- Read files in small chunks; avoid excessive boilerplate.
- Keep answers concise; prefer bullet lists for clarity.
- Confirm assumptions early when scope is ambiguous.
 - STANDING ORDER: When introducing themed styles or visual behaviors, extract them into reusable global components or utility classes (e.g., ControlsGrid, .scroll-themed) and reuse across views instead of one-off, scoped tweaks.
