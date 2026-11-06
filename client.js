(() => {
  // src/core/styles.js
  var CSS = `
.sa-overlay { position: fixed; inset: 0; pointer-events: none; z-index: 60; }
.sa-hl { position: fixed; pointer-events: none; border-radius: 3px;
  background: rgb(255 208 66 / 0.45); box-shadow: inset 0 -1px 0 rgb(255 176 0 / 0.75); }
.sa-badge { position: fixed; pointer-events: auto; cursor: pointer; font: inherit; border: none; padding: 0 3px; min-width: 15px; height: 15px; padding: 0 3px; box-sizing: border-box;
  display: inline-flex; align-items: center; justify-content: center; border-radius: 8px;
  background: var(--dsw-alias-brand-primary, #247bbf); color: #fff; font-size: 10px; line-height: 1;
  font-weight: 600; font-variant-numeric: tabular-nums; }
.sa-toolbar { position: fixed; display: none; z-index: 61; }
.sa-toolbar[data-open="1"] { display: block; }
.sa-menu { position: fixed; z-index: 65; display: none; min-width: 132px; padding: 4px; box-sizing: border-box;
  border-radius: 8px; color: var(--dsw-alias-label-primary, CanvasText); background: var(--dsw-alias-bg-overlay, Canvas);
  border: 1px solid var(--dsw-alias-border-l2, ButtonBorder); box-shadow: 0 8px 24px rgba(0,0,0,.22); }
.sa-menu[data-open="1"] { display: block; }
.sa-menu-item { display: block; width: 100%; text-align: left; font: inherit; font-size: 12.5px; line-height: 1.2;
  padding: 6px 10px; border: none; border-radius: 5px; background: transparent; color: inherit; cursor: pointer; }
.sa-menu-item:hover { background: var(--dsw-alias-interactive-bg-hover, ButtonFace); }
.sa-btn { font: inherit; font-size: 12px; line-height: 1; padding: 6px 10px; cursor: pointer;
  color: var(--dsw-alias-label-primary, CanvasText); background: var(--dsw-alias-bg-overlay, Canvas);
  border: 1px solid var(--dsw-alias-border-l2, ButtonBorder); border-radius: 7px;
  box-shadow: 0 4px 14px rgba(0,0,0,.18); }
.sa-btn:hover { border-color: var(--dsw-alias-brand-primary, #247bbf); color: var(--dsw-alias-brand-primary, #247bbf); }
.sa-popover { position: fixed; display: block; z-index: 70; width: 340px; max-width: calc(100vw - 24px);
  padding: 10px; box-sizing: border-box; border-radius: 10px; color: var(--dsw-alias-label-primary, CanvasText);
  background: var(--dsw-alias-bg-overlay, Canvas); border: 1px solid var(--dsw-alias-border-l2, ButtonBorder);
  box-shadow: 0 10px 32px rgba(0,0,0,.24);
  opacity: 0; visibility: hidden; transform: translateY(-6px) scale(0.98);
  will-change: opacity, transform;
  transition: opacity 180ms ease, transform 180ms ease, visibility 180ms; }
.sa-popover[data-open="1"] { opacity: 1; visibility: visible; transform: none; }
.sa-viewer { position: fixed; inset: 0; z-index: 80; display: none; align-items: center; justify-content: center;
  background: rgb(0 0 0 / 0.72); cursor: zoom-out; }
.sa-viewer[data-open="1"] { display: flex; }
.sa-viewer-img { max-width: 92vw; max-height: 88vh; box-sizing: border-box; border-radius: 6px;
  background: #fff; box-shadow: 0 12px 48px rgb(0 0 0 / 0.5); }
.sa-pop-title { font-size: 12px; font-weight: 600; margin: 0 0 6px; }
.sa-pop-quote { max-height: 120px; overflow: auto; margin: 0 0 8px; padding: 6px 8px; font-size: 12px;
  white-space: pre-wrap; word-break: break-word; color: var(--dsw-alias-label-secondary, GrayText);
  background: var(--dsw-alias-bg-layer-2, ButtonFace); border-left: 2px solid var(--dsw-alias-border-l2, ButtonBorder); border-radius: 4px; }
.sa-pop-src { margin: 0 0 8px; font-size: 11px; color: var(--dsw-alias-label-secondary, GrayText); }
.sa-pop-input { width: 100%; box-sizing: border-box; min-height: 62px; resize: vertical; padding: 6px 8px;
  font: inherit; font-size: 12px; color: var(--dsw-alias-label-primary, CanvasText); background: var(--dsw-alias-bg-layer-1, Canvas);
  border: 1px solid var(--dsw-alias-border-l1, ButtonBorder); border-radius: 6px; }
.sa-pop-actions { display: flex; align-items: center; gap: 6px; margin-top: 8px; }
.sa-pop-spacer { flex: 1; }
.sa-pop-delete { color: var(--dsw-alias-state-error-primary, #e5484d); }
.sa-float { position: fixed; z-index: 63; max-width: calc(100vw - 16px); }
.sa-chip { font: inherit; font-size: 12px; line-height: 1; padding: 5px 9px; cursor: pointer;
  color: var(--dsw-alias-brand-primary, #247bbf); background: color-mix(in srgb, var(--dsw-alias-brand-primary, #247bbf) 12%, transparent);
  border: 1px solid color-mix(in srgb, var(--dsw-alias-brand-primary, #247bbf) 38%, transparent); border-radius: 999px; }
.sa-chip:hover { background: color-mix(in srgb, var(--dsw-alias-brand-primary, #247bbf) 22%, transparent); }
.sa-chip-open { background: color-mix(in srgb, var(--dsw-alias-brand-primary, #247bbf) 30%, transparent); }
.sa-panel { display: flex; flex-direction: column; width: min(560px, calc(100vw - 32px)); max-height: min(72vh, 600px);
  padding: 0; box-sizing: border-box; overflow: hidden; border-radius: 12px; color: var(--dsw-alias-label-primary, CanvasText);
  background: var(--dsw-alias-bg-layer-1, Canvas); border: 1px solid var(--dsw-alias-border-l2, ButtonBorder);
  box-shadow: 0 18px 48px rgb(0 0 0 / 0.28);
  opacity: 0; visibility: hidden; transform: translateY(6px) scale(0.98); will-change: opacity, transform;
  transition: opacity 180ms ease, transform 180ms ease, visibility 180ms; }
.sa-float[data-open="1"] .sa-panel { opacity: 1; visibility: visible; transform: none; }
.sa-panel-head { display: flex; align-items: center; flex-wrap: wrap; row-gap: 4px; gap: 8px; flex: none; padding: 12px 14px 10px;
  border-bottom: 1px solid var(--dsw-alias-border-l1, ButtonBorder); }
.sa-panel-title { flex: none; min-width: 0; font-size: 13px; font-weight: 600; letter-spacing: 0.01em; }
.sa-build { flex: 0 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; font-size: 11px; font-style: italic;
  font-variant-numeric: tabular-nums; letter-spacing: 0.02em; color: var(--dsw-alias-label-tertiary, GrayText);
  user-select: text; white-space: nowrap; }
.sa-panel-meta { display: flex; align-items: center; gap: 8px; min-width: 0; flex: none; max-width: 66%; margin-left: auto; }
.sa-panel-hint { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 11px;
  color: var(--dsw-alias-label-tertiary, GrayText); }
.sa-panel-count { padding: 2px 7px; border-radius: 999px; font-size: 11px; font-variant-numeric: tabular-nums;
  color: var(--dsw-alias-label-secondary, GrayText); background: var(--dsw-alias-bg-layer-2, ButtonFace); }
.sa-panel-body { flex: 1 1 auto; min-height: 0; overflow: auto; padding: 4px 8px 10px; }
.sa-panel-empty { padding: 30px 18px; text-align: center; font-size: 12.5px; line-height: 1.7;
  color: var(--dsw-alias-label-secondary, GrayText); }
.sa-item { padding: 10px 8px; border-radius: 8px; border-bottom: none; }
.sa-item + .sa-item { border-top: 1px solid var(--dsw-alias-border-l1, ButtonBorder); border-radius: 0; }
.sa-item:hover { background: color-mix(in srgb, var(--dsw-alias-bg-layer-2, ButtonFace) 55%, transparent); }
.sa-item.sa-dragging { opacity: 0.45; }
.sa-item.sa-drop-before { box-shadow: inset 0 2px 0 var(--dsw-alias-brand-primary, #247bbf); }
.sa-drag-handle { cursor: grab; color: var(--dsw-alias-label-tertiary, GrayText); font-size: 12px; line-height: 1;
  padding: 2px 3px; border-radius: 4px; user-select: none; }
.sa-drag-handle:hover { background: var(--dsw-alias-bg-layer-2, ButtonFace); color: var(--dsw-alias-label-primary, CanvasText); }
.sa-drag-handle:active { cursor: grabbing; }
.sa-item-head { display: flex; align-items: center; gap: 6px; }
.sa-item-num { display: inline-flex; align-items: center; justify-content: center; min-width: 18px; height: 18px;
  padding: 0 5px; border-radius: 5px; font-size: 11px; font-weight: 600; font-variant-numeric: tabular-nums;
  color: var(--dsw-alias-brand-primary, #247bbf);
  background: color-mix(in srgb, var(--dsw-alias-brand-primary, #247bbf) 14%, transparent); }
.sa-item-src { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 11px;
  color: var(--dsw-alias-label-secondary, GrayText); }
.sa-item-actions { display: flex; gap: 2px; opacity: 0; transition: opacity 120ms ease; }
.sa-item:hover .sa-item-actions, .sa-item:focus-within .sa-item-actions { opacity: 1; }
.sa-item-action { font: inherit; font-size: 11.5px; padding: 2px 6px; border-radius: 5px; cursor: pointer;
  border: none; background: none; color: var(--dsw-alias-label-secondary, GrayText); }
.sa-item-action:hover { background: var(--dsw-alias-bg-layer-2, ButtonFace); color: var(--dsw-alias-label-primary, CanvasText); }
.sa-item-action.sa-danger:hover { color: var(--dsw-alias-state-error-primary, #e5484d); }
.sa-item-q { margin-top: 8px; padding-left: 10px; border-left: 2px solid var(--dsw-alias-border-l1, ButtonBorder); }
.sa-item-label { font-size: 10.5px; letter-spacing: 0.06em; color: var(--dsw-alias-label-secondary, GrayText); }
.sa-item-quote { margin: 3px 0 0; font-size: 12.5px; line-height: 1.7; white-space: pre-wrap; word-break: break-word;
  color: var(--dsw-alias-label-secondary, GrayText); display: -webkit-box; -webkit-box-orient: vertical;
  -webkit-line-clamp: 3; overflow: hidden; cursor: pointer; }
.sa-item-quote.sa-q-open { display: block; -webkit-line-clamp: unset; }
.sa-item-a { margin-top: 8px; }
.sa-item-note { margin: 3px 0 0; font-size: 14px; line-height: 1.7; white-space: pre-wrap; word-break: break-word;
  color: var(--dsw-alias-label-primary, CanvasText); }
.sa-link { font: inherit; font-size: 11px; padding: 2px 4px; cursor: pointer; background: none; border: none;
  color: var(--dsw-alias-label-secondary, GrayText); text-decoration: underline; }
.sa-link:hover { color: var(--dsw-alias-state-error-primary, #e5484d); }
.sa-foot { display: flex; align-items: center; gap: 8px; }
.sa-foot-action { font: inherit; font-size: 11.5px; padding: 3px 8px; border-radius: 6px; cursor: pointer;
  border: 1px solid var(--dsw-alias-border-l1, ButtonBorder); background: none;
  color: var(--dsw-alias-label-secondary, GrayText); }
.sa-foot-action:hover { color: var(--dsw-alias-state-error-primary, #e5484d);
  border-color: color-mix(in srgb, var(--dsw-alias-state-error-primary, #e5484d) 35%, transparent); }
.sa-search { flex: 1; box-sizing: border-box; padding: 5px 8px; font: inherit; font-size: 12px;
  color: var(--dsw-alias-label-primary, CanvasText); background: var(--dsw-alias-bg-layer-2, ButtonFace);
  border: 1px solid var(--dsw-alias-border-l1, ButtonBorder); border-radius: 6px; }
.sa-result { display: block; width: 100%; text-align: left; font: inherit; font-size: 12px; padding: 5px 6px;
  cursor: pointer; background: none; border: none; border-radius: 6px; color: var(--dsw-alias-label-primary, CanvasText); }
.sa-result:hover { background: var(--dsw-alias-bg-layer-2, ButtonFace); }
.sa-hint { font-size: 11px; color: var(--dsw-alias-label-secondary, GrayText); }
.sa-pop-images { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; margin-top: 6px; }
.sa-pop-image { position: relative; width: 56px; height: 56px; border-radius: 6px; overflow: hidden;
  border: 1px solid var(--dsw-alias-border-l1, ButtonBorder); background: var(--dsw-alias-bg-layer-2, ButtonFace); }
.sa-pop-thumb { width: 100%; height: 100%; object-fit: cover; display: block; }
.sa-pop-thumb-fallback { display: flex; align-items: center; justify-content: center; width: 100%; height: 100%;
  box-sizing: border-box; padding: 2px; font-size: 10px; text-align: center; color: var(--dsw-alias-label-secondary, GrayText); }
.sa-pop-image-remove { position: absolute; top: 0; right: 0; width: 16px; height: 16px; padding: 0; line-height: 1;
  cursor: pointer; border: none; border-radius: 0 0 0 6px; font-size: 11px; color: #fff; background: rgb(0 0 0 / 0.55); }
.sa-pop-images-hint { font-size: 11px; color: var(--dsw-alias-label-secondary, GrayText); }
.sa-item-images { display: flex; gap: 4px; flex-wrap: wrap; margin-top: 4px; }
.sa-item-thumb { width: 40px; height: 40px; object-fit: cover; border-radius: 4px;
  border: 1px solid var(--dsw-alias-border-l1, ButtonBorder); }
.sa-settings { margin-top: 6px; padding-top: 6px; border-top: 1px solid var(--dsw-alias-border-l1, ButtonBorder); }
.sa-settings-head { display: flex; align-items: center; gap: 8px; }
.sa-setting { display: flex; align-items: center; gap: 6px; margin-top: 4px; font-size: 11px;
  color: var(--dsw-alias-label-secondary, GrayText); }
.sa-setting-value { min-width: 34px; font-variant-numeric: tabular-nums; }
.sa-setting-number { width: 68px; }
.sa-setting-textarea { width: 100%; min-height: 96px; box-sizing: border-box; resize: vertical; margin-top: 6px;
  padding: 6px 8px; font: inherit; font-size: 12px; line-height: 1.5; color: var(--dsw-alias-label-primary, CanvasText);
  background: var(--dsw-alias-bg-layer-2, ButtonFace); border: 1px solid var(--dsw-alias-border-l1, ButtonBorder); border-radius: 6px; }
.sa-settings-actions { display: flex; align-items: center; gap: 8px; margin-top: 4px; }
.sa-settings-page { display: flex; flex-direction: column; gap: 8px; padding: 4px 2px 8px; }
.sa-settings-page-head { display: flex; align-items: center; gap: 8px; }
.sa-settings-page .sa-hint { font-size: 12px; line-height: 1.6; margin: 0; }
.sa-replies-card { display: flex; flex-direction: column; gap: 8px; padding: 10px 12px; border: 1px solid var(--dsw-alias-border-l1, #3333); border-radius: 10px; background: var(--dsw-alias-bg-layer-1, #0001); }
.sa-replies { display: flex; flex-direction: column; gap: 10px; margin: 8px 0 0; width: 100%; max-width: none; box-sizing: border-box; padding: 0;
  border: none; background: transparent; }
/* 两个区域共用同一个收展头：同样的高度、底色、圆角、图标位置与开合动画。*/
.sa-section-head { display: flex; align-items: center; gap: 8px; width: 100%; box-sizing: border-box;
  margin: 0; padding: 7px 10px; font: inherit; text-align: left; cursor: pointer; user-select: none;
  border: 1px solid var(--dsw-alias-border-l1, ButtonBorder); border-radius: 8px;
  background: var(--dsw-alias-bg-layer-2, #ffffff0a); color: var(--dsw-alias-label-primary, CanvasText); }
.sa-section-head:hover { background: var(--dsw-alias-interactive-bg-hover, ButtonFace); }
.sa-section-head:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary, #247bbf); outline-offset: 1px; }
.sa-section-title { font-size: 13px; font-weight: 600; line-height: 1.3; }
.sa-section-meta { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  font-size: 12px; line-height: 1.3; color: var(--dsw-alias-label-secondary, #8b949e); }
.sa-section-chevron { flex: none; display: block; width: 14px; height: 14px;
  color: var(--dsw-alias-label-secondary, #8b949e); transition: transform 180ms ease; }
.sa-section-head[aria-expanded="true"] .sa-section-chevron { transform: rotate(90deg); }
.sa-collapse { display: grid; grid-template-rows: 0fr; opacity: 0; margin-top: 6px;
  transition: grid-template-rows 180ms ease, opacity 180ms ease; }
.sa-collapse[data-open="1"] { grid-template-rows: 1fr; opacity: 1; }
.sa-collapse-inner { min-height: 0; overflow: hidden; }
.sa-replies-head { font-size: 12px; font-weight: 600; color: var(--dsw-alias-label-primary, CanvasText); }
.sa-replies-body { display: flex; flex-direction: column; gap: 10px; }

/* 每条答复一张独立卡片：抬升表面 + 判定色左边线，肉眼先分条、再读内容 */
.sa-reply-item { display: flex; flex-direction: column; box-sizing: border-box; overflow: hidden;
  border: 1px solid var(--dsw-alias-border-l1, ButtonBorder);
  border-left: 3px solid var(--sa-tone, var(--dsw-alias-border-l1, ButtonBorder));
  border-radius: 10px; background: var(--dsw-alias-bg-layer-1, Canvas);
  box-shadow: 0 1px 2px rgb(0 0 0 / 0.16); }
.sa-tone-accepted { --sa-tone: var(--dsw-alias-state-success-primary, #3fb950); }
.sa-tone-partial { --sa-tone: var(--dsw-alias-state-warn-primary, #d29922); }
.sa-tone-rejected { --sa-tone: var(--dsw-alias-state-error-primary, #f85149); }
.sa-tone-needs_info { --sa-tone: var(--dsw-alias-state-business-primary, #58a6ff); }
.sa-reply-head { display: flex; align-items: center; justify-content: space-between; gap: 8px;
  padding: 6px 12px; background: var(--dsw-alias-bg-layer-2, #ffffff0a);
  border-bottom: 1px solid var(--dsw-alias-border-secondary, #3333); }
.sa-reply-index { font-size: 11px; font-weight: 600; letter-spacing: 0.06em;
  color: var(--dsw-alias-label-secondary, #8b949e); }
.sa-reply-body { display: flex; flex-direction: column; gap: 10px; padding: 12px; }

/* 批注块：内嵌浅底 + 左竖线，把引用与批注降为「上下文」层 */
.sa-q { display: flex; flex-direction: column; gap: 5px; min-width: 0; padding: 9px 12px;
  border-left: 2px solid var(--dsw-alias-border-l2, ButtonBorder); border-radius: 0 8px 8px 0;
  background: var(--dsw-alias-bg-layer-2, #ffffff08); }
.sa-q-label { font-size: 10.5px; font-weight: 600; letter-spacing: 0.08em;
  color: var(--dsw-alias-label-tertiary, #6e7681); }
.sa-q-quote { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 3; overflow: hidden;
  font-size: 12.5px; line-height: 1.6; color: var(--dsw-alias-label-secondary, #8b949e);
  white-space: pre-wrap; word-break: break-word; cursor: pointer; }
.sa-q-quote.sa-q-open { display: block; -webkit-line-clamp: unset; }
.sa-q-note { font-size: 14px; font-weight: 500; line-height: 1.65; color: var(--dsw-alias-label-primary, CanvasText);
  white-space: pre-wrap; word-break: break-word; }

/* 答复块：正文层，字号与对比度最高 */
.sa-a { display: flex; flex-direction: column; gap: 6px; }
.sa-a-head { display: flex; align-items: center; gap: 8px; }
.sa-a-label { font-size: 10.5px; font-weight: 600; letter-spacing: 0.08em;
  color: var(--dsw-alias-label-tertiary, #6e7681); }
.sa-a-verdict { font-size: 11px; font-weight: 600; padding: 1px 8px; border-radius: 999px;
  border: 1px solid currentColor; background: transparent;
  background: color-mix(in srgb, currentColor 12%, transparent); }
.sa-reply-accepted { color: var(--dsw-alias-state-success-primary, #3fb950); }
.sa-reply-partial { color: var(--dsw-alias-state-warn-primary, #d29922); }
.sa-reply-rejected { color: var(--dsw-alias-state-error-primary, #f85149); }
.sa-reply-needs_info { color: var(--dsw-alias-state-business-primary, #58a6ff); }
.sa-a-reason { font-size: 15px; line-height: 1.75; color: var(--dsw-alias-label-primary, CanvasText);
  white-space: pre-wrap; word-break: break-word; }
.sa-a-next { margin-top: 2px; padding: 6px 10px; border-radius: 6px;
  border-left: 2px solid var(--sa-tone, var(--dsw-alias-border-l1, ButtonBorder));
  background: var(--dsw-alias-bg-layer-2, #ffffff08); font-size: 12.5px; line-height: 1.5;
  color: var(--dsw-alias-label-secondary, #8b949e); }
.sa-sent { display: block; margin: 8px 0 0; width: 100%; max-width: none; box-sizing: border-box; }
.sa-sent-body { margin: 0; padding: 6px 8px; box-sizing: border-box; border-radius: 8px;
  border: 1px solid var(--dsw-alias-border-l1, ButtonBorder); background: var(--dsw-alias-bg-layer-1, Canvas); }
.sa-sent-item { display: flex; gap: 6px; padding: 8px 0; font-size: 12px; line-height: 1.5;
  border-top: 1px solid var(--dsw-alias-border-secondary, #3333); }
.sa-sent-item:first-child { border-top: none; padding-top: 2px; }
.sa-sent-num { flex: none; min-width: 14px; font-weight: 600; color: var(--dsw-alias-brand-primary, #247bbf); }
.sa-sent-text { min-width: 0; }
.sa-sent-quote { padding-left: 8px; border-left: 2px solid var(--dsw-alias-border-l1, ButtonBorder);
  font-size: 12.5px; color: var(--dsw-alias-label-secondary, GrayText); white-space: pre-wrap; word-break: break-word; }
.sa-sent-note { margin-top: 4px; font-size: 14px; line-height: 1.6; color: var(--dsw-alias-label-primary, CanvasText); white-space: pre-wrap; word-break: break-word; }
.sa-sent-thumbs { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 6px; }
.sa-sent-thumb { width: 96px; height: 96px; object-fit: cover; border-radius: 6px; cursor: zoom-in;
  border: 1px solid var(--dsw-alias-border-l1, ButtonBorder); }
`;

  // src/core/config.js
  var ANNOTATION_FILE = "批注.json";
  var PAYLOAD_KIND = "dsh-selection-annotations";
  var MAX_QUOTE = 1600;
  var MAX_NOTE = 4e3;
  var MAX_IMAGES_PER_ANNOTATION = 4;
  var MAX_IMAGE_BYTES = 8 * 1024 * 1024;
  var IMAGE_SETTINGS_KEY = "dsh-selection-annotations:image-settings";
  var DEFAULT_IMAGE_SETTINGS = { compress: true, quality: 0.8, minSize: 100 };
  var INSTRUCTION_SETTINGS_KEY = "dsh-selection-annotations:instruction-settings";
  var DEFAULT_INSTRUCTION = [
    "这是用户发来的批注数据块。它与用户消息正文相互独立：用户可能同时发了正文，",
    "也可能只发了这个批注块（此时它就是本条消息的全部内容）。annotations[].quote 是用户选中的原文；",
    "annotations[].source 给出它的位置：",
    "工作区文件用 path + lineStart/lineEnd（1 基行号）+ charStart/charEnd；",
    "对话消息用 role + anchorKey + charStart/charEnd；",
    "逐条答复区域用 kind + batchAt + index + field + charStart/charEnd：",
    'kind 为 "reply"，batchAt 是该批答复的时间戳，index 是这条答复对应的批注编号，',
    "field 取 quote / note / reason / next（跨字段时为 item），charStart/charEnd 是字段渲染文本的字符偏移。",
    "已发送批注区域用 kind + anchorKey + index + field + charStart/charEnd：",
    'kind 为 "sent"，anchorKey 是该卡片所属消息的锚点键，index 是已发送批注的编号，field 取 quote / note（跨字段为 item）。',
    "charStart/charEnd 是半开区间 [charStart, charEnd)，",
    '口径由 source.textOrigin 指明："source" = 文件原文的字符偏移，',
    '"rendered" = 该锚点元素渲染后正文的字符偏移。工作区文件但凡能读到原文就给 "source"；',
    '拿不到原文（或引文跨了 Markdown 标记）时退回 "rendered"。',
    "annotations[].images 是该条批注附带的图片，order 是图片在本条消息图片附件中的 1 基顺序，",
    "请把 order 与消息里图片的出现顺序对照。处理完这批批注后，",
    "必须调用 annotation_replies 工具提交逐条答复，不要在正文里重复逐条内容：",
    "replies 里每一项对应一条批注，index 与 annotations[].index 一致，",
    "verdict 取 accepted / partial / rejected / needs_info，",
    "reason 写理由，next 写下一步。正文只用来说明整体改动或提出需要澄清的问题。"
  ].join("");
  var DEFAULT_INSTRUCTION_EN = [
    "This is an annotation payload sent by the user. It is independent of the user message body: ",
    "the user may have sent a body as well, or only this payload (in which case it is the entire message). ",
    "annotations[].quote is the text the user selected; annotations[].source gives its position: ",
    "workspace files use path + lineStart/lineEnd (1-based lines) + charStart/charEnd; ",
    "chat messages use role + anchorKey + charStart/charEnd; ",
    "the reply area uses kind + batchAt + index + field + charStart/charEnd: ",
    'kind is "reply", batchAt is the batch timestamp, index is the annotation number the reply belongs to, ',
    "field is quote / note / reason / next (item when the selection spans fields), and charStart/charEnd ",
    "are character offsets into the field's rendered text. ",
    "The sent-annotations area uses kind + anchorKey + index + field + charStart/charEnd: ",
    'kind is "sent", anchorKey is the message anchor of that card, index is the sent annotation number, ',
    "field is quote / note (item across fields). ",
    "charStart/charEnd is the half-open range [charStart, charEnd); ",
    'source.textOrigin tells you the basis: "source" means character offsets in the original file, ',
    '"rendered" means offsets in the rendered text of the anchored element. ',
    'Use "source" whenever the workspace file text can be read; fall back to "rendered" when it cannot ',
    "(or when the quote crosses Markdown markers). ",
    "annotations[].images lists images attached to that annotation; order is the 1-based position ",
    "of the image among this message's image attachments—match order against how images appear in the message. ",
    "After handling this batch you must call the annotation_replies tool to submit per-annotation replies ",
    "instead of repeating them in the body: each entry in replies matches one annotation, index matches ",
    "annotations[].index, verdict is accepted / partial / rejected / needs_info, reason explains it, ",
    "and next states the next step. Use the body only for an overall summary or clarifying questions."
  ].join("");
  var LOCALE_NS = "selection-annotations";
  var PLUGIN_BUILD = "1.3.0+10";

  // src/core/messages.js
  var MESSAGES = {
    zh: {
      annotate: "批注",
      "menu.annotate": "批注选中文字",
      "menu.copy": "复制",
      "viewer.alt": "批注图片",
      "image.alt": "图片",
      "image.open": "点击查看大图",
      "image.remove": "移除这张图",
      "pop.placeholder": "写点什么（可以留空，只标记原文）",
      "pop.imagesHint": "可粘贴或拖入图片，随本条批注一起发出",
      "pop.delete": "删除",
      "pop.cancel": "取消",
      "pop.save": "保存",
      "pop.createTitle": "新建批注",
      "pop.editTitle": "修改批注 #{n}",
      "panel.empty": "选中回复、消息或文件预览里的文字，点浮动「批注」即可。",
      "panel.title": "批注总览",
      "panel.count": "{n} 条",
      "panel.drag": "拖动排序",
      "panel.edit": "编辑",
      "panel.delete": "删除",
      "panel.quote": "引用",
      "panel.note": "批注",
      "panel.clear": "清空",
      "panel.foot": "发送时批注作为独立块随消息提交",
      "panel.refineFailed": "位置精修未生效：{reason}",
      "settings.imagesOpen": "收起图片设置",
      "settings.imagesClosed": "图片设置",
      "settings.imagesOn": "压缩为 JPEG {n}%",
      "settings.imagesOff": "不压缩，原样发送",
      "settings.compress": " 压缩图片（JPEG）",
      "settings.quality": "质量 ",
      "settings.minSizeBefore": "最短边超过 ",
      "settings.minSizeAfter": " 像素才压缩",
      "settings.instructionOpen": "收起批注指令",
      "settings.instructionClosed": "批注指令",
      "settings.pageTitle": "批注指令",
      "settings.default": "默认文案",
      "settings.customized": "已自定义",
      "settings.restore": "恢复默认",
      "settings.instrHint": "删掉「必须调用annotation_replies」那句会让逐条答复失效",
      "settings.pageHint": "这段文字随每条批注一起发给模型。删掉「必须调用 annotation_replies」那句，逐条答复会失效。",
      "chip.emptyTitle": "还没有批注：选中正文或文件里的文字后点浮动「批注」",
      "chip.title": "查看 / 管理批注",
      "chip.label": "批注",
      "chip.count": "批注 ×{n}",
      "sent.title": "已发送的批注 ×{n}",
      "replies.title": "批注答复 ×{n}",
      "replies.waiting": "批注答复：等待参数",
      "verdict.accepted": "采纳",
      "verdict.partial": "部分采纳",
      "verdict.rejected": "不采纳",
      "verdict.needs_info": "需要澄清",
      "verdict.unknown": "未判定",
      "verdict.fallback": "答复",
      "summary.accepted": "采纳 {n}",
      "summary.partial": "部分 {n}",
      "summary.rejected": "不采纳 {n}",
      "summary.needsInfo": "需澄清 {n}",
      "label.quote": "引用原文",
      "label.note": "批注",
      "label.answer": "答复",
      "label.reason": "答复理由",
      "label.next": "下一步",
      "reply.index": "批注 {n}",
      "reply.fallbackLabel": "批注 {n} · 答复",
      "next.prefix": "下一步：{text}",
      expand: "点击展开全文",
      "source.unknown": "未知出处",
      "source.user": "用户消息",
      "source.assistant": "助手回复",
      "source.message": "{role}（锚点 {anchor}）",
      "source.file": "工作区文件 `{path}`{where}",
      "source.lineRange": " 第 {a}—{b} 行",
      "source.lineSingle": " 第 {n} 行",
      "source.pathUnknown": "(未知路径)",
      "source.replyField": "整条答复",
      "source.sentField": "整条批注",
      "source.reply": "逐条答复 · 批注 {index} · {field}（锚点 {anchor}{span}）",
      "source.sent": "已发送批注 · 批注 {index} · {field}（锚点 {anchor}{span}）",
      "source.span": "，字符 {a}–{b}",
      "source.selection": "页面选区",
      "source.fileFallback": "文件",
      "source.replyShort": "批注 {n} 的答复",
      "source.sentShort": "已发送批注 {n}",
      "source.rendered": "（渲染坐标）"
    },
    en: {
      annotate: "Annotate",
      "menu.annotate": "Annotate selection",
      "menu.copy": "Copy",
      "viewer.alt": "Annotated image",
      "image.alt": "Image",
      "image.open": "Click to view full size",
      "image.remove": "Remove this image",
      "pop.placeholder": "Add a note (optional — you can just mark the text)",
      "pop.imagesHint": "Paste or drop images to send with this annotation",
      "pop.delete": "Delete",
      "pop.cancel": "Cancel",
      "pop.save": "Save",
      "pop.createTitle": "New annotation",
      "pop.editTitle": "Edit annotation #{n}",
      "panel.empty": "Select text in a reply, message, or file preview, then click the floating “Annotate”.",
      "panel.title": "Annotations",
      "panel.count": "{n} items",
      "panel.drag": "Drag to reorder",
      "panel.edit": "Edit",
      "panel.delete": "Delete",
      "panel.quote": "Quote",
      "panel.note": "Note",
      "panel.clear": "Clear",
      "panel.foot": "Annotations are sent as a separate block with the message",
      "panel.refineFailed": "Position refinement failed: {reason}",
      "settings.imagesOpen": "Hide image settings",
      "settings.imagesClosed": "Image settings",
      "settings.imagesOn": "Compress to JPEG {n}%",
      "settings.imagesOff": "Send originals without compression",
      "settings.compress": " Compress images (JPEG)",
      "settings.quality": "Quality ",
      "settings.minSizeBefore": "Compress only when the shortest side exceeds ",
      "settings.minSizeAfter": " px",
      "settings.instructionOpen": "Hide annotation instruction",
      "settings.instructionClosed": "Annotation instruction",
      "settings.pageTitle": "Annotation instruction",
      "settings.default": "Default text",
      "settings.customized": "Customized",
      "settings.restore": "Restore default",
      "settings.instrHint": "Removing the sentence that requires annotation_replies disables per-annotation replies",
      "settings.pageHint": "This text is sent to the model with every annotation. Removing the sentence that requires annotation_replies disables per-annotation replies.",
      "chip.emptyTitle": "No annotations yet: select text in the body or a file, then click the floating “Annotate”",
      "chip.title": "View / manage annotations",
      "chip.label": "Annotate",
      "chip.count": "Annotate ×{n}",
      "sent.title": "Sent annotations ×{n}",
      "replies.title": "Annotation replies ×{n}",
      "replies.waiting": "Annotation replies: waiting for arguments",
      "verdict.accepted": "Accepted",
      "verdict.partial": "Partially accepted",
      "verdict.rejected": "Rejected",
      "verdict.needs_info": "Needs clarification",
      "verdict.unknown": "Unrated",
      "verdict.fallback": "Reply",
      "summary.accepted": "Accepted {n}",
      "summary.partial": "Partial {n}",
      "summary.rejected": "Rejected {n}",
      "summary.needsInfo": "Needs clarification {n}",
      "label.quote": "Quoted text",
      "label.note": "Note",
      "label.answer": "Reply",
      "label.reason": "Reason",
      "label.next": "Next step",
      "reply.index": "Annotation {n}",
      "reply.fallbackLabel": "Annotation {n} · reply",
      "next.prefix": "Next step: {text}",
      expand: "Click to expand",
      "source.unknown": "Unknown source",
      "source.user": "User message",
      "source.assistant": "Assistant reply",
      "source.message": "{role} (anchor {anchor})",
      "source.file": "Workspace file `{path}`{where}",
      "source.lineRange": " lines {a}–{b}",
      "source.lineSingle": " line {n}",
      "source.pathUnknown": "(unknown path)",
      "source.replyField": "Entire reply",
      "source.sentField": "Entire annotation",
      "source.reply": "Annotation reply · annotation {index} · {field} (anchor {anchor}{span})",
      "source.sent": "Sent annotation · annotation {index} · {field} (anchor {anchor}{span})",
      "source.span": ", chars {a}–{b}",
      "source.selection": "Page selection",
      "source.fileFallback": "File",
      "source.replyShort": "Reply to annotation {n}",
      "source.sentShort": "Sent annotation {n}",
      "source.rendered": " (rendered position)"
    }
  };

  // src/core/constants.js
  var DRAFT_MAX_BYTES = 3.5 * 1024 * 1024;
  var HOVER_OPEN_DELAY_MS = 500;
  var SETTLE_MS = 220;
  var UPLOAD_DEBOUNCE_MS = 450;
  var UPLOAD_READY_TIMEOUT_MS = 1e4;
  var REPAINT_MS = 120;
  var CONSUME_POLL_MS = 1e3;
  var CONSUME_CONFIRM_MS = 400;
  var SOURCE_LOOKUP_TIMEOUT_MS = 600;
  var ORPHAN_SWEEP_MS = 1500;
  var REFINE_WAIT_MS = 1200;
  var STRAY_GUARD_MS = 12e4;

  // src/core/log.js
  var log = (message, ...rest) => {
    try {
      console.log(message, ...rest);
    } catch {
    }
  };
  var warn = (message, ...rest) => {
    try {
      console.error(message, ...rest);
    } catch {
    }
  };

  // src/core/util.js
  var safe = (fn) => {
    try {
      return fn();
    } catch {
      return void 0;
    }
  };
  function cssEscape(value) {
    return String(value).replace(/["\\]/g, "\\$&");
  }
  function truncateQuote(value) {
    const text = typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
    return text.length > 140 ? `${text.slice(0, 140)}…` : text;
  }
  function el(tag, className, text) {
    const created = document.createElement(tag);
    if (className !== void 0) created.className = className;
    if (text !== void 0) created.textContent = text;
    return created;
  }

  // src/core/image-codec.js
  function jpegName(name) {
    const base = typeof name === "string" && name !== "" ? name : "image";
    return `${base.replace(/\.[^.]+$/, "")}.jpg`;
  }
  async function compressImage(file, settings) {
    if (!settings.compress) return file;
    if (typeof createImageBitmap !== "function") return file;
    let bitmap;
    try {
      bitmap = await createImageBitmap(file);
    } catch {
      return file;
    }
    try {
      if (Math.max(bitmap.width, bitmap.height) <= settings.minSize) return file;
      const canvas = document.createElement("canvas");
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const painter = canvas.getContext("2d");
      if (painter === null) return file;
      painter.fillStyle = "#ffffff";
      painter.fillRect(0, 0, canvas.width, canvas.height);
      painter.drawImage(bitmap, 0, 0);
      const blob = await new Promise((resolve) => {
        try {
          canvas.toBlob(resolve, "image/jpeg", settings.quality);
        } catch {
          resolve(null);
        }
      });
      if (blob === null || blob.size >= file.size) return file;
      return new File([blob], jpegName(file.name), { type: "image/jpeg" });
    } finally {
      safe(() => bitmap.close?.());
    }
  }
  async function downscaleDataUrl(file, maxSide, quality) {
    if (typeof createImageBitmap !== "function") return void 0;
    let bitmap;
    try {
      bitmap = await createImageBitmap(file);
    } catch {
      return void 0;
    }
    try {
      const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
      const width = Math.max(1, Math.round(bitmap.width * scale));
      const height = Math.max(1, Math.round(bitmap.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const painter = canvas.getContext("2d");
      if (painter === null) return void 0;
      painter.fillStyle = "#ffffff";
      painter.fillRect(0, 0, width, height);
      painter.drawImage(bitmap, 0, 0, width, height);
      const blob = await new Promise((resolve) => {
        try {
          canvas.toBlob(resolve, "image/jpeg", quality);
        } catch {
          resolve(null);
        }
      });
      if (blob === null) return void 0;
      return await fileToDataUrl(new File([blob], "thumb.jpg", { type: "image/jpeg" }));
    } finally {
      safe(() => bitmap.close?.());
    }
  }
  function fileToDataUrl(file) {
    return new Promise((resolve) => {
      try {
        const reader = new FileReader();
        reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : void 0);
        reader.onerror = () => resolve(void 0);
        reader.readAsDataURL(file);
      } catch {
        resolve(void 0);
      }
    });
  }
  function dataUrlToFile(image) {
    if (typeof image?.dataUrl !== "string" || image.dataUrl === "") return void 0;
    return safe(() => {
      const comma = image.dataUrl.indexOf(",");
      if (comma < 0) return void 0;
      const header = image.dataUrl.slice(0, comma);
      const match = header.match(/^data:([^;]+)/);
      const mime = match?.[1] ?? "image/jpeg";
      const binary = atob(image.dataUrl.slice(comma + 1));
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
      const name = typeof image.name === "string" && image.name !== "" ? image.name : "image.jpg";
      return new File([bytes], name, { type: mime });
    });
  }

  // src/plugin.js
  function createPlugin(React) {
    const h = React.createElement;
    return {
      name: "@u2a5f/dsh-selection-annotations",
      inject: ["slots", "sessions", "conversation", "remote", "remote.workspaceFiles", "locale"],
      apply(ctx) {
        let activeLocale = "zh";
        function formatMessage(template, params) {
          if (typeof template !== "string") return "";
          if (params === void 0 || params === null) return template;
          return template.replace(/\{(\w+)\}/g, (match, name) => name in params ? String(params[name]) : match);
        }
        let t = (key, params) => formatMessage(MESSAGES.zh[key] ?? key, params);
        function defaultInstruction() {
          return activeLocale.toLowerCase().startsWith("en") ? DEFAULT_INSTRUCTION_EN : DEFAULT_INSTRUCTION;
        }
        function isDefaultInstruction(text) {
          return text === DEFAULT_INSTRUCTION || text === DEFAULT_INSTRUCTION_EN;
        }
        let annotations = [];
        let draftIds = [];
        let syncing = false;
        let syncTimer = null;
        let repaintTimer = null;
        let settleTimer = null;
        let avoidTimer = 0;
        let pendingSelection = null;
        let latestInputActions = void 0;
        let latestSessionId = void 0;
        let annotationsSession = void 0;
        const DRAFT_STORAGE_PREFIX = "dsh-selection-annotations:draft:";
        const DRAFT_MAX_SESSIONS = 24;
        const DRAFT_MAX_ITEMS = 200;
        const draftSessions = /* @__PURE__ */ new Map();
        const SENT_STORAGE_PREFIX = "dsh-selection-annotations:sent:";
        const SENT_MAX_ENTRIES = 120;
        const SENT_MAX_BYTES = 2 * 1024 * 1024;
        const REPLY_POLL_MS = 6e3;
        const sentBySession = /* @__PURE__ */ new Map();
        let pendingSent = [];
        let attachedSessionId = void 0;
        let lastAnnotatedKeys = /* @__PURE__ */ new Set();
        let imageSettings;
        let instructionSettings;
        let draftSeen = false;
        let maintaining = false;
        let watchUnsub = void 0;
        let watchTimer = null;
        let consumeTimer = null;
        let pendingRefine = void 0;
        let orphanTimer = null;
        const strayIds = /* @__PURE__ */ new Map();
        const listeners = /* @__PURE__ */ new Set();
        const subscribe = (fn) => {
          listeners.add(fn);
          return () => {
            listeners.delete(fn);
          };
        };
        const snapshot = () => annotations;
        function emit() {
          for (const fn of [...listeners]) {
            try {
              fn();
            } catch (err) {
              warn("[selection-annotations] 订阅回调失败：", err);
            }
          }
        }
        function elementOf(node) {
          if (node === null || node === void 0) return null;
          if (node.nodeType === 1) return node;
          return node.parentElement ?? null;
        }
        const localeService = ctx.locale;
        if (localeService !== void 0 && localeService !== null && typeof localeService.register === "function" && typeof localeService.bind === "function") {
          activeLocale = safe(() => localeService.getSnapshot?.().active) ?? "zh";
          ctx.effect(() => localeService.register(LOCALE_NS, MESSAGES), "selection-annotations: dictionaries");
          t = localeService.bind(LOCALE_NS);
        }
        function currentSessionId() {
          if (typeof latestSessionId === "string" && latestSessionId !== "") return latestSessionId;
          const fromUi = safe(() => {
            const binding = ctx.get("uiSession")?.adapter?.current?.getSnapshot?.();
            return typeof binding?.key === "string" && binding.key !== "" ? binding.key : void 0;
          });
          if (fromUi !== void 0) return fromUi;
          return safe(() => {
            const snap = ctx.sessions?.list?.getSnapshot?.();
            if (snap === void 0 || snap === null) return void 0;
            if (typeof snap.current === "string" && snap.current !== "") return snap.current;
            const ids = Array.isArray(snap.ids) ? snap.ids : Object.keys(snap.byId ?? {});
            for (const id of ids) {
              const retained = snap.byId?.[id]?.retainedBy;
              if (retained !== null && typeof retained === "object" && retained.mainView > 0) return id;
            }
            return void 0;
          });
        }
        function inputShell() {
          const sessionId = currentSessionId();
          if (sessionId === void 0) return void 0;
          return safe(() => {
            const scoped = ctx.sessions.scope(sessionId);
            if (scoped === void 0 || scoped === null) return void 0;
            return ctx.conversation.input.for(scoped);
          });
        }
        function liveAttachmentIds(shell) {
          if (Array.isArray(shell?.attachmentIds)) return shell.attachmentIds;
          const snapshot2 = safe(() => shell?.state?.getSnapshot());
          return Array.isArray(snapshot2?.attachmentIds) ? snapshot2.attachmentIds : void 0;
        }
        function sweepOrphans(shell) {
          if (maintaining || syncing) return;
          const ids = liveAttachmentIds(shell);
          if (ids === void 0 || ids.length === 0) return;
          const foreign = ids.filter((id) => !draftIds.includes(id));
          if (foreign.length === 0) return;
          const resolved = safe(() => ctx.conversation?.resolveDraftAttachments?.(foreign));
          if (!Array.isArray(resolved)) return;
          for (const attachment of resolved) {
            if (attachment?.file?.name !== ANNOTATION_FILE) continue;
            releaseDrafts([attachment.id], shell);
            log(`[selection-annotations] 摘掉一个上一轮遗留的孤儿批注附件（${attachment.id}）`);
          }
        }
        function sweepStrays(shell) {
          if (strayIds.size === 0 || shell === void 0) return;
          const now = Date.now();
          const ids = liveAttachmentIds(shell);
          if (ids === void 0) return;
          for (const [id, until] of [...strayIds]) {
            if (until <= now) {
              strayIds.delete(id);
              continue;
            }
            if (!ids.includes(id)) continue;
            strayIds.delete(id);
            releaseDrafts([id], shell);
            log(`[selection-annotations] 摘掉一个被恢复回来的孤儿批注附件（${id}）`);
          }
        }
        function markConsumed(reason) {
          if (draftIds.length === 0) return;
          const ids = draftIds;
          draftIds = [];
          draftSeen = false;
          const until = Date.now() + STRAY_GUARD_MS;
          for (const id of ids) strayIds.set(id, until);
          if (annotations.length === 0) return;
          const payload = safe(() => JSON.parse(buildPayload(annotations)));
          if (payload !== null && typeof payload === "object" && Array.isArray(payload.annotations)) {
            const items = payload.annotations.map((annotation, index) => {
              const source = annotations[index];
              const images = Array.isArray(source?.images) ? source.images : [];
              const thumbs = [];
              for (const image of images) {
                if (typeof image?.thumb !== "string" || image.thumb === "") continue;
                thumbs.push({ name: typeof image.name === "string" ? image.name : t("image.alt"), dataUrl: image.thumb });
              }
              return thumbs.length > 0 ? { ...annotation, thumbs } : annotation;
            });
            pendingSent.push({
              items,
              known: lastAnnotatedKeys,
              at: Date.now(),
              // 发送这一刻的会话就是消息真正去的那一个：记账沿用它，
              // 避免稍后重算时切到别的会话，把记录写进别人的台账。
              sessionId: attachedSessionId ?? currentSessionId()
            });
            lastAnnotatedKeys = /* @__PURE__ */ new Set();
          }
          annotations = [];
          emit();
          scheduleRepaint();
          saveDraft(annotationsSession);
          log(`[selection-annotations] 批注已随消息发出（${reason}）`);
        }
        function scheduleConsumeCheck() {
          if (consumeTimer !== null) return;
          consumeTimer = window.setTimeout(() => {
            consumeTimer = null;
            if (maintaining || draftIds.length === 0) return;
            const shell = inputShell();
            if (shell === void 0) return;
            const ids = liveAttachmentIds(shell);
            if (ids === void 0) return;
            if (draftIds.some((id) => ids.includes(id))) return;
            markConsumed("输入态已不再持有附件");
          }, CONSUME_CONFIRM_MS);
        }
        function watchDraft() {
          const shell = inputShell();
          const state = shell?.state;
          if (watchUnsub === void 0 && state !== void 0 && typeof state.subscribe === "function" && typeof state.getSnapshot === "function") {
            watchUnsub = state.subscribe(() => {
              const current = inputShell();
              if (current !== void 0) sweepStrays(current);
              if (maintaining || draftIds.length === 0) return;
              const snapshot2 = safe(() => state.getSnapshot());
              if (snapshot2 === void 0 || snapshot2 === null) return;
              const ids = Array.isArray(snapshot2.attachmentIds) ? snapshot2.attachmentIds : [];
              if (draftIds.some((id) => ids.includes(id))) {
                draftSeen = true;
                return;
              }
              if (!draftSeen) return;
              scheduleConsumeCheck();
            });
          }
          if (watchTimer === null) {
            watchTimer = window.setInterval(() => {
              const current = inputShell();
              if (current === void 0) return;
              sweepStrays(current);
              sweepOrphans(current);
              if (maintaining || draftIds.length === 0) return;
              const ids = liveAttachmentIds(current);
              if (ids === void 0) return;
              if (draftIds.some((id) => ids.includes(id))) return;
              scheduleConsumeCheck();
            }, CONSUME_POLL_MS);
          }
        }
        function loadImageSettings() {
          const settings = { ...DEFAULT_IMAGE_SETTINGS };
          const storage = draftStorage();
          if (storage === void 0) return settings;
          const parsed = safe(() => JSON.parse(storage.getItem(IMAGE_SETTINGS_KEY) ?? "null"));
          if (parsed === null || typeof parsed !== "object") return settings;
          settings.compress = parsed.compress !== false;
          const quality = Number(parsed.quality);
          if (Number.isFinite(quality)) settings.quality = Math.min(1, Math.max(0.1, quality));
          const minSize = Number(parsed.minSize);
          if (Number.isFinite(minSize)) settings.minSize = Math.min(4096, Math.max(0, Math.round(minSize)));
          return settings;
        }
        function imageSettingsOf() {
          if (imageSettings === void 0) imageSettings = loadImageSettings();
          return imageSettings;
        }
        function persistImageSettings() {
          const storage = draftStorage();
          if (storage === void 0) return;
          safe(() => storage.setItem(IMAGE_SETTINGS_KEY, JSON.stringify(imageSettingsOf())));
        }
        function loadInstructionSettings() {
          const storage = draftStorage();
          if (storage === void 0) return DEFAULT_INSTRUCTION;
          const parsed = safe(() => JSON.parse(storage.getItem(INSTRUCTION_SETTINGS_KEY) ?? "null"));
          if (parsed === null || typeof parsed !== "object") return DEFAULT_INSTRUCTION;
          const text = typeof parsed.text === "string" ? parsed.text : "";
          return text.trim() === "" ? DEFAULT_INSTRUCTION : text;
        }
        function instructionOf() {
          if (instructionSettings === void 0) instructionSettings = loadInstructionSettings();
          return isDefaultInstruction(instructionSettings) ? defaultInstruction() : instructionSettings;
        }
        function persistInstructionSettings(text) {
          instructionSettings = text;
          const storage = draftStorage();
          if (storage === void 0) return;
          safe(() => storage.setItem(INSTRUCTION_SETTINGS_KEY, JSON.stringify({ text })));
        }
        let remoteStoreState;
        const remoteReplyCache = /* @__PURE__ */ new Map();
        function absorbRemoteReplies(sessionId, remote) {
          if (!Array.isArray(remote?.replies)) return false;
          const batches = remote.replies.filter(
            (batch) => batch !== null && typeof batch === "object" && Array.isArray(batch.replies)
          );
          if (batches.length === 0) return false;
          const previous = remoteReplyCache.get(sessionId) ?? [];
          const signature = (list) => list.map((batch) => `${batch.at}:${batch.replies.length}`).join("|");
          if (signature(previous) === signature(batches)) return false;
          remoteReplyCache.set(sessionId, batches);
          return true;
        }
        function storeUrl(sessionId) {
          return `/selection-annotations/session/${encodeURIComponent(sessionId)}`;
        }
        async function pullRemoteSession(sessionId) {
          if (typeof fetch !== "function") {
            remoteStoreState = false;
            return void 0;
          }
          try {
            const response = await fetch(storeUrl(sessionId), { method: "GET", headers: { accept: "application/json" } });
            if (response.status === 204) {
              remoteStoreState = true;
              return null;
            }
            if (!response.ok) {
              remoteStoreState = false;
              return void 0;
            }
            const data = await response.json();
            remoteStoreState = true;
            return data !== null && typeof data === "object" && !Array.isArray(data) ? data : null;
          } catch {
            remoteStoreState = false;
            return void 0;
          }
        }
        function sessionSnapshot(sessionId) {
          const drafts = annotationsSession === sessionId ? draftItems(annotations) : draftSessions.get(sessionId) ?? [];
          const sent = {};
          for (const [key, value] of sentBySession.get(sessionId) ?? []) sent[key] = value;
          return { schemaVersion: 1, sessionId, updatedAt: (/* @__PURE__ */ new Date()).toISOString(), drafts, sent };
        }
        async function pushRemoteSession(sessionId) {
          if (typeof fetch !== "function") return;
          try {
            const response = await fetch(storeUrl(sessionId), {
              method: "PUT",
              headers: { "content-type": "application/json" },
              body: JSON.stringify(sessionSnapshot(sessionId))
            });
            remoteStoreState = response.ok;
          } catch {
            remoteStoreState = false;
          }
        }
        let remotePushTimer = null;
        const remotePushQueue = /* @__PURE__ */ new Set();
        function scheduleRemotePush(sessionId) {
          if (typeof sessionId !== "string" || sessionId === "") return;
          remotePushQueue.add(sessionId);
          if (remotePushTimer !== null) return;
          remotePushTimer = window.setTimeout(() => {
            remotePushTimer = null;
            const ids = [...remotePushQueue];
            remotePushQueue.clear();
            for (const id of ids) void pushRemoteSession(id);
          }, 600);
        }
        async function hydrateRemoteSession(sessionId) {
          const remote = await pullRemoteSession(sessionId);
          if (remote === null || remote === void 0) return;
          let touched = absorbRemoteReplies(sessionId, remote);
          if (Array.isArray(remote.drafts) && remote.drafts.length > 0) {
            const items = remote.drafts.filter(isDraftItem).slice(0, DRAFT_MAX_ITEMS).map(restoreDraftItem);
            if (annotationsSession === sessionId && annotations.length === 0 && items.length > 0) {
              annotations = items;
              emit();
              scheduleRepaint();
              scheduleSync();
            }
            if ((draftSessions.get(sessionId) ?? []).length === 0) draftSessions.set(sessionId, remote.drafts);
            touched = true;
          }
          if (remote.sent !== null && typeof remote.sent === "object") {
            const table = /* @__PURE__ */ new Map();
            for (const [key, value] of Object.entries(remote.sent)) {
              if (typeof key !== "string" || key === "") continue;
              if (value === null || typeof value !== "object" || !Array.isArray(value.items)) continue;
              const items = value.items.filter(isSentItem).slice(0, DRAFT_MAX_ITEMS);
              if (items.length === 0) continue;
              const turn = Number.isFinite(value.turn) ? Number(value.turn) : void 0;
              table.set(key, { savedAt: Number(value.savedAt) || 0, items, ...turn !== void 0 ? { turn } : {} });
            }
            if (table.size > 0) {
              const localTable = sentBySession.get(sessionId) ?? /* @__PURE__ */ new Map();
              let merged = false;
              for (const [key, value] of table) {
                const current = localTable.get(key);
                if (current === void 0 || value.savedAt > current.savedAt) {
                  localTable.set(key, value);
                  merged = true;
                }
              }
              if (merged) {
                sentBySession.set(sessionId, localTable);
                saveSent(sessionId, localTable);
                touched = true;
              }
            }
          }
          if (touched) scheduleRepaint();
        }
        function draftStorage() {
          return safe(() => {
            const storage = window.localStorage;
            return storage !== null && storage !== void 0 && typeof storage.getItem === "function" ? storage : void 0;
          });
        }
        function draftKey(sessionId) {
          return `${DRAFT_STORAGE_PREFIX}${sessionId}`;
        }
        function draftItems(items) {
          return items.map((item) => ({
            id: item.id,
            number: item.number,
            quote: item.quote,
            note: item.note,
            source: item.source,
            createdAt: item.createdAt,
            // 图片只存压缩后的 data URL：File 与对象 URL 都带不过本地存储。
            images: (Array.isArray(item.images) ? item.images : []).filter((image) => typeof image?.dataUrl === "string" && image.dataUrl !== "").map((image) => ({ id: image.id, name: image.name, dataUrl: image.dataUrl, bytes: image.bytes }))
          }));
        }
        function isDraftItem(value) {
          if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
          return typeof value.quote === "string" || typeof value.note === "string";
        }
        function restoreDraftItem(item) {
          const images = (Array.isArray(item.images) ? item.images : []).filter((image) => typeof image?.dataUrl === "string" && image.dataUrl !== "").map((image) => {
            const file = dataUrlToFile(image);
            return {
              id: typeof image.id === "string" ? image.id : `img-${Math.random().toString(36).slice(2, 8)}`,
              name: typeof image.name === "string" ? image.name : t("image.alt"),
              dataUrl: image.dataUrl,
              bytes: Number(image.bytes) || 0,
              file,
              // 恢复后没有对象 URL：直接用 data URL 当缩略图来源。
              url: image.dataUrl
            };
          });
          return {
            id: typeof item.id === "string" && item.id !== "" ? item.id : `sa-restored-${Math.random().toString(36).slice(2, 10)}`,
            number: Number.isFinite(item.number) ? item.number : 0,
            quote: typeof item.quote === "string" ? item.quote : "",
            note: typeof item.note === "string" ? item.note : "",
            source: item.source ?? { kind: "dom" },
            createdAt: Number.isFinite(item.createdAt) ? item.createdAt : Date.now(),
            images
          };
        }
        function fitDraftSize(items) {
          let text = JSON.stringify({ version: 1, items });
          if (text.length <= DRAFT_MAX_BYTES) return items;
          const next = items.map((item) => ({ ...item, images: Array.isArray(item.images) ? item.images.slice() : [] }));
          for (let i = 0; i < next.length && text.length > DRAFT_MAX_BYTES; i += 1) {
            if (next[i].images.length === 0) continue;
            next[i] = { ...next[i], images: [] };
            text = JSON.stringify({ version: 1, items: next });
          }
          if (text.length > DRAFT_MAX_BYTES) log("[selection-annotations] 草稿超出本地存储预算，图片已丢弃、文字保留");
          return next;
        }
        function saveDraft(sessionId) {
          if (typeof sessionId !== "string" || sessionId === "") return;
          const full = draftItems(annotations);
          const items = fitDraftSize(full);
          if (full.length === 0) draftSessions.delete(sessionId);
          else draftSessions.set(sessionId, full);
          scheduleRemotePush(sessionId);
          const storage = draftStorage();
          if (storage === void 0) return;
          try {
            if (items.length === 0) {
              storage.removeItem(draftKey(sessionId));
              return;
            }
            storage.setItem(draftKey(sessionId), JSON.stringify({ version: 1, savedAt: Date.now(), items }));
            pruneDrafts(storage);
          } catch {
          }
        }
        function pruneDrafts(storage) {
          const keys = [];
          for (let i = 0; i < storage.length; i += 1) {
            const key = safe(() => storage.key(i));
            if (typeof key === "string" && key.startsWith(DRAFT_STORAGE_PREFIX)) keys.push(key);
          }
          if (keys.length <= DRAFT_MAX_SESSIONS) return;
          const dated = keys.map((key) => {
            const savedAt = safe(() => Number(JSON.parse(storage.getItem(key) ?? "{}")?.savedAt) || 0);
            return { key, savedAt: savedAt ?? 0 };
          });
          dated.sort((a, b) => a.savedAt - b.savedAt);
          for (const entry of dated.slice(0, dated.length - DRAFT_MAX_SESSIONS)) {
            safe(() => storage.removeItem(entry.key));
          }
        }
        function loadDraft(sessionId) {
          const memory = draftSessions.get(sessionId);
          if (memory !== void 0) return memory.map(restoreDraftItem);
          const storage = draftStorage();
          if (storage === void 0) return [];
          const items = safe(() => {
            const raw = storage.getItem(draftKey(sessionId));
            if (raw === null) return [];
            const parsed = JSON.parse(raw);
            if (parsed === null || typeof parsed !== "object" || !Array.isArray(parsed.items)) return [];
            return parsed.items.filter(isDraftItem).slice(0, DRAFT_MAX_ITEMS).map(restoreDraftItem);
          });
          if (items === void 0 || items.length === 0) return [];
          draftSessions.set(sessionId, draftItems(items));
          return items;
        }
        function adoptSession(sessionId) {
          if (typeof sessionId !== "string" || sessionId === "") return;
          const first = annotationsSession === void 0;
          if (!first && annotationsSession === sessionId) return;
          if (!first) saveDraft(annotationsSession);
          annotationsSession = sessionId;
          if (first && annotations.length > 0) {
            saveDraft(sessionId);
            return;
          }
          annotations = loadDraft(sessionId);
          draftIds = [];
          draftSeen = false;
          for (const stale of document.querySelectorAll('[data-sa-ui="replies"]')) stale.remove();
          emit();
          scheduleRepaint();
          if (annotations.length > 0) scheduleSync();
          void hydrateRemoteSession(sessionId);
        }
        function offsetRange(root, range) {
          const measure = (node, offset) => safe(() => {
            const probe = range.cloneRange();
            probe.setStart(root, 0);
            probe.setEnd(node, offset);
            return probe.toString().length;
          });
          const start = measure(range.startContainer, range.startOffset);
          const end = measure(range.endContainer, range.endOffset);
          if (start === void 0) return { start: void 0, end: void 0 };
          return { start, end: end === void 0 || end < start ? start : end };
        }
        function pathFromPreviewUrl(url) {
          const marker = "/session/";
          const at = url.indexOf(marker);
          if (at === -1) return void 0;
          const rest = url.slice(at + marker.length);
          const slash = rest.indexOf("/");
          if (slash === -1) return void 0;
          const raw = rest.slice(slash + 1);
          return safe(() => decodeURIComponent(raw)) ?? raw;
        }
        function lineNumberOf(element) {
          if (element === null) return void 0;
          const holder = element.closest("[data-textpreview-line]");
          if (holder === null) return void 0;
          const value = Number(holder.getAttribute("data-textpreview-line"));
          return Number.isFinite(value) ? value : void 0;
        }
        function codeLineNumberOf(scope, element) {
          if (element === null || scope === null || scope === void 0) return void 0;
          const lines = [...scope.querySelectorAll(".line")];
          const own = typeof element.closest === "function" ? element.closest(".line") : null;
          const target = own !== null ? own : lines.find((line) => line.contains(element));
          if (target === null || target === void 0) return void 0;
          const index = lines.indexOf(target);
          return index === -1 ? void 0 : index + 1;
        }
        function normalizeWithMap(value) {
          const chars = [];
          const map = [];
          let spaceAt = -1;
          for (let i = 0; i < value.length; i += 1) {
            const ch = value[i];
            if (ch === " " || ch === "	" || ch === "\n" || ch === "\r") {
              if (spaceAt === -1) spaceAt = i;
              continue;
            }
            if (spaceAt !== -1) {
              if (chars.length > 0) {
                chars.push(" ");
                map.push(spaceAt);
              }
              spaceAt = -1;
            }
            chars.push(ch);
            map.push(i);
          }
          return { text: chars.join(""), map };
        }
        function locateInSource(source, quote) {
          const needle = quote.replace(/\s+/g, " ").trim();
          if (needle === "") return void 0;
          const hay = normalizeWithMap(source);
          const at = hay.text.indexOf(needle);
          if (at === -1) return void 0;
          const start = hay.map[at];
          const end = hay.map[at + needle.length - 1];
          if (start === void 0 || end === void 0) return void 0;
          return { start, end: end + 1 };
        }
        function lineOfOffset(text, offset) {
          let line = 1;
          const limit = Math.max(0, Math.min(offset, text.length));
          for (let i = 0; i < limit; i += 1) if (text.charCodeAt(i) === 10) line += 1;
          return line;
        }
        function withTimeout(promise, ms) {
          return new Promise((resolve) => {
            let settled = false;
            const settle = (outcome) => {
              if (settled) return;
              settled = true;
              window.clearTimeout(timer);
              resolve(outcome);
            };
            const timer = window.setTimeout(() => settle({ ok: false, reason: `${ms}ms 内没有返回` }), ms);
            Promise.resolve(promise).then(
              (value) => settle({ ok: true, value }),
              (error) => settle({ ok: false, reason: error instanceof Error ? error.message : String(error) })
            );
          });
        }
        function unwrapRemote(value) {
          if (value !== null && typeof value === "object" && "ok" in value && "value" in value) {
            return value.ok === true ? value.value : void 0;
          }
          return value;
        }
        async function resolveSourcePosition(source, quote, onSkip) {
          try {
            return await resolveSourcePositionInner(source, quote, onSkip);
          } catch (error) {
            log(`[selection-annotations] 位置精修抛错：${error instanceof Error ? error.message : String(error)}`);
            return void 0;
          }
        }
        async function resolveSourcePositionInner(source, quote, onSkip) {
          const skip = (reason) => {
            log(`[selection-annotations] 位置精修跳过（${String(source?.path)}）：${reason}`);
            if (typeof onSkip === "function") onSkip(reason);
            return void 0;
          };
          if (source?.kind !== "file") return void 0;
          if (typeof source.path !== "string" || source.path === "") return void 0;
          const sessionId = currentSessionId();
          if (sessionId === void 0) return skip("拿不到当前会话 id");
          const candidates = [];
          const agent = safe(() => ctx.sessions?.scope?.(sessionId));
          if (agent?.remote !== void 0) candidates.push({ label: "sessions.scope().remote", remote: agent.remote });
          const direct = safe(() => ctx.remote) ?? safe(() => ctx.get("remote"));
          if (direct !== void 0) candidates.push({ label: "ctx.remote", remote: direct });
          let usable;
          for (const entry of candidates) {
            const probe = safe(() => typeof entry.remote?.workspaceFiles?.read === "function");
            if (probe === void 0) {
              continue;
            }
            if (probe === true) {
              usable = entry;
              break;
            }
          }
          if (usable === void 0) {
            return skip(`拿不到 remote.workspaceFiles.read（试过 ${candidates.map((e) => e.label).join(" / ") || "无任何 remote"}）`);
          }
          log(`[selection-annotations] 位置精修：经 ${usable.label} 读 ${source.path}`);
          const outcome = await withTimeout(
            safe(() => usable.remote.workspaceFiles.read(sessionId, source.path, {})),
            SOURCE_LOOKUP_TIMEOUT_MS
          );
          if (outcome.ok === false) return skip(`读取失败：${outcome.reason}`);
          const file = unwrapRemote(outcome.value);
          const text = typeof file?.text === "string" ? file.text : void 0;
          if (text === void 0) return skip("返回里没有 text（path 可能不被接受）");
          const hit = locateInSource(text, quote);
          if (hit === void 0) {
            return skip(
              file?.eof === false ? `引文不在读取窗口内（只拿到 ${text.length} 字符，eof=false）` : "引文不在原文里（多半是跨了行内 Markdown 标记）"
            );
          }
          return {
            charStart: hit.start,
            charEnd: hit.end,
            lineStart: lineOfOffset(text, hit.start),
            lineEnd: lineOfOffset(text, Math.max(hit.start, hit.end - 1)),
            textOrigin: "source"
          };
        }
        function lineRangeWithin(root, startEl, endEl) {
          const marked = lineNumberOf(startEl) ?? lineNumberOf(endEl);
          if (marked !== void 0) return { start: marked, end: lineNumberOf(endEl) ?? marked };
          const start = codeLineNumberOf(root, startEl);
          if (start === void 0) return { start: void 0, end: void 0 };
          return { start, end: codeLineNumberOf(root, endEl) ?? start };
        }
        function captureSource(range) {
          const startEl = elementOf(range.startContainer);
          const endEl = elementOf(range.endContainer);
          if (startEl === null) return { kind: "dom" };
          const replyItem = startEl.closest(".sa-reply-item");
          if (replyItem !== null && replyItem.closest('[data-sa-ui="replies"]') !== null) {
            const fieldOf = (element) => {
              if (element === null) return null;
              const marked = element.closest("[data-sa-field]");
              if (marked !== null) return marked.getAttribute("data-sa-field") ?? "item";
              for (const name of ["sa-q-quote", "sa-q-note", "sa-a-reason", "sa-a-next"]) {
                if (element.closest(`.${name}`) !== null) {
                  return { "sa-q-quote": "quote", "sa-q-note": "note", "sa-a-reason": "reason", "sa-a-next": "next" }[name];
                }
              }
              return null;
            };
            const startField = fieldOf(startEl);
            const endField = fieldOf(endEl);
            const field = startField !== null && (endField === null || startField === endField) ? startField : "item";
            const classMap = { quote: "sa-q-quote", note: "sa-q-note", reason: "sa-a-reason", next: "sa-a-next" };
            let fieldElement = replyItem;
            if (field !== "item") {
              fieldElement = startEl.closest(`[data-sa-field="${cssEscape(field)}"]`) ?? startEl.closest(`.${classMap[field]}`) ?? replyItem;
            }
            const chars = offsetRange(fieldElement, range);
            let index = Number(replyItem.getAttribute("data-sa-reply-index"));
            if (!Number.isFinite(index) || index === 0) {
              const digits = (replyItem.querySelector(".sa-reply-index")?.textContent ?? "").match(/(\d+)/);
              index = digits === null ? 0 : Number(digits[1]);
            }
            return {
              kind: "reply",
              batchAt: Number(replyItem.getAttribute("data-sa-batch-at")) || 0,
              index,
              field,
              charStart: chars.start,
              charEnd: chars.end,
              textOrigin: "rendered"
            };
          }
          const sentItem = startEl.closest(".sa-sent-item");
          if (sentItem !== null) {
            const sentCard = sentItem.closest('[data-sa-ui="sent"]');
            if (sentCard !== null) {
              const fieldOf = (element) => {
                if (element === null) return null;
                const note = element.closest(".sa-sent-note");
                if (note !== null) return { key: "note", el: note };
                const quote = element.closest(".sa-sent-quote");
                if (quote !== null) return { key: "quote", el: quote };
                return null;
              };
              const startField = fieldOf(startEl);
              const endField = fieldOf(endEl);
              const field = startField !== null && (endField === null || endField.key === startField.key) ? startField.key : "item";
              const fieldEl = field === "item" ? sentItem : startField.el;
              const chars = offsetRange(fieldEl, range);
              let index = Number(sentItem.getAttribute("data-sa-sent-index"));
              if (!Number.isFinite(index) || index === 0) {
                const digits = (sentItem.querySelector(".sa-sent-num")?.textContent ?? "").match(/(\d+)/);
                index = digits === null ? 0 : Number(digits[1]);
              }
              return {
                kind: "sent",
                anchorKey: sentCard.getAttribute("data-anchor") ?? "",
                index,
                field,
                charStart: chars.start,
                charEnd: chars.end,
                textOrigin: "rendered"
              };
            }
          }
          const row = startEl.closest("[data-chat-anchor-key]");
          if (row !== null) {
            const chars = offsetRange(row, range);
            return {
              kind: "message",
              role: (row.getAttribute("data-chat-flow-kind") ?? "") === "user" ? "user" : "assistant",
              anchorKey: row.getAttribute("data-chat-anchor-key") ?? "",
              flowKind: row.getAttribute("data-chat-flow-kind") ?? "",
              charStart: chars.start,
              charEnd: chars.end
            };
          }
          const doc = startEl.closest("[data-textpreview-url]");
          if (doc !== null) {
            const url = doc.getAttribute("data-textpreview-url") ?? "";
            const lines = lineRangeWithin(doc, startEl, endEl);
            const chars = offsetRange(doc, range);
            return {
              kind: "file",
              path: pathFromPreviewUrl(url),
              sourceUrl: url,
              lineStart: lines.start,
              lineEnd: lines.end,
              charStart: chars.start,
              charEnd: chars.end,
              // 默认口径是渲染后的正文；保存时会再试着读源文件改成 source。
              textOrigin: "rendered"
            };
          }
          const code = startEl.closest("[data-code-preview]");
          if (code !== null) {
            const lines = lineRangeWithin(code, startEl, endEl);
            const chars = offsetRange(code, range);
            return { kind: "file", lineStart: lines.start, lineEnd: lines.end, charStart: chars.start, charEnd: chars.end, textOrigin: "rendered" };
          }
          return { kind: "dom" };
        }
        function anchorRoot(source) {
          if (source === null || source === void 0) return null;
          if (source.kind === "message" && source.anchorKey) {
            return document.querySelector(`[data-chat-anchor-key="${cssEscape(source.anchorKey)}"]`) ?? document.querySelector(`[data-chat-flow-key="${cssEscape(source.anchorKey)}"]`);
          }
          if (source.kind === "file" && source.sourceUrl) {
            return document.querySelector(`[data-textpreview-url="${cssEscape(source.sourceUrl)}"]`);
          }
          if (source.kind === "file") return document.querySelector("[data-code-preview]");
          if (source.kind === "sent" && source.anchorKey) {
            const card = document.querySelector(`[data-sa-ui="sent"][data-anchor="${cssEscape(source.anchorKey)}"]`);
            if (card !== null) {
              const wanted = Number(source.index);
              for (const item of card.querySelectorAll(".sa-sent-item")) {
                const digits = (item.querySelector(".sa-sent-num")?.textContent ?? "").match(/(\d+)/);
                const index = Number(item.getAttribute("data-sa-sent-index")) || (digits === null ? 0 : Number(digits[1]));
                if (index !== wanted) continue;
                if (typeof source.field === "string" && source.field !== "" && source.field !== "item") {
                  const field = item.querySelector(`[data-sa-field="${cssEscape(source.field)}"]`);
                  return field ?? item;
                }
                return item;
              }
            }
          }
          if (source.kind === "reply") {
            const batchAt = Number(source.batchAt);
            const replyIndex = Number(source.index);
            for (const item of document.querySelectorAll(".sa-reply-item")) {
              if (item.closest('[data-sa-ui="replies"]') === null) continue;
              if (Number(item.getAttribute("data-sa-batch-at")) !== batchAt) continue;
              if (Number(item.getAttribute("data-sa-reply-index")) !== replyIndex) continue;
              if (typeof source.field === "string" && source.field !== "" && source.field !== "item") {
                const field = item.querySelector(`[data-sa-field="${cssEscape(source.field)}"]`);
                return field ?? item;
              }
              return item;
            }
          }
          return null;
        }
        function rangeFromOffsets(root, start, length) {
          const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
          let offset = 0;
          let startNode;
          let startOffset = 0;
          let endNode;
          let endOffset = 0;
          let node = walker.nextNode();
          while (node !== null) {
            const size = node.nodeValue === null ? 0 : node.nodeValue.length;
            if (startNode === void 0 && offset + size >= start) {
              startNode = node;
              startOffset = start - offset;
            }
            if (startNode !== void 0 && offset + size >= start + length) {
              endNode = node;
              endOffset = start + length - offset;
              break;
            }
            offset += size;
            node = walker.nextNode();
          }
          if (startNode === void 0 || endNode === void 0) return void 0;
          return safe(() => {
            const range = document.createRange();
            range.setStart(startNode, Math.max(0, Math.min(startOffset, startNode.nodeValue.length)));
            range.setEnd(endNode, Math.max(0, Math.min(endOffset, endNode.nodeValue.length)));
            return range;
          });
        }
        function matchInRoot(root, quote, savedOffset) {
          if (typeof quote !== "string" || quote === "") return void 0;
          const text = root.textContent ?? "";
          const positions = [];
          let from = 0;
          for (; ; ) {
            const at = text.indexOf(quote, from);
            if (at === -1 || positions.length >= 64) break;
            positions.push(at);
            from = at + 1;
          }
          if (positions.length === 0) return void 0;
          let best = positions[0];
          if (positions.length > 1 && Number.isFinite(savedOffset)) {
            best = positions.reduce((a, b) => Math.abs(b - savedOffset) < Math.abs(a - savedOffset) ? b : a);
          }
          return rangeFromOffsets(root, best, quote.length);
        }
        function rangeMatchesQuote(range, quote) {
          const current = safe(() => range.toString());
          if (typeof current !== "string") return false;
          const normalize = (value) => value.replace(/\s+/g, " ").trim();
          return normalize(current) === normalize(quote);
        }
        function locateRange(item) {
          if (item.liveRange !== void 0) {
            const live = item.liveRange;
            const usable = safe(() => live.startContainer.isConnected === true && live.endContainer.isConnected === true) === true;
            if (usable && rangeMatchesQuote(live, item.quote)) return live;
            item.liveRange = void 0;
          }
          const root = anchorRoot(item.source);
          if (root === null || root === void 0) return void 0;
          const range = matchInRoot(root, item.quote, item.source.charStart);
          if (range !== void 0) item.liveRange = range;
          return range;
        }
        let sequence = 0;
        function renumber() {
          annotations = annotations.map((item, index) => item.number === index + 1 ? item : { ...item, number: index + 1 });
        }
        function addAnnotation(input) {
          const quote = typeof input.quote === "string" ? input.quote.trim().slice(0, MAX_QUOTE) : "";
          const note = typeof input.note === "string" ? input.note.trim().slice(0, MAX_NOTE) : "";
          const source = input.source ?? { kind: "dom" };
          if (quote === "" && note === "") return void 0;
          sequence += 1;
          const item = {
            id: `sa-${Date.now().toString(36)}-${sequence}`,
            number: annotations.length + 1,
            quote,
            note,
            images: Array.isArray(input.images) ? input.images.slice() : [],
            source,
            liveRange: input.liveRange,
            createdAt: Date.now()
          };
          annotations = [...annotations, item];
          emit();
          scheduleSync();
          scheduleRepaint();
          saveDraft(annotationsSession);
          return item;
        }
        function updateAnnotation(id, note, images) {
          const next = typeof note === "string" ? note.trim().slice(0, MAX_NOTE) : "";
          const nextImages = Array.isArray(images) ? images.slice() : void 0;
          let hit = false;
          annotations = annotations.map((item) => {
            if (item.id !== id) return item;
            hit = true;
            return { ...item, note: next, ...nextImages === void 0 ? {} : { images: nextImages } };
          });
          if (!hit) return;
          emit();
          scheduleSync();
          scheduleRepaint();
          saveDraft(annotationsSession);
        }
        function removeAnnotation(id) {
          annotations = annotations.filter((item) => item.id !== id);
          renumber();
          emit();
          scheduleSync();
          scheduleRepaint();
          saveDraft(annotationsSession);
        }
        function moveAnnotation(id, beforeId) {
          if (id === beforeId) return;
          const moving = annotations.find((item) => item.id === id);
          if (moving === void 0) return;
          const rest = annotations.filter((item) => item.id !== id);
          const target = beforeId === null ? rest.length : rest.findIndex((item) => item.id === beforeId);
          rest.splice(target < 0 ? rest.length : target, 0, moving);
          annotations = rest;
          renumber();
          emit();
          scheduleSync();
          scheduleRepaint();
          saveDraft(annotationsSession);
          refreshPanel();
        }
        function clearAnnotations() {
          annotations = [];
          emit();
          scheduleSync();
          scheduleRepaint();
          saveDraft(annotationsSession);
        }
        const SENT_PENDING_TTL_MS = 6e4;
        function isSentItem(value) {
          if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
          return typeof value.quote === "string" || typeof value.note === "string";
        }
        function loadSent(sessionId) {
          const memory = sentBySession.get(sessionId);
          if (memory !== void 0) return memory;
          const table = /* @__PURE__ */ new Map();
          const storage = draftStorage();
          if (storage !== void 0) {
            const parsed = safe(() => JSON.parse(storage.getItem(`${SENT_STORAGE_PREFIX}${sessionId}`) ?? "null"));
            if (parsed !== null && typeof parsed === "object" && parsed.entries !== null && typeof parsed.entries === "object") {
              for (const [key, value] of Object.entries(parsed.entries)) {
                if (typeof key !== "string" || key === "") continue;
                if (value === null || typeof value !== "object" || !Array.isArray(value.items)) continue;
                const items = value.items.filter(isSentItem).slice(0, DRAFT_MAX_ITEMS);
                if (items.length === 0) continue;
                const turn = Number.isFinite(value.turn) ? Number(value.turn) : void 0;
                table.set(key, { savedAt: Number(value.savedAt) || 0, items, ...turn !== void 0 ? { turn } : {} });
              }
            }
          }
          sentBySession.set(sessionId, table);
          return table;
        }
        function saveSent(sessionId, table) {
          const storage = draftStorage();
          const ordered = [...table.entries()].sort((a, b) => a[1].savedAt - b[1].savedAt);
          const kept = ordered.slice(Math.max(0, ordered.length - SENT_MAX_ENTRIES));
          sentBySession.set(sessionId, new Map(kept));
          scheduleRemotePush(sessionId);
          if (storage === void 0) return;
          let stored = kept;
          if (JSON.stringify(Object.fromEntries(kept)).length > SENT_MAX_BYTES) {
            stored = kept.map(([key, value]) => [
              key,
              { ...value, items: value.items.map((item) => ({ ...item, thumbs: [] })) }
            ]);
            if (JSON.stringify(Object.fromEntries(stored)).length > SENT_MAX_BYTES) {
              stored = stored.slice(Math.max(0, stored.length - 40));
            }
          }
          const entries = {};
          for (const [key, value] of stored) entries[key] = value;
          try {
            storage.setItem(`${SENT_STORAGE_PREFIX}${sessionId}`, JSON.stringify({ version: 1, entries }));
          } catch {
          }
        }
        function collectAnchorRows() {
          const rows = [];
          const seen = /* @__PURE__ */ new Set();
          const push = (element, anchorKey) => {
            if (anchorKey === "" || seen.has(anchorKey)) return;
            seen.add(anchorKey);
            rows.push({ row: element, anchorKey });
          };
          for (const attachmentRow of document.querySelectorAll("[data-message-attachments]")) {
            if (!/批注\.json/.test(attachmentRow.textContent ?? "")) continue;
            const row = attachmentRow.closest("[data-chat-anchor-key]");
            if (row === null) continue;
            push(row, row.getAttribute("data-chat-anchor-key") ?? "");
          }
          for (const element of document.querySelectorAll("[data-chat-anchor-key]")) {
            const kind = element.getAttribute("data-chat-flow-kind") ?? "";
            if (kind !== "user" && kind !== "steering") continue;
            push(element, element.getAttribute("data-chat-anchor-key") ?? "");
          }
          for (const element of document.querySelectorAll("[data-chat-anchor-key]")) {
            const kind = element.getAttribute("data-chat-flow-kind") ?? "";
            const anchorKey = element.getAttribute("data-chat-anchor-key") ?? "";
            if (kind === "" || anchorKey.startsWith("group:")) {
              push(element, anchorKey);
            }
          }
          return rows;
        }
        function captureAnchorKeys() {
          return new Set(collectAnchorRows().map((entry) => entry.anchorKey));
        }
        function recordSent(sessionId, anchorKey, items, turn) {
          const table = loadSent(sessionId);
          table.set(anchorKey, {
            savedAt: Date.now(),
            items,
            ...Number.isFinite(turn) ? { turn } : {}
          });
          saveSent(sessionId, table);
        }
        function scanSentMessages() {
          if (pendingSent.length === 0) return;
          const now = Date.now();
          pendingSent = pendingSent.filter((entry) => now - entry.at < SENT_PENDING_TTL_MS);
          if (pendingSent.length === 0) return;
          const rows = collectAnchorRows();
          if (rows.length === 0) return;
          const pending = pendingSent[0];
          const sessionId = typeof pending.sessionId === "string" && pending.sessionId !== "" ? pending.sessionId : currentSessionId();
          if (sessionId === void 0) return;
          const fresh = rows.filter(
            (entry) => !pending.known.has(entry.anchorKey) && !loadSent(sessionId).has(entry.anchorKey) && entry.row.getAttribute("data-chat-flow-kind") !== "turn-process"
          );
          const target = fresh.length > 0 ? fresh[fresh.length - 1] : void 0;
          if (target === void 0) return;
          pendingSent.shift();
          const turn = turnOfRow(target.row);
          recordSent(sessionId, target.anchorKey, pending.items, turn);
          scheduleRepaint();
        }
        function sectionChevron() {
          const ns = "http://www.w3.org/2000/svg";
          const svg = document.createElementNS(ns, "svg");
          svg.setAttribute("class", "sa-section-chevron");
          svg.setAttribute("viewBox", "0 0 16 16");
          svg.setAttribute("aria-hidden", "true");
          const path = document.createElementNS(ns, "path");
          path.setAttribute("d", "M6.2 3.6 10.7 8l-4.5 4.4");
          path.setAttribute("fill", "none");
          path.setAttribute("stroke", "currentColor");
          path.setAttribute("stroke-width", "1.8");
          path.setAttribute("stroke-linecap", "round");
          path.setAttribute("stroke-linejoin", "round");
          svg.appendChild(path);
          return svg;
        }
        function buildSectionHead(label, meta) {
          const head = document.createElement("button");
          head.type = "button";
          head.className = "sa-section-head";
          head.appendChild(sectionChevron());
          const title = document.createElement("span");
          title.className = "sa-section-title";
          title.textContent = label;
          head.appendChild(title);
          if (typeof meta === "string" && meta !== "") {
            const metaEl = document.createElement("span");
            metaEl.className = "sa-section-meta";
            metaEl.textContent = meta;
            head.appendChild(metaEl);
          }
          return head;
        }
        function collapsible(body, open) {
          const wrap = document.createElement("div");
          wrap.className = "sa-collapse";
          wrap.dataset.open = open ? "1" : "0";
          const inner = document.createElement("div");
          inner.className = "sa-collapse-inner";
          inner.appendChild(body);
          wrap.appendChild(inner);
          return wrap;
        }
        function applyCollapsed(head, wrap, open) {
          wrap.dataset.open = open ? "1" : "0";
          head.dataset.open = open ? "1" : "0";
          head.setAttribute("aria-expanded", String(open));
        }
        function buildSentCard(record, anchorKey) {
          const card = document.createElement("div");
          card.className = "sa-sent";
          card.setAttribute("data-sa-ui", "sent");
          if (typeof anchorKey === "string" && anchorKey !== "") card.setAttribute("data-anchor", anchorKey);
          const head = buildSectionHead(t("sent.title", { n: record.items.length }));
          const body = document.createElement("div");
          body.className = "sa-sent-body";
          const wrap = collapsible(body, false);
          applyCollapsed(head, wrap, false);
          for (const item of record.items) {
            const line = document.createElement("div");
            line.className = "sa-sent-item";
            line.setAttribute("data-sa-sent-index", Number.isFinite(item.index) ? String(item.index) : "");
            const num = document.createElement("span");
            num.className = "sa-sent-num";
            num.textContent = Number.isFinite(item.index) ? String(item.index) : "";
            const text = document.createElement("div");
            text.className = "sa-sent-text";
            const quote = document.createElement("div");
            quote.className = "sa-sent-quote";
            quote.setAttribute("data-sa-field", "quote");
            quote.textContent = truncateQuote(item.quote);
            text.appendChild(quote);
            if (typeof item.note === "string" && item.note.trim() !== "") {
              const note = document.createElement("div");
              note.className = "sa-sent-note";
              note.setAttribute("data-sa-field", "note");
              note.textContent = item.note;
              text.appendChild(note);
            }
            const thumbs = Array.isArray(item.thumbs) ? item.thumbs : [];
            if (thumbs.length > 0) {
              const gallery = document.createElement("div");
              gallery.className = "sa-sent-thumbs";
              for (const thumb of thumbs) {
                if (typeof thumb?.dataUrl !== "string" || thumb.dataUrl === "") continue;
                const img = document.createElement("img");
                img.className = "sa-sent-thumb";
                img.src = thumb.dataUrl;
                img.alt = typeof thumb.name === "string" ? thumb.name : t("image.alt");
                img.title = t("image.open");
                img.addEventListener("click", (event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  openImageViewer(thumb.dataUrl, thumb.name);
                });
                gallery.appendChild(img);
              }
              if (gallery.childNodes.length > 0) text.appendChild(gallery);
            }
            line.append(num, text);
            body.appendChild(line);
          }
          head.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            applyCollapsed(head, wrap, wrap.dataset.open !== "1");
          });
          card.append(head, wrap);
          return card;
        }
        function footerAfter(row) {
          for (const button3 of document.querySelectorAll("[data-turn-process]")) {
            if (button3 === row || button3.contains(row)) continue;
            if ((row.compareDocumentPosition(button3) & 4) === 0) continue;
            return button3;
          }
          return null;
        }
        function turnBlockOf(row) {
          const block = typeof row.closest === "function" ? row.closest('[data-chat-flow-kind="turn-process"]') : null;
          if (block !== null && block !== void 0) return block;
          const footer = footerAfter(row);
          if (footer === null) return null;
          return footer.closest('[data-chat-flow-kind="turn-process"]') ?? footer;
        }
        function turnOfRow(row) {
          const holder = typeof row.closest === "function" ? row.closest("[data-chat-turn]") : null;
          if (holder !== null && holder !== void 0) {
            const raw2 = holder.getAttribute("data-chat-turn");
            const turn2 = Number(raw2);
            if (Number.isFinite(turn2) && turn2 > 0) return turn2;
          }
          const block = turnBlockOf(row);
          if (block === null) return void 0;
          const button3 = typeof block.querySelector === "function" ? block.querySelector("[data-turn-process]") : null;
          const raw = button3 === null ? null : button3.getAttribute("data-turn-process");
          const turn = Number(raw);
          return Number.isFinite(turn) && turn > 0 ? turn : void 0;
        }
        function turnContentItem(turn) {
          if (!Number.isFinite(turn)) return null;
          for (const item of document.querySelectorAll(`[data-chat-turn="${turn}"]`)) {
            const kind = item.getAttribute("data-chat-flow-kind") ?? "";
            if (kind === "user" || kind === "steering") continue;
            if (item.parentElement === null) continue;
            return item;
          }
          return null;
        }
        function turnDisclosureItem(turn) {
          if (!Number.isFinite(turn)) return null;
          const button3 = document.querySelector(`[data-turn-process="${turn}"]`);
          if (button3 === null) return null;
          const flow = typeof button3.closest === "function" ? button3.closest("[data-chat-flow-kind]") : null;
          return flow ?? button3;
        }
        function sentCardAnchor(row) {
          const turn = turnOfRow(row);
          const item = turnContentItem(turn) ?? turnDisclosureItem(turn);
          if (item !== null && item.parentElement !== null && item.parentElement !== document.body) {
            return { parent: item.parentElement, before: item };
          }
          const block = turnBlockOf(row);
          if (block !== null) {
            const parent2 = block.parentElement;
            if (parent2 !== null && parent2 !== document.body) return { parent: parent2, before: block };
          }
          const flow = row.getAttribute?.("data-chat-flow-kind") !== null ? row : typeof row.closest === "function" ? row.closest("[data-chat-flow-kind]") ?? row : row;
          const parent = flow.parentElement;
          if (parent === null || parent === document.body) return { parent: row.parentElement, before: row.nextSibling };
          return { parent, before: flow.nextElementSibling };
        }
        function isTurnProcessAnchor(anchorKey) {
          return typeof anchorKey === "string" && /:turn-process\d+$/.test(anchorKey);
        }
        function annotationRowBefore(footerRow) {
          let best = null;
          for (const element of document.querySelectorAll("[data-chat-anchor-key]")) {
            const kind = element.getAttribute("data-chat-flow-kind") ?? "";
            if (kind === "turn-process") continue;
            if ((element.compareDocumentPosition(footerRow) & 4) === 0) continue;
            const selfAttach = element.getAttribute("data-message-attachments");
            const nested = typeof element.querySelector === "function" ? element.querySelector("[data-message-attachments]") : null;
            if (selfAttach === null && nested === null) continue;
            const text = (selfAttach !== null ? element.textContent : nested.textContent) ?? "";
            if (!/批注\.json/.test(text)) continue;
            best = element;
          }
          return best;
        }
        function resolveLegacyAnchor(anchorKey) {
          if (!isTurnProcessAnchor(anchorKey)) return anchorKey;
          const footerRow = document.querySelector(`[data-chat-anchor-key="${cssEscape(anchorKey)}"]`);
          if (footerRow === null) return anchorKey;
          const resolved = annotationRowBefore(footerRow);
          return resolved?.getAttribute("data-chat-anchor-key") ?? anchorKey;
        }
        function turnOfRecord(record, storedKey) {
          if (Number.isFinite(record.turn)) return record.turn;
          const legacy = /:turn-process(\d+)$/.exec(storedKey);
          return legacy === null ? null : Number(legacy[1]);
        }
        function footerBlockForTurn(turn) {
          const item = turnDisclosureItem(turn);
          if (item !== null) return item;
          const content = turnContentItem(turn);
          if (content !== null) return content;
          if (!Number.isFinite(turn)) return null;
          const button3 = document.querySelector(`[data-turn-process="${turn}"]`);
          if (button3 === null) return null;
          return button3.closest('[data-chat-flow-kind="turn-process"]') ?? button3;
        }
        function renderSentCards() {
          const sessionId = currentSessionId();
          if (sessionId === void 0) return;
          const table = loadSent(sessionId);
          if (table.size === 0) return;
          for (const stale of document.querySelectorAll('[data-sa-ui="sent"]')) {
            const key = stale.getAttribute("data-sa-key");
            if (key === null || !table.has(key)) stale.remove();
          }
          let learnedTurn = false;
          for (const [storedKey, record] of table) {
            if (record.items.length === 0) continue;
            const anchorKey = resolveLegacyAnchor(storedKey);
            const row = document.querySelector(`[data-chat-anchor-key="${cssEscape(anchorKey)}"]`);
            let turn = turnOfRecord(record, storedKey);
            if (!Number.isFinite(turn) && row !== null) {
              const found = turnOfRow(row);
              if (Number.isFinite(found)) {
                turn = found;
                record.turn = turn;
                learnedTurn = true;
              }
            }
            const footer = footerBlockForTurn(turn);
            if (row === null && footer === null) continue;
            const existing = document.querySelector(`[data-sa-ui="sent"][data-sa-key="${cssEscape(storedKey)}"]`);
            const card = existing ?? buildSentCard(record, anchorKey);
            card.setAttribute("data-sa-key", storedKey);
            card.setAttribute("data-anchor", anchorKey);
            if (footer !== null) {
              if (footer.parentElement !== null) footer.parentElement.insertBefore(card, footer);
              continue;
            }
            const target = sentCardAnchor(row);
            if (target.parent !== null) {
              if (card.parentElement !== target.parent || card.nextSibling !== target.before) target.parent.insertBefore(card, target.before);
            } else if (existing === null) {
              row.appendChild(card);
            }
          }
          if (learnedTurn) saveSent(sessionId, table);
        }
        const VERDICT_LABELS = {
          accepted: ["verdict.accepted", "accepted"],
          partial: ["verdict.partial", "partial"],
          rejected: ["verdict.rejected", "rejected"],
          needs_info: ["verdict.needs_info", "needs_info"]
        };
        function mergeReplyBatches(batches) {
          const byIndex = /* @__PURE__ */ new Map();
          for (const batch of batches) {
            for (const reply of batch.replies) {
              if (reply === null || typeof reply !== "object") continue;
              const index = Number(reply.index);
              if (!Number.isFinite(index)) continue;
              byIndex.set(index, { ...reply, index, at: Number(batch.at) || 0 });
            }
          }
          return [...byIndex.values()].sort((a, b) => a.index - b.index);
        }
        function buildReplySection(batches, items = []) {
          const replies = mergeReplyBatches(batches);
          const byIndex = /* @__PURE__ */ new Map();
          for (const item of Array.isArray(items) ? items : []) {
            if (Number.isFinite(item?.index)) byIndex.set(item.index, item);
          }
          const card = document.createElement("div");
          card.className = "sa-replies";
          card.setAttribute("data-sa-ui", "replies");
          const counts = { accepted: 0, partial: 0, rejected: 0, needs_info: 0 };
          for (const reply of replies) {
            if (Object.hasOwn(counts, reply.verdict)) counts[reply.verdict] += 1;
          }
          const parts = [];
          if (counts.accepted) parts.push(t("summary.accepted", { n: counts.accepted }));
          if (counts.partial) parts.push(t("summary.partial", { n: counts.partial }));
          if (counts.rejected) parts.push(t("summary.rejected", { n: counts.rejected }));
          if (counts.needs_info) parts.push(t("summary.needsInfo", { n: counts.needs_info }));
          const head = buildSectionHead(t("replies.title", { n: replies.length }), parts.join(" · "));
          card.appendChild(head);
          const body = document.createElement("div");
          body.className = "sa-replies-body";
          for (const reply of replies) {
            const item = byIndex.get(reply.index);
            const [labelKey, tone] = VERDICT_LABELS[reply.verdict] ?? ["verdict.fallback", "accepted"];
            const group = document.createElement("div");
            group.className = `sa-reply-item sa-tone-${tone}`;
            group.setAttribute("data-sa-batch-at", String(Number.isFinite(reply.at) ? reply.at : 0));
            group.setAttribute("data-sa-reply-index", String(reply.index));
            const cardHead = document.createElement("div");
            cardHead.className = "sa-reply-head";
            const index = document.createElement("span");
            index.className = "sa-reply-index";
            index.textContent = t("reply.index", { n: reply.index });
            const verdict = document.createElement("span");
            verdict.className = `sa-a-verdict sa-reply-${tone}`;
            verdict.textContent = t(labelKey);
            cardHead.append(index, verdict);
            group.appendChild(cardHead);
            const content = document.createElement("div");
            content.className = "sa-reply-body";
            if (item !== void 0) {
              const q = document.createElement("div");
              q.className = "sa-q";
              const quoteText = typeof item.quote === "string" ? item.quote.trim() : "";
              if (quoteText !== "") {
                const qLabel = document.createElement("div");
                qLabel.className = "sa-q-label";
                qLabel.textContent = t("label.quote");
                q.appendChild(qLabel);
                const quote = document.createElement("div");
                quote.className = "sa-q-quote";
                quote.setAttribute("data-sa-field", "quote");
                quote.textContent = quoteText;
                quote.title = t("expand");
                quote.addEventListener("click", () => {
                  quote.className = quote.className.includes("sa-q-open") ? "sa-q-quote" : "sa-q-quote sa-q-open";
                });
                q.appendChild(quote);
              }
              if (typeof item.note === "string" && item.note.trim() !== "") {
                const noteLabel = document.createElement("div");
                noteLabel.className = "sa-q-label";
                noteLabel.textContent = t("label.note");
                q.appendChild(noteLabel);
                const note = document.createElement("div");
                note.className = "sa-q-note";
                note.setAttribute("data-sa-field", "note");
                note.textContent = item.note;
                q.appendChild(note);
              }
              content.appendChild(q);
            }
            const a = document.createElement("div");
            a.className = "sa-a";
            const aHead = document.createElement("div");
            aHead.className = "sa-a-head";
            const aLabel = document.createElement("span");
            aLabel.className = "sa-a-label";
            aLabel.textContent = item !== void 0 ? t("label.answer") : t("reply.fallbackLabel", { n: reply.index });
            aHead.appendChild(aLabel);
            a.appendChild(aHead);
            const reason = document.createElement("div");
            reason.className = "sa-a-reason";
            reason.setAttribute("data-sa-field", "reason");
            reason.textContent = typeof reply.reason === "string" ? reply.reason : "";
            a.appendChild(reason);
            if (typeof reply.next === "string" && reply.next.trim() !== "") {
              const next = document.createElement("div");
              next.className = "sa-a-next";
              next.setAttribute("data-sa-field", "next");
              next.textContent = t("next.prefix", { text: reply.next });
              a.appendChild(next);
            }
            content.appendChild(a);
            group.appendChild(content);
            body.appendChild(group);
          }
          const wrap = collapsible(body, true);
          applyCollapsed(head, wrap, true);
          card.dataset.open = "1";
          head.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            applyCollapsed(head, wrap, wrap.dataset.open !== "1");
            card.dataset.open = wrap.dataset.open;
          });
          card.append(wrap);
          return card;
        }
        function syncReplyCollapse(origin) {
          for (const section of document.querySelectorAll('[data-sa-ui="replies"]')) {
            let node = section.previousElementSibling ?? null;
            let footer = null;
            while (node !== null) {
              if (node.getAttribute?.("data-sa-ui") === "replies") {
                node = node.previousElementSibling ?? null;
                continue;
              }
              if (node.getAttribute?.("data-chat-flow-kind") === "turn-process" || node.matches?.("[data-turn-process]")) footer = node;
              break;
            }
            const button3 = footer === null ? null : footer.matches?.("[data-turn-process]") ? footer : footer.querySelector?.("[data-turn-process]");
            if (button3 !== null && origin !== void 0 && button3 !== origin) continue;
            const head = typeof section.querySelector === "function" ? section.querySelector(".sa-section-head") : null;
            const wrap = typeof section.querySelector === "function" ? section.querySelector(".sa-collapse") : null;
            if (head === null || wrap === null) continue;
            const open = button3 === null || button3.getAttribute("aria-expanded") !== "false";
            const seen = section.dataset.saFooterOpen;
            if (seen !== void 0 && seen === (open ? "1" : "0")) continue;
            section.dataset.saFooterOpen = open ? "1" : "0";
            applyCollapsed(head, wrap, open);
            section.dataset.open = wrap.dataset.open;
          }
        }
        function placeReplyAfterTurnProcess(section, turn) {
          const parent = section.parentElement;
          if (parent === null) return;
          const block = footerBlockForTurn(turn);
          if (block !== null && block.parentElement !== null) {
            let cursor2 = block;
            while (cursor2.nextElementSibling !== null && cursor2.nextElementSibling.getAttribute?.("data-sa-ui") === "replies") {
              cursor2 = cursor2.nextElementSibling;
            }
            block.parentElement.insertBefore(section, cursor2.nextSibling);
            return;
          }
          let sibling = typeof section.nextElementSibling === "undefined" ? null : section.nextElementSibling;
          while (sibling !== null && (typeof sibling.getAttribute !== "function" || sibling.getAttribute("data-chat-flow-kind") !== "turn-process")) {
            sibling = sibling.nextElementSibling ?? null;
          }
          if (sibling === null) return;
          let cursor = sibling;
          while (cursor.nextElementSibling !== null && cursor.nextElementSibling.getAttribute?.("data-sa-ui") === "replies") {
            cursor = cursor.nextElementSibling;
          }
          parent.insertBefore(section, cursor.nextSibling);
        }
        function applyLocale() {
          safe(() => {
            annotateButton.textContent = t("annotate");
          });
          safe(() => {
            menuAnnotate.textContent = t("menu.annotate");
            menuCopy.textContent = t("menu.copy");
          });
          safe(() => {
            popInput.placeholder = t("pop.placeholder");
          });
          safe(() => {
            popImagesHint.textContent = t("pop.imagesHint");
          });
          safe(() => {
            popDelete.textContent = t("pop.delete");
            popCancel.textContent = t("pop.cancel");
            popSave.textContent = t("pop.save");
          });
          for (const node of document.querySelectorAll('[data-sa-ui="sent"]')) node.remove();
          for (const node of document.querySelectorAll('[data-sa-ui="replies"]')) node.remove();
          safe(() => renderSentCards());
          safe(() => renderReplySections());
          if (panelOpen) refreshPanel();
        }
        function renderReplySections() {
          const sessionId = currentSessionId();
          if (sessionId === void 0) return;
          const table = loadSent(sessionId);
          if (table.size === 0) return;
          const batches = remoteReplyCache.get(sessionId) ?? [];
          if (batches.length === 0) return;
          for (const stale of document.querySelectorAll('[data-sa-ui="replies"]')) {
            const anchorKey = stale.getAttribute("data-anchor");
            const known = [...table.keys()].some((storedKey) => resolveLegacyAnchor(storedKey) === anchorKey);
            if (!known) stale.remove();
          }
          const byAnchor = /* @__PURE__ */ new Map();
          for (const [storedKey, record] of table) {
            const anchorKey = resolveLegacyAnchor(storedKey);
            const current = byAnchor.get(anchorKey);
            if (current === void 0 || current.record.savedAt < record.savedAt) {
              byAnchor.set(anchorKey, { record, turn: turnOfRecord(record, storedKey) });
            }
          }
          const records = [...byAnchor.entries()].sort((a, b) => a[1].record.savedAt - b[1].record.savedAt);
          const grouped = /* @__PURE__ */ new Map();
          for (const batch of batches) {
            let target;
            for (const [key, entry] of records) {
              if (entry.record.savedAt <= batch.at) target = key;
            }
            if (target === void 0) continue;
            const list = grouped.get(target) ?? [];
            list.push(batch);
            grouped.set(target, list);
          }
          for (const [anchorKey, list] of grouped) {
            const escaped = cssEscape(anchorKey);
            const sentCards = document.querySelectorAll(`[data-sa-ui="sent"][data-anchor="${escaped}"]`);
            const sentCard = sentCards[sentCards.length - 1];
            if (sentCard === void 0) continue;
            const items = byAnchor.get(anchorKey)?.record.items ?? [];
            const turn = byAnchor.get(anchorKey)?.turn ?? null;
            const signature = `${list.map((batch) => String(batch.at)).join("|")}#${items.length}`;
            const existing = document.querySelector(`[data-sa-ui="replies"][data-anchor="${escaped}"]`);
            if (existing !== null) {
              if (existing.dataset.signature === signature) continue;
              const fresh = buildReplySection(list, items);
              fresh.setAttribute("data-anchor", anchorKey);
              fresh.dataset.signature = signature;
              existing.replaceWith(fresh);
              placeReplyAfterTurnProcess(fresh, turn);
              continue;
            }
            const section = buildReplySection(list, items);
            section.setAttribute("data-anchor", anchorKey);
            section.dataset.signature = signature;
            sentCard.parentElement?.insertBefore(section, sentCard.nextSibling);
            placeReplyAfterTurnProcess(section, turn);
          }
          syncReplyCollapse();
        }
        function describeSource(source) {
          if (source === null || source === void 0) return t("source.unknown");
          if (source.kind === "message") {
            const role = source.flowKind === "user" || source.flowKind === "steering" ? t("source.user") : t("source.assistant");
            return t("source.message", { role, anchor: source.anchorKey || "-" });
          }
          if (source.kind === "file") {
            const path = source.path ?? t("source.pathUnknown");
            let where = "";
            if (Number.isFinite(source.lineStart)) {
              where = Number.isFinite(source.lineEnd) && source.lineEnd !== source.lineStart ? t("source.lineRange", { a: source.lineStart, b: source.lineEnd }) : t("source.lineSingle", { n: source.lineStart });
            }
            return t("source.file", { path, where });
          }
          if (source.kind === "reply") {
            const fieldLabel = { quote: t("label.quote"), note: t("label.note"), reason: t("label.reason"), next: t("label.next") }[source.field] ?? t("source.replyField");
            const anchor = `reply:${Number.isFinite(source.batchAt) ? source.batchAt : "-"}:${Number.isFinite(source.index) ? source.index : "-"}:${source.field || "item"}`;
            const span = Number.isFinite(source.charStart) && Number.isFinite(source.charEnd) ? t("source.span", { a: source.charStart, b: source.charEnd }) : "";
            return t("source.reply", {
              index: Number.isFinite(source.index) ? source.index : "-",
              field: fieldLabel,
              anchor,
              span
            });
          }
          if (source.kind === "sent") {
            const fieldLabel = { quote: t("label.quote"), note: t("label.note") }[source.field] ?? t("source.sentField");
            const anchor = `sent:${source.anchorKey || "-"}:${Number.isFinite(source.index) ? source.index : "-"}:${source.field || "item"}`;
            const span = Number.isFinite(source.charStart) && Number.isFinite(source.charEnd) ? t("source.span", { a: source.charStart, b: source.charEnd }) : "";
            return t("source.sent", {
              index: Number.isFinite(source.index) ? source.index : "-",
              field: fieldLabel,
              anchor,
              span
            });
          }
          return t("source.selection");
        }
        function buildPayload(items) {
          let imageOrder = 0;
          const annotations2 = items.map((item) => {
            const entry = {
              index: item.number,
              quote: item.quote,
              note: item.note,
              source: payloadSource(item.source)
            };
            const images = Array.isArray(item.images) ? item.images : [];
            if (images.length > 0) {
              entry.images = images.map((image) => {
                imageOrder += 1;
                return { order: imageOrder, name: image.name };
              });
            }
            return entry;
          });
          return JSON.stringify(
            {
              kind: PAYLOAD_KIND,
              version: 1,
              instruction: instructionOf(),
              count: annotations2.length,
              annotations: annotations2
            },
            null,
            2
          );
        }
        function payloadSource(source) {
          const out = { kind: source?.kind ?? "dom" };
          if (source?.kind === "message") {
            out.role = source.role ?? (source.flowKind === "user" || source.flowKind === "steering" ? "user" : "assistant");
            if (typeof source.anchorKey === "string" && source.anchorKey !== "") out.anchorKey = source.anchorKey;
            if (typeof source.flowKind === "string" && source.flowKind !== "") out.flowKind = source.flowKind;
          } else if (source?.kind === "file") {
            if (typeof source.path === "string" && source.path !== "") out.path = source.path;
            if (Number.isFinite(source.lineStart)) out.lineStart = source.lineStart;
            if (Number.isFinite(source.lineEnd)) out.lineEnd = source.lineEnd;
          } else if (source?.kind === "reply") {
            if (Number.isFinite(source.batchAt)) out.batchAt = source.batchAt;
            if (Number.isFinite(source.index)) out.index = source.index;
            if (typeof source.field === "string" && source.field !== "") out.field = source.field;
          } else if (source?.kind === "sent") {
            if (typeof source.anchorKey === "string" && source.anchorKey !== "") out.anchorKey = source.anchorKey;
            if (Number.isFinite(source.index)) out.index = source.index;
            if (typeof source.field === "string" && source.field !== "") out.field = source.field;
          }
          if (out.kind === "file" || out.kind === "message" || out.kind === "reply" || out.kind === "sent") {
            out.textOrigin = source?.textOrigin === "source" ? "source" : "rendered";
          }
          if (Number.isFinite(source?.charStart)) out.charStart = source.charStart;
          if (Number.isFinite(source?.charEnd)) out.charEnd = source.charEnd;
          return out;
        }
        function scheduleSync() {
          if (syncTimer !== null) window.clearTimeout(syncTimer);
          syncTimer = window.setTimeout(() => {
            syncTimer = null;
            void syncAttachment();
          }, UPLOAD_DEBOUNCE_MS);
        }
        function releaseDrafts(ids, shell) {
          if (ids.length === 0) return;
          const previousGuard = maintaining;
          maintaining = true;
          try {
            for (const id of ids) safe(() => shell.removeAttachment(id));
            const conversation = ctx.conversation;
            for (const id of ids) safe(() => conversation?.releaseDraftAttachment?.(id));
          } finally {
            maintaining = previousGuard;
          }
        }
        function waitForUploads(conversation, ids, timeoutMs) {
          const store = conversation?.fileUploads;
          if (store === void 0 || typeof store.subscribe !== "function" || typeof store.getSnapshot !== "function") {
            return Promise.resolve(true);
          }
          return new Promise((resolve) => {
            let settled = false;
            let unsubscribe;
            let timer = null;
            const finish = (value) => {
              if (settled) return;
              settled = true;
              if (typeof unsubscribe === "function") safe(unsubscribe);
              if (timer !== null) window.clearTimeout(timer);
              resolve(value);
            };
            const check = () => {
              if (settled) return;
              const snapshot2 = safe(() => store.getSnapshot());
              if (snapshot2 === void 0 || snapshot2 === null) return;
              let pending = 0;
              for (const id of ids) {
                const entry = snapshot2[id];
                if (entry === void 0) {
                  pending += 1;
                  continue;
                }
                if (entry.status === "error") {
                  finish(false);
                  return;
                }
                if (entry.status !== "ready") pending += 1;
              }
              if (pending === 0) finish(true);
            };
            const result = safe(() => store.subscribe(() => check()));
            unsubscribe = typeof result === "function" ? result : void 0;
            timer = window.setTimeout(() => finish(false), timeoutMs);
            if (settled) {
              if (typeof unsubscribe === "function") safe(unsubscribe);
              window.clearTimeout(timer);
            }
            check();
          });
        }
        function draftAttachmentSupported(conversation, shell) {
          return typeof conversation?.createDrafts === "function" && typeof shell?.addFiles === "function" && typeof shell?.removeAttachment === "function";
        }
        async function syncAttachment() {
          if (syncing) {
            scheduleSync();
            return;
          }
          syncing = true;
          const previous = draftIds;
          try {
            if (pendingRefine !== void 0) {
              await Promise.race([
                pendingRefine,
                new Promise((resolve) => {
                  window.setTimeout(resolve, REFINE_WAIT_MS);
                })
              ]);
            }
            const shell = inputShell();
            const conversation = ctx.conversation;
            const sessionId = currentSessionId();
            if (shell === void 0 || sessionId === void 0) {
              draftIds = [];
              return;
            }
            if (!draftAttachmentSupported(conversation, shell)) {
              warn("[selection-annotations] 运行时未提供 createDrafts/addFiles，批注不会随消息发送");
              draftIds = [];
              return;
            }
            releaseDrafts(previous, shell);
            draftIds = [];
            draftSeen = false;
            if (annotations.length === 0) return;
            const file = new File([buildPayload(annotations)], ANNOTATION_FILE, { type: "application/json" });
            const imageFiles = [];
            for (const item of annotations) {
              for (const image of Array.isArray(item.images) ? item.images : []) {
                if (image !== null && typeof image === "object" && image.file !== null && typeof image.file === "object") {
                  imageFiles.push(image.file);
                }
              }
            }
            const drafts = conversation.createDrafts(sessionId, [file, ...imageFiles]);
            const ids = Array.isArray(drafts) ? drafts.map((draft) => draft.id).filter((id) => typeof id === "string") : [];
            if (ids.length === 0) return;
            if (!await waitForUploads(conversation, [ids[0]], UPLOAD_READY_TIMEOUT_MS)) {
              warn("[selection-annotations] 批注附件上传失败，本次不随消息发送");
              releaseDrafts(ids, shell);
              return;
            }
            draftIds = ids;
            draftSeen = false;
            try {
              watchDraft();
            } catch (err) {
              warn("[selection-annotations] 消费检测挂载失败（不影响本次发送）：", err);
            }
            if (safe(() => shell.addFiles([], ids)) === false) {
              draftIds = [];
              releaseDrafts(ids, shell);
              return;
            }
            lastAnnotatedKeys = captureAnchorKeys();
            attachedSessionId = sessionId;
            log(`[selection-annotations] 批注块已挂到本条消息（${annotations.length} 条）`);
          } catch (err) {
            warn("[selection-annotations] 批注附件同步失败：", err);
          } finally {
            syncing = false;
            maintaining = false;
          }
        }
        const overlay = document.createElement("div");
        overlay.className = "sa-overlay";
        overlay.setAttribute("data-sa-ui", "overlay");
        function scheduleRepaint() {
          if (repaintTimer !== null) return;
          repaintTimer = window.setTimeout(() => {
            repaintTimer = null;
            repaint();
          }, REPAINT_MS);
        }
        function repaint() {
          highlightHits = [];
          scanSentMessages();
          renderSentCards();
          renderReplySections();
          const nodes = [];
          for (const item of annotations) {
            const range = locateRange(item);
            if (range === void 0) continue;
            const rects = safe(() => [...range.getClientRects()]) ?? [];
            if (rects.length > 0) highlightHits.push({ id: item.id, rects });
            let badged = false;
            for (const rect of rects) {
              if (rect.width <= 0 || rect.height <= 0) continue;
              const box = document.createElement("div");
              box.className = "sa-hl";
              box.style.left = `${rect.left}px`;
              box.style.top = `${rect.top}px`;
              box.style.width = `${rect.width}px`;
              box.style.height = `${rect.height}px`;
              nodes.push(box);
              if (!badged) {
                badged = true;
                const badge = document.createElement("button");
                badge.type = "button";
                badge.className = "sa-badge";
                badge.textContent = String(item.number);
                badge.style.left = `${rect.left - 11}px`;
                badge.style.top = `${rect.top - 8}px`;
                badge.title = item.note === "" ? item.quote : `${item.quote}

批注：${item.note}`;
                badge.addEventListener("click", (event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  openEditPopover(item.id, badge);
                });
                nodes.push(badge);
              }
            }
          }
          if (typeof overlay.replaceChildren === "function") {
            overlay.replaceChildren(...nodes);
          } else {
            overlay.textContent = "";
            for (const node of nodes) overlay.appendChild(node);
          }
        }
        const toolbar = document.createElement("div");
        toolbar.className = "sa-toolbar";
        toolbar.setAttribute("data-sa-ui", "toolbar");
        const annotateButton = document.createElement("button");
        annotateButton.type = "button";
        annotateButton.className = "sa-btn";
        annotateButton.textContent = t("annotate");
        toolbar.appendChild(annotateButton);
        const contextMenu = document.createElement("div");
        contextMenu.className = "sa-menu";
        contextMenu.setAttribute("data-sa-ui", "menu");
        contextMenu.dataset.open = "0";
        const menuAnnotate = document.createElement("button");
        menuAnnotate.type = "button";
        menuAnnotate.className = "sa-menu-item";
        menuAnnotate.textContent = t("menu.annotate");
        const menuCopy = document.createElement("button");
        menuCopy.type = "button";
        menuCopy.className = "sa-menu-item";
        menuCopy.textContent = t("menu.copy");
        contextMenu.append(menuAnnotate, menuCopy);
        let contextMenuSelection = null;
        const popover = document.createElement("div");
        popover.className = "sa-popover";
        popover.setAttribute("data-sa-ui", "popover");
        const popTitle = document.createElement("div");
        popTitle.className = "sa-pop-title";
        const popQuote = document.createElement("div");
        popQuote.className = "sa-pop-quote";
        const popSource = document.createElement("div");
        popSource.className = "sa-pop-src";
        const popInput = document.createElement("textarea");
        popInput.className = "sa-pop-input";
        popInput.placeholder = t("pop.placeholder");
        let popInputAutoHeight = true;
        let popInputAutoValue = 0;
        let highlightHits = [];
        let hoverOpenTimer = null;
        let hoverTargetId = null;
        let hoverCloseTimer = null;
        let popoverHovered = false;
        let popoverTouched = false;
        let popoverSource = "manual";
        const popActions = document.createElement("div");
        popActions.className = "sa-pop-actions";
        let popInputImages = [];
        const popImages = document.createElement("div");
        popImages.className = "sa-pop-images";
        const popImagesHint = document.createElement("div");
        popImagesHint.className = "sa-pop-images-hint";
        popImagesHint.textContent = t("pop.imagesHint");
        const imageViewer = document.createElement("div");
        imageViewer.className = "sa-viewer";
        imageViewer.setAttribute("data-sa-ui", "viewer");
        imageViewer.dataset.open = "0";
        const imageViewerImg = document.createElement("img");
        imageViewerImg.className = "sa-viewer-img";
        imageViewerImg.alt = t("viewer.alt");
        imageViewer.appendChild(imageViewerImg);
        function openImageViewer(url, name) {
          if (typeof url !== "string" || url === "") return;
          imageViewerImg.src = url;
          imageViewerImg.alt = typeof name === "string" && name !== "" ? name : t("viewer.alt");
          imageViewer.dataset.open = "1";
        }
        function closeImageViewer() {
          if (imageViewer.dataset.open !== "1") return;
          imageViewer.dataset.open = "0";
          imageViewerImg.removeAttribute("src");
        }
        imageViewer.addEventListener("click", () => closeImageViewer());
        const popDelete = document.createElement("button");
        popDelete.type = "button";
        popDelete.className = "sa-link sa-pop-delete";
        popDelete.textContent = t("pop.delete");
        const popSpacer = document.createElement("span");
        popSpacer.className = "sa-pop-spacer";
        const popCancel = document.createElement("button");
        popCancel.type = "button";
        popCancel.className = "sa-link";
        popCancel.textContent = t("pop.cancel");
        const popSave = document.createElement("button");
        popSave.type = "button";
        popSave.className = "sa-btn";
        popSave.textContent = t("pop.save");
        popActions.append(popDelete, popSpacer, popCancel, popSave);
        popover.append(popTitle, popQuote, popSource, popInput, popImages, popActions);
        function isExcluded(node) {
          const element = elementOf(node);
          if (element === null) return true;
          if (element.closest("[data-sa-ui]") !== null && element.closest('[data-sa-ui="replies"]') === null && element.closest('[data-sa-ui="sent"]') === null) return true;
          if (element.closest("[data-composer-card],[data-composer-input],[data-input-scroll]") !== null) return true;
          if (element.closest('input,textarea,[contenteditable="true"]') !== null) return true;
          return false;
        }
        function readSelection() {
          const selection = window.getSelection();
          if (selection === null || selection.rangeCount === 0 || selection.isCollapsed) return null;
          const range = selection.getRangeAt(0);
          const quote = range.toString();
          if (quote.trim() === "") return null;
          if (isExcluded(range.startContainer) || isExcluded(range.endContainer)) return null;
          return { range, quote };
        }
        function hideToolbar() {
          toolbar.dataset.open = "0";
        }
        function closeContextMenu() {
          if (contextMenu.dataset.open !== "1") return;
          contextMenu.dataset.open = "0";
          contextMenuSelection = null;
        }
        function openContextMenu(selection, x, y) {
          contextMenuSelection = selection;
          contextMenu.dataset.open = "1";
          const width = contextMenu.offsetWidth || 132;
          const height = contextMenu.offsetHeight || 64;
          contextMenu.style.left = `${Math.max(8, Math.min(x, window.innerWidth - width - 8))}px`;
          contextMenu.style.top = `${Math.max(8, Math.min(y, window.innerHeight - height - 8))}px`;
        }
        function copyPlainText(text) {
          if (typeof text !== "string" || text === "") return;
          try {
            if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
              navigator.clipboard.writeText(text).catch(() => {
              });
              return;
            }
          } catch {
          }
          safe(() => {
            const area = document.createElement("textarea");
            area.value = text;
            area.style.position = "fixed";
            area.style.opacity = "0";
            document.body.appendChild(area);
            area.select();
            document.execCommand("copy");
            area.remove();
          });
        }
        function onContextMenu(event) {
          const target = elementOf(event.target);
          if (target !== null && target.closest("[data-sa-ui]") !== null && target.closest('[data-sa-ui="replies"]') === null && target.closest('[data-sa-ui="sent"]') === null) return;
          const selection = readSelection();
          if (selection === null) return;
          event.preventDefault();
          event.stopPropagation();
          pendingSelection = selection;
          hideToolbar();
          closeContextMenu();
          openContextMenu(selection, event.clientX, event.clientY);
        }
        function placeAt(element, rect, gap) {
          const width = element.offsetWidth || 80;
          const height = element.offsetHeight || 32;
          const left = Math.max(8, Math.min(rect.left + rect.width / 2 - width / 2, window.innerWidth - width - 8));
          const above = rect.top - height - gap;
          const top = above < 8 ? Math.min(rect.bottom + gap, window.innerHeight - height - 8) : above;
          element.style.left = `${left}px`;
          element.style.top = `${Math.max(8, top)}px`;
        }
        function placeAvoidingTextInteraction(element) {
          const surface = document.querySelector("[data-text-interaction-surface]");
          if (surface === null || surface.getAttribute("aria-hidden") === "true") return false;
          const rect = safe(() => surface.getBoundingClientRect());
          if (rect === void 0 || rect.width < 2 || rect.height < 2) return false;
          const width = element.offsetWidth || 80;
          const height = element.offsetHeight || 32;
          const left = Math.max(8, Math.min(rect.left + rect.width / 2 - width / 2, window.innerWidth - width - 8));
          const above = rect.top - height - 8;
          const top = above >= 8 ? above : Math.min(rect.bottom + 8, window.innerHeight - height - 8);
          element.style.left = `${left}px`;
          element.style.top = `${Math.max(8, top)}px`;
          return true;
        }
        function onSelectionChange() {
          window.clearTimeout(settleTimer);
          settleTimer = window.setTimeout(() => {
            settleTimer = null;
            const selection = readSelection();
            if (selection === null) {
              hideToolbar();
              return;
            }
            const rect = safe(() => selection.range.getBoundingClientRect());
            if (rect === void 0 || rect.width === 0 && rect.height === 0) {
              hideToolbar();
              return;
            }
            pendingSelection = selection;
            toolbar.dataset.open = "1";
            placeAt(toolbar, rect, 8);
            placeAvoidingTextInteraction(toolbar);
            window.clearTimeout(avoidTimer);
            avoidTimer = window.setTimeout(() => {
              avoidTimer = 0;
              if (toolbar.dataset.open === "1") placeAvoidingTextInteraction(toolbar);
            }, 140);
          }, SETTLE_MS);
        }
        let popoverMode = "create";
        let popoverAnchor = null;
        let popoverTargetId = null;
        function renderPopImages() {
          popImages.textContent = "";
          for (const image of popInputImages) {
            const box = document.createElement("div");
            box.className = "sa-pop-image";
            if (typeof image.url === "string" && image.url !== "") {
              const thumb = document.createElement("img");
              thumb.className = "sa-pop-thumb";
              thumb.src = image.url;
              thumb.alt = image.name;
              thumb.title = t("image.open");
              thumb.style.cursor = "zoom-in";
              thumb.addEventListener("click", (event) => {
                event.preventDefault();
                event.stopPropagation();
                openImageViewer(image.url, image.name);
              });
              box.appendChild(thumb);
            } else {
              const fallback = document.createElement("span");
              fallback.className = "sa-pop-thumb-fallback";
              fallback.textContent = image.name;
              box.appendChild(fallback);
            }
            const remove = document.createElement("button");
            remove.type = "button";
            remove.className = "sa-pop-image-remove";
            remove.title = t("image.remove");
            remove.textContent = "×";
            remove.addEventListener("click", (event) => {
              event.preventDefault();
              event.stopPropagation();
              removePopImage(image.id);
            });
            box.appendChild(remove);
            popImages.appendChild(box);
          }
          popImages.appendChild(popImagesHint);
        }
        function removePopImage(id) {
          popInputImages = popInputImages.filter((image) => image.id !== id);
          renderPopImages();
        }
        async function addPopImages(files) {
          const picked = [];
          for (const file of files) {
            if (file === null || typeof file !== "object") continue;
            if (typeof file.type !== "string" || !file.type.startsWith("image/")) continue;
            if (popInputImages.length + picked.length >= MAX_IMAGES_PER_ANNOTATION) continue;
            if (Number(file.size) > MAX_IMAGE_BYTES) continue;
            picked.push(file);
          }
          const rejected = files.length > 0 ? files.length - picked.length : 0;
          for (const file of picked) {
            const processed = await compressImage(file, imageSettingsOf());
            const dataUrl = await fileToDataUrl(processed);
            const url = safe(() => URL.createObjectURL(processed));
            const thumb = await downscaleDataUrl(processed, 480, 0.65);
            popInputImages.push({
              id: `img-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
              file: processed,
              name: typeof processed.name === "string" && processed.name !== "" ? processed.name : t("image.alt"),
              url: typeof url === "string" ? url : void 0,
              dataUrl,
              thumb,
              bytes: Number(processed.size) || 0
            });
            renderPopImages();
          }
          if (rejected > 0) log(`[selection-annotations] 已忽略 ${rejected} 张图片（每图最多 ${MAX_IMAGES_PER_ANNOTATION} 张、单张不超过 ${MAX_IMAGE_BYTES} 字节）`);
          return picked.length;
        }
        function resetPopImages(images) {
          popInputImages = Array.isArray(images) ? images.slice() : [];
          renderPopImages();
        }
        function resetPopInputHeight() {
          popInputAutoHeight = true;
          popInputAutoValue = 0;
          popInput.style.height = "";
        }
        function syncPopInputHeight() {
          if (!popInputAutoHeight) return;
          const min = 62;
          const max = Math.max(min, Math.round(window.innerHeight * 0.6));
          popInput.style.height = "auto";
          const next = Math.max(min, Math.min(popInput.scrollHeight, max));
          popInput.style.height = `${next}px`;
          popInputAutoValue = next;
        }
        function showPopover(options) {
          popTitle.textContent = options.title;
          popQuote.textContent = options.quote.length > 400 ? `${options.quote.slice(0, 400)}…` : options.quote;
          popQuote.style.display = options.quote === "" ? "none" : "";
          popSource.textContent = options.sourceText;
          popInput.value = options.note;
          resetPopImages(options.images);
          popoverMode = options.mode;
          popoverTargetId = options.targetId ?? null;
          popDelete.style.display = options.mode === "edit" ? "" : "none";
          hideToolbar();
          resetPopInputHeight();
          popoverTouched = false;
          popoverHovered = false;
          popoverSource = options.source === "hover" ? "hover" : "manual";
          cancelHoverOpen();
          cancelHoverClose();
          popover.dataset.open = "1";
          if (options.rect !== void 0 && options.rect !== null) placeAt(popover, options.rect, 10);
          syncPopInputHeight();
          safe(() => popInput.focus());
          safe(() => popInput.setSelectionRange(popInput.value.length, popInput.value.length));
        }
        function openCreatePopover() {
          const selection = pendingSelection;
          if (selection === null) return;
          popoverAnchor = { range: selection.range, quote: selection.quote, source: captureSource(selection.range) };
          showPopover({
            title: t("pop.createTitle"),
            quote: selection.quote,
            sourceText: describeSource(popoverAnchor.source),
            note: "",
            images: [],
            rect: safe(() => selection.range.getBoundingClientRect()),
            mode: "create",
            targetId: null
          });
        }
        function openEditPopover(id, anchor, source = "manual") {
          const item = annotations.find((candidate) => candidate.id === id);
          if (item === void 0) return;
          const measured = safe(() => anchor?.getBoundingClientRect());
          const rect = measured ?? {
            left: window.innerWidth / 2 - 40,
            top: window.innerHeight / 2,
            width: 80,
            height: 0,
            right: window.innerWidth / 2 + 40,
            bottom: window.innerHeight / 2
          };
          popoverAnchor = null;
          showPopover({
            title: t("pop.editTitle", { n: item.number }),
            quote: item.quote,
            sourceText: describeSource(item.source),
            note: item.note,
            images: Array.isArray(item.images) ? item.images : [],
            rect,
            mode: "edit",
            targetId: id,
            source
          });
        }
        function closePopover() {
          popover.dataset.open = "0";
          safe(() => popInput.blur());
          popoverAnchor = null;
          popoverTargetId = null;
          popoverMode = "create";
        }
        function markRefineReason(id, reason) {
          let hit = false;
          annotations = annotations.map((item) => {
            if (item.id !== id) return item;
            hit = true;
            return { ...item, refineReason: reason };
          });
          if (!hit) return;
          emit();
          scheduleRepaint();
        }
        function refineSourcePosition(id, source, quote) {
          const task = (async () => {
            const precise = await safe(
              () => resolveSourcePosition(source, quote, (reason) => markRefineReason(id, reason))
            );
            if (precise === void 0) return;
            let hit = false;
            annotations = annotations.map((item) => {
              if (item.id !== id) return item;
              hit = true;
              return { ...item, source: { ...item.source, ...precise } };
            });
            if (!hit) return;
            emit();
            if (!syncing) scheduleSync();
            scheduleRepaint();
          })();
          const guarded = task.catch((err) => {
            warn("[selection-annotations] 位置精修失败（不影响这条批注）：", err);
          });
          pendingRefine = guarded;
          void guarded.then(() => {
            if (pendingRefine === guarded) pendingRefine = void 0;
          });
          return guarded;
        }
        function shouldDiscardEmpty(mode, note, images) {
          if (mode === "edit") return false;
          if (typeof note === "string" && note.trim() !== "") return false;
          return !Array.isArray(images) || images.length === 0;
        }
        function commitPopover(discardEmpty = false) {
          if (popoverMode === "edit") {
            const target = popoverTargetId;
            const images2 = popInputImages;
            const note2 = popInput.value;
            closePopover();
            if (target !== null) updateAnnotation(target, note2, images2);
            return;
          }
          const anchor = popoverAnchor;
          if (anchor === null) return;
          const note = popInput.value;
          const images = popInputImages;
          if (discardEmpty && shouldDiscardEmpty(popoverMode, note, images)) {
            closePopover();
            return;
          }
          closePopover();
          const created = addAnnotation({
            quote: anchor.quote,
            note,
            images,
            source: anchor.source,
            liveRange: anchor.range
          });
          safe(() => window.getSelection()?.removeAllRanges());
          if (created !== void 0) {
            refineSourcePosition(created.id, anchor.source, anchor.quote).catch((err) => {
              warn("[selection-annotations] 位置精修失败（不影响这条批注）：", err);
            });
          }
        }
        function deleteFromPopover() {
          const target = popoverTargetId;
          closePopover();
          if (target !== null) removeAnnotation(target);
        }
        annotateButton.addEventListener("mousedown", (event) => {
          event.preventDefault();
        });
        annotateButton.addEventListener("click", (event) => {
          event.preventDefault();
          openCreatePopover();
        });
        menuAnnotate.addEventListener("mousedown", (event) => {
          event.preventDefault();
        });
        menuAnnotate.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          const selection = contextMenuSelection ?? pendingSelection;
          closeContextMenu();
          if (selection === null) return;
          pendingSelection = selection;
          openCreatePopover();
        });
        menuCopy.addEventListener("mousedown", (event) => {
          event.preventDefault();
        });
        menuCopy.addEventListener("click", (event) => {
          event.preventDefault();
          const selection = contextMenuSelection ?? pendingSelection;
          closeContextMenu();
          if (selection !== null) copyPlainText(selection.quote);
        });
        popCancel.addEventListener("click", () => closePopover());
        popSave.addEventListener("click", () => {
          commitPopover();
        });
        popDelete.addEventListener("click", () => deleteFromPopover());
        popInput.addEventListener("keydown", (event) => {
          if (event.key === "Escape") closePopover();
          if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) commitPopover();
        });
        popInput.addEventListener("input", () => {
          syncPopInputHeight();
        });
        popInput.addEventListener("pointerup", () => {
          if (!popInputAutoHeight) return;
          if (Math.abs(popInput.offsetHeight - popInputAutoValue) > 2) popInputAutoHeight = false;
        });
        popInput.addEventListener("paste", (event) => {
          const data = event.clipboardData;
          if (data === null || data === void 0) return;
          const files = [...data.files ?? []];
          if (files.length === 0) {
            for (const entry of data.items ?? []) {
              if (entry.kind !== "file") continue;
              const file = safe(() => entry.getAsFile());
              if (file !== null && file !== void 0) files.push(file);
            }
          }
          const images = files.filter((file) => typeof file?.type === "string" && file.type.startsWith("image/"));
          if (images.length === 0) return;
          event.preventDefault();
          void addPopImages(images);
        });
        popover.addEventListener("dragover", (event) => {
          if (event.dataTransfer === null || event.dataTransfer === void 0) return;
          event.preventDefault();
        });
        popover.addEventListener("drop", (event) => {
          const files = [...event.dataTransfer?.files ?? []];
          if (files.length === 0) return;
          event.preventDefault();
          void addPopImages(files);
        });
        function cancelHoverOpen() {
          if (hoverOpenTimer !== null) window.clearTimeout(hoverOpenTimer);
          hoverOpenTimer = null;
          hoverTargetId = null;
        }
        function cancelHoverClose() {
          if (hoverCloseTimer !== null) window.clearTimeout(hoverCloseTimer);
          hoverCloseTimer = null;
        }
        function scheduleHoverClose() {
          if (popoverSource !== "hover") return;
          if (hoverCloseTimer !== null) return;
          if (popoverTouched || popoverHovered) return;
          hoverCloseTimer = window.setTimeout(() => {
            hoverCloseTimer = null;
            if (popover.dataset.open !== "1") return;
            if (popoverSource !== "hover") return;
            if (popoverTouched || popoverHovered) return;
            commitPopover(true);
          }, 250);
        }
        function hitHighlight(x, y) {
          for (const entry of highlightHits) {
            for (const rect of entry.rects) {
              if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) return entry;
            }
          }
          return void 0;
        }
        function onHoverMove(event) {
          const open = popover.dataset.open === "1";
          const hit = highlightHits.length === 0 ? void 0 : hitHighlight(event.clientX, event.clientY);
          if (open) {
            if (popoverSource !== "hover") return;
            if (popoverTouched || popoverHovered) return;
            if (hit !== void 0) return;
            scheduleHoverClose();
            return;
          }
          if (hit === void 0) {
            cancelHoverOpen();
            return;
          }
          if (hoverTargetId === hit.id) return;
          cancelHoverOpen();
          hoverTargetId = hit.id;
          hoverOpenTimer = window.setTimeout(() => {
            hoverOpenTimer = null;
            hoverTargetId = null;
            if (popover.dataset.open === "1") return;
            const target = annotations.find((item) => item.id === hit.id);
            if (target === void 0) return;
            const rect = hit.rects[0];
            openEditPopover(target.id, { getBoundingClientRect: () => rect }, "hover");
          }, HOVER_OPEN_DELAY_MS);
        }
        popover.addEventListener("mouseenter", () => {
          popoverHovered = true;
          cancelHoverClose();
        });
        popover.addEventListener("mouseleave", () => {
          popoverHovered = false;
          scheduleHoverClose();
        });
        popover.addEventListener(
          "pointerdown",
          () => {
            popoverTouched = true;
            cancelHoverClose();
          },
          true
        );
        popInput.addEventListener("input", () => {
          popoverTouched = true;
        });
        let hoverMoveAt = 0;
        document.addEventListener(
          "mousemove",
          (event) => {
            const now = Date.now();
            if (now - hoverMoveAt < 60) return;
            hoverMoveAt = now;
            onHoverMove(event);
          },
          true
        );
        document.addEventListener("pointerdown", (event) => {
          if (popover.dataset.open !== "1") return;
          const target = elementOf(event.target);
          if (target !== null && target.closest('[data-sa-ui="popover"]') !== null) return;
          if (target !== null && target.closest('[data-sa-ui="viewer"]') !== null) return;
          commitPopover(true);
        }, true);
        document.addEventListener("keydown", (event) => {
          if (event.key !== "Escape") return;
          if (imageViewer.dataset.open === "1") {
            closeImageViewer();
            return;
          }
          hideToolbar();
          closePopover();
        });
        function sourceSummary(item) {
          const source = item.source;
          if (source?.kind === "message") return source.flowKind === "user" ? t("source.user") : t("source.assistant");
          if (source?.kind === "reply") return t("source.replyShort", { n: Number.isFinite(source.index) ? source.index : "-" });
          if (source?.kind === "sent") return t("source.sentShort", { n: Number.isFinite(source.index) ? source.index : "-" });
          if (source?.kind === "file") {
            const path = source.path ?? t("source.fileFallback");
            const where = Number.isFinite(source.lineStart) ? `${path}:${source.lineStart}` : path;
            return source.textOrigin === "source" ? where : `${where}${t("source.rendered")}`;
          }
          return t("source.selection");
        }
        const panelRoot = document.createElement("div");
        panelRoot.className = "sa-float";
        panelRoot.setAttribute("data-sa-ui", "panel");
        panelRoot.style.display = "none";
        const panelEl = document.createElement("div");
        panelEl.className = "sa-panel";
        panelEl.setAttribute("data-sa-ui", "panel");
        panelRoot.appendChild(panelEl);
        panelEl.addEventListener("dragover", (event) => {
          event.preventDefault();
          event.dataTransfer.dropEffect = "move";
        });
        panelEl.addEventListener("drop", (event) => {
          if (event.defaultPrevented) return;
          const draggedId = event.dataTransfer.getData("text/plain");
          if (draggedId !== "") moveAnnotation(draggedId, null);
        });
        let panelRaf = 0;
        let panelObserver = null;
        let turnSyncRaf = 0;
        if (typeof ResizeObserver === "function") {
          panelObserver = new ResizeObserver(() => {
            if (!panelOpen || panelRaf !== 0) return;
            panelRaf = window.requestAnimationFrame(() => {
              panelRaf = 0;
              positionPanel();
            });
          });
          panelObserver.observe(panelEl);
        }
        let panelOpen = false;
        let panelAnchor = null;
        let panelHideTimer = 0;
        let imageSettingsOpen = false;
        let instructionSettingsOpen = false;
        function button2(className, text, onClick) {
          const created = el("button", className, text);
          created.type = "button";
          created.addEventListener("click", onClick);
          return created;
        }
        function positionPanel() {
          if (!panelOpen || panelAnchor === null) return;
          const rect = safe(() => panelAnchor.getBoundingClientRect());
          if (rect === void 0) return;
          const width = panelEl.offsetWidth || 360;
          const viewport = window.innerHeight;
          const spaceAbove = rect.top - 16;
          const spaceBelow = viewport - rect.bottom - 16;
          const preferAbove = spaceAbove >= 260 || spaceBelow < 260;
          const available = Math.max(200, Math.min(preferAbove ? spaceAbove : spaceBelow, viewport * 0.72));
          panelEl.style.maxHeight = `${Math.round(available)}px`;
          const height = panelEl.offsetHeight || 240;
          const left = Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8));
          const above = rect.top - height - 8;
          const top = above >= 8 ? above : Math.min(rect.bottom + 8, viewport - height - 8);
          panelRoot.style.left = `${left}px`;
          panelRoot.style.top = `${Math.max(8, top)}px`;
        }
        function renderPanel() {
          panelEl.textContent = "";
          const panelHead = el("div", "sa-panel-head");
          panelHead.appendChild(el("span", "sa-panel-title", t("panel.title")));
          const build = el("span", "sa-build", `@u2a5f/dsh-selection-annotations build.${PLUGIN_BUILD}`);
          build.title = `@u2a5f/dsh-selection-annotations build.${PLUGIN_BUILD}`;
          panelHead.appendChild(build);
          const meta = el("div", "sa-panel-meta");
          const hint = el("span", "sa-panel-hint", t("panel.foot"));
          hint.title = t("panel.foot");
          meta.appendChild(hint);
          meta.appendChild(el("span", "sa-panel-count", t("panel.count", { n: annotations.length })));
          if (annotations.length > 0) {
            meta.appendChild(button2("sa-foot-action", t("panel.clear"), () => clearAnnotations()));
          }
          panelHead.appendChild(meta);
          panelEl.appendChild(panelHead);
          const panelBody = el("div", "sa-panel-body");
          if (annotations.length === 0) {
            panelBody.appendChild(el("div", "sa-panel-empty", t("panel.empty")));
          }
          for (const item of annotations) {
            const row = el("div", "sa-item");
            row.draggable = true;
            row.dataset.id = item.id;
            row.addEventListener("dragstart", (event) => {
              event.dataTransfer.setData("text/plain", item.id);
              event.dataTransfer.effectAllowed = "move";
              row.className = "sa-item sa-dragging";
            });
            row.addEventListener("dragend", () => {
              for (const node of panelEl.querySelectorAll(".sa-item")) {
                node.className = node.className.replace(" sa-drop-before", "").replace(" sa-dragging", "");
              }
            });
            row.addEventListener("dragover", (event) => {
              event.preventDefault();
              event.dataTransfer.dropEffect = "move";
              row.className = "sa-item sa-drop-before";
            });
            row.addEventListener("dragleave", () => {
              row.className = "sa-item";
            });
            row.addEventListener("drop", (event) => {
              event.preventDefault();
              event.stopPropagation();
              const draggedId = event.dataTransfer.getData("text/plain");
              if (draggedId !== "") moveAnnotation(draggedId, item.id);
            });
            const head = el("div", "sa-item-head");
            const grip = el("span", "sa-drag-handle", "⠿");
            grip.title = t("panel.drag");
            grip.setAttribute("aria-label", t("panel.drag"));
            head.appendChild(grip);
            head.appendChild(el("span", "sa-item-num", String(item.number)));
            const summary = el("span", "sa-item-src", sourceSummary(item));
            summary.title = summary.textContent;
            head.appendChild(summary);
            const actions = el("div", "sa-item-actions");
            actions.appendChild(button2("sa-item-action", t("panel.edit"), () => openEditPopover(item.id, head)));
            actions.appendChild(button2("sa-item-action sa-danger", t("panel.delete"), () => removeAnnotation(item.id)));
            head.appendChild(actions);
            row.appendChild(head);
            if (item.quote !== "") {
              const q = el("div", "sa-item-q");
              q.appendChild(el("div", "sa-item-label", t("panel.quote")));
              const quote = el("div", "sa-item-quote", item.quote);
              quote.title = t("expand");
              quote.addEventListener("click", () => {
                quote.className = quote.className.includes("sa-q-open") ? "sa-item-quote" : "sa-item-quote sa-q-open";
              });
              q.appendChild(quote);
              row.appendChild(q);
            }
            if (item.note !== "") {
              const a = el("div", "sa-item-a");
              a.appendChild(el("div", "sa-item-label", t("panel.note")));
              a.appendChild(el("div", "sa-item-note", item.note));
              row.appendChild(a);
            }
            if (Array.isArray(item.images) && item.images.length > 0) {
              const gallery = el("div", "sa-item-images");
              for (const image of item.images) {
                if (typeof image?.url !== "string" || image.url === "") continue;
                const thumb = document.createElement("img");
                thumb.className = "sa-item-thumb";
                thumb.src = image.url;
                thumb.alt = typeof image.name === "string" ? image.name : t("image.alt");
                thumb.title = t("image.open");
                thumb.style.cursor = "zoom-in";
                thumb.addEventListener("click", (event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  openImageViewer(image.url, image.name);
                });
                gallery.appendChild(thumb);
              }
              if (gallery.childNodes.length > 0) row.appendChild(gallery);
            }
            if (typeof item.refineReason === "string" && item.refineReason !== "") {
              const why = el("div", "sa-item-why", t("panel.refineFailed", { reason: item.refineReason }));
              why.style.fontSize = "11px";
              why.style.lineHeight = "1.5";
              why.style.opacity = "0.8";
              why.style.color = "var(--dsw-alias-text-tertiary, GrayText)";
              why.style.marginTop = "2px";
              row.appendChild(why);
            }
            panelBody.appendChild(row);
          }
          panelBody.appendChild(imageSettingsRow());
          panelBody.appendChild(instructionSettingsRow());
          panelEl.appendChild(panelBody);
        }
        function imageSettingsRow() {
          const settings = imageSettingsOf();
          const box = el("div", "sa-settings");
          const head = el("div", "sa-settings-head");
          const toggle = button2("sa-link", imageSettingsOpen ? t("settings.imagesOpen") : t("settings.imagesClosed"), () => {
            imageSettingsOpen = !imageSettingsOpen;
            refreshPanel();
          });
          head.appendChild(toggle);
          head.appendChild(
            el(
              "span",
              "sa-hint",
              settings.compress ? t("settings.imagesOn", { n: Math.round(settings.quality * 100) }) : t("settings.imagesOff")
            )
          );
          box.appendChild(head);
          if (!imageSettingsOpen) return box;
          const compressRow = el("label", "sa-setting");
          const compress = document.createElement("input");
          compress.type = "checkbox";
          compress.checked = settings.compress;
          compress.addEventListener("change", () => {
            imageSettingsOf().compress = compress.checked;
            persistImageSettings();
            refreshPanel();
          });
          compressRow.append(compress, document.createTextNode(t("settings.compress")));
          box.appendChild(compressRow);
          const qualityRow = el("label", "sa-setting");
          const quality = document.createElement("input");
          quality.type = "range";
          quality.min = "0.5";
          quality.max = "1";
          quality.step = "0.05";
          quality.value = String(settings.quality);
          const qualityText = el("span", "sa-setting-value", `${Math.round(settings.quality * 100)}%`);
          quality.addEventListener("input", () => {
            imageSettingsOf().quality = Number(quality.value);
            qualityText.textContent = `${Math.round(Number(quality.value) * 100)}%`;
            persistImageSettings();
          });
          qualityRow.append(document.createTextNode(t("settings.quality")), quality, qualityText);
          box.appendChild(qualityRow);
          const sizeRow = el("label", "sa-setting");
          const size = document.createElement("input");
          size.type = "number";
          size.className = "sa-setting-number";
          size.min = "0";
          size.max = "4096";
          size.step = "10";
          size.value = String(settings.minSize);
          size.addEventListener("change", () => {
            const next = Number(size.value);
            imageSettingsOf().minSize = Number.isFinite(next) ? Math.min(4096, Math.max(0, Math.round(next))) : DEFAULT_IMAGE_SETTINGS.minSize;
            persistImageSettings();
          });
          sizeRow.append(document.createTextNode(t("settings.minSizeBefore")), size, document.createTextNode(t("settings.minSizeAfter")));
          box.appendChild(sizeRow);
          return box;
        }
        function instructionSettingsRow() {
          const box = el("div", "sa-settings");
          const head = el("div", "sa-settings-head");
          const toggle = button2("sa-link", instructionSettingsOpen ? t("settings.instructionOpen") : t("settings.instructionClosed"), () => {
            instructionSettingsOpen = !instructionSettingsOpen;
            refreshPanel();
          });
          head.appendChild(toggle);
          head.appendChild(el("span", "sa-hint", isDefaultInstruction(instructionOf()) ? t("settings.default") : t("settings.customized")));
          box.appendChild(head);
          if (!instructionSettingsOpen) return box;
          const area = document.createElement("textarea");
          area.className = "sa-setting-textarea";
          area.rows = 6;
          area.value = instructionOf();
          area.addEventListener("input", () => persistInstructionSettings(area.value));
          box.appendChild(area);
          const actions = el("div", "sa-settings-actions");
          actions.appendChild(
            button2("sa-link", t("settings.restore"), () => {
              persistInstructionSettings(defaultInstruction());
              refreshPanel();
            })
          );
          actions.appendChild(el("span", "sa-hint", t("settings.instrHint")));
          box.appendChild(actions);
          return box;
        }
        function refreshPanel() {
          renderPanel();
          if (panelOpen) positionPanel();
        }
        function openPanel(anchor) {
          panelOpen = true;
          panelAnchor = anchor;
          if (panelHideTimer !== 0) {
            window.clearTimeout(panelHideTimer);
            panelHideTimer = 0;
          }
          panelRoot.style.display = "";
          panelRoot.dataset.open = "0";
          renderPanel();
          positionPanel();
          void panelRoot.offsetHeight;
          panelRoot.dataset.open = "1";
          emit();
        }
        function closePanel() {
          if (!panelOpen) return;
          panelOpen = false;
          panelAnchor = null;
          panelRoot.dataset.open = "0";
          if (panelHideTimer !== 0) window.clearTimeout(panelHideTimer);
          panelHideTimer = window.setTimeout(() => {
            panelHideTimer = 0;
            if (!panelOpen) panelRoot.style.display = "none";
          }, 180);
          emit();
        }
        function togglePanel(anchor) {
          if (panelOpen) closePanel();
          else openPanel(anchor);
        }
        document.addEventListener(
          "pointerdown",
          (event) => {
            if (!panelOpen) return;
            const target = elementOf(event.target);
            if (target === null) return;
            if (target.closest('[data-sa-ui="panel"]') !== null) return;
            if (target.closest('[data-sa-ui="popover"]') !== null) return;
            if (target.closest(".sa-chip") !== null) return;
            closePanel();
          },
          true
        );
        document.addEventListener("keydown", (event) => {
          if (event.key === "Escape") closePanel();
        });
        subscribe(() => {
          if (panelOpen) {
            renderPanel();
            positionPanel();
          }
        });
        function AnnotateButton(props) {
          const [local, setLocal] = React.useState(() => ({ items: snapshot(), open: panelOpen }));
          const propSessionId = props?.sessionId;
          const propInputActions = props?.inputActions;
          if (typeof propSessionId === "string" && propSessionId !== "") latestSessionId = propSessionId;
          if (propInputActions !== void 0 && propInputActions !== null) latestInputActions = propInputActions;
          React.useEffect(() => subscribe(() => setLocal({ items: snapshot(), open: panelOpen })), []);
          React.useEffect(() => {
            if (typeof propSessionId === "string" && propSessionId !== "") adoptSession(propSessionId);
          }, [propSessionId]);
          const count = local.items.length;
          return h(
            "button",
            {
              className: local.open ? "sa-chip sa-chip-open" : "sa-chip",
              type: "button",
              title: count === 0 ? t("chip.emptyTitle") : t("chip.title"),
              onClick: (event) => togglePanel(event.currentTarget)
            },
            count === 0 ? t("chip.label") : t("chip.count", { n: count })
          );
        }
        ctx.effect(() => {
          const style = document.createElement("style");
          style.setAttribute("data-selection-annotations", "");
          style.textContent = CSS;
          document.head.appendChild(style);
          document.body.append(overlay, toolbar, contextMenu, popover, panelRoot, imageViewer);
          orphanTimer = window.setInterval(() => {
            const shell = inputShell();
            if (shell !== void 0) sweepOrphans(shell);
          }, ORPHAN_SWEEP_MS);
          const onUnload = () => saveDraft(annotationsSession);
          window.addEventListener("beforeunload", onUnload);
          window.addEventListener("pagehide", onUnload);
          return () => {
            saveDraft(annotationsSession);
            window.removeEventListener("beforeunload", onUnload);
            window.removeEventListener("pagehide", onUnload);
            cancelHoverOpen();
            cancelHoverClose();
            for (const node of document.querySelectorAll('[data-sa-ui="sent"]')) node.remove();
            for (const node of document.querySelectorAll('[data-sa-ui="replies"]')) node.remove();
            style.remove();
            if (orphanTimer !== null) window.clearInterval(orphanTimer);
            orphanTimer = null;
            if (watchTimer !== null) window.clearInterval(watchTimer);
            watchTimer = null;
            if (consumeTimer !== null) window.clearTimeout(consumeTimer);
            consumeTimer = null;
            overlay.remove();
            toolbar.remove();
            contextMenu.remove();
            popover.remove();
            if (panelObserver !== null) {
              panelObserver.disconnect();
              panelObserver = null;
            }
            if (panelRaf !== 0) {
              window.cancelAnimationFrame(panelRaf);
              panelRaf = 0;
            }
            panelRoot.remove();
            imageViewer.remove();
          };
        });
        ctx.effect(() => {
          let timer = null;
          let disposed = false;
          const tick = async () => {
            timer = null;
            if (disposed) return;
            try {
              if (document.visibilityState !== "hidden") {
                const sessionId = currentSessionId();
                if (sessionId !== void 0) {
                  const remote = await pullRemoteSession(sessionId);
                  if (remote !== null && remote !== void 0 && absorbRemoteReplies(sessionId, remote)) {
                    scheduleRepaint();
                  }
                }
              }
            } catch {
            } finally {
              if (!disposed) {
                timer = window.setTimeout(tick, REPLY_POLL_MS);
                if (typeof timer?.unref === "function") timer.unref();
              }
            }
          };
          timer = window.setTimeout(tick, REPLY_POLL_MS);
          if (typeof timer?.unref === "function") timer.unref();
          return () => {
            disposed = true;
            if (timer !== null) window.clearTimeout(timer);
            timer = null;
          };
        });
        ctx.effect(() => {
          document.addEventListener("selectionchange", onSelectionChange);
          document.addEventListener("contextmenu", onContextMenu, true);
          const onMenuPointerDown = (event) => {
            const target = elementOf(event.target);
            if (target !== null && target.closest('[data-sa-ui="menu"]') !== null) return;
            closeContextMenu();
          };
          const onMenuKeydown = (event) => {
            if (event.key === "Escape") closeContextMenu();
          };
          document.addEventListener("pointerdown", onMenuPointerDown, true);
          document.addEventListener("keydown", onMenuKeydown, true);
          const onViewport = () => {
            scheduleRepaint();
            positionPanel();
            closeContextMenu();
          };
          window.addEventListener("scroll", onViewport, true);
          window.addEventListener("resize", onViewport);
          const observer = new MutationObserver((records) => {
            for (const record of records) {
              const target = elementOf(record.target);
              if (target !== null && target.closest("[data-sa-ui]") !== null) continue;
              scheduleRepaint();
              return;
            }
          });
          observer.observe(document.body, { childList: true, subtree: true, characterData: true });
          return () => {
            document.removeEventListener("selectionchange", onSelectionChange);
            document.removeEventListener("contextmenu", onContextMenu, true);
            document.removeEventListener("pointerdown", onMenuPointerDown, true);
            document.removeEventListener("keydown", onMenuKeydown, true);
            window.removeEventListener("scroll", onViewport, true);
            window.removeEventListener("resize", onViewport);
            observer.disconnect();
          };
        });
        ctx.effect(() => {
          const observer = new MutationObserver((records) => {
            let touched = null;
            for (const record of records) {
              const element = elementOf(record.target);
              if (element !== null && element.getAttribute("data-turn-process") !== null) {
                touched = element;
                break;
              }
            }
            if (touched === null || turnSyncRaf !== 0) return;
            turnSyncRaf = window.requestAnimationFrame(() => {
              turnSyncRaf = 0;
              syncReplyCollapse(touched);
            });
          });
          observer.observe(document.body, { subtree: true, attributes: true, attributeFilter: ["aria-expanded", "data-open"] });
          return () => {
            observer.disconnect();
            if (turnSyncRaf !== 0) {
              window.cancelAnimationFrame(turnSyncRaf);
              turnSyncRaf = 0;
            }
          };
        });
        ctx.slots.inject(
          "conversation.input.right",
          () => ctx.slots.register({ name: "conversation.input.right", id: "selection-annotations", order: 30 }, AnnotateButton)
        );
        function AnnotationRepliesCard(props) {
          const phase = props?.phase;
          const block = props?.block;
          let replies = [];
          try {
            const raw = phase === "result" ? block?.call?.argsRaw : block?.argsRaw;
            const parsed = JSON.parse(raw ?? "");
            if (Array.isArray(parsed?.replies)) replies = parsed.replies;
          } catch {
            replies = [];
          }
          if (replies.length === 0) {
            return h("div", { className: "sa-replies-card sa-replies-empty" }, t("replies.waiting"));
          }
          return h(
            "div",
            { className: "sa-replies-card" },
            h("div", { className: "sa-replies-head" }, t("replies.title", { n: replies.length })),
            ...replies.map(
              (reply) => h(
                "div",
                { className: "sa-reply", key: `reply-${reply?.index}` },
                h(
                  "div",
                  { className: "sa-reply-line" },
                  h("span", { className: "sa-reply-index" }, `#${reply?.index ?? "?"}`),
                  h(
                    "span",
                    { className: `sa-reply-verdict sa-reply-${reply?.verdict ?? "unknown"}` },
                    t(VERDICT_LABELS[reply?.verdict]?.[0] ?? "verdict.unknown")
                  )
                ),
                h("div", { className: "sa-reply-reason" }, reply?.reason ?? ""),
                reply?.next ? h("div", { className: "sa-reply-next" }, t("next.prefix", { text: reply.next })) : null
              )
            )
          );
        }
        try {
          ctx.slots.inject(
            "tool.call.toolview",
            () => ctx.slots.register({ name: "tool.call.toolview", key: "annotation_replies", inject: () => ({}) }, AnnotationRepliesCard)
          );
        } catch (error) {
          console.error("[selection-annotations] 批注答复卡片注册失败：", error);
        }
        function AnnotationInstructionSettings() {
          const [text, setText] = React.useState(() => instructionOf());
          const customized = !isDefaultInstruction(text);
          return h(
            "div",
            { className: "sa-settings-page" },
            h(
              "div",
              { className: "sa-settings-page-head" },
              h("strong", null, t("settings.pageTitle")),
              h("span", { className: "sa-hint" }, customized ? t("settings.customized") : t("settings.default"))
            ),
            h(
              "p",
              { className: "sa-hint" },
              t("settings.pageHint")
            ),
            h("textarea", {
              className: "sa-setting-textarea",
              rows: 8,
              value: text,
              onChange: (event) => {
                setText(event.target.value);
                persistInstructionSettings(event.target.value);
              }
            }),
            h(
              "div",
              { className: "sa-settings-actions" },
              h(
                "button",
                {
                  type: "button",
                  className: "sa-link",
                  onClick: () => {
                    setText(defaultInstruction());
                    persistInstructionSettings(defaultInstruction());
                  }
                },
                t("settings.restore")
              )
            )
          );
        }
        try {
          ctx.slots.inject(
            "plugins.bundle.config",
            () => ctx.slots.register(
              { name: "plugins.bundle.config", key: "@u2a5f/dsh-selection-annotations", inject: () => ({}) },
              AnnotationInstructionSettings
            )
          );
        } catch (error) {
          console.error("[selection-annotations] 插件详情页设置区注册失败：", error);
        }
        if (localeService !== void 0 && localeService !== null && typeof localeService.subscribe === "function") {
          ctx.effect(() => {
            const off = localeService.subscribe(() => {
              activeLocale = safe(() => localeService.getSnapshot?.().active) ?? activeLocale;
              applyLocale();
            });
            return () => {
              safe(off);
            };
          }, "selection-annotations: locale changes");
        }
        window.__dshSelectionAnnotations = {
          list: () => snapshot().map((item) => ({
            id: item.id,
            number: item.number,
            quote: item.quote,
            note: item.note,
            source: item.source
          })),
          payload: () => buildPayload(annotations),
          receipt: () => draftIds[0] ?? null,
          drafts: () => [...draftIds],
          session: () => currentSessionId(),
          repaint,
          remove: removeAnnotation,
          clear: clearAnnotations,
          update: (id, note) => updateAnnotation(id, note),
          add: (input) => addAnnotation(input),
          _internals: { buildPayload, payloadSource, describeSource, captureSource, matchInRoot, rangeFromOffsets, offsetRange, anchorRoot, locateInSource, lineOfOffset, resolveSourcePosition, refineSourcePosition, adoptSession, loadDraft, saveDraft, loadSent, saveSent, recordSent, scanSentMessages, buildSentCard, renderSentCards, renderReplySections, buildReplySection, mergeReplyBatches, absorbRemoteReplies, shouldDiscardEmpty, loadImageSettings, syncReplyCollapse, sentCardAnchor, turnOfRow }
        };
      }
    };
  }

  // src/entry.js
  window.__ModuleLoader__.load({
    id: "@u2a5f/dsh-selection-annotations",
    factory(require2) {
      const React = require2("react");
      return createPlugin(React);
    }
  });
})();
