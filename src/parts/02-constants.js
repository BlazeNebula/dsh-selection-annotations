    const DRAFT_MAX_BYTES = 3.5 * 1024 * 1024
    /** 鼠标停在已批注原文上多久打开编辑框。*/
    const HOVER_OPEN_DELAY_MS = 500
    /** 选区稳定后再弹工具条，避免拖选过程中抖动。*/
    const SETTLE_MS = 220
    /** 批注集合变化后合并上传，避免每敲一个字都发一次请求。*/
    const UPLOAD_DEBOUNCE_MS = 450
    /** 等草稿附件上传就绪的上限；超时就本次不挂，绝不制造发送失败。*/
    const UPLOAD_READY_TIMEOUT_MS = 10000
    /** 装饰重绘合并窗口。*/
    const REPAINT_MS = 120
    /** 拉取式消费检测的间隔：不依赖 composer 是否发布通知。*/
    const CONSUME_POLL_MS = 1000
    /** 输入态说「附件没了」之后，隔多久向运行时求证（提交可能只是暂时移走）。*/
    const CONSUME_CONFIRM_MS = 400
    /** 读源文件求行号的超时；超时就退回渲染坐标，不拖住保存。*/
    const SOURCE_LOOKUP_TIMEOUT_MS = 600
    /** 认领「上一轮遗留的孤儿批注附件」的间隔。*/
    const ORPHAN_SWEEP_MS = 1500
    /** 首次上传最多为在途的位置精修等多也——精修通常几十毫秒，这只是个上限。*/
    const REFINE_WAIT_MS = 1200
    /** 发出后仍可能被运行时 restore 回来的孤儿附件，要盯多久。 */
    const STRAY_GUARD_MS = 120000

