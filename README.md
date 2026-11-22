# Selection Annotations

**English** · [简体中文](README.zh-CN.md)

Select a passage in the conversation, write what you think about it, and it travels with your next message. The model's answers come back one by one, attached to the exact spot you pointed at.

You no longer have to write "change the second sentence in the third paragraph above". Select it instead.

---

## Install

Install it from DSH → Settings → Plugins. If you can reach npm, use the package name `dsh-selection-annotations`; if not, install from the local folder instead.

Then **quit DSH completely** — including the tray icon — and start it again. Reloading the page is not enough; plugin code loads at startup.

## Three steps to start

1. Drag-select a passage of the assistant's answer.
2. A row of buttons appears under the selection. Click **Annotate**.
3. Write what you mean, for example "recompute these numbers with 12 months".

Then select the next spot, or just send. Your own text is left untouched; the annotations are extra context that rides along with the message.

## Things you will run into

### The toolbar waits a beat

Under the selection you get reject, accept, annotate and copy. The toolbar follows your selection horizontally, but only after you hold still for a second — it does not chase the pointer while you are still dragging, so it never covers the words you are trying to select.

### Clicking outside saves

Clicking outside the note box saves it; Esc throws it away. A fresh annotation with no text and no image is dropped when you click outside, so you never end up with empty rows.

Hover an already-annotated passage for half a second and its editor opens; move away and it saves and closes.

Once you have **dragged the box or resized it by the corner**, it stops closing on its own: clicking elsewhere no longer dismisses it either. At that point only Esc, or opening another annotation, closes it — you placed it yourself, and it should not wander off. It still gives way when you hover a different annotation.

Scrolling the wheel inside the box scrolls the box only; the conversation behind it stays put.

### Overview

A small "Annotations N" pill sits next to the composer. It opens every annotation in the session: source, quote, your note, thumbnails. Drag the rows to reorder, hover to edit or delete, clear all at the bottom. The last line is the plugin version — quote it when you report a problem.

### What you already sent

Each turn has a card listing what you marked for it. When a conversation is rewound, the affected entries are marked as withdrawn and dimmed. That is only a marker; nothing is deleted.

### How it answered

Open any entry in that card and the reply for that specific note sits under your note: the verdict, the reasoning, and what comes next. The reasoning is rendered as Markdown, so lists and code blocks show up properly.

Reply cards also appear under that turn's "Completed" section. Collapsing "Completed" only folds the body of a reply card; the title stays out. A card you collapsed yourself is never popped open again because its parent expanded.

### Images

Paste or drop images straight into the note box. Up to 4 per annotation, 8 MB each, compressed to JPEG by default; images whose shorter edge is under 100 px are left alone. Click a thumbnail for full screen, click anywhere or press Esc to leave.

Images live with the draft in the browser, so a reload or a session switch keeps them. When a draft grows too large the oldest images go first and the text stays.

### Settings

Under Settings → Plugins → Selection Annotations there are three things: image compression and quality, the instruction shown to the model, and the wording inserted by the accept / reject buttons.

## Where the data lives

| What | Where |
| --- | --- |
| Drafts not yet sent | `localStorage`: `dsh-selection-annotations:draft:<session id>` — up to 24 sessions, 200 items, ~3.5 MB |
| Records of what was sent | `localStorage`: `dsh-selection-annotations:sent:<session id>` — 120 entries and 2 MB per session |
| Batches, entries, replies | `$DSH_HOME/selection-annotations/annotations.db` (SQLite, WAL; tables `sessions`, `batches`, `entries`, `drafts`) |
| Annotation images | The session attachment folder, stored with the message |
| Diagnostics | `$DSH_HOME/selection-annotations/scroll-trace.log`, last 2000 lines |
| Plugin settings | A few `localStorage` keys |

The plugin makes no outbound requests; data stays on this machine and inside the current session, and the host-side write endpoints accept loopback only. Annotations do become part of your message, so the model reads them — that is the point.

## What happens when you press send

1. You select and write; the content is stored in the browser first (draft).
2. On send, the plugin writes the batch into the local database and reads it back to check the count.
3. If the count does not match, nothing is sent. A toast explains it, the notes and attachments stay in the composer, and you can retry — the retry reuses the same batch id, so nothing is duplicated.
4. Only then does the message go out, with the annotations as a machine-readable block inside it.
5. The model reads them and files one reply per annotation; replies land in the local database.
6. The UI polls for new replies every 6 seconds and renders reply cards.

Step 3 can feel like a nuisance. It costs you one extra press, and it buys you the guarantee that a message never leaves with its annotations lost.

## Other machines and upgrades

- After an upgrade, fully quit DSH and start it again.
- Node ≥ 22.13 is required (built-in `node:sqlite`).
- The plugin is inserted into the active profile through `cordis.patch.yml` (`insert`, id `selection-annotations`); DSH itself is not patched.
- The host option `config.maxPayloadBytes` caps one annotation's payload at 512 KB by default; larger ones are rejected.
- To stop the scroll diagnostics, run `window.__dshSelectionAnnotations.traceScroll(false)` in the console.
- Reply polling interval is `REPLY_POLL_MS` in `src/core/config.js`, 6000 ms by default.

## If you want to change the code

Browser code lives in `src/` and is bundled into the single file `client.js` that DSH loads.

| Path | Responsibility |
| --- | --- |
| `src/entry.js` | DSH loader entry |
| `src/plugin.js` | composition root: injected deps, slots, lifecycle, UI |
| `src/core/` | modules by concern: session, drafts, ledger, sync, anchors, cards, popover, styles, copy… |
| `lib/index.js` | the host half: claims the annotation attachment, folds the block into the user message, stores replies, defines the tool |
| `lib/annotations-db.js` | SQLite access layer |
| `scripts/build.mjs` | esbuild bundling |
| `scripts/check-build.mjs` | verifies `client.js` matches the sources |

```bash
npm install          # esbuild is the only dev dependency
npm run build        # regenerate client.js
npm run check:build  # verify the bundle matches the sources
npm test             # build check + all tests
```

`client.js` is generated; do not hand-edit it. React is supplied by DSH and treated as external.

### Host routes

All of them accept loopback requests only (Host must be `127.0.0.1`, `localhost` or `[::1]`):

| Route | Purpose |
| --- | --- |
| `GET /selection-annotations/session/<session id>` | read the whole snapshot, old shapes included |
| `PUT` / `POST` on the same path | write the whole snapshot |
| `POST /selection-annotations/session/<session id>/batch` | create one batch, idempotent by batch id |
| `PATCH /selection-annotations/entry/<uuid>` | write one entry's reply |
| `PATCH /selection-annotations/batch/<batch_uuid>` | backfill that batch's turn and anchor |
| `POST /selection-annotations/debug/trace` | append diagnostics |

### When something breaks

The diagnostics log is one JSON object per line, carrying `session` and `build`. The send gate leaves three kinds of records: `gate-post` (started writing), `gate-done` (write and check result), `gate-block` (why it was blocked). A failed batch write leaves `batch-post` / `batch-done` and marks the card unsynced. To find out which build the page loaded, read the build stamp at the bottom of the overview panel.

## What it cannot do yet

- Anchoring relies on DSH's private DOM structure; a major DSH upgrade may need adaptation.
- Text inside iframes and canvases cannot be selected for annotation.
- When history is virtualised, card placement follows what DSH actually renders.
- The annotation database is per device. A conversation can be shared across devices, but annotations sent from another device do not show a sent card here. Moving the database with the session is planned.
- Where the English interface and the Chinese one disagree, the Chinese one wins.

## Reporting problems

This plugin is sharpened by real use, so issues are welcome. Please include:

1. The plugin version (build stamp at the bottom of the overview panel) and the DSH version.
2. What you did, what you expected, what actually happened.
3. A reproduction, as small as you can make it.
4. The few dozen `scroll-trace.log` lines around the failure.

Remove private conversation content before pasting logs.

## About this repository

A fork of [2A5F/dsh-selection-annotations](https://github.com/2A5F/dsh-selection-annotations) 1.1.0. Storage, anchoring and UI were rewritten for our own workflow since then: annotations in SQLite, replies addressed by UUID, sent-history review, the reply area, the send gate, withdrawal markers and more. Upstream's later 2.x line went a different way, so features do not map one to one.

MIT — see [LICENSE](LICENSE).
