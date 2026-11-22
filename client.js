(() => {
  // src/core/styles.js
  var CSS = `
.sa-overlay { position: fixed; inset: 0; pointer-events: none; z-index: 60; }
/* 常驻划线：草稿用改版前的成功/警告底色（采纳=success、待办=warn），
   已发送条目用主题前景色的低透明度底色。*/
.sa-hl { position: fixed; pointer-events: none; border-radius: 3px; box-sizing: border-box;
  background: color-mix(in srgb, var(--dsw-alias-state-warn-primary, #f59e0b) 30%, transparent);
  box-shadow: inset 0 -1px 0 color-mix(in srgb, var(--dsw-alias-state-warn-primary, #f59e0b) 70%, transparent); }
.sa-hl[data-adopt="1"] {
  background: color-mix(in srgb, var(--dsw-alias-state-success-primary, #22c55e) 30%, transparent);
  box-shadow: inset 0 -1px 0 color-mix(in srgb, var(--dsw-alias-state-success-primary, #22c55e) 70%, transparent); }
.sa-hl[data-reject="1"] {
  background: color-mix(in srgb, var(--dsw-alias-state-error-primary, #e5484d) 30%, transparent);
  box-shadow: inset 0 -1px 0 color-mix(in srgb, var(--dsw-alias-state-error-primary, #e5484d) 70%, transparent); }
/* 一条批注可以同时含采纳句与否决句：只命中一句时整条按那句着色，
   两句都在时整条回到警告色，逐句的颜色交给备注正文表达。*/
.sa-hl[data-adopt="1"][data-reject="1"] {
  background: color-mix(in srgb, var(--dsw-alias-state-warn-primary, #f59e0b) 30%, transparent);
  box-shadow: inset 0 -1px 0 color-mix(in srgb, var(--dsw-alias-state-warn-primary, #f59e0b) 70%, transparent); }
/* 已发送的常驻色放在草稿的 data-adopt 之后：同权重时以主题色为准。
   下边线用虚线：这是绝对定位的高亮层，border-box 下加 border 不改整体高度。*/
.sa-hl.sa-hl-sent { background: color-mix(in srgb, var(--dsw-alias-label-primary) 15%, transparent);
  border-bottom: 1px dashed color-mix(in srgb, var(--dsw-alias-label-primary) 55%, transparent);
  box-shadow: none; }
/* 跳转闪烁：草稿在旧底色与主题色之间切，已发送在主题色与旧底色之间切；
   由 JS 每 250ms 换一次类名，亮/灭各三次。*/
.sa-hl.sa-hl-blink { background: color-mix(in srgb, var(--dsw-alias-label-primary) 15%, transparent);
  box-shadow: inset 0 -1px 0 color-mix(in srgb, var(--dsw-alias-label-primary) 34%, transparent); }
.sa-hl.sa-hl-sent.sa-hl-blink-sent { background: color-mix(in srgb, var(--dsw-alias-state-warn-primary, #f59e0b) 30%, transparent); }
.sa-hl.sa-hl-sent.sa-hl-blink-sent[data-adopt="1"] {
  background: color-mix(in srgb, var(--dsw-alias-state-success-primary, #22c55e) 30%, transparent); }
.sa-hl.sa-hl-sent.sa-hl-blink-sent[data-reject="1"] {
  background: color-mix(in srgb, var(--dsw-alias-state-error-primary, #e5484d) 30%, transparent); }
.sa-hl.sa-hl-sent.sa-hl-blink-sent[data-adopt="1"][data-reject="1"] {
  background: color-mix(in srgb, var(--dsw-alias-state-warn-primary, #f59e0b) 30%, transparent); }
/* 分段绘制：首末命中段之间没有命中的段只画下划线、不填底色。
   下划线沿用该条批注的常态色；已发送条目仍是主题色虚线，草稿按采纳/否决取色。*/
.sa-hl.sa-hl-part {
  background: transparent;
  box-shadow: inset 0 -1px 0 color-mix(in srgb, var(--dsw-alias-state-warn-primary, #f59e0b) 70%, transparent); }
.sa-hl.sa-hl-part[data-adopt="1"] {
  box-shadow: inset 0 -1px 0 color-mix(in srgb, var(--dsw-alias-state-success-primary, #22c55e) 70%, transparent); }
.sa-hl.sa-hl-part[data-reject="1"] {
  box-shadow: inset 0 -1px 0 color-mix(in srgb, var(--dsw-alias-state-error-primary, #e5484d) 70%, transparent); }
.sa-hl.sa-hl-part[data-adopt="1"][data-reject="1"] {
  box-shadow: inset 0 -1px 0 color-mix(in srgb, var(--dsw-alias-state-warn-primary, #f59e0b) 70%, transparent); }
/* 已发送的分段下划线放在最后：同权重时主题虚线优先于草稿的成功/警告色。*/
.sa-hl.sa-hl-sent.sa-hl-part {
  background: transparent;
  border-bottom: 1px dashed color-mix(in srgb, var(--dsw-alias-label-primary) 55%, transparent);
  box-shadow: none; }
/* 「查看出处」复用 .sa-reuse 那套 hover 文字按钮；这里只补工作区文件的置灰。*/
.sa-jump[data-disabled="1"] { opacity: 0.4; cursor: default; }
.sa-jump[data-disabled="1"]:hover { background: transparent; }
/* 已发送卡的引文块整块可点：悬停/键盘聚焦时从灰字回到正文色，并给出可点的指针。*/
.sa-quote-jump { cursor: pointer; transition: color 140ms ease; }
.sa-quote-jump:hover, .sa-quote-jump:focus-visible {
  color: var(--sa-dim-primary, var(--dsw-alias-label-primary, #e8e8ea)); }
.sa-quote-jump:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary, #247bbf); outline-offset: 2px; border-radius: 3px; }
/* 跳转失败提示：会话区没有面板提示位，短暂浮一条，不挡操作。*/
.sa-toast { position: fixed; left: 50%; bottom: 48px; z-index: 960; transform: translateX(-50%);
  padding: 6px 12px; border-radius: 8px; background: var(--dsw-alias-bg-layer-2, #2b2b2b);
  color: var(--dsw-alias-label-primary, #f0f0f0); font-size: 12px; line-height: 18px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.28); pointer-events: none; animation: sa-toast-in 160ms ease-out; }
@keyframes sa-toast-in { from { opacity: 0; transform: translate(-50%, 6px); } to { opacity: 1; transform: translate(-50%, 0); } }
/* 批注文字的墨色从主题前景色派生（同 dsh-todo-notes 的优先级着色）：普通批注走 warn 色相，采纳走 success 色相。*/
.sa-item-note, .sa-sent-note, .sa-q-note, .sa-pop-input, .sa-pop-read, .sa-token {
  color: var(--dsw-alias-state-warn-primary, #d29922); }
@supports (color: oklch(from #fff calc(l * 0.9) 0.1 80)) {
  .sa-item-note, .sa-sent-note, .sa-q-note, .sa-pop-input, .sa-pop-read, .sa-token {
    color: oklch(from var(--dsw-alias-label-primary, #e8e8ea) calc(l * 0.9) 0.12 85); }
}
.sa-item-note[data-adopt="1"], .sa-sent-note[data-adopt="1"], .sa-q-note[data-adopt="1"],
.sa-pop-input[data-adopt="1"], .sa-pop-read[data-adopt="1"], .sa-token {
  color: var(--dsw-alias-state-success-primary, #22c55e); }
@supports (color: oklch(from #fff calc(l * 0.9) 0.1 80)) {
  .sa-item-note[data-adopt="1"], .sa-sent-note[data-adopt="1"], .sa-q-note[data-adopt="1"],
  .sa-pop-input[data-adopt="1"], .sa-pop-read[data-adopt="1"], .sa-token {
    color: oklch(from var(--dsw-alias-label-primary, #e8e8ea) calc(l * 0.9) 0.13 150); }
}
/* 否决句走 error 色相；两条规则都放在采纳之后，同时命中时由这里覆盖回警告色。*/
.sa-item-note[data-reject="1"], .sa-sent-note[data-reject="1"], .sa-q-note[data-reject="1"],
.sa-pop-input[data-reject="1"], .sa-pop-read[data-reject="1"] {
  color: var(--dsw-alias-state-error-primary, #e5484d); }
@supports (color: oklch(from #fff calc(l * 0.9) 0.1 80)) {
  .sa-item-note[data-reject="1"], .sa-sent-note[data-reject="1"], .sa-q-note[data-reject="1"],
  .sa-pop-input[data-reject="1"], .sa-pop-read[data-reject="1"] {
    color: oklch(from var(--dsw-alias-label-primary, #e8e8ea) calc(l * 0.9) 0.14 25); }
}
/* 一条备注同时含两句：整条回到警告色，关键句由下面的片段类各自着色。*/
.sa-item-note[data-adopt="1"][data-reject="1"], .sa-sent-note[data-adopt="1"][data-reject="1"],
.sa-q-note[data-adopt="1"][data-reject="1"], .sa-pop-input[data-adopt="1"][data-reject="1"],
.sa-pop-read[data-adopt="1"][data-reject="1"] {
  color: var(--dsw-alias-state-warn-primary, #d29922); }
@supports (color: oklch(from #fff calc(l * 0.9) 0.1 80)) {
  .sa-item-note[data-adopt="1"][data-reject="1"], .sa-sent-note[data-adopt="1"][data-reject="1"],
  .sa-q-note[data-adopt="1"][data-reject="1"], .sa-pop-input[data-adopt="1"][data-reject="1"],
  .sa-pop-read[data-adopt="1"][data-reject="1"] {
    color: oklch(from var(--dsw-alias-label-primary, #e8e8ea) calc(l * 0.9) 0.12 85); }
}
.sa-note-adopt { color: var(--dsw-alias-state-success-primary, #22c55e); }
.sa-note-reject { color: var(--dsw-alias-state-error-primary, #e5484d); }
.sa-badge { position: fixed; pointer-events: auto; cursor: pointer; font: inherit; border: none; padding: 0 3px; min-width: 15px; height: 15px; padding: 0 3px; box-sizing: border-box;
  display: inline-flex; align-items: center; justify-content: center; border-radius: 8px;
  background: var(--dsw-alias-brand-primary, #247bbf); color: #fff; font-size: calc(10px + var(--dsh-content-font-delta, 0px) * 0.4); line-height: 1;
  font-weight: 600; font-variant-numeric: tabular-nums; }
.sa-toolbar { position: fixed; display: none; z-index: 61; gap: 0; padding: 2px; box-sizing: border-box;
  border-radius: 8px; background: var(--dsw-alias-bg-layer-2, Canvas);
  border: 1px solid var(--dsw-alias-border-l2, ButtonBorder); box-shadow: var(--dsw-elevation-panel, 0 4px 14px rgba(0,0,0,.18)); }
.sa-toolbar[data-open="1"] { display: inline-flex; }
/* 第一次露头瞬间到位；之后横向跟随改成滑过去，配合 1 秒去抖。 */
.sa-toolbar-follow { transition: left 220ms ease, top 220ms ease; }
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
  .sa-toolbar .sa-btn-reject, .sa-toolbar .sa-btn-reject:hover { color: var(--dsw-alias-state-error-primary, #e5484d); }
  .sa-btn-reject { border-color: var(--dsw-alias-state-error-primary, #e5484d); color: var(--dsw-alias-state-error-primary, #e5484d); }
.sa-popover { position: fixed; display: flex; flex-direction: column; z-index: 70; width: 340px; max-width: calc(100vw - 16px);
  overflow: hidden; overscroll-behavior: contain;
  padding: 10px; box-sizing: border-box; border-radius: 10px; color: var(--dsw-alias-label-primary, CanvasText);
  background: var(--dsw-alias-bg-layer-2, Canvas); border: 1px solid var(--dsw-alias-border-l2, ButtonBorder);
  box-shadow: var(--dsw-elevation-prominent, 0 10px 32px rgba(0,0,0,.24));
  opacity: 0; visibility: hidden; transform: translateY(-6px) scale(0.98);
  will-change: opacity, transform;
  transition: opacity 180ms ease, transform 180ms ease, visibility 180ms; }
.sa-popover[data-open="1"] { opacity: 1; visibility: visible; transform: none; }
/* 进入编辑、移动光标或键入时抬到最前层；比 DSH 的普通浮层高，但仍低于图片查看器。*/
/* 抬升只在编辑时生效，层级夹在 DSH 菜单（1100）与图片灯箱（1000）之下。*/
.sa-popover.sa-front { z-index: 950; }
.sa-viewer { position: fixed; inset: 0; z-index: 960; display: none; align-items: center; justify-content: center;
  background: rgb(0 0 0 / 0.72); cursor: zoom-out; }
.sa-viewer[data-open="1"] { display: flex; }
.sa-viewer-img { max-width: 92vw; max-height: 88vh; box-sizing: border-box; border-radius: 6px;
  background: #fff; box-shadow: 0 12px 48px rgb(0 0 0 / 0.5); }
.sa-pop-title { font-size: calc(12px + var(--dsh-content-font-delta, 0px) * 0.6); font-weight: 600; margin: 0 0 6px; }
.sa-pop-quote { flex: none; max-height: 120px; overflow: auto; overscroll-behavior: contain; margin: 0 0 8px; padding: 6px 8px; font-size: calc(12px + var(--dsh-content-font-delta, 0px) * 0.6);
  white-space: pre-wrap; word-break: break-word; color: var(--dsw-alias-label-secondary, GrayText);
  background: var(--dsw-alias-bg-layer-2, ButtonFace); border-left: 2px solid var(--dsw-alias-border-l2, ButtonBorder); border-radius: 4px; }
.sa-pop-src { margin: 0 0 6px; font-size: calc(10.5px + var(--dsh-content-font-delta, 0px) * 0.4); line-height: 1.45;
  color: var(--dsw-alias-label-tertiary, GrayText); }
.sa-pop-input { flex: 1 1 auto; width: 100%; box-sizing: border-box; min-height: 62px; padding: 6px 8px;
  font: inherit; font-size: calc(12px + var(--dsh-content-font-delta, 0px) * 0.6); color: var(--dsw-alias-label-primary, CanvasText); background: var(--dsw-alias-bg-layer-1, Canvas);
  border: 1px solid var(--dsw-alias-border-l1, ButtonBorder); border-radius: 6px; }
.sa-pop-input { white-space: pre-wrap; overflow-wrap: anywhere; overflow-y: auto; }
.sa-pop-input:focus-visible { outline: 2px solid var(--dsw-alias-state-business-primary, var(--dsw-alias-brand-primary, #247bbf)); outline-offset: 1px; }
.sa-pop-input[data-empty="1"]::before { content: attr(data-placeholder); color: var(--dsw-alias-label-tertiary, GrayText); pointer-events: none; }
.sa-pop-label { margin: 8px 0 4px; font-size: calc(11px + var(--dsh-content-font-delta, 0px) * 0.4); font-weight: 600;
  letter-spacing: .02em; color: var(--dsw-alias-label-secondary, GrayText); }
/* 已发送批注的只读正文：与编辑弹层同底座，没有输入框和按钮；文本仍可选中复制。*/
.sa-pop-read { flex: none; margin: 2px 0 2px; font-size: calc(12px + var(--dsh-content-font-delta, 0px) * 0.6);
  line-height: 1.6; white-space: pre-wrap; overflow-wrap: anywhere; user-select: text; }
/* 「引用原文」标题行：左标题、右跳转按钮，失败提示接在按钮后面。*/
.sa-pop-quote-head { display: flex; align-items: center; gap: 4px; margin: 8px 0 4px; }
.sa-pop-quote-head .sa-pop-label { flex: 1 1 auto; min-width: 0; margin: 0; }
/* 「批注」标题行：同一套左标题右跳转，只读态用它放第二个「查看出处」。*/
.sa-pop-note-head { display: flex; align-items: center; gap: 4px; margin: 8px 0 4px; }
.sa-pop-note-head .sa-pop-label { flex: 1 1 auto; min-width: 0; margin: 0; }
/* 只读面板的答复区：标题与结论胶囊同一行，正文只借文字，不搬答复卡的底色与内边距。*/
.sa-pop-reply-head { display: flex; align-items: center; gap: 6px; margin: 8px 0 4px; }
.sa-pop-reply-head .sa-pop-label { flex: none; margin: 0; }
.sa-pop-reply { flex: none; margin: 2px 0 4px; }
.sa-pop-reply-body { display: flex; flex-direction: column; gap: 4px; }
.sa-pop-reply-reason { font-size: calc(13px + var(--dsh-content-font-delta, 0px) * 0.6); line-height: 1.65;
  color: var(--dsw-alias-label-primary, CanvasText); white-space: pre-wrap; overflow-wrap: anywhere; user-select: text; }
.sa-pop-reply-reason[data-sa-md="1"] { white-space: normal; }
/* 「接下来」沿用答复卡里那个竖排标签，只去掉外面那层垫片与底色。*/
.sa-pop-reply-next { display: flex; align-items: center; gap: 8px; margin-top: 2px; }
.sa-pop-reply-next-label { flex: none; writing-mode: vertical-rl; text-orientation: upright; margin: 0; padding: 4px 2px;
  border-radius: 4px; font-size: calc(10.5px + var(--dsh-content-font-delta, 0px) * 0.4); font-weight: 400;
  letter-spacing: .08em; line-height: 1;
  color: var(--sa-tone, var(--dsw-alias-label-secondary, #8b949e));
  background: color-mix(in srgb, var(--sa-tone, var(--dsw-alias-border-l1, #888)) 16%, transparent); }
.sa-pop-reply-next-text { flex: 1 1 auto; min-width: 0; font-size: calc(12.5px + var(--dsh-content-font-delta, 0px) * 0.6);
  line-height: 1.5; color: var(--dsw-alias-label-secondary, #8b949e); }
.sa-pop-reply-next-text[data-sa-md="1"] { white-space: normal; }
.sa-pop-reply-next-text[data-sa-md="1"] :where(p, ul, ol, li, div, span, strong, em, code, a, blockquote) {
  font-size: inherit; line-height: inherit; color: inherit; }
.sa-pop-reply-next-text[data-sa-md="1"] :where(p, ul, ol, blockquote) { margin: 0; }
.sa-pop-reply-next-text[data-sa-md="1"] :where(p + p) { margin-top: 4px; }
.sa-pop-jump-hint { flex: 0 1 auto; min-width: 0; max-width: 60%; overflow: hidden; text-overflow: ellipsis;
  white-space: nowrap; font-size: 11px; line-height: 16px;
  color: var(--dsw-alias-state-warn-primary, #d29922); opacity: 0; transition: opacity 120ms ease; }
.sa-pop-jump-hint[data-on="1"] { opacity: 1; }
.sa-pop-jump-hint[data-on="0"] { display: none; }
.sa-pop-head { display: flex; align-items: center; justify-content: space-between; gap: 8px;
  margin: 0 0 6px; padding-bottom: 8px; border-bottom: 1px solid var(--dsw-alias-border-l1, ButtonBorder);
  cursor: move; user-select: none; touch-action: none; }
.sa-pop-dragging, .sa-pop-dragging * { cursor: grabbing !important; user-select: none; }
.sa-pop-head .sa-pop-title { margin: 0; }
/* 弹层内部布局：只有标题固定，来源、引用原文、备注、图片、动作行同住正文区一起滚。
   正文区纵排，输入框按 flex 吃掉面板多出来的高度；内容超出时由正文区滚，输入框自己不再出滚动条。*/
.sa-pop-body { display: flex; flex-direction: column; flex: 1 1 auto; min-height: 0; overflow-y: auto; overscroll-behavior: contain; }
/* 正文区改成 flex 纵排后相邻外边距不再合并，这几处还原原来的折叠间距。*/
.sa-pop-body > .sa-pop-src { margin-bottom: 0; }
.sa-pop-body > .sa-pop-quote { margin-bottom: 0; }
.sa-pop-body > .sa-pop-divider { margin-bottom: 0; }
/* 尺寸调整：四边各一条 5px 宽的命中区，右下角 12×12 的斜纹把手。*/
.sa-pop-resizer { position: absolute; z-index: 2; touch-action: none; }
.sa-pop-resizer[data-edge="left"] { top: 6px; bottom: 6px; left: 0; width: 5px; cursor: ew-resize; }
.sa-pop-resizer[data-edge="right"] { top: 6px; bottom: 6px; right: 0; width: 5px; cursor: ew-resize; }
.sa-pop-resizer[data-edge="top"] { left: 6px; right: 6px; top: 0; height: 5px; cursor: ns-resize; }
.sa-pop-resizer[data-edge="bottom"] { left: 6px; right: 6px; bottom: 0; height: 5px; cursor: ns-resize; }
.sa-pop-grip { right: 1px; bottom: 1px; width: 12px; height: 12px; border-radius: 3px; cursor: nwse-resize; }
.sa-pop-grip::before { content: ''; position: absolute; inset: 1px; border-radius: 2px;
  background-image: repeating-linear-gradient(135deg, transparent 0 2px, var(--dsw-alias-border-l2, ButtonBorder) 2px 3px); }
.sa-pop-grip:hover::before, .sa-pop-grip:focus-visible::before {
  background-image: repeating-linear-gradient(135deg, transparent 0 2px, var(--dsw-alias-brand-primary, #247bbf) 2px 3px); }
.sa-pop-grip:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary, #247bbf); outline-offset: 0; }
.sa-pop-resizing, .sa-pop-resizing * { user-select: none; }
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
.sa-token.sa-token-reject {
  background: color-mix(in srgb, var(--dsw-alias-state-error-primary, #e5484d) 15%, transparent);
  color: var(--dsw-alias-state-error-primary, #e5484d); }
.sa-ghost { position: fixed; z-index: 68; pointer-events: none; font-style: italic; white-space: pre;
  font-size: calc(13px + var(--dsh-content-font-delta, 0px) * 0.8); line-height: 1.6;
  color: var(--dsw-alias-label-tertiary, GrayText); opacity: .8; }
.sa-suggest { position: fixed; z-index: 75; margin: 0; padding: 4px 8px; font: inherit;
  font-size: calc(11px + var(--dsh-content-font-delta, 0px) * 0.4); color: var(--dsw-alias-brand-primary, #247bbf);
  background: var(--dsw-alias-bg-layer-1, Canvas); border: 1px dashed var(--dsw-alias-border-l2, ButtonBorder);
  border-radius: 6px; cursor: pointer; }
.sa-suggest:hover { background: var(--dsw-alias-interactive-bg-hover, ButtonFace); }
.sa-pop-actions { display: flex; align-items: center; gap: 6px; margin-top: 8px; flex: none; }
.sa-pop-spacer { flex: 1; }
.sa-pop-delete { color: var(--dsw-alias-state-error-primary, #e5484d); }
.sa-float { position: fixed; z-index: 63; max-width: calc(100vw - 16px); }
.sa-chip { display: inline-flex; align-items: center; gap: 5px; font: inherit; font-size: calc(12.5px + var(--dsh-content-font-delta, 0px) * 0.6); line-height: 1; padding: 5px 8px; cursor: pointer;
  color: var(--dsw-alias-label-secondary, #a3a3ab); background: transparent; border: 1px solid transparent; border-radius: 8px;
  transition: background 140ms ease, color 140ms ease, border-color 140ms ease; }
.sa-chip svg { flex: none; }
.sa-chip:hover { color: var(--dsw-alias-label-primary, #e8e8ea); background: var(--dsw-alias-bg-layer-2, rgb(255 255 255 / 0.06)); }
.sa-chip-open { color: var(--dsw-alias-brand-primary, #247bbf); background: color-mix(in srgb, var(--dsw-alias-brand-primary, #247bbf) 14%, transparent); border-color: color-mix(in srgb, var(--dsw-alias-brand-primary, #247bbf) 28%, transparent); }
.sa-chip-has { border-color: var(--dsw-alias-border-l2, ButtonBorder); }
.sa-chip-chevron { opacity: 0.65; transition: transform 160ms ease, opacity 160ms ease; }
.sa-chip:hover .sa-chip-chevron, .sa-chip-open .sa-chip-chevron { opacity: 1; }
.sa-chip-open .sa-chip-chevron { transform: rotate(180deg); }
.sa-chip:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary, #247bbf); outline-offset: 2px; }
.sa-panel { display: flex; flex-direction: column; width: min(560px, calc(100vw - 32px)); max-height: min(72vh, 600px);
  padding: 0; box-sizing: border-box; overflow: hidden; border-radius: 12px; color: var(--dsw-alias-label-primary, CanvasText);
  background: var(--dsw-alias-bg-layer-1, Canvas); border: 1px solid var(--dsw-alias-border-l2, ButtonBorder);
  box-shadow: 0 18px 48px rgb(0 0 0 / 0.28);
  opacity: 0; visibility: hidden; transform: translateY(6px) scale(0.98); will-change: opacity, transform;
  transition: opacity 180ms ease, transform 180ms ease, visibility 180ms; }
.sa-float[data-open="1"] .sa-panel { opacity: 1; visibility: visible; transform: none; }
.sa-side-host { display: flex; flex-direction: column; height: 100%; min-height: 0; overflow: hidden; }
.sa-panel-in-side { width: 100%; max-height: none; height: 100%; border: 0; border-radius: 0; box-shadow: none;
  background: transparent; opacity: 1; visibility: visible; transform: none; }
.sa-panel-head { display: flex; align-items: center; flex-wrap: wrap; row-gap: 4px; gap: 8px; flex: none; padding: 12px 14px 10px;
  border-bottom: 1px solid var(--dsw-alias-border-l1, ButtonBorder); }
.sa-panel-title { flex: none; min-width: 0; font-size: calc(13px + var(--dsh-content-font-delta, 0px) * 0.8); font-weight: 600; letter-spacing: 0.01em; }
.sa-build { flex: 0 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; font-size: calc(11px + var(--dsh-content-font-delta, 0px) * 0.4); font-style: italic;
  font-variant-numeric: tabular-nums; letter-spacing: 0.02em; color: var(--dsw-alias-label-tertiary, GrayText);
  user-select: text; white-space: nowrap; }
.sa-panel-meta { display: flex; align-items: center; gap: 6px; min-width: 0; flex: 1 1 auto; flex-wrap: wrap; justify-content: flex-end; row-gap: 4px; margin-left: auto; }
.sa-panel-collapse { flex: none; width: 20px; height: 20px; display: inline-flex; align-items: center; justify-content: center; padding: 0; border: 0; border-radius: 5px; background: transparent;
  color: var(--sa-dim-secondary, var(--dsw-alias-label-secondary, #a3a3ab)); cursor: pointer; }
.sa-panel-collapse svg { transition: transform 160ms ease; }
.sa-panel-collapse[aria-expanded="true"] svg { transform: rotate(90deg); }
.sa-panel-collapse:hover { background: var(--dsw-alias-interactive-bg-hover, rgb(255 255 255 / 0.08)); color: var(--sa-dim-primary, var(--dsw-alias-label-primary, #e8e8ea)); }
.sa-panel-collapsed .sa-panel-body, .sa-panel-collapsed .sa-panel-foot { display: none; }
.sa-panel-collapsed .sa-panel-head { border-bottom: 0; padding-bottom: 12px; }
.sa-panel-close { flex: none; width: 24px; height: 24px; display: inline-flex; align-items: center; justify-content: center; padding: 0; border: 0; border-radius: 6px; background: transparent;
  color: var(--sa-dim-secondary, var(--dsw-alias-label-secondary, #a3a3ab)); font: inherit; font-size: calc(16px + var(--dsh-content-font-delta, 0px) * 0.8); line-height: 1; cursor: pointer; }
.sa-panel-close:hover { background: var(--dsw-alias-interactive-bg-hover, rgb(255 255 255 / 0.08)); color: var(--sa-dim-primary, var(--dsw-alias-label-primary, #e8e8ea)); }
.sa-panel-close:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary, #247bbf); outline-offset: 1px; }
.sa-panel-foot { flex: none; display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 8px 14px 10px;
  border-top: 1px solid var(--dsw-alias-border-l1, ButtonBorder); }
.sa-panel-side { flex: none; width: 24px; height: 24px; display: inline-flex; align-items: center; justify-content: center; padding: 0; border: 0; border-radius: 6px; background: transparent;
  color: var(--sa-dim-secondary, var(--dsw-alias-label-secondary, #a3a3ab)); cursor: pointer; }
.sa-panel-side:hover { background: var(--dsw-alias-interactive-bg-hover, rgb(255 255 255 / 0.08)); color: var(--sa-dim-primary, var(--dsw-alias-label-primary, #e8e8ea)); }
.sa-panel-side:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary, #247bbf); outline-offset: 1px; }
.sa-side { display: flex; flex-direction: column; gap: 8px; padding: 10px 12px; overflow: auto; height: 100%; box-sizing: border-box; }
.sa-side-empty { padding: 16px 12px; font-size: calc(12.5px + var(--dsh-content-font-delta, 0px) * 0.6); color: var(--dsw-alias-label-tertiary, GrayText); }
.sa-side-item { display: flex; gap: 8px; padding: 8px 10px; border: 1px solid var(--dsw-alias-border-l1, ButtonBorder); border-radius: 8px; background: var(--dsw-alias-bg-layer-1, Canvas); }
.sa-side-num { flex: none; min-width: 18px; height: 18px; display: inline-flex; align-items: center; justify-content: center; border-radius: 999px;
  background: var(--dsw-alias-brand-primary, #247bbf); color: #fff; font-size: calc(10.5px + var(--dsh-content-font-delta, 0px) * 0.4); font-variant-numeric: tabular-nums; }
.sa-side-content { min-width: 0; display: flex; flex-direction: column; gap: 4px; }
.sa-side-quote { font-size: calc(12.5px + var(--dsh-content-font-delta, 0px) * 0.6); color: var(--dsw-alias-label-secondary, #a3a3ab); }
.sa-side-note { font-size: calc(13px + var(--dsh-content-font-delta, 0px) * 0.8); white-space: pre-wrap; word-break: break-word; }
.sa-side-adopt { color: var(--dsw-alias-state-success-primary, #3fb950); }
.sa-panel-hint { position: relative; min-width: 0; flex: 1 1 16em; max-width: 100%; display: inline-block; overflow: hidden; font-size: calc(11px + var(--dsh-content-font-delta, 0px) * 0.4);
  text-align: right;
  color: var(--dsw-alias-label-tertiary, GrayText); }
.sa-hint-layer { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sa-hint-layer.sa-hint-out { animation: sa-hint-out 160ms ease forwards; }
.sa-hint-layer.sa-hint-in { position: absolute; inset: 0; animation: sa-hint-in 300ms cubic-bezier(.22, .61, .36, 1) both; }
@keyframes sa-hint-out { to { opacity: 0; } }
@keyframes sa-hint-in { from { transform: translateX(100%); opacity: 0; } to { transform: none; opacity: 1; } }
.sa-panel-count { padding: 2px 7px; border-radius: 999px; flex: none; white-space: nowrap; font-size: calc(11px + var(--dsh-content-font-delta, 0px) * 0.4); font-variant-numeric: tabular-nums;
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
/* 总览的「查看出处」跟随条目悬停出现：与同条目的拷贝/编辑/删除同一时机、同一按钮样式。*/
.sa-item-jump { opacity: 0; transition: opacity 120ms ease; }
.sa-item:hover .sa-item-jump, .sa-item:focus-within .sa-item-jump { opacity: 1; }
.sa-item:hover .sa-item-jump[data-disabled="1"], .sa-item:focus-within .sa-item-jump[data-disabled="1"] { opacity: 0.45; }
.sa-item-action { font: inherit; font-size: calc(11.5px + var(--dsh-content-font-delta, 0px) * 0.4); padding: 2px 6px; border-radius: 5px; cursor: pointer;
  border: none; background: none; color: var(--dsw-alias-label-secondary, GrayText); }
.sa-item-action:hover { background: var(--dsw-alias-bg-layer-2, ButtonFace); color: var(--dsw-alias-label-primary, CanvasText); }
.sa-item-action.sa-danger:hover { color: var(--dsw-alias-state-error-primary, #e5484d); }
.sa-item-q { margin-top: 8px; padding-left: 10px; border-left: 2px solid var(--dsw-alias-border-l1, ButtonBorder); }
.sa-item-label { font-size: calc(10.5px + var(--dsh-content-font-delta, 0px) * 0.4); letter-spacing: 0.06em; color: var(--dsw-alias-label-secondary, GrayText); }
.sa-item-q-head { display: flex; align-items: center; gap: 2px; min-width: 0; }
.sa-item-q-head .sa-item-label { flex: 1 1 auto; min-width: 0; }
.sa-item-quote { margin: 3px 0 0; font-size: calc(12.5px + var(--dsh-content-font-delta, 0px) * 0.6); line-height: 1.7; white-space: pre-wrap; word-break: break-word;
  color: var(--dsw-alias-label-secondary, GrayText); display: -webkit-box; -webkit-box-orient: vertical;
  -webkit-line-clamp: 3; overflow: hidden; cursor: pointer; }
.sa-item-quote.sa-q-open { display: block; -webkit-line-clamp: unset; }
.sa-item-a { margin-top: 8px; }
.sa-item-note { margin: 3px 0 0; font-size: calc(14px + var(--dsh-content-font-delta, 0px) * 1); line-height: 1.7; white-space: pre-wrap; word-break: break-word;
  padding: 6px 8px; border-radius: 6px; background: var(--dsw-alias-bg-layer-1, ButtonFace); border: 1px solid transparent; cursor: pointer; }
.sa-item-note:hover { background: var(--dsw-alias-interactive-bg-hover, ButtonFace); border-color: var(--dsw-alias-border-l1, ButtonBorder); }
.sa-link { font: inherit; font-size: calc(11px + var(--dsh-content-font-delta, 0px) * 0.4); padding: 2px 4px; cursor: pointer; background: none; border: none;
  color: var(--dsw-alias-label-secondary, GrayText); text-decoration: underline; }
.sa-link:hover { color: var(--dsw-alias-state-error-primary, #e5484d); }
.sa-foot { display: flex; align-items: center; gap: 8px; }
.sa-foot-action { font: inherit; font-size: calc(11.5px + var(--dsh-content-font-delta, 0px) * 0.4); padding: 3px 8px; border-radius: 6px; flex: none; white-space: nowrap; cursor: pointer;
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
/* 只读面板的图片只展示，不给移除入口。*/
.sa-pop-images[data-readonly="1"] .sa-pop-image-remove { display: none; }
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
/* 面板里的单行设置项：与指令行的说明/恢复行同一套节奏，标签在上、输入占满、说明在下。*/
.sa-setting-block { display: flex; flex-direction: column; align-items: stretch; gap: 4px; margin-top: 6px; }
.sa-setting-label { font-size: calc(11px + var(--dsh-content-font-delta, 0px) * 0.4);
  color: var(--dsw-alias-label-secondary, GrayText); }
.sa-setting-input { width: 100%; box-sizing: border-box; padding: 6px 8px; font: inherit;
  font-size: calc(12px + var(--dsh-content-font-delta, 0px) * 0.6); line-height: 1.5; color: var(--dsw-alias-label-primary, CanvasText);
  background: var(--dsw-alias-bg-layer-2, ButtonFace); border: 1px solid var(--dsw-alias-border-l1, ButtonBorder); border-radius: 6px; }
.sa-setting-input:focus-visible, .sa-setting-textarea:focus-visible {
  outline: 2px solid var(--dsw-alias-state-business-primary, var(--dsw-alias-brand-primary, #247bbf)); outline-offset: 1px; }
.sa-settings .sa-hint { font-size: calc(11px + var(--dsh-content-font-delta, 0px) * 0.4); line-height: 1.6; margin: 0;
  color: var(--dsw-alias-label-tertiary, GrayText); }
.sa-settings-actions { display: flex; align-items: center; gap: 8px; margin-top: 4px; }
/* 面板设置块的折叠体：同一条 180ms 动画，避免展开/收起时视野瞬间跳动。*/
.sa-settings-body { display: grid; grid-template-rows: 0fr; opacity: 0;
  transition: grid-template-rows 180ms ease, opacity 180ms ease; }
.sa-settings-body[data-open="1"] { grid-template-rows: 1fr; opacity: 1; }
.sa-settings-inner { min-height: 0; overflow: hidden; display: flex; flex-direction: column; }
.sa-settings-inner > :first-child { margin-top: 6px; }
.sa-settings-restore { margin-left: auto; }
/* 收展图标在标题前，标题文字保持不变；展开时箭头转 90 度。*/
.sa-settings-toggle { display: inline-flex; align-items: center; gap: 4px; }
.sa-settings-toggle svg { flex: none; transition: transform 180ms ease; }
.sa-settings-toggle[aria-expanded="true"] svg { transform: rotate(90deg); }
.sa-setting-textarea-compact { min-height: 0; resize: none; }
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
.sa-setting-readonly { white-space: pre-wrap; overflow-wrap: anywhere; margin: 0; padding: 10px 12px;
  border-radius: 8px; background: var(--dsw-alias-bg-layer-1, Canvas); border: 1px solid var(--dsw-alias-border-l2, ButtonBorder);
  font-size: calc(12.5px + var(--dsh-content-font-delta, 0px) * 0.6); line-height: 1.7;
  color: var(--dsw-alias-label-primary, CanvasText); }
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
.sa-reuse { position: relative; flex: none; display: inline-flex; align-items: center;
  height: 24px; padding: 0 6px; margin-left: auto; border-radius: 6px; color: var(--sa-dim-tertiary);
  cursor: pointer; transition: background 120ms ease, color 120ms ease; }
.sa-reuse:hover { background: var(--dsw-alias-interactive-bg-hover, rgba(255, 255, 255, 0.08));
  color: var(--sa-dim-primary); }
.sa-reuse:focus-visible { background: var(--dsw-alias-interactive-bg-hover, rgba(255, 255, 255, 0.08));
  color: var(--sa-dim-primary); outline: 2px solid var(--dsw-alias-brand-primary, #247bbf); outline-offset: 1px; }
/* 文字始终占位，只切换透明度：悬停命中区域固定，不会随动画长大；图标固定贴右。 */
.sa-reuse-text { margin-right: 4px; white-space: nowrap; opacity: 0;
  font-size: calc(11.5px + var(--dsh-content-font-delta, 0px) * 0.4); line-height: 1.3;
  transition: opacity 160ms ease; }
.sa-reuse:hover .sa-reuse-text, .sa-reuse:focus-visible .sa-reuse-text { opacity: 1; }
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
.sa-q-head { display: flex; align-items: center; gap: 2px; min-width: 0; }
.sa-q-head .sa-q-label { flex: 1 1 auto; min-width: 0; }
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
.sa-a-next-label { flex: none; writing-mode: vertical-rl; text-orientation: upright; margin: 0; padding: 4px 2px; border-radius: 4px;
  font-size: calc(10.5px + var(--dsh-content-font-delta, 0px) * 0.4); font-weight: 400; letter-spacing: .08em; line-height: 1;
  color: var(--sa-tone, var(--dsw-alias-label-secondary, #8b949e));
  background: color-mix(in srgb, var(--sa-tone, var(--dsw-alias-border-l1, #888)) 16%, transparent); }
.sa-a-next { display: flex; align-items: center; gap: 8px; margin-top: 2px; padding: 6px 10px; border-radius: 6px;
  border-left: 2px solid var(--sa-tone, var(--dsw-alias-border-l1, ButtonBorder));
  background: var(--dsw-alias-bg-layer-2, #ffffff08); font-size: calc(12.5px + var(--dsh-content-font-delta, 0px) * 0.6); line-height: 1.5;
  color: var(--dsw-alias-label-secondary, #8b949e); }
.sa-a-next-text { flex: 1 1 auto; min-width: 0; }
/* 「下一步」用 Markdown 渲染后，DSH 的正文样式会把字号与颜色拉回与答复一致；
   这里把它按原来的层级压回去：字号 12.5、次要色、80% 亮度。 */
.sa-a-next-text[data-sa-md="1"] { white-space: normal; }
.sa-a-next-text[data-sa-md="1"] :where(p, ul, ol, li, div, span, strong, em, code, a, blockquote) {
  font-size: inherit; line-height: inherit; color: inherit; }
.sa-a-next-text[data-sa-md="1"] :where(p, ul, ol, blockquote) { margin: 0; }
.sa-a-next-text[data-sa-md="1"] :where(p + p) { margin-top: 4px; }
.sa-sent { display: block; margin: 8px 0 0; width: 100%; max-width: none; box-sizing: border-box; }
.sa-sent-body { margin: 0; padding: 6px 8px; box-sizing: border-box; border-radius: 8px;
  border: 1px solid var(--dsw-alias-border-l1, ButtonBorder); background: var(--dsw-alias-bg-layer-1, Canvas); }
/* 跳转落到卡片时闪三下：只提亮外圈，尺寸与底色不动，避免卡片轻微跳动。*/
.sa-sent.sa-sent-flash .sa-sent-body {
  border-color: color-mix(in srgb, var(--dsw-alias-brand-primary, #247bbf) 70%, transparent);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--dsw-alias-brand-primary, #247bbf) 28%, transparent); }
/* 批次没落库：标题后跟一个警告色小字，只占文字宽度，不改变标题行布局。*/
.sa-sent-unsynced { margin-left: 6px; font-size: 11px; font-weight: 600; line-height: 1.3; white-space: nowrap;
  color: var(--dsw-alias-state-warn-primary, #f59e0b); }
/* 会话回退标记过的批次：卡片与条目原样保留，标题后跟一个次要色小字，表示这一轮已经撤回。
   用次要色而非警告色：撤回是用户自己的动作，不是失败。*/
.sa-sent-rewound { margin-left: 6px; font-size: 11px; font-weight: 600; line-height: 1.3; white-space: nowrap;
  color: var(--dsw-alias-text-secondary, #8a8a8a); }
/* 已撤回的卡片整体压暗一点，但不隐藏：用户还要能读到当时批注了什么。*/
.sa-sent[data-sa-rewound="1"] .sa-sent-body { opacity: 0.72; }
/* 跳转落到答复卡/正文行时闪三下：只提亮外圈，尺寸与底色不动，避免落点轻微跳动。*/
.sa-reply-flash {
  outline: 2px solid color-mix(in srgb, var(--dsw-alias-brand-primary, #247bbf) 70%, transparent);
  outline-offset: 2px;
  border-radius: 8px; }
.sa-sent-item { display: flex; gap: 6px; padding: 8px 0; font-size: calc(12px + var(--dsh-content-font-delta, 0px) * 0.6); line-height: 1.5;
  border-top: 1px solid var(--dsw-alias-border-secondary, #3333); }
.sa-sent-item:first-child { border-top: none; padding-top: 0; }
.sa-sent-num { flex: none; min-width: 14px; font-weight: 600; color: var(--dsw-alias-brand-primary, #247bbf); }
.sa-sent-text { min-width: 0; }
.sa-sent-quote-row { display: flex; align-items: flex-start; gap: 2px; min-width: 0; }
.sa-sent-quote-row .sa-sent-quote { flex: 1 1 auto; min-width: 0; }
.sa-sent-quote { padding-left: 8px; border-left: 2px solid var(--dsw-alias-border-l1, ButtonBorder);
  font-size: calc(12.5px + var(--dsh-content-font-delta, 0px) * 0.6); color: var(--dsw-alias-label-secondary, GrayText); white-space: pre-wrap; word-break: break-word; }
.sa-sent-note { margin-top: 4px; font-size: calc(14px + var(--dsh-content-font-delta, 0px) * 1); line-height: 1.6; white-space: pre-wrap; word-break: break-word; }
.sa-sent-thumbs { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 6px; }
/* 已发送批注里的附图：边长跟内容字号走（5 倍），Ctrl +/- 放大缩小时一起变。*/
.sa-sent-thumb { width: calc(var(--dsh-content-font-size, 14px) * 5); height: calc(var(--dsh-content-font-size, 14px) * 5);
  object-fit: cover; border-radius: 6px; cursor: zoom-in; display: block; }
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

  // src/core/side-tab-state.js
  var SIDE_TAB_ACTION = {
    /** 页签不存在：打开它。 */
    open: "open",
    /** 页签开着、侧栏展开、且处于激活：关闭它。 */
    close: "close",
    /** 页签开着、侧栏展开、但用户切到了别的页签：聚焦回它。 */
    focus: "focus",
    /** 页签开着但侧栏收成窄条：先展开再聚焦。 */
    reveal: "reveal"
  };
  function sideTabAction({ hasTab, expanded, active } = {}) {
    if (hasTab !== true) return SIDE_TAB_ACTION.open;
    if (expanded !== true) return SIDE_TAB_ACTION.reveal;
    if (active !== true) return SIDE_TAB_ACTION.focus;
    return SIDE_TAB_ACTION.close;
  }

  // src/core/config.js
  var ANNOTATION_FILE = "批注.json";
  var PAYLOAD_KIND = "dsh-selection-annotations";
  var MAX_QUOTE = 1600;
  var MAX_NOTE = 4e3;
  var MAX_IMAGES_PER_ANNOTATION = 4;
  var MAX_IMAGE_BYTES = 8 * 1024 * 1024;
  var IMAGE_SETTINGS_KEY = "dsh-selection-annotations:image-settings";
  var DEFAULT_IMAGE_SETTINGS = { compress: true, quality: 0.8, minSize: 100, webShot: "element" };
  var INSTRUCTION_SETTINGS_KEY = "dsh-selection-annotations:instruction-settings";
  var ADOPT_SETTINGS_KEY = "dsh-selection-annotations:adopt-settings";
  var DEFAULT_ADOPT_TEXT = "【意见采纳】";
  var REJECT_SETTINGS_KEY = "dsh-selection-annotations:reject-settings";
  var DEFAULT_REJECT_TEXT = "【意见否决】";
  var FALLBACK_SETTINGS_KEY = "dsh-selection-annotations:fallback-settings";
  var POPOVER_SIZE_KEY = "dsh-selection-annotations:popover-size";
  var DEFAULT_FALLBACK_TEXT = "此轮对话内容均在批注中给出，总计 {count} 条批注。\n此轮消息发起时间：{time}";
  var DEFAULT_INSTRUCTION = [
    "这是用户随消息附上的批注数据块，与本轮用户正文同属一条用户消息：正文可能在前，也可能只有这份数据。\n",
    "\n",
    "## 怎么读\n",
    "- `quote`：用户选中的原文。\n",
    "- `uuid`：每条顶层自带 `uuid`，它是答复这一条的唯一依据；从捕获到入库不会变，不要拿序号或轮次替代。\n",
    "- `source`：位置。工作区文件用 `path` + `lineStart/lineEnd`（1 基行号）+ `charStart/charEnd`；对话消息用 `role` + `anchorKey` + `charStart/charEnd`。\n",
    '- `kind: "reply"`（逐条答复区域）：`batchAt` 是批次时间戳，`uuid` 是条目 uuid，`index` 是序号（只供阅读），`field` 取 `quote` / `note` / `reason` / `next`（跨字段为 `item`）。\n',
    '- `kind: "sent"`（已发送批注区域）：`anchorKey` 是卡片所属消息，顶层 `uuid` 是这条批注的 uuid，`source.uuid`（若有）只说明它引用了哪条已发送批注，不是答复目标；`index` 只供阅读。\n',
    '- `charStart/charEnd`：半开区间。`textOrigin: "source"` 指文件原文偏移，`"rendered"` 指渲染文本偏移；能读原文时优先 source。\n',
    "- `images`：该条批注的图片，`order` 是它在消息图片附件里的 1 基顺序。\n",
    "\n",
    "## 怎么答\n",
    "- 处理完必须调用 `annotation_replies` 工具，不要在正文里逐条重复。\n",
    "- replies 里每一项用该条批注顶层的 `uuid` 指定，`uuid` 是唯一依据，不要传序号、轮次。\n",
    "- `verdict` 取 `accepted` / `partial` / `rejected` / `needs_info`。\n",
    "- `reason` 写的内容：基于轮次综合受理结论的视角，逐个应答单条批注的回复。\n",
    "- `next` 写的内容：基于答单条批注的回复内容，对应接下来的具体预期、做法方案。\n",
    "- `reason` 与  `next` 内容均以 Markdown 渲染，加粗、行内代码、代码块与表格都可用；表达上要优先给子弹式要点列表，之后再给相关阐述。\n",
    "- 正文只写整体说明或需要澄清的问题。"
  ].join("");
  var DEFAULT_INSTRUCTION_EN = [
    "This annotation payload was attached by the user to this message and is part of the user instruction, together with the body (which may come before it, or be absent entirely).\n",
    "\n",
    "## How to read it\n",
    "- `quote`: the text the user selected.\n",
    "- `uuid`: every annotation carries a top-level `uuid`; it is the only key for replying to that annotation. It does not change from capture to storage — do not substitute the sequence number or the turn.\n",
    "- `source`: the position. Workspace files use `path` + `lineStart/lineEnd` (1-based lines) + `charStart/charEnd`; chat messages use `role` + `anchorKey` + `charStart/charEnd`.\n",
    '- `kind: "reply"` (per-answer area): `batchAt` is the batch timestamp, `uuid` is the entry uuid, `index` is the sequence number (for reading only), `field` is `quote` / `note` / `reason` / `next` (`item` when the selection spans fields).\n',
    '- `kind: "sent"` (sent-annotations area): `anchorKey` is the message the card belongs to; the top-level `uuid` is this annotation\'s uuid; `source.uuid` (when present) only says which sent annotation it references — it is not the reply target; `index` is for reading only.\n',
    '- `charStart/charEnd`: a half-open range. `textOrigin: "source"` means offsets in the original file text, `"rendered"` means offsets in the rendered text; prefer source when the file can be read.\n',
    "- `images`: images attached to that annotation; `order` is the 1-based position among this message's image attachments.\n",
    "\n",
    "## How to answer\n",
    "- When done, you must call the `annotation_replies` tool instead of repeating replies in the body.\n",
    "- Each entry in replies names its annotation by that annotation's top-level `uuid`; the `uuid` is the only key — do not pass the sequence number or the turn.\n",
    "- `verdict` is `accepted` / `partial` / `rejected` / `needs_info`.\n",
    "- `reason` explains the verdict for that annotation, in the context of the whole turn.\n",
    "- `next` states the concrete expectation or plan that follows from the reply to that annotation.\n",
    "- `reason` and `next` render as Markdown: bold, inline code, code fences and tables are supported; prefer bullet lists first, then the supporting explanation.\n",
    "- Use the body only for an overall summary or clarifying questions."
  ].join("");
  var LOCALE_NS = "selection-annotations";
  var PLUGIN_BUILD = "2.1.1";
  var DRAFT_STORAGE_PREFIX = "dsh-selection-annotations:draft:";
  var DRAFT_MAX_SESSIONS = 24;
  var DRAFT_MAX_ITEMS = 200;
  var SENT_STORAGE_PREFIX = "dsh-selection-annotations:sent:";
  var SENT_MAX_ENTRIES = 120;
  var SENT_MAX_BYTES = 2 * 1024 * 1024;
  var REPLY_POLL_MS = 6e3;
  var SENT_PENDING_TTL_MS = 6e4;

  // src/core/constants.js
  var DRAFT_MAX_BYTES = 3.5 * 1024 * 1024;
  var HOVER_OPEN_DELAY_MS = 500;
  var SETTLE_MS = 220;
  var UPLOAD_DEBOUNCE_MS = 450;
  var POP_AUTO_SAVE_MS = 300;
  var JUMP_NAV_TIMEOUT_MS = 3e3;
  var JUMP_NAV_POLL_MS = 120;
  var JUMP_SCROLL_GRACE_MS = 1500;
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

  // src/core/messages.js
  var MESSAGES = {
    zh: {
      annotate: "批注反馈",
      "annotate.adopt": "批注采纳",
      "annotate.reject": "批注否决",
      "annotate.copy": "复制",
      "menu.annotate": "为划选部分批注反馈",
      "menu.adopt": "为划选部分批注采纳",
      "menu.reject": "为划选部分批注否决",
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
      "pop.sentTitle": "已发送批注",
      "pop.noNote": "无备注",
      "pop.resize": "调整面板大小",
      "panel.empty": "选中回复、消息或文件预览里的文字，点浮动的「批注反馈」即可。",
      "panel.title": "批注总览",
      "panel.count": "{n} 条",
      "panel.drag": "拖动排序",
      "panel.edit": "编辑",
      "panel.delete": "删除",
      "panel.quote": "引用原文",
      "panel.note": "批注",
      "panel.clear": "清空",
      "panel.copyAll": "拷贝",
      "panel.paste": "粘贴",
      "panel.copy": "拷贝",
      "panel.pasteFailed": "剪贴板里没有可导入的批注数据",
      "panel.pasteDone": "已导入 {n} 条批注",
      "panel.pasteNothing": "没有新的批注可粘贴",
      "panel.copyDone": "已拷贝 {n} 条批注",
      "panel.copyFailed": "拷贝失败：浏览器拒绝了剪贴板写入",
      "panel.webPick": "拾取网页元素",
      "panel.close": "关闭批注总览",
      "panel.collapse": "收起或展开批注总览",
      "webPick.missing": "没有找到内嵌浏览器，请先在侧栏打开网页。",
      "panel.foot": "发送时批注作为独立块随消息提交",
      "panel.sideTab": "在右侧边栏打开批注",
      "panel.sideTabClose": "关闭右侧批注标签页",
      "sideTab.title": "批注总览",
      "sideTab.empty": "还没有批注",
      "panel.refineFailed": "位置精修未生效：{reason}",
      "settings.imagesOpen": "收起图片设置",
      "settings.imagesClosed": "图片设置",
      "settings.imagesOn": "压缩为 JPEG {n}%",
      "settings.imagesOff": "不压缩，原样发送",
      "settings.compress": " 压缩图片（JPEG）",
      "settings.quality": "质量 ",
      "settings.minSizeBefore": "最短边超过 ",
      "settings.minSizeAfter": " 像素才压缩",
      "settings.webShot": "网页元素批注自动截图 ",
      "settings.webShotOff": "停用",
      "settings.webShotElement": "仅目标元素本身",
      "settings.webShotPage": "完整页面",
      "settings.instructionOpen": "收起批注指令",
      "settings.instructionClosed": "批注指令",
      "settings.pageTitle": "批注指令",
      "settings.adoptLabel": "「批注采纳」预填文本",
      "settings.adoptHint": "采纳模式下自动写入批注正文的句子；输入前缀会出现补全提示。",
      "settings.rejectLabel": "「批注否决」预填文本",
      "settings.rejectHint": "否决模式下自动写入批注正文的句子，随后打开编辑面板补充理由。",
      "settings.fallbackLabel": "空提示词填充",
      "settings.fallbackHint": "只带批注、正文为空时自动填入；{count} 换成批注条数，{time} 换成发送时间。留空则使用默认文案。",
      "settings.fallbackOpen": "收起空提示词设置",
      "settings.fallbackClosed": "空提示词填充",
      "settings.fallbackOff": "已关闭（正文为空时不填充）",
      "settings.fallbackOn": "已启用",
      "settings.fallbackField": "只带批注时自动填入的正文",
      "settings.default": "默认文案",
      "settings.customized": "已自定义",
      "settings.restore": "恢复默认",
      "settings.instrHint": "删掉「必须调用annotation_replies」那句会让逐条答复失效",
      "settings.pageHint": "这段文字随每条批注一起发给模型。删掉「必须调用 annotation_replies」那句，逐条答复会失效。",
      "settings.section.hint": "只读展示当前生效的设置；修改请到插件详情页的「划选批注」配置区。",
      "settings.section.title": "划选批注",
      "settings.section.imagesTitle": "图片随批注发送",
      "settings.section.imagesHint": "批注里的图片会随这条批注一起发送；这里同时列出自动截图与压缩的当前取值。",
      "settings.section.imagesSent": "随批注发送：是（手动添加或网页元素自动截图的图片都算）。",
      "settings.section.imagesDetail": "网页元素自动截图：{shot}；图片压缩：{compression}。",
      "chip.emptyTitle": "还没有批注：选中正文或文件里的文字后点浮动「批注」",
      "chip.title": "查看 / 管理批注",
      "chip.label": "批注",
      "chip.count": "批注 ×{n}",
      "sent.title": "已发送批注 ×{n}",
      "sent.unsynced": "未同步",
      "sent.rewound": "已撤回",
      "gate.failed": "批注没存进库，这条消息没有发出去",
      "sent.reuse": "回放所有批注",
      "sent.replayItem": "回放批注",
      "sent.replayCopied": "因批注已被答复，当前仅将重放数据写入剪贴板，必要时可自主粘贴",
      "reuse.hint": "按原样添加到待发送的批注队列",
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
      "jump.label": "查看出处",
      "jump.hint": "跳回这段引用的正文位置",
      "jump.file": "这条出自工作区文件",
      "jump.noAnchor": "这条找不到可定位的正文",
      "jump.noReply": "没有可回访的答复",
      "jump.noCard": "没有可回访的位置",
      "jump.notLoaded": "第 {n} 轮还没加载",
      "reply.index": "批注 {n}",
      "reply.fallbackLabel": "批注 {n} · 答复",
      "next.label": "接下来",
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
      "source.web": "网页 `{url}` · 选择器 `{selector}`",
      "source.webShort": "网页 · {url}",
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
      "annotate.reject": "Reject",
      "annotate.copy": "Copy",
      "menu.annotate": "Feedback on selection",
      "menu.adopt": "Adopt selection",
      "menu.reject": "Reject selection",
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
      "pop.sentTitle": "Sent annotation",
      "pop.noNote": "No note",
      "pop.resize": "Resize panel",
      "panel.empty": "Select text in a reply, message, or file preview, then click the floating “Feedback”.",
      "panel.title": "Annotations",
      "panel.count": "{n} items",
      "panel.drag": "Drag to reorder",
      "panel.edit": "Edit",
      "panel.delete": "Delete",
      "panel.quote": "Quoted text",
      "panel.note": "Note",
      "panel.clear": "Clear",
      "panel.copyAll": "Copy",
      "panel.paste": "Paste",
      "panel.copy": "Copy",
      "panel.pasteFailed": "No annotation data in the clipboard",
      "panel.pasteDone": "Imported {n} annotations",
      "panel.pasteNothing": "No new annotations to paste",
      "panel.copyDone": "Copied {n} annotations",
      "panel.copyFailed": "Copy failed: the browser refused the clipboard write",
      "panel.webPick": "Pick page element",
      "panel.close": "Close annotations",
      "panel.collapse": "Collapse or expand annotations",
      "webPick.missing": "No embedded browser found. Open a page in the sidebar first.",
      "panel.foot": "Annotations are sent as a separate block with the message",
      "panel.sideTab": "Open annotations in the right sidebar",
      "panel.sideTabClose": "Close the annotations sidebar tab",
      "sideTab.title": "Annotations",
      "sideTab.empty": "No annotations yet",
      "panel.refineFailed": "Position refinement failed: {reason}",
      "settings.imagesOpen": "Hide image settings",
      "settings.imagesClosed": "Image settings",
      "settings.imagesOn": "Compress to JPEG {n}%",
      "settings.imagesOff": "Send originals without compression",
      "settings.compress": " Compress images (JPEG)",
      "settings.quality": "Quality ",
      "settings.minSizeBefore": "Compress only when the shortest side exceeds ",
      "settings.minSizeAfter": " px",
      "settings.webShot": "Auto screenshot for web page annotations ",
      "settings.webShotOff": "Off",
      "settings.webShotElement": "Target element only",
      "settings.webShotPage": "Full page",
      "settings.instructionOpen": "Hide annotation instruction",
      "settings.instructionClosed": "Annotation instruction",
      "settings.pageTitle": "Annotation instruction",
      "settings.adoptLabel": "Prefilled “Adopt” text",
      "settings.adoptHint": "Written into the note in Adopt mode; typing a prefix shows an inline completion.",
      "settings.rejectLabel": "Prefilled “Reject” text",
      "settings.rejectHint": "Written into the note in Reject mode; the editor opens so you can add a reason.",
      "settings.fallbackLabel": "Empty prompt fallback",
      "settings.fallbackHint": "Filled into the message body when you send only annotations and the prompt is empty. {count} becomes the annotation count, {time} the send time. Leave it empty to use the default text.",
      "settings.fallbackOpen": "Hide empty prompt fallback",
      "settings.fallbackClosed": "Empty prompt fallback",
      "settings.fallbackOff": "Off (nothing is filled when the prompt is empty)",
      "settings.fallbackOn": "On",
      "settings.fallbackField": "Body filled when only annotations are attached",
      "settings.default": "Default text",
      "settings.customized": "Customized",
      "settings.restore": "Restore default",
      "settings.instrHint": "Removing the sentence that requires annotation_replies disables per-annotation replies",
      "settings.pageHint": "This text is sent to the model with every annotation. Removing the sentence that requires annotation_replies disables per-annotation replies.",
      "settings.section.hint": "Read-only view of the settings in effect; edit them in the “Selection annotations” section on the plugin detail page.",
      "settings.section.title": "Selection annotations",
      "settings.section.imagesTitle": "Images sent with annotations",
      "settings.section.imagesHint": "Images attached to an annotation are sent with it; the current auto-screenshot and compression values are listed here.",
      "settings.section.imagesSent": "Sent with annotations: yes (images you add or that are captured for a web annotation).",
      "settings.section.imagesDetail": "Auto screenshot for web annotations: {shot}; image compression: {compression}.",
      "chip.emptyTitle": "No annotations yet: select text in the body or a file, then click the floating “Feedback”",
      "chip.title": "View / manage annotations",
      "chip.label": "Annotate",
      "chip.count": "Annotate ×{n}",
      "sent.title": "Sent annotations ×{n}",
      "sent.unsynced": "Not synced",
      "sent.rewound": "Withdrawn",
      "gate.failed": "Annotations were not saved, so this message was not sent",
      "sent.reuse": "Replay all annotations",
      "sent.replayItem": "Replay annotation",
      "sent.replayCopied": "This annotation has already been answered, so the replay data was copied to the clipboard only — paste it yourself if needed",
      "reuse.hint": "Add to the pending annotation queue as-is",
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
      "jump.label": "View source",
      "jump.hint": "Jump back to where this quote came from",
      "jump.file": "This one comes from a workspace file",
      "jump.noAnchor": "No locatable text for this one",
      "jump.noReply": "No reply to return to",
      "jump.noCard": "No annotation card to return to",
      "jump.notLoaded": "Turn {n} is not loaded yet",
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
      "source.web": "Web page `{url}` · selector `{selector}`",
      "source.webShort": "Web · {url}",
      "source.span": ", chars {a}–{b}",
      "source.selection": "Page selection",
      "source.fileFallback": "File",
      "source.replyShort": "Reply to annotation {n}",
      "source.sentShort": "Sent annotation {n}",
      "source.rendered": " (rendered position)"
    }
  };

  // src/core/util.js
  var safe = (fn, onError) => {
    try {
      return fn();
    } catch (error) {
      if (typeof onError === "function") {
        try {
          onError(error);
        } catch {
        }
      }
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
  function hashString(input) {
    const text = typeof input === "string" ? input : JSON.stringify(input ?? null);
    let hash = 5381;
    for (let i = 0; i < text.length; i += 1) hash = (hash << 5) + hash + text.charCodeAt(i) | 0;
    return (hash >>> 0).toString(36);
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
    const byKey = /* @__PURE__ */ new Map();
    for (const batch of batches) {
      for (const reply of batch.replies) {
        if (reply === null || typeof reply !== "object") continue;
        const index = Number(reply.index);
        if (!Number.isFinite(index)) continue;
        const uuid = typeof reply.uuid === "string" && reply.uuid !== "" ? reply.uuid : void 0;
        const key = uuid !== void 0 ? `uuid:${uuid}` : `index:${index}`;
        byKey.set(key, { ...reply, index, ...uuid !== void 0 ? { uuid } : {}, at: Number(batch.at) || 0 });
      }
    }
    return [...byKey.values()].sort(
      (a, b) => a.index - b.index || a.at - b.at || String(a.uuid ?? "").localeCompare(String(b.uuid ?? ""))
    );
  }
  function shouldDiscardEmpty(mode, note, images) {
    if (mode === "edit") return false;
    if (typeof note === "string" && note.trim() !== "") return false;
    return !Array.isArray(images) || images.length === 0;
  }

  // src/core/session.js
  function createSessionApi(ctx, getLatestSessionId) {
    function currentSessionId() {
      const main = safe(() => {
        const byId = ctx.sessions?.list?.getSnapshot?.()?.byId;
        if (byId === void 0 || byId === null) return void 0;
        for (const candidate of Object.values(byId)) {
          if ((candidate?.retainedBy?.mainView ?? 0) > 0 && typeof candidate.id === "string") return candidate.id;
        }
        return void 0;
      });
      if (main !== void 0) return main;
      const fromUi = safe(() => {
        const binding = ctx.get("uiSession")?.adapter?.current?.getSnapshot?.();
        return typeof binding?.key === "string" && binding.key !== "" ? binding.key : void 0;
      });
      if (fromUi !== void 0) return fromUi;
      const latest = getLatestSessionId();
      if (typeof latest === "string" && latest !== "") return latest;
      return safe(() => {
        const snap = ctx.sessions?.list?.getSnapshot?.();
        if (snap === void 0 || snap === null) return void 0;
        if (typeof snap.current === "string" && snap.current !== "") return snap.current;
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
    let rejectText;
    let fallbackText;
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
      const webShot = parsed.webShot;
      if (webShot === "off" || webShot === "element" || webShot === "page") settings.webShot = webShot;
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
      if (parsed.version === void 0 && (text === "意见采纳。" || text === "意见采纳")) return DEFAULT_ADOPT_TEXT;
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
      safe(() => storage.setItem(ADOPT_SETTINGS_KEY, JSON.stringify({ text: adoptText, version: 1 })));
    }
    function loadRejectText() {
      const storage = getStorage();
      if (storage === void 0) return DEFAULT_REJECT_TEXT;
      const parsed = safe(() => JSON.parse(storage.getItem(REJECT_SETTINGS_KEY) ?? "null"));
      if (parsed === null || typeof parsed !== "object") return DEFAULT_REJECT_TEXT;
      const text = typeof parsed.text === "string" ? parsed.text.trim() : "";
      return text === "" ? DEFAULT_REJECT_TEXT : text;
    }
    function rejectTextOf() {
      if (rejectText === void 0) rejectText = loadRejectText();
      return rejectText;
    }
    function persistRejectText(text) {
      rejectText = typeof text === "string" && text.trim() !== "" ? text : DEFAULT_REJECT_TEXT;
      const storage = getStorage();
      if (storage === void 0) return;
      safe(() => storage.setItem(REJECT_SETTINGS_KEY, JSON.stringify({ text: rejectText, version: 1 })));
    }
    function loadFallbackText() {
      const storage = getStorage();
      if (storage === void 0) return DEFAULT_FALLBACK_TEXT;
      const parsed = safe(() => JSON.parse(storage.getItem(FALLBACK_SETTINGS_KEY) ?? "null"));
      if (parsed === null || typeof parsed !== "object") return DEFAULT_FALLBACK_TEXT;
      const text = typeof parsed.text === "string" ? parsed.text : "";
      if (text.trim() === "") return DEFAULT_FALLBACK_TEXT;
      if (parsed.version === void 0) {
        if (text === "请按批注内容处理。") return DEFAULT_FALLBACK_TEXT;
        if (text.startsWith("此轮对话内容均在批注中给出") && text.includes("请逐一受理")) return DEFAULT_FALLBACK_TEXT;
      }
      return text;
    }
    function fallbackTextOf() {
      if (fallbackText === void 0) fallbackText = loadFallbackText();
      return fallbackText;
    }
    function persistFallbackText(text) {
      fallbackText = typeof text === "string" ? text : "";
      const storage = getStorage();
      if (storage === void 0) return;
      safe(() => storage.setItem(FALLBACK_SETTINGS_KEY, JSON.stringify({ text: fallbackText, version: 1 })));
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
      persistAdoptText,
      loadRejectText,
      rejectTextOf,
      persistRejectText,
      loadFallbackText,
      fallbackTextOf,
      persistFallbackText
    };
  }

  // src/core/payload.js
  var MAX_PAYLOAD_SEGMENTS = 8;
  function finiteSpan(segment) {
    if (segment === null || typeof segment !== "object" || Array.isArray(segment)) return false;
    const { charStart, charEnd, quoteStart, quoteEnd } = segment;
    if (![charStart, charEnd, quoteStart, quoteEnd].every(Number.isFinite)) return false;
    if (charStart < 0 || charEnd <= charStart) return false;
    if (quoteStart < 0 || quoteEnd <= quoteStart) return false;
    return charEnd - charStart === quoteEnd - quoteStart;
  }
  function payloadSegments(list) {
    if (!Array.isArray(list)) return void 0;
    const out = [];
    for (const segment of list) {
      if (out.length >= MAX_PAYLOAD_SEGMENTS) break;
      if (!finiteSpan(segment)) continue;
      const entry = {};
      if (typeof segment.anchorKey === "string") entry.anchorKey = segment.anchorKey;
      entry.textOrigin = segment.textOrigin === "source" ? "source" : "rendered";
      entry.charStart = segment.charStart;
      entry.charEnd = segment.charEnd;
      entry.quoteStart = segment.quoteStart;
      entry.quoteEnd = segment.quoteEnd;
      if (typeof segment.fingerprintBefore === "string") entry.fingerprintBefore = segment.fingerprintBefore;
      if (typeof segment.fingerprintAfter === "string") entry.fingerprintAfter = segment.fingerprintAfter;
      out.push(entry);
    }
    return out.length > 0 ? out : void 0;
  }
  function createPayload({ t, instructionOf, uuidOfSent }) {
    function sentUuidOf(source) {
      if (typeof uuidOfSent !== "function") return void 0;
      try {
        const uuid = uuidOfSent(source);
        return typeof uuid === "string" && uuid !== "" ? uuid : void 0;
      } catch {
        return void 0;
      }
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
      if (source.kind === "web") {
        return t("source.web", {
          url: typeof source.path === "string" && source.path !== "" ? source.path : t("source.pathUnknown"),
          selector: typeof source.anchorKey === "string" && source.anchorKey !== "" ? source.anchorKey : "-"
        });
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
        if (Number.isFinite(source.turn)) out.turn = source.turn;
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
        const uuid = typeof source.uuid === "string" && source.uuid !== "" ? source.uuid : sentUuidOf(source);
        if (typeof uuid === "string" && uuid !== "") out.uuid = uuid;
      } else if (source?.kind === "web") {
        if (typeof source.anchorKey === "string" && source.anchorKey !== "") out.anchorKey = source.anchorKey;
        if (typeof source.path === "string" && source.path !== "") out.path = source.path;
      }
      if (out.kind === "file" || out.kind === "message" || out.kind === "reply" || out.kind === "sent" || out.kind === "web") {
        out.textOrigin = source?.textOrigin === "source" ? "source" : "rendered";
      }
      if (Number.isFinite(source?.charStart)) out.charStart = source.charStart;
      if (Number.isFinite(source?.charEnd)) out.charEnd = source.charEnd;
      const segments = payloadSegments(source?.segments);
      if (segments !== void 0) {
        out.segments = segments;
        if (source?.segmentsTruncated === true) out.segmentsTruncated = true;
      }
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
        const uuid = typeof item.uuid === "string" && item.uuid !== "" ? item.uuid : void 0;
        if (uuid !== void 0) entry.uuid = uuid;
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
  function matchInRootNormalized(root, needle, savedOffset) {
    if (root === null || root === void 0) return void 0;
    if (typeof needle !== "string" || needle === "") return void 0;
    const target = needle.replace(/\s+/g, " ").trim();
    if (target === "") return void 0;
    const raw = safe(() => root.textContent) ?? "";
    if (raw === "") return void 0;
    const hay = normalizeWithMap(raw);
    if (hay.text === "") return void 0;
    const positions = [];
    let from = 0;
    for (; ; ) {
      const at = hay.text.indexOf(target, from);
      if (at === -1 || positions.length >= 64) break;
      positions.push(at);
      from = at + 1;
    }
    if (positions.length === 0) return void 0;
    let best = positions[0];
    if (positions.length > 1 && Number.isFinite(savedOffset)) {
      best = positions.reduce((a, b) => {
        const nearA = Math.abs((hay.map[a] ?? a) - savedOffset);
        const nearB = Math.abs((hay.map[b] ?? b) - savedOffset);
        return nearB < nearA ? b : a;
      });
    }
    const start = hay.map[best];
    if (start === void 0) return void 0;
    const rawEnd = hay.map[best + target.length];
    const end = rawEnd === void 0 ? raw.length : rawEnd;
    const length = Math.max(0, Math.min(end, raw.length) - start);
    if (length <= 0) return void 0;
    return rangeFromOffsets(root, start, length);
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
  var MAX_SEGMENTS = 8;
  var BLOCK_TAGS = /* @__PURE__ */ new Set([
    "p",
    "li",
    "pre",
    "blockquote",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "td",
    "th",
    "dd",
    "dt",
    "figcaption",
    "div",
    "section",
    "article",
    "tr"
  ]);
  var INLINE_TAGS = /* @__PURE__ */ new Set([
    "a",
    "abbr",
    "b",
    "code",
    "em",
    "i",
    "kbd",
    "mark",
    "q",
    "s",
    "samp",
    "small",
    "span",
    "strong",
    "sub",
    "sup",
    "time",
    "u",
    "var"
  ]);
  function blockOf(element, root) {
    if (element === null || element === void 0) return null;
    const limit = root ?? null;
    let node = element;
    while (node !== null && node !== void 0) {
      if (node.nodeType === 1) {
        const tag = String(node.tagName ?? "").toLowerCase();
        if (BLOCK_TAGS.has(tag) && !INLINE_TAGS.has(tag)) return node;
      }
      if (node === limit) return null;
      node = node.parentElement;
    }
    return null;
  }
  function anchorKeyOfNode(node) {
    const element = node === null || node === void 0 ? null : node.parentElement;
    if (element === null || element === void 0) return "";
    return safe(() => element.closest("[data-chat-anchor-key]")?.getAttribute("data-chat-anchor-key")) ?? "";
  }
  function rowOfNode(node) {
    const element = node === null || node === void 0 ? null : node.parentElement;
    if (element === null || element === void 0) return null;
    return safe(() => element.closest("[data-chat-anchor-key]")) ?? null;
  }
  function buildSegments(root, range, source) {
    if (root === null || root === void 0 || range === null || range === void 0) {
      return { segments: [], coverage: 0, truncated: false };
    }
    const quoteLength = safe(() => range.toString().length) ?? 0;
    if (quoteLength <= 0) return { segments: [], coverage: 0, truncated: false };
    const fallbackAnchorKey = source?.kind === "message" && typeof source?.anchorKey === "string" ? source.anchorKey : "";
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const blocks = [];
    let cursor = 0;
    let node = walker.nextNode();
    while (node !== null) {
      const inside = safe(() => range.intersectsNode(node)) === true;
      if (inside) {
        const value = node.nodeValue ?? "";
        const start = node === range.startContainer ? range.startOffset : 0;
        const end = node === range.endContainer ? range.endOffset : value.length;
        if (end > start) {
          const anchorKey = anchorKeyOfNode(node) || fallbackAnchorKey;
          const block = blockOf(node.parentElement, root);
          const quoteStart = cursor;
          const quoteEnd = cursor + (end - start);
          cursor = quoteEnd;
          if (value.slice(start, end).trim() !== "") {
            const last = blocks[blocks.length - 1];
            const mergeable = last !== void 0 && last.anchorKey === anchorKey && last.block === block;
            if (mergeable) {
              last.endNode = node;
              last.endOffset = end;
              last.quoteEnd = quoteEnd;
            } else {
              blocks.push({
                anchorKey,
                block,
                startNode: node,
                startOffset: start,
                endNode: node,
                endOffset: end,
                quoteStart,
                quoteEnd
              });
            }
          }
        }
      }
      node = walker.nextNode();
    }
    const coverage = cursor;
    let picked = blocks;
    let truncated = false;
    if (picked.length > MAX_SEGMENTS) {
      picked = mergeAdjacentSameRoot(picked);
      if (picked.length > MAX_SEGMENTS) {
        picked = [...picked.slice(0, MAX_SEGMENTS - 1), picked[picked.length - 1]];
        truncated = true;
      }
    }
    const segments = [];
    for (const block of picked) {
      const measureRoot = rowOfNode(block.startNode) ?? root;
      const segmentRange = safe(() => {
        const probe = document.createRange();
        probe.setStart(block.startNode, block.startOffset);
        probe.setEnd(block.endNode, block.endOffset);
        return probe;
      });
      if (segmentRange === void 0) continue;
      const chars = offsetRange(measureRoot, segmentRange);
      if (!Number.isFinite(chars.start)) continue;
      const charStart = chars.start;
      const charEnd = charStart + (block.quoteEnd - block.quoteStart);
      if (charEnd <= charStart) continue;
      segments.push({
        anchorKey: block.anchorKey,
        textOrigin: "rendered",
        charStart,
        charEnd,
        quoteStart: block.quoteStart,
        quoteEnd: block.quoteEnd
      });
    }
    return { segments, coverage, truncated };
  }
  function mergeAdjacentSameRoot(blocks) {
    const out = [];
    for (const block of blocks) {
      const last = out[out.length - 1];
      if (last !== void 0 && last.anchorKey === block.anchorKey && last.block === block.block) {
        last.endNode = block.endNode;
        last.endOffset = block.endOffset;
        last.quoteEnd = block.quoteEnd;
        continue;
      }
      out.push({ ...block });
    }
    return out;
  }
  function segmentsOf(source, quote) {
    const list = source?.segments;
    if (!Array.isArray(list) || list.length === 0) return null;
    const length = typeof quote === "string" ? quote.length : 0;
    if (length <= 0) return null;
    const out = [];
    for (const segment of list) {
      if (out.length >= MAX_SEGMENTS) break;
      if (segment === null || typeof segment !== "object" || Array.isArray(segment)) return null;
      const { charStart, charEnd, quoteStart, quoteEnd } = segment;
      if (!Number.isFinite(charStart) || !Number.isFinite(charEnd)) return null;
      if (!Number.isFinite(quoteStart) || !Number.isFinite(quoteEnd)) return null;
      if (charStart < 0 || charEnd <= charStart) return null;
      if (charEnd - charStart !== quoteEnd - quoteStart) return null;
      if (quoteStart < 0 || quoteEnd <= quoteStart || quoteEnd > length) return null;
      out.push({
        anchorKey: typeof segment.anchorKey === "string" ? segment.anchorKey : "",
        textOrigin: segment.textOrigin === "source" ? "source" : "rendered",
        charStart,
        charEnd,
        quoteStart,
        quoteEnd,
        ...typeof segment.fingerprintBefore === "string" ? { fingerprintBefore: segment.fingerprintBefore } : {},
        ...typeof segment.fingerprintAfter === "string" ? { fingerprintAfter: segment.fingerprintAfter } : {}
      });
    }
    if (out.length === 0) return null;
    if (Number.isFinite(source?.charStart) && source.charStart !== out[0].charStart) return null;
    if (Number.isFinite(source?.charEnd) && source.charEnd !== out[0].charEnd) return null;
    return out;
  }
  function spanOfSegment(segment) {
    const start = Math.max(0, segment.quoteStart);
    const end = Math.max(start, segment.quoteEnd);
    return { start, end };
  }
  function fitSegmentsToQuote(source, rawQuote, quote) {
    if (source === null || typeof source !== "object") return source;
    const list = source.segments;
    if (!Array.isArray(list) || list.length === 0) return source;
    const raw = typeof rawQuote === "string" ? rawQuote : "";
    const kept = typeof quote === "string" ? quote : "";
    const lead = Math.max(0, raw.length - raw.trimStart().length);
    const keptEnd = lead + kept.length;
    const next = [];
    for (const segment of list) {
      if (segment === null || typeof segment !== "object") continue;
      if (![segment.charStart, segment.charEnd, segment.quoteStart, segment.quoteEnd].every(Number.isFinite)) continue;
      const span = spanOfSegment(segment);
      const start = Math.max(span.start, lead);
      const end = Math.min(span.end, keptEnd);
      if (end <= start) continue;
      const shift = start - segment.quoteStart;
      const charStart = segment.charStart + shift;
      next.push({
        ...segment,
        charStart,
        charEnd: charStart + (end - start),
        quoteStart: start - lead,
        quoteEnd: end - lead
      });
    }
    if (next.length === 0) {
      const cleaned = { ...source };
      delete cleaned.segments;
      delete cleaned.segmentsTruncated;
      return cleaned;
    }
    const first = next[0];
    return { ...source, charStart: first.charStart, charEnd: first.charEnd, segments: next };
  }
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
    function withSegments(source, root, range) {
      const quoteLength = safe(() => range.toString().length) ?? 0;
      if (quoteLength <= 0) return source;
      const built = safe(() => buildSegments(root, range, source));
      if (built === void 0 || built.segments.length === 0) return source;
      if (built.coverage !== quoteLength) return source;
      const first = built.segments[0];
      return {
        ...source,
        charStart: first.charStart,
        charEnd: first.charEnd,
        segments: built.segments,
        ...built.truncated === true ? { segmentsTruncated: true } : {}
      };
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
        return withSegments(
          {
            kind: "reply",
            batchAt: Number(replyItem.getAttribute("data-sa-batch-at")) || 0,
            index,
            field,
            charStart: chars.start,
            charEnd: chars.end,
            textOrigin: "rendered"
          },
          fieldElement,
          range
        );
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
          return withSegments(
            {
              kind: "sent",
              anchorKey: sentCard.getAttribute("data-anchor") ?? "",
              index,
              field,
              charStart: chars.start,
              charEnd: chars.end,
              textOrigin: "rendered"
            },
            fieldEl,
            range
          );
        }
      }
      const row = startEl.closest("[data-chat-anchor-key]");
      if (row !== null) {
        const chars = offsetRange(row, range);
        const turnText = row.closest("[data-chat-turn]")?.getAttribute("data-chat-turn") ?? "";
        const turn = turnText === "" ? null : Number(turnText);
        const source = {
          kind: "message",
          role: (row.getAttribute("data-chat-flow-kind") ?? "") === "user" ? "user" : "assistant",
          anchorKey: row.getAttribute("data-chat-anchor-key") ?? "",
          flowKind: row.getAttribute("data-chat-flow-kind") ?? "",
          charStart: chars.start,
          charEnd: chars.end,
          ...Number.isFinite(turn) ? { turn } : {}
        };
        const walkRoot = row.contains(range.endContainer) ? row : safe(() => {
          const common = range.commonAncestorContainer;
          if (common === null || common === void 0) return row;
          return common.nodeType === 1 ? common : common.parentElement ?? row;
        }) ?? row;
        return withSegments(source, walkRoot, range);
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

  // src/core/jump-icon.js
  var SVG_NS = "http://www.w3.org/2000/svg";
  function jumpIcon() {
    const svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("viewBox", "0 0 16 16");
    svg.setAttribute("width", "13");
    svg.setAttribute("height", "13");
    svg.setAttribute("fill", "none");
    svg.setAttribute("aria-hidden", "true");
    for (const d of [
      "M2.8 12.2h10.4",
      "M7.3 4.1 10.9 11.5M8.9 10.2 10.9 11.5 11.2 9.2"
    ]) {
      const path = document.createElementNS(SVG_NS, "path");
      path.setAttribute("d", d);
      path.setAttribute("stroke", "currentColor");
      path.setAttribute("stroke-width", "1.2");
      svg.appendChild(path);
    }
    return svg;
  }

  // src/core/note-tone.js
  function noteFlags(note, adoptText, rejectText) {
    const text = typeof note === "string" ? note : "";
    return {
      adopt: typeof adoptText === "string" && adoptText !== "" && text.includes(adoptText),
      reject: typeof rejectText === "string" && rejectText !== "" && text.includes(rejectText)
    };
  }
  function indexFrom(text, phrase, from) {
    if (typeof phrase !== "string" || phrase === "") return -1;
    return text.indexOf(phrase, from);
  }
  function noteSegments(note, adoptText, rejectText) {
    const text = typeof note === "string" ? note : "";
    const segments = [];
    let cursor = 0;
    while (cursor < text.length) {
      const adoptAt = indexFrom(text, adoptText, cursor);
      const rejectAt = indexFrom(text, rejectText, cursor);
      const at = adoptAt === -1 ? rejectAt : rejectAt === -1 ? adoptAt : Math.min(adoptAt, rejectAt);
      if (at === -1) {
        segments.push({ text: text.slice(cursor), tone: "" });
        break;
      }
      const tone = adoptAt !== -1 && at === adoptAt ? "adopt" : "reject";
      const phrase = tone === "adopt" ? adoptText : rejectText;
      if (at > cursor) segments.push({ text: text.slice(cursor, at), tone: "" });
      segments.push({ text: phrase, tone });
      cursor = at + phrase.length;
    }
    return segments;
  }
  function noteView(note, adoptText, rejectText) {
    const flags = noteFlags(note, adoptText, rejectText);
    return {
      adopt: flags.adopt,
      reject: flags.reject,
      segments: flags.adopt && flags.reject ? noteSegments(note, adoptText, rejectText) : null
    };
  }
  function paintNote(node, text, view) {
    const adopt = view !== null && view !== void 0 && view.adopt === true;
    const reject = view !== null && view !== void 0 && view.reject === true;
    node.dataset.adopt = adopt ? "1" : "0";
    node.dataset.reject = reject ? "1" : "0";
    node.textContent = "";
    const segments = view === null || view === void 0 ? null : view.segments;
    if (!Array.isArray(segments)) {
      node.textContent = text;
      return;
    }
    for (const segment of segments) {
      if (segment.tone === "") {
        node.appendChild(document.createTextNode(segment.text));
        continue;
      }
      const span = document.createElement("span");
      span.className = segment.tone === "reject" ? "sa-note-reject" : "sa-note-adopt";
      span.textContent = segment.text;
      node.appendChild(span);
    }
  }

  // src/core/cards.js
  var VERDICT_LABELS = {
    accepted: ["verdict.accepted", "accepted"],
    partial: ["verdict.partial", "partial"],
    rejected: ["verdict.rejected", "rejected"],
    needs_info: ["verdict.needs_info", "needs_info"]
  };
  function createCards({ t, openImageViewer, markdown, isAdopt = () => false, noteView: noteView2 = () => null }) {
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
    function replayIcon() {
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("viewBox", "0 0 16 16");
      svg.setAttribute("width", "13");
      svg.setAttribute("height", "13");
      svg.setAttribute("fill", "none");
      svg.setAttribute("aria-hidden", "true");
      for (const d of ["M5.6 5.6H12.4V12.4H5.6V5.6Z", "M3.6 3.6H9.4V5.6"]) {
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("d", d);
        path.setAttribute("stroke", "currentColor");
        path.setAttribute("stroke-width", "1.2");
        svg.appendChild(path);
      }
      return svg;
    }
    function hoverTextButton(label, onClick, hint, icon) {
      const button2 = document.createElement("span");
      button2.className = "sa-reuse";
      button2.setAttribute("role", "button");
      button2.setAttribute("tabindex", "0");
      button2.setAttribute("aria-label", label);
      if (typeof hint === "string" && hint !== "") button2.title = hint;
      const text = document.createElement("span");
      text.className = "sa-reuse-text";
      text.textContent = label;
      button2.append(text, icon);
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
    function reuseButton(label, onClick, hint) {
      return hoverTextButton(label, onClick, hint, replayIcon());
    }
    function jumpButton(item, onClick, hint) {
      const button2 = hoverTextButton(
        t("jump.label"),
        () => onClick(item, button2),
        typeof hint === "string" && hint !== "" ? hint : t("jump.hint"),
        jumpIcon()
      );
      button2.classList.add("sa-jump");
      if (item?.source?.kind === "file") button2.setAttribute("data-disabled", "1");
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
      const action = typeof options.onReuse === "function" ? reuseButton(t("sent.reuse"), options.onReuse, t("reuse.hint")) : void 0;
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
        const quoteRow = document.createElement("div");
        quoteRow.className = "sa-sent-quote-row";
        const quote = document.createElement("div");
        quote.className = "sa-sent-quote";
        quote.setAttribute("data-sa-field", "quote");
        quote.textContent = truncateQuote(item.quote);
        if (typeof options.onJumpQuote === "function") {
          quote.classList.add("sa-quote-jump");
          quote.setAttribute("role", "button");
          quote.setAttribute("tabindex", "0");
          quote.title = t("jump.hint");
          const runJump = (event) => {
            event.preventDefault();
            event.stopPropagation();
            options.onJumpQuote(item, quote);
          };
          quote.addEventListener("click", runJump);
          quote.addEventListener("keydown", (event) => {
            if (event.key === "Enter" || event.key === " ") runJump(event);
          });
        }
        quoteRow.appendChild(quote);
        text.appendChild(quoteRow);
        if (typeof item.note === "string" && item.note.trim() !== "") {
          const note = document.createElement("div");
          note.className = "sa-sent-note";
          note.setAttribute("data-sa-field", "note");
          paintNote(note, item.note, noteView2(item.note));
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
          line.appendChild(reuseButton(t("sent.replayItem"), () => options.onReplayItem(item), t("reuse.hint")));
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
      const byUuid = /* @__PURE__ */ new Map();
      for (const item of Array.isArray(items) ? items : []) {
        if (typeof item?.uuid === "string" && item.uuid !== "") byUuid.set(item.uuid, item);
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
      const headAction = typeof options.onReuseAll === "function" ? reuseButton(t("sent.reuse"), options.onReuseAll, t("reuse.hint")) : void 0;
      const head = buildSectionHead(t("replies.title", { n: replies.length }), parts.join(" · "), headAction);
      card.style.display = "flex";
      card.style.flexDirection = "column";
      card.style.rowGap = "8px";
      card.appendChild(head);
      const body = document.createElement("div");
      body.className = "sa-replies-body";
      body.style.paddingTop = "0px";
      body.style.rowGap = "8px";
      for (const reply of replies) {
        const item = typeof reply.uuid === "string" && reply.uuid !== "" ? byUuid.get(reply.uuid) : byIndex.get(reply.index);
        const displayItem = item ?? (typeof reply.quote === "string" || typeof reply.note === "string" ? { quote: reply.quote, note: reply.note } : void 0);
        const [labelKey, tone] = VERDICT_LABELS[reply.verdict] ?? ["verdict.fallback", "accepted"];
        const group = document.createElement("div");
        group.className = `sa-reply-item sa-tone-${tone}`;
        group.setAttribute("data-sa-batch-at", String(Number.isFinite(reply.at) ? reply.at : 0));
        group.setAttribute("data-sa-reply-index", String(reply.index));
        if (typeof reply.uuid === "string" && reply.uuid !== "") group.setAttribute("data-sa-reply-uuid", reply.uuid);
        const cardHead = document.createElement("div");
        cardHead.className = "sa-reply-head";
        const index = document.createElement("span");
        index.className = "sa-reply-index";
        index.textContent = t("reply.index", { n: reply.index });
        const verdict = document.createElement("span");
        verdict.className = `sa-a-verdict sa-reply-${tone}`;
        verdict.textContent = t(labelKey);
        cardHead.append(index, verdict);
        const replayItem = displayItem ?? { quote: reply.quote, note: reply.note };
        if (typeof options.onReplayItem === "function") {
          cardHead.appendChild(reuseButton(t("replies.replay"), () => options.onReplayItem(replayItem), t("reuse.hint")));
        }
        group.appendChild(cardHead);
        const content = document.createElement("div");
        content.className = "sa-reply-body";
        if (displayItem !== void 0) {
          const q = document.createElement("div");
          q.className = "sa-q";
          const quoteText = typeof displayItem.quote === "string" ? displayItem.quote.trim() : "";
          if (quoteText !== "") {
            const qLabel = document.createElement("div");
            qLabel.className = "sa-q-label";
            qLabel.textContent = t("label.quote");
            const qHead = document.createElement("div");
            qHead.className = "sa-q-head";
            qHead.appendChild(qLabel);
            if (typeof options.onJumpQuote === "function") {
              qHead.appendChild(jumpButton(displayItem, options.onJumpQuote));
            }
            q.appendChild(qHead);
            const quote = document.createElement("div");
            quote.className = "sa-q-quote";
            if (isAdopt(displayItem.note)) quote.dataset.adopt = "1";
            quote.setAttribute("data-sa-field", "quote");
            quote.textContent = quoteText;
            quote.title = t("expand");
            quote.addEventListener("click", () => {
              quote.classList.toggle("sa-q-open");
            });
            q.appendChild(quote);
          }
          if (typeof displayItem.note === "string" && displayItem.note.trim() !== "") {
            const noteLabel = document.createElement("div");
            noteLabel.className = "sa-q-label";
            noteLabel.textContent = t("label.note");
            q.appendChild(noteLabel);
            const note = document.createElement("div");
            note.className = "sa-q-note";
            note.setAttribute("data-sa-field", "note");
            paintNote(note, displayItem.note, noteView2(displayItem.note));
            q.appendChild(note);
          }
          const replyThumbs = Array.isArray(displayItem.thumbs) ? displayItem.thumbs : [];
          if (replyThumbs.length > 0) {
            const gallery = document.createElement("div");
            gallery.className = "sa-sent-thumbs";
            for (const thumb of replyThumbs) {
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
            if (gallery.childNodes.length > 0) q.appendChild(gallery);
          }
          content.appendChild(q);
        }
        const a = document.createElement("div");
        a.className = "sa-a";
        const aHead = document.createElement("div");
        aHead.className = "sa-a-head";
        const aLabel = document.createElement("span");
        aLabel.className = "sa-a-label";
        aLabel.textContent = displayItem !== void 0 ? t("label.answer") : t("reply.fallbackLabel", { n: reply.index });
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
          const body2 = document.createElement("div");
          body2.className = "sa-a-next-text";
          if (markdown !== void 0 && typeof markdown.mount === "function") {
            markdown.mount(body2, reply.next);
          } else {
            body2.textContent = reply.next;
          }
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
    function buildReplyDetail(reply) {
      const wrap = document.createElement("div");
      wrap.className = "sa-pop-reply-body";
      wrap.setAttribute("data-sa-reply-detail", "1");
      if (typeof reply.uuid === "string" && reply.uuid !== "") wrap.setAttribute("data-sa-reply-uuid", reply.uuid);
      const render = (node, text) => {
        if (markdown !== void 0 && typeof markdown.mount === "function") markdown.mount(node, text);
        else node.textContent = text;
      };
      const reasonText = typeof reply.reason === "string" ? reply.reason : "";
      if (reasonText.trim() !== "") {
        const reason = document.createElement("div");
        reason.className = "sa-pop-reply-reason";
        reason.setAttribute("data-sa-field", "reason");
        render(reason, reasonText);
        wrap.appendChild(reason);
      }
      const nextText = typeof reply.next === "string" ? reply.next : "";
      if (nextText.trim() !== "") {
        const next = document.createElement("div");
        next.className = "sa-pop-reply-next";
        next.setAttribute("data-sa-field", "next");
        const label = document.createElement("span");
        label.className = "sa-pop-reply-next-label";
        label.textContent = t("next.label");
        const body = document.createElement("div");
        body.className = "sa-pop-reply-next-text";
        render(body, nextText);
        next.append(label, body);
        wrap.appendChild(next);
      }
      return wrap;
    }
    function buildReplyVerdict(reply) {
      const [labelKey, tone] = VERDICT_LABELS[reply?.verdict] ?? ["verdict.unknown", "accepted"];
      const verdict = document.createElement("span");
      verdict.className = `sa-a-verdict sa-reply-${tone}`;
      verdict.textContent = t(labelKey);
      return verdict;
    }
    function replyTone(reply) {
      const [, tone] = VERDICT_LABELS[reply?.verdict] ?? ["verdict.unknown", "accepted"];
      return tone;
    }
    return {
      sectionChevron,
      buildSectionHead,
      collapsible,
      applyCollapsed,
      buildSentCard,
      buildReplySection,
      buildReplyDetail,
      buildReplyVerdict,
      replyTone
    };
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
    copyAll = () => {
    },
    pasteAnnotations = () => {
    },
    copyItem = () => {
    },
    moveAnnotation,
    openEditPopover,
    jumpToQuote = () => {
    },
    removeAnnotation,
    sourceSummary,
    openImageViewer,
    imageSettingsRow,
    instructionSettingsRow,
    fallbackSettingsRow,
    closePanel = () => {
    },
    openSideTab = () => {
    },
    isSideTabOpen = () => false,
    // true 时按钮变成「关闭」，图标与提示同步切换
    noteView: noteView2 = () => null,
    getHintText = () => ""
  }) {
    function render(panelEl) {
      const body = panelEl.querySelector(".sa-panel-body");
      const scrollTop = body === null ? 0 : body.scrollTop;
      paint(panelEl, { surface: "panel" });
      const nextBody = panelEl.querySelector(".sa-panel-body");
      if (nextBody !== null) nextBody.scrollTop = scrollTop;
    }
    function renderSide(host) {
      let panel = host.firstElementChild;
      if (!(panel instanceof HTMLElement) || !panel.classList.contains("sa-panel")) {
        host.textContent = "";
        panel = document.createElement("div");
        host.appendChild(panel);
      }
      const body = panel.querySelector(".sa-panel-body");
      const scrollTop = body === null ? 0 : body.scrollTop;
      paint(panel, { surface: "side" });
      const nextBody = panel.querySelector(".sa-panel-body");
      if (nextBody !== null) nextBody.scrollTop = scrollTop;
    }
    function flipRows(panelEl, before) {
      for (const row of panelEl.querySelectorAll(".sa-item")) {
        const prev = before.get(row.dataset.id);
        if (prev === void 0) continue;
        const next = row.getBoundingClientRect();
        const dx = prev.left - next.left;
        const dy = prev.top - next.top;
        if (dx === 0 && dy === 0) continue;
        row.style.transition = "none";
        row.style.transform = `translate(${dx}px, ${dy}px)`;
        void row.offsetWidth;
        const token = (row.__saFlipToken || 0) + 1;
        row.__saFlipToken = token;
        row.style.transition = "transform 180ms cubic-bezier(.22,.61,.36,1)";
        row.style.transform = "";
        const finish = () => {
          if (row.__saFlipToken !== token) return;
          row.style.transition = "";
          row.style.transform = "";
        };
        row.addEventListener("transitionend", finish, { once: true });
        setTimeout(finish, 260);
      }
    }
    function paint(panelEl, options) {
      const side = options !== void 0 && options.surface === "side";
      if (!side) panelEl.className = "sa-panel";
      else panelEl.className = "sa-panel sa-panel-in-side";
      const annotations = getAnnotations();
      panelEl.textContent = "";
      const panelHead = el("div", "sa-panel-head");
      panelHead.appendChild(el("span", "sa-panel-title", t("panel.title")));
      const meta = el("div", "sa-panel-meta");
      const hintText = getHintText(side ? "side" : "panel") || t("panel.foot");
      const hint = el("span", "sa-panel-hint");
      hint.appendChild(el("span", "sa-hint-layer", hintText));
      hint.title = hintText;
      meta.appendChild(hint);
      meta.appendChild(el("span", "sa-panel-count", t("panel.count", { n: annotations.length })));
      if (annotations.length > 0) {
        meta.appendChild(button("sa-foot-action", t("panel.copyAll"), () => copyAll(panelEl)));
      }
      meta.appendChild(button("sa-foot-action", t("panel.paste"), () => pasteAnnotations(panelEl)));
      if (annotations.length > 0) {
        meta.appendChild(button("sa-foot-action", t("panel.clear"), () => clearAnnotations()));
      }
      panelHead.appendChild(meta);
      if (!side) {
        const close = button("sa-panel-close", "×", () => closePanel());
        close.setAttribute("aria-label", t("panel.close"));
        close.title = t("panel.close");
        panelHead.appendChild(close);
      }
      panelEl.appendChild(panelHead);
      const panelBody = el("div", "sa-panel-body");
      if (annotations.length === 0) {
        panelBody.appendChild(el("div", "sa-panel-empty", t("panel.empty")));
      }
      let draggingId = null;
      for (const item of annotations) {
        const row = el("div", "sa-item");
        row.draggable = true;
        row.dataset.id = item.id;
        row.addEventListener("dragstart", (event) => {
          draggingId = item.id;
          event.dataTransfer.setData("text/plain", item.id);
          event.dataTransfer.effectAllowed = "move";
          row.classList.add("sa-dragging");
        });
        row.addEventListener("dragend", () => {
          draggingId = null;
          for (const node of panelEl.querySelectorAll(".sa-item")) {
            node.classList.remove("sa-dragging", "sa-drop-before");
          }
        });
        row.addEventListener("dragover", (event) => {
          event.preventDefault();
          event.dataTransfer.dropEffect = "move";
          if (item.id === draggingId) return;
          for (const node of panelEl.querySelectorAll(".sa-item")) {
            if (node !== row) node.classList.remove("sa-drop-before");
          }
          row.classList.add("sa-drop-before");
        });
        row.addEventListener("dragleave", (event) => {
          if (event.relatedTarget instanceof Node && row.contains(event.relatedTarget)) return;
          row.classList.remove("sa-drop-before");
        });
        row.addEventListener("drop", (event) => {
          event.preventDefault();
          event.stopPropagation();
          const draggedId = event.dataTransfer.getData("text/plain");
          if (draggedId === "" || draggedId === item.id) return;
          const before = /* @__PURE__ */ new Map();
          for (const node of panelEl.querySelectorAll(".sa-item")) {
            before.set(node.dataset.id, node.getBoundingClientRect());
          }
          moveAnnotation(draggedId, item.id);
          flipRows(panelEl, before);
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
        actions.appendChild(button("sa-item-action", t("panel.copy"), () => copyItem(item, panelEl)));
        actions.appendChild(button("sa-item-action", t("panel.edit"), () => openEditPopover(item.id, head)));
        actions.appendChild(button("sa-item-action sa-danger", t("panel.delete"), () => removeAnnotation(item.id)));
        head.appendChild(actions);
        row.appendChild(head);
        if (item.quote !== "") {
          const q = el("div", "sa-item-q");
          const qHead = el("div", "sa-item-q-head");
          qHead.appendChild(el("div", "sa-item-label", t("panel.quote")));
          const jump = button("sa-item-action sa-item-jump", t("jump.label"), (event) => {
            event.preventDefault();
            event.stopPropagation();
            jumpToQuote(item, jump);
          });
          jump.title = t("jump.hint");
          if (item.source?.kind === "file") jump.setAttribute("data-disabled", "1");
          qHead.appendChild(jump);
          q.appendChild(qHead);
          const quote = el("div", "sa-item-quote", item.quote);
          quote.title = t("expand");
          quote.addEventListener("click", () => {
            quote.classList.toggle("sa-q-open");
          });
          q.appendChild(quote);
          row.appendChild(q);
        }
        if (item.note !== "") {
          const a = el("div", "sa-item-a");
          a.appendChild(el("div", "sa-item-label", t("panel.note")));
          const noteEl = el("div", "sa-item-note");
          paintNote(noteEl, item.note, noteView2(item.note));
          noteEl.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            openEditPopover(item.id, head);
          });
          a.appendChild(noteEl);
          row.appendChild(a);
        }
        if (Array.isArray(item.images) && item.images.length > 0) {
          const gallery = el("div", "sa-item-images");
          for (const image of item.images) {
            const src = typeof image?.url === "string" && image.url !== "" ? image.url : typeof image?.preview === "string" && image.preview !== "" ? image.preview : typeof image?.thumb === "string" && image.thumb !== "" ? image.thumb : typeof image?.dataUrl === "string" && image.dataUrl !== "" ? image.dataUrl : "";
            if (src === "") continue;
            const thumb = document.createElement("img");
            thumb.className = "sa-item-thumb";
            thumb.src = src;
            thumb.alt = typeof image.name === "string" ? image.name : t("image.alt");
            thumb.title = t("image.open");
            thumb.style.cursor = "zoom-in";
            thumb.addEventListener("click", (event) => {
              event.preventDefault();
              event.stopPropagation();
              openImageViewer(src, image.name);
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
      panelBody.appendChild(fallbackSettingsRow());
      panelEl.appendChild(panelBody);
      const panelFoot = el("div", "sa-panel-foot");
      const build = el("span", "sa-build", `dsh-selection-annotations build.${PLUGIN_BUILD}`);
      build.title = `dsh-selection-annotations build.${PLUGIN_BUILD}`;
      panelFoot.appendChild(build);
      if (!side) {
        const sideOpen = isSideTabOpen() === true;
        const sideAction = t(sideOpen ? "panel.sideTabClose" : "panel.sideTab");
        const sideTab = button("sa-panel-side", "", openSideTab);
        sideTab.title = sideAction;
        sideTab.setAttribute("aria-label", sideAction);
        sideTab.setAttribute("aria-pressed", sideOpen ? "true" : "false");
        const sideIcon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        sideIcon.setAttribute("viewBox", "0 0 16 16");
        sideIcon.setAttribute("width", "14");
        sideIcon.setAttribute("height", "14");
        sideIcon.setAttribute("fill", "none");
        sideIcon.setAttribute("stroke", "currentColor");
        sideIcon.setAttribute("stroke-width", "1.2");
        const sideIconPaths = ["M2.2 3.2h11.6v9.6H2.2z", "M10.2 3.2v9.6"];
        for (const d of sideIconPaths) {
          const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
          path.setAttribute("d", d);
          sideIcon.appendChild(path);
        }
        sideTab.appendChild(sideIcon);
        panelFoot.appendChild(sideTab);
      }
      panelEl.appendChild(panelFoot);
    }
    function snapshotRows(panelEl) {
      const rects = /* @__PURE__ */ new Map();
      for (const row of panelEl.querySelectorAll(".sa-item")) rects.set(row.dataset.id, row.getBoundingClientRect());
      return rects;
    }
    return { render, renderSide, snapshotRows, animateRows: flipRows };
  }

  // src/core/annotation-clipboard.js
  var ANNOTATION_CLIPBOARD_KIND = "dsh-selection-annotations/clipboard";
  var PAYLOAD_KIND2 = "dsh-selection-annotations";
  function clipboardImage(image) {
    if (image === null || typeof image !== "object") return void 0;
    const dataUrl = typeof image.dataUrl === "string" && image.dataUrl !== "" ? image.dataUrl : void 0;
    if (dataUrl === void 0) return void 0;
    const entry = { name: typeof image.name === "string" ? image.name : "image", dataUrl };
    if (typeof image.thumb === "string" && image.thumb !== "") entry.thumb = image.thumb;
    if (typeof image.preview === "string" && image.preview !== "") entry.preview = image.preview;
    return entry;
  }
  function clipboardItem(item) {
    const images = (Array.isArray(item?.images) ? item.images : []).map(clipboardImage).filter(Boolean);
    return {
      quote: typeof item?.quote === "string" ? item.quote : "",
      note: typeof item?.note === "string" ? item.note : "",
      ...images.length > 0 ? { images } : {},
      ...item?.source !== null && typeof item?.source === "object" ? { source: item.source } : {}
    };
  }
  function serializeAnnotations(items) {
    const list = Array.isArray(items) ? items : [];
    return JSON.stringify({
      kind: ANNOTATION_CLIPBOARD_KIND,
      version: 1,
      count: list.length,
      annotations: list.map(clipboardItem)
    });
  }
  function normalizeItem(value) {
    if (value === null || typeof value !== "object" || Array.isArray(value)) return void 0;
    const quote = typeof value.quote === "string" ? value.quote : "";
    const note = typeof value.note === "string" ? value.note : "";
    if (quote.trim() === "" && note.trim() === "") return void 0;
    const images = (Array.isArray(value.images) ? value.images : []).map((image) => {
      const dataUrl = typeof image?.dataUrl === "string" ? image.dataUrl : "";
      if (dataUrl === "") return void 0;
      return {
        id: `img-paste-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
        name: typeof image.name === "string" ? image.name : "image",
        dataUrl,
        thumb: typeof image.thumb === "string" && image.thumb !== "" ? image.thumb : dataUrl,
        preview: typeof image.preview === "string" && image.preview !== "" ? image.preview : dataUrl,
        bytes: Math.round(dataUrl.length * 3 / 4)
      };
    }).filter(Boolean);
    return {
      quote,
      note,
      images,
      source: value.source !== null && typeof value.source === "object" ? value.source : void 0
    };
  }
  function parseAnnotations(text) {
    if (typeof text !== "string" || text.trim() === "") return void 0;
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      return void 0;
    }
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) return void 0;
    if (parsed.kind !== ANNOTATION_CLIPBOARD_KIND && parsed.kind !== PAYLOAD_KIND2) return void 0;
    if (!Array.isArray(parsed.annotations)) return void 0;
    const items = parsed.annotations.map(normalizeItem).filter(Boolean);
    return items.length > 0 ? items : void 0;
  }
  function annotationSignature(item) {
    const names = (Array.isArray(item?.images) ? item.images : []).map((image) => typeof image?.name === "string" ? image.name : "").join(",");
    return `${typeof item?.quote === "string" ? item.quote : ""}\0${typeof item?.note === "string" ? item.note : ""}\0${names}`;
  }

  // src/core/web-picker.js
  var PICK_SCRIPT = String.raw`(function () {
  if (window.__saPicker) { try { window.__saWebRender && window.__saWebRender() } catch (e) {} return 'already' }
  var state = { el: null, note: null }
  var host = document.createElement('div')
  host.setAttribute('data-sa-web-picker', '')
  host.style.cssText = 'position:fixed;inset:0;z-index:2147483000;pointer-events:none;contain:layout style;'
  // 页面自己的 button/svg 样式会污染按钮组（圆角、隐藏图标、字号），整组放进
  // Shadow DOM 隔离；宿主要 pointer-events:none，内部按钮再单独打开命中。
  var root = typeof host.attachShadow === 'function' ? host.attachShadow({ mode: 'open' }) : host
  var box = document.createElement('div')
  box.style.cssText = 'position:fixed;border:2px solid rgba(36,123,191,.95);border-radius:0;background:transparent;display:none;pointer-events:none;box-sizing:border-box;'
  var actions = document.createElement('div')
  actions.style.cssText = 'position:fixed;display:none;pointer-events:auto;z-index:2147483001;align-items:center;gap:0;padding:0;border-radius:8px;overflow:hidden;background:rgba(0,0,0,.15);-webkit-mask-image:linear-gradient(to right,transparent,#000 6px,#000 calc(100% - 6px),transparent);mask-image:linear-gradient(to right,transparent,#000 6px,#000 calc(100% - 6px),transparent);transition:background .12s;'
  var layers = document.createElement('div')
  layers.setAttribute('data-sa-web-notes', '')
  root.appendChild(layers)
  root.appendChild(box)
  root.appendChild(actions)
  document.documentElement.appendChild(host)

  var ICONS = {
    adopt: ['M2.25 8.5L5.49732 11.7473C5.90519 12.1552 6.57263 12.1344 6.95426 11.7018L13.75 4'],
    feedback: [
      'M8.85596 2.69971H4.19971C3.37141 2.69971 2.69992 3.37146 2.69971 4.19971V11.8003C2.69992 12.6285 3.37141 13.3003 4.19971 13.3003H11.8003C12.6283 13.2999 13.3001 12.6283 13.3003 11.8003V7.89893H14.3003V11.8003C14.3001 13.1806 13.1806 14.2999 11.8003 14.3003H4.19971C2.81913 14.3003 1.69992 13.1808 1.69971 11.8003V4.19971C1.69992 2.81918 2.81913 1.69971 4.19971 1.69971H8.85596V2.69971Z|fill',
      'M7.7849 8.23878L13.888 2.13574',
    ],
  }

  var FEATHER = 'linear-gradient(to right,transparent,#000 6px,#000 calc(100% - 6px),transparent)'

  function buttonsOf() {
    return actions.querySelectorAll('button')
  }

  /** 未进入按钮组：整组 15% 底、文字 50%，两侧羽化（羽化宽度为字号的一半）。 */
  function resetTone() {
    actions.style.background = 'rgba(0,0,0,.15)'
    actions.style.webkitMaskImage = FEATHER
    actions.style.maskImage = FEATHER
    var buttons = buttonsOf()
    for (var i = 0; i < buttons.length; i += 1) {
      buttons[i].style.background = 'transparent'
      buttons[i].style.color = 'rgba(255,255,255,.5)'
    }
  }

  /** 已进入按钮组：取消羽化，未悬停的按钮背景 33%、文字 67%；指针下的按钮背景 67%、文字不透明。 */
  function toneOnEnter() {
    actions.style.background = 'transparent'
    actions.style.webkitMaskImage = 'none'
    actions.style.maskImage = 'none'
    var buttons = buttonsOf()
    for (var i = 0; i < buttons.length; i += 1) {
      buttons[i].style.background = 'rgba(0,0,0,.33)'
      buttons[i].style.color = 'rgba(255,255,255,.67)'
    }
  }

  actions.addEventListener('pointerenter', toneOnEnter)
  actions.addEventListener('pointerleave', resetTone)

  function iconFor(action) {
    var svgNS = 'http://www.w3.org/2000/svg'
    var svg = document.createElementNS(svgNS, 'svg')
    svg.setAttribute('viewBox', '0 0 16 16')
    svg.setAttribute('width', '14')
    svg.setAttribute('height', '14')
    svg.setAttribute('fill', 'none')
    svg.setAttribute('stroke-width', '1')
    svg.style.cssText = 'flex:0 0 auto;display:block;'
    var paths = action === 'delete'
      ? ['M3 4.2h10', 'M6 4.2V2.8h4v1.4', 'M4.4 4.2l.5 8h6.2l.5-8']
      : (ICONS[action] || ICONS.feedback)
    for (var i = 0; i < paths.length; i += 1) {
      var spec = paths[i]
      var fill = spec.indexOf('|fill') > -1
      var path = document.createElementNS(svgNS, 'path')
      path.setAttribute('d', fill ? spec.slice(0, -5) : spec)
      if (fill) {
        path.setAttribute('fill', 'currentColor')
        path.setAttribute('stroke', 'none')
      } else {
        path.setAttribute('stroke', 'currentColor')
      }
      svg.appendChild(path)
    }
    return svg
  }

  function makeButton(action, label, id, last) {
    var button = document.createElement('button')
    button.type = 'button'
    button.dataset.action = action
    button.style.cssText = 'pointer-events:auto;display:inline-flex;align-items:center;justify-content:center;gap:4px;height:24px;padding:0 9px;border:0;border-radius:0;border-right:' + (last ? '0' : '1px solid rgba(255,255,255,.16)') + ';background:transparent;color:rgba(255,255,255,.8);font:12px/1 system-ui,sans-serif;cursor:pointer;text-shadow:0 1px 3px rgba(0,0,0,.85);transition:background .12s;'
    button.appendChild(iconFor(action))
    button.appendChild(document.createTextNode(label))
    button.addEventListener('pointerenter', function () {
      button.style.background = 'rgba(0,0,0,.67)'
      button.style.color = '#fff'
    })
    button.addEventListener('pointerleave', function () {
      button.style.background = 'rgba(0,0,0,.33)'
      button.style.color = 'rgba(255,255,255,.67)'
    })
    button.addEventListener('click', function (event) { onClick(event, action, id) })
    return button
  }

  function setActionsFor(el) {
    var note = findNote(el)
    state.note = note
    var signature = note ? 'note:' + note.id : 'empty'
    if (actions.dataset.signature !== signature) {
      actions.dataset.signature = signature
      actions.textContent = ''
      if (note) {
        actions.appendChild(makeButton('modify', '修改批注', note.id, false))
        actions.appendChild(makeButton('delete', '删除批注', note.id, true))
      } else {
        actions.appendChild(makeButton('feedback', '批注反馈', '', false))
        actions.appendChild(makeButton('adopt', '批注采纳', '', true))
      }
      resetTone()
    }
    return note
  }

  function findNote(el) {
    var notes = Array.isArray(window.__saWebNotes) ? window.__saWebNotes : []
    for (var i = 0; i < notes.length; i += 1) {
      if (!notes[i] || !notes[i].selector) continue
      var target = null
      try { target = document.querySelector(notes[i].selector) } catch (e) { target = null }
      if (target && target === el) return notes[i]
    }
    return null
  }

  function selectorOf(el) {
    if (!el || el.nodeType !== 1) return ''
    if (el.id) return '#' + CSS.escape(el.id)
    var attrs = ['data-testid', 'data-test', 'name', 'aria-label']
    for (var i = 0; i < attrs.length; i += 1) {
      var value = el.getAttribute(attrs[i])
      if (value) return el.tagName.toLowerCase() + '[' + attrs[i] + '="' + value.replace(/"/g, '\\"') + '"]'
    }
    var parts = []
    var node = el
    while (node && node.nodeType === 1 && parts.length < 8) {
      var tag = node.tagName.toLowerCase()
      var index = 1
      var prev = node.previousElementSibling
      while (prev) { if (prev.tagName === node.tagName) index += 1; prev = prev.previousElementSibling }
      parts.unshift(tag + ':nth-of-type(' + index + ')')
      node = node.parentElement
      if (node === document.body || node === document.documentElement) break
    }
    return parts.join(' > ')
  }

  function labelOf(el) {
    var text = (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 60)
    return el.tagName.toLowerCase() + (text ? ' · ' + text : '')
  }

  function rectOf(el) {
    var rect = el.getBoundingClientRect()
    return { left: rect.left, top: rect.top, width: rect.width, height: rect.height }
  }

  function place(el, mouseX, mouseY) {
    if (!el || el.closest('[data-sa-web-picker]')) return
    var rect = el.getBoundingClientRect()
    if (rect.width < 2 || rect.height < 2) return
    state.el = el
    var note = setActionsFor(el)
    // 已经有批注的元素不再叠拾取框，只保留常驻框与按钮组。
    box.style.display = note ? 'none' : 'block'
    if (!note) {
      box.style.left = rect.left + 'px'
      box.style.top = rect.top + 'px'
      box.style.width = rect.width + 'px'
      box.style.height = rect.height + 'px'
    }
    actions.style.display = 'flex'
    var width = actions.offsetWidth || 180
    var height = actions.offsetHeight || 24
    var marginX = 4
    var top
    // 默认放框外：鼠标在元素上半部分就放上方，下半部分放下方；那一侧没空间才换另一侧。
    var preferAbove = mouseY === undefined ? true : mouseY < rect.top + rect.height / 2
    var above = rect.top - height
    var below = rect.bottom
    if (above >= 4 || below + height > window.innerHeight - 4) {
      top = preferAbove ? above : below
      if (top < 4) top = below
      if (top + height > window.innerHeight - 4) top = above >= 4 ? above : Math.max(4, window.innerHeight - height - 4)
    } else {
      top = below
    }
    var outsideOk = top < rect.top || top >= rect.bottom
    if (!outsideOk) {
      // 框外上下都没有空间：放进框内，居中偏上。
      top = rect.top + Math.max(4, Math.min((rect.height - height) / 2, 4))
    }
    var left = Math.max(marginX, Math.min((mouseX === undefined ? rect.left + width / 2 : mouseX) - width / 2, window.innerWidth - width - marginX))
    if (!outsideOk) {
      left = Math.max(rect.left + 2, Math.min(left, rect.right - width - 2))
    }
    actions.style.left = left + 'px'
    actions.style.top = Math.max(4, top) + 'px'
  }

  function inActions(x, y) {
    var rect = actions.getBoundingClientRect()
    return x >= rect.left - 6 && x <= rect.right + 6 && y >= rect.top - 6 && y <= rect.bottom + 6
  }

  function onMove(event) {
    if (actions.style.display !== 'none' && inActions(event.clientX, event.clientY)) return
    var el = document.elementFromPoint(event.clientX, event.clientY)
    if (el && el.closest && el.closest('[data-sa-web-picker]')) return
    place(el, event.clientX, event.clientY)
  }

  function onClick(event, action, id) {
    event.preventDefault()
    event.stopPropagation()
    var el = state.el
    if (!el) return
    window.__saPicked = {
      action: action,
      id: id || '',
      selector: selectorOf(el),
      label: labelOf(el),
      url: location.href,
      title: document.title,
      text: el.innerText || el.textContent || '',
      rect: rectOf(el),
    }
  }

  function onKey(event) {
    if (event.key === 'Escape') {
      event.preventDefault()
      actions.style.display = 'none'
      box.style.display = 'none'
      state.el = null
      state.note = null
    }
  }

  function renderNotes() {
    var notes = Array.isArray(window.__saWebNotes) ? window.__saWebNotes : []
    layers.textContent = ''
    notes.forEach(function (note) {
      if (!note || !note.selector) return
      if (note.url && note.url !== location.href) return
      var el = null
      try { el = document.querySelector(note.selector) } catch (e) { el = null }
      if (!el) return
      var rect = el.getBoundingClientRect()
      if (rect.width < 2 || rect.height < 2) return
      var color = note.adopt ? 'rgba(52,199,89,.8)' : 'rgba(245,158,11,.8)'
      var frame = document.createElement('div')
      frame.style.cssText = 'position:fixed;border:3px solid ' + color + ';border-radius:0;background:transparent;pointer-events:none;box-sizing:border-box;'
      frame.style.left = rect.left + 'px'
      frame.style.top = rect.top + 'px'
      frame.style.width = rect.width + 'px'
      frame.style.height = rect.height + 'px'
      layers.appendChild(frame)
      var handle = document.createElement('button')
      handle.type = 'button'
      handle.setAttribute('aria-label', '修改这条网页批注')
      handle.style.cssText = 'position:fixed;width:14px;height:14px;padding:0;border-radius:50%;border:1px solid rgba(0,0,0,.35);background:#fff;pointer-events:auto;cursor:pointer;box-shadow:0 1px 3px rgba(0,0,0,.4);'
      handle.style.left = (rect.left - 5) + 'px'
      handle.style.top = (rect.top - 5) + 'px'
      handle.addEventListener('click', function (event) {
        event.preventDefault()
        event.stopPropagation()
        window.__saPicked = { action: 'open', id: note.id, selector: note.selector, rect: rectOf(el) }
      })
      layers.appendChild(handle)
    })
    // 刚新增/删除批注时，正悬停的元素要立刻换成对应的按钮组。
    if (state.el) setActionsFor(state.el)
    if (state.el && state.note) box.style.display = 'none'
  }
  window.__saWebRender = renderNotes
  renderNotes()
  window.addEventListener('scroll', renderNotes, true)
  window.addEventListener('resize', renderNotes)

  window.addEventListener('mousemove', onMove, true)
  window.addEventListener('keydown', onKey, true)
  window.__saPicker = { stop: function () { window.removeEventListener('mousemove', onMove, true) } }
  return 'ok'
})()`;
  var POLL_MS = 400;
  function createWebPicker({ onPick }) {
    let timer = 0;
    let lastNotes = [];
    function view() {
      return document.querySelector('webview[data-sidebar-browser-frame="webview"]') ?? document.querySelector("webview");
    }
    function execute(script) {
      const webview = view();
      if (webview === null || typeof webview.executeJavaScript !== "function") return void 0;
      try {
        return webview.executeJavaScript(script);
      } catch {
        return void 0;
      }
    }
    function stop() {
      if (timer !== 0) {
        window.clearInterval(timer);
        timer = 0;
      }
    }
    function sync(notes) {
      lastNotes = Array.isArray(notes) ? notes : [];
      const json = JSON.stringify(lastNotes);
      execute(`window.__saWebNotes = ${json}; window.__saWebRender && window.__saWebRender()`);
    }
    async function capture(scope, rect) {
      if (scope !== "page" && scope !== "element") return void 0;
      const webview = view();
      if (webview === null || typeof webview.capturePage !== "function") return void 0;
      try {
        const area = scope === "element" && rect !== null && typeof rect === "object" ? {
          x: Math.max(0, Math.round(rect.left)),
          y: Math.max(0, Math.round(rect.top)),
          width: Math.max(1, Math.round(rect.width)),
          height: Math.max(1, Math.round(rect.height))
        } : void 0;
        const image = await webview.capturePage(area);
        if (image === null || image === void 0 || typeof image.toDataURL !== "function") return void 0;
        const dataUrl = image.toDataURL();
        return typeof dataUrl === "string" && dataUrl.startsWith("data:image/") ? dataUrl : void 0;
      } catch {
        return void 0;
      }
    }
    function start() {
      if (timer !== 0) return;
      timer = window.setInterval(() => {
        const webview = view();
        if (webview === null || typeof webview.executeJavaScript !== "function") return;
        let raw;
        try {
          raw = webview.executeJavaScript("({ live: !!window.__saPicker, picked: window.__saPicked || null })");
        } catch {
          return;
        }
        Promise.resolve(raw).then((state) => {
          if (state === null || typeof state !== "object") return;
          if (state.picked !== null && typeof state.picked === "object") {
            safeCall(() => webview.executeJavaScript("window.__saPicked = null"));
            onPick({
              action: typeof state.picked.action === "string" ? state.picked.action : "feedback",
              id: typeof state.picked.id === "string" ? state.picked.id : "",
              quote: typeof state.picked.label === "string" ? state.picked.label : "",
              selector: typeof state.picked.selector === "string" ? state.picked.selector : "",
              url: typeof state.picked.url === "string" ? state.picked.url : "",
              text: typeof state.picked.text === "string" ? state.picked.text : "",
              rect: state.picked.rect ?? null
            });
            return;
          }
          if (state.live !== true) {
            safeCall(() => webview.executeJavaScript(PICK_SCRIPT));
            if (lastNotes.length > 0) sync(lastNotes);
          }
        }).catch(() => {
        });
      }, POLL_MS);
    }
    function dispose() {
      execute("window.__saPicker && window.__saPicker.stop()");
      stop();
    }
    return { start, sync, capture, dispose, available: () => view() !== null };
  }
  function safeCall(fn) {
    try {
      return fn();
    } catch {
      return void 0;
    }
  }

  // src/core/preview-bridge.js
  var BRIDGE = String.raw`(function () {
  try {
    Object.defineProperty(window, '__saPicked', {
      configurable: true,
      get: function () { return null },
      set: function (value) {
        if (value && window.parent !== window) window.parent.postMessage({ __saPreviewPick: value }, '*')
      },
    })
  } catch (error) {}
  window.addEventListener('message', function (event) {
    var data = event.data
    if (!data || !Array.isArray(data.__saPreviewNotes)) return
    window.__saWebNotes = data.__saPreviewNotes
    try { window.__saWebRender && window.__saWebRender() } catch (error) {}
  })
})();`;
  var INJECTED_MARK = "data-sa-preview-picker";
  function injectIntoHtml(html) {
    if (typeof html !== "string" || html.includes(INJECTED_MARK)) return void 0;
    const script = `<script ${INJECTED_MARK}="1">${BRIDGE}
${PICK_SCRIPT}<\/script>`;
    return `${html}${script}`;
  }
  function createPreviewBridge({ onPick, getNotes }) {
    let installed = false;
    let swapTimer = 0;
    let syncTimer = 0;
    let observer = null;
    const pending = /* @__PURE__ */ new Map();
    const attempted = /* @__PURE__ */ new Set();
    const originalCreate = URL.createObjectURL.bind(URL);
    function isEditorFrame(frame) {
      const className = typeof frame.className === "string" ? frame.className : "";
      return className.toLowerCase().includes("editorhtml") || frame.closest('[class*="editorHtml" i]') !== null;
    }
    async function hydrateFrame(frame, src) {
      try {
        const response = await fetch(src);
        if (!response.ok) return;
        const text = await response.text();
        if (text.includes(INJECTED_MARK)) return;
        const injected = injectIntoHtml(text);
        if (injected === void 0) return;
        if (!frame.isConnected || frame.getAttribute("src") !== src) return;
        frame.setAttribute("src", originalCreate(new Blob([injected], { type: "text/html;charset=utf-8" })));
      } catch {
      }
    }
    function swapPreviews() {
      for (const frame of document.querySelectorAll("iframe")) {
        if (!isEditorFrame(frame)) continue;
        const src = frame.getAttribute("src") ?? "";
        if (src === "") continue;
        const next = pending.get(src);
        if (next !== void 0) {
          pending.delete(src);
          attempted.add(src);
          attempted.add(next);
          frame.setAttribute("src", next);
          continue;
        }
        if (attempted.has(src)) continue;
        if (!src.startsWith("blob:")) {
          try {
            if (new URL(src, location.href).origin !== location.origin) continue;
          } catch {
            continue;
          }
        }
        attempted.add(src);
        hydrateFrame(frame, src);
      }
    }
    function installCreateObjectUrl() {
      if (installed) return;
      installed = true;
      URL.createObjectURL = function patchedCreateObjectURL(blob) {
        const url = originalCreate(blob);
        try {
          const type = blob !== null && blob !== void 0 && typeof blob.type === "string" ? blob.type : "";
          if (type.startsWith("text/html") && typeof blob.text === "function") {
            blob.text().then((text) => {
              const injected = injectIntoHtml(text);
              if (injected === void 0) return;
              const next = originalCreate(new Blob([injected], { type: "text/html;charset=utf-8" }));
              attempted.add(url);
              pending.set(url, next);
              swapPreviews();
            }).catch(() => {
            });
          }
        } catch {
        }
        return url;
      };
    }
    function onMessage(event) {
      const data = event.data;
      if (data === null || typeof data !== "object") return;
      const picked = data.__saPreviewPick;
      if (picked === null || picked === void 0) return;
      let frame = null;
      for (const candidate of document.querySelectorAll("iframe")) {
        if (candidate.contentWindow === event.source) {
          frame = candidate;
          break;
        }
      }
      if (frame === null) return;
      const className = typeof frame.className === "string" ? frame.className : "";
      const host = frame.closest('[class*="editorHtml" i]') !== null;
      if (!className.toLowerCase().includes("editorhtml") && !host) return;
      const base = frame.getBoundingClientRect();
      const inner = picked.rect ?? {};
      const rect = {
        left: Number(inner.left ?? 0),
        top: Number(inner.top ?? 0),
        width: Number(inner.width ?? 0),
        height: Number(inner.height ?? 0)
      };
      const anchor = {
        getBoundingClientRect: () => ({
          left: base.left + rect.left,
          top: base.top + rect.top,
          width: rect.width,
          height: rect.height,
          right: base.left + rect.left + rect.width,
          bottom: base.top + rect.top + rect.height
        })
      };
      try {
        onPick({
          action: picked.action,
          id: picked.id,
          quote: typeof picked.label === "string" ? picked.label : "",
          selector: typeof picked.selector === "string" ? picked.selector : "",
          text: typeof picked.text === "string" ? picked.text : "",
          url: frame.title !== "" ? frame.title : typeof picked.url === "string" ? picked.url : "",
          rect,
          anchor,
          fromPreview: true
        });
      } catch {
      }
    }
    function syncNotes() {
      const notes = typeof getNotes === "function" ? getNotes() : [];
      for (const frame of document.querySelectorAll("iframe")) {
        const className = typeof frame.className === "string" ? frame.className : "";
        const host = frame.closest('[class*="editorHtml" i]') !== null;
        if (!className.toLowerCase().includes("editorhtml") && !host) continue;
        const path = frame.title;
        const list = notes.filter((note) => note.path === path).map((note) => ({ id: note.id, selector: note.selector, adopt: note.adopt }));
        try {
          frame.contentWindow?.postMessage({ __saPreviewNotes: list }, "*");
        } catch {
        }
      }
    }
    function start() {
      installCreateObjectUrl();
      window.addEventListener("message", onMessage);
      observer = new MutationObserver(() => swapPreviews());
      observer.observe(document.documentElement, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["src", "class"]
      });
      swapTimer = window.setInterval(swapPreviews, 500);
      syncTimer = window.setInterval(syncNotes, 800);
    }
    function dispose() {
      if (!installed) return;
      window.removeEventListener("message", onMessage);
      if (observer !== null) observer.disconnect();
      observer = null;
      if (swapTimer !== 0) window.clearInterval(swapTimer);
      if (syncTimer !== 0) window.clearInterval(syncTimer);
      swapTimer = 0;
      syncTimer = 0;
    }
    return { start, dispose };
  }

  // src/core/sent-store.js
  function isSentItem(value) {
    if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
    return typeof value.quote === "string" || typeof value.note === "string";
  }
  function createSentStore({ getStorage, tableFor, prefix, maxEntries, maxBytes, maxItems, onChanged }) {
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
            const items = value.items.filter(isSentItem).slice(0, maxItems);
            if (items.length === 0) continue;
            const turn = Number.isFinite(value.turn) ? Number(value.turn) : void 0;
            const anchorKey = typeof value.anchorKey === "string" && value.anchorKey !== "" ? value.anchorKey : void 0;
            const batchUuid = typeof value.batchUuid === "string" && value.batchUuid !== "" ? value.batchUuid : void 0;
            const batchSeq = Number.isSafeInteger(value.batchSeq) ? value.batchSeq : void 0;
            const rewoundAt = Number.isFinite(value.rewoundAt) ? Number(value.rewoundAt) : void 0;
            const rewoundTurn = Number.isFinite(value.rewoundTurn) ? Number(value.rewoundTurn) : void 0;
            table.set(key, {
              savedAt: Number(value.savedAt) || 0,
              items,
              ...turn !== void 0 ? { turn } : {},
              ...anchorKey !== void 0 ? { anchorKey } : {},
              ...batchUuid !== void 0 ? { batchUuid } : {},
              ...batchSeq !== void 0 ? { batchSeq } : {},
              ...rewoundAt !== void 0 ? { rewoundAt } : {},
              ...rewoundTurn !== void 0 ? { rewoundTurn } : {},
              // 批次没落库的记录要跟着本地台账活到下一次重试，重启后也不能丢。
              ...value.unsynced === true ? { unsynced: true } : {}
            });
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
    function withItemUuids(items, uuids) {
      if (!Array.isArray(uuids) || uuids.length !== items.length) return items;
      if (!uuids.every((uuid) => typeof uuid === "string" && uuid !== "")) return items;
      return items.map((item, index) => {
        if (typeof item?.uuid === "string" && item.uuid !== "") return item;
        return { ...item, uuid: uuids[index] };
      });
    }
    function batchFields(value) {
      return {
        batchUuid: typeof value?.batchUuid === "string" && value.batchUuid !== "" ? value.batchUuid : void 0,
        batchSeq: Number.isSafeInteger(value?.batchSeq) ? value.batchSeq : void 0
      };
    }
    function recordSent(sessionId, anchorKey, items, turn, options) {
      const extra = options ?? {};
      const batch = batchFields(extra);
      const table = loadSent(sessionId);
      table.set(anchorKey, {
        savedAt: Date.now(),
        items: withItemUuids(items, extra.uuids),
        ...Number.isFinite(turn) ? { turn } : {},
        // 键本身就是锚点；值里再存一份，跨端合并或旧键（time:/turn-process）时才有地方取。
        anchorKey,
        ...batch.batchUuid !== void 0 ? { batchUuid: batch.batchUuid } : {},
        ...batch.batchSeq !== void 0 ? { batchSeq: batch.batchSeq } : {}
      });
      saveSent(sessionId, table);
    }
    function updateSentBatch(sessionId, anchorKey, options) {
      const extra = options ?? {};
      const table = loadSent(sessionId);
      const record = table.get(anchorKey);
      if (record === void 0) return false;
      const batch = batchFields(extra);
      const items = Array.isArray(extra.uuids) ? withItemUuids(record.items, extra.uuids) : record.items;
      if (batch.batchUuid === void 0 && batch.batchSeq === void 0 && items === record.items) return false;
      table.set(anchorKey, {
        ...record,
        items,
        ...batch.batchUuid !== void 0 ? { batchUuid: batch.batchUuid } : {},
        ...batch.batchSeq !== void 0 ? { batchSeq: batch.batchSeq } : {}
      });
      saveSent(sessionId, table);
      return true;
    }
    return { loadSent, saveSent, recordSent, updateSentBatch };
  }

  // src/core/hidden-payload.js
  var KIND_LINE = '"kind": "dsh-selection-annotations"';
  var BLANK = /\s/;
  function displayOf(payload) {
    const count = payload.count;
    if (Number.isInteger(count) && count > 0) return `【额外批注 x ${count}】`;
    const annotations = payload.annotations;
    if (Array.isArray(annotations) && annotations.length > 0) return `【额外批注 x ${annotations.length}】`;
    return "【额外批注】";
  }
  function createPayloadHidingRule() {
    return {
      id: "selection-annotations:payload",
      order: 900,
      match(text, from) {
        if (typeof text !== "string" || text === "") return void 0;
        const kindAt = text.indexOf(KIND_LINE, from);
        if (kindAt === -1) return void 0;
        const jsonStart = text.lastIndexOf("{", kindAt);
        if (jsonStart === -1 || jsonStart < from) return void 0;
        const candidate = text.slice(jsonStart);
        let payload;
        try {
          payload = JSON.parse(candidate);
        } catch {
          return void 0;
        }
        if (payload === null || typeof payload !== "object" || payload.kind !== "dsh-selection-annotations") {
          return void 0;
        }
        let start = jsonStart;
        while (start > from && BLANK.test(text[start - 1])) start -= 1;
        const ownLine = start > 0 && text[start - 1] !== "\n";
        return {
          id: "text",
          start,
          end: text.length,
          data: { text: text.slice(start), display: `${ownLine ? "\n\n" : ""}${displayOf(payload)}` }
        };
      }
    };
  }

  // src/core/remote-sync.js
  function createRemoteSync(getSnapshot) {
    let state;
    const queue = /* @__PURE__ */ new Set();
    let timer = null;
    const storeUrl = (sessionId) => `/selection-annotations/session/${encodeURIComponent(sessionId)}`;
    const entryUrl = (uuid) => `/selection-annotations/entry/${encodeURIComponent(uuid)}`;
    const batchUrl = (batchUuid) => `/selection-annotations/batch/${encodeURIComponent(batchUuid)}`;
    let batchSupported;
    const batchInflight = /* @__PURE__ */ new Map();
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
    const pending = /* @__PURE__ */ new Set();
    const inflight = /* @__PURE__ */ new Map();
    async function pushOnce(sessionId) {
      if (typeof fetch !== "function") return;
      const hold = batchInflight.get(sessionId);
      if (hold !== void 0) {
        try {
          await hold;
        } catch {
        }
      }
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
    function enqueue(sessionId) {
      if (typeof sessionId !== "string" || sessionId === "") return;
      pending.add(sessionId);
      if (inflight.has(sessionId)) return;
      const task = (async () => {
        while (pending.has(sessionId)) {
          pending.delete(sessionId);
          await pushOnce(sessionId);
        }
      })();
      inflight.set(sessionId, task);
      void task.finally(() => {
        inflight.delete(sessionId);
        if (pending.has(sessionId)) enqueue(sessionId);
      });
    }
    function schedule(sessionId) {
      if (typeof sessionId !== "string" || sessionId === "") return;
      queue.add(sessionId);
      if (timer !== null) return;
      timer = window.setTimeout(() => {
        timer = null;
        const ids = [...queue];
        queue.clear();
        for (const id of ids) enqueue(id);
      }, 600);
    }
    async function readObject(response) {
      const data = await response.json();
      return data !== null && typeof data === "object" && !Array.isArray(data) ? data : void 0;
    }
    async function createBatch(sessionId, body) {
      const failed = (status, reason) => ({ ok: false, status, reason });
      if (typeof sessionId !== "string" || sessionId === "") return failed(0, "no-session");
      if (batchSupported === false) return failed(0, "unsupported");
      if (typeof fetch !== "function") {
        batchSupported = false;
        return failed(0, "no-fetch");
      }
      const previous = batchInflight.get(sessionId);
      const task = (previous ?? Promise.resolve()).then(async () => {
        try {
          const response = await fetch(`${storeUrl(sessionId)}/batch`, {
            method: "POST",
            headers: { "content-type": "application/json", accept: "application/json" },
            body: JSON.stringify(body)
          });
          if (response.status === 404 || response.status === 405) {
            batchSupported = false;
            return failed(response.status, "unsupported");
          }
          if (!response.ok) return failed(response.status, "http");
          const data = await readObject(response);
          if (data === void 0) return failed(response.status, "empty");
          batchSupported = true;
          return { ...data, ok: true, status: response.status };
        } catch {
          return failed(0, "network");
        }
      });
      batchInflight.set(sessionId, task);
      void task.finally(() => {
        if (batchInflight.get(sessionId) === task) batchInflight.delete(sessionId);
      });
      return task;
    }
    async function patchBatch(batchUuid, body) {
      if (typeof batchUuid !== "string" || batchUuid === "") return void 0;
      if (typeof fetch !== "function") return void 0;
      try {
        const response = await fetch(batchUrl(batchUuid), {
          method: "PATCH",
          headers: { "content-type": "application/json", accept: "application/json" },
          body: JSON.stringify(body)
        });
        if (!response.ok) return void 0;
        return await readObject(response);
      } catch {
        return void 0;
      }
    }
    async function patchEntry(uuid, reply) {
      if (typeof uuid !== "string" || uuid === "") return void 0;
      if (typeof fetch !== "function") return void 0;
      try {
        const response = await fetch(entryUrl(uuid), {
          method: "PATCH",
          headers: { "content-type": "application/json", accept: "application/json" },
          body: JSON.stringify(reply)
        });
        if (!response.ok) return void 0;
        return await readObject(response);
      } catch {
        return void 0;
      }
    }
    async function deleteEntry(uuid) {
      if (typeof uuid !== "string" || uuid === "") return void 0;
      if (typeof fetch !== "function") return void 0;
      try {
        const response = await fetch(entryUrl(uuid), {
          method: "DELETE",
          headers: { accept: "application/json", "x-sa-explicit-delete": "true" }
        });
        if (!response.ok) return void 0;
        return await readObject(response);
      } catch {
        return void 0;
      }
    }
    return { pull, push: pushOnce, schedule, storeUrl, createBatch, patchBatch, patchEntry, deleteEntry };
  }

  // src/core/scroll-trace.js
  var SCROLL_TRACE_ROUTE = "/selection-annotations/debug/trace";
  var FLUSH_MS = 1e3;
  var MAX_QUEUE = 500;
  var WRITE_MARK_TTL_MS = 1e3;
  function createScrollTrace() {
    let enabled = true;
    let queue = [];
    let timer = null;
    let contextFn = null;
    let stopped = false;
    let bound = false;
    const marks = /* @__PURE__ */ new WeakMap();
    const watched = /* @__PURE__ */ new WeakSet();
    const lastTops = /* @__PURE__ */ new WeakMap();
    function clearTimer() {
      if (timer === null) return;
      try {
        window.clearTimeout(timer);
      } catch {
      }
      timer = null;
    }
    function push(entry) {
      if (stopped || !enabled) return;
      queue.push(entry);
      if (queue.length > MAX_QUEUE) queue.splice(0, queue.length - MAX_QUEUE);
      if (timer === null) {
        timer = window.setTimeout(() => {
          timer = null;
          flush();
        }, FLUSH_MS);
      }
    }
    function flush() {
      clearTimer();
      if (stopped || !enabled || queue.length === 0) return;
      let context = {};
      if (contextFn !== null) {
        try {
          const value = contextFn();
          if (value !== null && typeof value === "object") context = value;
        } catch {
        }
      }
      const lines = queue.map((entry) => JSON.stringify({ ...context, ...entry }));
      queue = [];
      if (typeof fetch !== "function") return;
      try {
        const task = fetch(SCROLL_TRACE_ROUTE, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ lines }),
          keepalive: true
        });
        if (task !== void 0 && task !== null && typeof task.catch === "function") task.catch(() => {
        });
      } catch {
      }
    }
    function repaint(source) {
      push({ t: Date.now(), kind: "repaint", src: String(source ?? "timer") });
    }
    function markWrite(container, source, expectedTop) {
      if (stopped || container === null || container === void 0) return;
      marks.set(container, {
        src: String(source),
        top: Math.round(Number(expectedTop) || 0),
        at: Date.now()
      });
    }
    function watch(container) {
      if (container === null || container === void 0) return;
      if (typeof container.addEventListener !== "function") return;
      stopped = false;
      bindPageListeners();
      if (watched.has(container)) return;
      watched.add(container);
      container.addEventListener(
        "scroll",
        () => {
          if (stopped || !enabled) return;
          const now = Date.now();
          const top = Math.round(Number(container.scrollTop) || 0);
          const previous = lastTops.get(container);
          lastTops.set(container, top);
          let src = "other";
          const mark = marks.get(container);
          if (mark !== void 0) {
            if (now - mark.at <= WRITE_MARK_TTL_MS && Math.abs(top - mark.top) <= 2) src = mark.src;
            marks.delete(container);
          }
          push({ t: now, kind: "scroll", top, d: previous === void 0 ? 0 : top - previous, src });
        },
        { passive: true }
      );
    }
    function setContext(fn) {
      contextFn = typeof fn === "function" ? fn : null;
    }
    function setEnabled(on) {
      enabled = Boolean(on);
      if (!enabled) {
        queue = [];
        clearTimer();
      }
    }
    function dispose() {
      stopped = true;
      queue = [];
      clearTimer();
      try {
        window.removeEventListener("visibilitychange", onVisibilityChange);
        window.removeEventListener("pagehide", onPageHide);
      } catch {
      }
      bound = false;
    }
    function bindPageListeners() {
      if (bound) return;
      if (typeof window === "undefined" || typeof window.addEventListener !== "function") return;
      window.addEventListener("visibilitychange", onVisibilityChange);
      window.addEventListener("pagehide", onPageHide);
      bound = true;
    }
    function onVisibilityChange() {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") flush();
    }
    function onPageHide() {
      flush();
    }
    bindPageListeners();
    return { setEnabled, setContext, flush, push, repaint, markWrite, watch, dispose };
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

  // src/core/uuid.js
  function uuidV4() {
    try {
      const native = globalThis.crypto?.randomUUID;
      if (typeof native === "function") {
        const value = native.call(globalThis.crypto);
        if (typeof value === "string" && value !== "") return value;
      }
    } catch {
    }
    const hex = (length) => {
      let out = "";
      while (out.length < length) out += Math.floor(Math.random() * 16).toString(16);
      return out.slice(0, length);
    };
    const time = Date.now().toString(16).slice(-12).padStart(12, "0");
    return `${time.slice(0, 8)}-${time.slice(8, 12)}-4${hex(3)}-${"89ab"[Math.floor(Math.random() * 4)]}${hex(3)}-${hex(12)}`;
  }

  // src/core/draft-codec.js
  function createDraftCodec({ t, prefix, maxBytes }) {
    const draftKey = (sessionId) => `${prefix}${sessionId}`;
    function draftItems(items) {
      return items.map((item) => ({
        id: item.id,
        // uuid 在捕获时生成，草稿刷新后必须原样恢复：否则同一条批注会换一个身份。
        ...typeof item.uuid === "string" && item.uuid !== "" ? { uuid: item.uuid } : {},
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
        // 升级前存下的草稿没有 uuid：恢复时补一个，保证发送时数据块里每条都有 uuid。
        uuid: typeof item.uuid === "string" && item.uuid !== "" ? item.uuid : uuidV4(),
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
      const rawTurn = typeof props?.turn === "object" && props?.turn !== null ? props.turn.turn : props?.turn;
      const turn = Number(rawTurn);
      if (!Number.isFinite(turn) || turn <= 0) return null;
      const fromProps = typeof props?.sessionId === "string" ? props.sessionId : "";
      const fromTurn = typeof props?.turn?.sessionId === "string" ? props.turn.sessionId : "";
      const sessionId = fromProps !== "" ? fromProps : fromTurn;
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
  function reportLoadError(error) {
    try {
      if (document.getElementById("sa-load-error") !== null) return;
      const box = document.createElement("pre");
      box.id = "sa-load-error";
      box.textContent = `批注插件加载失败：${error !== null && error !== void 0 && error.stack !== void 0 ? error.stack : String(error)}`;
      box.style.cssText = "position:fixed;left:12px;top:12px;right:12px;max-height:50vh;overflow:auto;z-index:2147483647;margin:0;padding:10px 12px;border:1px solid #f85149;border-radius:8px;background:rgba(30,10,10,.96);color:#ffb3b3;font:12px/1.5 ui-monospace,monospace;white-space:pre-wrap;";
      document.body.appendChild(box);
    } catch {
    }
  }
  function createPlugin(React, extras = {}) {
    const h = React.createElement;
    const plugin = {
      name: "dsh-selection-annotations",
      inject: [
        "slots",
        "sessions",
        "conversation",
        "remote",
        "remote.workspaceFiles",
        "locale",
        "uiConversation",
        "sidebarRight",
        "sidebarRightTabs",
        "documentPreviews"
      ],
      apply(ctx) {
        try {
          return plugin.activate(ctx);
        } catch (error) {
          reportLoadError(error);
          throw error;
        }
      },
      activate(ctx) {
        const locale = createLocale(ctx);
        const t = (key, params) => locale.t(key, params);
        const defaultInstruction = () => locale.defaultInstruction();
        const isDefaultInstruction = (text) => locale.isDefaultInstruction(text);
        registerTurnAnchor(ctx, h);
        ctx.effect(() => {
          const ui = safe(() => ctx.uiConversation);
          if (ui === void 0 || ui === null || typeof ui.userText?.register !== "function") return;
          return ui.userText.register(createPayloadHidingRule());
        }, "selection-annotations: hide payload in user bubble");
        let annotations = [];
        let draftIds = [];
        let syncing = false;
        let syncTimer = null;
        let repaintTimer = null;
        let repaintPending = false;
        let repaintDeferredAt = null;
        const REPAINT_DEFER_MAX_MS = 1500;
        let conversationChanges = 0;
        let conversationDirty = true;
        let placementPending = false;
        let highlightDirty = true;
        let scrollGuardCapture = null;
        let jumpScrollUntil = 0;
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
        let stagedAt = 0;
        let sendGestureAt = 0;
        let gateBatch = null;
        let gateBusy = false;
        let gateBypass = false;
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
        let webPickerHandle = null;
        const rewindHandled = /* @__PURE__ */ new Map();
        function emit() {
          highlightDirty = true;
          for (const fn of [...listeners]) {
            try {
              fn();
            } catch (err) {
              warn("[selection-annotations] 订阅回调失败：", err);
            }
          }
          syncWebAnnotations();
        }
        function syncWebAnnotations() {
          if (webPickerHandle === null) return;
          const notes = annotations.filter((item) => item.source !== null && item.source !== void 0 && item.source.kind === "web").map((item) => ({
            id: item.id,
            selector: item.source.anchorKey ?? "",
            url: item.source.path ?? "",
            adopt: hasAdoptNote(item.note)
          }));
          webPickerHandle.sync(notes);
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
        const orphanSweepUntil = Date.now() + 15e3;
        function sweepOrphans(shell) {
          if (Date.now() > orphanSweepUntil) return;
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
        function draftSentItems(list) {
          const payload = safe(() => JSON.parse(buildPayload(list)));
          if (payload === null || typeof payload !== "object" || !Array.isArray(payload.annotations)) return null;
          return payload.annotations.map((annotation, index) => {
            const origin = list[index];
            const images = Array.isArray(origin?.images) ? origin.images : [];
            const thumbs = [];
            for (const image of images) {
              if (typeof image?.thumb !== "string" || image.thumb === "") continue;
              thumbs.push({
                name: typeof image.name === "string" ? image.name : t("image.alt"),
                dataUrl: image.thumb,
                preview: typeof image.preview === "string" && image.preview !== "" ? image.preview : image.dataUrl
              });
            }
            const fingerprint = {};
            if (typeof origin?.source?.contextBefore === "string") fingerprint.contextBefore = origin.source.contextBefore;
            if (typeof origin?.source?.contextAfter === "string") fingerprint.contextAfter = origin.source.contextAfter;
            const sentItem = { ...annotation, ...fingerprint };
            return thumbs.length > 0 ? { ...sentItem, thumbs } : sentItem;
          });
        }
        function markConsumed(reason) {
          if (draftIds.length === 0) return;
          const ids = draftIds;
          draftIds = [];
          draftSeen = false;
          const until = Date.now() + STRAY_GUARD_MS;
          for (const id of ids) strayIds.set(id, until);
          if (annotations.length === 0) return;
          const items = draftSentItems(annotations);
          if (items !== null) {
            const gateUuid = gateBatch !== null && typeof gateBatch.batchUuid === "string" && gateBatch.batchUuid !== "" && (attachedSessionId ?? currentSessionId()) === gateBatch.sessionId ? gateBatch.batchUuid : void 0;
            pendingSent.push({
              items,
              known: lastAnnotatedKeys,
              at: Date.now(),
              // 发送这一刻的会话就是消息真正去的那一个：记账沿用它，
              // 避免稍后重算时切到别的会话，把记录写进别人的台账。
              sessionId: attachedSessionId ?? currentSessionId(),
              // 把「这一屏会话」的范围也记下来：别的会话还挂在页面里时，只在这块范围内找新消息。
              scope: chatScopeOfInput(),
              turnHint: turnHintForScope(chatScopeOfInput()),
              ...gateUuid !== void 0 ? { batchUuid: gateUuid } : {}
            });
            lastAnnotatedKeys = /* @__PURE__ */ new Set();
          }
          gateBatch = null;
          consumedSnapshot = { items: annotations.slice(), at: Date.now() };
          annotations = [];
          emit();
          scheduleRepaint("emit");
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
              if (!draftSeen && sendGestureAt < stagedAt) return;
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
        const rejectTextOf = () => settings.rejectTextOf();
        const persistRejectText = (text) => settings.persistRejectText(text);
        const fallbackTextOf = () => settings.fallbackTextOf();
        const persistFallbackText = (text) => settings.persistFallbackText(text);
        const hasAdoptNote = (note) => typeof note === "string" && note.includes(adoptTextOf());
        const hasRejectNote = (note) => typeof note === "string" && note.includes(rejectTextOf());
        const noteViewOf = (note) => noteView(note, adoptTextOf(), rejectTextOf());
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
        const scrollTrace = createScrollTrace();
        scrollTrace.setContext(() => ({ session: currentSessionId() ?? null, build: PLUGIN_BUILD }));
        const remoteSync = createRemoteSync((sessionId) => {
          const snapshot2 = sessionSnapshot(sessionId);
          scrollTrace.push({
            t: Date.now(),
            kind: "snapshot-push",
            session: sessionId,
            sent: Object.keys(snapshot2.sent).length,
            drafts: Array.isArray(snapshot2.drafts) ? snapshot2.drafts.length : 0
          });
          return snapshot2;
        });
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
        const hydratedSessions = /* @__PURE__ */ new Set();
        const pendingRemotePush = /* @__PURE__ */ new Set();
        const flushPendingRemotePush = (sessionId) => {
          if (!pendingRemotePush.delete(sessionId)) return;
          scheduleRemotePush(sessionId);
        };
        async function hydrateRemoteSession(sessionId) {
          const remote = await pullRemoteSession(sessionId);
          if (remote === null || remote === void 0) {
            hydratedSessions.add(sessionId);
            flushPendingRemotePush(sessionId);
            return;
          }
          let touched = absorbRemoteReplies(sessionId, remote);
          if (Array.isArray(remote.drafts) && remote.drafts.length > 0) {
            const items = remote.drafts.filter(isDraftItem).slice(0, DRAFT_MAX_ITEMS).map(restoreDraftItem);
            if (annotationsSession === sessionId && annotations.length === 0 && items.length > 0) {
              annotations = items;
              emit();
              scheduleRepaint("emit");
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
              const anchorKey = typeof value.anchorKey === "string" && value.anchorKey !== "" ? value.anchorKey : void 0;
              const batchUuid = typeof value.batchUuid === "string" && value.batchUuid !== "" ? value.batchUuid : void 0;
              const batchSeq = Number.isSafeInteger(value.batchSeq) ? value.batchSeq : void 0;
              table.set(key, {
                savedAt: Number(value.savedAt) || 0,
                items,
                ...turn !== void 0 ? { turn } : {},
                ...anchorKey !== void 0 ? { anchorKey } : {},
                ...batchUuid !== void 0 ? { batchUuid } : {},
                ...batchSeq !== void 0 ? { batchSeq } : {},
                ...value.unsynced === true ? { unsynced: true } : {}
              });
            }
            if (table.size > 0) {
              const localTable = sentBySession.get(sessionId) ?? /* @__PURE__ */ new Map();
              let merged = false;
              for (const [key, value] of table) {
                const current = localTable.get(key);
                if (current === void 0 || value.savedAt > current.savedAt) {
                  const rewound = recordWasRewound(current) ? {
                    rewoundAt: current.rewoundAt,
                    ...Number.isFinite(current.rewoundTurn) ? { rewoundTurn: current.rewoundTurn } : {}
                  } : {};
                  localTable.set(key, { ...value, ...rewound });
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
          if (touched) {
            markConversationDirty();
            scheduleRepaint("session");
          }
          hydratedSessions.add(sessionId);
          flushPendingRemotePush(sessionId);
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
          if (!first) {
            flushPopAutoSave();
            saveDraft(annotationsSession);
          }
          annotationsSession = sessionId;
          if (first && annotations.length > 0) {
            saveDraft(sessionId);
            markConversationDirty();
            scheduleRepaint("session");
            return;
          }
          annotations = loadDraft(sessionId);
          draftIds = [];
          draftSeen = false;
          for (const stale of document.querySelectorAll('[data-sa-ui="replies"]')) stale.remove();
          emit();
          markConversationDirty();
          scheduleRepaint("session");
          if (annotations.length > 0) scheduleSync();
          void hydrateRemoteSession(sessionId).catch((error) => {
            warn("[selection-annotations] 远端台账合并失败:", sessionId, error);
          });
        }
        const sourceResolver = createSourceResolver({
          ctx,
          getSessionId: () => currentSessionId(),
          log,
          timeoutMs: SOURCE_LOOKUP_TIMEOUT_MS
        });
        const resolveSourcePosition = (source, quote, onSkip) => sourceResolver.resolve(source, quote, onSkip);
        const sourceCapture = createSourceCapture();
        const FINGERPRINT_RADIUS = 40;
        const flatText = (value) => String(value ?? "").replace(/\s+/g, "");
        function rootByAnchorKey(anchorKey) {
          if (typeof anchorKey !== "string" || anchorKey === "") return null;
          const escaped = cssEscape(anchorKey);
          return safe(() => document.querySelector(`[data-chat-anchor-key="${escaped}"]`)) ?? safe(() => document.querySelector(`[data-chat-flow-key="${escaped}"]`)) ?? null;
        }
        function stampSegmentFingerprints(segments) {
          return segments.map((segment) => {
            const row = rootByAnchorKey(segment.anchorKey);
            if (row === null) return segment;
            const text = row.textContent ?? "";
            if (text === "") return segment;
            const start = Number.isFinite(segment.charStart) ? segment.charStart : -1;
            const end = Number.isFinite(segment.charEnd) ? segment.charEnd : -1;
            if (start < 0 || end < start) return segment;
            return {
              ...segment,
              fingerprintBefore: flatText(text.slice(0, start)).slice(-FINGERPRINT_RADIUS),
              fingerprintAfter: flatText(text.slice(end)).slice(0, FINGERPRINT_RADIUS)
            };
          });
        }
        function withSourceFingerprint(range, source) {
          if (source === null || typeof source !== "object") return source;
          const list = Array.isArray(source.segments) ? source.segments : [];
          if (list.length > 0) {
            const stamped = stampSegmentFingerprints(list);
            const first = stamped[0];
            const next = { ...source, segments: stamped };
            if (typeof first?.fingerprintBefore === "string") next.contextBefore = first.fingerprintBefore;
            if (typeof first?.fingerprintAfter === "string") next.contextAfter = first.fingerprintAfter;
            return next;
          }
          if (source.kind !== "message") return source;
          if (typeof source.anchorKey !== "string" || source.anchorKey === "") return source;
          const start = Number.isFinite(source.charStart) ? source.charStart : -1;
          const end = Number.isFinite(source.charEnd) ? source.charEnd : -1;
          if (start < 0 || end < start) return source;
          const node = range.startContainer;
          const element = node === null || node === void 0 ? null : node.nodeType === 1 ? node : node.parentElement;
          const row = element === null ? null : element.closest("[data-chat-anchor-key]");
          if (row === null) return source;
          const text = row.textContent ?? "";
          if (text === "") return source;
          const before = flatText(text.slice(0, start)).slice(-FINGERPRINT_RADIUS);
          const after = flatText(text.slice(end)).slice(0, FINGERPRINT_RADIUS);
          if (before === "" && after === "") return source;
          return { ...source, contextBefore: before, contextAfter: after };
        }
        const captureSource = (range) => withSourceFingerprint(range, sourceCapture.captureSource(range));
        const anchorRoot = (source) => sourceCapture.anchorRoot(source);
        const rangeFromOffsets2 = (root, start, length) => sourceCapture.rangeFromOffsets(root, start, length);
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
          const rawQuote = typeof input.quote === "string" ? input.quote : "";
          const quote = typeof input.quote === "string" ? input.quote.trim().slice(0, MAX_QUOTE) : "";
          const note = typeof input.note === "string" ? input.note.trim().slice(0, MAX_NOTE) : "";
          const source = fitSegmentsToQuote(input.source ?? { kind: "dom" }, rawQuote, quote);
          if (quote === "" && note === "") return void 0;
          sequence += 1;
          const item = {
            id: `sa-${Date.now().toString(36)}-${sequence}`,
            uuid: uuidV4(),
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
          scheduleRepaint("emit");
          saveDraft(annotationsSession);
          return item;
        }
        function swapHintText(hint, text, animate) {
          hint.title = text;
          const current = hint.querySelector(".sa-hint-layer");
          const next = document.createElement("span");
          next.className = "sa-hint-layer";
          next.textContent = text;
          if (!animate || current === null) {
            hint.textContent = "";
            hint.appendChild(next);
            return;
          }
          next.classList.add("sa-hint-in");
          current.classList.add("sa-hint-out");
          hint.appendChild(next);
          window.setTimeout(() => {
            if (!hint.isConnected) return;
            current.remove();
            next.classList.remove("sa-hint-in");
            hint.textContent = "";
            hint.appendChild(next);
          }, 320);
        }
        const panelHintMessages = { panel: "", side: "" };
        const panelHintTimers = { panel: 0, side: 0 };
        function hintSurfaceOf(root) {
          return root instanceof Element && root.closest('[data-sa-ui="side"]') !== null ? "side" : "panel";
        }
        function livePanelHint(surface) {
          const selector = surface === "side" ? '[data-sa-ui="side"] .sa-panel-hint' : '[data-sa-ui="panel"] .sa-panel-hint';
          const hints = Array.from(document.querySelectorAll(selector));
          return hints.find((hint) => hint.getClientRects().length > 0) || hints[0] || null;
        }
        function panelHintTextOf(surface) {
          return panelHintMessages[surface] || "";
        }
        function flashPanelHint(message, root) {
          const surface = hintSurfaceOf(root);
          panelHintMessages[surface] = message;
          const hint = livePanelHint(surface);
          if (hint !== null) {
            if (hint.querySelector(".sa-hint-layer") === null) {
              hint.textContent = "";
              const layer = document.createElement("span");
              layer.className = "sa-hint-layer";
              layer.textContent = t("panel.foot");
              hint.appendChild(layer);
            }
            swapHintText(hint, message, true);
          }
          if (panelHintTimers[surface] !== 0) window.clearTimeout(panelHintTimers[surface]);
          panelHintTimers[surface] = window.setTimeout(() => {
            panelHintTimers[surface] = 0;
            panelHintMessages[surface] = "";
            const live = livePanelHint(surface);
            if (live !== null) swapHintText(live, t("panel.foot"), true);
          }, 1600);
        }
        async function copyAnnotationsToClipboard(items, root, doneMessage) {
          const list = Array.isArray(items) ? items : [];
          if (list.length === 0) return false;
          const copied = await writeClipboardText(serializeAnnotations(list));
          const done = typeof doneMessage === "string" && doneMessage !== "" ? doneMessage : t("panel.copyDone", { n: list.length });
          const message = copied ? done : t("panel.copyFailed");
          const surface = hintSurfaceOf(root);
          flashPanelHint(message, root);
          const hint = livePanelHint(surface);
          if (hint === null || hint.getClientRects().length === 0) flashJumpToast(message);
          return copied;
        }
        function addUniqueAnnotations(list) {
          let added = 0;
          const seen = new Set(annotations.map((item) => annotationSignature(item)));
          for (const item of list) {
            const signature = annotationSignature(item);
            if (seen.has(signature)) continue;
            seen.add(signature);
            const created = addAnnotation({
              quote: item.quote,
              note: item.note,
              images: item.images,
              source: item.source
            });
            if (created !== void 0) added += 1;
          }
          return added;
        }
        function importAnnotations(items, root) {
          const list = Array.isArray(items) ? items : [];
          if (list.length === 0) return 0;
          const added = addUniqueAnnotations(list);
          if (added === 0) {
            flashPanelHint(t("panel.pasteNothing"), root);
            return 0;
          }
          flashPanelHint(t("panel.pasteDone", { n: added }), root);
          scheduleRepaint("emit");
          return added;
        }
        function pasteAnnotationsFromClipboard(root) {
          const read = safe(() => navigator.clipboard?.readText);
          if (typeof read !== "function") {
            flashPanelHint(t("panel.pasteFailed"), root);
            return;
          }
          read.call(navigator.clipboard).then((text) => {
            const items = parseAnnotations(text);
            if (items === void 0) {
              flashPanelHint(t("panel.pasteFailed"), root);
              return;
            }
            importAnnotations(items, root);
          }).catch(() => flashPanelHint(t("panel.pasteFailed"), root));
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
        function updateAnnotationSource(id, source) {
          if (typeof id !== "string" || id === "" || source === null || typeof source !== "object") return false;
          let hit = false;
          annotations = annotations.map((item) => {
            if (item.id !== id) return item;
            hit = true;
            return { ...item, source };
          });
          if (!hit) return false;
          emit();
          saveDraft(annotationsSession);
          return true;
        }
        function removeAnnotation(id) {
          annotations = annotations.filter((item) => item.id !== id);
          renumber();
          emit();
          scheduleSync();
          scheduleRepaint("emit");
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
          scheduleRepaint("emit");
          saveDraft(annotationsSession);
          refreshPanel();
        }
        function clearAnnotations() {
          annotations = [];
          emit();
          scheduleSync();
          scheduleRepaint("emit");
          saveDraft(annotationsSession);
        }
        const sentStore = createSentStore({
          getStorage: () => draftStorage(),
          tableFor: sentBySession,
          prefix: SENT_STORAGE_PREFIX,
          maxEntries: SENT_MAX_ENTRIES,
          maxBytes: SENT_MAX_BYTES,
          maxItems: DRAFT_MAX_ITEMS,
          onChanged: (sessionId) => {
            if (!hydratedSessions.has(sessionId)) {
              pendingRemotePush.add(sessionId);
              return;
            }
            scheduleRemotePush(sessionId);
          }
        });
        const loadSent = (sessionId) => sentStore.loadSent(sessionId);
        const saveSent = (sessionId, table) => sentStore.saveSent(sessionId, table);
        const batchOptionsOf = (entry) => typeof entry?.batchUuid === "string" && entry.batchUuid !== "" ? { batchUuid: entry.batchUuid } : void 0;
        const recordSent = (sessionId, anchorKey, items, turn, options) => {
          const extra = options ?? {};
          const existing = sentStore.loadSent(sessionId).get(anchorKey);
          const storedUuid = typeof existing?.batchUuid === "string" && existing.batchUuid !== "" ? existing.batchUuid : void 0;
          const givenUuid = typeof extra.batchUuid === "string" && extra.batchUuid !== "" ? extra.batchUuid : void 0;
          const batchUuid = givenUuid ?? storedUuid ?? (existing === void 0 ? uuidV4() : void 0);
          sentStore.recordSent(sessionId, anchorKey, items, turn, {
            ...extra,
            ...batchUuid !== void 0 ? { batchUuid } : {}
          });
          consumedSnapshot = null;
          markConversationDirty();
        };
        const updateSentBatch = (sessionId, anchorKey, options) => {
          sentStore.updateSentBatch(sessionId, anchorKey, options);
          markConversationDirty();
        };
        function batchItemUuids(result, count) {
          const list = Array.isArray(result?.items) ? result.items : Array.isArray(result?.entries) ? result.entries : Array.isArray(result?.uuids) ? result.uuids : void 0;
          if (list === void 0 || list.length !== count) return void 0;
          const uuids = list.map(
            (entry) => typeof entry === "string" ? entry : typeof entry?.uuid === "string" ? entry.uuid : ""
          );
          return uuids.every((uuid) => uuid !== "") ? uuids : void 0;
        }
        const sentBatchRetries = /* @__PURE__ */ new Map();
        const sentBatchInflight = /* @__PURE__ */ new Set();
        const SENT_BATCH_RETRY_MAX = 3;
        function sentRetryKey(sessionId, storedKey) {
          return `${sessionId}\0${storedKey}`;
        }
        function setSentUnsynced(sessionId, storedKey, unsynced) {
          const table = sentStore.loadSent(sessionId);
          const record = table.get(storedKey);
          if (record === void 0) return false;
          if (record.unsynced === true === unsynced) return false;
          const next = { ...record };
          if (unsynced) next.unsynced = true;
          else delete next.unsynced;
          table.set(storedKey, next);
          sentStore.saveSent(sessionId, table);
          return true;
        }
        function recordWasRewound(record) {
          return record !== null && record !== void 0 && typeof record === "object" && Number.isFinite(record.rewoundAt);
        }
        function recordRewoundTurn(record) {
          if (!recordWasRewound(record)) return null;
          return Number.isFinite(record.rewoundTurn) ? Number(record.rewoundTurn) : null;
        }
        function paintRewoundBadge(card, rewound) {
          if (card === null || typeof card?.querySelector !== "function") return;
          const existing = card.querySelector(".sa-sent-rewound");
          if (rewound !== true) {
            if (existing !== null) existing.remove();
            return;
          }
          if (existing !== null) return;
          const title = card.querySelector(".sa-section-title");
          if (title === null || title.parentElement === null) return;
          const badge = el("span", "sa-sent-rewound", t("sent.rewound"));
          badge.setAttribute("data-sa-field", "rewound");
          title.parentElement.insertBefore(badge, title.nextSibling);
        }
        function paintUnsyncedBadge(card, unsynced) {
          if (card === null || typeof card?.querySelector !== "function") return;
          const existing = card.querySelector(".sa-sent-unsynced");
          if (!unsynced) {
            if (existing !== null) existing.remove();
            return;
          }
          if (existing !== null) return;
          const title = card.querySelector(".sa-section-title");
          if (title === null || title.parentElement === null) return;
          const badge = el("span", "sa-sent-unsynced", t("sent.unsynced"));
          badge.setAttribute("data-sa-field", "unsynced");
          title.parentElement.insertBefore(badge, title.nextSibling);
        }
        function markSentUnsynced(sessionId, storedKey, count, status, reason) {
          const record = sentStore.loadSent(sessionId).get(storedKey);
          const anchorKey = typeof record?.anchorKey === "string" && record.anchorKey !== "" ? record.anchorKey : storedKey;
          scrollTrace.push({
            t: Date.now(),
            kind: "batch-fail",
            status: Number.isFinite(status) ? status : 0,
            sessionId,
            anchorKey,
            items: count,
            reason: String(reason ?? "")
          });
          if (reason === "unsupported") return;
          setSentUnsynced(sessionId, storedKey, true);
          if (currentSessionId() === sessionId) {
            const card = document.querySelector(`[data-sa-ui="sent"][data-sa-key="${cssEscape(storedKey)}"]`);
            paintUnsyncedBadge(card, true);
            markConversationDirty();
            scheduleRepaint("batch-fail");
          }
        }
        function sentBatchBody(sessionId, storedKey, items, turn, batchAt, bodyAnchorKey) {
          const wireItems = items.map((item) => ({
            ...typeof item.uuid === "string" && item.uuid !== "" ? { uuid: item.uuid } : {},
            index: item.index,
            quote: item.quote,
            note: item.note,
            source: item.source,
            ...Array.isArray(item.images) ? { images: item.images } : {}
          }));
          const storedRecord = sentStore.loadSent(sessionId).get(storedKey);
          const batchUuid = typeof storedRecord?.batchUuid === "string" && storedRecord.batchUuid !== "" ? storedRecord.batchUuid : void 0;
          return {
            ...Number.isFinite(turn) ? { turn } : {},
            anchor_key: bodyAnchorKey,
            ...Number.isFinite(batchAt) ? { batch_at: batchAt } : {},
            ...batchUuid !== void 0 ? { batch_uuid: batchUuid } : {},
            items: wireItems
          };
        }
        function syncSentBatch(sessionId, storedKey, items, turn, batchAt) {
          if (typeof sessionId !== "string" || sessionId === "" || !Array.isArray(items) || items.length === 0) return;
          const flightKey = sentRetryKey(sessionId, storedKey);
          if (sentBatchInflight.has(flightKey)) return;
          sentBatchInflight.add(flightKey);
          const settle = () => sentBatchInflight.delete(flightKey);
          const storedRecord = sentStore.loadSent(sessionId).get(storedKey);
          const bodyAnchorKey = typeof storedRecord?.anchorKey === "string" && storedRecord.anchorKey !== "" ? storedRecord.anchorKey : storedKey;
          const body = sentBatchBody(sessionId, storedKey, items, turn, batchAt, bodyAnchorKey);
          scrollTrace.push({
            t: Date.now(),
            kind: "batch-post",
            session: sessionId,
            anchorKey: bodyAnchorKey,
            items: items.length,
            hasBatchUuid: typeof body.batch_uuid === "string" && body.batch_uuid !== ""
          });
          void remoteSync.createBatch(sessionId, body).then((result) => {
            settle();
            if (result === void 0 || result?.ok !== true) {
              const status = Number.isFinite(result?.status) ? result.status : 0;
              const reason = typeof result?.reason === "string" && result.reason !== "" ? result.reason : "unknown";
              scrollTrace.push({
                t: Date.now(),
                kind: "batch-done",
                session: sessionId,
                ok: false,
                status,
                reason
              });
              markSentUnsynced(sessionId, storedKey, items.length, status, reason);
              return;
            }
            scrollTrace.push({
              t: Date.now(),
              kind: "batch-done",
              session: sessionId,
              ok: true,
              status: Number.isFinite(result.status) ? result.status : 0,
              reason: ""
            });
            sentBatchRetries.delete(sentRetryKey(sessionId, storedKey));
            setSentUnsynced(sessionId, storedKey, false);
            const batchUuid = typeof result.batch_uuid === "string" && result.batch_uuid !== "" ? result.batch_uuid : void 0;
            const batchSeq = Number.isSafeInteger(result.batch_seq) ? result.batch_seq : void 0;
            if (batchUuid !== void 0) {
              void remoteSync.patchBatch(batchUuid, {
                ...Number.isFinite(turn) ? { turn } : {},
                ...typeof bodyAnchorKey === "string" && bodyAnchorKey !== "" ? { anchor_key: bodyAnchorKey } : {}
              }).catch(() => {
              });
            }
            if (batchUuid !== void 0 || batchSeq !== void 0) {
              updateSentBatch(sessionId, storedKey, {
                batchUuid,
                batchSeq,
                uuids: batchItemUuids(result, items.length)
              });
            }
            if (currentSessionId() === sessionId) {
              const card = document.querySelector(`[data-sa-ui="sent"][data-sa-key="${cssEscape(storedKey)}"]`);
              paintUnsyncedBadge(card, false);
            }
            scheduleRepaint("emit");
          }).catch((error) => {
            settle();
            const reason = error instanceof Error && error.message !== "" ? error.message : "network";
            scrollTrace.push({
              t: Date.now(),
              kind: "batch-done",
              session: sessionId,
              ok: false,
              status: 0,
              reason
            });
            markSentUnsynced(sessionId, storedKey, items.length, 0, reason);
          });
        }
        function retryUnsyncedSentBatch(sessionId, storedKey, record) {
          if (record?.unsynced !== true) return;
          const retryKey = sentRetryKey(sessionId, storedKey);
          if (sentBatchInflight.has(retryKey)) return;
          const used = sentBatchRetries.get(retryKey) ?? 0;
          if (used >= SENT_BATCH_RETRY_MAX) return;
          sentBatchRetries.set(retryKey, used + 1);
          syncSentBatch(sessionId, storedKey, record.items, turnOfRecord(record, storedKey), record.savedAt);
        }
        const SEND_LABEL_RE = /(发送|送信|전송|senden|envoyer|inviare|send)/i;
        function submitButtonOf(scope) {
          const root = scope !== null && scope !== void 0 && typeof scope.querySelectorAll === "function" ? scope : document;
          for (const button3 of root.querySelectorAll("button")) {
            if (button3.disabled === true) continue;
            const label = button3.getAttribute("aria-label");
            if (typeof label === "string" && SEND_LABEL_RE.test(label)) return button3;
          }
          return null;
        }
        function blockSendGate(reason, detail) {
          scrollTrace.push({
            t: Date.now(),
            kind: "gate-block",
            session: attachedSessionId ?? currentSessionId(),
            reason: String(reason ?? ""),
            ...typeof detail === "string" && detail !== "" ? { detail } : {}
          });
          const suffix = typeof detail === "string" && detail !== "" ? `（${detail}）` : "";
          flashJumpToast(`${t("gate.failed")}${suffix}`);
          log(`[selection-annotations] 批注没入库，这条消息没有发出：${reason} ${detail ?? ""}`);
        }
        function replaySend(button3, scope) {
          const shell = inputShell();
          if (shell !== void 0) ensureFallbackPrompt(shell);
          const target = button3 !== null && button3 !== void 0 && button3.isConnected === true ? button3 : submitButtonOf(scope);
          if (target === null) {
            blockSendGate("no-submit-button");
            return;
          }
          gateBypass = true;
          try {
            target.click();
          } finally {
            gateBypass = false;
          }
        }
        async function storePendingBatch(items) {
          const sessionId = attachedSessionId ?? currentSessionId();
          if (sessionId === void 0) {
            blockSendGate("no-session");
            return false;
          }
          if (typeof fetch !== "function") {
            blockSendGate("no-fetch");
            return false;
          }
          const wireItems = items.map((item) => ({
            ...typeof item.uuid === "string" && item.uuid !== "" ? { uuid: item.uuid } : {},
            index: item.index,
            quote: item.quote,
            note: item.note,
            source: item.source,
            ...Array.isArray(item.images) ? { images: item.images } : {}
          }));
          const reuse = gateBatch !== null && gateBatch.sessionId === sessionId;
          const batchUuid = reuse ? gateBatch.batchUuid : uuidV4();
          const batchAt = reuse ? gateBatch.at : Date.now();
          gateBatch = { sessionId, batchUuid, at: batchAt };
          scrollTrace.push({ t: Date.now(), kind: "gate-post", session: sessionId, items: wireItems.length });
          const result = await remoteSync.createBatch(sessionId, {
            batch_at: batchAt,
            batch_uuid: batchUuid,
            items: wireItems
          });
          const status = Number.isFinite(result?.status) ? result.status : 0;
          const storedUuid = typeof result?.batch_uuid === "string" && result.batch_uuid !== "" ? result.batch_uuid : void 0;
          if (result?.ok !== true || storedUuid === void 0) {
            const reason = typeof result?.reason === "string" && result.reason !== "" ? result.reason : "unknown";
            scrollTrace.push({ t: Date.now(), kind: "gate-done", session: sessionId, ok: false, status, reason });
            blockSendGate(reason, status > 0 ? `HTTP ${status}` : "");
            return false;
          }
          const storedItems = Array.isArray(result.items) ? result.items.length : -1;
          if (storedItems !== wireItems.length) {
            const detail = `${storedItems}/${wireItems.length}`;
            scrollTrace.push({ t: Date.now(), kind: "gate-done", session: sessionId, ok: false, status, reason: "count-mismatch" });
            blockSendGate("count-mismatch", detail);
            return false;
          }
          gateBatch = { sessionId, batchUuid: storedUuid, at: batchAt };
          scrollTrace.push({ t: Date.now(), kind: "gate-done", session: sessionId, ok: true, status, reason: "" });
          return true;
        }
        function holdSendForGate(event, button3, scope) {
          if (gateBypass) return false;
          if (annotations.length === 0) return false;
          if (event !== null && event !== void 0 && typeof event.preventDefault === "function") {
            event.preventDefault();
            event.stopPropagation();
          }
          if (gateBusy) return true;
          void (async () => {
            gateBusy = true;
            try {
              if (draftIds.length === 0) await syncAttachment();
              if (draftIds.length === 0) {
                blockSendGate("no-attachment");
                return;
              }
              const items = draftSentItems(annotations);
              if (items === null || items.length === 0) {
                replaySend(button3, scope);
                return;
              }
              if (!await storePendingBatch(items)) return;
              replaySend(button3, scope);
            } catch (error) {
              blockSendGate("gate-error", error instanceof Error ? error.message : "");
            } finally {
              gateBusy = false;
            }
          })();
          return true;
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
            if (anchorKey.startsWith("group:")) continue;
            if (anchorKey.startsWith("call:")) continue;
            if (element.hasAttribute?.("data-chat-group-key")) continue;
            if (kind === "") push(element, anchorKey);
          }
          return rows;
        }
        function captureAnchorKeys() {
          return new Set(
            collectAnchorRows().filter((entry) => !isPendingEchoRow(entry.row)).map((entry) => entry.anchorKey)
          );
        }
        const PENDING_ECHO_SELECTOR = "[data-pending-steering], [data-submission-echo]";
        function isPendingEchoRow(row) {
          if (row === null || row === void 0 || typeof row.getAttribute !== "function") return false;
          return row.getAttribute("data-pending-steering") !== null || row.getAttribute("data-submission-echo") !== null;
        }
        function pendingEchoes(scope) {
          const root = scope !== null && scope !== void 0 && scope.isConnected ? scope : document;
          const echoes = [];
          for (const element of root.querySelectorAll(PENDING_ECHO_SELECTOR)) {
            if (typeof element.getClientRects === "function" && element.getClientRects().length === 0) continue;
            echoes.push(element);
          }
          return echoes;
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
          scheduleRepaint("emit");
          saveDraft(annotationsSession);
          warn("[selection-annotations] 这批批注没能记进已发送台账，已放回界面。");
        }
        function scanSentMessages() {
          if (pendingSent.length === 0) return;
          const now = Date.now();
          const expired = [];
          const stillPending = [];
          for (const entry of pendingSent) {
            if (now - entry.at < SENT_PENDING_TTL_MS) {
              stillPending.push(entry);
              continue;
            }
            if (pendingEchoes(entry.scope).length > 0) {
              stillPending.push(entry);
              continue;
            }
            expired.push(entry);
          }
          pendingSent = stillPending;
          let expiredRecorded = false;
          for (const entry of expired) {
            const entrySession = typeof entry.sessionId === "string" && entry.sessionId !== "" ? entry.sessionId : currentSessionId();
            if (entrySession === void 0) continue;
            let hint = entry.turnHint;
            if (!Number.isFinite(hint) && entry.scope !== null && entry.scope !== void 0 && entry.scope.isConnected) {
              hint = turnHintForScope(entry.scope);
            }
            if (!Number.isFinite(hint)) continue;
            recordSent(entrySession, `turn:${hint}:${entry.at}`, entry.items, hint, batchOptionsOf(entry));
            expiredRecorded = true;
          }
          if (expiredRecorded) scheduleRepaint("mutation");
          if (expired.length > 0 && !expiredRecorded && pendingSent.length === 0) restoreConsumedSnapshot();
          if (pendingSent.length === 0) return;
          const pending = pendingSent[0];
          const sessionId = typeof pending.sessionId === "string" && pending.sessionId !== "" ? pending.sessionId : currentSessionId();
          if (sessionId === void 0) return;
          const recordWithHint = () => {
            const known = new Set(pending.known);
            for (const [key, other] of loadSent(sessionId)) {
              known.add(key);
              if (typeof other.anchorKey === "string" && other.anchorKey !== "") known.add(other.anchorKey);
            }
            let scope = pending.scope;
            if (scope === null || scope === void 0 || !scope.isConnected) {
              scope = visibleConversationScopes()[0] ?? null;
            }
            const sentRow = scope === null ? null : findSentAnnotationRow(scope, known, pending.items);
            if (sentRow !== null) {
              pendingSent.shift();
              recordSent(sessionId, sentRow.anchorKey, pending.items, sentRow.turn, batchOptionsOf(pending));
              syncSentBatch(sessionId, sentRow.anchorKey, pending.items, sentRow.turn, pending.at);
              scheduleRepaint("emit");
              return true;
            }
            let hint = pending.turnHint;
            if (!Number.isFinite(hint) && pending.scope !== null && pending.scope !== void 0 && pending.scope.isConnected) {
              hint = turnHintForScope(pending.scope);
            }
            if (!Number.isFinite(hint)) return false;
            pendingSent.shift();
            recordSent(sessionId, `turn:${hint}:${pending.at}`, pending.items, hint, batchOptionsOf(pending));
            syncSentBatch(sessionId, `turn:${hint}:${pending.at}`, pending.items, hint, pending.at);
            scheduleRepaint("emit");
            return true;
          };
          const rows = collectAnchorRows();
          const queued = pendingEchoes(pending.scope);
          if (rows.length === 0) {
            if (queued.length > 0) return;
            recordWithHint();
            return;
          }
          const fresh = rows.filter((entry) => {
            if (pending.known.has(entry.anchorKey)) return false;
            if (loadSent(sessionId).has(entry.anchorKey)) return false;
            const kind = entry.row.getAttribute("data-chat-flow-kind") ?? "";
            if (kind === "turn-process") return false;
            if (isPendingEchoRow(entry.row)) return false;
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
            return kind === "";
          });
          const pool = attached.length > 0 ? attached : bubbles.length > 0 ? bubbles : loose;
          const wait = Date.now() - pending.at;
          const fallback = pool.length === 0 && queued.length === 0 && wait > 1200 ? fresh.slice(-1) : [];
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
            if (queued.length > 0) return;
            recordWithHint();
            return;
          }
          pendingSent.shift();
          const turn = turnOfRow(target.row);
          recordSent(sessionId, target.anchorKey, pending.items, turn, batchOptionsOf(pending));
          syncSentBatch(sessionId, target.anchorKey, pending.items, turn, pending.at);
          scheduleRepaint("emit");
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
        const cards = createCards({ t, openImageViewer, markdown, isAdopt: hasAdoptNote, noteView: noteViewOf });
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
        function conversationScopeOf(node) {
          let scope = null;
          let current = node.parentElement ?? null;
          for (let i = 0; i < 32 && current !== null && current !== void 0; i += 1) {
            if (current === document.body || current === document.documentElement) break;
            if (typeof current.querySelector === "function" && current.querySelector("[data-chat-turn]") !== null) scope = current;
            current = current.parentElement ?? null;
          }
          return scope;
        }
        function visibleConversationScopes() {
          const scopes = [];
          for (const input of document.querySelectorAll('textarea, [contenteditable="true"]')) {
            const rect = safe(() => input.getBoundingClientRect());
            if (rect === void 0 || rect.width <= 0 || rect.height <= 0) continue;
            const scope = conversationScopeOf(input);
            if (scope !== null) scopes.push(scope);
          }
          return scopes;
        }
        function rowCarriesSentAnnotations(row, items) {
          const text = (row.textContent ?? "").replace(/\s+/g, " ");
          if (!text.includes(PAYLOAD_KIND)) return false;
          for (const item of items) {
            for (const [raw, minLength] of [[item?.quote, 4], [item?.note, 2]]) {
              if (typeof raw !== "string") continue;
              const prefix = raw.trim().slice(0, 24);
              if (prefix.length < minLength) continue;
              if (text.includes(prefix.replace(/\s+/g, " "))) return true;
              const escaped = JSON.stringify(prefix).slice(1, -1);
              if (escaped !== prefix && text.includes(escaped)) return true;
            }
          }
          return false;
        }
        function findSentAnnotationRow(scope, known, items) {
          const root = scope !== null && scope !== void 0 && scope.isConnected ? scope : document;
          let best = null;
          let bestTurn = -1;
          for (const row of root.querySelectorAll('[data-chat-anchor-key][data-chat-flow-kind="user"]')) {
            const anchorKey = row.getAttribute("data-chat-anchor-key") ?? "";
            if (anchorKey === "" || known.has(anchorKey)) continue;
            if (isPendingEchoRow(row)) continue;
            if (typeof row.getClientRects === "function" && row.getClientRects().length === 0) continue;
            if (!rowCarriesSentAnnotations(row, items)) continue;
            const turn = turnOfRow(row);
            const score = Number.isFinite(turn) ? turn : 0;
            if (score >= bestTurn) {
              bestTurn = score;
              best = { row, anchorKey, turn };
            }
          }
          return best;
        }
        function isSyntheticSentAnchor(anchorKey, storedKey) {
          for (const key of [anchorKey, storedKey]) {
            if (typeof key !== "string" || key === "") continue;
            if (key.startsWith("call:") || key.startsWith("turn:")) return true;
          }
          return false;
        }
        const reclaimAttempts = /* @__PURE__ */ new Set();
        function reclaimSentRecord(record, storedKey, sessionId, table) {
          const batchId = typeof record.batchUuid === "string" && record.batchUuid !== "" ? record.batchUuid : storedKey;
          const attemptKey = `${sessionId}\0${batchId}`;
          if (reclaimAttempts.has(attemptKey)) return null;
          const taken = /* @__PURE__ */ new Set();
          for (const [key, other] of table) {
            taken.add(key);
            if (typeof other.anchorKey === "string" && other.anchorKey !== "") taken.add(other.anchorKey);
          }
          let best = null;
          let bestTurn = -1;
          for (const scope of visibleConversationScopes()) {
            const found = findSentAnnotationRow(scope, taken, record.items);
            if (found === null) continue;
            const score = Number.isFinite(found.turn) ? found.turn : 0;
            if (score >= bestTurn) {
              bestTurn = score;
              best = found;
            }
          }
          if (best === null) return null;
          reclaimAttempts.add(attemptKey);
          record.anchorKey = best.anchorKey;
          if (Number.isFinite(best.turn)) record.turn = best.turn;
          saveSent(sessionId, table);
          if (typeof record.batchUuid === "string" && record.batchUuid !== "") {
            void remoteSync.patchBatch(record.batchUuid, {
              ...Number.isFinite(best.turn) ? { turn: best.turn } : {},
              anchor_key: best.anchorKey
            }).catch(() => {
            });
          }
          return best;
        }
        function sentSweepScopes(table) {
          const scopes = /* @__PURE__ */ new Set();
          const collect = (node) => {
            const scope = conversationScopeOf(node);
            if (scope !== null) scopes.add(scope);
          };
          for (const scope of visibleConversationScopes()) scopes.add(scope);
          for (const [storedKey, record] of table) {
            const card = document.querySelector(`[data-sa-ui="sent"][data-sa-key="${cssEscape(storedKey)}"]`);
            if (card !== null) collect(card);
            const anchorKey = typeof record.anchorKey === "string" && record.anchorKey !== "" ? record.anchorKey : resolveLegacyAnchor(storedKey);
            const row = document.querySelector(`[data-chat-anchor-key="${cssEscape(anchorKey)}"]`);
            if (row !== null) collect(row);
          }
          return scopes;
        }
        function replaceCardChildren(target, fresh) {
          const children = [];
          for (const child of fresh.childNodes ?? []) children.push(child);
          if (typeof target.replaceChildren === "function") {
            target.replaceChildren(...children);
            return;
          }
          target.textContent = "";
          for (const child of children) target.appendChild(child);
        }
        let sentRenderStats = null;
        function renderSentCards() {
          const changesAtStart = conversationChanges;
          const touched = () => conversationChanges !== changesAtStart;
          const sessionId = currentSessionId();
          const stats = {
            sessionId,
            size: 0,
            cards: 0,
            skipped: 0,
            errors: 0,
            lastError: "",
            anchorMiss: 0,
            reasons: { noSession: 0, emptyTable: 0, emptyItems: 0, noTurn: 0, turnNotInDom: 0 }
          };
          sentRenderStats = stats;
          if (sessionId === void 0) {
            stats.reasons.noSession += 1;
            return touched();
          }
          const table = loadSent(sessionId);
          stats.size = table.size;
          if (table.size === 0) {
            stats.reasons.emptyTable += 1;
            return touched();
          }
          for (const scope of sentSweepScopes(table)) {
            for (const stale of scope.querySelectorAll('[data-sa-ui="sent"]')) {
              const key = stale.getAttribute("data-sa-key");
              if (key === null || !table.has(key)) {
                markConversationChanged();
                stale.remove();
              }
            }
          }
          let learnedTurn = false;
          for (const [storedKey, record] of table) {
            if (record.items.length === 0) {
              stats.skipped += 1;
              stats.reasons.emptyItems += 1;
              continue;
            }
            if (record.unsynced === true) retryUnsyncedSentBatch(sessionId, storedKey, record);
            let anchorKey = typeof record.anchorKey === "string" && record.anchorKey !== "" ? record.anchorKey : resolveLegacyAnchor(storedKey);
            let row = document.querySelector(`[data-chat-anchor-key="${cssEscape(anchorKey)}"]`);
            let turn = turnOfRecord(record, storedKey);
            if (!Number.isFinite(turn) && row !== null) {
              const found = turnOfRow(row);
              if (Number.isFinite(found)) {
                turn = found;
                record.turn = turn;
                learnedTurn = true;
              }
            }
            let footer = footerBlockForTurn(turn);
            if (footer === null && Number.isFinite(turn) && isSyntheticSentAnchor(anchorKey, storedKey)) {
              const claimed = reclaimSentRecord(record, storedKey, sessionId, table);
              if (claimed !== null) {
                anchorKey = claimed.anchorKey;
                row = claimed.row;
                turn = Number.isFinite(claimed.turn) ? claimed.turn : turn;
                footer = footerBlockForTurn(turn);
              }
            }
            if (row === null && footer === null) {
              stats.skipped += 1;
              if (!Number.isFinite(turn)) stats.reasons.noTurn += 1;
              else stats.reasons.turnNotInDom += 1;
              placementPending = true;
              continue;
            }
            if (row === null) stats.anchorMiss += 1;
            if (row !== null && isPendingEchoRow(row)) {
              const queuedCard = document.querySelector(`[data-sa-ui="sent"][data-sa-key="${cssEscape(storedKey)}"]`);
              if (queuedCard !== null) {
                markConversationChanged();
                queuedCard.remove();
              }
              stats.skipped += 1;
              continue;
            }
            const existing = document.querySelector(`[data-sa-ui="sent"][data-sa-key="${cssEscape(storedKey)}"]`);
            const cardOptions = {
              onReuse: () => reuseSentItems(record.items, record),
              onReplayItem: (item) => reuseSentItems([item], record),
              onJumpQuote: (item, root) => jumpToQuote(item, turn, root)
            };
            let card = existing;
            const sentSignature = hashString({
              anchorKey,
              // 回退标记也算内容：标记变了就得重画卡片，否则「已撤回」要等下一次正文变化才露面。
              rewoundAt: recordWasRewound(record) ? record.rewoundAt : 0,
              items: record.items.map((item) => ({
                quote: item.quote,
                note: item.note,
                images: (item.thumbs ?? []).map((thumb) => thumb.name)
              }))
            });
            if (card !== null && card.getAttribute("data-sa-sig") !== sentSignature) {
              markConversationChanged();
              replaceCardChildren(existing, buildSentCard(record, anchorKey, cardOptions));
              if (typeof existing.removeAttribute === "function") existing.removeAttribute("data-sa-reply-sig");
              card = existing;
            }
            if (card === null) card = buildSentCard(record, anchorKey, cardOptions);
            card.setAttribute("data-sa-sig", sentSignature);
            card.setAttribute("data-sa-key", storedKey);
            card.setAttribute("data-anchor", anchorKey);
            if (Number.isFinite(turn)) card.setAttribute("data-sa-turn", String(turn));
            else if (typeof card.removeAttribute === "function") card.removeAttribute("data-sa-turn");
            paintUnsyncedBadge(card, record.unsynced === true);
            const rewound = recordWasRewound(record);
            paintRewoundBadge(card, rewound);
            if (rewound) card.setAttribute("data-sa-rewound", "1");
            else if (typeof card.removeAttribute === "function") card.removeAttribute("data-sa-rewound");
            const bubbleKind = row === null ? "" : row.getAttribute("data-chat-flow-kind") ?? "";
            const onBubble = !Number.isFinite(turn) && row !== null && (bubbleKind === "user" || bubbleKind === "steering");
            if (onBubble && row.parentElement !== null && row.parentElement !== document.body) {
              if (card.parentElement !== row.parentElement || card.previousSibling !== row) {
                markConversationChanged();
                row.parentElement.insertBefore(card, row.nextSibling);
              }
              continue;
            }
            const disclosure = Number.isFinite(turn) ? turnDisclosureItem(turn) : null;
            if (disclosure !== null && disclosure.parentElement !== null) {
              if (card.parentElement !== disclosure.parentElement || card.nextSibling !== disclosure) {
                markConversationChanged();
                disclosure.parentElement.insertBefore(card, disclosure);
              }
              continue;
            }
            const anchorEl = Number.isFinite(turn) ? findTurnAnchor(turn, sessionId) : null;
            if (anchorEl !== null && anchorEl.parentElement !== null) {
              if (card.parentElement !== anchorEl.parentElement || card.nextSibling !== anchorEl) {
                markConversationChanged();
                anchorEl.parentElement.insertBefore(card, anchorEl);
              }
              continue;
            }
            if (footer !== null) {
              if (footer.parentElement !== null && (card.parentElement !== footer.parentElement || card.nextSibling !== footer)) {
                markConversationChanged();
                footer.parentElement.insertBefore(card, footer);
              }
              continue;
            }
            const target = sentCardAnchor(row);
            if (target.parent !== null) {
              if (card.parentElement !== target.parent || card.nextSibling !== target.before) {
                markConversationChanged();
                target.parent.insertBefore(card, target.before);
              }
            } else if (existing === null) {
              markConversationChanged();
              row.appendChild(card);
            }
          }
          if (learnedTurn) saveSent(sessionId, table);
          stats.cards = document.querySelectorAll('[data-sa-ui="sent"]').length;
          const turnsOfTable = [...table.values()].map((record) => record.turn).filter((value) => Number.isFinite(value));
          stats.turnMin = turnsOfTable.length > 0 ? Math.min(...turnsOfTable) : null;
          stats.turnMax = turnsOfTable.length > 0 ? Math.max(...turnsOfTable) : null;
          sentRenderStats = stats;
          return touched();
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
        function moveSection(section, container, before) {
          if (container === null || container === void 0) return;
          if (before === section) return;
          if (section.parentElement === container && section.nextSibling === before) return false;
          markConversationChanged();
          container.insertBefore(section, before);
          return true;
        }
        function placeReplyAfterTurnProcess(section, turn) {
          const parent = section.parentElement;
          if (parent === null) return;
          if (pointerSelecting === true) return;
          if (Number.isFinite(turn)) section.dataset.saTurn = String(turn);
          if (Number.isFinite(turn) && document.querySelector(`[data-turn-process="${turn}"]`) === null) {
            const sent = document.querySelector(`[data-sa-ui="sent"][data-sa-turn="${turn}"]`);
            if (sent !== null && sent.parentElement !== null) {
              let cursor2 = sent;
              while (cursor2.nextElementSibling !== null && cursor2.nextElementSibling.getAttribute?.("data-sa-ui") === "replies") {
                cursor2 = cursor2.nextElementSibling;
              }
              moveSection(section, sent.parentElement, cursor2.nextSibling);
              return;
            }
          }
          if (Number.isFinite(turn)) {
            const items = [...document.querySelectorAll(`[data-chat-turn="${turn}"]`)];
            const key = String(turn);
            const inProcess = (el2) => typeof el2.closest === "function" && el2.closest("[data-step-process-body],[data-turn-process-inline]") !== null;
            const isProcessRow = (el2) => {
              const kind = el2.getAttribute?.("data-chat-flow-kind") ?? "";
              return kind === "turn-process" || el2.hasAttribute?.("data-turn-process-member") || el2.hasAttribute?.("data-turn-process-inline");
            };
            const isAnswerRow = (el2) => {
              const kind = el2.getAttribute?.("data-chat-flow-kind") ?? "";
              if (kind !== "assistant" && kind !== "assistant-step") return false;
              const part = el2.getAttribute?.("data-chat-group-part");
              return part === null || part === "response";
            };
            const rows = [...document.querySelectorAll(`[data-chat-turn="${key}"][data-chat-flow-kind]`)].filter((el2) => !inProcess(el2));
            let lastProcess = -1;
            rows.forEach((el2, index) => {
              if (isProcessRow(el2)) lastProcess = index;
            });
            let target = rows.find((el2, index) => index > lastProcess && isAnswerRow(el2)) ?? null;
            if (target === null) target = [...rows].reverse().find(isAnswerRow) ?? null;
            if (target !== null) {
              let top = target;
              while (top.parentElement !== null && top.parentElement.getAttribute?.("data-chat-turn") === key) {
                top = top.parentElement;
              }
              const container = top.parentElement;
              if (container !== null && container !== section) {
                moveSection(section, container, top);
                return;
              }
            }
            let lastMember = null;
            for (const item of items) {
              if (item.hasAttribute?.("data-turn-process-member")) {
                lastMember = item;
              }
            }
            const isProcessContainer = (el2) => el2 !== null && el2 !== void 0 && typeof el2.matches === "function" && el2.matches(
              '[data-step-process-body],[data-turn-process-inline],[data-chat-flow-kind="turn-process"],[data-turn-process-member]'
            );
            if (lastMember !== null) {
              let processBlock = lastMember;
              let host = processBlock.parentElement ?? null;
              while (host !== null && isProcessContainer(host)) {
                processBlock = host;
                host = processBlock.parentElement ?? null;
              }
              if (host !== null) {
                moveSection(section, host, processBlock.nextSibling);
                return;
              }
            }
          }
          const anchorEl = Number.isFinite(turn) ? findTurnAnchor(turn, currentSessionId()) : null;
          if (anchorEl !== null && anchorEl.parentElement !== null) {
            let cursor2 = anchorEl;
            while (cursor2.nextElementSibling !== null && cursor2.nextElementSibling.getAttribute?.("data-sa-ui") === "replies") {
              cursor2 = cursor2.nextElementSibling;
            }
            moveSection(section, anchorEl.parentElement, cursor2.nextSibling);
            return;
          }
          const block = footerBlockForTurn(turn);
          if (block !== null && block.parentElement !== null) {
            let cursor2 = block;
            while (cursor2.nextElementSibling !== null && cursor2.nextElementSibling.getAttribute?.("data-sa-ui") === "replies") {
              cursor2 = cursor2.nextElementSibling;
            }
            moveSection(section, block.parentElement, cursor2.nextSibling);
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
          moveSection(section, parent, cursor.nextSibling);
        }
        function applyLocale() {
          safe(() => {
            annotateLabel.textContent = t("annotate");
            adoptLabel.textContent = t("annotate.adopt");
            rejectLabel.textContent = t("annotate.reject");
            copyLabel.textContent = t("annotate.copy");
          });
          safe(() => {
            menuAnnotate.textContent = t("menu.annotate");
            menuAdopt.textContent = t("menu.adopt");
            menuReject.textContent = t("menu.reject");
            menuCopy.textContent = t("menu.copy");
          });
          safe(() => {
            popInput.setAttribute("aria-label", t("pop.placeholder"));
            popInput.dataset.placeholder = t("pop.placeholder");
          });
          safe(() => {
            popQuoteLabel.textContent = t("label.quote");
            popNoteLabel.textContent = t("pop.noteLabel");
            for (const node of jumpButtonNodes) {
              node.firstElementChild.textContent = t("jump.label");
              node.setAttribute("aria-label", t("jump.label"));
              node.title = t("jump.hint");
            }
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
          const changesAtStart = conversationChanges;
          const touched = () => conversationChanges !== changesAtStart;
          const sessionId = currentSessionId();
          if (sessionId === void 0) return touched();
          const table = loadSent(sessionId);
          if (table.size === 0) return touched();
          const batches = remoteReplyCache.get(sessionId) ?? [];
          if (batches.length === 0) return touched();
          const byAnchor = /* @__PURE__ */ new Map();
          const anchorOfCardKey = /* @__PURE__ */ new Map();
          const anchorOfUuid = /* @__PURE__ */ new Map();
          for (const [storedKey, record] of table) {
            const anchorKey = typeof record.anchorKey === "string" && record.anchorKey !== "" ? record.anchorKey : resolveLegacyAnchor(storedKey);
            const current = byAnchor.get(anchorKey);
            if (current === void 0 || current.record.savedAt < record.savedAt) {
              byAnchor.set(anchorKey, { record, turn: turnOfRecord(record, storedKey) });
            }
            for (const item of Array.isArray(record.items) ? record.items : []) {
              if (typeof item?.uuid !== "string" || item.uuid === "") continue;
              if (!anchorOfUuid.has(item.uuid)) anchorOfUuid.set(item.uuid, anchorKey);
            }
            if (!anchorOfCardKey.has(storedKey)) anchorOfCardKey.set(storedKey, anchorKey);
            if (!anchorOfCardKey.has(anchorKey)) anchorOfCardKey.set(anchorKey, anchorKey);
          }
          const hasUuidByAnchor = /* @__PURE__ */ new Map();
          for (const [anchorKey, entry] of byAnchor) {
            hasUuidByAnchor.set(
              anchorKey,
              (Array.isArray(entry.record.items) ? entry.record.items : []).some(
                (item) => typeof item?.uuid === "string" && item.uuid !== ""
              )
            );
          }
          const replyAnchorWithdrawn = (anchorKey) => {
            const entry = anchorKey === void 0 ? void 0 : byAnchor.get(anchorKey);
            if (entry === void 0 || !recordWasRewound(entry.record)) return false;
            const rewindTurn = recordRewoundTurn(entry.record);
            if (rewindTurn === null) return true;
            return !Number.isFinite(entry.turn) || entry.turn >= rewindTurn;
          };
          const anchors = [...byAnchor.entries()].map(([anchorKey, entry]) => ({ anchorKey, savedAt: entry.record.savedAt })).sort((a, b) => a.savedAt - b.savedAt);
          const grouped = /* @__PURE__ */ new Map();
          for (const batch of batches) {
            const at = Number(batch.at) || 0;
            let fallback;
            for (const anchor of anchors) {
              if (anchor.savedAt <= at) fallback = anchor.anchorKey;
            }
            for (const reply of Array.isArray(batch.replies) ? batch.replies : []) {
              const cardKey = typeof reply?.cardKey === "string" ? reply.cardKey.trim() : "";
              const uuid = typeof reply?.uuid === "string" && reply.uuid !== "" ? reply.uuid : void 0;
              let target = uuid === void 0 ? void 0 : anchorOfUuid.get(uuid);
              if (target === void 0 && uuid === void 0) {
                target = (cardKey === "" ? void 0 : anchorOfCardKey.get(cardKey)) ?? fallback;
              }
              if (target === void 0 && uuid !== void 0) {
                const candidate = (cardKey === "" ? void 0 : anchorOfCardKey.get(cardKey)) ?? fallback;
                if (candidate !== void 0 && hasUuidByAnchor.get(candidate) !== true) target = candidate;
              }
              if (target === void 0) continue;
              if (replyAnchorWithdrawn(target)) continue;
              let buckets = grouped.get(target);
              if (buckets === void 0) {
                buckets = /* @__PURE__ */ new Map();
                grouped.set(target, buckets);
              }
              let bucket = buckets.get(at);
              if (bucket === void 0) {
                bucket = [];
                buckets.set(at, bucket);
              }
              bucket.push(reply);
            }
          }
          for (const stale of document.querySelectorAll('[data-sa-ui="replies"]')) {
            const anchorKey = stale.getAttribute("data-anchor");
            if (anchorKey === null || !byAnchor.has(anchorKey) || !grouped.has(anchorKey)) {
              markConversationChanged();
              stale.remove();
            }
          }
          for (const [anchorKey, buckets] of grouped) {
            const list = [...buckets.entries()].map(([at, replies]) => ({ at, replies }));
            const escaped = cssEscape(anchorKey);
            const sentCards = document.querySelectorAll(`[data-sa-ui="sent"][data-anchor="${escaped}"]`);
            const sentCard = sentCards[sentCards.length - 1];
            const items = byAnchor.get(anchorKey)?.record.items ?? [];
            const record = byAnchor.get(anchorKey)?.record ?? null;
            const turn = byAnchor.get(anchorKey)?.turn ?? null;
            const signature = hashString({
              v: 4,
              batches: list.map((batch) => ({ at: batch.at, replies: batch.replies })),
              items: items.map((item) => ({ uuid: item.uuid, quote: item.quote, note: item.note }))
            });
            const existing = document.querySelector(`[data-sa-ui="replies"][data-anchor="${escaped}"]`);
            if (existing !== null) {
              if (existing.dataset.signature === signature) {
                placeReplyAfterTurnProcess(existing, turn);
                continue;
              }
              const fresh = buildReplySection(list, items, {
                onReuseAll: () => reuseSentItems(items, record),
                onReplayItem: (item) => reuseSentItems([item], record),
                onJumpQuote: (item, root) => jumpToQuote(item, turn, root)
              });
              fresh.setAttribute("data-anchor", anchorKey);
              fresh.dataset.signature = signature;
              markConversationChanged();
              existing.replaceWith(fresh);
              placeReplyAfterTurnProcess(fresh, turn);
              if (sentCard !== void 0) collapseSentForReplies(sentCard, signature);
              continue;
            }
            const host = sentCard !== void 0 ? sentCard : Number.isFinite(turn) ? footerBlockForTurn(turn) : null;
            const parent = host?.parentElement ?? null;
            if (parent === null) {
              placementPending = true;
              continue;
            }
            const section = buildReplySection(list, items, {
              onReuseAll: () => reuseSentItems(items, record),
              onReplayItem: (item) => reuseSentItems([item], record),
              onJumpQuote: (item, root) => jumpToQuote(item, turn, root)
            });
            section.setAttribute("data-anchor", anchorKey);
            section.dataset.signature = signature;
            markConversationChanged();
            parent.insertBefore(section, sentCard !== void 0 ? sentCard.nextSibling : host);
            placeReplyAfterTurnProcess(section, turn);
            if (sentCard !== void 0) collapseSentForReplies(sentCard, signature);
          }
          return touched();
        }
        function sentUuidOf(source) {
          if (source?.kind !== "sent") return void 0;
          const sessionId = annotationsSession ?? currentSessionId();
          if (sessionId === void 0) return void 0;
          if (typeof source.anchorKey !== "string" || source.anchorKey === "") return void 0;
          if (!Number.isFinite(source.index)) return void 0;
          let found;
          for (const [storedKey, record] of loadSent(sessionId)) {
            const anchorKey = typeof record.anchorKey === "string" && record.anchorKey !== "" ? record.anchorKey : resolveLegacyAnchor(storedKey);
            if (anchorKey !== source.anchorKey) continue;
            if (found !== void 0 && found.savedAt >= record.savedAt) continue;
            const item = record.items.find((entry) => Number(entry.index) === source.index);
            if (typeof item?.uuid === "string" && item.uuid !== "") found = { savedAt: record.savedAt, uuid: item.uuid };
          }
          return found?.uuid;
        }
        const payloadApi = createPayload({ t, instructionOf, uuidOfSent: sentUuidOf });
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
        function ensureFallbackPrompt(shell) {
          let text = fallbackTextOf();
          if (typeof text !== "string" || text.trim() === "") return;
          const now = /* @__PURE__ */ new Date();
          const stamp = [
            now.getFullYear(),
            String(now.getMonth() + 1).padStart(2, "0"),
            String(now.getDate()).padStart(2, "0")
          ].join("-") + " " + [
            String(now.getHours()).padStart(2, "0"),
            String(now.getMinutes()).padStart(2, "0"),
            String(now.getSeconds()).padStart(2, "0")
          ].join(":");
          text = text.replace(/\{count\}/g, String(annotations.length)).replace(/\{time\}/g, stamp);
          const snapshot2 = safe(() => shell?.state?.getSnapshot());
          const draft = typeof snapshot2?.draft === "string" ? snapshot2.draft : "";
          if (draft.trim() !== "") return;
          const apply = typeof shell?.setDraft === "function" ? shell.setDraft.bind(shell) : shell?.actions?.setDraft;
          if (typeof apply !== "function") return;
          safe(() => apply(text));
        }
        function armSendConsumeCheck() {
          const at = Date.now();
          sendGestureAt = at;
          window.setTimeout(() => {
            if (sendGestureAt !== at) return;
            if (draftIds.length === 0 || annotations.length === 0) return;
            const shell = inputShell();
            if (shell === void 0) return;
            const live = liveAttachmentIds(shell);
            const held = live === void 0 ? true : draftIds.some((id) => live.includes(id));
            if (held) return;
            markConsumed("发送手势后附件已离开输入框");
          }, 2e3);
        }
        const overlay = document.createElement("div");
        overlay.className = "sa-overlay";
        overlay.setAttribute("data-sa-ui", "overlay");
        function markConversationChanged() {
          conversationChanges += 1;
          if (scrollGuardCapture !== null) scrollGuardCapture();
        }
        function markConversationDirty() {
          conversationDirty = true;
          highlightDirty = true;
        }
        function markHighlightsDirty() {
          highlightDirty = true;
        }
        function conversationNeedsRender() {
          return conversationDirty === true || placementPending === true;
        }
        function scheduleRepaint(source = "timer") {
          if (repaintTimer !== null) return;
          scrollTrace.repaint(source);
          repaintTimer = window.setTimeout(() => {
            repaintTimer = null;
            repaint();
          }, REPAINT_MS);
        }
        function scrollAncestorsOf(start) {
          const found = [];
          let current = start;
          for (let i = 0; i < 32 && current !== null && current !== void 0; i += 1) {
            if (current === document.body || current === document.documentElement) break;
            const scrollable = typeof current.scrollHeight === "number" && typeof current.clientHeight === "number" && current.scrollHeight > current.clientHeight + 1;
            if (scrollable) {
              const overflowY = typeof window.getComputedStyle === "function" ? safe(() => window.getComputedStyle(current).overflowY) ?? "" : "";
              if (overflowY === "auto" || overflowY === "scroll") found.push(current);
            }
            current = current.parentElement ?? null;
          }
          return found;
        }
        function watchConversationScroll() {
          const roots = [...visibleConversationScopes()];
          for (const node of document.querySelectorAll('[data-sa-ui="sent"], [data-sa-ui="replies"]')) roots.push(node);
          for (const root of roots) {
            for (const container of scrollAncestorsOf(root)) scrollTrace.watch(container);
          }
        }
        function keepScrollStable(mutate) {
          if (performance.now() < jumpScrollUntil) {
            const previousCapture2 = scrollGuardCapture;
            scrollGuardCapture = null;
            try {
              return safe(mutate) === true;
            } finally {
              scrollGuardCapture = previousCapture2;
            }
          }
          const saved = [];
          const seen = /* @__PURE__ */ new Set();
          const anchorRowOf = (container) => {
            const box = safe(() => container.getBoundingClientRect());
            if (box === void 0) return void 0;
            const turns = safe(() => container.querySelectorAll("[data-chat-turn]")) ?? [];
            const rows = turns.length > 0 ? turns : safe(() => container.querySelectorAll("[data-chat-anchor-key]")) ?? [];
            let measured = 0;
            for (const row of rows) {
              if (measured >= 400) return void 0;
              if (safe(() => row.closest("[data-sa-ui]") !== null) === true) continue;
              const rect = safe(() => row.getBoundingClientRect());
              if (rect === void 0) continue;
              measured += 1;
              if (rect.bottom <= box.top) continue;
              return { row, offset: rect.top - box.top };
            }
            return void 0;
          };
          const capture = (container) => {
            scrollTrace.watch(container);
            const top = container.scrollTop;
            const sticky = top + container.clientHeight >= container.scrollHeight - 2;
            const entry = { el: container, top, scrollHeight: container.scrollHeight, sticky };
            if (!sticky) {
              const anchor = anchorRowOf(container);
              if (anchor !== void 0) {
                entry.row = anchor.row;
                entry.offset = anchor.offset;
              }
            }
            saved.push(entry);
          };
          const remember = (start) => {
            for (const current of scrollAncestorsOf(start)) {
              if (seen.has(current)) continue;
              seen.add(current);
              capture(current);
            }
          };
          let captured = false;
          const captureAll = () => {
            if (captured) return;
            captured = true;
            const roots = [];
            for (const scope of visibleConversationScopes()) roots.push(scope);
            for (const node of document.querySelectorAll('[data-sa-ui="sent"], [data-sa-ui="replies"]')) roots.push(node);
            for (const root of roots) remember(root);
          };
          const rowOffsetOf = (container, row) => {
            const box = safe(() => container.getBoundingClientRect());
            const rect = safe(() => row.getBoundingClientRect());
            if (box === void 0 || rect === void 0) return void 0;
            return rect.top - box.top;
          };
          const restoreAnchor = (container, row, target) => {
            const offset = rowOffsetOf(container, row);
            if (offset === void 0) return false;
            const delta = offset - target;
            if (delta !== 0) {
              scrollTrace.markWrite(container, "repaint-anchor", container.scrollTop + delta);
              container.scrollTop += delta;
              const settled = rowOffsetOf(container, row);
              if (settled !== void 0) {
                const residual = settled - target;
                if (Math.abs(residual) > 4) {
                  scrollTrace.markWrite(container, "repaint-anchor", container.scrollTop + residual);
                  container.scrollTop += residual;
                }
              }
            }
            return true;
          };
          const restore = (late) => {
            for (const entry of saved) {
              const container = entry.el;
              if (entry.sticky) {
                const bottom = container.scrollHeight - container.clientHeight;
                if (container.scrollTop < bottom - 1) {
                  scrollTrace.markWrite(container, late === true ? "rAF" : "restore", bottom);
                  container.scrollTop = bottom;
                }
                continue;
              }
              if (entry.row !== void 0 && entry.row.isConnected === true) {
                if (restoreAnchor(container, entry.row, entry.offset) === true) continue;
              }
              if (late === true) continue;
              const grown = container.scrollHeight - entry.scrollHeight;
              if (grown !== 0) {
                scrollTrace.markWrite(container, "restore", container.scrollTop + grown);
                container.scrollTop += grown;
              }
            }
          };
          const previousCapture = scrollGuardCapture;
          scrollGuardCapture = captureAll;
          let changed = false;
          try {
            changed = mutate() === true;
          } finally {
            scrollGuardCapture = previousCapture;
          }
          if (!changed || captured !== true || saved.length === 0) return changed;
          restore();
          if (typeof window.requestAnimationFrame === "function") {
            safe(() => window.requestAnimationFrame(() => restore(true)));
          }
          return changed;
        }
        const repaintFailures = /* @__PURE__ */ new Set();
        function reportRepaintFailure(key, step, error) {
          if (repaintFailures.has(key)) return;
          repaintFailures.add(key);
          warn("[selection-annotations] 重绘步骤失败:", step, error);
        }
        const hoverMisses = /* @__PURE__ */ new Set();
        function reportHoverMiss(id) {
          if (hoverMisses.has(id)) return;
          hoverMisses.add(id);
          warn("[selection-annotations] 悬停命中找不到对应批注:", id);
        }
        function highlightKeyOf(item) {
          if (item === null || item === void 0) return null;
          if (item.sentHighlight === true) return typeof item.id === "string" ? item.id : null;
          if (typeof item.id === "string" && item.id !== "") return `draft:${item.id}`;
          const uuid = typeof item.uuid === "string" && item.uuid !== "" ? item.uuid : "";
          if (uuid !== "") return `sent:${uuid}`;
          const anchorKey = typeof item.source?.anchorKey === "string" && item.source.anchorKey !== "" ? item.source.anchorKey : typeof item.anchorKey === "string" && item.anchorKey !== "" ? item.anchorKey : "";
          if (anchorKey === "") return null;
          const index = Number.isFinite(item.index) ? item.index : Number.isFinite(item.source?.index) ? item.source.index : "";
          return `sent:${anchorKey}#${index}`;
        }
        function sentHighlightKey(anchorKey, item) {
          const uuid = typeof item?.uuid === "string" && item.uuid !== "" ? item.uuid : "";
          if (uuid !== "") return `sent:${uuid}`;
          const index = Number.isFinite(item?.index) ? item.index : "";
          return `sent:${anchorKey}#${index}`;
        }
        function savedOffsetOf(source) {
          if (source === null || source === void 0) return void 0;
          if (source.textOrigin === "source") {
            return Number.isFinite(source.renderedCharStart) ? source.renderedCharStart : void 0;
          }
          return source.charStart;
        }
        function collectSentHighlightItems() {
          const sessionId = currentSessionId();
          if (sessionId === void 0) return [];
          const table = safe(() => loadSent(sessionId)) ?? null;
          if (table === null) return [];
          const items = [];
          const alive = /* @__PURE__ */ new Set();
          for (const [storedKey, record] of table) {
            if (record === null || typeof record !== "object" || Array.isArray(record.items) === false) continue;
            const anchorKey = typeof record.anchorKey === "string" && record.anchorKey !== "" ? record.anchorKey : storedKey;
            for (const item of record.items) {
              if (item === null || typeof item !== "object") continue;
              if (typeof item.quote !== "string" || item.quote === "") continue;
              const key = highlightKeyOf(item) ?? sentHighlightKey(anchorKey, item);
              alive.add(key);
              const turn = Number.isFinite(record.turn) ? record.turn : Number.isFinite(item.source?.turn) ? item.source.turn : null;
              const cached = sentHighlightCache.get(key);
              if (cached !== void 0 && cached.savedAt === record.savedAt) {
                if (cached.entry.turn !== turn) {
                  const entry2 = { ...cached.entry, turn };
                  sentHighlightCache.set(key, { savedAt: record.savedAt, entry: entry2 });
                  items.push(entry2);
                } else {
                  items.push(cached.entry);
                }
                continue;
              }
              const entry = { ...item, id: key, sentHighlight: true, turn };
              sentHighlightCache.set(key, { savedAt: record.savedAt, entry });
              items.push(entry);
            }
          }
          for (const key of [...sentHighlightCache.keys()]) {
            if (!alive.has(key)) sentHighlightCache.delete(key);
          }
          return items;
        }
        function sentRecordOf(item) {
          if (item === null || item === void 0) return null;
          const sessionId = currentSessionId();
          if (sessionId === void 0) return null;
          const table = safe(() => loadSent(sessionId)) ?? null;
          if (table === null) return null;
          for (const [storedKey, record] of table) {
            if (record === null || typeof record !== "object" || Array.isArray(record.items) === false) continue;
            const keyAnchor = typeof record.anchorKey === "string" && record.anchorKey !== "" ? record.anchorKey : storedKey;
            const anchorKey = typeof record.anchorKey === "string" && record.anchorKey !== "" ? record.anchorKey : resolveLegacyAnchor(storedKey);
            for (const candidate of record.items) {
              if (candidate === null || typeof candidate !== "object") continue;
              const key = highlightKeyOf(candidate) ?? sentHighlightKey(keyAnchor, candidate);
              if (key !== item.id) continue;
              return { ...record, anchorKey, storedKey };
            }
          }
          return null;
        }
        function sentReplyOf(item, record) {
          if (item === null || item === void 0 || typeof item !== "object") return null;
          const sessionId = currentSessionId();
          if (sessionId === void 0) return null;
          const batches = remoteReplyCache.get(sessionId);
          if (!Array.isArray(batches) || batches.length === 0) return null;
          const uuid = typeof item.uuid === "string" && item.uuid !== "" ? item.uuid : "";
          const quote = typeof item.quote === "string" ? item.quote : "";
          const anchorKey = typeof record?.anchorKey === "string" && record.anchorKey !== "" ? record.anchorKey : typeof record?.storedKey === "string" ? record.storedKey : "";
          let loose = null;
          for (let index = batches.length - 1; index >= 0; index -= 1) {
            const replies = Array.isArray(batches[index]?.replies) ? batches[index].replies : [];
            for (const reply of replies) {
              if (uuid !== "" && reply?.uuid === uuid) return reply;
              if (uuid !== "" || loose !== null) continue;
              if (quote === "" || reply?.quote !== quote) continue;
              if (anchorKey !== "" && typeof reply?.cardKey === "string" && reply.cardKey !== "" && reply.cardKey !== anchorKey) {
                continue;
              }
              loose = reply;
            }
          }
          return loose;
        }
        function locateHighlightRange(item) {
          const range = locateRange(item);
          if (range !== void 0) return range;
          const fingerprint = fingerprintOf(item);
          if (fingerprint === null) return void 0;
          const source = item?.source;
          const turn = Number.isFinite(source?.turn) ? source.turn : null;
          let row = null;
          for (const holder of turnHolders(turn)) {
            row = rowByFingerprint(holder, fingerprint);
            if (row !== null) break;
          }
          if (row === null) row = rowByFingerprint(document, fingerprint);
          if (row === null) return void 0;
          const found = safe(() => matchInRoot(row, item.quote, savedOffsetOf(source))) ?? void 0;
          if (found !== void 0) item.liveRange = found;
          return found;
        }
        const RUN_TOP_TOLERANCE = 6;
        const RUN_HEIGHT_TOLERANCE = 6;
        const RUN_GAP_TOLERANCE = 12;
        function sameRunLine(a, b) {
          return Math.abs(a.top - b.top) <= RUN_TOP_TOLERANCE && Math.abs(a.height - b.height) <= RUN_HEIGHT_TOLERANCE;
        }
        function runGap(a, b) {
          const aRight = a.left + a.width;
          const bRight = b.left + b.width;
          return Math.max(a.left, b.left) - Math.min(aRight, bRight);
        }
        function unionRunRect(a, b) {
          const left = Math.min(a.left, b.left);
          const right = Math.max(a.left + a.width, b.left + b.width);
          const top = Math.min(a.top, b.top);
          const bottom = Math.max(a.top + a.height, b.top + b.height);
          return { left, top, width: right - left, height: bottom - top, right, bottom };
        }
        const unmergedRunNotes = /* @__PURE__ */ new Set();
        const UNMERGED_GAP_LIMIT = RUN_GAP_TOLERANCE * 2;
        const UNMERGED_HEIGHT_LIMIT = RUN_HEIGHT_TOLERANCE * 2;
        function reportUnmergedRun(rects) {
          let gap = 0;
          let height = 0;
          let found = false;
          for (let i = 0; i < rects.length; i += 1) {
            for (let j = i + 1; j < rects.length; j += 1) {
              const a = rects[i];
              const b = rects[j];
              const aCenter = a.top + a.height / 2;
              const bCenter = b.top + b.height / 2;
              const sameLine = Math.abs(aCenter - bCenter) <= Math.max(RUN_TOP_TOLERANCE, Math.min(a.height, b.height) / 2);
              if (!sameLine) continue;
              const pairGap = Math.max(0, runGap(a, b));
              const pairHeight = Math.abs(a.height - b.height);
              if (pairGap > UNMERGED_GAP_LIMIT || pairHeight > UNMERGED_HEIGHT_LIMIT) continue;
              found = true;
              gap = Math.max(gap, Math.round(pairGap));
              height = Math.max(height, Math.round(pairHeight));
            }
          }
          if (!found) return;
          const note = `${gap}x${height}`;
          if (unmergedRunNotes.has(note)) return;
          if (unmergedRunNotes.size >= 32) return;
          unmergedRunNotes.add(note);
          warn(`[selection-annotations] 同行高亮未合并: 间隙 ${gap}px 高度差 ${height}px`);
        }
        function mergeRunRects(rects) {
          const out = rects.map((rect) => ({
            left: rect.left,
            top: rect.top,
            width: rect.width,
            height: rect.height,
            right: rect.left + rect.width,
            bottom: rect.top + rect.height
          }));
          let joined = true;
          scan: while (joined) {
            joined = false;
            for (let i = 0; i < out.length; i += 1) {
              for (let j = i + 1; j < out.length; j += 1) {
                const a = out[i];
                const b = out[j];
                if (!sameRunLine(a, b) || runGap(a, b) > RUN_GAP_TOLERANCE) continue;
                out[i] = unionRunRect(a, b);
                out.splice(j, 1);
                joined = true;
                continue scan;
              }
            }
          }
          reportUnmergedRun(out);
          return out;
        }
        function locateSegmentsOf(item) {
          const segments = segmentsFor(item);
          if (segments === null) return null;
          const quote = typeof item?.quote === "string" ? item.quote : "";
          const source = item?.source ?? {};
          const ordered = segments.map((segment, index) => ({ segment, index })).sort((a, b) => a.segment.quoteStart - b.segment.quoteStart || a.index - b.index);
          const located = [];
          for (const { segment } of ordered) {
            const root = rootByAnchorKey(segment.anchorKey) ?? anchorRoot(source);
            if (root === null || root === void 0) continue;
            const slice = quote.slice(segment.quoteStart, segment.quoteEnd);
            const found = flatText(slice).length < 2 ? void 0 : safe(() => matchInRootNormalized(root, slice, savedOffsetOf(segment))) ?? void 0;
            const boxes = found === void 0 ? [] : safe(() => [...found.getClientRects()]) ?? [];
            located.push({
              segment,
              root,
              slice,
              hit: found !== void 0,
              boxes: boxes.filter((box) => box.width > 0 && box.height > 0)
            });
          }
          const firstHit = located.findIndex((entry) => entry.hit);
          if (firstHit < 0) return null;
          let lastHit = located.length - 1;
          while (lastHit > firstHit && !located[lastHit].hit) lastHit -= 1;
          const hitRects = [];
          const partRects = [];
          for (let i = firstHit; i <= lastHit; i += 1) {
            const entry = located[i];
            if (entry.hit) {
              for (const box of entry.boxes) hitRects.push(box);
              continue;
            }
            const start = savedOffsetOf(entry.segment);
            if (!Number.isFinite(start)) continue;
            const length = entry.segment.quoteEnd - entry.segment.quoteStart;
            const range = safe(() => rangeFromOffsets2(entry.root, start, length));
            if (range === void 0 || range === null) continue;
            const boxes = safe(() => [...range.getClientRects()]) ?? [];
            for (const box of boxes) {
              if (box.width > 0 && box.height > 0) partRects.push(box);
            }
          }
          const paintRow = located[firstHit].root;
          return [
            ...mergeRunRects(hitRects).map((rect) => ({ ...rect, hit: true, row: paintRow })),
            ...mergeRunRects(partRects).map((rect) => ({ ...rect, hit: false, row: paintRow }))
          ];
        }
        function segmentsFor(item) {
          const valid = segmentsOf(item?.source, item?.quote);
          if (valid !== null) return valid;
          return maybeMigrateSegments(item);
        }
        const migratedKeys = /* @__PURE__ */ new Map();
        function migrationKeyOf(item) {
          if (typeof item?.uuid === "string" && item.uuid !== "") return `u:${item.uuid}`;
          if (typeof item?.id === "string" && item.id !== "") return `i:${item.id}`;
          return null;
        }
        function maybeMigrateSegments(item) {
          const source = item?.source;
          const kind = source?.kind;
          if (kind !== "message" && kind !== "reply" && kind !== "sent") return null;
          if (segmentsOf(source, item.quote) !== null) return null;
          const sessionId = currentSessionId();
          if (sessionId === void 0) return null;
          const key = migrationKeyOf(item);
          if (key === null) return null;
          let tried = migratedKeys.get(sessionId);
          if (tried === void 0) {
            tried = /* @__PURE__ */ new Set();
            migratedKeys.set(sessionId, tried);
          }
          if (tried.has(key)) return null;
          tried.add(key);
          const turn = Number.isFinite(source?.turn) ? source.turn : null;
          const row = safe(() => findSourceRow(source, item, turn)) ?? null;
          if (row === null || row === void 0) return null;
          const range = safe(() => matchInRoot(row, item.quote, savedOffsetOf(source))) ?? void 0;
          if (range === void 0) return null;
          if (flatText(safe(() => range.toString())) !== flatText(item.quote)) return null;
          const built = safe(() => buildSegments(row, range, source));
          if (built === void 0 || built.segments.length === 0) return null;
          const segments = stampSegmentFingerprints(built.segments);
          const first = segments[0];
          const nextSource = {
            ...source,
            charStart: first.charStart,
            charEnd: first.charEnd,
            segments,
            ...built.truncated === true ? { segmentsTruncated: true } : {}
          };
          if (typeof first.fingerprintBefore === "string") nextSource.contextBefore = first.fingerprintBefore;
          if (typeof first.fingerprintAfter === "string") nextSource.contextAfter = first.fingerprintAfter;
          if (JSON.stringify(nextSource) === JSON.stringify(source)) return null;
          const isDraft = typeof item.id === "string" && annotations.some((entry) => entry.id === item.id);
          let written = false;
          if (isDraft) {
            written = updateAnnotationSource(item.id, nextSource);
          } else if (item.sentHighlight === true || typeof item.uuid === "string") {
            written = writeSentSource(item, nextSource);
          }
          if (!written) return null;
          item.source = nextSource;
          return segmentsOf(nextSource, item.quote);
        }
        function writeSentSource(item, source) {
          const sessionId = currentSessionId();
          if (sessionId === void 0) return false;
          const uuid = typeof item?.uuid === "string" && item.uuid !== "" ? item.uuid : "";
          if (uuid === "") return false;
          const table = safe(() => loadSent(sessionId)) ?? null;
          if (table === null || table === void 0) return false;
          const key = typeof item.id === "string" ? item.id : null;
          for (const [storedKey, record] of table) {
            if (record === null || typeof record !== "object" || !Array.isArray(record.items)) continue;
            const index = record.items.findIndex(
              (entry) => entry !== null && typeof entry === "object" && entry.uuid === uuid
            );
            if (index === -1) continue;
            const items = record.items.slice();
            items[index] = { ...items[index], source };
            table.set(storedKey, { ...record, items });
            saveSent(sessionId, table);
            if (key !== null) sentHighlightCache.delete(key);
            return true;
          }
          return false;
        }
        function flashPhaseOn(item) {
          return flashPhase === 1 && flashKey !== null && highlightKeyOf(item) === flashKey;
        }
        function collectHighlightNodes(nodes, hits, rows) {
          const target = Array.isArray(hits) ? hits : highlightHits;
          for (const item of annotations) {
            safe(
              () => collectHighlightOf(item, nodes, target, rows),
              (error) => reportRepaintFailure(`collectHighlightNodes:${item?.id}`, "collectHighlightNodes", error)
            );
          }
          for (const item of collectSentHighlightItems()) {
            safe(
              () => collectHighlightOf(item, nodes, target, rows),
              (error) => reportRepaintFailure(`collectHighlightNodes:${item?.id}`, "collectHighlightNodes", error)
            );
          }
        }
        function elementVisibleNow(element) {
          if (element === null || element === void 0 || element.isConnected !== true) return false;
          if (safe(() => element.closest("[hidden]")) !== null) return false;
          if (safe(() => element.closest('[data-chat-motion="collapse"]')) !== null) return false;
          const rects = safe(() => element.getClientRects()) ?? [];
          return rects.length > 0;
        }
        function foldHeaderLabelOf(button3) {
          const first = button3.firstElementChild;
          if (first !== null && first.tagName === "SPAN" && first.getAttribute("aria-hidden") !== "true") return first;
          const last = button3.lastElementChild;
          if (last !== null && last.tagName === "SPAN" && last.getAttribute("aria-hidden") !== "true") return last;
          return button3;
        }
        function foldHeaderRectsOfButton(button3) {
          if (button3 === null || button3 === void 0) return null;
          if (!elementVisibleNow(button3)) return null;
          const rects = safe(() => {
            const range = document.createRange();
            range.selectNodeContents(foldHeaderLabelOf(button3));
            return [...range.getClientRects()].filter((rect) => rect.width > 0 && rect.height > 0);
          }) ?? [];
          return rects.length > 0 ? rects : null;
        }
        function processGroupHeaderButton(group) {
          const header = group.firstElementChild;
          if (header === null) return null;
          return header.querySelector("button[aria-expanded]") ?? header.querySelector("button");
        }
        function foldHeaderRectsOfRow(row, turn) {
          let group = row.closest("[data-step-process]");
          while (group !== null) {
            const rects = foldHeaderRectsOfButton(processGroupHeaderButton(group));
            if (rects !== null) return rects;
            group = group.parentElement === null ? null : group.parentElement.closest("[data-step-process]");
          }
          if (!Number.isFinite(turn)) return null;
          let button3 = document.querySelector(`[data-turn-process="${turn}"]`);
          while (button3 !== null) {
            const rects = foldHeaderRectsOfButton(button3);
            if (rects !== null) return rects;
            const outer = button3.parentElement === null ? null : button3.parentElement.closest("[data-step-process]");
            button3 = outer === null ? null : processGroupHeaderButton(outer);
          }
          return null;
        }
        function foldedHeaderRectsOfItem(item) {
          const source = item?.source;
          if (source === null || typeof source !== "object" || source.kind !== "message") return null;
          let turn = Number.isFinite(source.turn) ? source.turn : null;
          const row = safe(() => findSourceRow(source, item, turn)) ?? null;
          if (row === null || row === void 0) return null;
          if (elementVisibleNow(row)) return null;
          if (turn === null) {
            const holder = safe(() => row.closest("[data-chat-turn]")) ?? null;
            const fromRow = holder === null ? NaN : Number(holder.getAttribute("data-chat-turn"));
            if (Number.isFinite(fromRow)) turn = fromRow;
          }
          return foldHeaderRectsOfRow(row, turn);
        }
        function collectHighlightOf(item, nodes, target, rows) {
          const sent = item.sentHighlight === true;
          const blinking = flashPhaseOn(item);
          let rects = locateSegmentsOf(item);
          let fallbackRange = null;
          if (rects === null) {
            const range = blinking && flashRange !== null && safe(() => flashRange.startContainer.isConnected === true) === true ? flashRange : locateHighlightRange(item);
            fallbackRange = range ?? null;
            if (range === void 0 || range === null) {
              const foldedRects = foldedHeaderRectsOfItem(item);
              if (foldedRects === null) return;
              rects = foldedRects;
            } else {
              rects = safe(() => [...range.getClientRects()]) ?? [];
            }
          }
          rects = rects.filter((rect) => rect.width > 0 && rect.height > 0);
          if (rects.length === 0) {
            const foldedRects = foldedHeaderRectsOfItem(item);
            if (foldedRects === null) return;
            rects = foldedRects;
          }
          if (rects.length > 0 && Array.isArray(target)) target.push({ id: item.id, rects, item });
          const adopt = safe(() => hasAdoptNote(item.note)) === true;
          const reject = safe(() => hasRejectNote(item.note)) === true;
          let badged = false;
          for (const rect of rects) {
            if (rect.width <= 0 || rect.height <= 0) continue;
            const box = document.createElement("div");
            const base = sent ? "sa-hl sa-hl-sent" : "sa-hl";
            const part = rect.hit === false;
            let className = base;
            if (part) className = `${base} sa-hl-part`;
            else if (blinking) className = `${base}${sent ? " sa-hl-blink-sent" : " sa-hl-blink"}`;
            box.className = className;
            box.dataset.saHit = part ? "0" : "1";
            if (adopt) box.dataset.adopt = "1";
            if (reject) box.dataset.reject = "1";
            box.style.left = `${rect.left}px`;
            box.style.top = `${rect.top}px`;
            box.style.width = `${rect.width}px`;
            box.style.height = `${rect.height}px`;
            nodes.push(box);
            if (!badged && item.sentHighlight !== true) {
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
          const row = highlightedRowOf(rects, fallbackRange);
          const key = highlightKeyOf(item);
          if (rows instanceof Map && key !== null && row !== null) rows.set(key, row);
        }
        function highlightedRowOf(rects, range) {
          if (Array.isArray(rects)) {
            for (const rect of rects) {
              const row2 = rect?.row;
              if (row2 !== null && row2 !== void 0 && safe(() => row2.isConnected === true) === true) return row2;
            }
          }
          const start = range?.startContainer ?? null;
          if (start === null || start === void 0) return null;
          const element = start.nodeType === 1 ? start : start.parentElement;
          if (element === null || element === void 0) return null;
          const selector = "[data-chat-anchor-key], [data-chat-flow-key], [data-chat-turn], .sa-sent-item, .sa-reply-item, [data-sa-field]";
          const row = safe(() => element.closest(selector)) ?? null;
          return row !== null && safe(() => row.isConnected === true) === true ? row : null;
        }
        let paintedRows = /* @__PURE__ */ new Map();
        function paintHighlightLayer() {
          const nodes = [];
          const hits = [];
          const rows = /* @__PURE__ */ new Map();
          const ok = safe(() => {
            collectHighlightNodes(nodes, hits, rows);
            return true;
          }) === true;
          if (!ok) return false;
          highlightHits = hits;
          paintedRows = rows;
          if (typeof overlay.replaceChildren === "function") {
            overlay.replaceChildren(...nodes);
          } else {
            overlay.textContent = "";
            for (const node of nodes) overlay.appendChild(node);
          }
          return true;
        }
        function selectionAtRisk() {
          const selection = safe(() => window.getSelection()) ?? null;
          if (selection === null || selection.rangeCount === 0 || selection.isCollapsed !== false) return false;
          const anchor = selection.anchorNode;
          const element = anchor === null || anchor === void 0 ? null : anchor.nodeType === 1 ? anchor : anchor.parentElement;
          if (element === null || element === void 0) return true;
          const safeHost = safe(() => element.closest(
            '[data-sa-ui="popover"], [data-sa-ui="panel"], input, textarea, [contenteditable="true"]'
          )) ?? null;
          return safeHost === null;
        }
        function flushPendingRepaint() {
          if (repaintPending !== true || pointerSelecting === true) return;
          if (selectionAtRisk() === true) return;
          repaintPending = false;
          highlightDirty = true;
          scheduleRepaint("timer");
        }
        function repaint() {
          const blocked = pointerSelecting === true || selectionAtRisk() === true;
          const now = Date.now();
          if (blocked) {
            repaintPending = true;
            if (repaintDeferredAt === null) repaintDeferredAt = now;
            if (now - repaintDeferredAt < REPAINT_DEFER_MAX_MS) return;
          } else {
            repaintPending = false;
            repaintDeferredAt = null;
          }
          const step = (name, run) => safe(run, (error) => reportRepaintFailure(name, name, error));
          const renderConversation = () => {
            const scanned = step("scanSentMessages", scanSentMessages) === true;
            const sent = step("renderSentCards", renderSentCards) === true;
            const replies = step("renderReplySections", renderReplySections) === true;
            return scanned || sent || replies;
          };
          const rebuild = conversationNeedsRender();
          const rebuildHighlights = rebuild === true || highlightDirty === true;
          if (!rebuild && !rebuildHighlights) return;
          step("watchConversationScroll", watchConversationScroll);
          conversationDirty = false;
          placementPending = false;
          highlightDirty = false;
          if (rebuild) {
            if (blocked) renderConversation();
            else keepScrollStable(renderConversation);
          }
          if (!rebuildHighlights) return;
          step("collectHighlightNodes", paintHighlightLayer);
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
          } else if (kind === "reject") {
            path("M3.75 3.75 12.25 12.25");
            path("M12.25 3.75 3.75 12.25");
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
        const rejectButton = document.createElement("button");
        rejectButton.type = "button";
        rejectButton.className = "sa-btn sa-btn-reject";
        const rejectLabel = document.createElement("span");
        rejectLabel.textContent = t("annotate.reject");
        rejectButton.append(dshIconSvg("reject"), rejectLabel);
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
        toolbar.append(rejectButton, adoptButton, annotateButton, copyButton);
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
        const menuReject = document.createElement("button");
        menuReject.type = "button";
        menuReject.className = "sa-menu-item";
        menuReject.textContent = t("menu.reject");
        const menuCopy = document.createElement("button");
        menuCopy.type = "button";
        menuCopy.className = "sa-menu-item";
        menuCopy.textContent = t("menu.copy");
        contextMenu.append(menuAnnotate, menuAdopt, menuReject, menuCopy);
        let contextMenuSelection = null;
        const popover = document.createElement("div");
        popover.className = "sa-popover";
        popover.setAttribute("data-sa-ui", "popover");
        const popHead = document.createElement("div");
        popHead.className = "sa-pop-head";
        const popBody = document.createElement("div");
        popBody.className = "sa-pop-body";
        const popTitle = document.createElement("div");
        popTitle.className = "sa-pop-title";
        const popClose = document.createElement("button");
        popClose.type = "button";
        popClose.className = "sa-pop-close";
        popClose.textContent = "×";
        popClose.setAttribute("aria-label", t("pop.cancel"));
        popHead.append(popTitle, popClose);
        const lowerPopover = () => {
          popover.classList.remove("sa-front");
          popover.style.zIndex = "";
        };
        const raisePopover = () => {
          const rect = popover.getBoundingClientRect();
          let max = 0;
          if (rect.width > 0 && rect.height > 0) {
            const points = [
              [rect.left + 4, rect.top + 4],
              [rect.right - 4, rect.top + 4],
              [rect.left + 4, rect.bottom - 4],
              [rect.right - 4, rect.bottom - 4],
              [rect.left + rect.width / 2, rect.top + rect.height / 2]
            ];
            for (const [x, y] of points) {
              const stack = typeof document.elementsFromPoint === "function" ? document.elementsFromPoint(x, y) : [];
              for (const node of stack) {
                if (node === popover || popover.contains(node)) continue;
                if (node === document.body || node === document.documentElement) continue;
                const z = Number(window.getComputedStyle(node).zIndex);
                if (Number.isFinite(z) && z > max) max = z;
              }
            }
          }
          popover.style.zIndex = String(Math.min(950, Math.max(70, max + 1)));
          popover.classList.add("sa-front");
        };
        popover.addEventListener("pointerdown", raisePopover, true);
        popover.addEventListener("focusin", raisePopover, true);
        popover.addEventListener("keydown", raisePopover, true);
        popover.addEventListener("focusout", (event) => {
          const next = elementOf2(event.relatedTarget);
          if (next !== null && popover.contains(next)) return;
          window.setTimeout(() => {
            if (!popover.contains(document.activeElement)) lowerPopover();
          }, 0);
        });
        popover.addEventListener("keydown", (event) => {
          if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
            event.preventDefault();
            event.stopPropagation();
            commitPopover();
          }
        }, true);
        let popDrag = null;
        popHead.addEventListener("pointerdown", (event) => {
          if (event.button !== 0) return;
          if (elementOf2(event.target)?.closest(".sa-pop-close") !== null) return;
          const rect = popover.getBoundingClientRect();
          popDrag = { dx: event.clientX - rect.left, dy: event.clientY - rect.top, width: rect.width, height: rect.height };
          popover.dataset.dragged = "1";
          popoverTouched = true;
          cancelHoverClose();
          popover.classList.add("sa-pop-dragging");
          event.preventDefault();
          if (typeof popHead.setPointerCapture === "function") safe(() => popHead.setPointerCapture(event.pointerId));
        });
        const popQuoteLabel = document.createElement("div");
        popQuoteLabel.className = "sa-pop-label";
        popQuoteLabel.textContent = t("label.quote");
        const popJumpHint = document.createElement("span");
        popJumpHint.className = "sa-pop-jump-hint";
        popJumpHint.dataset.on = "0";
        const jumpButtonNodes = [];
        const createJumpButton = (action) => {
          const node = document.createElement("span");
          node.className = "sa-reuse sa-jump";
          node.setAttribute("role", "button");
          node.setAttribute("tabindex", "0");
          node.setAttribute("aria-label", t("jump.label"));
          node.title = t("jump.hint");
          node.style.display = "none";
          const text = document.createElement("span");
          text.className = "sa-reuse-text";
          text.textContent = t("jump.label");
          node.append(text, jumpIcon());
          const run = (event) => {
            event.preventDefault();
            event.stopPropagation();
            if (popoverItem === null) return;
            if (typeof action === "function") {
              action(node);
              return;
            }
            jumpToQuote(popoverItem, popoverTurn === null ? void 0 : popoverTurn, node);
          };
          node.addEventListener("click", run);
          node.addEventListener("keydown", (event) => {
            if (event.key === "Enter" || event.key === " ") run(event);
          });
          jumpButtonNodes.push(node);
          return node;
        };
        const popJump = createJumpButton();
        const popQuoteHead = document.createElement("div");
        popQuoteHead.className = "sa-pop-quote-head";
        popQuoteHead.append(popQuoteLabel, popJumpHint, popJump);
        const popQuote = document.createElement("div");
        popQuote.className = "sa-pop-quote";
        const popReadNote = document.createElement("div");
        popReadNote.className = "sa-pop-read";
        popReadNote.style.display = "none";
        const popReplyHead = document.createElement("div");
        popReplyHead.className = "sa-pop-reply-head";
        popReplyHead.style.display = "none";
        const popReplyLabel = document.createElement("div");
        popReplyLabel.className = "sa-pop-label";
        popReplyLabel.textContent = t("label.answer");
        popReplyHead.append(popReplyLabel);
        const popReplyBody = document.createElement("div");
        popReplyBody.className = "sa-pop-reply";
        popReplyBody.style.display = "none";
        const popReplyDivider = document.createElement("div");
        popReplyDivider.className = "sa-pop-divider";
        popReplyDivider.style.display = "none";
        const popDivider = document.createElement("div");
        popDivider.className = "sa-pop-divider";
        const popSource = document.createElement("div");
        popSource.className = "sa-pop-src";
        const popNoteLabel = document.createElement("div");
        popNoteLabel.className = "sa-pop-label";
        popNoteLabel.textContent = t("pop.noteLabel");
        const popNoteJump = createJumpButton((node) => jumpToReply(popoverRecord, popoverItem, node));
        const popNoteHead = document.createElement("div");
        popNoteHead.className = "sa-pop-note-head";
        popNoteHead.append(popNoteLabel, popNoteJump);
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
        let highlightHits = [];
        let flashKey = null;
        let flashPhase = 0;
        let flashTimers = [];
        let flashRange = null;
        const sentHighlightCache = /* @__PURE__ */ new Map();
        let hoverOpenTimer = null;
        let hoverTargetId = null;
        let hoverCloseTimer = null;
        let popoverHovered = false;
        let popoverTouched = false;
        let popoverSource = "manual";
        let popoverRect = null;
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
          syncNoteTone();
          schedulePopAutoSave();
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
        function noteTokenNode(phrase, tone) {
          const token = document.createElement("span");
          token.className = tone === "reject" ? "sa-token sa-token-reject" : "sa-token";
          token.setAttribute("contenteditable", "false");
          token.textContent = phrase;
          return token;
        }
        function notePhrases() {
          return [adoptTextOf(), rejectTextOf()].filter((phrase) => typeof phrase === "string" && phrase !== "");
        }
        function setNoteContent(value) {
          popInput.textContent = "";
          if (value === "") {
            refreshNoteState();
            return;
          }
          for (const segment of noteSegments(value, adoptTextOf(), rejectTextOf())) {
            if (segment.tone === "") appendNoteText(segment.text);
            else popInput.appendChild(noteTokenNode(segment.text, segment.tone));
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
          const phrases = notePhrases();
          const ctx2 = caretLine();
          if (ctx2 === null) {
            hideSuggestion();
            return;
          }
          const phrase = phrases.find(
            (candidate) => candidate !== "" && ctx2.line !== "" && ctx2.line !== candidate && candidate.includes(ctx2.line)
          );
          if (phrase === void 0) {
            hideSuggestion();
            return;
          }
          suggested = { phrase, prefix: ctx2.line, node: ctx2.node, offset: ctx2.offset };
          ghostTip.textContent = phrase;
          const left = Math.min(ctx2.rect.right + 1, window.innerWidth - 40);
          ghostTip.style.left = `${Math.max(8, left)}px`;
          ghostTip.style.top = `${ctx2.rect.top}px`;
          ghostTip.style.display = "";
        }
        function acceptSuggestion() {
          if (suggested === null) return false;
          const phrase = suggested.phrase;
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
          const token = noteTokenNode(phrase, phrase === adoptTextOf() ? "adopt" : "reject");
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
        popBody.append(
          popSource,
          popQuoteHead,
          popQuote,
          popDivider,
          popNoteHead,
          popReadNote,
          popReplyDivider,
          popReplyHead,
          popReplyBody,
          popInput,
          popImages,
          popActions
        );
        popover.append(popHead, popBody);
        const POPOVER_MIN_WIDTH = 260;
        const POPOVER_MIN_HEIGHT = 160;
        const POPOVER_MARGIN = 8;
        const POPOVER_DEFAULT_WIDTH = 340;
        let popoverSized = false;
        let popResize = null;
        const popoverSizeBounds = () => ({
          maxWidth: Math.max(POPOVER_MIN_WIDTH, window.innerWidth - POPOVER_MARGIN * 2),
          maxHeight: Math.max(POPOVER_MIN_HEIGHT, window.innerHeight - POPOVER_MARGIN * 2)
        });
        function clampPopoverSize(width, height) {
          const bounds = popoverSizeBounds();
          const w = Number.isFinite(width) ? width : POPOVER_MIN_WIDTH;
          const h2 = Number.isFinite(height) ? height : POPOVER_MIN_HEIGHT;
          return {
            width: Math.round(Math.max(POPOVER_MIN_WIDTH, Math.min(w, bounds.maxWidth))),
            height: Math.round(Math.max(POPOVER_MIN_HEIGHT, Math.min(h2, bounds.maxHeight)))
          };
        }
        function applyPopoverSize(width, height) {
          const next = clampPopoverSize(width, height);
          popover.style.width = `${next.width}px`;
          popover.style.height = `${next.height}px`;
          popoverSized = true;
          return next;
        }
        function readPopoverSize() {
          const storage = draftStorage();
          if (storage === void 0) return null;
          const raw = safe(() => storage.getItem(POPOVER_SIZE_KEY));
          if (typeof raw !== "string" || raw === "") return null;
          const parsed = safe(() => JSON.parse(raw));
          if (parsed === void 0 || parsed === null || typeof parsed !== "object") return null;
          const width = Number(parsed.width);
          const height = Number(parsed.height);
          if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return null;
          return { width, height };
        }
        function savePopoverSize(width, height) {
          const storage = draftStorage();
          if (storage === void 0) return;
          const next = clampPopoverSize(width, height);
          safe(() => storage.setItem(POPOVER_SIZE_KEY, JSON.stringify(next)));
        }
        function restorePopoverSize() {
          const saved = readPopoverSize();
          const previousMaxHeight = popover.style.maxHeight;
          popoverSized = false;
          popover.style.width = "";
          popover.style.height = "";
          popover.style.maxHeight = "";
          const defaultWidth = popover.offsetWidth || POPOVER_DEFAULT_WIDTH;
          const defaultHeight = popover.getBoundingClientRect().height;
          popover.style.maxHeight = previousMaxHeight;
          if (saved === null) return;
          const width = saved.width > defaultWidth ? saved.width : void 0;
          const height = saved.height > defaultHeight ? saved.height : void 0;
          if (width === void 0 && height === void 0) return;
          const bounds = popoverSizeBounds();
          if (width !== void 0) popover.style.width = `${Math.round(Math.max(POPOVER_MIN_WIDTH, Math.min(width, bounds.maxWidth)))}px`;
          if (height !== void 0) popover.style.height = `${Math.round(Math.max(POPOVER_MIN_HEIGHT, Math.min(height, bounds.maxHeight)))}px`;
          popoverSized = true;
        }
        function sentPopoverBounds() {
          return {
            minWidth: 280,
            maxWidth: Math.max(280, Math.min(420, window.innerWidth - POPOVER_MARGIN * 2)),
            maxHeight: Math.floor(window.innerHeight * 0.7)
          };
        }
        function sizeSentPopover() {
          const bounds = sentPopoverBounds();
          popoverSized = false;
          popover.style.height = "";
          popover.style.width = "auto";
          popover.style.maxWidth = `${bounds.maxWidth}px`;
          const previousLeft = popover.style.left;
          popover.style.left = "0px";
          const naturalWidth = popover.offsetWidth;
          popover.style.left = previousLeft;
          const width = Math.round(
            Math.min(bounds.maxWidth, Math.max(bounds.minWidth, naturalWidth || 0))
          );
          popover.style.width = `${width}px`;
          popover.style.maxWidth = "";
          popover.style.maxHeight = `${bounds.maxHeight}px`;
        }
        function sentPopoverHeightLimit() {
          return sentPopoverBounds().maxHeight;
        }
        function clampSizedPopoverToViewport() {
          if (!popoverSized || popover.dataset.open !== "1") return;
          const bounds = popoverSizeBounds();
          const limit = popoverMode === "sent" && popover.dataset.dragged !== "1" ? Math.min(bounds.maxHeight, sentPopoverHeightLimit()) : bounds.maxHeight;
          applyPopoverSize(popover.offsetWidth, Math.min(popover.offsetHeight, limit));
          popover.style.maxHeight = `${limit}px`;
          const width = popover.offsetWidth;
          const height = popover.offsetHeight;
          const rect = popover.getBoundingClientRect();
          const left = Math.max(POPOVER_MARGIN, Math.min(rect.left, window.innerWidth - width - POPOVER_MARGIN));
          const top = Math.max(POPOVER_MARGIN, Math.min(rect.top, window.innerHeight - height - POPOVER_MARGIN));
          popover.style.left = `${Math.round(left)}px`;
          popover.style.top = `${Math.round(top)}px`;
        }
        function resizePopoverFromPointer(clientX, clientY) {
          const start = popResize;
          if (start === null) return;
          const dx = clientX - start.x;
          const dy = clientY - start.y;
          const bounds = popoverSizeBounds();
          let left = start.left;
          let top = start.top;
          let width = start.width;
          let height = start.height;
          if (start.edge === "left" || start.edge === "topLeft") {
            const right = start.left + start.width;
            left = Math.max(POPOVER_MARGIN, Math.min(start.left + dx, right - POPOVER_MIN_WIDTH));
            left = Math.max(left, right - bounds.maxWidth);
            width = right - left;
          } else if (start.edge === "right" || start.edge === "topRight" || start.edge === "bottomRight") {
            width = Math.max(POPOVER_MIN_WIDTH, Math.min(start.width + dx, bounds.maxWidth));
            width = Math.min(width, window.innerWidth - POPOVER_MARGIN - start.left);
          }
          if (start.edge === "top" || start.edge === "topLeft" || start.edge === "topRight") {
            const bottom = start.top + start.height;
            top = Math.max(POPOVER_MARGIN, Math.min(start.top + dy, bottom - POPOVER_MIN_HEIGHT));
            top = Math.max(top, bottom - bounds.maxHeight);
            height = bottom - top;
          } else if (start.edge === "bottom" || start.edge === "bottomRight") {
            height = Math.max(POPOVER_MIN_HEIGHT, Math.min(start.height + dy, bounds.maxHeight));
            height = Math.min(height, window.innerHeight - POPOVER_MARGIN - start.top);
          }
          popover.style.width = `${Math.round(Math.max(POPOVER_MIN_WIDTH, width))}px`;
          popover.style.height = `${Math.round(Math.max(POPOVER_MIN_HEIGHT, height))}px`;
          popover.style.left = `${Math.round(left)}px`;
          popover.style.top = `${Math.round(top)}px`;
          popoverSized = true;
        }
        function beginPopoverResize(edge, event) {
          if (event.button !== 0) return;
          if (popover.dataset.open !== "1") return;
          const rect = popover.getBoundingClientRect();
          if (rect.width <= 0 || rect.height <= 0) return;
          popResize = {
            edge,
            x: event.clientX,
            y: event.clientY,
            left: rect.left,
            top: rect.top,
            width: rect.width,
            height: rect.height
          };
          popover.style.width = `${Math.round(rect.width)}px`;
          popover.style.height = `${Math.round(rect.height)}px`;
          popover.style.maxHeight = `${Math.max(POPOVER_MIN_HEIGHT, window.innerHeight - POPOVER_MARGIN * 2)}px`;
          popoverSized = true;
          popover.dataset.dragged = "1";
          popoverTouched = true;
          cancelHoverClose();
          popover.classList.add("sa-pop-resizing");
          event.preventDefault();
          event.stopPropagation();
        }
        function nudgePopoverSize(deltaWidth, deltaHeight) {
          if (popover.dataset.open !== "1") return;
          const rect = popover.getBoundingClientRect();
          if (rect.width <= 0 || rect.height <= 0) return;
          const width = Math.max(
            POPOVER_MIN_WIDTH,
            Math.min(rect.width + deltaWidth, window.innerWidth - POPOVER_MARGIN - rect.left)
          );
          const height = Math.max(
            POPOVER_MIN_HEIGHT,
            Math.min(rect.height + deltaHeight, window.innerHeight - POPOVER_MARGIN - rect.top)
          );
          applyPopoverSize(width, height);
          popover.style.maxHeight = `${Math.max(POPOVER_MIN_HEIGHT, window.innerHeight - POPOVER_MARGIN * 2)}px`;
          popover.dataset.dragged = "1";
          popoverTouched = true;
          cancelHoverClose();
          if (popoverMode !== "sent") savePopoverSize(width, height);
        }
        function createPopoverResizer(edge, extraClass, label) {
          const handle = document.createElement("div");
          handle.className = extraClass === void 0 ? "sa-pop-resizer" : `sa-pop-resizer ${extraClass}`;
          handle.dataset.edge = edge;
          if (label === void 0) {
            handle.setAttribute("aria-hidden", "true");
          } else {
            handle.setAttribute("role", "separator");
            handle.setAttribute("aria-label", label);
            handle.setAttribute("tabindex", "0");
          }
          handle.addEventListener("pointerdown", (event) => {
            beginPopoverResize(edge, event);
            if (label !== void 0) safe(() => handle.focus({ preventScroll: true }));
            if (typeof handle.setPointerCapture === "function") safe(() => handle.setPointerCapture(event.pointerId));
          });
          handle.addEventListener("keydown", (event) => {
            const step = event.shiftKey ? 32 : 8;
            let dw = 0;
            let dh = 0;
            if (event.key === "ArrowRight") dw = step;
            else if (event.key === "ArrowLeft") dw = -step;
            else if (event.key === "ArrowDown") dh = step;
            else if (event.key === "ArrowUp") dh = -step;
            else return;
            event.preventDefault();
            event.stopPropagation();
            nudgePopoverSize(dw, dh);
          });
          return handle;
        }
        const popEdgeHandles = [
          createPopoverResizer("left", "sa-pop-edge"),
          createPopoverResizer("right", "sa-pop-edge"),
          createPopoverResizer("top", "sa-pop-edge"),
          createPopoverResizer("bottom", "sa-pop-edge")
        ];
        const popGrip = createPopoverResizer("bottomRight", "sa-pop-grip", t("pop.resize"));
        popover.append(...popEdgeHandles, popGrip);
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
          delete toolbar.dataset.placed;
          toolbar.classList.remove("sa-toolbar-follow");
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
        function copyWithTextarea(text) {
          return safe(() => {
            const area = document.createElement("textarea");
            area.value = text;
            area.style.position = "fixed";
            area.style.opacity = "0";
            document.body.appendChild(area);
            try {
              area.select();
              return document.execCommand("copy") === true;
            } finally {
              area.remove();
            }
          }) === true;
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
          copyWithTextarea(text);
        }
        async function writeClipboardText(text) {
          if (typeof text !== "string" || text === "") return false;
          try {
            if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
              await navigator.clipboard.writeText(text);
              return true;
            }
          } catch {
          }
          return copyWithTextarea(text);
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
        function unionRects(rects) {
          if (rects.length === 0) return null;
          let top = rects[0].top;
          let left = rects[0].left;
          let bottom = rects[0].bottom;
          let right = rects[0].right;
          for (const rect of rects) {
            if (rect.top < top) top = rect.top;
            if (rect.left < left) left = rect.left;
            if (rect.bottom > bottom) bottom = rect.bottom;
            if (rect.right > right) right = rect.right;
          }
          return { top, left, bottom, right, width: right - left, height: bottom - top };
        }
        function placePopover(rect) {
          if (rect === void 0 || rect === null) return;
          popoverRect = rect;
          popover.style.maxHeight = popoverMode === "sent" ? `${sentPopoverHeightLimit()}px` : "";
          const width = popover.offsetWidth || 340;
          const height = popover.offsetHeight || 240;
          const point = popoverSource === "hover" ? lastPointerMove : popoverSource === "manual" ? null : selectionPointer ?? lastPointerMove;
          let left = anchoredLeft(point, rect, width);
          let top = 0;
          const margin = 8;
          const gap = 10;
          const spaceAbove = rect.top - gap - margin;
          const spaceBelow = window.innerHeight - rect.bottom - gap - margin;
          const preferAbove = spaceAbove >= Math.min(height, spaceBelow);
          const available = Math.max(160, preferAbove ? spaceAbove : spaceBelow);
          const sizeCap = Math.max(160, window.innerHeight - margin * 2);
          const heightLimit = popoverMode === "sent" ? Math.min(sizeCap, sentPopoverHeightLimit()) : sizeCap;
          popover.style.maxHeight = popoverSized ? `${Math.floor(heightLimit)}px` : `${Math.floor(Math.min(available, heightLimit))}px`;
          const effectiveHeight = popoverSized ? Math.min(height, sizeCap) : Math.min(height, available);
          top = preferAbove ? rect.top - effectiveHeight - gap : rect.bottom + gap;
          const surface = popoverSource === "manual" ? document.querySelector('[data-sa-ui="panel"]') ?? document.querySelector('[data-sa-ui="side"]') : null;
          const surfaceRect = surface === null ? null : safe(() => surface.getBoundingClientRect());
          if (surfaceRect !== void 0 && surfaceRect !== null && surfaceRect.width > 0) {
            if (surface.getAttribute("data-sa-ui") === "side") {
              const leftOfSide = surfaceRect.left - width - gap;
              left = leftOfSide >= margin ? leftOfSide : Math.min(window.innerWidth - width - margin, surfaceRect.right + gap);
            } else {
              const rightOfPanel = surfaceRect.right + gap;
              left = rightOfPanel + width <= window.innerWidth - margin ? rightOfPanel : Math.max(margin, surfaceRect.left - width - gap);
            }
            const maxHeight = window.innerHeight - margin * 2;
            const shownHeight = Math.min(height, maxHeight);
            top = Math.max(margin, Math.min(rect.top, window.innerHeight - shownHeight - margin));
            const heightLimit2 = popoverMode === "sent" ? Math.min(maxHeight, sentPopoverHeightLimit()) : maxHeight;
            popover.style.maxHeight = `${Math.floor(heightLimit2)}px`;
          }
          popover.style.left = `${Math.max(margin, Math.min(left, Math.max(margin, window.innerWidth - width - margin)))}px`;
          const boundedTop = popoverSized ? Math.max(margin, Math.min(top, Math.max(margin, window.innerHeight - effectiveHeight - margin))) : Math.max(margin, top);
          popover.style.top = `${boundedTop}px`;
        }
        function placeToolbar(element, rect, point) {
          const width = element.offsetWidth || 80;
          const height = element.offsetHeight || 32;
          const left = anchoredLeft(point, rect, width);
          const top = Math.min(rect.bottom + 8, window.innerHeight - height - 8);
          element.style.left = `${left}px`;
          element.style.top = `${Math.max(8, top)}px`;
          if (element.dataset.placed === "1") element.classList.add("sa-toolbar-follow");
          else element.dataset.placed = "1";
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
        const TOOLBAR_FOLLOW_MS = 1e3;
        function onSelectionChange() {
          flushPendingRepaint();
          window.clearTimeout(settleTimer);
          const following = toolbar.dataset.open === "1" && !pointerSelecting;
          settleTimer = window.setTimeout(() => {
            settleTimer = null;
            if (pointerSelecting) {
              hideToolbar();
              return;
            }
            showSelectionToolbar();
            flushPendingRepaint();
          }, following ? TOOLBAR_FOLLOW_MS : SETTLE_MS);
        }
        let popoverMode = "create";
        let popoverAnchor = null;
        let popoverTargetId = null;
        let popoverSnapshot = null;
        let popoverItem = null;
        let popoverTurn = null;
        let popoverRecord = null;
        let popAutoSaveTimer = null;
        function schedulePopAutoSave() {
          if (popoverMode !== "edit" && popoverMode !== "create") return;
          if (popover.dataset.open !== "1") return;
          if (popAutoSaveTimer !== null) window.clearTimeout(popAutoSaveTimer);
          popAutoSaveTimer = window.setTimeout(() => {
            popAutoSaveTimer = null;
            autoSavePopover();
          }, POP_AUTO_SAVE_MS);
        }
        function createAnnotationFromPopover() {
          const anchor = popoverAnchor;
          if (anchor === null) return;
          const created = addAnnotation({
            quote: anchor.quote,
            note: noteValue(),
            images: popInputImages,
            source: anchor.source,
            liveRange: anchor.range
          });
          if (created === void 0) return;
          popoverTargetId = created.id;
          popoverItem = created;
          popoverAnchor = null;
          popDelete.style.display = "";
          popTitle.textContent = t("pop.editTitle", { n: created.number });
          if (anchor.quote !== "") popJump.style.display = "";
          popJump.dataset.disabled = created.source?.kind === "file" ? "1" : "0";
          refineSourcePosition(created.id, anchor.source, anchor.quote).catch((err) => {
            warn("[selection-annotations] 位置精修失败（不影响这条批注）：", err);
          });
        }
        function autoSavePopover() {
          if (popover.dataset.open !== "1") return;
          const note = noteValue();
          const images = popInputImages;
          if (popoverMode === "create" && popoverTargetId === null) {
            if (note.trim() === "" && images.length === 0) return;
            createAnnotationFromPopover();
            return;
          }
          if (popoverTargetId === null) return;
          const target = popoverTargetId;
          const item = annotations.find((candidate) => candidate.id === target);
          if (item === void 0) return;
          const nextNote = note.trim().slice(0, MAX_NOTE);
          if (item.note === nextNote && JSON.stringify(item.images ?? []) === JSON.stringify(images)) return;
          updateAnnotation(target, note, images);
        }
        function cancelPopAutoSave() {
          if (popAutoSaveTimer === null) return;
          window.clearTimeout(popAutoSaveTimer);
          popAutoSaveTimer = null;
        }
        function flushPopAutoSave() {
          if (popAutoSaveTimer === null) return;
          window.clearTimeout(popAutoSaveTimer);
          popAutoSaveTimer = null;
          autoSavePopover();
        }
        function renderPopImages() {
          popImages.textContent = "";
          for (const image of popInputImages) {
            const box = document.createElement("div");
            box.className = "sa-pop-image";
            const src = typeof image.url === "string" && image.url !== "" ? image.url : typeof image.preview === "string" && image.preview !== "" ? image.preview : typeof image.thumb === "string" && image.thumb !== "" ? image.thumb : typeof image.dataUrl === "string" && image.dataUrl !== "" ? image.dataUrl : "";
            if (src !== "") {
              const thumb = document.createElement("img");
              thumb.className = "sa-pop-thumb";
              thumb.src = src;
              thumb.alt = image.name;
              thumb.title = t("image.open");
              thumb.style.cursor = "zoom-in";
              thumb.addEventListener("click", (event) => {
                event.preventDefault();
                event.stopPropagation();
                openImageViewer(src, image.name);
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
          schedulePopAutoSave();
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
          popInput.style.minHeight = "";
        }
        function syncPopInputHeight() {
          const keepTop = popBody.scrollTop;
          const previousFlex = popInput.style.flex;
          const previousHeight = popInput.style.height;
          const previousMin = popInput.style.minHeight;
          popInput.style.flex = "0 0 auto";
          popInput.style.height = "auto";
          popInput.style.minHeight = "0";
          const measured = Number(popInput.scrollHeight);
          popInput.style.flex = previousFlex;
          popInput.style.height = previousHeight;
          popInput.style.minHeight = previousMin;
          if (!Number.isFinite(measured) || measured <= 0) return;
          popInput.style.minHeight = `${Math.max(62, Math.round(measured))}px`;
          popBody.scrollTop = keepTop;
        }
        function ensureCaretVisible() {
          const selection = window.getSelection();
          if (selection === null || selection.rangeCount === 0) return;
          const range = selection.getRangeAt(0).cloneRange();
          const rect = range.getBoundingClientRect();
          const box = popBody.getBoundingClientRect();
          if (rect.bottom > box.bottom - 4) {
            popBody.scrollTop += rect.bottom - box.bottom + 12;
          } else if (rect.top < box.top + 4) {
            popBody.scrollTop -= box.top - rect.top + 12;
          }
        }
        function syncNoteTone() {
          const flags = noteFlags(noteValue(), adoptTextOf(), rejectTextOf());
          popInput.dataset.adopt = flags.adopt ? "1" : "0";
          popInput.dataset.reject = flags.reject ? "1" : "0";
        }
        function showPopover(options) {
          popTitle.textContent = options.title;
          popQuote.textContent = options.quote;
          popQuote.style.display = options.quote === "" ? "none" : "";
          popQuoteHead.style.display = options.quote === "" ? "none" : "";
          resetPopoverJumpHints();
          const canJump = options.mode === "sent" || options.mode === "edit" && options.quote !== "";
          popJump.style.display = canJump ? "" : "none";
          popJump.dataset.disabled = options.item?.source?.kind === "file" ? "1" : "0";
          popSource.textContent = options.sourceText;
          const readonly = options.mode === "sent";
          popoverMode = options.mode;
          if (readonly) {
            const noteText = typeof options.note === "string" && options.note !== "" ? options.note : t("pop.noNote");
            paintNote(popReadNote, noteText, noteViewOf(options.note));
          }
          popReadNote.style.display = readonly ? "" : "none";
          popSource.style.display = "";
          popDivider.style.display = "";
          popNoteLabel.style.display = "";
          popNoteJump.style.display = readonly && canJump ? "" : "none";
          popNoteJump.dataset.disabled = popJump.dataset.disabled;
          popInput.style.display = readonly ? "none" : "";
          popImages.style.display = "";
          popActions.style.display = readonly ? "none" : "";
          setNoteContent(readonly ? "" : options.note);
          updateSuggestion();
          popImages.dataset.readonly = readonly ? "1" : "0";
          popImagesHint.style.display = readonly ? "none" : "";
          resetPopImages(Array.isArray(options.images) ? options.images : []);
          if (readonly && popInputImages.length === 0) popImages.style.display = "none";
          popoverTargetId = options.targetId ?? null;
          popoverItem = options.item ?? null;
          popoverTurn = options.mode === "sent" ? Number.isFinite(options.item?.turn) ? options.item.turn : Number.isFinite(options.item?.source?.turn) ? options.item.source.turn : null : null;
          popoverRecord = options.mode === "sent" && popoverItem !== null ? sentRecordOf(popoverItem) : null;
          const sentReply = readonly && popoverItem !== null ? sentReplyOf(popoverItem, popoverRecord) : null;
          if (sentReply === null) {
            popReplyHead.replaceChildren(popReplyLabel);
            popReplyBody.className = "sa-pop-reply";
            popReplyBody.replaceChildren();
          } else {
            popReplyHead.replaceChildren(popReplyLabel, cards.buildReplyVerdict(sentReply));
            popReplyBody.className = `sa-pop-reply sa-tone-${cards.replyTone(sentReply)}`;
            popReplyBody.replaceChildren(cards.buildReplyDetail(sentReply));
          }
          popReplyDivider.style.display = sentReply === null ? "none" : "";
          popReplyHead.style.display = sentReply === null ? "none" : "";
          popReplyBody.style.display = sentReply === null ? "none" : "";
          popoverSnapshot = options.mode === "edit" && popoverTargetId !== null ? {
            id: popoverTargetId,
            note: typeof options.note === "string" ? options.note : "",
            images: Array.isArray(options.images) ? options.images.slice() : []
          } : null;
          popDelete.style.display = options.mode === "edit" ? "" : "none";
          for (const handle of popEdgeHandles) handle.style.display = "";
          popGrip.style.display = "";
          hideToolbar();
          resetPopInputHeight();
          popoverTouched = false;
          popoverHovered = false;
          popoverSource = options.source === "hover" ? "hover" : "manual";
          cancelHoverOpen();
          cancelHoverClose();
          delete popover.dataset.dragged;
          popover.dataset.open = "1";
          if (readonly) sizeSentPopover();
          else restorePopoverSize();
          popBody.scrollTop = 0;
          if (options.rect !== void 0 && options.rect !== null) placePopover(options.rect);
          if (!readonly) syncPopInputHeight();
          const focusEditor = () => {
            if (readonly) return;
            if (popover.dataset.open !== "1") return;
            safe(() => popInput.focus({ preventScroll: true }));
            safe(() => caretToEnd());
          };
          if (popoverSource !== "hover") {
            focusEditor();
            safe(() => window.requestAnimationFrame(focusEditor));
            safe(() => window.setTimeout(focusEditor, 60));
            safe(() => window.setTimeout(focusEditor, 180));
          }
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
        function popoverAnchorRect(anchor) {
          const measured = safe(() => anchor?.getBoundingClientRect());
          const panelRect = measured === void 0 || measured === null || measured.width === 0 && measured.height === 0 ? safe(() => document.querySelector('[data-sa-ui="panel"]')?.getBoundingClientRect()) : measured;
          return (panelRect !== void 0 && panelRect !== null ? panelRect : null) ?? {
            left: window.innerWidth / 2 - 40,
            top: window.innerHeight / 2,
            width: 80,
            height: 0,
            right: window.innerWidth / 2 + 40,
            bottom: window.innerHeight / 2
          };
        }
        function openEditPopover(id, anchor, source = "manual") {
          const item = annotations.find((candidate) => candidate.id === id);
          if (item === void 0) return;
          popoverAnchor = null;
          showPopover({
            title: t("pop.editTitle", { n: item.number }),
            quote: item.quote,
            sourceText: describeSource(item.source),
            note: item.note,
            images: Array.isArray(item.images) ? item.images : [],
            rect: popoverAnchorRect(anchor),
            mode: "edit",
            targetId: id,
            source,
            item
          });
        }
        function openSentPopover(item, anchor, source = "manual") {
          if (item === null || item === void 0 || item.sentHighlight !== true) return;
          popoverAnchor = null;
          showPopover({
            title: t("pop.sentTitle"),
            quote: typeof item.quote === "string" ? item.quote : "",
            sourceText: describeSource(item.source),
            note: typeof item.note === "string" ? item.note : "",
            images: sentImagesOf(item),
            rect: popoverAnchorRect(anchor),
            mode: "sent",
            // 悬停命中用它判断「指针还停在这条上」，避免同一条划线上反复收起重开。
            targetId: item.id,
            source,
            item
          });
        }
        function sentImagesOf(item) {
          if (Array.isArray(item.images) && item.images.length > 0) return item.images;
          const thumbs = Array.isArray(item.thumbs) ? item.thumbs : [];
          return thumbs.map((thumb, index) => ({
            id: `img-sent-${item.id ?? index}-${index}`,
            name: typeof thumb?.name === "string" ? thumb.name : "",
            dataUrl: thumb?.dataUrl ?? thumb?.preview ?? thumb?.thumb ?? ""
          }));
        }
        function closePopover(options = {}) {
          if (options.autoSave === false) cancelPopAutoSave();
          else flushPopAutoSave();
          popover.dataset.open = "0";
          popResize = null;
          popover.classList.remove("sa-pop-resizing");
          if (popoverSource === "hover") cancelHoverOpen();
          lowerPopover();
          safe(() => popInput.blur());
          if (options.discardWebEmpty !== false && popoverMode === "edit" && popoverTargetId !== null) {
            const item = annotations.find((candidate) => candidate.id === popoverTargetId);
            if (item !== void 0 && item.source !== null && item.source !== void 0 && item.source.kind === "web" && String(item.note ?? "").trim() === "") {
              removeAnnotation(popoverTargetId);
            }
          }
          popoverAnchor = null;
          popoverTargetId = null;
          popoverSnapshot = null;
          popoverItem = null;
          popoverTurn = null;
          popoverRecord = null;
          clearReplyFlash();
          clearSentFlash();
          popoverMode = "create";
          hideSuggestion();
        }
        const jumpHintTimers = /* @__PURE__ */ new WeakMap();
        let jumpToast = null;
        let jumpToastTimer = 0;
        function jumpHintFor(button3) {
          const parent = button3?.parentElement ?? null;
          if (parent === null) return popJumpHint;
          const existing = safe(() => parent.querySelector(":scope > .sa-pop-jump-hint")) ?? null;
          if (existing !== null) return existing;
          const hint = document.createElement("span");
          hint.className = "sa-pop-jump-hint";
          hint.dataset.on = "0";
          parent.insertBefore(hint, button3);
          return hint;
        }
        function flashPopoverJumpHint(message, button3) {
          const hint = jumpHintFor(button3);
          hint.textContent = message;
          hint.dataset.on = "1";
          const timer = jumpHintTimers.get(hint);
          if (timer !== void 0) window.clearTimeout(timer);
          jumpHintTimers.set(
            hint,
            window.setTimeout(() => {
              jumpHintTimers.delete(hint);
              hint.dataset.on = "0";
              hint.textContent = "";
            }, 2400)
          );
        }
        function resetPopoverJumpHints() {
          const hints = safe(() => [...popover.querySelectorAll(".sa-pop-jump-hint")]) ?? [];
          for (const hint of hints) {
            const timer = jumpHintTimers.get(hint);
            if (timer !== void 0) window.clearTimeout(timer);
            jumpHintTimers.delete(hint);
            hint.textContent = "";
            hint.dataset.on = "0";
          }
        }
        function flashJumpToast(message) {
          if (jumpToast !== null) jumpToast.remove();
          if (jumpToastTimer !== 0) window.clearTimeout(jumpToastTimer);
          const toast = document.createElement("div");
          toast.className = "sa-toast";
          toast.setAttribute("role", "status");
          toast.textContent = message;
          document.body.appendChild(toast);
          jumpToast = toast;
          jumpToastTimer = window.setTimeout(() => {
            jumpToastTimer = 0;
            if (jumpToast === toast) jumpToast = null;
            toast.remove();
          }, 2200);
        }
        function jumpFailure(message, root) {
          const host = root === void 0 || root === null ? null : safe(() => root.closest("[data-sa-ui]")) ?? null;
          if (host !== null && host.getAttribute("data-sa-ui") === "popover") {
            flashPopoverJumpHint(message, root);
            return;
          }
          if (host !== null && (host.getAttribute("data-sa-ui") === "panel" || host.getAttribute("data-sa-ui") === "side")) {
            flashPanelHint(message, host);
            return;
          }
          flashJumpToast(message);
        }
        function scrollRowToCenter(row) {
          const box = safe(() => row.getBoundingClientRect()) ?? null;
          if (box === null) return;
          const containers = scrollAncestorsOf(row);
          const container = containers.length > 0 ? containers[0] : null;
          if (container === null) {
            safe(() => row.scrollIntoView({ block: "center", behavior: "smooth" }));
            jumpScrollUntil = performance.now() + JUMP_SCROLL_GRACE_MS;
            return;
          }
          const frame = safe(() => container.getBoundingClientRect()) ?? null;
          if (frame === null) return;
          const top = container.scrollTop + (box.top - frame.top) - (container.clientHeight - box.height) / 2;
          scrollTrace.watch(container);
          scrollTrace.markWrite(container, "jump-quote", top);
          safe(() => container.scrollTo({ top: Math.max(0, top), behavior: "smooth" }));
          jumpScrollUntil = performance.now() + JUMP_SCROLL_GRACE_MS;
        }
        function findTurnNavButton(turn) {
          const digit = new RegExp(`(^|[^0-9])${turn}([^0-9]|$)`);
          for (const rail of document.querySelectorAll("nav[aria-label]")) {
            const marks = rail.querySelectorAll("button[data-index]");
            if (marks.length < 2) continue;
            for (const mark of marks) {
              const label = mark.getAttribute("aria-label") ?? "";
              if (!/轮|turn|ターン|tour|turno/i.test(label)) continue;
              if (digit.test(label)) return mark;
            }
          }
          return null;
        }
        function turnHolders(turn) {
          if (!Number.isFinite(turn)) return [];
          return safe(() => [...document.querySelectorAll(`[data-chat-turn="${turn}"]`)]) ?? [];
        }
        function rowOwnAnchorKey(element) {
          if (element === null || element === void 0) return null;
          const own = safe(() => element.getAttribute("data-chat-anchor-key")) ?? null;
          if (typeof own === "string" && own !== "") return own;
          const flow = safe(() => element.getAttribute("data-chat-flow-key")) ?? null;
          return typeof flow === "string" && flow !== "" ? flow : null;
        }
        function rowByAnchor(scope, source) {
          const key = typeof source?.anchorKey === "string" ? source.anchorKey : "";
          if (key === "" || scope === null || scope === void 0) return null;
          if (rowOwnAnchorKey(scope) === key) return scope;
          const direct = safe(() => scope.querySelector(`[data-chat-anchor-key="${cssEscape(key)}"]`)) ?? null;
          if (direct !== null) return direct;
          return safe(() => scope.querySelector(`[data-chat-flow-key="${cssEscape(key)}"]`)) ?? null;
        }
        function fingerprintOf(item) {
          const source = item?.source;
          const before = typeof item?.contextBefore === "string" ? item.contextBefore : typeof source?.contextBefore === "string" ? source.contextBefore : "";
          const after = typeof item?.contextAfter === "string" ? item.contextAfter : typeof source?.contextAfter === "string" ? source.contextAfter : "";
          const quote = flatText(item?.quote);
          if (quote === "" || before === "" && after === "") return null;
          return { quote, before, after };
        }
        function rowByFingerprint(scope, fingerprint) {
          if (scope === null || scope === void 0 || fingerprint === null) return null;
          const rows = safe(() => document.querySelectorAll("[data-chat-anchor-key]")) ?? [];
          for (const row of rows) {
            if (scope !== document && row !== scope && scope.contains(row) !== true) continue;
            const text = flatText(row.textContent);
            if (text === "") continue;
            let at = text.indexOf(fingerprint.quote);
            while (at !== -1) {
              const head = text.slice(Math.max(0, at - fingerprint.before.length), at);
              const tailAt = at + fingerprint.quote.length;
              const tail = text.slice(tailAt, tailAt + fingerprint.after.length);
              const headOk = fingerprint.before === "" || head === fingerprint.before;
              const tailOk = fingerprint.after === "" || tail === fingerprint.after;
              if (headOk && tailOk) return row;
              at = text.indexOf(fingerprint.quote, at + 1);
            }
          }
          return null;
        }
        function findSourceRow(source, item, turn) {
          const holders = turnHolders(turn);
          for (const holder of holders) {
            const row = rowByAnchor(holder, source);
            if (row !== null) return row;
          }
          const fingerprint = fingerprintOf(item);
          if (fingerprint !== null) {
            for (const holder of holders) {
              const row = rowByFingerprint(holder, fingerprint);
              if (row !== null) return row;
            }
          }
          const anchored = safe(() => anchorRoot(source)) ?? null;
          if (anchored !== null) return anchored;
          if (fingerprint !== null) return rowByFingerprint(document, fingerprint);
          return null;
        }
        function locateRangeInRow(item, row) {
          if (item === void 0 || item === null || row === null || row === void 0) return null;
          const source = item.source;
          if (source === void 0 || source === null) return null;
          if (locateSegmentsOf(item) !== null) return null;
          return safe(() => matchInRoot(row, item.quote, savedOffsetOf(source))) ?? null;
        }
        const FLASH_STEP_MS = 250;
        const FLASH_STEPS = 6;
        function clearFlashTimers() {
          for (const timer of flashTimers) window.clearTimeout(timer);
          flashTimers = [];
        }
        function resetFlashState() {
          clearFlashTimers();
          flashKey = null;
          flashPhase = 0;
          flashRange = null;
        }
        function flashQuote(item, range = null) {
          const key = highlightKeyOf(item);
          if (key === null) return;
          resetFlashState();
          flashKey = key;
          flashRange = range !== null && range !== void 0 ? range : null;
          flashPhase = 1;
          paintHighlightLayer();
          for (let step = 1; step < FLASH_STEPS; step += 1) {
            flashTimers.push(window.setTimeout(() => {
              flashPhase = step % 2 === 0 ? 1 : 0;
              paintHighlightLayer();
            }, step * FLASH_STEP_MS));
          }
          flashTimers.push(window.setTimeout(() => {
            flashTimers = [];
            flashKey = null;
            flashPhase = 0;
            flashRange = null;
            paintHighlightLayer();
            scheduleRepaint("jump-quote");
          }, FLASH_STEPS * FLASH_STEP_MS));
        }
        let replyFlashTimers = [];
        let replyFlashTarget = null;
        function clearReplyFlash() {
          for (const timer of replyFlashTimers) window.clearTimeout(timer);
          replyFlashTimers = [];
          if (replyFlashTarget !== null) safe(() => replyFlashTarget.classList.remove("sa-reply-flash"));
          replyFlashTarget = null;
        }
        function flashReplyTarget(target) {
          if (target === null || target === void 0) return;
          clearReplyFlash();
          replyFlashTarget = target;
          safe(() => target.classList.add("sa-reply-flash"));
          for (let step = 1; step < FLASH_STEPS; step += 1) {
            replyFlashTimers.push(window.setTimeout(() => {
              if (replyFlashTarget !== target) return;
              if (step % 2 === 0) safe(() => target.classList.add("sa-reply-flash"));
              else safe(() => target.classList.remove("sa-reply-flash"));
            }, step * FLASH_STEP_MS));
          }
          replyFlashTimers.push(window.setTimeout(() => {
            if (replyFlashTarget !== target) return;
            safe(() => target.classList.remove("sa-reply-flash"));
            replyFlashTarget = null;
            replyFlashTimers = [];
          }, FLASH_STEPS * FLASH_STEP_MS));
        }
        let sentFlashTimers = [];
        let sentFlashCard = null;
        function clearSentFlash() {
          for (const timer of sentFlashTimers) window.clearTimeout(timer);
          sentFlashTimers = [];
          if (sentFlashCard !== null) safe(() => sentFlashCard.classList.remove("sa-sent-flash"));
          sentFlashCard = null;
        }
        function flashSentCard(card) {
          if (card === null || card === void 0) return;
          clearSentFlash();
          sentFlashCard = card;
          safe(() => card.classList.add("sa-sent-flash"));
          for (let step = 1; step < FLASH_STEPS; step += 1) {
            sentFlashTimers.push(window.setTimeout(() => {
              if (sentFlashCard !== card) return;
              if (step % 2 === 0) safe(() => card.classList.add("sa-sent-flash"));
              else safe(() => card.classList.remove("sa-sent-flash"));
            }, step * FLASH_STEP_MS));
          }
          sentFlashTimers.push(window.setTimeout(() => {
            if (sentFlashCard !== card) return;
            safe(() => card.classList.remove("sa-sent-flash"));
            sentFlashCard = null;
            sentFlashTimers = [];
          }, FLASH_STEPS * FLASH_STEP_MS));
        }
        function replyCardOf(anchorKey) {
          if (typeof anchorKey !== "string" || anchorKey === "") return null;
          const cards2 = safe(() => document.querySelectorAll(`[data-sa-ui="replies"][data-anchor="${cssEscape(anchorKey)}"]`)) ?? [];
          for (let index = cards2.length - 1; index >= 0; index -= 1) {
            if (safe(() => cards2[index].isConnected === true) === true) return cards2[index];
          }
          return null;
        }
        function replyFallbackRow(turn) {
          if (!Number.isFinite(turn)) return null;
          const rows = safe(() => {
            const found = [];
            for (const holder of document.querySelectorAll(`[data-chat-turn="${turn}"]`)) {
              if ((holder.getAttribute?.("data-chat-flow-kind") ?? "") !== "") found.push(holder);
              found.push(...holder.querySelectorAll("[data-chat-flow-kind]"));
            }
            return found;
          }) ?? [];
          const lastOf = (kind) => {
            let found = null;
            for (const row of rows) {
              if ((row.getAttribute?.("data-chat-flow-kind") ?? "") === kind) found = row;
            }
            return found !== null && safe(() => found.isConnected === true) === true ? found : null;
          };
          return lastOf("assistant") ?? lastOf("assistant-step") ?? turnContentItem(turn);
        }
        function navigateToTurn(turn, locate, fail) {
          const mark = findTurnNavButton(turn);
          if (mark === null) {
            fail(t("jump.notLoaded", { n: turn }));
            return;
          }
          mark.click();
          const deadline = Date.now() + JUMP_NAV_TIMEOUT_MS;
          const retry = () => {
            if (locate()) return;
            if (Date.now() < deadline) {
              window.setTimeout(retry, JUMP_NAV_POLL_MS);
              return;
            }
            fail(t("jump.notLoaded", { n: turn }));
          };
          window.setTimeout(retry, JUMP_NAV_POLL_MS);
        }
        function jumpToSentCard(record, item, root) {
          const anchorKey = typeof record?.anchorKey === "string" && record.anchorKey !== "" ? record.anchorKey : null;
          const turn = Number.isFinite(record?.turn) ? record.turn : Number.isFinite(item?.turn) ? item.turn : null;
          const storedKey = typeof record?.storedKey === "string" && record.storedKey !== "" ? record.storedKey : null;
          if (anchorKey === null && storedKey === null && turn === null) return false;
          const fail = (message) => {
            warn("[selection-annotations] 卡片跳转失败:", { turn, anchorKey, reason: message });
            jumpFailure(message, root);
          };
          const cardIn = (scope) => {
            if (scope === null || scope === void 0) return null;
            if (storedKey !== null) {
              const exact = safe(
                () => scope.querySelector(`[data-sa-ui="sent"][data-sa-key="${cssEscape(storedKey)}"]`)
              ) ?? null;
              if (exact !== null) return exact;
            }
            if (anchorKey === null) return null;
            return safe(() => scope.querySelector(`[data-sa-ui="sent"][data-anchor="${cssEscape(anchorKey)}"]`)) ?? null;
          };
          const land = () => {
            const card = cardIn(document);
            if (card === null || safe(() => card.isConnected === true) !== true) {
              scheduleRepaint("jump-sent");
              return false;
            }
            scrollRowToCenter(card);
            flashSentCard(card);
            return true;
          };
          if (land()) return true;
          if (anchorKey !== null) {
            const row = safe(() => document.querySelector(`[data-chat-anchor-key="${cssEscape(anchorKey)}"]`)) ?? null;
            if (row !== null) {
              scrollRowToCenter(row);
              const holder = safe(() => row.closest("[data-chat-turn]")) ?? row.parentElement;
              const card = cardIn(holder);
              if (card !== null && safe(() => card.isConnected === true) === true) {
                scrollRowToCenter(card);
                flashSentCard(card);
                return true;
              }
            }
          }
          for (const holder of turnHolders(turn)) {
            const card = cardIn(holder);
            if (card === null || safe(() => card.isConnected === true) !== true) continue;
            scrollRowToCenter(card);
            flashSentCard(card);
            return true;
          }
          if (turn === null) {
            fail(t("jump.noCard"));
            return true;
          }
          scheduleRepaint("jump-sent");
          navigateToTurn(turn, land, fail);
          return true;
        }
        function jumpToReply(record, item, root) {
          const anchorKey = typeof record?.anchorKey === "string" && record.anchorKey !== "" ? record.anchorKey : null;
          const turn = Number.isFinite(record?.turn) ? record.turn : Number.isFinite(item?.turn) ? item.turn : null;
          const fail = (message, stage) => {
            warn("[selection-annotations] 答复跳转失败:", { turn, anchorKey, reason: message, stage });
            jumpFailure(message, root);
          };
          const landCard = (card2) => {
            scrollRowToCenter(card2);
            window.requestAnimationFrame(() => flashReplyTarget(card2));
            return true;
          };
          const landRow = (row) => {
            scrollRowToCenter(row);
            window.requestAnimationFrame(() => flashReplyTarget(row));
            return true;
          };
          const fallbackToSentCard = (stage) => {
            if (jumpToSentCard(record, item, root) === true) return;
            fail(t("jump.noReply"), stage);
          };
          const card = replyCardOf(anchorKey);
          if (card !== null) {
            landCard(card);
            return;
          }
          markConversationDirty();
          scheduleRepaint("jump-reply");
          if (turn === null) {
            window.setTimeout(() => {
              const late = replyCardOf(anchorKey);
              if (late !== null) {
                landCard(late);
                return;
              }
              fallbackToSentCard("reply-card");
            }, REPAINT_MS + 60);
            return;
          }
          const loadedRow = replyFallbackRow(turn);
          if (loadedRow !== null) {
            window.setTimeout(() => {
              const late = replyCardOf(anchorKey);
              if (late !== null) {
                landCard(late);
                return;
              }
              landRow(replyFallbackRow(turn) ?? loadedRow);
            }, REPAINT_MS + 60);
            return;
          }
          if (findTurnNavButton(turn) === null) {
            const row = replyFallbackRow(turn);
            if (row !== null) {
              landRow(row);
              return;
            }
            fallbackToSentCard("reply-after-nav");
            return;
          }
          navigateToTurn(turn, () => {
            const late = replyCardOf(anchorKey);
            if (late === null) {
              markConversationDirty();
              scheduleRepaint("jump-reply");
              return false;
            }
            return landCard(late);
          }, () => {
            const row = replyFallbackRow(turn);
            if (row !== null) {
              landRow(row);
              return;
            }
            fallbackToSentCard("assistant-row");
          });
        }
        function jumpToQuote(item, turnHint, root) {
          const source = item === void 0 || item === null ? null : item.source;
          const turn = Number.isFinite(turnHint) ? turnHint : Number.isFinite(source?.turn) ? source.turn : null;
          const key = highlightKeyOf(item);
          const painted = key === null ? null : paintedRows.get(key) ?? null;
          const drawn = painted !== null;
          const drawnRow = drawn && safe(() => painted.isConnected === true) === true ? painted : null;
          const fail = (message) => {
            warn("[selection-annotations] 跳转失败:", {
              turn,
              kind: source?.kind,
              anchorKey: source?.anchorKey,
              drawn,
              reason: message
            });
            jumpFailure(message, root);
          };
          if (drawnRow !== null) {
            scrollRowToCenter(drawnRow);
            const range = safe(() => locateRangeInRow(item, drawnRow)) ?? null;
            window.requestAnimationFrame(() => flashQuote(item, range));
            return;
          }
          if (source === void 0 || source === null) {
            fail(t("jump.noAnchor"));
            return;
          }
          if (source.kind === "file") {
            fail(t("jump.file"));
            return;
          }
          if (source.kind !== "message" && source.kind !== "sent" && source.kind !== "reply") {
            fail(t("jump.noAnchor"));
            return;
          }
          const land = () => {
            const row = safe(() => findSourceRow(source, item, turn)) ?? null;
            if (row === null) return false;
            scrollRowToCenter(row);
            const range = locateRangeInRow(item, row);
            window.requestAnimationFrame(() => flashQuote(item, range));
            return true;
          };
          if (land()) return;
          if (turn === null) {
            fail(t("jump.noAnchor"));
            return;
          }
          navigateToTurn(turn, land, fail);
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
          scheduleRepaint("emit");
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
            scheduleRepaint("emit");
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
            closePopover({ discardWebEmpty: false });
            return;
          }
          const anchor = popoverAnchor;
          if (popoverTargetId !== null) {
            closePopover({ discardWebEmpty: false });
            return;
          }
          if (anchor === null) return;
          const note = noteValue();
          const images = popInputImages;
          if (discardEmpty && shouldDiscardEmpty(popoverMode, note, images)) {
            cancelPopAutoSave();
            closePopover();
            return;
          }
          cancelPopAutoSave();
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
        function cancelPopoverEdit() {
          cancelPopAutoSave();
          if (popoverMode === "create") {
            if (popoverTargetId !== null) removeAnnotation(popoverTargetId);
            closePopover({ autoSave: false });
            return;
          }
          const snapshot2 = popoverSnapshot;
          if (popoverMode === "edit" && popoverTargetId !== null && snapshot2 !== null && snapshot2.id === popoverTargetId) {
            const current = annotations.find((item) => item.id === popoverTargetId);
            const changed = current !== void 0 && (current.note !== snapshot2.note || JSON.stringify(current.images ?? []) !== JSON.stringify(snapshot2.images));
            if (changed) updateAnnotation(snapshot2.id, snapshot2.note, snapshot2.images);
          }
          closePopover({ autoSave: false });
        }
        function adoptSelectionDirectly(noteText = adoptTextOf()) {
          const selection = pendingSelection;
          if (selection === null) return void 0;
          hideToolbar();
          closeContextMenu();
          const source = captureSource(selection.range);
          const created = addAnnotation({
            quote: selection.quote,
            note: noteText,
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
          return created;
        }
        function rejectSelectionDirectly() {
          const selection = pendingSelection;
          const created = adoptSelectionDirectly(rejectTextOf());
          if (created === void 0 || created === null) return;
          const anchor = selection === null ? void 0 : { getBoundingClientRect: () => selection.range.getBoundingClientRect() };
          openEditPopover(created.id, anchor);
        }
        function repliedMarksOf(sessionId) {
          const uuids = /* @__PURE__ */ new Set();
          const legacy = /* @__PURE__ */ new Set();
          for (const batch of remoteReplyCache.get(sessionId) ?? []) {
            for (const reply of Array.isArray(batch?.replies) ? batch.replies : []) {
              if (typeof reply?.uuid === "string" && reply.uuid !== "") uuids.add(reply.uuid);
              if (Number.isFinite(reply?.index)) {
                legacy.add(`${reply.index}\0${typeof reply.quote === "string" ? reply.quote : ""}`);
              }
            }
          }
          return { uuids, legacy };
        }
        function recordHasReplyMark(record) {
          if (record === null || record === void 0 || typeof record !== "object") return false;
          return record.replied === true || Number.isFinite(record.repliedAt) || Number.isFinite(record.replyAt);
        }
        function itemHasReplyMark(item) {
          if (item === null || item === void 0 || typeof item !== "object") return false;
          return item.replied === true || Number.isFinite(item.repliedAt) || Number.isFinite(item.replyAt) || typeof item.verdict === "string" && item.verdict !== "";
        }
        function itemWasAnswered(item, record, replied) {
          if (recordHasReplyMark(record) || itemHasReplyMark(item)) return true;
          const uuidOf = (candidate) => typeof candidate?.uuid === "string" && candidate.uuid !== "" ? candidate.uuid : "";
          if (replied.uuids.has(uuidOf(item))) return true;
          if (uuidOf(item) === "") {
            const items = Array.isArray(record?.items) ? record.items : [];
            for (const candidate of items) {
              if (candidate?.quote !== item?.quote) continue;
              if (replied.uuids.has(uuidOf(candidate))) return true;
              if (Number.isFinite(candidate?.index) && typeof item?.quote === "string" && replied.legacy.has(`${candidate.index}\0${item.quote}`)) {
                return true;
              }
            }
          }
          if (Number.isFinite(item?.index)) {
            return replied.legacy.has(`${item.index}\0${typeof item.quote === "string" ? item.quote : ""}`);
          }
          return false;
        }
        function reuseSentItems(items, record = null, force = false) {
          const list = Array.isArray(items) ? items : [];
          const sessionId = currentSessionId();
          const replied = force || sessionId === void 0 ? null : repliedMarksOf(sessionId);
          const keep = [];
          const answered = [];
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
            const entry = {
              quote: typeof item.quote === "string" ? item.quote : "",
              note: typeof item.note === "string" ? item.note : "",
              images,
              source: item.source
            };
            if (replied !== null && itemWasAnswered(item, record, replied)) answered.push(entry);
            else keep.push(entry);
          }
          if (answered.length > 0) {
            void copyAnnotationsToClipboard(answered, void 0, t("sent.replayCopied"));
          }
          return keep.length === 0 ? 0 : addUniqueAnnotations(keep);
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
        rejectButton.addEventListener("mousedown", (event) => {
          event.preventDefault();
        });
        rejectButton.addEventListener("click", (event) => {
          event.preventDefault();
          rejectSelectionDirectly();
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
        menuReject.addEventListener("mousedown", (event) => {
          event.preventDefault();
        });
        menuReject.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          if (contextMenuSelection !== null) pendingSelection = contextMenuSelection;
          closeContextMenu();
          rejectSelectionDirectly();
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
        popCancel.addEventListener("click", () => cancelPopoverEdit());
        popSave.addEventListener("click", () => {
          commitPopover();
        });
        popDelete.addEventListener("click", () => deleteFromPopover());
        popClose.addEventListener("click", () => closePopover());
        popInput.addEventListener("keydown", (event) => {
          if (event.key === "Tab" && !event.shiftKey) {
            if (acceptSuggestion()) {
              event.preventDefault();
              return;
            }
            const value = noteValue();
            const phrase = notePhrases().find(
              (candidate) => value !== "" && value !== candidate && candidate.startsWith(value)
            );
            if (phrase !== void 0) {
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
        });
        popInput.addEventListener("input", () => {
          const value = noteValue();
          const hit = notePhrases().find((phrase) => value.endsWith(phrase));
          if (hit !== void 0) {
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
          for (let index = highlightHits.length - 1; index >= 0; index -= 1) {
            const entry = highlightHits[index];
            for (const rect of entry.rects) {
              if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) return entry;
            }
          }
          return void 0;
        }
        function hoverPointExposed(x, y) {
          if (typeof document.elementsFromPoint !== "function") return true;
          for (const node of document.elementsFromPoint(x, y)) {
            if (node === document.body || node === document.documentElement) break;
            const className = typeof node.className === "string" ? node.className : "";
            if (className.includes("sa-hl") || className.includes("sa-badge")) continue;
            if (className.includes("sa-token")) continue;
            if (popover.contains(node)) continue;
            const host = node.closest?.("[data-sa-ui]");
            if (host !== null && host !== void 0) {
              const kind = host.getAttribute("data-sa-ui");
              if (kind === "overlay" || kind === "sent" || kind === "replies") continue;
              return false;
            }
            const style = window.getComputedStyle(node);
            const z = Number(style.zIndex);
            if ((style.position === "fixed" || style.position === "sticky") && Number.isFinite(z) && z >= 10) return false;
            return true;
          }
          return true;
        }
        function onHoverMove(event) {
          const open = popover.dataset.open === "1";
          const raw = highlightHits.length === 0 ? void 0 : hitHighlight(event.clientX, event.clientY);
          const hit = raw !== void 0 && hoverPointExposed(event.clientX, event.clientY) ? raw : void 0;
          if (open) {
            if (popoverSource !== "hover") return;
            const popoverBox = safe(() => popover.getBoundingClientRect());
            const overPopover = popoverBox !== void 0 && popoverBox !== null && event.clientX >= popoverBox.left && event.clientX <= popoverBox.right && event.clientY >= popoverBox.top && event.clientY <= popoverBox.bottom;
            if (overPopover || popoverHovered) {
              cancelHoverClose();
              if (hit === void 0 || hit.id === popoverTargetId) return;
            }
            if (hit === void 0) {
              if (popoverTouched) return;
              scheduleHoverClose();
              return;
            }
            if (popoverTargetId === hit.id) {
              cancelHoverClose();
              return;
            }
            const nextRect = unionRects(hit.rects);
            if (nextRect === null) return;
            if (popoverMode === "edit") commitPopover(true);
            else closePopover();
            if (popover.dataset.open === "1") return;
            const nextSent = hit.item?.sentHighlight === true ? hit.item : void 0;
            if (nextSent !== void 0) {
              openSentPopover(nextSent, { getBoundingClientRect: () => nextRect }, "hover");
              return;
            }
            openEditPopover(hit.id, { getBoundingClientRect: () => nextRect }, "hover");
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
            const rect = unionRects(hit.rects);
            if (rect === null) return;
            const sent = hit.item?.sentHighlight === true ? hit.item : void 0;
            if (sent !== void 0) {
              openSentPopover(sent, { getBoundingClientRect: () => rect }, "hover");
              return;
            }
            const target = annotations.find((item) => item.id === hit.id);
            if (target === void 0) {
              reportHoverMiss(hit.id);
              return;
            }
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
          "wheel",
          (event) => {
            if (popover.dataset.open !== "1") return;
            const target = elementOf2(event.target);
            if (target !== null && target.closest(".sa-pop-body, .sa-pop-quote, .sa-pop-input") !== null) return;
            event.preventDefault();
            popBody.scrollBy({ top: event.deltaY, left: event.deltaX });
          },
          { passive: false }
        );
        popover.addEventListener(
          "pointerdown",
          () => {
            if (popoverMode !== "sent") popoverTouched = true;
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
        const onHoverMoveDocument = (event) => {
          const now = Date.now();
          if (now - hoverMoveAt < 60) return;
          hoverMoveAt = now;
          onHoverMove(event);
        };
        document.addEventListener("mousemove", onHoverMoveDocument, true);
        const onPopoverOutsidePointerDown = (event) => {
          if (popover.dataset.open !== "1") return;
          const target = elementOf2(event.target);
          if (target !== null && target.closest('[data-sa-ui="popover"]') !== null) return;
          if (target !== null && target.closest('[data-sa-ui="viewer"]') !== null) return;
          if (popoverMode === "sent" && popover.dataset.dragged === "1") return;
          commitPopover(true);
        };
        document.addEventListener("pointerdown", onPopoverOutsidePointerDown, true);
        const onPopoverEscapeKeyDown = (event) => {
          if (event.key !== "Escape") return;
          if (imageViewer.dataset.open === "1") {
            closeImageViewer();
            return;
          }
          hideToolbar();
          closePopover();
        };
        document.addEventListener("keydown", onPopoverEscapeKeyDown);
        function sourceSummary(item) {
          const source = item.source;
          if (source?.kind === "message") return source.flowKind === "user" ? t("source.user") : t("source.assistant");
          if (source?.kind === "reply") return t("source.replyShort", { n: Number.isFinite(source.index) ? source.index : "-" });
          if (source?.kind === "sent") return t("source.sentShort", { n: Number.isFinite(source.index) ? source.index : "-" });
          if (source?.kind === "web") return t("source.webShort", { url: source.path ?? "" });
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
          if (draggedId === "") return;
          const before = panelRenderer.snapshotRows(panelEl);
          moveAnnotation(draggedId, null);
          panelRenderer.animateRows(panelEl, before);
        });
        let panelRaf = 0;
        let panelObserver = null;
        let panelWidthSeen = -1;
        let panelHeightSeen = -1;
        let viewportResizing = false;
        let viewportResizeTimer = 0;
        if (typeof ResizeObserver === "function") {
          panelObserver = new ResizeObserver(() => {
            if (!panelOpen || panelRaf !== 0 || viewportResizing) return;
            const width = panelEl.offsetWidth;
            const height = panelEl.offsetHeight;
            if (width === panelWidthSeen && height === panelHeightSeen) return;
            panelRaf = window.requestAnimationFrame(() => {
              panelRaf = 0;
              positionPanel();
            });
          });
          panelObserver.observe(panelEl);
        }
        let panelOpen = false;
        let panelAnchor = null;
        let panelAnchorRect = null;
        let panelHideTimer = 0;
        let panelOpenedByHover = false;
        let panelHovered = false;
        let chipHoverOpenTimer = 0;
        let chipHoverCloseTimer = 0;
        function cancelChipTimers() {
          if (chipHoverOpenTimer !== 0) {
            window.clearTimeout(chipHoverOpenTimer);
            chipHoverOpenTimer = 0;
          }
          if (chipHoverCloseTimer !== 0) {
            window.clearTimeout(chipHoverCloseTimer);
            chipHoverCloseTimer = 0;
          }
        }
        function scheduleHoverOpen(anchor) {
          if (panelOpen || panelOpenedByHover) return;
          if (chipHoverCloseTimer !== 0) {
            window.clearTimeout(chipHoverCloseTimer);
            chipHoverCloseTimer = 0;
          }
          chipHoverOpenTimer = window.setTimeout(() => {
            chipHoverOpenTimer = 0;
            if (panelOpen) return;
            panelOpenedByHover = true;
            openPanel(anchor);
          }, 140);
        }
        function scheduleChipHoverClose() {
          if (!panelOpen || !panelOpenedByHover) return;
          if (chipHoverCloseTimer !== 0) return;
          chipHoverCloseTimer = window.setTimeout(() => {
            chipHoverCloseTimer = 0;
            if (panelOpenedByHover && !panelHovered) closePanel();
          }, 220);
        }
        let imageSettingsOpen = false;
        let instructionSettingsOpen = false;
        let fallbackSettingsOpen = false;
        function button2(className, text, onClick) {
          const created = el("button", className, text);
          created.type = "button";
          created.addEventListener("click", onClick);
          return created;
        }
        function positionPanel() {
          if (!panelOpen || panelAnchor === null) return;
          if (panelAnchorRect === null) {
            const measured = safe(() => panelAnchor.getBoundingClientRect());
            if (measured === void 0) return;
            panelAnchorRect = { top: measured.top, bottom: measured.bottom, right: measured.right };
          }
          const rect = panelAnchorRect;
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
          panelRoot.style.top = `${Math.max(8, Math.min(top, viewport - height - 8))}px`;
          panelWidthSeen = width;
          panelHeightSeen = height;
        }
        function clampPanelToViewport() {
          if (!panelOpen) return;
          const left = Number.parseFloat(panelRoot.style.left);
          const top = Number.parseFloat(panelRoot.style.top);
          if (!Number.isFinite(left) || !Number.isFinite(top)) return;
          const width = panelEl.offsetWidth || 360;
          const height = panelEl.offsetHeight || 240;
          const maxLeft = Math.max(8, window.innerWidth - width - 8);
          const maxTop = Math.max(8, window.innerHeight - height - 8);
          const nextLeft = Math.min(Math.max(left, 8), maxLeft);
          const nextTop = Math.min(Math.max(top, 8), maxTop);
          if (nextLeft !== left) panelRoot.style.left = `${nextLeft}px`;
          if (nextTop !== top) panelRoot.style.top = `${nextTop}px`;
        }
        function markViewportResize() {
          viewportResizing = true;
          if (viewportResizeTimer !== 0) window.clearTimeout(viewportResizeTimer);
          viewportResizeTimer = window.setTimeout(() => {
            viewportResizeTimer = 0;
            viewportResizing = false;
          }, 160);
        }
        async function acceptWebPick(picked) {
          const anchor = picked.anchor !== void 0 && picked.anchor !== null ? picked.anchor : webAnchor(picked.rect);
          const existing = annotations.find(
            (candidate) => candidate.source !== null && candidate.source !== void 0 && candidate.source.kind === "web" && candidate.source.anchorKey === picked.selector
          );
          if (picked.action === "delete") {
            const target = annotations.find((candidate) => candidate.id === picked.id);
            if (target !== void 0) removeAnnotation(target.id);
            return;
          }
          if (picked.action === "modify" || picked.action === "open") {
            const target = annotations.find((candidate) => candidate.id === picked.id);
            if (target !== void 0) openEditPopover(target.id, anchor, "manual");
            return;
          }
          if (existing !== void 0) {
            openEditPopover(existing.id, anchor, "manual");
            return;
          }
          const adopt = picked.action === "adopt";
          const shot = picked.fromPreview === true ? void 0 : await webPicker.capture(imageSettingsOf().webShot ?? "element", picked.rect);
          const images = shot === void 0 ? [] : [
            {
              id: `img-web-${Date.now().toString(36)}`,
              name: `网页截图-${(/* @__PURE__ */ new Date()).toISOString().slice(11, 19).replace(/:/g, "")}.png`,
              dataUrl: shot,
              thumb: shot,
              preview: shot,
              bytes: Math.round(shot.length * 3 / 4)
            }
          ];
          const item = addAnnotation({
            quote: picked.quote !== "" ? picked.quote : picked.selector,
            note: adopt ? adoptTextOf() : "",
            images,
            source: {
              kind: "web",
              anchorKey: picked.selector,
              path: picked.url,
              textOrigin: "rendered"
            }
          });
          if (item === void 0) return;
          if (!adopt) openEditPopover(item.id, anchor, "manual");
        }
        const webPicker = createWebPicker({
          onPick: acceptWebPick
        });
        webPickerHandle = webPicker;
        webPicker.start();
        const previewBridge = createPreviewBridge({
          onPick: acceptWebPick,
          getNotes: () => annotations.filter((item) => item.source !== null && item.source !== void 0 && item.source.kind === "web").map((item) => ({
            id: item.id,
            path: item.source.path,
            selector: item.source.anchorKey,
            adopt: hasAdoptNote(item.note)
          }))
        });
        previewBridge.start();
        const HTML_PREVIEW_ID = "dsh-selection-annotations/html-preview";
        const HTML_PREVIEW_BRIDGE = String.raw`(function () {
  try {
    Object.defineProperty(window, '__saPicked', {
      configurable: true,
      get: function () { return null },
      set: function (value) {
        if (value && window.parent !== window) window.parent.postMessage({ __saPreviewPick: value }, '*')
      },
    })
  } catch (error) {}
  window.addEventListener('message', function (event) {
    var data = event.data
    if (!data || !Array.isArray(data.__saPreviewNotes)) return
    window.__saWebNotes = data.__saPreviewNotes
    try { window.__saWebRender && window.__saWebRender() } catch (error) {}
  })
})();`;
        function decodePreviewText(data) {
          if (typeof data === "string") return data;
          try {
            return new TextDecoder("utf-8").decode(data);
          } catch {
            return "";
          }
        }
        function buildHtmlPreviewDocument(data) {
          let text = decodePreviewText(data);
          try {
            const bundle = JSON.parse(text);
            if (bundle !== null && typeof bundle === "object" && typeof bundle.html === "string") text = bundle.html;
          } catch {
          }
          let doc;
          try {
            doc = new DOMParser().parseFromString(text, "text/html");
          } catch {
            return "";
          }
          if (doc === null || doc.documentElement === null) return "";
          for (const node of Array.from(doc.querySelectorAll("script,iframe,object,embed,base,frame"))) node.remove();
          for (const node of Array.from(doc.querySelectorAll("*"))) {
            for (const attr of Array.from(node.attributes ?? [])) {
              if (/^on/iu.test(attr.name) || attr.name === "srcdoc") node.removeAttribute(attr.name);
            }
          }
          const head = doc.head ?? doc.documentElement;
          const csp = doc.createElement("meta");
          csp.setAttribute("http-equiv", "Content-Security-Policy");
          csp.setAttribute(
            "content",
            "default-src 'none'; script-src 'nonce-sa-preview'; style-src 'unsafe-inline'; img-src data: blob:; font-src data:; media-src data:; connect-src 'none'; frame-src 'none'; form-action 'none'; base-uri 'none'"
          );
          head.prepend(csp);
          const script = doc.createElement("script");
          script.setAttribute("nonce", "sa-preview");
          script.textContent = `${HTML_PREVIEW_BRIDGE}
${PICK_SCRIPT}`;
          (doc.body ?? doc.documentElement).appendChild(script);
          return `<!doctype html>${doc.documentElement.outerHTML}`;
        }
        function HtmlPreviewBody(props) {
          const frameRef = React.useRef(null);
          const content = props !== null && props !== void 0 ? props.content : void 0;
          const data = content !== null && content !== void 0 ? content.data : void 0;
          const tabInfo = safe(() => typeof props.useTabInfo === "function" ? props.useTabInfo() : void 0);
          const tab = tabInfo !== null && tabInfo !== void 0 && tabInfo.tab !== void 0 ? tabInfo.tab : tabInfo;
          const filePath = String(
            (props !== null && props !== void 0 && props.resourceAddress) ?? (tab !== void 0 ? tab.title : "") ?? "HTML"
          );
          const source = React.useMemo(() => buildHtmlPreviewDocument(data), [data]);
          const frameUrl = React.useMemo(() => {
            if (source === "") return "";
            try {
              return URL.createObjectURL(new Blob([source], { type: "text/html" }));
            } catch {
              return "";
            }
          }, [source]);
          React.useEffect(
            () => () => {
              if (frameUrl !== "") URL.revokeObjectURL(frameUrl);
            },
            [frameUrl]
          );
          React.useEffect(() => {
            const frame = frameRef.current;
            if (frame === null || frame === void 0) return void 0;
            const onMessage = (event) => {
              if (event.source !== frame.contentWindow) return;
              const picked = event.data !== null && typeof event.data === "object" ? event.data.__saPreviewPick : void 0;
              if (picked === null || picked === void 0) return;
              const base = frame.getBoundingClientRect();
              const inner = picked.rect ?? {};
              const rect = {
                left: Number(inner.left ?? 0),
                top: Number(inner.top ?? 0),
                width: Number(inner.width ?? 0),
                height: Number(inner.height ?? 0)
              };
              const anchor = {
                getBoundingClientRect: () => ({
                  left: base.left + rect.left,
                  top: base.top + rect.top,
                  width: rect.width,
                  height: rect.height,
                  right: base.left + rect.left + rect.width,
                  bottom: base.top + rect.top + rect.height
                })
              };
              try {
                acceptWebPick({
                  action: picked.action,
                  id: picked.id,
                  quote: typeof picked.label === "string" ? picked.label : "",
                  selector: typeof picked.selector === "string" ? picked.selector : "",
                  text: typeof picked.text === "string" ? picked.text : "",
                  url: filePath,
                  rect,
                  anchor,
                  fromPreview: true
                });
              } catch (error) {
                warn("[selection-annotations] 处理 HTML 预览批注失败：", error);
              }
            };
            const sync = () => {
              const notes = annotations.filter((item) => item.source !== null && item.source !== void 0 && item.source.kind === "web" && item.source.path === filePath).map((item) => ({ id: item.id, selector: item.source.anchorKey, adopt: hasAdoptNote(item.note) }));
              try {
                if (frame.contentWindow !== null) frame.contentWindow.postMessage({ __saPreviewNotes: notes }, "*");
              } catch {
              }
            };
            window.addEventListener("message", onMessage);
            frame.addEventListener("load", sync);
            const timer = window.setInterval(sync, 800);
            sync();
            return () => {
              window.removeEventListener("message", onMessage);
              frame.removeEventListener("load", sync);
              window.clearInterval(timer);
            };
          }, [filePath, source]);
          return h("iframe", {
            ref: frameRef,
            src: frameUrl,
            sandbox: "allow-scripts",
            title: "HTML 批注预览",
            "data-sa-html-preview": "1",
            style: {
              width: "100%",
              height: "100%",
              minHeight: "240px",
              border: "0",
              display: "block",
              background: "var(--dsw-alias-bg-base, Canvas)"
            }
          });
        }
        ctx.effect(() => {
          const previews = safe(() => ctx.documentPreviews);
          if (previews === void 0 || previews === null || typeof previews.register !== "function") return void 0;
          try {
            return previews.register({
              id: HTML_PREVIEW_ID,
              extensions: ["html", "htm"],
              priority: "extension",
              title: () => "HTML",
              loading: "bytes-complete",
              wrap: false
            });
          } catch (error) {
            warn("[selection-annotations] HTML 预览注册失败：", error);
            return void 0;
          }
        }, "selection-annotations: html preview definition");
        ctx.effect(() => {
          if (ctx.slots === void 0) return void 0;
          try {
            return ctx.slots.inject(
              "sidebar.right.tab.document",
              () => ctx.slots.register(
                { name: "sidebar.right.tab.document", key: HTML_PREVIEW_ID, locale: LOCALE_NS, inject: () => ({}) },
                HtmlPreviewBody
              )
            );
          } catch (error) {
            warn("[selection-annotations] HTML 预览槽位注册失败：", error);
            return void 0;
          }
        }, "selection-annotations: html preview body");
        const SIDE_TAB_ID = "dsh-selection-annotations";
        const SIDE_TAB_KIND = "selection-annotations";
        const SIDE_TAB_SYNC_MS = 800;
        function findSideAnnotationsTab() {
          const service = safe(() => ctx.sidebarRight);
          if (service === void 0 || service === null || typeof service.tabsIn !== "function") return void 0;
          const sessionId = currentSessionId();
          if (typeof sessionId !== "string" || sessionId === "") return void 0;
          const tabs = safe(() => service.tabsIn(sessionId));
          if (!Array.isArray(tabs)) return void 0;
          return tabs.find((tab) => tab !== null && tab !== void 0 && tab.kind === SIDE_TAB_KIND);
        }
        function sideTabState() {
          const tab = findSideAnnotationsTab();
          const service = safe(() => ctx.sidebarRight);
          const usable = tab !== void 0 && service !== void 0 && service !== null;
          const expanded = usable ? safe(() => service.isExpanded()) === true : false;
          const active = usable ? safe(() => {
            const current = service.active();
            return current !== void 0 && current !== null && current.id === tab.id;
          }) === true : false;
          return { tab, hasTab: tab !== void 0, expanded, active };
        }
        function sideAnnotationsTabOpen() {
          return sideTabAction(sideTabState()) === "close";
        }
        let sideTabSyncTimer = 0;
        let sideTabUnsubscribers = [];
        let sideTabPaintedOpen = null;
        function syncSideTabButton() {
          const open = sideAnnotationsTabOpen();
          if (open === sideTabPaintedOpen) return;
          sideTabPaintedOpen = open;
          renderPanel();
        }
        function subscribeSideTabSources() {
          const service = safe(() => ctx.sidebarRight);
          if (service === void 0 || service === null) return;
          for (const source of [safe(() => service.openTabs), safe(() => service.mounted)]) {
            if (source === void 0 || source === null || typeof source.subscribe !== "function") continue;
            const unsubscribe = safe(() => source.subscribe(syncSideTabButton));
            if (typeof unsubscribe === "function") sideTabUnsubscribers.push(unsubscribe);
          }
        }
        function startSideTabSync() {
          if (sideTabSyncTimer !== 0) return;
          subscribeSideTabSources();
          sideTabSyncTimer = window.setInterval(syncSideTabButton, SIDE_TAB_SYNC_MS);
        }
        function stopSideTabSync() {
          if (sideTabSyncTimer !== 0) {
            window.clearInterval(sideTabSyncTimer);
            sideTabSyncTimer = 0;
          }
          for (const unsubscribe of sideTabUnsubscribers) safe(() => unsubscribe());
          sideTabUnsubscribers = [];
        }
        function closeSideAnnotationsTab() {
          const service = safe(() => ctx.sidebarRight);
          const tab = findSideAnnotationsTab();
          const sessionId = currentSessionId();
          if (service === void 0 || service === null || tab === void 0) {
            warn("[selection-annotations] 右侧边栏没有可关闭的批注标签页");
            return;
          }
          try {
            if (typeof service.closeIn === "function" && typeof sessionId === "string" && sessionId !== "") {
              service.closeIn(sessionId, tab.id);
              return;
            }
            if (typeof service.close === "function") {
              service.close(tab.id);
              return;
            }
            warn("[selection-annotations] 右侧边栏没有可用的关闭方法");
          } catch (error) {
            warn("[selection-annotations] 关闭右侧批注标签页失败：", error);
          }
        }
        function focusSideAnnotationsTab(tab, expand) {
          const service = safe(() => ctx.sidebarRight);
          if (service === void 0 || service === null || tab === void 0) return;
          try {
            if (expand === true && typeof service.toggleExpanded === "function") service.toggleExpanded();
            if (typeof service.focus === "function") {
              service.focus(tab.id);
              return;
            }
            openSideAnnotationsTab();
          } catch (error) {
            warn("[selection-annotations] 聚焦右侧批注标签页失败：", error);
          }
        }
        function toggleSideAnnotationsTab() {
          const state = sideTabState();
          const action = sideTabAction(state);
          if (action === "close") closeSideAnnotationsTab();
          else if (action === "focus") focusSideAnnotationsTab(state.tab, false);
          else if (action === "reveal") focusSideAnnotationsTab(state.tab, true);
          else openSideAnnotationsTab();
          syncSideTabButton();
        }
        function openSideAnnotationsTab() {
          const service = safe(() => ctx.sidebarRight);
          if (service === void 0 || service === null) {
            warn("[selection-annotations] 当前环境没有右侧边栏，无法打开批注标签页");
            return;
          }
          const sessionId = currentSessionId();
          try {
            if (typeof service.openTabIn === "function" && typeof sessionId === "string" && sessionId !== "") {
              service.openTabIn(sessionId, SIDE_TAB_KIND, {});
              return;
            }
            if (typeof service.openTab === "function") {
              service.openTab(SIDE_TAB_KIND);
              return;
            }
            warn("[selection-annotations] 右侧边栏没有可用的打开方法");
          } catch (error) {
            warn("[selection-annotations] 打开右侧批注标签页失败：", error);
          }
        }
        function SideTabBody() {
          const hostRef = React.useRef(null);
          React.useEffect(() => {
            const host = hostRef.current;
            if (host === null) return void 0;
            const paint = () => renderSideTabInto(host);
            paint();
            const timer = window.setInterval(paint, 800);
            return () => window.clearInterval(timer);
          }, []);
          return h("div", { className: "sa-side-host", "data-sa-ui": "side", ref: hostRef });
        }
        function renderSideTabInto(host) {
          const signature = annotations.map((item) => `${item.id}:${item.number}:${item.note}:${(item.images ?? []).length}`).join("|");
          if (host.dataset.saSignature === signature && host.childNodes.length > 0) return;
          host.dataset.saSignature = signature;
          try {
            panelRenderer.renderSide(host);
          } catch (error) {
            host.textContent = `批注面板渲染失败：${error !== null && error !== void 0 && error.stack !== void 0 ? error.stack : String(error)}`;
            host.style.whiteSpace = "pre-wrap";
            host.style.padding = "10px 12px";
            host.style.color = "#ffb3b3";
            host.style.font = "12px/1.5 ui-monospace,monospace";
          }
        }
        function SideTabTitle() {
          return h("span", null, t("sideTab.title"));
        }
        ctx.effect(() => {
          const tabs = safe(() => ctx.sidebarRightTabs);
          if (tabs === void 0 || tabs === null || typeof tabs.register !== "function") return;
          try {
            return tabs.register({
              id: SIDE_TAB_ID,
              kind: SIDE_TAB_KIND,
              multiple: false,
              priority: "builtin",
              title: () => t("sideTab.title"),
              guide: []
            });
          } catch (error) {
            warn("[selection-annotations] 右侧批注标签页注册失败：", error);
            return void 0;
          }
        }, "selection-annotations: side tab type");
        ctx.effect(() => {
          if (ctx.slots === void 0) return;
          try {
            return ctx.slots.inject(
              "sidebar.right.pane.tab",
              () => ctx.slots.register(
                { name: "sidebar.right.pane.tab", key: SIDE_TAB_ID, locale: LOCALE_NS, inject: () => ({}) },
                SideTabBody
              )
            );
          } catch (error) {
            warn("[selection-annotations] 右侧批注标签页正文注册失败：", error);
            return void 0;
          }
        }, "selection-annotations: side tab body");
        ctx.effect(() => {
          if (ctx.slots === void 0) return;
          try {
            return ctx.slots.inject(
              "sidebar.right.pane.tab.title",
              () => ctx.slots.register(
                { name: "sidebar.right.pane.tab.title", key: SIDE_TAB_ID, locale: LOCALE_NS, inject: () => ({}) },
                SideTabTitle
              )
            );
          } catch (error) {
            warn("[selection-annotations] 右侧批注标签页标题注册失败：", error);
            return void 0;
          }
        }, "selection-annotations: side tab title");
        function webAnchor(rect) {
          if (rect === null || rect === void 0) return null;
          const webview = document.querySelector('webview[data-sidebar-browser-frame="webview"]') ?? document.querySelector("webview");
          const offset = safe(() => webview?.getBoundingClientRect()) ?? { left: 0, top: 0 };
          const left = offset.left + Number(rect.left ?? 0);
          const top = offset.top + Number(rect.top ?? 0);
          const width = Number(rect.width ?? 0);
          const height = Number(rect.height ?? 0);
          return {
            getBoundingClientRect: () => ({
              left,
              top,
              width,
              height,
              right: left + width,
              bottom: top + height
            })
          };
        }
        const panelRenderer = createPanelRenderer({
          t,
          closePanel: () => closePanel(),
          getAnnotations: () => annotations,
          clearAnnotations: () => clearAnnotations(),
          copyAll: (root) => copyAnnotationsToClipboard(annotations, root),
          pasteAnnotations: (root) => pasteAnnotationsFromClipboard(root),
          copyItem: (item, root) => copyAnnotationsToClipboard([item], root),
          moveAnnotation: (from, to) => moveAnnotation(from, to),
          openEditPopover: (id, head) => openEditPopover(id, head),
          jumpToQuote: (item, root) => jumpToQuote(item, void 0, root),
          removeAnnotation: (id) => removeAnnotation(id),
          sourceSummary: (item) => sourceSummary(item),
          openImageViewer: (url, name) => openImageViewer(url, name),
          imageSettingsRow: () => imageSettingsRow(),
          instructionSettingsRow: () => instructionSettingsRow(),
          fallbackSettingsRow: () => fallbackSettingsRow(),
          openSideTab: () => toggleSideAnnotationsTab(),
          isSideTabOpen: () => sideAnnotationsTabOpen(),
          noteView: noteViewOf,
          getHintText: (surface) => panelHintTextOf(surface)
        });
        const renderPanel = () => panelRenderer.render(panelEl);
        function settingsChevron() {
          const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
          svg.setAttribute("viewBox", "0 0 16 16");
          svg.setAttribute("width", "12");
          svg.setAttribute("height", "12");
          svg.setAttribute("aria-hidden", "true");
          const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
          path.setAttribute("d", "M6.2 3.6 10.7 8l-4.5 4.4");
          path.setAttribute("fill", "none");
          path.setAttribute("stroke", "currentColor");
          path.setAttribute("stroke-width", "1.8");
          path.setAttribute("stroke-linecap", "round");
          path.setAttribute("stroke-linejoin", "round");
          svg.appendChild(path);
          return svg;
        }
        function settingsSection(options) {
          let open = options.open === true;
          const box = el("div", "sa-settings");
          const head = el("div", "sa-settings-head");
          const toggle = button2("sa-link sa-settings-toggle", "", () => {
            open = !open;
            apply();
            if (typeof options.onOpenChange === "function") options.onOpenChange(open);
          });
          toggle.appendChild(settingsChevron());
          toggle.appendChild(el("span", "sa-settings-toggle-label", options.label));
          const status = el("span", "sa-hint", typeof options.getStatus === "function" ? options.getStatus() : "");
          head.appendChild(toggle);
          head.appendChild(status);
          let restore = null;
          if (typeof options.onRestore === "function") {
            restore = button2("sa-link sa-settings-restore", t("settings.restore"), () => {
              options.onRestore();
              status.textContent = typeof options.getStatus === "function" ? options.getStatus() : "";
            });
            if (options.restoreTitle !== void 0) restore.title = options.restoreTitle;
            head.appendChild(restore);
          }
          const wrap = el("div", "sa-settings-body");
          const inner = el("div", "sa-settings-inner");
          inner.append(...options.body);
          wrap.appendChild(inner);
          box.appendChild(head);
          box.appendChild(wrap);
          const apply = () => {
            toggle.setAttribute("aria-expanded", open ? "true" : "false");
            wrap.dataset.open = open ? "1" : "0";
            if (restore !== null) restore.hidden = !open;
          };
          apply();
          return {
            box,
            refreshStatus() {
              status.textContent = typeof options.getStatus === "function" ? options.getStatus() : "";
            }
          };
        }
        function imageSettingsRow() {
          const settings2 = imageSettingsOf();
          const compressRow = el("label", "sa-setting");
          const compress = document.createElement("input");
          compress.type = "checkbox";
          compress.checked = settings2.compress;
          compress.addEventListener("change", () => {
            imageSettingsOf().compress = compress.checked;
            persistImageSettings();
            section.refreshStatus();
          });
          compressRow.append(compress, document.createTextNode(t("settings.compress")));
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
            section.refreshStatus();
          });
          qualityRow.append(document.createTextNode(t("settings.quality")), quality, qualityText);
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
          const shotRow = el("label", "sa-setting");
          const shot = document.createElement("select");
          shot.className = "sa-setting-select";
          for (const [value, label] of [
            ["off", t("settings.webShotOff")],
            ["element", t("settings.webShotElement")],
            ["page", t("settings.webShotPage")]
          ]) {
            const option = document.createElement("option");
            option.value = value;
            option.textContent = label;
            shot.appendChild(option);
          }
          shot.value = settings2.webShot ?? "element";
          shot.addEventListener("change", () => {
            const next = shot.value === "off" || shot.value === "page" ? shot.value : "element";
            imageSettingsOf().webShot = next;
            persistImageSettings();
            section.refreshStatus();
          });
          shotRow.append(document.createTextNode(t("settings.webShot")), shot);
          const section = settingsSection({
            open: imageSettingsOpen,
            label: t("settings.imagesClosed"),
            getStatus: () => imageSettingsOf().compress ? t("settings.imagesOn", { n: Math.round(imageSettingsOf().quality * 100) }) : t("settings.imagesOff"),
            body: [compressRow, qualityRow, sizeRow, shotRow],
            onRestore: () => {
              const next = { ...DEFAULT_IMAGE_SETTINGS };
              const current = imageSettingsOf();
              current.compress = next.compress;
              current.quality = next.quality;
              current.minSize = next.minSize;
              current.webShot = next.webShot;
              persistImageSettings();
              shot.value = next.webShot;
              compress.checked = next.compress;
              quality.value = String(next.quality);
              qualityText.textContent = `${Math.round(next.quality * 100)}%`;
              size.value = String(next.minSize);
            },
            onOpenChange: (open) => {
              imageSettingsOpen = open;
            }
          });
          return section.box;
        }
        function instructionSettingsRow() {
          const area = document.createElement("textarea");
          area.className = "sa-setting-textarea";
          area.rows = 6;
          area.value = instructionOf();
          area.addEventListener("input", () => {
            persistInstructionSettings(area.value);
            section.refreshStatus();
          });
          area.addEventListener("blur", () => {
            if (area.value.trim() !== "") return;
            area.value = defaultInstruction();
            persistInstructionSettings(defaultInstruction());
            section.refreshStatus();
          });
          const section = settingsSection({
            open: instructionSettingsOpen,
            label: t("settings.instructionClosed"),
            getStatus: () => isDefaultInstruction(instructionOf()) ? t("settings.default") : t("settings.customized"),
            body: [area],
            restoreTitle: t("settings.instrHint"),
            onRestore: () => {
              persistInstructionSettings(defaultInstruction());
              area.value = instructionOf();
            },
            onOpenChange: (open) => {
              instructionSettingsOpen = open;
            }
          });
          return section.box;
        }
        function fallbackSettingsRow() {
          const area = document.createElement("textarea");
          area.className = "sa-setting-textarea sa-setting-textarea-compact";
          area.rows = 3;
          area.value = fallbackTextOf();
          area.setAttribute("aria-label", t("settings.fallbackLabel"));
          area.addEventListener("input", () => {
            persistFallbackText(area.value);
            section.refreshStatus();
          });
          area.addEventListener("blur", () => {
            if (area.value.trim() !== "") return;
            area.value = DEFAULT_FALLBACK_TEXT;
            persistFallbackText(DEFAULT_FALLBACK_TEXT);
            section.refreshStatus();
          });
          const section = settingsSection({
            open: fallbackSettingsOpen,
            label: t("settings.fallbackClosed"),
            getStatus: () => fallbackTextOf().trim() === DEFAULT_FALLBACK_TEXT.trim() ? t("settings.default") : t("settings.customized"),
            body: [area],
            restoreTitle: t("settings.fallbackHint"),
            onRestore: () => {
              persistFallbackText(DEFAULT_FALLBACK_TEXT);
              area.value = fallbackTextOf();
            },
            onOpenChange: (open) => {
              fallbackSettingsOpen = open;
            }
          });
          return section.box;
        }
        function refreshPanel() {
          renderPanel();
          if (panelOpen) positionPanel();
          for (const host of document.querySelectorAll('[data-sa-ui="side"]')) renderSideTabInto(host);
        }
        function openPanel(anchor) {
          panelOpen = true;
          panelAnchor = anchor;
          panelAnchorRect = null;
          cancelChipTimers();
          if (panelHideTimer !== 0) {
            window.clearTimeout(panelHideTimer);
            panelHideTimer = 0;
          }
          panelRoot.style.display = "";
          panelRoot.dataset.open = "0";
          sideTabPaintedOpen = sideAnnotationsTabOpen();
          renderPanel();
          positionPanel();
          void panelRoot.offsetHeight;
          panelRoot.dataset.open = "1";
          startSideTabSync();
          emit();
        }
        function closePanel() {
          if (!panelOpen) return;
          panelOpen = false;
          panelAnchor = null;
          panelAnchorRect = null;
          stopSideTabSync();
          sideTabPaintedOpen = null;
          cancelChipTimers();
          panelOpenedByHover = false;
          panelHovered = false;
          panelRoot.dataset.open = "0";
          if (panelHideTimer !== 0) window.clearTimeout(panelHideTimer);
          panelHideTimer = window.setTimeout(() => {
            panelHideTimer = 0;
            if (!panelOpen) panelRoot.style.display = "none";
          }, 180);
          emit();
        }
        panelRoot.addEventListener("mouseenter", () => {
          panelHovered = true;
          if (chipHoverCloseTimer !== 0) {
            window.clearTimeout(chipHoverCloseTimer);
            chipHoverCloseTimer = 0;
          }
        });
        panelRoot.addEventListener("mouseleave", () => {
          panelHovered = false;
          scheduleChipHoverClose();
        });
        const onPanelOutsidePointerDown = (event) => {
          if (!panelOpen) return;
          const target = elementOf2(event.target);
          if (target === null) return;
          if (target.closest('[data-sa-ui="panel"]') !== null) return;
          if (target.closest('[data-sa-ui="popover"]') !== null) return;
          if (target.closest(".sa-chip") !== null) return;
          closePanel();
        };
        document.addEventListener("pointerdown", onPanelOutsidePointerDown, true);
        const onPanelEscapeKeyDown = (event) => {
          if (event.key === "Escape") closePanel();
        };
        document.addEventListener("keydown", onPanelEscapeKeyDown);
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
              className: `sa-chip${count > 0 ? " sa-chip-has" : ""}${local.open ? " sa-chip-open" : ""}`,
              type: "button",
              title: count === 0 ? t("chip.emptyTitle") : t("chip.title"),
              onMouseEnter: (event) => scheduleHoverOpen(event.currentTarget),
              onMouseLeave: () => scheduleChipHoverClose(),
              onClick: (event) => {
                cancelChipTimers();
                if (panelOpen && !panelOpenedByHover) {
                  closePanel();
                  return;
                }
                panelOpenedByHover = false;
                if (!panelOpen) openPanel(event.currentTarget);
              }
            },
            h(
              "svg",
              {
                width: 14,
                height: 14,
                viewBox: "0 0 16 16",
                fill: "none",
                stroke: "currentColor",
                strokeWidth: 1.4,
                strokeLinecap: "round",
                strokeLinejoin: "round",
                "aria-hidden": "true"
              },
              h("path", { d: "M2.5 3.5h11v7h-6l-3 2.5v-2.5h-2z" })
            ),
            h("span", null, count === 0 ? t("chip.label") : t("chip.count", { n: count })),
            h(
              "svg",
              {
                className: "sa-chip-chevron",
                width: 12,
                height: 12,
                viewBox: "0 0 16 16",
                fill: "none",
                stroke: "currentColor",
                strokeWidth: 1.6,
                strokeLinecap: "round",
                strokeLinejoin: "round",
                "aria-hidden": "true"
              },
              h("path", { d: "M4 6.5 8 10.5 12 6.5" })
            )
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
          const onUnload = () => {
            flushPopAutoSave();
            saveDraft(annotationsSession);
          };
          window.addEventListener("beforeunload", onUnload);
          window.addEventListener("pagehide", onUnload);
          return () => {
            flushPopAutoSave();
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
            stopSideTabSync();
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
        function applyRewind(sessionId, mark) {
          if (sessionId !== currentSessionId()) return;
          const turn = Number.isFinite(mark?.turn) ? Number(mark.turn) : null;
          if (turn === null || turn < 1) {
            scrollTrace.push({ t: Date.now(), kind: "rewind-skip", session: sessionId, turn: turn ?? null });
            return;
          }
          const rewindAt = Number.isFinite(mark?.at) ? Number(mark.at) : null;
          const table = loadSent(sessionId);
          const now = Date.now();
          let marked = 0;
          for (const record of table.values()) {
            if (!Number.isFinite(record?.turn) || record.turn < turn) continue;
            if (rewindAt !== null && !(Number(record.savedAt) <= rewindAt)) continue;
            record.rewoundAt = now;
            record.rewoundTurn = turn;
            marked += 1;
          }
          if (marked > 0) {
            saveSent(sessionId, table);
            markConversationDirty();
          }
          scrollTrace.push({ t: now, kind: "rewind-mark", session: sessionId, turn, marked });
          scheduleRepaint("poll");
        }
        ctx.effect(() => {
          const onPaste = (event) => {
            const target = elementOf2(event.target);
            if (target === null) return;
            const editable = target.closest('[contenteditable="true"], [contenteditable="plaintext-only"], textarea');
            if (editable === null || editable.closest("[data-composer-card]") === null) return;
            let text = "";
            try {
              text = event.clipboardData?.getData("text/plain") ?? "";
            } catch {
              return;
            }
            const items = parseAnnotations(text);
            if (items === void 0) return;
            event.preventDefault();
            event.stopPropagation();
            importAnnotations(items);
          };
          document.addEventListener("paste", onPaste, true);
          return () => document.removeEventListener("paste", onPaste, true);
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
                  const mark = remote !== null && remote !== void 0 ? remote.rewind : void 0;
                  if (mark !== null && mark !== void 0 && Number.isFinite(mark.at) && rewindHandled.get(sessionId) !== mark.at) {
                    rewindHandled.set(sessionId, mark.at);
                    applyRewind(sessionId, mark);
                  }
                  if (remote !== null && remote !== void 0 && absorbRemoteReplies(sessionId, remote)) {
                    markConversationDirty();
                    scheduleRepaint("poll");
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
          const UI_CONTROL_SELECTOR = [
            "button",
            "a[href]",
            "input",
            "textarea",
            "select",
            '[contenteditable="true"]',
            ".sa-section-head",
            ".sa-drag-handle",
            '[data-sa-ui="popover"]',
            '[data-sa-ui="panel"]',
            '[data-sa-ui="toolbar"]',
            '[data-sa-ui="menu"]',
            '[data-sa-ui="suggest"]',
            '[data-sa-ui="ghost"]'
          ].join(", ");
          let pointerDownInUi = false;
          const onSelectPointerDown = (event) => {
            const target = elementOf2(event.target);
            pointerSelecting = true;
            pointerDownInUi = target !== null && target.closest(UI_CONTROL_SELECTOR) !== null;
            if (pointerDownInUi) return;
            hideToolbar();
          };
          document.addEventListener("pointerdown", onSelectPointerDown, true);
          const onPointerUp = (event) => {
            pointerSelecting = false;
            flushPendingRepaint();
            const target = elementOf2(event.target);
            const fromUi = pointerDownInUi;
            pointerDownInUi = false;
            if (fromUi && target !== null && target.closest("[data-sa-ui]") !== null) return;
            if (target !== null && target.closest('[data-sa-ui="toolbar"], [data-sa-ui="menu"], [data-sa-ui="suggest"]') !== null) return;
            if (target !== null && target.closest('[data-sa-ui="popover"], [data-sa-ui="ghost"]') !== null) return;
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
            if (popResize !== null && popover.dataset.open === "1") {
              resizePopoverFromPointer(event.clientX, event.clientY);
              return;
            }
            if (popDrag === null || popover.dataset.open !== "1") return;
            const left = Math.max(8, Math.min(event.clientX - popDrag.dx, window.innerWidth - popDrag.width - 8));
            const top = Math.max(8, Math.min(event.clientY - popDrag.dy, window.innerHeight - popDrag.height - 8));
            popover.style.left = `${left}px`;
            popover.style.top = `${top}px`;
          };
          const onPopDragUp = () => {
            if (popResize !== null) {
              popResize = null;
              popover.classList.remove("sa-pop-resizing");
              const sized = popover.getBoundingClientRect();
              if (sized.width > 0 && sized.height > 0 && popoverMode !== "sent") {
                savePopoverSize(sized.width, sized.height);
              }
            }
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
            if (target !== null && target.closest('[data-sa-ui="popover"]') !== null) return;
            lowerPopover();
          };
          const fillFallbackIfSending = () => {
            if (annotations.length === 0) return;
            const shell = inputShell();
            if (shell === void 0) return;
            ensureFallbackPrompt(shell);
            armSendConsumeCheck();
          };
          const onDocumentClick = (event) => {
            const target = elementOf2(event.target);
            if (target === null) return;
            const button3 = target.closest("button");
            if (button3 === null) return;
            const card = button3.closest("[data-composer-card]");
            if (card === null) return;
            const label = button3.getAttribute("aria-label");
            if (typeof label !== "string" || !SEND_LABEL_RE.test(label)) return;
            if (holdSendForGate(event, button3, card)) return;
            fillFallbackIfSending();
          };
          const onDocumentKeydown = (event) => {
            if (event.key === "Escape") closeContextMenu();
            if (event.key !== "Enter" || event.shiftKey || event.isComposing || event.altKey || event.ctrlKey || event.metaKey) return;
            const target = elementOf2(event.target);
            if (target === null) return;
            const card = target.closest("[data-composer-card]");
            if (card === null) return;
            if (target.closest('[contenteditable="true"], textarea, input') === null) return;
            if (holdSendForGate(event, null, card)) return;
            fillFallbackIfSending();
          };
          document.addEventListener("pointerdown", onMenuPointerDown, true);
          document.addEventListener("click", onDocumentClick, true);
          document.addEventListener("keydown", onDocumentKeydown, true);
          let resizeObserver = null;
          let resizeTargets = /* @__PURE__ */ new Set();
          const syncResizeTargets = () => {
            if (typeof ResizeObserver !== "function") return;
            if (resizeObserver === null) {
              resizeObserver = new ResizeObserver(() => {
                highlightDirty = true;
                scheduleRepaint("mutation");
              });
            }
            const next = /* @__PURE__ */ new Set();
            const observe = (element) => {
              if (element === null || element === void 0 || next.has(element)) return;
              next.add(element);
              safe(() => resizeObserver.observe(element));
            };
            for (const element of document.querySelectorAll("[data-chat-flow]")) {
              observe(element);
              for (const container of scrollAncestorsOf(element)) observe(container);
            }
            for (const element of resizeTargets) {
              if (!next.has(element)) safe(() => resizeObserver.unobserve(element));
            }
            resizeTargets = next;
          };
          const onViewport = (event) => {
            if (event.type === "scroll") {
              const origin = elementOf2(event.target);
              if (origin !== null && origin.closest("[data-sa-ui]") !== null) return;
            }
            highlightDirty = true;
            scheduleRepaint("viewport");
            closeContextMenu();
            if (popover.dataset.open === "1" && popoverRect !== null && popover.dataset.dragged !== "1") placePopover(popoverRect);
            if (event.type === "resize") {
              markViewportResize();
              clampPanelToViewport();
              clampSizedPopoverToViewport();
              syncResizeTargets();
            }
          };
          window.addEventListener("scroll", onViewport, true);
          window.addEventListener("resize", onViewport);
          const observer = new MutationObserver((records) => {
            for (const record of records) {
              const target = elementOf2(record.target);
              if (target !== null && target.closest("[data-sa-ui]") !== null) continue;
              if (pendingSent.length > 0) safe(() => scanSentMessages());
              if (conversationNeedsRender()) {
                syncResizeTargets();
                scheduleRepaint("mutation");
              }
              return;
            }
          });
          observer.observe(document.body, { childList: true, subtree: true, characterData: true });
          scheduleRepaint("mount");
          safe(() => watchConversationScroll());
          syncResizeTargets();
          return () => {
            scrollTrace.dispose();
            markdown.dispose();
            document.removeEventListener("selectionchange", onSelectionChange);
            document.removeEventListener("pointerdown", onSelectPointerDown, true);
            document.removeEventListener("pointerup", onPointerUp, true);
            document.removeEventListener("pointerup", onPopDragUp, true);
            document.removeEventListener("pointermove", onPointerMove, true);
            document.removeEventListener("contextmenu", onContextMenu, true);
            document.removeEventListener("pointerdown", onMenuPointerDown, true);
            document.removeEventListener("click", onDocumentClick, true);
            document.removeEventListener("keydown", onDocumentKeydown, true);
            document.removeEventListener("mousemove", onHoverMoveDocument, true);
            document.removeEventListener("pointerdown", onPopoverOutsidePointerDown, true);
            document.removeEventListener("keydown", onPopoverEscapeKeyDown);
            document.removeEventListener("pointerdown", onPanelOutsidePointerDown, true);
            document.removeEventListener("keydown", onPanelEscapeKeyDown);
            window.removeEventListener("scroll", onViewport, true);
            window.removeEventListener("resize", onViewport);
            if (resizeObserver !== null) resizeObserver.disconnect();
            observer.disconnect();
          };
        });
        ctx.effect(() => {
          const onTurnProcessClick = (event) => {
            const target = elementOf2(event.target);
            if (target === null) return;
            const button3 = target.closest("[data-turn-process]");
            const groupButton = target.closest("button[aria-expanded]");
            const groupRoot = groupButton === null ? null : groupButton.closest("[data-step-process]");
            const groupHeader = groupRoot !== null && groupRoot.firstElementChild?.contains(groupButton) === true ? groupButton : null;
            if (button3 === null && groupHeader === null) return;
            highlightDirty = true;
            scheduleRepaint("mutation");
            if (button3 !== null) window.requestAnimationFrame(() => syncReplyCollapse(button3));
          };
          document.addEventListener("click", onTurnProcessClick, true);
          return () => {
            document.removeEventListener("click", onTurnProcessClick, true);
            previewBridge.dispose();
            webPicker.dispose();
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
          const [rejectText, setRejectText] = React.useState(() => rejectTextOf());
          const [fallbackText, setFallbackText] = React.useState(() => fallbackTextOf());
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
            ),
            card(
              "reject",
              t("settings.rejectLabel"),
              t("settings.rejectHint"),
              h("input", {
                className: "sa-setting-input",
                "aria-label": t("settings.rejectLabel"),
                value: rejectText,
                onChange: (event) => {
                  setRejectText(event.target.value);
                  persistRejectText(event.target.value);
                }
              }),
              h(
                "button",
                {
                  type: "button",
                  className: "sa-link",
                  onClick: () => {
                    const next = DEFAULT_REJECT_TEXT;
                    setRejectText(next);
                    persistRejectText(next);
                  }
                },
                t("settings.restore")
              )
            ),
            card(
              "fallback",
              t("settings.fallbackLabel"),
              t("settings.fallbackHint"),
              h("textarea", {
                className: "sa-setting-textarea",
                "aria-label": t("settings.fallbackLabel"),
                rows: 3,
                value: fallbackText,
                onChange: (event) => {
                  setFallbackText(event.target.value);
                  persistFallbackText(event.target.value);
                }
              }),
              h(
                "button",
                {
                  type: "button",
                  className: "sa-link",
                  onClick: () => {
                    const next = DEFAULT_FALLBACK_TEXT;
                    setFallbackText(next);
                    persistFallbackText(next);
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
              { name: "plugins.bundle.config", key: "dsh-selection-annotations", inject: () => ({}) },
              AnnotationInstructionSettings
            )
          );
        } catch (error) {
          console.error("[selection-annotations] 插件详情页设置区注册失败：", error);
        }
        function SelectionAnnotationsSettings() {
          const image = imageSettingsOf();
          const shot = image.webShot === "page" ? t("settings.webShotPage") : image.webShot === "off" ? t("settings.webShotOff") : t("settings.webShotElement");
          const compression = image.compress ? t("settings.imagesOn", { n: Math.round(image.quality * 100) }) : t("settings.imagesOff");
          const card = (key, title, hint, value) => h(
            "section",
            { className: "sa-settings-card", key },
            h(
              "div",
              { className: "sa-settings-card-head" },
              h("h3", { className: "sa-settings-card-title" }, title),
              hint ? h("p", { className: "sa-hint" }, hint) : null
            ),
            h("div", { className: "sa-setting-readonly" }, value)
          );
          return h(
            "div",
            { className: "sa-settings-page" },
            h("p", { className: "sa-hint" }, t("settings.section.hint")),
            card("instruction", t("settings.pageTitle"), t("settings.pageHint"), instructionOf()),
            card("adopt", t("settings.adoptLabel"), null, adoptTextOf()),
            card("reject", t("settings.rejectLabel"), null, rejectTextOf()),
            card(
              "images",
              t("settings.section.imagesTitle"),
              t("settings.section.imagesHint"),
              `${t("settings.section.imagesSent")}
${t("settings.section.imagesDetail", { shot, compression })}`
            )
          );
        }
        try {
          ctx.slots.inject(
            "settings.section",
            () => ctx.slots.register(
              { name: "settings.section", id: "selection-annotations", order: 62, label: () => t("settings.section.title") },
              SelectionAnnotationsSettings
            )
          );
        } catch (error) {
          console.error("[selection-annotations] 设置页注册失败：", error);
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
          sentStats: () => sentRenderStats,
          repaint,
          remove: removeAnnotation,
          clear: clearAnnotations,
          update: (id, note) => updateAnnotation(id, note),
          add: (input) => addAnnotation(input),
          fillFallback: () => {
            const shell = inputShell();
            if (shell !== void 0) ensureFallbackPrompt(shell);
          },
          /** 控制台开关：`__dshSelectionAnnotations.traceScroll(false)` 停掉滚动追踪。*/
          traceScroll: (on) => scrollTrace.setEnabled(on),
          _internals: { buildPayload, payloadSource, describeSource, captureSource, matchInRoot, rangeFromOffsets: rangeFromOffsets2, offsetRange, anchorRoot, locateRange, locateInSource, lineOfOffset, resolveSourcePosition, refineSourcePosition, adoptSession, loadDraft, saveDraft, loadSent, saveSent, recordSent, scanSentMessages, buildSentCard, renderSentCards, renderReplySections, buildReplySection, mergeReplyBatches, absorbRemoteReplies, shouldDiscardEmpty, loadImageSettings, syncReplyCollapse, sentCardAnchor, turnOfRow, placeToolbar, createPayloadHidingRule, copyAnnotationsToClipboard, panelHintTextOf, openPanel, closePanel, clampPanelToViewport, buildSegments, segmentsOf, fitSegmentsToQuote, matchInRootNormalized, locateSegmentsOf }
        };
      }
    };
    return plugin;
  }

  // src/entry.js
  window.__ModuleLoader__.load({
    id: "dsh-selection-annotations",
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
