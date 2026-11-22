# Selection Annotations (dsh-selection-annotations)

**English** · [简体中文](README.zh-CN.md)

> Select text in a DSH conversation, write a note, and send it with your next message. The model's answers come back one by one, attached to the notes they belong to.

For someone who never writes code, the problem is one sentence long: **make the thing you want changed easy to point at.** No more "the second sentence in the third paragraph above" — select it instead.

This document is written in order of involvement: use it, then understand it, then install or change it.

---

## Part 1 · I just want to use it

### Install once

1. Open DSH → Settings → Plugins.
2. Install this plugin: either by package name `dsh-selection-annotations`, or from the local directory (see [Part 4](#part-4--install-configure-develop)).
3. **Quit DSH completely** (including the tray icon) and start it again. Reloading the page is not enough — plugin code loads at startup.

### One minute to learn

1. Drag-select a passage of the assistant's answer.
2. A small toolbar appears under the selection. Click **Annotate**.
3. Write what you want, e.g. "these numbers are wrong, assume 12 months".
4. Select the next spot, or just press send.

The annotations travel with your message. Your own text is never rewritten.

### Five things you will use

- **Point at what should change** — one sentence is enough to say "rewrite this line" or "turn this into a table".
- **Accept / reject** — the toolbar has both buttons; they fill in 【意见采纳】/【意见否决】 and you add the reason. Colour follows the verdict, so you can see at a glance what was rejected.
- **Attach a screenshot** — paste an image into the note; faster than describing it.
- **Look back at what you sent** — each turn shows a "sent annotations" card listing what you marked for it.
- **See how it answered** — open any entry in that card and the model's reply for that specific note appears right under it: accepted or not, why, and what happens next.

### If something looks wrong

- A toast says "Annotations were not saved, so this message was not sent": that is the safety gate. Your notes and attachments stay in the compose box; press send again — nothing is duplicated.
- Nothing happens after installing: DSH was probably not fully restarted.
- Highlights are off by a line: reload the page; this is the scrolling re-anchor edge case.

---

## Part 2 · Once you know your way around

### Selection and toolbar

- Release the drag and the toolbar (reject, accept, annotate, copy) appears below the selection.
- It follows your selection horizontally, but **deliberately one beat late**: it waits one second after you stop, then slides over. While you are still dragging it stays out of the way.
- Right-clicking the body text also offers annotate and copy; with nothing selected you get the native menu.

### The annotation popover

- Clicking outside saves; Esc cancels.
- A brand-new annotation with no text and no image is dropped when you click outside — no empty rows.
- Hovering an already-annotated passage for half a second opens its editor; moving away saves and closes.
- Once you **drag the panel or resize it by its corner**, it stops closing when the mouse leaves — and clicking elsewhere no longer dismisses it either. After that only Esc, or opening another annotation, closes it. You placed it yourself; it should stay.
- Scrolling the wheel inside the panel scrolls the panel only, not the conversation behind it.

### Overview panel

The "Annotations N" pill next to the composer opens the overview:

- Every annotation shows its source, quote, note and thumbnails.
- Drag the handle to reorder; hover for edit and delete; clear all at the bottom.
- The footer carries a build stamp (plugin version) — that is how you confirm which code the page actually loaded. Include it in bug reports.

### Sent annotations

- One card per turn, anchored above that turn's "Completed" section, expanded by default.
- Each entry lists what was sent: quote, note, images.
- When a conversation is rewound, affected annotations are marked as withdrawn and dimmed. **No data is deleted.**

### Replies

- After processing a batch of annotations the model files one reply per annotation, each with a verdict: accepted / partially accepted / rejected / needs clarification.
- Reply cards sit under "Completed" for that turn, showing the source, the verdict, the reasoning and the next step.
- Collapsing "Completed" only hides the body of a reply card; its title stays visible. A card you collapsed yourself is never force-opened because its parent expanded.
- You can annotate text inside a reply card too; the position records the exact batch and entry.

### Images

- Paste or drop images into the popover; up to 4 per annotation, 8 MB each.
- Compressed to JPEG (quality 80%) by default; images whose shorter edge is below 100 px are left untouched.
- Click a thumbnail for full screen; click anywhere or press Esc to close.
- Images live with the draft in the browser, so they survive a reload or a session switch; when a draft grows too large the oldest images are dropped first and the text is kept.

### Settings

Under Settings → Plugins → Selection Annotations:

- Images: whether to compress, quality, and the shorter-edge threshold.
- Annotation instruction: the text shown to the model; editable, restorable.
- Accept / reject wording: the literal text inserted by those buttons (default 【意见采纳】/【意见否决】).

---

## Part 3 · How it works

### What happens when you press send

1. Select, write the note. The annotation is stored in the browser first (draft).
2. On send, the plugin writes this batch into the local database and **reads it back to verify the count**.
3. If the count does not match, nothing is sent: a toast appears, the notes stay in the composer, and you can retry. This exists so that a message never leaves with its annotations lost.
4. Only then is the message sent; the annotations travel as a machine-readable block inside it.
5. The model reads them and files replies per annotation through the `annotation_replies` tool; replies are stored in the local database.
6. The UI polls for new replies every 6 seconds and renders reply cards; opening a sent entry shows that entry's reply right under its note.

### Where data lives

| What | Where | Notes |
| --- | --- | --- |
| Unsent drafts | Browser `localStorage`: `dsh-selection-annotations:draft:<session id>` | up to 24 sessions, 200 items, ~3.5 MB |
| Sent ledger | Browser `localStorage`: `dsh-selection-annotations:sent:<session id>` | 120 entries / 2 MB per session |
| Batches, entries, replies | `$DSH_HOME/selection-annotations/annotations.db` | SQLite (WAL), tables `sessions` / `batches` / `entries` / `drafts` |
| Annotation images | session attachment directory | sent as attachments with the message |
| Diagnostics log | `$DSH_HOME/selection-annotations/scroll-trace.log` | keeps the last 2000 lines |
| Plugin settings | a few `localStorage` keys | images, instruction, verdict wording |

### Privacy and boundaries

- The plugin makes no external network requests; data stays on this machine and inside the current session.
- Host-side write endpoints accept loopback requests only.
- Annotations become part of your message, so the model can read them. That is the point.

---

## Part 4 · Install, configure, develop

### Ways to install

- **From npm** (after release): install by package name `dsh-selection-annotations` in the DSH plugin page.
- **From a local directory**: point the plugin page at the repository path, e.g. `E:\heshujiang\Develop\dsh-selection-annotations`.
- After installing or upgrading, **fully quit DSH** and start it again; reloading the page does not reload plugin code.
- Requirements: Node ≥ 22.13 (uses built-in `node:sqlite`).

### Configuration

- `cordis.patch.yml` inserts the plugin into the active profile (`insert` with id `selection-annotations`). DSH itself is not patched.
- Host option `config.maxPayloadBytes`: payload limit per annotation, 512 KB by default; larger attachments are rejected.
- Diagnostics switch: run `window.__dshSelectionAnnotations.traceScroll(false)` in the console to stop writing scroll traces.
- Reply polling interval: `REPLY_POLL_MS` in `src/core/config.js` (6000 ms by default).

### Host HTTP routes

All of them accept loopback requests only (Host must be `127.0.0.1`, `localhost` or `[::1]`):

| Route | Purpose |
| --- | --- |
| `GET /selection-annotations/session/<session id>` | read the whole snapshot (old shapes tolerated) |
| `PUT/POST /selection-annotations/session/<session id>` | write the whole snapshot |
| `POST /selection-annotations/session/<session id>/batch` | create one batch (idempotent by batch UUID) |
| `PATCH /selection-annotations/entry/<uuid>` | write one entry's reply |
| `PATCH /selection-annotations/batch/<batch_uuid>` | backfill the batch's turn and anchor |
| `POST /selection-annotations/debug/trace` | append diagnostics |

### Source layout and build

Browser code lives in `src/` and is bundled into the single file `client.js` that DSH loads:

| Path | Responsibility |
| --- | --- |
| `src/entry.js` | DSH loader entry |
| `src/plugin.js` | composition root: injected deps, slots, lifecycle, UI |
| `src/core/` | modules by concern: session, drafts, ledger, remote sync, anchors, cards, popover, styles, messages |
| `lib/index.js` | host half: claims the annotation attachment, folds the block into the user message, reply storage, tool definition |
| `lib/annotations-db.js` | SQLite access layer |
| `scripts/build.mjs` | esbuild bundling |
| `scripts/check-build.mjs` | verifies `client.js` matches `src/` |

```bash
npm install          # esbuild is the only dev dependency
npm run build        # regenerate client.js
npm run check:build  # verify the bundle matches the sources
npm test             # build check + all tests
```

`client.js` is generated; do not hand-edit it. React is injected by DSH and treated as external at build time.

### Debugging

- Scroll diagnostics: `$DSH_HOME/selection-annotations/scroll-trace.log`, one JSON object per line, with `session` and `build` fields.
- The send gate writes three kinds of records: `gate-post` (started writing), `gate-done` (write and verification result), `gate-block` (why it was blocked).
- A failed batch write marks the card as unsynced and leaves `batch-post` / `batch-done` in the log.
- To confirm which build the page loaded, read the build stamp at the bottom of the overview panel.

### Known limitations

- Anchoring relies on DSH's private DOM structure; a DSH upgrade may require adaptation.
- Text inside iframes and canvases cannot be annotated.
- When history is virtualised, card placement follows what DSH actually renders.
- The annotation database is per device: a conversation can be shared across devices (e.g. over a remote connection), but annotations sent on another device do not show a sent card here. Moving the database with the session is planned work.
- Where English copy and the Chinese UI differ, the Chinese one is authoritative.

### Reporting issues

This plugin is polished through real usage. When opening an issue, include:

1. Plugin version (the build stamp in the overview panel) and DSH version.
2. What you did, what you expected, what actually happened.
3. A minimal reproduction when possible.
4. Relevant log lines: the few dozen lines near the failure in `$DSH_HOME/selection-annotations/scroll-trace.log`.

Strip private conversation content before pasting logs.

### Relationship to upstream

This repository is a fork of [2A5F/dsh-selection-annotations](https://github.com/2A5F/dsh-selection-annotations) 1.1.0. Since then storage, anchoring and UI were rewritten for our own workflow: annotations in SQLite, replies addressed by UUID, sent-history review, the reply area, the send gate, and withdrawal markers. Upstream's later 2.x line goes in a different direction and features do not map one to one.

### License

MIT — see [LICENSE](LICENSE).
