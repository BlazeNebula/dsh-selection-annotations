export const DRAFT_MAX_BYTES = 3.5 * 1024 * 1024
    /** 鼠标停在已批注原文上多久打开编辑框。*/
export const HOVER_OPEN_DELAY_MS = 500
    /** 选区稳定后再弹工具条，避免拖选过程中抖动。*/
export const SETTLE_MS = 220
    /** 批注集合变化后合并上传，避免每敲一个字都发一次请求。*/
export const UPLOAD_DEBOUNCE_MS = 450
    /** 编辑弹层里改一个字就写盘会太频繁：停手 300ms 再存，崩溃时最多丢这一段。*/
export const POP_AUTO_SAVE_MS = 300
    /** 「跳到出处」的高亮闪现时长，到点自动撤掉，不留在正文里。*/
export const JUMP_FLASH_MS = 2000
    /** 轮次导航按钮点下去后，等目标行挂载出来的上限；超时就提示没加载。*/
export const JUMP_NAV_TIMEOUT_MS = 3000
    /** 等挂载期间的重试间隔；按宿主重绘节奏给两帧左右。*/
export const JUMP_NAV_POLL_MS = 120
    /** 等草稿附件上传就绪的上限；超时就本次不挂，绝不制造发送失败。*/
export const UPLOAD_READY_TIMEOUT_MS = 10000
    /** 装饰重绘合并窗口。*/
export const REPAINT_MS = 120
    /** 拉取式消费检测的间隔：不依赖 composer 是否发布通知。*/
export const CONSUME_POLL_MS = 1000
    /** 输入态说「附件没了」之后，隔多久向运行时求证（提交可能只是暂时移走）。*/
export const CONSUME_CONFIRM_MS = 400
    /** 读源文件求行号的超时；超时就退回渲染坐标，不拖住保存。*/
export const SOURCE_LOOKUP_TIMEOUT_MS = 600
    /** 认领「上一轮遗留的孤儿批注附件」的间隔。*/
export const ORPHAN_SWEEP_MS = 1500
    /** 首次上传最多为在途的位置精修等多也——精修通常几十毫秒，这只是个上限。*/
export const REFINE_WAIT_MS = 1200
    /** 发出后仍可能被运行时 restore 回来的孤儿附件，要盯多久。 */
export const STRAY_GUARD_MS = 120000

