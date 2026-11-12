(() => {
  // src/core/styles.js
  var CSS = `
.sa-overlay { position: fixed; inset: 0; pointer-events: none; z-index: 60; }
.sa-hl { position: fixed; pointer-events: none; border-radius: 3px;
  background: color-mix(in srgb, var(--dsw-alias-state-warn-primary, #f59e0b) 30%, transparent);
  box-shadow: inset 0 -1px 0 color-mix(in srgb, var(--dsw-alias-state-warn-primary, #f59e0b) 70%, transparent); }
.sa-hl[data-adopt="1"] { background: color-mix(in srgb, var(--dsw-alias-state-success-primary, #22c55e) 30%, transparent);
  box-shadow: inset 0 -1px 0 color-mix(in srgb, var(--dsw-alias-state-success-primary, #22c55e) 70%, transparent); }
/* 批注文字的墨色从主题前景色派生（同 dsh-todo-notes 的优先级着色）：普通批注走 warn 色相，采纳走 success 色相。*/
.sa-item-note, .sa-sent-note, .sa-q-note, .sa-pop-input, .sa-token {
  color: var(--dsw-alias-state-warn-primary, #d29922); }
@supports (color: oklch(from #fff calc(l * 0.9) 0.1 80)) {
  .sa-item-note, .sa-sent-note, .sa-q-note, .sa-pop-input, .sa-token {
    color: oklch(from var(--dsw-alias-label-primary, #e8e8ea) calc(l * 0.9) 0.12 85); }
}
.sa-item-note[data-adopt="1"], .sa-sent-note[data-adopt="1"], .sa-q-note[data-adopt="1"],
.sa-pop-input[data-adopt="1"], .sa-token {
  color: var(--dsw-alias-state-success-primary, #22c55e); }
@supports (color: oklch(from #fff calc(l * 0.9) 0.1 80)) {
  .sa-item-note[data-adopt="1"], .sa-sent-note[data-adopt="1"], .sa-q-note[data-adopt="1"],
  .sa-pop-input[data-adopt="1"], .sa-token {
    color: oklch(from var(--dsw-alias-label-primary, #e8e8ea) calc(l * 0.9) 0.13 150); }
}
.sa-badge { position: fixed; pointer-events: auto; cursor: pointer; font: inherit; border: none; padding: 0 3px; min-width: 15px; height: 15px; padding: 0 3px; box-sizing: border-box;
  display: inline-flex; align-items: center; justify-content: center; border-radius: 8px;
  background: var(--dsw-alias-brand-primary, #247bbf); color: #fff; font-size: calc(10px + var(--dsh-content-font-delta, 0px) * 0.4); line-height: 1;
  font-weight: 600; font-variant-numeric: tabular-nums; }
.sa-toolbar { position: fixed; display: none; z-index: 61; gap: 0; padding: 2px; box-sizing: border-box;
  border-radius: 8px; background: var(--dsw-alias-bg-layer-2, Canvas);
  border: 1px solid var(--dsw-alias-border-l2, ButtonBorder); box-shadow: var(--dsw-elevation-panel, 0 4px 14px rgba(0,0,0,.18)); }
.sa-toolbar[data-open="1"] { display: inline-flex; }
.sa-menu { position: fixed; z-index: 65; display: none; min-width: 132px; padding: 4px; box-sizing: border-box;
  border-radius: 8px; color: var(--dsw-alias-label-primary, CanvasText); background: var(--dsw-alias-bg-layer-2, Canvas);
  border: 1px solid var(--dsw-alias-border-l2, ButtonBorder); box-shadow: var(--dsw-elevation-panel, 0 8px 24px rgba(0,0,0,.22)); }
.sa-menu[data-open="1"] { display: block; }
.sa-menu-item { display: block; width: 100%; text-align: left; font: inherit; font-size: calc(12.5px + var(--dsh-content-font-delta, 0px) * 0.6); line-height: 1.2;
  padding: 6px 10px; border: none; border-radius: 5px; background: transparent; color: inherit; cursor: pointer; }
.sa-menu-item:hover { background: var(--dsw-alias-interactive-bg-hover, ButtonFace); }
.sa-btn { font: inherit; font-size: calc(12px + var(--dsh-content-font-delta, 0px) * 0.6); line-height: 1; padding: 6px 10px; cursor: pointer;
  display: inline-flex; align-items: center; gap: 5px;
  color: var(--dsw-alias-label-primary, CanvasText); background: var(--dsw-alias-bg-overlay, Canvas);
  border: 1px solid var(--dsw-alias-border-l2, ButtonBorder); border-radius: 7px;
  box-shadow: 0 4px 14px rgba(0,0,0,.18); }
.sa-btn:hover { border-color: var(--dsw-alias-brand-primary, #247bbf); color: var(--dsw-alias-brand-primary, #247bbf); }
  .sa-toolbar .sa-btn { border: 0; box-shadow: none; background: transparent; border-radius: 6px; }
  .sa-toolbar .sa-btn:hover { background: var(--dsw-alias-interactive-bg-hover, ButtonFace); color: var(--dsw-alias-label-primary, CanvasText); }
  .sa-toolbar .sa-btn + .sa-btn { box-shadow: inset 1px 0 0 var(--dsw-alias-border-l2, ButtonBorder); border-radius: 0 6px 6px 0; }
  .sa-toolbar .sa-btn-adopt, .sa-toolbar .sa-btn-adopt:hover { color: var(--dsw-alias-brand-primary, #247bbf); }
  .sa-btn-adopt { border-color: var(--dsw-alias-brand-primary, #247bbf); color: var(--dsw-alias-brand-primary, #247bbf); }
.sa-popover { position: fixed; display: block; z-index: 70; width: 340px; max-width: calc(100vw - 24px);
  padding: 10px; box-sizing: border-box; border-radius: 10px; color: var(--dsw-alias-label-primary, CanvasText);
  background: var(--dsw-alias-bg-layer-2, Canvas); border: 1px solid var(--dsw-alias-border-l2, ButtonBorder);
  box-shadow: var(--dsw-elevation-prominent, 0 10px 32px rgba(0,0,0,.24));
  opacity: 0; visibility: hidden; transform: translateY(-6px) scale(0.98);
  will-change: opacity, transform;
  transition: opacity 180ms ease, transform 180ms ease, visibility 180ms; }
.sa-popover[data-open="1"] { opacity: 1; visibility: visible; transform: none; }
/* 进入编辑、移动光标或键入时抬到最前层；比 DSH 的普通浮层高，但仍低于图片查看器。*/
.sa-popover.sa-front { z-index: 2147483000; }
.sa-viewer { position: fixed; inset: 0; z-index: 80; display: none; align-items: center; justify-content: center;
  background: rgb(0 0 0 / 0.72); cursor: zoom-out; }
.sa-viewer[data-open="1"] { display: flex; }
.sa-viewer-img { max-width: 92vw; max-height: 88vh; box-sizing: border-box; border-radius: 6px;
  background: #fff; box-shadow: 0 12px 48px rgb(0 0 0 / 0.5); }
.sa-pop-title { font-size: calc(12px + var(--dsh-content-font-delta, 0px) * 0.6); font-weight: 600; margin: 0 0 6px; }
.sa-pop-quote { max-height: 120px; overflow: auto; margin: 0 0 8px; padding: 6px 8px; font-size: calc(12px + var(--dsh-content-font-delta, 0px) * 0.6);
  white-space: pre-wrap; word-break: break-word; color: var(--dsw-alias-label-secondary, GrayText);
  background: var(--dsw-alias-bg-layer-2, ButtonFace); border-left: 2px solid var(--dsw-alias-border-l2, ButtonBorder); border-radius: 4px; }
.sa-pop-src { margin: 0 0 6px; font-size: calc(10.5px + var(--dsh-content-font-delta, 0px) * 0.4); line-height: 1.45;
  color: var(--dsw-alias-label-tertiary, GrayText); }
.sa-pop-input { width: 100%; box-sizing: border-box; min-height: 62px; resize: vertical; padding: 6px 8px;
  font: inherit; font-size: calc(12px + var(--dsh-content-font-delta, 0px) * 0.6); color: var(--dsw-alias-label-primary, CanvasText); background: var(--dsw-alias-bg-layer-1, Canvas);
  border: 1px solid var(--dsw-alias-border-l1, ButtonBorder); border-radius: 6px; }
.sa-pop-input { white-space: pre-wrap; overflow-wrap: anywhere; overflow-y: auto; max-height: 60vh; }
.sa-pop-input:focus-visible { outline: 2px solid var(--dsw-alias-state-business-primary, var(--dsw-alias-brand-primary, #247bbf)); outline-offset: 1px; }
.sa-pop-input[data-empty="1"]::before { content: attr(data-placeholder); color: var(--dsw-alias-label-tertiary, GrayText); pointer-events: none; }
.sa-pop-label { margin: 8px 0 4px; font-size: calc(11px + var(--dsh-content-font-delta, 0px) * 0.4); font-weight: 600;
  letter-spacing: .02em; color: var(--dsw-alias-label-secondary, GrayText); }
.sa-pop-head { display: flex; align-items: center; justify-content: space-between; gap: 8px;
  margin: 0 0 6px; padding-bottom: 8px; border-bottom: 1px solid var(--dsw-alias-border-l1, ButtonBorder);
  cursor: move; user-select: none; touch-action: none; }
.sa-pop-dragging, .sa-pop-dragging * { cursor: grabbing !important; user-select: none; }
.sa-pop-head .sa-pop-title { margin: 0; }
.sa-pop-close { flex: none; width: 24px; height: 24px; padding: 0; border: none; border-radius: 6px;
  background: transparent; color: var(--dsw-alias-label-secondary, GrayText); font-size: 16px; line-height: 1; cursor: pointer; }
.sa-pop-close:hover { background: var(--dsw-alias-interactive-bg-hover, ButtonFace); color: var(--dsw-alias-label-primary, CanvasText); }
.sa-pop-divider { margin: 10px 0 2px; border-top: 1px dashed var(--dsw-alias-border-l2, ButtonBorder); }
.sa-pop-primary { background: var(--dsw-alias-brand-primary, #247bbf); color: var(--dsw-alias-label-primary-inverted, #fff);
  border-color: transparent; }
.sa-pop-primary:hover { background: var(--dsw-alias-brand-primary, #247bbf); color: var(--dsw-alias-label-primary-inverted, #fff); filter: brightness(1.08); }
.sa-token { display: inline-flex; align-items: center; margin: 0 1px; padding: 0 6px; border-radius: 6px;
  background: var(--dsw-alias-state-success-tertiary, #e6faed); color: var(--dsw-alias-state-success-primary, #22c55e);
  font-weight: 500; user-select: all; }
.sa-ghost { position: fixed; z-index: 68; pointer-events: none; font-style: italic; white-space: pre;
  font-size: calc(13px + var(--dsh-content-font-delta, 0px) * 0.8); line-height: 1.6;
  color: var(--dsw-alias-label-tertiary, GrayText); opacity: .8; }
.sa-suggest { position: fixed; z-index: 75; margin: 0; padding: 4px 8px; font: inherit;
  font-size: calc(11px + var(--dsh-content-font-delta, 0px) * 0.4); color: var(--dsw-alias-brand-primary, #247bbf);
  background: var(--dsw-alias-bg-layer-1, Canvas); border: 1px dashed var(--dsw-alias-border-l2, ButtonBorder);
  border-radius: 6px; cursor: pointer; }
.sa-suggest:hover { background: var(--dsw-alias-interactive-bg-hover, ButtonFace); }
.sa-pop-actions { display: flex; align-items: center; gap: 6px; margin-top: 8px; }
.sa-pop-spacer { flex: 1; }
.sa-pop-delete { color: var(--dsw-alias-state-error-primary, #e5484d); }
.sa-float { position: fixed; z-index: 63; max-width: calc(100vw - 16px); }
.sa-chip { font: inherit; font-size: calc(12px + var(--dsh-content-font-delta, 0px) * 0.6); line-height: 1; padding: 5px 9px; cursor: pointer;
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
.sa-panel-title { flex: none; min-width: 0; font-size: calc(13px + var(--dsh-content-font-delta, 0px) * 0.8); font-weight: 600; letter-spacing: 0.01em; }
.sa-build { flex: 0 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; font-size: calc(11px + var(--dsh-content-font-delta, 0px) * 0.4); font-style: italic;
  font-variant-numeric: tabular-nums; letter-spacing: 0.02em; color: var(--dsw-alias-label-tertiary, GrayText);
  user-select: text; white-space: nowrap; }
.sa-panel-meta { display: flex; align-items: center; gap: 8px; min-width: 0; flex: none; max-width: 66%; margin-left: auto; }
.sa-panel-foot { flex: none; display: flex; justify-content: flex-end; padding: 8px 14px 10px;
  border-top: 1px solid var(--dsw-alias-border-l1, ButtonBorder); }
.sa-panel-hint { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: calc(11px + var(--dsh-content-font-delta, 0px) * 0.4);
  color: var(--dsw-alias-label-tertiary, GrayText); }
.sa-panel-count { padding: 2px 7px; border-radius: 999px; font-size: calc(11px + var(--dsh-content-font-delta, 0px) * 0.4); font-variant-numeric: tabular-nums;
  color: var(--dsw-alias-label-secondary, GrayText); background: var(--dsw-alias-bg-layer-2, ButtonFace); }
.sa-panel-body { flex: 1 1 auto; min-height: 0; overflow: auto; padding: 4px 8px 10px; }
.sa-panel-empty { padding: 30px 18px; text-align: center; font-size: calc(12.5px + var(--dsh-content-font-delta, 0px) * 0.6); line-height: 1.7;
  color: var(--dsw-alias-label-secondary, GrayText); }
.sa-item { padding: 10px 8px; border-radius: 8px; border-bottom: none; }
.sa-item + .sa-item { border-top: 1px solid var(--dsw-alias-border-l1, ButtonBorder); border-radius: 0; }
.sa-item:hover { background: color-mix(in srgb, var(--dsw-alias-bg-layer-2, ButtonFace) 55%, transparent); }
.sa-item.sa-dragging { opacity: 0.45; }
.sa-item.sa-drop-before { box-shadow: inset 0 2px 0 var(--dsw-alias-brand-primary, #247bbf); }
.sa-drag-handle { cursor: grab; color: var(--dsw-alias-label-tertiary, GrayText); font-size: calc(12px + var(--dsh-content-font-delta, 0px) * 0.6); line-height: 1;
  padding: 2px 3px; border-radius: 4px; user-select: none; }
.sa-drag-handle:hover { background: var(--dsw-alias-bg-layer-2, ButtonFace); color: var(--dsw-alias-label-primary, CanvasText); }
.sa-drag-handle:active { cursor: grabbing; }
.sa-item-head { display: flex; align-items: center; gap: 6px; }
.sa-item-num { display: inline-flex; align-items: center; justify-content: center; min-width: 18px; height: 18px;
  padding: 0 5px; border-radius: 5px; font-size: calc(11px + var(--dsh-content-font-delta, 0px) * 0.4); font-weight: 600; font-variant-numeric: tabular-nums;
  color: var(--dsw-alias-brand-primary, #247bbf);
  background: color-mix(in srgb, var(--dsw-alias-brand-primary, #247bbf) 14%, transparent); }
.sa-item-src { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: calc(11px + var(--dsh-content-font-delta, 0px) * 0.4);
  color: var(--dsw-alias-label-secondary, GrayText); }
.sa-item-actions { display: flex; gap: 2px; opacity: 0; transition: opacity 120ms ease; }
.sa-item:hover .sa-item-actions, .sa-item:focus-within .sa-item-actions { opacity: 1; }
.sa-item-action { font: inherit; font-size: calc(11.5px + var(--dsh-content-font-delta, 0px) * 0.4); padding: 2px 6px; border-radius: 5px; cursor: pointer;
  border: none; background: none; color: var(--dsw-alias-label-secondary, GrayText); }
.sa-item-action:hover { background: var(--dsw-alias-bg-layer-2, ButtonFace); color: var(--dsw-alias-label-primary, CanvasText); }
.sa-item-action.sa-danger:hover { color: var(--dsw-alias-state-error-primary, #e5484d); }
.sa-item-q { margin-top: 8px; padding-left: 10px; border-left: 2px solid var(--dsw-alias-border-l1, ButtonBorder); }
.sa-item-label { font-size: calc(10.5px + var(--dsh-content-font-delta, 0px) * 0.4); letter-spacing: 0.06em; color: var(--dsw-alias-label-secondary, GrayText); }
.sa-item-quote { margin: 3px 0 0; font-size: calc(12.5px + var(--dsh-content-font-delta, 0px) * 0.6); line-height: 1.7; white-space: pre-wrap; word-break: break-word;
  color: var(--dsw-alias-label-secondary, GrayText); display: -webkit-box; -webkit-box-orient: vertical;
  -webkit-line-clamp: 3; overflow: hidden; cursor: pointer; }
.sa-item-quote.sa-q-open { display: block; -webkit-line-clamp: unset; }
.sa-item-a { margin-top: 8px; }
.sa-item-note { margin: 3px 0 0; font-size: calc(14px + var(--dsh-content-font-delta, 0px) * 1); line-height: 1.7; white-space: pre-wrap; word-break: break-word; }
.sa-link { font: inherit; font-size: calc(11px + var(--dsh-content-font-delta, 0px) * 0.4); padding: 2px 4px; cursor: pointer; background: none; border: none;
  color: var(--dsw-alias-label-secondary, GrayText); text-decoration: underline; }
.sa-link:hover { color: var(--dsw-alias-state-error-primary, #e5484d); }
.sa-foot { display: flex; align-items: center; gap: 8px; }
.sa-foot-action { font: inherit; font-size: calc(11.5px + var(--dsh-content-font-delta, 0px) * 0.4); padding: 3px 8px; border-radius: 6px; cursor: pointer;
  border: 1px solid var(--dsw-alias-border-l1, ButtonBorder); background: none;
  color: var(--dsw-alias-label-secondary, GrayText); }
.sa-foot-action:hover { color: var(--dsw-alias-state-error-primary, #e5484d);
  border-color: color-mix(in srgb, var(--dsw-alias-state-error-primary, #e5484d) 35%, transparent); }
.sa-search { flex: 1; box-sizing: border-box; padding: 5px 8px; font: inherit; font-size: calc(12px + var(--dsh-content-font-delta, 0px) * 0.6);
  color: var(--dsw-alias-label-primary, CanvasText); background: var(--dsw-alias-bg-layer-2, ButtonFace);
  border: 1px solid var(--dsw-alias-border-l1, ButtonBorder); border-radius: 6px; }
.sa-result { display: block; width: 100%; text-align: left; font: inherit; font-size: calc(12px + var(--dsh-content-font-delta, 0px) * 0.6); padding: 5px 6px;
  cursor: pointer; background: none; border: none; border-radius: 6px; color: var(--dsw-alias-label-primary, CanvasText); }
.sa-result:hover { background: var(--dsw-alias-bg-layer-2, ButtonFace); }
.sa-hint { font-size: calc(11px + var(--dsh-content-font-delta, 0px) * 0.4); color: var(--dsw-alias-label-secondary, GrayText); }
.sa-pop-images { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; margin-top: 6px; }
.sa-pop-image { position: relative; width: 56px; height: 56px; border-radius: 6px; overflow: hidden;
  border: 1px solid var(--dsw-alias-border-l1, ButtonBorder); background: var(--dsw-alias-bg-layer-2, ButtonFace); }
.sa-pop-thumb { width: 100%; height: 100%; object-fit: cover; display: block; }
.sa-pop-thumb-fallback { display: flex; align-items: center; justify-content: center; width: 100%; height: 100%;
  box-sizing: border-box; padding: 2px; font-size: calc(10px + var(--dsh-content-font-delta, 0px) * 0.4); text-align: center; color: var(--dsw-alias-label-secondary, GrayText); }
.sa-pop-image-remove { position: absolute; top: 0; right: 0; width: 16px; height: 16px; padding: 0; line-height: 1;
  cursor: pointer; border: none; border-radius: 0 0 0 6px; font-size: calc(11px + var(--dsh-content-font-delta, 0px) * 0.4); color: #fff; background: rgb(0 0 0 / 0.55); }
.sa-pop-images-hint { font-size: calc(11px + var(--dsh-content-font-delta, 0px) * 0.4); color: var(--dsw-alias-label-secondary, GrayText); }
.sa-item-images { display: flex; gap: 4px; flex-wrap: wrap; margin-top: 4px; }
.sa-item-thumb { width: 40px; height: 40px; object-fit: cover; border-radius: 4px;
  border: 1px solid var(--dsw-alias-border-l1, ButtonBorder); }
.sa-settings { margin-top: 6px; padding-top: 6px; border-top: 1px solid var(--dsw-alias-border-l1, ButtonBorder); }
.sa-settings-head { display: flex; align-items: center; gap: 8px; }
.sa-setting { display: flex; align-items: center; gap: 6px; margin-top: 4px; font-size: calc(11px + var(--dsh-content-font-delta, 0px) * 0.4);
  color: var(--dsw-alias-label-secondary, GrayText); }
.sa-setting-value { min-width: 34px; font-variant-numeric: tabular-nums; }
.sa-setting-number { width: 68px; }
.sa-setting-textarea { width: 100%; min-height: 96px; box-sizing: border-box; resize: vertical; margin-top: 6px;
  padding: 6px 8px; font: inherit; font-size: calc(12px + var(--dsh-content-font-delta, 0px) * 0.6); line-height: 1.5; color: var(--dsw-alias-label-primary, CanvasText);
  background: var(--dsw-alias-bg-layer-2, ButtonFace); border: 1px solid var(--dsw-alias-border-l1, ButtonBorder); border-radius: 6px; }
.sa-settings-actions { display: flex; align-items: center; gap: 8px; margin-top: 4px; }
.sa-settings-page { display: flex; flex-direction: column; gap: 12px; padding: 4px 2px 8px; max-width: 720px; }
.sa-settings-page-head { display: flex; align-items: center; gap: 8px; }
.sa-settings-card { display: flex; flex-direction: column; gap: 10px; padding: 14px; border-radius: 10px;
  background: var(--dsw-alias-bg-layer-2, ButtonFace); border: 1px solid var(--dsw-alias-border-l1, ButtonBorder); }
.sa-settings-card-head { display: flex; flex-direction: column; gap: 4px; }
.sa-settings-card-title { margin: 0; font-size: calc(13.5px + var(--dsh-content-font-delta, 0px) * 0.8); font-weight: 600;
  color: var(--dsw-alias-label-primary, CanvasText); }
.sa-settings-card .sa-hint { font-size: calc(12px + var(--dsh-content-font-delta, 0px) * 0.6); line-height: 1.6; margin: 0;
  color: var(--dsw-alias-label-secondary, GrayText); }
.sa-settings-card .sa-setting-textarea { margin-top: 0; min-height: 148px; font-size: calc(13px + var(--dsh-content-font-delta, 0px) * 0.8); line-height: 1.6; }
.sa-settings-card .sa-setting-input { width: 100%; box-sizing: border-box; padding: 8px 10px; font: inherit;
  font-size: calc(13px + var(--dsh-content-font-delta, 0px) * 0.8); color: var(--dsw-alias-label-primary, CanvasText);
  background: var(--dsw-alias-bg-layer-1, Canvas); border: 1px solid var(--dsw-alias-border-l2, ButtonBorder); border-radius: 8px; }
.sa-settings-card .sa-setting-input:focus-visible, .sa-settings-card .sa-setting-textarea:focus-visible {
  outline: 2px solid var(--dsw-alias-state-business-primary, var(--dsw-alias-brand-primary, #247bbf)); outline-offset: 1px; }
.sa-settings-card .sa-settings-actions { justify-content: flex-end; margin-top: 0; }
.sa-settings-page .sa-hint { font-size: calc(12px + var(--dsh-content-font-delta, 0px) * 0.6); line-height: 1.6; margin: 0; }
.sa-replies-card { display: flex; flex-direction: column; gap: 8px; padding: 10px 12px; border: 1px solid var(--dsw-alias-border-l1, #3333); border-radius: 10px; background: var(--dsw-alias-bg-layer-1, #0001); }
.sa-replies { display: flex; flex-direction: column; gap: 0; margin: 8px 0 0; width: 100%; max-width: none; box-sizing: border-box; padding: 0;
  border: none; background: transparent; }
/* 两个区域共用同一个收展头：同样的高度、底色、圆角、图标位置与开合动画。*/
.sa-section-head { display: flex; align-items: center; gap: 8px; width: 100%; box-sizing: border-box;
  margin: 0; padding: 7px 10px; font: inherit; text-align: left; cursor: pointer; user-select: none;
  border: 1px solid var(--dsw-alias-border-l1, ButtonBorder); border-radius: 8px;
  background: var(--dsw-alias-bg-layer-2, #ffffff0a); color: var(--dsw-alias-label-primary, CanvasText); }
.sa-section-head:hover { background: var(--dsw-alias-interactive-bg-hover, ButtonFace); }
.sa-section-head:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary, #247bbf); outline-offset: 1px; }
.sa-section-title { font-size: calc(13px + var(--dsh-content-font-delta, 0px) * 0.8); font-weight: 600; line-height: 1.3; }
.sa-section-meta { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  font-size: calc(12px + var(--dsh-content-font-delta, 0px) * 0.6); line-height: 1.3; color: var(--dsw-alias-label-secondary, #8b949e); }
.sa-section-chevron { flex: none; display: block; width: 14px; height: 14px;
  color: var(--dsw-alias-label-secondary, #8b949e); transition: transform 180ms ease; }
.sa-reuse { position: relative; flex: none; display: inline-flex; align-items: center; justify-content: center;
  width: 22px; height: 22px; margin-left: auto; border-radius: 6px; color: var(--sa-dim-tertiary);
  cursor: pointer; }
.sa-reuse:hover, .sa-reuse:focus-visible { background: var(--dsw-alias-interactive-bg-hover, rgba(255, 255, 255, 0.08));
  color: var(--sa-dim-primary); outline: none; }
.sa-reuse::after { content: attr(data-label); position: absolute; right: 0; bottom: calc(100% + 6px);
  padding: 4px 8px; border: 1px solid var(--dsw-alias-border-l2, ButtonBorder); border-radius: 6px;
  background: var(--dsw-alias-bg-layer-2, Canvas); color: var(--dsw-alias-label-primary, CanvasText);
  font-size: calc(11.5px + var(--dsh-content-font-delta, 0px) * 0.4); line-height: 1.3; white-space: nowrap;
  opacity: 0; pointer-events: none; transition: opacity 120ms ease; z-index: 60; }
.sa-reuse:hover::after, .sa-reuse:focus-visible::after { opacity: 1; }
.sa-section-head[aria-expanded="true"] .sa-section-chevron { transform: rotate(90deg); }
.sa-collapse { display: grid; grid-template-rows: 0fr; opacity: 0; margin-top: 6px;
  transition: grid-template-rows 180ms ease, opacity 180ms ease; }
.sa-collapse[data-open="1"] { grid-template-rows: 1fr; opacity: 1; }
.sa-collapse-inner { min-height: 0; overflow: hidden; }
.sa-replies-head { font-size: calc(12px + var(--dsh-content-font-delta, 0px) * 0.6); font-weight: 600; color: var(--dsw-alias-label-primary, CanvasText); }
.sa-replies-body { display: flex; flex-direction: column; gap: 8px; padding-top: 8px; }

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
.sa-reply-index { font-size: calc(11px + var(--dsh-content-font-delta, 0px) * 0.4); font-weight: 600; letter-spacing: 0.06em;
  color: var(--dsw-alias-label-secondary, #8b949e); }
.sa-reply-body { display: flex; flex-direction: column; gap: 8px; padding: 12px; }

/* 批注块：内嵌浅底 + 左竖线，把引用与批注降为「上下文」层 */
.sa-q { display: flex; flex-direction: column; gap: 5px; min-width: 0; padding: 9px 12px;
  border-left: 2px solid var(--dsw-alias-border-l2, ButtonBorder); border-radius: 0 8px 8px 0;
  background: var(--dsw-alias-bg-layer-2, #ffffff08); }
.sa-q-label { font-size: calc(10.5px + var(--dsh-content-font-delta, 0px) * 0.4); font-weight: 600; letter-spacing: 0.08em;
  color: var(--dsw-alias-label-tertiary, #6e7681); }
.sa-q-quote { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 3; overflow: hidden;
  font-size: calc(12.5px + var(--dsh-content-font-delta, 0px) * 0.6); line-height: 1.6; color: var(--dsw-alias-label-secondary, #8b949e);
  white-space: pre-wrap; word-break: break-word; cursor: pointer; }
.sa-q-quote.sa-q-open { display: block; -webkit-line-clamp: unset; }
.sa-q-note { font-size: calc(14px + var(--dsh-content-font-delta, 0px) * 1); font-weight: 500; line-height: 1.65;
  white-space: pre-wrap; word-break: break-word; }

/* 答复块：正文层，字号与对比度最高 */
.sa-a { display: flex; flex-direction: column; gap: 6px; }
.sa-a-head { display: flex; align-items: center; gap: 8px; }
.sa-a-label { font-size: calc(10.5px + var(--dsh-content-font-delta, 0px) * 0.4); font-weight: 600; letter-spacing: 0.08em;
  color: var(--dsw-alias-label-tertiary, #6e7681); }
.sa-a-verdict { font-size: calc(11px + var(--dsh-content-font-delta, 0px) * 0.4); font-weight: 600; padding: 1px 8px; border-radius: 999px;
  border: 1px solid currentColor; background: transparent;
  background: color-mix(in srgb, currentColor 12%, transparent); }
.sa-reply-accepted { color: var(--dsw-alias-state-success-primary, #3fb950); }
.sa-reply-partial { color: var(--dsw-alias-state-warn-primary, #d29922); }
.sa-reply-rejected { color: var(--dsw-alias-state-error-primary, #f85149); }
.sa-reply-needs_info { color: var(--dsw-alias-state-business-primary, #58a6ff); }
.sa-a-reason { font-size: calc(15px + var(--dsh-content-font-delta, 0px) * 1); line-height: 1.75; color: var(--dsw-alias-label-primary, CanvasText);
  white-space: pre-wrap; word-break: break-word; }
/* Markdown 渲染后不要再保留 pre-wrap：源码里的换行会被当成额外空行。 */
.sa-a-reason[data-sa-md="1"] { white-space: normal; }
.sa-a-next-label { display: inline-block; margin-right: 6px; padding: 1px 6px; border-radius: 4px; vertical-align: 1px;
  font-size: calc(10.5px + var(--dsh-content-font-delta, 0px) * 0.4); font-weight: 600; letter-spacing: .02em;
  color: var(--sa-tone, var(--dsw-alias-label-secondary, #8b949e));
  background: color-mix(in srgb, var(--sa-tone, var(--dsw-alias-border-l1, #888)) 16%, transparent); }
.sa-a-next { margin-top: 2px; padding: 6px 10px; border-radius: 6px;
  border-left: 2px solid var(--sa-tone, var(--dsw-alias-border-l1, ButtonBorder));
  background: var(--dsw-alias-bg-layer-2, #ffffff08); font-size: calc(12.5px + var(--dsh-content-font-delta, 0px) * 0.6); line-height: 1.5;
  color: var(--dsw-alias-label-secondary, #8b949e); }
.sa-sent { display: block; margin: 8px 0 0; width: 100%; max-width: none; box-sizing: border-box; }
.sa-sent-body { margin: 0; padding: 6px 8px; box-sizing: border-box; border-radius: 8px;
  border: 1px solid var(--dsw-alias-border-l1, ButtonBorder); background: var(--dsw-alias-bg-layer-1, Canvas); }
.sa-sent-item { display: flex; gap: 6px; padding: 8px 0; font-size: calc(12px + var(--dsh-content-font-delta, 0px) * 0.6); line-height: 1.5;
  border-top: 1px solid var(--dsw-alias-border-secondary, #3333); }
.sa-sent-item:first-child { border-top: none; padding-top: 0; }
.sa-sent-num { flex: none; min-width: 14px; font-weight: 600; color: var(--dsw-alias-brand-primary, #247bbf); }
.sa-sent-text { min-width: 0; }
.sa-sent-quote { padding-left: 8px; border-left: 2px solid var(--dsw-alias-border-l1, ButtonBorder);
  font-size: calc(12.5px + var(--dsh-content-font-delta, 0px) * 0.6); color: var(--dsw-alias-label-secondary, GrayText); white-space: pre-wrap; word-break: break-word; }
.sa-sent-note { margin-top: 4px; font-size: calc(14px + var(--dsh-content-font-delta, 0px) * 1); line-height: 1.6; white-space: pre-wrap; word-break: break-word; }
.sa-sent-thumbs { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 6px; }
/* 三处区域的文字亮度：除「答复」正文（.sa-a-reason）外统一压到 80%。
   用 color-mix 与黑色混合，亮度按比例下降；正文保持原色，作为唯一的第一层。*/
.sa-panel, .sa-sent, .sa-replies {
  --sa-dim-primary: color-mix(in srgb, var(--dsw-alias-label-primary, CanvasText) 80%, #000);
  --sa-dim-secondary: color-mix(in srgb, var(--dsw-alias-label-secondary, GrayText) 80%, #000);
  --sa-dim-tertiary: color-mix(in srgb, var(--dsw-alias-label-tertiary, GrayText) 80%, #000);
  --sa-dim-brand: color-mix(in srgb, var(--dsw-alias-brand-primary, #247bbf) 80%, #000);
}
.sa-panel, .sa-panel-title, .sa-section-head, .sa-replies-head,
.sa-item-action:hover, .sa-drag-handle:hover { color: var(--sa-dim-primary); }
.sa-panel-count, .sa-panel-empty, .sa-item-src, .sa-item-action, .sa-item-label, .sa-item-quote,
.sa-foot-action, .sa-hint, .sa-section-meta, .sa-reply-index, .sa-q-quote, .sa-a-next, .sa-sent-quote { color: var(--sa-dim-secondary); }
.sa-build, .sa-panel-hint, .sa-drag-handle, .sa-q-label, .sa-a-label { color: var(--sa-dim-tertiary); }
.sa-item-num, .sa-sent-num { color: var(--sa-dim-brand); }
.sa-reply-accepted { color: color-mix(in srgb, var(--dsw-alias-state-success-primary, #3fb950) 80%, #000); }
.sa-reply-partial { color: color-mix(in srgb, var(--dsw-alias-state-warn-primary, #d29922) 80%, #000); }
.sa-reply-rejected { color: color-mix(in srgb, var(--dsw-alias-state-error-primary, #f85149) 80%, #000); }
.sa-reply-needs_info { color: color-mix(in srgb, var(--dsw-alias-state-business-primary, #58a6ff) 80%, #000); }
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
  var ADOPT_SETTINGS_KEY = "dsh-selection-annotations:adopt-settings";
  var DEFAULT_ADOPT_TEXT = "【意见采纳】";
  var DEFAULT_INSTRUCTION = [
    "这是用户发来的批注数据块，与用户消息正文相互独立：正文可能同时存在，也可能没有。\n",
    "\n",
    "## 怎么读\n",
    "- `quote`：用户选中的原文。\n",
    "- `source`：位置。工作区文件用 `path` + `lineStart/lineEnd`（1 基行号）+ `charStart/charEnd`；对话消息用 `role` + `anchorKey` + `charStart/charEnd`。\n",
    '- `kind: "reply"`（逐条答复区域）：`batchAt` 是批次时间戳，`index` 是批注编号，`field` 取 `quote` / `note` / `reason` / `next`（跨字段为 `item`）。\n',
    '- `kind: "sent"`（已发送批注区域）：`anchorKey` 是卡片所属消息，`index` 是批注编号，`field` 取 `quote` / `note`（跨字段为 `item`）。\n',
    '- `charStart/charEnd`：半开区间。`textOrigin: "source"` 指文件原文偏移，`"rendered"` 指渲染文本偏移；能读原文时优先 source。\n',
    "- `images`：该条批注的图片，`order` 是它在消息图片附件里的 1 基顺序。\n",
    "\n",
    "## 怎么答\n",
    "- 处理完必须调用 `annotation_replies` 工具，不要在正文里逐条重复。\n",
    "- 每条批注对应 replies 里的一项，`index` 与批注编号一致。\n",
    "- `verdict` 取 `accepted` / `partial` / `rejected` / `needs_info`；`reason` 写理由，`next` 写下一步。\n",
    "- 答复正文按 Markdown 渲染，优先用要点列表；加粗、行内代码、代码块与表格都可用。\n",
    "- 正文只写整体说明或需要澄清的问题。"
  ].join("");
  var DEFAULT_INSTRUCTION_EN = [
    "This is an annotation payload sent by the user. It is independent of the user message body, which may or may not be present.\n",
    "\n",
    "## How to read it\n",
    "- `quote`: the text the user selected.\n",
    "- `source`: the position. Workspace files use `path` + `lineStart/lineEnd` (1-based lines) + `charStart/charEnd`; chat messages use `role` + `anchorKey` + `charStart/charEnd`.\n",
    '- `kind: "reply"` (per-answer area): `batchAt` is the batch timestamp, `index` is the annotation number, `field` is `quote` / `note` / `reason` / `next` (`item` when the selection spans fields).\n',
    '- `kind: "sent"` (sent-annotations area): `anchorKey` is the message the card belongs to, `index` is the annotation number, `field` is `quote` / `note` (`item` across fields).\n',
    '- `charStart/charEnd`: a half-open range. `textOrigin: "source"` means offsets in the original file text, `"rendered"` means offsets in the rendered text; prefer source when the file can be read.\n',
    "- `images`: images attached to that annotation; `order` is the 1-based position among this message's image attachments.\n",
    "\n",
    "## How to answer\n",
    "- When done, you must call the `annotation_replies` tool instead of repeating replies in the body.\n",
    "- Each annotation maps to one entry in replies; `index` matches the annotation number.\n",
    "- `verdict` is `accepted` / `partial` / `rejected` / `needs_info`; `reason` explains it, `next` states the next step.\n",
    "- Reply bodies render as Markdown: prefer bullet lists; bold, inline code, code fences and tables are supported.\n",
    "- Use the body only for an overall summary or clarifying questions."
  ].join("");
  var LOCALE_NS = "selection-annotations";
  var PLUGIN_BUILD = "1.3.0";
  var DRAFT_STORAGE_PREFIX = "dsh-selection-annotations:draft:";
  var DRAFT_MAX_SESSIONS = 24;
  var DRAFT_MAX_ITEMS = 200;
  var SENT_STORAGE_PREFIX = "dsh-selection-annotations:sent:";
  var SENT_MAX_ENTRIES = 120;
  var SENT_MAX_BYTES = 2 * 1024 * 1024;
  var REPLY_POLL_MS = 6e3;
  var SENT_PENDING_TTL_MS = 6e4;

  // src/core/messages.js
  var MESSAGES = {
    zh: {
      annotate: "批注反馈",
      "annotate.adopt": "批注采纳",
      "annotate.copy": "复制",
      "menu.annotate": "为划选部分批注反馈",
      "menu.adopt": "为划选部分批注采纳",
      "menu.copy": "复制",
      "viewer.alt": "批注图片",
      "image.alt": "图片",
      "image.open": "点击查看大图",
      "image.remove": "移除这张图",
      "pop.placeholder": "写点什么（可以留空，只标记原文）",
      "pop.noteLabel": "批注",
      "pop.imagesHint": "可粘贴或拖入图片，随本条批注一起发出",
      "pop.delete": "删除",
      "pop.cancel": "取消",
      "pop.save": "保存",
      "pop.createTitle": "新建批注",
      "pop.editTitle": "修改批注 #{n}",
      "panel.empty": "选中回复、消息或文件预览里的文字，点浮动的「批注反馈」即可。",
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
      "settings.adoptLabel": "「批注采纳」预填文本",
      "settings.adoptHint": "采纳模式下自动写入批注正文的句子；输入前缀会出现补全提示。",
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
      "sent.reuse": "回放所有批注",
      "sent.replayItem": "回放批注",
      "replies.title": "批注答复 ×{n}",
      "replies.replay": "回放批注",
      "replies.waiting": "批注答复：等待参数",
      "markdown.copy": "复制",
      "markdown.copied": "已复制",
      "markdown.footnotes": "脚注",
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
      "next.label": "下一步",
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
      annotate: "Feedback",
      "annotate.adopt": "Adopt",
      "annotate.copy": "Copy",
      "menu.annotate": "Feedback on selection",
      "menu.adopt": "Adopt selection",
      "menu.copy": "Copy",
      "viewer.alt": "Annotated image",
      "image.alt": "Image",
      "image.open": "Click to view full size",
      "image.remove": "Remove this image",
      "pop.placeholder": "Add a note (optional — you can just mark the text)",
      "pop.noteLabel": "Comment",
      "pop.imagesHint": "Paste or drop images to send with this annotation",
      "pop.delete": "Delete",
      "pop.cancel": "Cancel",
      "pop.save": "Save",
      "pop.createTitle": "New annotation",
      "pop.editTitle": "Edit annotation #{n}",
      "panel.empty": "Select text in a reply, message, or file preview, then click the floating “Feedback”.",
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
      "settings.adoptLabel": "Prefilled “Adopt” text",
      "settings.adoptHint": "Written into the note in Adopt mode; typing a prefix shows an inline completion.",
      "settings.default": "Default text",
      "settings.customized": "Customized",
      "settings.restore": "Restore default",
      "settings.instrHint": "Removing the sentence that requires annotation_replies disables per-annotation replies",
      "settings.pageHint": "This text is sent to the model with every annotation. Removing the sentence that requires annotation_replies disables per-annotation replies.",
      "chip.emptyTitle": "No annotations yet: select text in the body or a file, then click the floating “Feedback”",
      "chip.title": "View / manage annotations",
      "chip.label": "Annotate",
      "chip.count": "Annotate ×{n}",
      "sent.title": "Sent annotations ×{n}",
      "sent.reuse": "Replay all annotations",
      "sent.replayItem": "Replay annotation",
      "replies.title": "Annotation replies ×{n}",
      "replies.replay": "Replay annotation",
      "replies.waiting": "Annotation replies: waiting for arguments",
      "markdown.copy": "Copy",
      "markdown.copied": "Copied",
      "markdown.footnotes": "Footnotes",
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
      "next.label": "Next",
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
  function button(className, text, onClick) {
    const created = el("button", className, text);
    created.type = "button";
    created.addEventListener("click", onClick);
    return created;
  }

  // src/core/locale.js
  function formatMessage(template, params) {
    if (typeof template !== "string") return "";
    if (params === void 0 || params === null) return template;
    return template.replace(/\{(\w+)\}/g, (match, name) => name in params ? String(params[name]) : match);
  }
  function createLocale(ctx) {
    let active = "zh";
    const service = ctx.locale;
    const usable = service !== void 0 && service !== null && typeof service.register === "function" && typeof service.bind === "function";
    const fallback = (key, params) => formatMessage(MESSAGES[active]?.[key] ?? MESSAGES.zh[key] ?? key, params);
    let translate = fallback;
    if (usable) {
      active = safe(() => service.getSnapshot?.().active) ?? "zh";
      ctx.effect(() => service.register(LOCALE_NS, MESSAGES), "selection-annotations: dictionaries");
      translate = service.bind(LOCALE_NS);
    }
    return {
      get active() {
        return active;
      },
      t: (key, params) => translate(key, params),
      defaultInstruction: () => active.toLowerCase().startsWith("en") ? DEFAULT_INSTRUCTION_EN : DEFAULT_INSTRUCTION,
      isDefaultInstruction: (text) => text === DEFAULT_INSTRUCTION || text === DEFAULT_INSTRUCTION_EN,
      syncActive() {
        if (usable) active = safe(() => service.getSnapshot?.().active) ?? active;
      },
      /** 语言切换后重绘；返回 effect 的清理函数。 */
      subscribe(onChange) {
        if (!usable || typeof service.subscribe !== "function") return () => {
        };
        return ctx.effect(() => {
          const off = service.subscribe(() => {
            active = safe(() => service.getSnapshot?.().active) ?? active;
            onChange();
          });
          return () => {
            safe(off);
          };
        }, "selection-annotations: locale changes");
      }
    };
  }

  // src/core/annotation-utils.js
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
  function shouldDiscardEmpty(mode, note, images) {
    if (mode === "edit") return false;
    if (typeof note === "string" && note.trim() !== "") return false;
    return !Array.isArray(images) || images.length === 0;
  }

  // src/core/session.js
  function createSessionApi(ctx, getLatestSessionId) {
    function currentSessionId() {
      const latest = getLatestSessionId();
      if (typeof latest === "string" && latest !== "") return latest;
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
      const snapshot = safe(() => shell?.state?.getSnapshot());
      return Array.isArray(snapshot?.attachmentIds) ? snapshot.attachmentIds : void 0;
    }
    return { currentSessionId, inputShell, liveAttachmentIds };
  }

  // src/core/settings.js
  function createSettings(getStorage, locale) {
    let imageSettings;
    let instructionSettings;
    let adoptText;
    function loadImageSettings() {
      const settings = { ...DEFAULT_IMAGE_SETTINGS };
      const storage = getStorage();
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
      const storage = getStorage();
      if (storage === void 0) return;
      safe(() => storage.setItem(IMAGE_SETTINGS_KEY, JSON.stringify(imageSettingsOf())));
    }
    function loadInstructionSettings() {
      const storage = getStorage();
      if (storage === void 0) return DEFAULT_INSTRUCTION;
      const parsed = safe(() => JSON.parse(storage.getItem(INSTRUCTION_SETTINGS_KEY) ?? "null"));
      if (parsed === null || typeof parsed !== "object") return DEFAULT_INSTRUCTION;
      const text = typeof parsed.text === "string" ? parsed.text : "";
      return text.trim() === "" ? DEFAULT_INSTRUCTION : text;
    }
    function instructionOf() {
      if (instructionSettings === void 0) instructionSettings = loadInstructionSettings();
      return locale.isDefaultInstruction(instructionSettings) ? locale.defaultInstruction() : instructionSettings;
    }
    function persistInstructionSettings(text) {
      instructionSettings = text;
      const storage = getStorage();
      if (storage === void 0) return;
      safe(() => storage.setItem(INSTRUCTION_SETTINGS_KEY, JSON.stringify({ text })));
    }
    function loadAdoptText() {
      const storage = getStorage();
      if (storage === void 0) return DEFAULT_ADOPT_TEXT;
      const parsed = safe(() => JSON.parse(storage.getItem(ADOPT_SETTINGS_KEY) ?? "null"));
      if (parsed === null || typeof parsed !== "object") return DEFAULT_ADOPT_TEXT;
      const text = typeof parsed.text === "string" ? parsed.text.trim() : "";
      if (text === "意见采纳。" || text === "意见采纳") return DEFAULT_ADOPT_TEXT;
      return text === "" ? DEFAULT_ADOPT_TEXT : text;
    }
    function adoptTextOf() {
      if (adoptText === void 0) adoptText = loadAdoptText();
      return adoptText;
    }
    function persistAdoptText(text) {
      adoptText = typeof text === "string" && text.trim() !== "" ? text : DEFAULT_ADOPT_TEXT;
      const storage = getStorage();
      if (storage === void 0) return;
      safe(() => storage.setItem(ADOPT_SETTINGS_KEY, JSON.stringify({ text: adoptText })));
    }
    return {
      loadImageSettings,
      imageSettingsOf,
      persistImageSettings,
      loadInstructionSettings,
      instructionOf,
      persistInstructionSettings,
      loadAdoptText,
      adoptTextOf,
      persistAdoptText
    };
  }

  // src/core/payload.js
  function createPayload({ t, instructionOf }) {
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
    function buildPayload(items) {
      let imageOrder = 0;
      const annotations = items.map((item) => {
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
          count: annotations.length,
          annotations
        },
        null,
        2
      );
    }
    return { describeSource, payloadSource, buildPayload };
  }

  // src/core/source-locate.js
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
  function lineRangeWithin(root, startEl, endEl) {
    const marked = lineNumberOf(startEl) ?? lineNumberOf(endEl);
    if (marked !== void 0) return { start: marked, end: lineNumberOf(endEl) ?? marked };
    const start = codeLineNumberOf(root, startEl);
    if (start === void 0) return { start: void 0, end: void 0 };
    return { start, end: codeLineNumberOf(root, endEl) ?? start };
  }

  // src/core/source-capture.js
  var elementOf = (node) => {
    if (node === null || node === void 0) return null;
    if (node.nodeType === 1) return node;
    return node.parentElement ?? null;
  };
  var REPLY_FIELD_BY_CLASS = {
    "sa-q-quote": "quote",
    "sa-q-note": "note",
    "sa-a-reason": "reason",
    "sa-a-next": "next"
  };
  var REPLY_CLASS_BY_FIELD = { quote: "sa-q-quote", note: "sa-q-note", reason: "sa-a-reason", next: "sa-a-next" };
  function createSourceCapture() {
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
          for (const name of Object.keys(REPLY_FIELD_BY_CLASS)) {
            if (element.closest(`.${name}`) !== null) return REPLY_FIELD_BY_CLASS[name];
          }
          return null;
        };
        const startField = fieldOf(startEl);
        const endField = fieldOf(endEl);
        const field = startField !== null && (endField === null || startField === endField) ? startField : "item";
        let fieldElement = replyItem;
        if (field !== "item") {
          fieldElement = startEl.closest(`[data-sa-field="${cssEscape(field)}"]`) ?? startEl.closest(`.${REPLY_CLASS_BY_FIELD[field]}`) ?? replyItem;
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
    return { captureSource, anchorRoot, rangeFromOffsets, matchInRoot, rangeMatchesQuote };
  }

  // src/core/source-resolve.js
  function createSourceResolver({ ctx, getSessionId, log: log2, timeoutMs }) {
    function unwrapRemote(value) {
      if (value !== null && typeof value === "object" && "ok" in value && "value" in value) {
        return value.ok === true ? value.value : void 0;
      }
      return value;
    }
    async function resolve(source, quote, onSkip) {
      try {
        return await resolveInner(source, quote, onSkip);
      } catch (error) {
        log2(`[selection-annotations] 位置精修抛错：${error instanceof Error ? error.message : String(error)}`);
        return void 0;
      }
    }
    async function resolveInner(source, quote, onSkip) {
      const skip = (reason) => {
        log2(`[selection-annotations] 位置精修跳过（${String(source?.path)}）：${reason}`);
        if (typeof onSkip === "function") onSkip(reason);
        return void 0;
      };
      if (source?.kind !== "file") return void 0;
      if (typeof source.path !== "string" || source.path === "") return void 0;
      const sessionId = getSessionId();
      if (sessionId === void 0) return skip("拿不到当前会话 id");
      const candidates = [];
      const agent = safe(() => ctx.sessions?.scope?.(sessionId));
      if (agent?.remote !== void 0) candidates.push({ label: "sessions.scope().remote", remote: agent.remote });
      const direct = safe(() => ctx.remote) ?? safe(() => ctx.get("remote"));
      if (direct !== void 0) candidates.push({ label: "ctx.remote", remote: direct });
      let usable;
      for (const entry of candidates) {
        const probe = safe(() => typeof entry.remote?.workspaceFiles?.read === "function");
        if (probe === void 0) continue;
        if (probe === true) {
          usable = entry;
          break;
        }
      }
      if (usable === void 0) {
        return skip(`拿不到 remote.workspaceFiles.read（试过 ${candidates.map((e) => e.label).join(" / ") || "无任何 remote"}）`);
      }
      log2(`[selection-annotations] 位置精修：经 ${usable.label} 读 ${source.path}`);
      const outcome = await withTimeout(
        safe(() => usable.remote.workspaceFiles.read(sessionId, source.path, {})),
        timeoutMs
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
    return { resolve };
  }

  // src/core/cards.js
  var VERDICT_LABELS2 = {
    accepted: ["verdict.accepted", "accepted"],
    partial: ["verdict.partial", "partial"],
    rejected: ["verdict.rejected", "rejected"],
    needs_info: ["verdict.needs_info", "needs_info"]
  };
  function createCards({ t, openImageViewer, markdown, isAdopt = () => false }) {
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
    function buildSectionHead(label, meta, action) {
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
      if (action !== void 0 && action !== null) head.appendChild(action);
      return head;
    }
    function reuseButton(label, onClick) {
      const button2 = document.createElement("span");
      button2.className = "sa-reuse";
      button2.setAttribute("role", "button");
      button2.setAttribute("tabindex", "0");
      button2.setAttribute("aria-label", label);
      button2.dataset.label = label;
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("viewBox", "0 0 16 16");
      svg.setAttribute("width", "13");
      svg.setAttribute("height", "13");
      svg.setAttribute("fill", "none");
      svg.setAttribute("aria-hidden", "true");
      for (const d of ["M3.2 3.2H12.8V12.8H3.2V3.2Z", "M8 5.6V10.4M5.6 8H10.4"]) {
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("d", d);
        path.setAttribute("stroke", "currentColor");
        path.setAttribute("stroke-width", "1.2");
        svg.appendChild(path);
      }
      button2.appendChild(svg);
      const run = (event) => {
        event.preventDefault();
        event.stopPropagation();
        onClick();
      };
      button2.addEventListener("click", run);
      button2.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") run(event);
      });
      return button2;
    }
    function collapsible(body, open) {
      const wrap = document.createElement("div");
      wrap.className = "sa-collapse";
      wrap.style.marginTop = "0px";
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
    function buildSentCard(record, anchorKey, options = {}) {
      const card = document.createElement("div");
      card.className = "sa-sent";
      card.setAttribute("data-sa-ui", "sent");
      if (typeof anchorKey === "string" && anchorKey !== "") card.setAttribute("data-anchor", anchorKey);
      const action = typeof options.onReuse === "function" ? reuseButton(t("sent.reuse"), options.onReuse) : void 0;
      const head = buildSectionHead(t("sent.title", { n: record.items.length }), void 0, action);
      head.style.marginBottom = "0";
      card.style.display = "flex";
      card.style.flexDirection = "column";
      card.style.rowGap = "8px";
      const body = document.createElement("div");
      body.className = "sa-sent-body";
      body.style.padding = "8px";
      const wrap = collapsible(body, true);
      applyCollapsed(head, wrap, true);
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
          if (isAdopt(item.note)) note.dataset.adopt = "1";
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
              openImageViewer(typeof thumb.preview === "string" && thumb.preview !== "" ? thumb.preview : thumb.dataUrl, thumb.name);
            });
            gallery.appendChild(img);
          }
          if (gallery.childNodes.length > 0) text.appendChild(gallery);
        }
        line.append(num, text);
        if (typeof options.onReplayItem === "function") {
          line.appendChild(reuseButton(t("sent.replayItem"), () => options.onReplayItem(item)));
        }
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
    function buildReplySection(batches, items = [], options = {}) {
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
      card.style.display = "flex";
      card.style.flexDirection = "column";
      card.style.rowGap = "8px";
      card.appendChild(head);
      const body = document.createElement("div");
      body.className = "sa-replies-body";
      body.style.paddingTop = "0px";
      body.style.rowGap = "8px";
      for (const reply of replies) {
        const item = byIndex.get(reply.index);
        const [labelKey, tone] = VERDICT_LABELS2[reply.verdict] ?? ["verdict.fallback", "accepted"];
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
        if (item !== void 0 && typeof options.onReplayItem === "function") {
          cardHead.appendChild(reuseButton(t("replies.replay"), () => options.onReplayItem(item)));
        }
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
            if (isAdopt(item.note)) quote.dataset.adopt = "1";
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
            if (isAdopt(item.note)) note.dataset.adopt = "1";
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
        if (markdown !== void 0 && typeof markdown.mount === "function") {
          markdown.mount(reason, typeof reply.reason === "string" ? reply.reason : "");
        } else {
          reason.textContent = typeof reply.reason === "string" ? reply.reason : "";
        }
        a.appendChild(reason);
        if (typeof reply.next === "string" && reply.next.trim() !== "") {
          const next = document.createElement("div");
          next.className = "sa-a-next";
          next.setAttribute("data-sa-field", "next");
          const label = document.createElement("span");
          label.className = "sa-a-next-label";
          label.textContent = t("next.label");
          const body2 = document.createElement("span");
          body2.className = "sa-a-next-text";
          body2.textContent = reply.next;
          next.append(label, body2);
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
    return { sectionChevron, buildSectionHead, collapsible, applyCollapsed, buildSentCard, buildReplySection };
  }

  // src/core/markdown.js
  function createMarkdown({ h, MarkdownText, createRoot, labels }) {
    const usable = MarkdownText !== void 0 && MarkdownText !== null && (typeof MarkdownText === "function" || typeof MarkdownText === "object") && typeof createRoot === "function";
    const active = /* @__PURE__ */ new Map();
    let labelsKey = "";
    let labelsValue = {};
    function unmount(container) {
      const root = active.get(container);
      if (root === void 0) return;
      active.delete(container);
      try {
        root.unmount();
      } catch {
      }
    }
    function prune() {
      for (const [container] of active) {
        if (container.isConnected === false) unmount(container);
      }
    }
    let pruneTimer = 0;
    function schedulePrune() {
      if (pruneTimer !== 0) return;
      pruneTimer = window.setTimeout(() => {
        pruneTimer = 0;
        prune();
      }, 0);
    }
    function mount(container, text) {
      if (typeof text !== "string") return;
      schedulePrune();
      if (!usable) {
        container.textContent = text;
        return;
      }
      unmount(container);
      const root = createRoot(container);
      active.set(container, root);
      container.setAttribute("data-sa-md", "1");
      const fresh = typeof labels === "function" ? labels() : {};
      const key = JSON.stringify(fresh);
      if (key !== labelsKey) {
        labelsKey = key;
        labelsValue = fresh;
      }
      root.render(h(MarkdownText, { text, variant: "body", labels: labelsValue }));
    }
    function dispose() {
      if (pruneTimer !== 0) {
        window.clearTimeout(pruneTimer);
        pruneTimer = 0;
      }
      for (const [container] of active) unmount(container);
      active.clear();
    }
    return { mount, prune, dispose, usable };
  }

  // src/core/panel-render.js
  function createPanelRenderer({
    t,
    getAnnotations,
    clearAnnotations,
    moveAnnotation,
    openEditPopover,
    removeAnnotation,
    sourceSummary,
    openImageViewer,
    imageSettingsRow,
    instructionSettingsRow,
    isAdopt = () => false
  }) {
    function render(panelEl) {
      const annotations = getAnnotations();
      panelEl.textContent = "";
      const panelHead = el("div", "sa-panel-head");
      panelHead.appendChild(el("span", "sa-panel-title", t("panel.title")));
      const meta = el("div", "sa-panel-meta");
      const hint = el("span", "sa-panel-hint", t("panel.foot"));
      hint.title = t("panel.foot");
      meta.appendChild(hint);
      meta.appendChild(el("span", "sa-panel-count", t("panel.count", { n: annotations.length })));
      if (annotations.length > 0) {
        meta.appendChild(button("sa-foot-action", t("panel.clear"), () => clearAnnotations()));
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
        actions.appendChild(button("sa-item-action", t("panel.edit"), () => openEditPopover(item.id, head)));
        actions.appendChild(button("sa-item-action sa-danger", t("panel.delete"), () => removeAnnotation(item.id)));
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
          const noteEl = el("div", "sa-item-note", item.note);
          if (isAdopt(item.note)) noteEl.dataset.adopt = "1";
          a.appendChild(noteEl);
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
      const panelFoot = el("div", "sa-panel-foot");
      const build = el("span", "sa-build", `@u2a5f/dsh-selection-annotations build.${PLUGIN_BUILD}`);
      build.title = `@u2a5f/dsh-selection-annotations build.${PLUGIN_BUILD}`;
      panelFoot.appendChild(build);
      panelEl.appendChild(panelFoot);
    }
    return { render };
  }

  // src/core/sent-store.js
  function createSentStore({ getStorage, tableFor, prefix, maxEntries, maxBytes, maxItems, onChanged }) {
    const isSentItem2 = (value) => {
      if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
      return typeof value.quote === "string" || typeof value.note === "string";
    };
    function loadSent(sessionId) {
      const memory = tableFor.get(sessionId);
      if (memory !== void 0) return memory;
      const table = /* @__PURE__ */ new Map();
      const storage = getStorage();
      if (storage !== void 0) {
        const parsed = safe(() => JSON.parse(storage.getItem(`${prefix}${sessionId}`) ?? "null"));
        if (parsed !== null && typeof parsed === "object" && parsed.entries !== null && typeof parsed.entries === "object") {
          for (const [key, value] of Object.entries(parsed.entries)) {
            if (typeof key !== "string" || key === "") continue;
            if (value === null || typeof value !== "object" || !Array.isArray(value.items)) continue;
            const items = value.items.filter(isSentItem2).slice(0, maxItems);
            if (items.length === 0) continue;
            const turn = Number.isFinite(value.turn) ? Number(value.turn) : void 0;
            table.set(key, { savedAt: Number(value.savedAt) || 0, items, ...turn !== void 0 ? { turn } : {} });
          }
        }
      }
      tableFor.set(sessionId, table);
      return table;
    }
    function saveSent(sessionId, table) {
      const storage = getStorage();
      const ordered = [...table.entries()].sort((a, b) => a[1].savedAt - b[1].savedAt);
      const kept = ordered.slice(Math.max(0, ordered.length - maxEntries));
      tableFor.set(sessionId, new Map(kept));
      onChanged(sessionId);
      if (storage === void 0) return;
      let stored = kept;
      if (JSON.stringify(Object.fromEntries(kept)).length > maxBytes) {
        stored = kept.map(([key, value]) => [
          key,
          {
            ...value,
            items: value.items.map((item) => ({
              ...item,
              thumbs: (item.thumbs ?? []).map((thumb) => ({ name: thumb.name, dataUrl: thumb.dataUrl }))
            }))
          }
        ]);
        if (JSON.stringify(Object.fromEntries(stored)).length > maxBytes) {
          stored = stored.slice(Math.max(0, stored.length - 40));
        }
      }
      const entries = {};
      for (const [key, value] of stored) entries[key] = value;
      try {
        storage.setItem(`${prefix}${sessionId}`, JSON.stringify({ version: 1, entries }));
      } catch {
      }
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
    return { loadSent, saveSent, recordSent };
  }

  // src/core/remote-sync.js
  function createRemoteSync(getSnapshot) {
    let state;
    const queue = /* @__PURE__ */ new Set();
    let timer = null;
    const storeUrl = (sessionId) => `/selection-annotations/session/${encodeURIComponent(sessionId)}`;
    async function pull(sessionId) {
      if (typeof fetch !== "function") {
        state = false;
        return void 0;
      }
      try {
        const response = await fetch(storeUrl(sessionId), { method: "GET", headers: { accept: "application/json" } });
        if (response.status === 204) {
          state = true;
          return null;
        }
        if (!response.ok) {
          state = false;
          return void 0;
        }
        const data = await response.json();
        state = true;
        return data !== null && typeof data === "object" && !Array.isArray(data) ? data : null;
      } catch {
        state = false;
        return void 0;
      }
    }
    async function push(sessionId) {
      if (typeof fetch !== "function") return;
      try {
        const response = await fetch(storeUrl(sessionId), {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(getSnapshot(sessionId))
        });
        state = response.ok;
      } catch {
        state = false;
      }
    }
    function schedule(sessionId) {
      if (typeof sessionId !== "string" || sessionId === "") return;
      queue.add(sessionId);
      if (timer !== null) return;
      timer = window.setTimeout(() => {
        timer = null;
        const ids = [...queue];
        queue.clear();
        for (const id of ids) void push(id);
      }, 600);
    }
    return { pull, push, schedule, storeUrl };
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

  // src/core/draft-codec.js
  function createDraftCodec({ t, prefix, maxBytes }) {
    const draftKey = (sessionId) => `${prefix}${sessionId}`;
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
      if (text.length <= maxBytes) return items;
      const next = items.map((item) => ({ ...item, images: Array.isArray(item.images) ? item.images.slice() : [] }));
      for (let i = 0; i < next.length && text.length > maxBytes; i += 1) {
        if (next[i].images.length === 0) continue;
        next[i] = { ...next[i], images: [] };
        text = JSON.stringify({ version: 1, items: next });
      }
      if (text.length > maxBytes) log("[selection-annotations] 草稿超出本地存储预算，图片已丢弃、文字保留");
      return next;
    }
    return { prefix, draftKey, draftItems, isDraftItem, restoreDraftItem, fitDraftSize };
  }

  // src/core/draft-store.js
  function createDraftStore({ getStorage, codec, getAnnotations, drafts, onSaved, maxSessions, maxItems }) {
    const draftStorage = () => getStorage();
    function prune(storage) {
      const keys = [];
      for (let i = 0; i < storage.length; i += 1) {
        const key = safeStorageKey(storage, i);
        if (typeof key === "string" && key.startsWith(codec.prefix)) keys.push(key);
      }
      if (keys.length <= maxSessions) return;
      const dated = keys.map((key) => ({
        key,
        savedAt: Number(JSON.parse(storage.getItem(key) ?? "{}")?.savedAt) || 0
      }));
      dated.sort((a, b) => a.savedAt - b.savedAt);
      for (const entry of dated.slice(0, dated.length - maxSessions)) {
        try {
          storage.removeItem(entry.key);
        } catch {
        }
      }
    }
    function saveDraft(sessionId) {
      if (typeof sessionId !== "string" || sessionId === "") return;
      const full = codec.draftItems(getAnnotations());
      const items = codec.fitDraftSize(full);
      if (full.length === 0) drafts.delete(sessionId);
      else drafts.set(sessionId, full);
      onSaved(sessionId);
      const storage = draftStorage();
      if (storage === void 0) return;
      try {
        if (items.length === 0) {
          storage.removeItem(codec.draftKey(sessionId));
          return;
        }
        storage.setItem(codec.draftKey(sessionId), JSON.stringify({ version: 1, savedAt: Date.now(), items }));
        prune(storage);
      } catch {
      }
    }
    function loadDraft(sessionId) {
      const memory = drafts.get(sessionId);
      if (memory !== void 0) return memory.map(codec.restoreDraftItem);
      const storage = draftStorage();
      if (storage === void 0) return [];
      const items = safeParse(storage, codec, sessionId, maxItems);
      if (items === void 0 || items.length === 0) return [];
      drafts.set(sessionId, codec.draftItems(items));
      return items;
    }
    return { draftStorage, saveDraft, loadDraft };
  }
  function safeStorageKey(storage, index) {
    try {
      return storage.key(index);
    } catch {
      return void 0;
    }
  }
  function safeParse(storage, codec, sessionId, maxItems) {
    try {
      const raw = storage.getItem(codec.draftKey(sessionId));
      if (raw === null) return [];
      const parsed = JSON.parse(raw);
      if (parsed === null || typeof parsed !== "object" || !Array.isArray(parsed.items)) return [];
      return parsed.items.filter(codec.isDraftItem).slice(0, maxItems).map(codec.restoreDraftItem);
    } catch {
      return void 0;
    }
  }

  // src/core/turn-anchor.js
  var TURN_ANCHOR_SLOT = "conversation.chat.turnTail";
  function registerTurnAnchor(ctx, h) {
    const slots = ctx.slots;
    if (slots === void 0 || slots === null) return;
    if (typeof slots.inject !== "function" || typeof slots.register !== "function") return;
    const TurnAnchor = (props) => {
      const turn = Number(props?.turn);
      if (!Number.isFinite(turn) || turn <= 0) return null;
      const sessionId = typeof props?.sessionId === "string" ? props.sessionId : "";
      return h("div", {
        className: "sa-turn-anchor",
        "data-sa-turn": String(turn),
        "data-sa-session": sessionId
      });
    };
    TurnAnchor.displayName = "SelectionAnnotationsTurnAnchor";
    const register = () => slots.register(
      {
        name: TURN_ANCHOR_SLOT,
        id: "selection-annotations-turn-anchor",
        order: 20
      },
      TurnAnchor
    );
    ctx.effect(() => slots.inject(TURN_ANCHOR_SLOT, register), "selection-annotations: turn anchors");
  }
  function findTurnAnchor(turn, sessionId) {
    if (!Number.isFinite(turn) || turn <= 0) return null;
    const escaped = typeof sessionId === "string" && sessionId !== "" ? sessionId.replace(/["\\]/g, "\\$&") : "";
    const selector = escaped === "" ? `[data-sa-turn="${turn}"]` : `[data-sa-turn="${turn}"][data-sa-session="${escaped}"]`;
    return document.querySelector(selector);
  }

  // src/plugin.js
  function createPlugin(React, extras = {}) {
    const h = React.createElement;
    return {
      name: "@u2a5f/dsh-selection-annotations",
      inject: ["slots", "sessions", "conversation", "remote", "remote.workspaceFiles", "locale"],
      apply(ctx) {
        const locale = createLocale(ctx);
        const t = (key, params) => locale.t(key, params);
        const defaultInstruction = () => locale.defaultInstruction();
        const isDefaultInstruction = (text) => locale.isDefaultInstruction(text);
        registerTurnAnchor(ctx, h);
        let annotations = [];
        let draftIds = [];
        let syncing = false;
        let syncTimer = null;
        let repaintTimer = null;
        let settleTimer = null;
        let pendingSelection = null;
        let lastPointerUp = null;
        let pointerSelecting = false;
        let lastPointerMove = null;
        let selectionPointer = null;
        let latestInputActions = void 0;
        let latestSessionId = void 0;
        let annotationsSession = void 0;
        const draftSessions = /* @__PURE__ */ new Map();
        const sentBySession = /* @__PURE__ */ new Map();
        let pendingSent = [];
        let consumedSnapshot = null;
        let attachedSessionId = void 0;
        let lastAnnotatedKeys = /* @__PURE__ */ new Set();
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
        function elementOf2(node) {
          if (node === null || node === void 0) return null;
          if (node.nodeType === 1) return node;
          return node.parentElement ?? null;
        }
        const sessionApi = createSessionApi(ctx, () => latestSessionId);
        const currentSessionId = () => sessionApi.currentSessionId();
        const inputShell = () => sessionApi.inputShell();
        const liveAttachmentIds = (shell) => sessionApi.liveAttachmentIds(shell);
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
                thumbs.push({
                  name: typeof image.name === "string" ? image.name : t("image.alt"),
                  dataUrl: image.thumb,
                  preview: typeof image.preview === "string" && image.preview !== "" ? image.preview : image.dataUrl
                });
              }
              return thumbs.length > 0 ? { ...annotation, thumbs } : annotation;
            });
            pendingSent.push({
              items,
              known: lastAnnotatedKeys,
              at: Date.now(),
              // 发送这一刻的会话就是消息真正去的那一个：记账沿用它，
              // 避免稍后重算时切到别的会话，把记录写进别人的台账。
              sessionId: attachedSessionId ?? currentSessionId(),
              // 把「这一屏会话」的范围也记下来：别的会话还挂在页面里时，只在这块范围内找新消息。
              scope: chatScopeOfInput(),
              turnHint: turnHintForScope(chatScopeOfInput())
            });
            lastAnnotatedKeys = /* @__PURE__ */ new Set();
          }
          consumedSnapshot = { items: annotations.slice(), at: Date.now() };
          annotations = [];
          emit();
          scheduleRepaint();
          saveDraft(annotationsSession);
          log(`[selection-annotations] 批注已随消息发出（${reason}）`);
          safe(() => scanSentMessages());
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
        const settings = createSettings(() => draftStorage(), locale);
        const loadImageSettings = () => settings.loadImageSettings();
        const imageSettingsOf = () => settings.imageSettingsOf();
        const persistImageSettings = () => settings.persistImageSettings();
        const loadInstructionSettings = () => settings.loadInstructionSettings();
        const instructionOf = () => settings.instructionOf();
        const persistInstructionSettings = (text) => settings.persistInstructionSettings(text);
        const adoptTextOf = () => settings.adoptTextOf();
        const persistAdoptText = (text) => settings.persistAdoptText(text);
        const hasAdoptNote = (note) => typeof note === "string" && note.includes(adoptTextOf());
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
        const remoteSync = createRemoteSync(sessionSnapshot);
        const storeUrl = (sessionId) => remoteSync.storeUrl(sessionId);
        const pullRemoteSession = (sessionId) => remoteSync.pull(sessionId);
        function sessionSnapshot(sessionId) {
          const drafts = annotationsSession === sessionId ? draftItems(annotations) : draftSessions.get(sessionId) ?? [];
          const sent = {};
          for (const [key, value] of sentBySession.get(sessionId) ?? []) sent[key] = value;
          return { schemaVersion: 1, sessionId, updatedAt: (/* @__PURE__ */ new Date()).toISOString(), drafts, sent };
        }
        const pushRemoteSession = (sessionId) => remoteSync.push(sessionId);
        const scheduleRemotePush = (sessionId) => remoteSync.schedule(sessionId);
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
        const draftCodec = createDraftCodec({ t, prefix: DRAFT_STORAGE_PREFIX, maxBytes: DRAFT_MAX_BYTES });
        const draftKey = (sessionId) => draftCodec.draftKey(sessionId);
        const draftItems = (items) => draftCodec.draftItems(items);
        const isDraftItem = (value) => draftCodec.isDraftItem(value);
        const restoreDraftItem = (item) => draftCodec.restoreDraftItem(item);
        const fitDraftSize = (items) => draftCodec.fitDraftSize(items);
        const draftStore = createDraftStore({
          getStorage: () => safe(() => {
            const storage = window.localStorage;
            return storage !== null && storage !== void 0 && typeof storage.getItem === "function" ? storage : void 0;
          }),
          codec: draftCodec,
          getAnnotations: () => annotations,
          drafts: draftSessions,
          onSaved: (sessionId) => scheduleRemotePush(sessionId),
          maxSessions: DRAFT_MAX_SESSIONS,
          maxItems: DRAFT_MAX_ITEMS
        });
        const draftStorage = () => draftStore.draftStorage();
        const saveDraft = (sessionId) => draftStore.saveDraft(sessionId);
        const loadDraft = (sessionId) => draftStore.loadDraft(sessionId);
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
        const sourceResolver = createSourceResolver({
          ctx,
          getSessionId: () => currentSessionId(),
          log,
          timeoutMs: SOURCE_LOOKUP_TIMEOUT_MS
        });
        const resolveSourcePosition = (source, quote, onSkip) => sourceResolver.resolve(source, quote, onSkip);
        const sourceCapture = createSourceCapture();
        const captureSource = (range) => sourceCapture.captureSource(range);
        const anchorRoot = (source) => sourceCapture.anchorRoot(source);
        const rangeFromOffsets = (root, start, length) => sourceCapture.rangeFromOffsets(root, start, length);
        const matchInRoot = (root, quote, savedOffset) => sourceCapture.matchInRoot(root, quote, savedOffset);
        const rangeMatchesQuote = (range, quote) => sourceCapture.rangeMatchesQuote(range, quote);
        function locateRange(item) {
          if (item.liveRange !== void 0) {
            const live = item.liveRange;
            const usable = safe(() => live.startContainer.isConnected === true && live.endContainer.isConnected === true) === true;
            if (usable && rangeMatchesQuote(live, item.quote)) return live;
            item.liveRange = void 0;
          }
          const root = anchorRoot(item.source);
          if (root === null || root === void 0) return void 0;
          const savedOffset = item.source.textOrigin === "source" ? Number.isFinite(item.source.renderedCharStart) ? item.source.renderedCharStart : void 0 : item.source.charStart;
          const range = matchInRoot(root, item.quote, savedOffset);
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
        const sentStore = createSentStore({
          getStorage: () => draftStorage(),
          tableFor: sentBySession,
          prefix: SENT_STORAGE_PREFIX,
          maxEntries: SENT_MAX_ENTRIES,
          maxBytes: SENT_MAX_BYTES,
          maxItems: DRAFT_MAX_ITEMS,
          onChanged: (sessionId) => scheduleRemotePush(sessionId)
        });
        const loadSent = (sessionId) => sentStore.loadSent(sessionId);
        const saveSent = (sessionId, table) => sentStore.saveSent(sessionId, table);
        const recordSent = (sessionId, anchorKey, items, turn) => {
          sentStore.recordSent(sessionId, anchorKey, items, turn);
          consumedSnapshot = null;
        };
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
        function chatScopeOfInput() {
          const inputs = [...document.querySelectorAll('textarea, [contenteditable="true"]')].filter((input) => {
            const rect = safe(() => input.getBoundingClientRect());
            return rect !== void 0 && rect.width > 0 && rect.height > 0;
          });
          for (const input of inputs.reverse()) {
            let node = input.parentElement;
            for (let i = 0; i < 12 && node !== null && node !== void 0; i += 1) {
              if (typeof node.querySelector === "function" && node.querySelector("[data-chat-turn]") !== null) return node;
              node = node.parentElement;
            }
          }
          return null;
        }
        function turnHintForScope(scope) {
          const root = scope ?? document;
          let max = 0;
          for (const item of root.querySelectorAll("[data-chat-turn]")) {
            const turn = Number(item.getAttribute("data-chat-turn"));
            if (Number.isFinite(turn) && turn > max) max = turn;
          }
          if (max === 0) return null;
          const settled = root.querySelector(`[data-turn-process="${max}"]`) !== null;
          return settled ? max + 1 : max;
        }
        function restoreConsumedSnapshot() {
          if (consumedSnapshot === null) return;
          const known = new Set(annotations.map((item) => item.id));
          const restored = consumedSnapshot.items.filter((item) => !known.has(item.id));
          consumedSnapshot = null;
          if (restored.length === 0) return;
          annotations = [...restored, ...annotations];
          emit();
          scheduleRepaint();
          saveDraft(annotationsSession);
          warn("[selection-annotations] 这批批注没能记进已发送台账，已放回界面。");
        }
        function scanSentMessages() {
          if (pendingSent.length === 0) return;
          const now = Date.now();
          const before = pendingSent.length;
          pendingSent = pendingSent.filter((entry) => now - entry.at < SENT_PENDING_TTL_MS);
          if (pendingSent.length < before && pendingSent.length === 0) restoreConsumedSnapshot();
          if (pendingSent.length === 0) return;
          const rows = collectAnchorRows();
          if (rows.length === 0) return;
          const pending = pendingSent[0];
          const sessionId = typeof pending.sessionId === "string" && pending.sessionId !== "" ? pending.sessionId : currentSessionId();
          if (sessionId === void 0) return;
          const fresh = rows.filter((entry) => {
            if (pending.known.has(entry.anchorKey)) return false;
            if (loadSent(sessionId).has(entry.anchorKey)) return false;
            const kind = entry.row.getAttribute("data-chat-flow-kind") ?? "";
            if (kind === "turn-process") return false;
            if (pending.scope !== null && pending.scope !== void 0 && pending.scope.isConnected && !pending.scope.contains(entry.row)) return false;
            if (typeof entry.row.getClientRects === "function" && entry.row.getClientRects().length === 0) return false;
            return true;
          });
          const attached = fresh.filter((entry) => /批注\.json/.test(entry.row.textContent ?? ""));
          const bubbles = fresh.filter((entry) => {
            const kind = entry.row.getAttribute("data-chat-flow-kind") ?? "";
            return kind === "user" || kind === "steering";
          });
          const loose = fresh.filter((entry) => {
            const kind = entry.row.getAttribute("data-chat-flow-kind") ?? "";
            return kind === "" || kind.startsWith("group:");
          });
          const pool = attached.length > 0 ? attached : bubbles.length > 0 ? bubbles : loose;
          const wait = Date.now() - pending.at;
          const fallback = pool.length === 0 && wait > 1200 ? fresh.slice(-1) : [];
          const usable = pool.length > 0 ? pool : fallback;
          let target = usable[0];
          let bestTurn = -1;
          for (const entry of usable) {
            const turn2 = turnOfRow(entry.row);
            const score = Number.isFinite(turn2) ? turn2 : 0;
            if (score >= bestTurn) {
              bestTurn = score;
              target = entry;
            }
          }
          if (target === void 0) {
            const hint = pending.turnHint;
            if (Number.isFinite(hint)) {
              pendingSent.shift();
              recordSent(sessionId, `12:turn-process${hint}`, pending.items, hint);
              scheduleRepaint();
            }
            return;
          }
          pendingSent.shift();
          const turn = turnOfRow(target.row);
          recordSent(sessionId, target.anchorKey, pending.items, turn);
          scheduleRepaint();
        }
        const markdown = createMarkdown({
          h,
          MarkdownText: extras.MarkdownText,
          createRoot: extras.createRoot,
          labels: () => ({
            code: { copyLabel: t("markdown.copy"), copiedLabel: t("markdown.copied") },
            footnotes: t("markdown.footnotes")
          })
        });
        const cards = createCards({ t, openImageViewer, markdown, isAdopt: hasAdoptNote });
        const sectionChevron = () => cards.sectionChevron();
        const buildSectionHead = (label, meta) => cards.buildSectionHead(label, meta);
        const collapsible = (body, open) => cards.collapsible(body, open);
        const applyCollapsed = (head, wrap, open) => cards.applyCollapsed(head, wrap, open);
        const buildSentCard = (record, anchorKey, options) => cards.buildSentCard(record, anchorKey, options);
        function turnBlockOf(row) {
          return typeof row.closest === "function" ? row.closest('[data-chat-flow-kind="turn-process"]') : null;
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
            const card = existing ?? buildSentCard(record, anchorKey, {
              onReuse: () => reuseSentItems(record.items),
              onReplayItem: (item) => reuseSentItems([item])
            });
            card.setAttribute("data-sa-key", storedKey);
            card.setAttribute("data-anchor", anchorKey);
            const bubbleKind = row === null ? "" : row.getAttribute("data-chat-flow-kind") ?? "";
            const onBubble = !Number.isFinite(turn) && row !== null && (bubbleKind === "user" || bubbleKind === "steering" || row.hasAttribute("data-pending-steering"));
            if (onBubble && row.parentElement !== null && row.parentElement !== document.body) {
              if (card.parentElement !== row.parentElement || card.previousSibling !== row) {
                row.parentElement.insertBefore(card, row.nextSibling);
              }
              continue;
            }
            const disclosure = Number.isFinite(turn) ? turnDisclosureItem(turn) : null;
            if (disclosure !== null && disclosure.parentElement !== null) {
              if (card.parentElement !== disclosure.parentElement || card.nextSibling !== disclosure) {
                disclosure.parentElement.insertBefore(card, disclosure);
              }
              continue;
            }
            const anchorEl = Number.isFinite(turn) ? findTurnAnchor(turn, sessionId) : null;
            if (anchorEl !== null && anchorEl.parentElement !== null) {
              if (card.parentElement !== anchorEl.parentElement || card.nextSibling !== anchorEl) {
                anchorEl.parentElement.insertBefore(card, anchorEl);
              }
              continue;
            }
            if (footer !== null) {
              if (footer.parentElement !== null && (card.parentElement !== footer.parentElement || card.nextSibling !== footer)) {
                footer.parentElement.insertBefore(card, footer);
              }
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
        const buildReplySection = (batches, items, options) => cards.buildReplySection(batches, items, options);
        function syncReplyCollapse(origin) {
          for (const section of document.querySelectorAll('[data-sa-ui="replies"]')) {
            const known = section.dataset.saTurn;
            let button3 = typeof known === "string" && known !== "" ? document.querySelector(`[data-turn-process="${known}"]`) : null;
            if (button3 === null) {
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
              button3 = footer === null ? null : footer.matches?.("[data-turn-process]") ? footer : footer.querySelector?.("[data-turn-process]");
            }
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
          if (Number.isFinite(turn)) section.dataset.saTurn = String(turn);
          if (Number.isFinite(turn)) {
            const items = document.querySelectorAll(`[data-chat-turn="${turn}"]`);
            let lastAssistant = null;
            for (const item of items) {
              const kind = item.getAttribute?.("data-chat-flow-kind") ?? "";
              if (kind.startsWith("assistant")) lastAssistant = item;
            }
            if (lastAssistant !== null && lastAssistant.parentElement !== null) {
              lastAssistant.parentElement.insertBefore(section, lastAssistant);
              return;
            }
          }
          const anchorEl = Number.isFinite(turn) ? findTurnAnchor(turn, currentSessionId()) : null;
          if (anchorEl !== null && anchorEl.parentElement !== null) {
            let cursor2 = anchorEl;
            while (cursor2.nextElementSibling !== null && cursor2.nextElementSibling.getAttribute?.("data-sa-ui") === "replies") {
              cursor2 = cursor2.nextElementSibling;
            }
            anchorEl.parentElement.insertBefore(section, cursor2.nextSibling);
            return;
          }
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
            annotateLabel.textContent = t("annotate");
            adoptLabel.textContent = t("annotate.adopt");
            copyLabel.textContent = t("annotate.copy");
          });
          safe(() => {
            menuAnnotate.textContent = t("menu.annotate");
            menuAdopt.textContent = t("menu.adopt");
            menuCopy.textContent = t("menu.copy");
          });
          safe(() => {
            popInput.setAttribute("aria-label", t("pop.placeholder"));
            popInput.dataset.placeholder = t("pop.placeholder");
          });
          safe(() => {
            popQuoteLabel.textContent = t("label.quote");
            popNoteLabel.textContent = t("pop.noteLabel");
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
        function collapseSentForReplies(sentCard, signature) {
          if (sentCard.dataset.saReplySig === signature) return;
          sentCard.dataset.saReplySig = signature;
          const head = sentCard.querySelector(".sa-section-head");
          const wrap = sentCard.querySelector(".sa-collapse");
          if (head !== null && wrap !== null) applyCollapsed(head, wrap, false);
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
              const fresh = buildReplySection(list, items, { onReplayItem: (item) => reuseSentItems([item]) });
              fresh.setAttribute("data-anchor", anchorKey);
              fresh.dataset.signature = signature;
              existing.replaceWith(fresh);
              placeReplyAfterTurnProcess(fresh, turn);
              collapseSentForReplies(sentCard, signature);
              continue;
            }
            const section = buildReplySection(list, items, { onReplayItem: (item) => reuseSentItems([item]) });
            section.setAttribute("data-anchor", anchorKey);
            section.dataset.signature = signature;
            sentCard.parentElement?.insertBefore(section, sentCard.nextSibling);
            placeReplyAfterTurnProcess(section, turn);
            collapseSentForReplies(sentCard, signature);
          }
        }
        const payloadApi = createPayload({ t, instructionOf });
        const describeSource = (source) => payloadApi.describeSource(source);
        const payloadSource = (source) => payloadApi.payloadSource(source);
        const buildPayload = (items) => payloadApi.buildPayload(items);
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
              if (hasAdoptNote(item.note)) box.dataset.adopt = "1";
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
        function dshIconSvg(kind) {
          const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
          svg.setAttribute("viewBox", "0 0 16 16");
          svg.setAttribute("width", "14");
          svg.setAttribute("height", "14");
          svg.setAttribute("fill", "none");
          svg.setAttribute("aria-hidden", "true");
          svg.setAttribute("stroke-width", "1");
          const path = (d, extra) => {
            const node = document.createElementNS("http://www.w3.org/2000/svg", "path");
            node.setAttribute("d", d);
            node.setAttribute("stroke", "currentColor");
            if (extra !== void 0) for (const key of Object.keys(extra)) node.setAttribute(key, extra[key]);
            svg.appendChild(node);
          };
          if (kind === "check") {
            path("M2.25 8.5L5.49732 11.7473C5.90519 12.1552 6.57263 12.1344 6.95426 11.7018L13.75 4");
          } else if (kind === "copy") {
            path("M5.6 5.6H12.4V12.4H5.6V5.6Z");
            path("M3.6 3.6H9.4V5.6");
          } else {
            path("M8.85596 2.69971H4.19971C3.37141 2.69971 2.69992 3.37146 2.69971 4.19971V11.8003C2.69992 12.6285 3.37141 13.3003 4.19971 13.3003H11.8003C12.6283 13.2999 13.3001 12.6283 13.3003 11.8003V7.89893H14.3003V11.8003C14.3001 13.1806 13.1806 14.2999 11.8003 14.3003H4.19971C2.81913 14.3003 1.69992 13.1808 1.69971 11.8003V4.19971C1.69992 2.81918 2.81913 1.69971 4.19971 1.69971H8.85596V2.69971Z", { fill: "currentColor", stroke: "none" });
            path("M7.7849 8.23878L13.888 2.13574");
          }
          return svg;
        }
        const annotateButton = document.createElement("button");
        annotateButton.type = "button";
        annotateButton.className = "sa-btn";
        const annotateLabel = document.createElement("span");
        annotateLabel.textContent = t("annotate");
        annotateButton.append(dshIconSvg("edit"), annotateLabel);
        const adoptButton = document.createElement("button");
        adoptButton.type = "button";
        adoptButton.className = "sa-btn sa-btn-adopt";
        const adoptLabel = document.createElement("span");
        adoptLabel.textContent = t("annotate.adopt");
        adoptButton.append(dshIconSvg("check"), adoptLabel);
        const copyButton = document.createElement("button");
        copyButton.type = "button";
        copyButton.className = "sa-btn";
        const copyLabel = document.createElement("span");
        copyLabel.textContent = t("annotate.copy");
        copyButton.append(dshIconSvg("copy"), copyLabel);
        toolbar.append(adoptButton, annotateButton, copyButton);
        const contextMenu = document.createElement("div");
        contextMenu.className = "sa-menu";
        contextMenu.setAttribute("data-sa-ui", "menu");
        contextMenu.dataset.open = "0";
        const menuAnnotate = document.createElement("button");
        menuAnnotate.type = "button";
        menuAnnotate.className = "sa-menu-item";
        menuAnnotate.textContent = t("menu.annotate");
        const menuAdopt = document.createElement("button");
        menuAdopt.type = "button";
        menuAdopt.className = "sa-menu-item";
        menuAdopt.textContent = t("menu.adopt");
        const menuCopy = document.createElement("button");
        menuCopy.type = "button";
        menuCopy.className = "sa-menu-item";
        menuCopy.textContent = t("menu.copy");
        contextMenu.append(menuAnnotate, menuAdopt, menuCopy);
        let contextMenuSelection = null;
        const popover = document.createElement("div");
        popover.className = "sa-popover";
        popover.setAttribute("data-sa-ui", "popover");
        const popHead = document.createElement("div");
        popHead.className = "sa-pop-head";
        const popTitle = document.createElement("div");
        popTitle.className = "sa-pop-title";
        const popClose = document.createElement("button");
        popClose.type = "button";
        popClose.className = "sa-pop-close";
        popClose.textContent = "×";
        popClose.setAttribute("aria-label", t("pop.cancel"));
        popHead.append(popTitle, popClose);
        const raisePopover = () => popover.classList.add("sa-front");
        popover.addEventListener("pointerdown", raisePopover, true);
        popover.addEventListener("focusin", raisePopover, true);
        popover.addEventListener("keydown", raisePopover, true);
        let popDrag = null;
        popHead.addEventListener("pointerdown", (event) => {
          if (event.button !== 0) return;
          if (elementOf2(event.target)?.closest(".sa-pop-close") !== null) return;
          const rect = popover.getBoundingClientRect();
          popDrag = { dx: event.clientX - rect.left, dy: event.clientY - rect.top, width: rect.width, height: rect.height };
          popover.dataset.dragged = "1";
          popover.classList.add("sa-pop-dragging");
          event.preventDefault();
          if (typeof popHead.setPointerCapture === "function") safe(() => popHead.setPointerCapture(event.pointerId));
        });
        const popQuoteLabel = document.createElement("div");
        popQuoteLabel.className = "sa-pop-label";
        popQuoteLabel.textContent = t("label.quote");
        const popQuote = document.createElement("div");
        popQuote.className = "sa-pop-quote";
        const popDivider = document.createElement("div");
        popDivider.className = "sa-pop-divider";
        const popSource = document.createElement("div");
        popSource.className = "sa-pop-src";
        const popNoteLabel = document.createElement("div");
        popNoteLabel.className = "sa-pop-label";
        popNoteLabel.textContent = t("pop.noteLabel");
        const popSuggest = document.createElement("button");
        popSuggest.type = "button";
        popSuggest.className = "sa-suggest";
        popSuggest.setAttribute("data-sa-ui", "suggest");
        popSuggest.style.display = "none";
        const ghostTip = document.createElement("span");
        ghostTip.className = "sa-ghost";
        ghostTip.setAttribute("data-sa-ui", "ghost");
        ghostTip.setAttribute("aria-hidden", "true");
        ghostTip.style.display = "none";
        const popInput = document.createElement("div");
        popInput.className = "sa-pop-input";
        popInput.setAttribute("contenteditable", "true");
        popInput.setAttribute("role", "textbox");
        popInput.setAttribute("aria-multiline", "true");
        popInput.setAttribute("tabindex", "0");
        popInput.setAttribute("aria-label", t("pop.placeholder"));
        popInput.dataset.placeholder = t("pop.placeholder");
        popInput.dataset.empty = "1";
        let popInputAutoHeight = true;
        let popInputAutoValue = 0;
        let highlightHits = [];
        let hoverOpenTimer = null;
        let hoverTargetId = null;
        let hoverCloseTimer = null;
        let popoverHovered = false;
        let popoverTouched = false;
        let popoverSource = "manual";
        function caretToEnd() {
          const selection = window.getSelection();
          if (selection === null || typeof document.createRange !== "function") return;
          const range = document.createRange();
          range.selectNodeContents(popInput);
          range.collapse(false);
          selection.removeAllRanges();
          selection.addRange(range);
        }
        function noteValue() {
          return typeof popInput.textContent === "string" ? popInput.textContent : "";
        }
        function refreshNoteState() {
          popInput.dataset.empty = noteValue() === "" ? "1" : "0";
          syncAdoptTone();
        }
        function appendNoteText(text) {
          if (text === "") return;
          if (typeof document.createTextNode === "function") {
            popInput.appendChild(document.createTextNode(text));
          } else {
            const span = document.createElement("span");
            span.textContent = text;
            popInput.appendChild(span);
          }
        }
        function adoptTokenNode(phrase) {
          const token = document.createElement("span");
          token.className = "sa-token";
          token.setAttribute("contenteditable", "false");
          token.textContent = phrase;
          return token;
        }
        function setNoteContent(value) {
          popInput.textContent = "";
          if (value === "") {
            refreshNoteState();
            return;
          }
          const phrase = adoptTextOf();
          const at = value.indexOf(phrase);
          if (at === -1) {
            appendNoteText(value);
          } else {
            appendNoteText(value.slice(0, at));
            popInput.appendChild(adoptTokenNode(phrase));
            appendNoteText(value.slice(at + phrase.length));
          }
          refreshNoteState();
        }
        const insertNoteText = (text) => {
          const selection = window.getSelection();
          const range = selection !== null && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
          if (range !== null && popInput.contains(range.startContainer)) {
            range.deleteContents();
            const node = typeof document.createTextNode === "function" ? document.createTextNode(text) : null;
            if (node !== null) {
              range.insertNode(node);
              range.setStartAfter(node);
              range.collapse(true);
              selection.removeAllRanges();
              selection.addRange(range);
              return;
            }
          }
          appendNoteText(text);
          caretToEnd();
        };
        let suggested = null;
        function hideSuggestion() {
          suggested = null;
          ghostTip.style.display = "none";
          popSuggest.style.display = "none";
        }
        function caretLine() {
          const selection = window.getSelection();
          if (selection === null || selection.rangeCount === 0) return null;
          const range = selection.getRangeAt(0);
          if (!range.collapsed) return null;
          const node = range.startContainer;
          if (node === null || node.nodeType !== 3 || typeof node.data !== "string") return null;
          const before = node.data.slice(0, range.startOffset);
          const line = before.slice(before.lastIndexOf("\n") + 1);
          const rect = range.getBoundingClientRect();
          return { node, offset: range.startOffset, line, rect };
        }
        function updateSuggestion() {
          const phrase = adoptTextOf();
          const ctx2 = caretLine();
          if (ctx2 === null) {
            hideSuggestion();
            return;
          }
          if (ctx2.line === "" || ctx2.line === phrase || !phrase.includes(ctx2.line)) {
            hideSuggestion();
            return;
          }
          suggested = { prefix: ctx2.line, node: ctx2.node, offset: ctx2.offset };
          ghostTip.textContent = phrase;
          const left = Math.min(ctx2.rect.right + 1, window.innerWidth - 40);
          ghostTip.style.left = `${Math.max(8, left)}px`;
          ghostTip.style.top = `${ctx2.rect.top}px`;
          ghostTip.style.display = "";
        }
        function acceptSuggestion() {
          if (suggested === null) return false;
          const phrase = adoptTextOf();
          const { prefix, node, offset } = suggested;
          if (typeof node.data !== "string" || node.data.slice(offset - prefix.length, offset) !== prefix) {
            hideSuggestion();
            return false;
          }
          const selection = window.getSelection();
          if (selection === null || typeof document.createRange !== "function") return false;
          const range = document.createRange();
          range.setStart(node, offset - prefix.length);
          range.setEnd(node, offset);
          range.deleteContents();
          const token = adoptTokenNode(phrase);
          range.insertNode(token);
          const after = document.createRange();
          after.setStartAfter(token);
          after.collapse(true);
          selection.removeAllRanges();
          selection.addRange(after);
          hideSuggestion();
          refreshNoteState();
          syncPopInputHeight();
          ensureCaretVisible();
          return true;
        }
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
        popSave.className = "sa-btn sa-pop-primary";
        popSave.textContent = t("pop.save");
        popActions.append(popDelete, popSpacer, popCancel, popSave);
        popover.append(popHead, popSource, popQuoteLabel, popQuote, popDivider, popNoteLabel, popInput, popImages, popActions);
        function isExcluded(node) {
          const element = elementOf2(node);
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
          const target = elementOf2(event.target);
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
        function anchoredLeft(point, rect, width) {
          const anchorX = point !== null && point !== void 0 ? point.x : rect.left + rect.width / 2;
          return Math.max(8, Math.min(anchorX - width / 2, window.innerWidth - width - 8));
        }
        function placePopover(rect) {
          const width = popover.offsetWidth || 340;
          const height = popover.offsetHeight || 240;
          const point = popoverSource === "hover" ? lastPointerMove : selectionPointer ?? lastPointerMove;
          const left = anchoredLeft(point, rect, width);
          const above = rect.top - height - 10;
          const top = above >= 8 ? above : Math.min(rect.bottom + 10, window.innerHeight - height - 8);
          popover.style.left = `${left}px`;
          popover.style.top = `${Math.max(8, top)}px`;
        }
        function placeToolbar(element, rect, point) {
          const width = element.offsetWidth || 80;
          const height = element.offsetHeight || 32;
          const left = anchoredLeft(point, rect, width);
          const top = Math.min(rect.bottom + 8, window.innerHeight - height - 8);
          element.style.left = `${left}px`;
          element.style.top = `${Math.max(8, top)}px`;
        }
        function showSelectionToolbar() {
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
          const fresh = lastPointerUp !== null && Date.now() - lastPointerUp.at < 1500;
          selectionPointer = fresh ? lastPointerUp : null;
          placeToolbar(toolbar, rect, fresh ? lastPointerUp : null);
        }
        function onSelectionChange() {
          window.clearTimeout(settleTimer);
          settleTimer = window.setTimeout(() => {
            settleTimer = null;
            if (pointerSelecting) {
              hideToolbar();
              return;
            }
            showSelectionToolbar();
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
          const keepTop = popInput.scrollTop;
          popInput.style.height = "auto";
          const measured = Number(popInput.scrollHeight);
          if (!Number.isFinite(measured) || measured <= 0) return;
          const next = Math.max(min, Math.min(measured, max));
          popInput.style.height = `${next}px`;
          popInputAutoValue = next;
          popInput.scrollTop = keepTop;
        }
        function ensureCaretVisible() {
          const selection = window.getSelection();
          if (selection === null || selection.rangeCount === 0) return;
          const range = selection.getRangeAt(0).cloneRange();
          const rect = range.getBoundingClientRect();
          const box = popInput.getBoundingClientRect();
          if (rect.bottom > box.bottom - 4) {
            popInput.scrollTop += rect.bottom - box.bottom + 12;
          } else if (rect.top < box.top + 4) {
            popInput.scrollTop -= box.top - rect.top + 12;
          }
        }
        function syncAdoptTone() {
          popInput.dataset.adopt = hasAdoptNote(noteValue()) ? "1" : "0";
        }
        function showPopover(options) {
          popTitle.textContent = options.title;
          popQuote.textContent = options.quote.length > 400 ? `${options.quote.slice(0, 400)}…` : options.quote;
          popQuote.style.display = options.quote === "" ? "none" : "";
          popQuoteLabel.style.display = options.quote === "" ? "none" : "";
          popSource.textContent = options.sourceText;
          setNoteContent(options.note);
          updateSuggestion();
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
          if (options.rect !== void 0 && options.rect !== null) placePopover(options.rect);
          syncPopInputHeight();
          const focusEditor = () => {
            if (popover.dataset.open !== "1") return;
            safe(() => popInput.focus({ preventScroll: true }));
            safe(() => caretToEnd());
          };
          focusEditor();
          safe(() => window.requestAnimationFrame(focusEditor));
          safe(() => window.setTimeout(focusEditor, 60));
          safe(() => window.setTimeout(focusEditor, 180));
        }
        function openCreatePopover(options = {}) {
          const selection = pendingSelection;
          if (selection === null) return;
          popoverAnchor = { range: selection.range, quote: selection.quote, source: captureSource(selection.range) };
          showPopover({
            title: t("pop.createTitle"),
            quote: selection.quote,
            sourceText: describeSource(popoverAnchor.source),
            note: options.adopt === true ? adoptTextOf() : typeof options.note === "string" ? options.note : "",
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
          popover.classList.remove("sa-front");
          safe(() => popInput.blur());
          popoverAnchor = null;
          popoverTargetId = null;
          popoverMode = "create";
          hideSuggestion();
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
              const rendered = item.source.textOrigin === "source" && Number.isFinite(item.source.renderedCharStart) ? {} : { renderedCharStart: item.source.charStart, renderedCharEnd: item.source.charEnd };
              return { ...item, source: { ...item.source, ...rendered, ...precise } };
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
        function commitPopover(discardEmpty = false) {
          if (popoverMode === "edit") {
            const target = popoverTargetId;
            const images2 = popInputImages;
            const note2 = noteValue();
            const before = target === null ? void 0 : annotations.find((item) => item.id === target);
            closePopover();
            if (before !== void 0 && before.note === note2 && JSON.stringify(before.images) === JSON.stringify(images2)) {
              return;
            }
            if (target !== null) updateAnnotation(target, note2, images2);
            return;
          }
          const anchor = popoverAnchor;
          if (anchor === null) return;
          const note = noteValue();
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
        function adoptSelectionDirectly() {
          const selection = pendingSelection;
          if (selection === null) return;
          hideToolbar();
          closeContextMenu();
          const source = captureSource(selection.range);
          const created = addAnnotation({
            quote: selection.quote,
            note: adoptTextOf(),
            images: [],
            source,
            liveRange: selection.range
          });
          safe(() => window.getSelection()?.removeAllRanges());
          if (created !== void 0) {
            refineSourcePosition(created.id, source, selection.quote).catch((err) => {
              warn("[selection-annotations] 位置精修失败（不影响这条批注）：", err);
            });
          }
        }
        function reuseSentItems(items) {
          const list = Array.isArray(items) ? items : [];
          let added = 0;
          for (const item of list) {
            if (typeof item?.quote !== "string" && typeof item?.note !== "string") continue;
            const images = (Array.isArray(item.thumbs) ? item.thumbs : []).filter((thumb) => typeof thumb?.dataUrl === "string" && thumb.dataUrl !== "").map((thumb, index) => {
              const full = typeof thumb.preview === "string" && thumb.preview !== "" ? thumb.preview : thumb.dataUrl;
              return {
                id: `img-reuse-${Date.now().toString(36)}-${index}`,
                name: typeof thumb.name === "string" ? thumb.name : t("image.alt"),
                dataUrl: full,
                thumb: thumb.dataUrl,
                preview: full,
                bytes: Math.round(full.length * 3 / 4)
              };
            });
            addAnnotation({
              quote: typeof item.quote === "string" ? item.quote : "",
              note: typeof item.note === "string" ? item.note : "",
              images,
              source: item.source ?? { kind: "dom" }
            });
            added += 1;
          }
          return added;
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
        adoptButton.addEventListener("mousedown", (event) => {
          event.preventDefault();
        });
        adoptButton.addEventListener("click", (event) => {
          event.preventDefault();
          adoptSelectionDirectly();
        });
        copyButton.addEventListener("mousedown", (event) => {
          event.preventDefault();
        });
        copyButton.addEventListener("click", (event) => {
          event.preventDefault();
          const selection = pendingSelection;
          if (selection === null) return;
          copyPlainText(selection.quote);
          hideToolbar();
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
        menuAdopt.addEventListener("mousedown", (event) => {
          event.preventDefault();
        });
        menuAdopt.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          if (contextMenuSelection !== null) pendingSelection = contextMenuSelection;
          closeContextMenu();
          adoptSelectionDirectly();
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
        popClose.addEventListener("click", () => closePopover());
        popInput.addEventListener("keydown", (event) => {
          const phrase = adoptTextOf();
          if (event.key === "Tab" && !event.shiftKey) {
            if (acceptSuggestion()) {
              event.preventDefault();
              return;
            }
            const value = noteValue();
            if (value !== "" && phrase.startsWith(value)) {
              event.preventDefault();
              setNoteContent(phrase);
              safe(() => caretToEnd());
              syncPopInputHeight();
              return;
            }
          }
          if (event.key === "Enter" && !event.ctrlKey && !event.metaKey && !event.shiftKey) {
            event.preventDefault();
            insertNoteText("\n");
            refreshNoteState();
            syncPopInputHeight();
            return;
          }
          if (event.key === "Escape") closePopover();
          if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) commitPopover();
        });
        popInput.addEventListener("input", () => {
          const phrase = adoptTextOf();
          const value = noteValue();
          if (value.endsWith(phrase)) {
            const last = popInput.lastElementChild;
            const already = last !== null && last !== void 0 && typeof last.className === "string" && last.className.includes("sa-token");
            if (!already) {
              setNoteContent(value);
              safe(() => caretToEnd());
            }
          }
          updateSuggestion();
          refreshNoteState();
          syncPopInputHeight();
          ensureCaretVisible();
        });
        popSuggest.addEventListener("mousedown", (event) => {
          event.preventDefault();
        });
        popSuggest.addEventListener("click", (event) => {
          event.preventDefault();
          acceptSuggestion();
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
          if (images.length === 0) {
            const plain = safe(() => data.getData("text/plain"));
            if (typeof plain !== "string" || plain === "") return;
            event.preventDefault();
            insertNoteText(plain);
            refreshNoteState();
            syncPopInputHeight();
            return;
          }
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
        popInput.addEventListener("click", () => safe(() => updateSuggestion()));
        popInput.addEventListener("keyup", () => safe(() => updateSuggestion()));
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
          const target = elementOf2(event.target);
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
        const panelRenderer = createPanelRenderer({
          t,
          getAnnotations: () => annotations,
          clearAnnotations: () => clearAnnotations(),
          moveAnnotation: (from, to) => moveAnnotation(from, to),
          openEditPopover: (id, head) => openEditPopover(id, head),
          removeAnnotation: (id) => removeAnnotation(id),
          sourceSummary: (item) => sourceSummary(item),
          openImageViewer: (url, name) => openImageViewer(url, name),
          imageSettingsRow: () => imageSettingsRow(),
          instructionSettingsRow: () => instructionSettingsRow(),
          isAdopt: hasAdoptNote
        });
        const renderPanel = () => panelRenderer.render(panelEl);
        function imageSettingsRow() {
          const settings2 = imageSettingsOf();
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
              settings2.compress ? t("settings.imagesOn", { n: Math.round(settings2.quality * 100) }) : t("settings.imagesOff")
            )
          );
          box.appendChild(head);
          if (!imageSettingsOpen) return box;
          const compressRow = el("label", "sa-setting");
          const compress = document.createElement("input");
          compress.type = "checkbox";
          compress.checked = settings2.compress;
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
          quality.value = String(settings2.quality);
          const qualityText = el("span", "sa-setting-value", `${Math.round(settings2.quality * 100)}%`);
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
          size.value = String(settings2.minSize);
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
            const target = elementOf2(event.target);
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
          document.body.append(overlay, toolbar, contextMenu, popover, popSuggest, ghostTip, panelRoot, imageViewer);
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
            popSuggest.remove();
            ghostTip.remove();
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
          const onSelectPointerDown = (event) => {
            const target = elementOf2(event.target);
            if (target !== null && target.closest("[data-sa-ui]") !== null) return;
            if (popover.dataset.open === "1" && target !== null && target.closest('[data-sa-ui="popover"]') !== null) return;
            pointerSelecting = true;
            hideToolbar();
          };
          document.addEventListener("pointerdown", onSelectPointerDown, true);
          const onPointerUp = (event) => {
            const target = elementOf2(event.target);
            if (target !== null && target.closest('[data-sa-ui="toolbar"], [data-sa-ui="menu"], [data-sa-ui="suggest"]') !== null) return;
            if (target !== null && target.closest('[data-sa-ui="popover"], [data-sa-ui="ghost"]') !== null) return;
            pointerSelecting = false;
            lastPointerUp = { x: event.clientX, y: event.clientY, at: Date.now() };
            window.clearTimeout(settleTimer);
            settleTimer = null;
            showSelectionToolbar();
            if (toolbar.dataset.open === "1" && pendingSelection !== null) {
              const rect = safe(() => pendingSelection.range.getBoundingClientRect());
              if (rect !== void 0) placeToolbar(toolbar, rect, lastPointerUp);
            }
          };
          document.addEventListener("pointerup", onPointerUp, true);
          const onPointerMove = (event) => {
            lastPointerMove = { x: event.clientX, y: event.clientY };
            if (popDrag === null || popover.dataset.open !== "1") return;
            const left = Math.max(8, Math.min(event.clientX - popDrag.dx, window.innerWidth - popDrag.width - 8));
            const top = Math.max(8, Math.min(event.clientY - popDrag.dy, window.innerHeight - popDrag.height - 8));
            popover.style.left = `${left}px`;
            popover.style.top = `${top}px`;
          };
          const onPopDragUp = () => {
            if (popDrag === null) return;
            popDrag = null;
            popover.classList.remove("sa-pop-dragging");
          };
          document.addEventListener("pointerup", onPopDragUp, true);
          document.addEventListener("pointermove", onPointerMove, true);
          document.addEventListener("contextmenu", onContextMenu, true);
          const onMenuPointerDown = (event) => {
            const target = elementOf2(event.target);
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
              const target = elementOf2(record.target);
              if (target !== null && target.closest("[data-sa-ui]") !== null) continue;
              if (pendingSent.length > 0) safe(() => scanSentMessages());
              scheduleRepaint();
              return;
            }
          });
          observer.observe(document.body, { childList: true, subtree: true, characterData: true });
          return () => {
            markdown.dispose();
            document.removeEventListener("selectionchange", onSelectionChange);
            document.removeEventListener("pointerdown", onSelectPointerDown, true);
            document.removeEventListener("pointerup", onPointerUp, true);
            document.removeEventListener("pointerup", onPopDragUp, true);
            document.removeEventListener("pointermove", onPointerMove, true);
            document.removeEventListener("contextmenu", onContextMenu, true);
            document.removeEventListener("pointerdown", onMenuPointerDown, true);
            document.removeEventListener("keydown", onMenuKeydown, true);
            window.removeEventListener("scroll", onViewport, true);
            window.removeEventListener("resize", onViewport);
            observer.disconnect();
          };
        });
        ctx.effect(() => {
          const onTurnProcessClick = (event) => {
            const target = elementOf2(event.target);
            const button3 = target === null ? null : target.closest("[data-turn-process]");
            if (button3 === null) return;
            window.requestAnimationFrame(() => syncReplyCollapse(button3));
          };
          document.addEventListener("click", onTurnProcessClick, true);
          return () => {
            document.removeEventListener("click", onTurnProcessClick, true);
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
          const [adoptText, setAdoptText] = React.useState(() => adoptTextOf());
          const customized = !isDefaultInstruction(text);
          const card = (key, title, hint, control, actions) => h(
            "section",
            { className: "sa-settings-card", key },
            h(
              "div",
              { className: "sa-settings-card-head" },
              h("h3", { className: "sa-settings-card-title" }, title),
              hint ? h("p", { className: "sa-hint" }, hint) : null
            ),
            control,
            actions ? h("div", { className: "sa-settings-actions" }, actions) : null
          );
          return h(
            "div",
            { className: "sa-settings-page" },
            card(
              "instruction",
              t("settings.pageTitle"),
              `${customized ? t("settings.customized") : t("settings.default")} · ${t("settings.pageHint")}`,
              h("textarea", {
                className: "sa-setting-textarea",
                "aria-label": t("settings.pageTitle"),
                rows: 10,
                value: text,
                onChange: (event) => {
                  setText(event.target.value);
                  persistInstructionSettings(event.target.value);
                }
              }),
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
            ),
            card(
              "adopt",
              t("settings.adoptLabel"),
              t("settings.adoptHint"),
              h("input", {
                className: "sa-setting-input",
                "aria-label": t("settings.adoptLabel"),
                value: adoptText,
                onChange: (event) => {
                  setAdoptText(event.target.value);
                  persistAdoptText(event.target.value);
                }
              }),
              h(
                "button",
                {
                  type: "button",
                  className: "sa-link",
                  onClick: () => {
                    const next = DEFAULT_ADOPT_TEXT;
                    setAdoptText(next);
                    persistAdoptText(next);
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
        locale.subscribe(() => applyLocale());
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
          _internals: { buildPayload, payloadSource, describeSource, captureSource, matchInRoot, rangeFromOffsets, offsetRange, anchorRoot, locateRange, locateInSource, lineOfOffset, resolveSourcePosition, refineSourcePosition, adoptSession, loadDraft, saveDraft, loadSent, saveSent, recordSent, scanSentMessages, buildSentCard, renderSentCards, renderReplySections, buildReplySection, mergeReplyBatches, absorbRemoteReplies, shouldDiscardEmpty, loadImageSettings, syncReplyCollapse, sentCardAnchor, turnOfRow, placeToolbar }
        };
      }
    };
  }

  // src/entry.js
  window.__ModuleLoader__.load({
    id: "@u2a5f/dsh-selection-annotations",
    factory(require2) {
      const React = require2("react");
      let MarkdownText;
      let createRoot;
      try {
        MarkdownText = require2("@deepseek-ai/dsh-client-ui-primitives").MarkdownText;
      } catch {
        MarkdownText = void 0;
      }
      try {
        createRoot = require2("react-dom/client").createRoot;
      } catch {
        createRoot = void 0;
      }
      return createPlugin(React, { MarkdownText, createRoot });
    }
  });
})();
