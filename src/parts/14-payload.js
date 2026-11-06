        function describeSource(source) {
          if (source === null || source === undefined) return t('source.unknown')
          if (source.kind === 'message') {
            const role = source.flowKind === 'user' || source.flowKind === 'steering' ? t('source.user') : t('source.assistant')
            return t('source.message', { role, anchor: source.anchorKey || '-' })
          }
          if (source.kind === 'file') {
            const path = source.path ?? t('source.pathUnknown')
            let where = ''
            if (Number.isFinite(source.lineStart)) {
              where =
                Number.isFinite(source.lineEnd) && source.lineEnd !== source.lineStart
                  ? t('source.lineRange', { a: source.lineStart, b: source.lineEnd })
                  : t('source.lineSingle', { n: source.lineStart })
            }
            return t('source.file', { path, where })
          }
          if (source.kind === 'reply') {
            const fieldLabel =
              { quote: t('label.quote'), note: t('label.note'), reason: t('label.reason'), next: t('label.next') }[source.field] ??
              t('source.replyField')
            const anchor = `reply:${Number.isFinite(source.batchAt) ? source.batchAt : '-'}:${
              Number.isFinite(source.index) ? source.index : '-'
            }:${source.field || 'item'}`
            const span =
              Number.isFinite(source.charStart) && Number.isFinite(source.charEnd)
                ? t('source.span', { a: source.charStart, b: source.charEnd })
                : ''
            return t('source.reply', {
              index: Number.isFinite(source.index) ? source.index : '-',
              field: fieldLabel,
              anchor,
              span,
            })
          }
          if (source.kind === 'sent') {
            const fieldLabel = { quote: t('label.quote'), note: t('label.note') }[source.field] ?? t('source.sentField')
            const anchor = `sent:${source.anchorKey || '-'}:${
              Number.isFinite(source.index) ? source.index : '-'
            }:${source.field || 'item'}`
            const span =
              Number.isFinite(source.charStart) && Number.isFinite(source.charEnd)
                ? t('source.span', { a: source.charStart, b: source.charEnd })
                : ''
            return t('source.sent', {
              index: Number.isFinite(source.index) ? source.index : '-',
              field: fieldLabel,
              anchor,
              span,
            })
          }
          return t('source.selection')
        }

        /**
         * 批注负载：一个自描述的 JSON 数据块。
         *
         * 用 JSON 而不是 Markdown，是因为位置是要被程序化使用的东西 —— 行号、字符区间、
         * 锚点锚——结构化字段才不会在自然语言里糊掉。
         */
        function buildPayload(items) {
          // 图片在消息里是独立的 image 块，顺序即挂载顺序；这里给每条批注记住它在本次消息里的 1 基序号。
          let imageOrder = 0
          const annotations = items.map((item) => {
            const entry = {
              index: item.number,
              quote: item.quote,
              note: item.note,
              source: payloadSource(item.source),
            }
            const images = Array.isArray(item.images) ? item.images : []
            if (images.length > 0) {
              entry.images = images.map((image) => {
                imageOrder += 1
                return { order: imageOrder, name: image.name }
              })
            }
            return entry
          })
          return JSON.stringify(
            {
              kind: PAYLOAD_KIND,
              version: 1,
              instruction: instructionOf(),
              count: annotations.length,
              annotations,
            },
            null,
            2,
          )
        }

        /** 只把有意义的字段放进 JSON，避免一堆 null 噪声。 */
        function payloadSource(source) {
          const out = { kind: source?.kind ?? 'dom' }
          if (source?.kind === 'message') {
            out.role = source.role ?? (source.flowKind === 'user' || source.flowKind === 'steering' ? 'user' : 'assistant')
            if (typeof source.anchorKey === 'string' && source.anchorKey !== '') out.anchorKey = source.anchorKey
            if (typeof source.flowKind === 'string' && source.flowKind !== '') out.flowKind = source.flowKind
          } else if (source?.kind === 'file') {
            if (typeof source.path === 'string' && source.path !== '') out.path = source.path
            if (Number.isFinite(source.lineStart)) out.lineStart = source.lineStart
            if (Number.isFinite(source.lineEnd)) out.lineEnd = source.lineEnd
          } else if (source?.kind === 'reply') {
            if (Number.isFinite(source.batchAt)) out.batchAt = source.batchAt
            if (Number.isFinite(source.index)) out.index = source.index
            if (typeof source.field === 'string' && source.field !== '') out.field = source.field
          } else if (source?.kind === 'sent') {
            if (typeof source.anchorKey === 'string' && source.anchorKey !== '') out.anchorKey = source.anchorKey
            if (Number.isFinite(source.index)) out.index = source.index
            if (typeof source.field === 'string' && source.field !== '') out.field = source.field
          }
          if (out.kind === 'file' || out.kind === 'message' || out.kind === 'reply' || out.kind === 'sent') {
            out.textOrigin = source?.textOrigin === 'source' ? 'source' : 'rendered'
          }
          if (Number.isFinite(source?.charStart)) out.charStart = source.charStart
          if (Number.isFinite(source?.charEnd)) out.charEnd = source.charEnd
          return out
        }

        function scheduleSync() {
          if (syncTimer !== null) window.clearTimeout(syncTimer)
          syncTimer = window.setTimeout(() => {
            syncTimer = null
            void syncAttachment()
          }, UPLOAD_DEBOUNCE_MS)
        }

        /** 摘掉一批草稿附件：既要从输入态移除，也要让运行时释放（否则会漏掉后台任务）。*/
        function releaseDrafts(ids, shell) {
          if (ids.length === 0) return
          const previousGuard = maintaining
          maintaining = true
          try {
            for (const id of ids) safe(() => shell.removeAttachment(id))
            const conversation = ctx.conversation
            for (const id of ids) safe(() => conversation?.releaseDraftAttachment?.(id))
          } finally {
            maintaining = previousGuard
          }
        }

        /**
         * 等运行时把草稿附件传完。
         *
         * 这一步不能省：`sendSession` 在 `fileUploads[id].status !== 'ready'` 时直接抛
         * 「one or more files have not finished uploading」，会让整条消息发送失败。
         * 所以只在 ready 之后才把附件挂进输入态 —— 宁可晚几百毫秒，也绝不制造发送失败。
         * @returns 是否全部就绪。
         */
        function waitForUploads(conversation, ids, timeoutMs) {
          const store = conversation?.fileUploads
          if (store === undefined || typeof store.subscribe !== 'function' || typeof store.getSnapshot !== 'function') {
            return Promise.resolve(true)
          }
          return new Promise((resolve) => {
            let settled = false
            let unsubscribe
            let timer = null
            const finish = (value) => {
              if (settled) return
              settled = true
              if (typeof unsubscribe === 'function') safe(unsubscribe)
              if (timer !== null) window.clearTimeout(timer)
              resolve(value)
            }
            const check = () => {
              if (settled) return
              const snapshot = safe(() => store.getSnapshot())
              if (snapshot === undefined || snapshot === null) return
              let pending = 0
              for (const id of ids) {
                const entry = snapshot[id]
                if (entry === undefined) {
                  pending += 1
                  continue
                }
                if (entry.status === 'error') {
                  finish(false)
                  return
                }
                if (entry.status !== 'ready') pending += 1
              }
              if (pending === 0) finish(true)
            }
            const result = safe(() => store.subscribe(() => check()))
            unsubscribe = typeof result === 'function' ? result : undefined
            timer = window.setTimeout(() => finish(false), timeoutMs)
            if (settled) {
              if (typeof unsubscribe === 'function') safe(unsubscribe)
              window.clearTimeout(timer)
            }
            check()
          })
        }

        /** 运行时是否提供了这条官方附件链路（拖拖粘贴附件走的就是它）。*/
        function draftAttachmentSupported(conversation, shell) {
          return (
            typeof conversation?.createDrafts === 'function' &&
            typeof shell?.addFiles === 'function' &&
            typeof shell?.removeAttachment === 'function'
          )
        }

        /**
         * 把批注集合变成一不*原生草稿附件**随消息提交。
         *
         * 走运行时自己的`createDrafts` + 输入外壳的`addFiles` ——与拖拖粘贴附件完全同一条
         * 链路（`dsh-client-ui-conversation` 的 drop 处理器就是这么用的）。这样得到的那条用户
         * 消息 content 天然是 `[{type:'text'}, {type:'file'}]` 两个独立块，而不是把批注文本拼进正文。
         *
         * 反例（曾经踩过）：只调 `addAttachments(ids)` 是不够的 —— 那只往输入态塞 id，运行时
         * 私有的 `draftAttachments` 里没有对应条目，发送时 `resolveDraftAttachments` 解析不到，
         * 结果是批注根本进不了消息（或直接抛错）。必须让运行时自己登记草稿附件。
         */
        async function syncAttachment() {
          if (syncing) {
            scheduleSync()
            return
          }
          syncing = true
          const previous = draftIds
          try {
            // 等一次在途的位置精修：它通常几十毫秒就结束，这样**首次**上传就带上原文坐标与
            // 诊断；否则手快的用户发出的会是精修之前那一份（实测踩过）。
            if (pendingRefine !== undefined) {
              await Promise.race([
                pendingRefine,
                new Promise((resolve) => {
                  window.setTimeout(resolve, REFINE_WAIT_MS)
                }),
              ])
            }
            const shell = inputShell()
            const conversation = ctx.conversation
            const sessionId = currentSessionId()

            if (shell === undefined || sessionId === undefined) {
              draftIds = []
              return
            }
            if (!draftAttachmentSupported(conversation, shell)) {
              warn('[selection-annotations] 运行时未提供 createDrafts/addFiles，批注不会随消息发送')
              draftIds = []
              return
            }

            // 先摘旧的，避免一条消息上挂两份批注块。
            releaseDrafts(previous, shell)
            draftIds = []
            draftSeen = false

            if (annotations.length === 0) return

            const file = new File([buildPayload(annotations)], ANNOTATION_FILE, { type: 'application/json' })
            // 图片草稿与批注 JSON 一起挂到同一条消息：消息里图片是独立 image 块，宿主只摘 JSON 文件块。
            const imageFiles = []
            for (const item of annotations) {
              for (const image of Array.isArray(item.images) ? item.images : []) {
                if (image !== null && typeof image === 'object' && image.file !== null && typeof image.file === 'object') {
                  imageFiles.push(image.file)
                }
              }
            }
            const drafts = conversation.createDrafts(sessionId, [file, ...imageFiles])
            const ids = Array.isArray(drafts) ? drafts.map((draft) => draft.id).filter((id) => typeof id === 'string') : []
            if (ids.length === 0) return

            // 只等批注 JSON 的上传：图片草稿是运行时直发的，没有后台上传状态，等它只会等到超时。
            if (!(await waitForUploads(conversation, [ids[0]], UPLOAD_READY_TIMEOUT_MS))) {
              warn('[selection-annotations] 批注附件上传失败，本次不随消息发送')
              releaseDrafts(ids, shell)
              return
            }

            draftIds = ids
            draftSeen = false
            // 先订阅再挂载：挂载本身会发布一次输入态，那次「在场」必须被看到，
            // 否则发送导致的「离场」会被误判成「还没挂上」而拒绝清空。
            // 发出去之前页面上已有的批注消息行：发送后据此区分「新消息」与「旧历史」。
            // 但若让它把异常抛出去，就会连带 addFiles 一起跳过，批注根本发不出去。
            try {
              watchDraft()
            } catch (err) {
              warn('[selection-annotations] 消费检测挂载失败（不影响本次发送）：', err)
            }
            if (safe(() => shell.addFiles([], ids)) === false) {
              draftIds = []
              releaseDrafts(ids, shell)
              return
            }
            // 发出去之前页面上已有的批注消息行：发送后据此区分「新消息」与「旧历史」。
            lastAnnotatedKeys = captureAnchorKeys()
            attachedSessionId = sessionId
            log(`[selection-annotations] 批注块已挂到本条消息（${annotations.length} 条）`)
          } catch (err) {
            warn('[selection-annotations] 批注附件同步失败：', err)
          } finally {
            syncing = false
            maintaining = false
          }
        }

        /* ------------------------------------------------------------------ 覆盖层绘到*/

        const overlay = document.createElement('div')
        overlay.className = 'sa-overlay'
        overlay.setAttribute('data-sa-ui', 'overlay')

