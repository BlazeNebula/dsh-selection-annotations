        /* ------------------------------------------------------------------ 状态*/

        /** 当前会话的批注集合；编号与顺序就是发给模型时的编号。*/
        let annotations = []
        /** 当前挂在草稿上的批注附件 receipt；发送后被 composer 消费。 */
        let draftIds = []
        let syncing = false
        let syncTimer = null
        let repaintTimer = null
        let settleTimer = null
        let avoidTimer = 0
        let pendingSelection = null
        /** 由槽位标准 props 注入的 composer 动作与当前会话 id —— 比自行解析 scope 更稳。 */
        let latestInputActions = undefined
        let latestSessionId = undefined
        /** 批注集合归属的会话；切换会话时按会话换入换出草稿，避免批注跑到别的会话里。*/
        let annotationsSession = undefined
        /** 未提交批注草稿的本地存储前缀：按会话分键，切走再回来、刷新页面都还能接着改。*/
        const DRAFT_STORAGE_PREFIX = 'dsh-selection-annotations:draft:'
        /** 最多保留多少个会话的草稿；超出按保存时间淘汰最旧的。*/
        const DRAFT_MAX_SESSIONS = 24
        /** 单个会话最多保存多少条草稿批注，避免异常数据把存储写满。*/
        const DRAFT_MAX_ITEMS = 200
        /** 已载入会话的草稿（sessionId → 可序列化条目），切换会话时先在内存里换入换出。 */
        const draftSessions = new Map()
        /** 已提交批注的本地台账前缀：按会话分键，用消息锚点键索引，供对话历史回看。*/
        const SENT_STORAGE_PREFIX = 'dsh-selection-annotations:sent:'
        /** 每个会话最多保留多少条已提交记录。*/
        const SENT_MAX_ENTRIES = 120
        /** 已提交台账的体积预算：超出时先丢图片，文字永远保留。*/
        const SENT_MAX_BYTES = 2 * 1024 * 1024
        /** 轮询宿主答复的间隔：模型答复通常紧跟发送，6 秒足够且只请求本机路由。*/
        const REPLY_POLL_MS = 6000
        /** 已提交批注台账（sessionId → Map(anchorKey → 记录)）。 */
        const sentBySession = new Map()
        /** 刚随消息发出、还在等对应消息行出现的负载。*/
        let pendingSent = []
        /** 附件实际挂到哪个会话的输入外壳：记账沿用它，避免发送后重算会话 id 时串到别的会话。*/
        let attachedSessionId = undefined
        /** 最后一次成功挂附件时页面上已有的批注消息锚点键；发送后据此区分新消息与旧历史。*/
        let lastAnnotatedKeys = new Set()
        /** 图片设置缓存；第一次用到时从本地存储读。*/
        let imageSettings
        /** 批注指令缓存；第一次用到时从本地存储读。*/
        let instructionSettings
        /** 批注附件是否已被 composer 确认挂上（用来区分「还没同步」与「已被发送消费」）。*/
        let draftSeen = false
        /** 本插件正在自己摘/挂附件时为真：这段发布不能被当成「消息已发送」。*/
        let maintaining = false
        let watchUnsub = undefined
        let watchTimer = null
        let consumeTimer = null
        /** 在途的位置精修；上传前会等它，让首次上传就带上最终结果。*/
        let pendingRefine = undefined
        /** 定期认领孤儿附件的计时器。*/
        let orphanTimer = null
        /** 只打一次「经哪条路读到原文」，避免刷屏。*/
        /** 已随消息发出、但运行时可能稍后 restore 回来的草稿附件 id → 守卫截止时间。 */
        const strayIds = new Map()

        const listeners = new Set()
        const subscribe = (fn) => {
          listeners.add(fn)
          return () => {
            listeners.delete(fn)
          }
        }
        const snapshot = () => annotations
        function emit() {
          for (const fn of [...listeners]) {
            try {
              fn()
            } catch (err) {
              warn('[selection-annotations] 订阅回调失败：', err)
            }
          }
        }

        /* ------------------------------------------------------------------ 基础工具 */

        const safe = (fn) => {
          try {
            return fn()
          } catch {
            return undefined
          }
        }

