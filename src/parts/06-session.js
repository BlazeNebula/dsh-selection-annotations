        function elementOf(node) {
          if (node === null || node === undefined) return null
          if (node.nodeType === 1) return node
          return node.parentElement ?? null
        }

        /* ------------------------------------------------------------ 界面语言 */
        // 文案跟着 DSH 的界面语言走：注册中英词典，切换语言后重绘我们自己造的 DOM。
        // 没有 locale 服务（老版本宿主 / 测试台）时保持中文，功能不受影响。
        const localeService = ctx.locale
        if (
          localeService !== undefined &&
          localeService !== null &&
          typeof localeService.register === 'function' &&
          typeof localeService.bind === 'function'
        ) {
          activeLocale = safe(() => localeService.getSnapshot?.().active) ?? 'zh'
          ctx.effect(() => localeService.register(LOCALE_NS, MESSAGES), 'selection-annotations: dictionaries')
          t = localeService.bind(LOCALE_NS)
        }

        /** 当前会话 id：优先槽位 props，其次 uiSession 的 current 绑定，最后退回会话列表。 */
        function currentSessionId() {
          if (typeof latestSessionId === 'string' && latestSessionId !== '') return latestSessionId
          const fromUi = safe(() => {
            const binding = ctx.get('uiSession')?.adapter?.current?.getSnapshot?.()
            return typeof binding?.key === 'string' && binding.key !== '' ? binding.key : undefined
          })
          if (fromUi !== undefined) return fromUi
          return safe(() => {
            const snap = ctx.sessions?.list?.getSnapshot?.()
            if (snap === undefined || snap === null) return undefined
            if (typeof snap.current === 'string' && snap.current !== '') return snap.current
            const ids = Array.isArray(snap.ids) ? snap.ids : Object.keys(snap.byId ?? {})
            for (const id of ids) {
              const retained = snap.byId?.[id]?.retainedBy
              if (retained !== null && typeof retained === 'object' && retained.mainView > 0) return id
            }
            return undefined
          })
        }

        /** 当前会话的composer 输入外壳；拿不到就静默降级（批注仍可记录，只是不随消息发送）。*/
        function inputShell() {
          const sessionId = currentSessionId()
          if (sessionId === undefined) return undefined
          return safe(() => {
            const scoped = ctx.sessions.scope(sessionId)
            if (scoped === undefined || scoped === null) return undefined
            return ctx.conversation.input.for(scoped)
          })
        }

        /**
         * 输入外壳**实时**持有的草稿附件 id。
         *
         * 刻意不用运行时那张私有草稿表：只发附件（无正文）时，输入态已经交出了附件，
         * 但运行时仍会持有条目直到 admission 结算 —— 拿它当判据就永远等不到「已消费」。
         * @returns id 数组；拿不到时返回 undefined（此时不判定）。
         */
        function liveAttachmentIds(shell) {
          if (Array.isArray(shell?.attachmentIds)) return shell.attachmentIds
          const snapshot = safe(() => shell?.state?.getSnapshot())
          return Array.isArray(snapshot?.attachmentIds) ? snapshot.attachmentIds : undefined
        }

        /**
         * 清空之后仍要盯一会儿：提交*结算失败**时运行时会调 restoreAttachments 把附件塞图
         * 输入态（`settleDetachedFailure`），而这可能发生在回合结束很久之后。批注此刻其实已经
         * 发出，留下那张没有内容的卡片只会误导人，所以见到就摘。
         * @param shell - 当前输入外壳。
         */
        /**
         * 认领「上一轮遗留下来的孤儿批注附件」。
         *
         * 运行时在提交结算失败时会把已发出的附件 restore 回输入态；若那件事发生在插件重载之前
         * （或插件当时没在跑），内存里的守卫表就随重载一起没了，那份 `批注.json` 会一直赖在输入框里，
         * 盯着批注附件何时被消费（消息发出）或被用户摘掉。
         *
         * 所以判据不放在内存里，而放在*文件后*上：凡是我们没在跟踪的批注附件，一律摘掉。
         * @param shell - 当前输入外壳。
         */
        function sweepOrphans(shell) {
          if (maintaining || syncing) return
          const ids = liveAttachmentIds(shell)
          if (ids === undefined || ids.length === 0) return
          const foreign = ids.filter((id) => !draftIds.includes(id))
          if (foreign.length === 0) return
          const resolved = safe(() => ctx.conversation?.resolveDraftAttachments?.(foreign))
          if (!Array.isArray(resolved)) return
          for (const attachment of resolved) {
            if (attachment?.file?.name !== ANNOTATION_FILE) continue
            releaseDrafts([attachment.id], shell)
            log(`[selection-annotations] 摘掉一个上一轮遗留的孤儿批注附件（${attachment.id}）`)
          }
        }

        function sweepStrays(shell) {
          if (strayIds.size === 0 || shell === undefined) return
          const now = Date.now()
          const ids = liveAttachmentIds(shell)
          if (ids === undefined) return
          for (const [id, until] of [...strayIds]) {
            if (until <= now) {
              strayIds.delete(id)
              continue
            }
            if (!ids.includes(id)) continue
            strayIds.delete(id)
            releaseDrafts([id], shell)
            log(`[selection-annotations] 摘掉一个被恢复回来的孤儿批注附件（${id}）`)
          }
        }

        /**
         * 判定「这批批注已经被消息消费掉」并清空 ——带一次性保护。
         * @param reason - 触发原因，仅用于日志。
         */
        function markConsumed(reason) {
          if (draftIds.length === 0) return
          const ids = draftIds
          draftIds = []
          draftSeen = false
          const until = Date.now() + STRAY_GUARD_MS
          for (const id of ids) strayIds.set(id, until)
          if (annotations.length === 0) return
          // 发送前留一份负载与「挂附件时页面上已有的批注消息行」：新消息行出现后再按锚点键落台账。
          // 图片只带缩略图（dataUrl），原图不进台账 —— 清单里要的是「看得出是哪张」。
          const payload = safe(() => JSON.parse(buildPayload(annotations)))
          if (payload !== null && typeof payload === 'object' && Array.isArray(payload.annotations)) {
            const items = payload.annotations.map((annotation, index) => {
              const source = annotations[index]
              const images = Array.isArray(source?.images) ? source.images : []
              const thumbs = []
              for (const image of images) {
                if (typeof image?.thumb !== 'string' || image.thumb === '') continue
                thumbs.push({ name: typeof image.name === 'string' ? image.name : t('image.alt'), dataUrl: image.thumb })
              }
              return thumbs.length > 0 ? { ...annotation, thumbs } : annotation
            })
            pendingSent.push({
              items,
              known: lastAnnotatedKeys,
              at: Date.now(),
              // 发送这一刻的会话就是消息真正去的那一个：记账沿用它，
              // 避免稍后重算时切到别的会话，把记录写进别人的台账。
              sessionId: attachedSessionId ?? currentSessionId(),
            })
            lastAnnotatedKeys = new Set()
          }
          annotations = []
          emit()
          scheduleRepaint()
          // 草稿存储也要跟着清掉：否则刷新后这批已发出的批注会「复活」。
          saveDraft(annotationsSession)
          log(`[selection-annotations] 批注已随消息发出（${reason}）`)
        }

        /**
         * 先看到「输入态不再持有附件」之后，隔一拍再确认一次：提交失败会调 restoreAttachments
         * 把附件还回来，那时就不该清空（否则批注清了、附件还在，两边对不上）。
         */
        function scheduleConsumeCheck() {
          if (consumeTimer !== null) return
          consumeTimer = window.setTimeout(() => {
            consumeTimer = null
            if (maintaining || draftIds.length === 0) return
            const shell = inputShell()
            if (shell === undefined) return
            const ids = liveAttachmentIds(shell)
            if (ids === undefined) return
            if (draftIds.some((id) => ids.includes(id))) return
            markConsumed('输入态已不再持有附件')
          }, CONSUME_CONFIRM_MS)
        }

        /**
         * 盯着批注附件何时被消费（消息发出）或被用户摘掉。
         *
         * 两条互补的信号，都归到同一个判据「输入态不再持有附件」：
         *   ①输入态的**推送*通知 ——快，但不能假定发送路径一定会发布通知，
         *   ①直接轮询输入外壳的*实时字段** ——慢一秒，但不依赖任何通知。
         * 确认窗口用来过滤「提交先移走、失败又还回来」的假信号。
         */
        function watchDraft() {
          const shell = inputShell()
          const state = shell?.state
          if (
            watchUnsub === undefined &&
            state !== undefined &&
            typeof state.subscribe === 'function' &&
            typeof state.getSnapshot === 'function'
          ) {
            watchUnsub = state.subscribe(() => {
              const current = inputShell()
              if (current !== undefined) sweepStrays(current)
              if (maintaining || draftIds.length === 0) return
              const snapshot = safe(() => state.getSnapshot())
              if (snapshot === undefined || snapshot === null) return
              const ids = Array.isArray(snapshot.attachmentIds) ? snapshot.attachmentIds : []
              if (draftIds.some((id) => ids.includes(id))) {
                draftSeen = true
                return
              }
              // 首次「在场」没被看到之前不敢下结论：那可能只是还没挂上去。
              if (!draftSeen) return
              scheduleConsumeCheck()
            })
          }
          if (watchTimer === null) {
            watchTimer = window.setInterval(() => {
              const current = inputShell()
              if (current === undefined) return
              sweepStrays(current)
              sweepOrphans(current)
              if (maintaining || draftIds.length === 0) return
              const ids = liveAttachmentIds(current)
              if (ids === undefined) return
              if (draftIds.some((id) => ids.includes(id))) return
              scheduleConsumeCheck()
            }, CONSUME_POLL_MS)
          }
        }

        /* --------------------------------------------------------- 未提交批注的会话草稿 */

        /* --------------------------------------------------------------- 图片处理 */

        /** 图片设置：读坏了回落到默认值。*/
