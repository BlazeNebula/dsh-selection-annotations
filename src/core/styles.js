export const CSS = `
.sa-overlay { position: fixed; inset: 0; pointer-events: none; z-index: 60; }
.sa-hl { position: fixed; pointer-events: none; border-radius: 3px;
  background: color-mix(in srgb, var(--dsw-alias-state-warn-primary, #f59e0b) 30%, transparent);
  box-shadow: inset 0 -1px 0 color-mix(in srgb, var(--dsw-alias-state-warn-primary, #f59e0b) 70%, transparent); }
.sa-hl[data-adopt="1"] { background: color-mix(in srgb, var(--dsw-alias-state-success-primary, #22c55e) 30%, transparent);
  box-shadow: inset 0 -1px 0 color-mix(in srgb, var(--dsw-alias-state-success-primary, #22c55e) 70%, transparent); }
/* 批注文字的墨色从主题前景色派生（同 dsh-todo-notes 的优先级着色）：普通批注走 warn 色相，采纳走 success 色相。*/
.sa-item-note, .sa-sent-note, .sa-a-reason, .sa-pop-input, .sa-token {
  color: var(--dsw-alias-state-warn-primary, #d29922); }
@supports (color: oklch(from #fff calc(l * 0.9) 0.1 80)) {
  .sa-item-note, .sa-sent-note, .sa-a-reason, .sa-pop-input, .sa-token {
    color: oklch(from var(--dsw-alias-label-primary, #e8e8ea) calc(l * 0.9) 0.12 85); }
}
.sa-item-note[data-adopt="1"], .sa-sent-note[data-adopt="1"], .sa-a-reason[data-adopt="1"],
.sa-pop-input[data-adopt="1"], .sa-token {
  color: var(--dsw-alias-state-success-primary, #22c55e); }
@supports (color: oklch(from #fff calc(l * 0.9) 0.1 80)) {
  .sa-item-note[data-adopt="1"], .sa-sent-note[data-adopt="1"], .sa-a-reason[data-adopt="1"],
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
  margin: 0 0 6px; padding-bottom: 8px; border-bottom: 1px solid var(--dsw-alias-border-l1, ButtonBorder); }
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
.sa-item-note { margin: 3px 0 0; font-size: calc(14px + var(--dsh-content-font-delta, 0px) * 1); line-height: 1.7; white-space: pre-wrap; word-break: break-word;
  color: var(--dsw-alias-label-primary, CanvasText); }
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
.sa-replies { display: flex; flex-direction: column; gap: 10px; margin: 8px 0 0; width: 100%; max-width: none; box-sizing: border-box; padding: 0;
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
.sa-section-head[aria-expanded="true"] .sa-section-chevron { transform: rotate(90deg); }
.sa-collapse { display: grid; grid-template-rows: 0fr; opacity: 0; margin-top: 6px;
  transition: grid-template-rows 180ms ease, opacity 180ms ease; }
.sa-collapse[data-open="1"] { grid-template-rows: 1fr; opacity: 1; }
.sa-collapse-inner { min-height: 0; overflow: hidden; }
.sa-replies-head { font-size: calc(12px + var(--dsh-content-font-delta, 0px) * 0.6); font-weight: 600; color: var(--dsw-alias-label-primary, CanvasText); }
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
.sa-reply-index { font-size: calc(11px + var(--dsh-content-font-delta, 0px) * 0.4); font-weight: 600; letter-spacing: 0.06em;
  color: var(--dsw-alias-label-secondary, #8b949e); }
.sa-reply-body { display: flex; flex-direction: column; gap: 10px; padding: 12px; }

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
.sa-q-note { font-size: calc(14px + var(--dsh-content-font-delta, 0px) * 1); font-weight: 500; line-height: 1.65; color: var(--dsw-alias-label-primary, CanvasText);
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
.sa-a-next { margin-top: 2px; padding: 6px 10px; border-radius: 6px;
  border-left: 2px solid var(--sa-tone, var(--dsw-alias-border-l1, ButtonBorder));
  background: var(--dsw-alias-bg-layer-2, #ffffff08); font-size: calc(12.5px + var(--dsh-content-font-delta, 0px) * 0.6); line-height: 1.5;
  color: var(--dsw-alias-label-secondary, #8b949e); }
.sa-sent { display: block; margin: 8px 0 0; width: 100%; max-width: none; box-sizing: border-box; }
.sa-sent-body { margin: 0; padding: 6px 8px; box-sizing: border-box; border-radius: 8px;
  border: 1px solid var(--dsw-alias-border-l1, ButtonBorder); background: var(--dsw-alias-bg-layer-1, Canvas); }
.sa-sent-item { display: flex; gap: 6px; padding: 8px 0; font-size: calc(12px + var(--dsh-content-font-delta, 0px) * 0.6); line-height: 1.5;
  border-top: 1px solid var(--dsw-alias-border-secondary, #3333); }
.sa-sent-item:first-child { border-top: none; padding-top: 2px; }
.sa-sent-num { flex: none; min-width: 14px; font-weight: 600; color: var(--dsw-alias-brand-primary, #247bbf); }
.sa-sent-text { min-width: 0; }
.sa-sent-quote { padding-left: 8px; border-left: 2px solid var(--dsw-alias-border-l1, ButtonBorder);
  font-size: calc(12.5px + var(--dsh-content-font-delta, 0px) * 0.6); color: var(--dsw-alias-label-secondary, GrayText); white-space: pre-wrap; word-break: break-word; }
.sa-sent-note { margin-top: 4px; font-size: calc(14px + var(--dsh-content-font-delta, 0px) * 1); line-height: 1.6; color: var(--dsw-alias-label-primary, CanvasText); white-space: pre-wrap; word-break: break-word; }
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
`
