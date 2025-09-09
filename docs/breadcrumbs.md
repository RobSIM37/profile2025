# GPT Breadcrumbs

Purpose: Re-align an AI assistant to this project’s concepts and coding standards at the start of a session. Read this file first, then follow the checklist.

Session Checklist
- Read this file end-to-end before any work.
- Skim the Component Manifest (component-manifest.json) to know available building blocks and contracts.
- Prefer reusing global components before writing new UI.
- Keep changes minimal and focused; avoid refactors unless asked or required by the task.
- When adding reusable UI, elevate to `src/components/ui/` and add/update the manifest.
- Update Patch History on About page only with user-facing outcomes after work completes (no mid-patch fixes).

Core Principles
- DRY: share logic and styles; no duplication across projects.
- SRP: each module/class/function does one thing well.
- Components: clear input/output contracts; no hidden globals; return elements/strings explicitly.
- Elevate Reuse: prefer “global” components under `src/components/ui/` when multiple views can benefit.
- Styling: use existing site tokens and classes in `styling/` (e.g., `.button`, `.button-secondary`, `.ui-field`, `.ui-control`, `--radius`, `--border`).
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
- Format: PatchEntry(date, iteration, [ bullets ]) where date is `YYYY-MM-DD` and iteration is 2-digit string.

Quick Notes About Existing Globals
- `Button(options): string` – string HTML generator; variant `secondary` supported.
- `makeTabs({ items, activeId, onChange }) -> { root, setActive, getActive }` – tabs header utility.
- `numberField({ id, label, value, min, max, step }) -> { wrapper, input }` – standard labeled numeric field.
- `openModal({ title, body, actions, onClose }) -> { close }` – lightweight modal.
- `FaceIcon(kind, opts) -> SVGElement` – smiley/frowny icon.
- `Card({ title, tagline, img, link, alt }): string` – gallery card.

Assistant Reminders
- Use ripgrep (`rg`) for fast code search.
- Read files in small chunks; avoid excessive boilerplate.
- Keep answers concise; prefer bullet lists for clarity.
- Confirm assumptions early when scope is ambiguous.
