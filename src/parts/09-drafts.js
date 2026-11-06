        function draftStorage() {
          return safe(() => {
            const storage = window.localStorage
            return storage !== null && storage !== undefined && typeof storage.getItem === 'function' ? storage : undefined
          })
        }

        function draftKey(sessionId) {
          return `${DRAFT_STORAGE_PREFIX}${sessionId}`
        }

        /** 草稿只保留可序列化字段：liveRange 是活 DOM 对象，恢复时按锚点与引文重建。 */
        function draftItems(items) {
          return items.map((item) => ({
            id: item.id,
            number: item.number,
            quote: item.quote,
            note: item.note,
            source: item.source,
            createdAt: item.createdAt,
            // 图片只存压缩后的 data URL：File 与对象 URL 都带不过本地存储。
            images: (Array.isArray(item.images) ? item.images : [])
              .filter((image) => typeof image?.dataUrl === 'string' && image.dataUrl !== '')
              .map((image) => ({ id: image.id, name: image.name, dataUrl: image.dataUrl, bytes: image.bytes })),
          }))
        }

        function isDraftItem(value) {
          if (value === null || typeof value !== 'object' || Array.isArray(value)) return false
          return typeof value.quote === 'string' || typeof value.note === 'string'
        }

        function restoreDraftItem(item) {
          const images = (Array.isArray(item.images) ? item.images : [])
            .filter((image) => typeof image?.dataUrl === 'string' && image.dataUrl !== '')
            .map((image) => {
              const file = dataUrlToFile(image)
              return {
                id: typeof image.id === 'string' ? image.id : `img-${Math.random().toString(36).slice(2, 8)}`,
                name: typeof image.name === 'string' ? image.name : t('image.alt'),
                dataUrl: image.dataUrl,
                bytes: Number(image.bytes) || 0,
                file,
                // 恢复后没有对象 URL：直接用 data URL 当缩略图来源。
                url: image.dataUrl,
              }
            })
          return {
            id: typeof item.id === 'string' && item.id !== '' ? item.id : `sa-restored-${Math.random().toString(36).slice(2, 10)}`,
            number: Number.isFinite(item.number) ? item.number : 0,
            quote: typeof item.quote === 'string' ? item.quote : '',
            note: typeof item.note === 'string' ? item.note : '',
            source: item.source ?? { kind: 'dom' },
            createdAt: Number.isFinite(item.createdAt) ? item.createdAt : Date.now(),
            images,
          }
        }

        /** 超出体积上限时，从最旧的批注开始丢图片（文字永远保留）。*/
        function fitDraftSize(items) {
          let text = JSON.stringify({ version: 1, items })
          if (text.length <= DRAFT_MAX_BYTES) return items
          const next = items.map((item) => ({ ...item, images: Array.isArray(item.images) ? item.images.slice() : [] }))
          for (let i = 0; i < next.length && text.length > DRAFT_MAX_BYTES; i += 1) {
            if (next[i].images.length === 0) continue
            next[i] = { ...next[i], images: [] }
            text = JSON.stringify({ version: 1, items: next })
          }
          if (text.length > DRAFT_MAX_BYTES) log('[selection-annotations] 草稿超出本地存储预算，图片已丢弃、文字保留')
          return next
        }

        /** 存一份草稿；批注被清空时把这一键一起删掉。*/
        function saveDraft(sessionId) {
          if (typeof sessionId !== 'string' || sessionId === '') return
          // 内存与落盘保留完整内容；只有 localStorage 受配额限制，写进去时才裁剪。
          const full = draftItems(annotations)
          const items = fitDraftSize(full)
          if (full.length === 0) draftSessions.delete(sessionId)
          else draftSessions.set(sessionId, full)
          // 落盘通道也同步一份：localStorage 只在当前客户端里有效。
          scheduleRemotePush(sessionId)
          const storage = draftStorage()
          if (storage === undefined) return
          try {
            if (items.length === 0) {
              storage.removeItem(draftKey(sessionId))
              return
            }
            storage.setItem(draftKey(sessionId), JSON.stringify({ version: 1, savedAt: Date.now(), items }))
            pruneDrafts(storage)
          } catch {
            /* 配额满或写入被禁：降级为仅内存保存*/
          }
        }

        /** 只保留最近 DRAFT_MAX_SESSIONS 个会话的草稿。 */
        function pruneDrafts(storage) {
          const keys = []
          for (let i = 0; i < storage.length; i += 1) {
            const key = safe(() => storage.key(i))
            if (typeof key === 'string' && key.startsWith(DRAFT_STORAGE_PREFIX)) keys.push(key)
          }
          if (keys.length <= DRAFT_MAX_SESSIONS) return
          const dated = keys.map((key) => {
            const savedAt = safe(() => Number(JSON.parse(storage.getItem(key) ?? '{}')?.savedAt) || 0)
            return { key, savedAt: savedAt ?? 0 }
          })
          dated.sort((a, b) => a.savedAt - b.savedAt)
          for (const entry of dated.slice(0, dated.length - DRAFT_MAX_SESSIONS)) {
            safe(() => storage.removeItem(entry.key))
          }
        }

        /** 读一份草稿：内存优先，其次本地存储；读坏了当没有。*/
        function loadDraft(sessionId) {
          const memory = draftSessions.get(sessionId)
          if (memory !== undefined) return memory.map(restoreDraftItem)
          const storage = draftStorage()
          if (storage === undefined) return []
          const items = safe(() => {
            const raw = storage.getItem(draftKey(sessionId))
            if (raw === null) return []
            const parsed = JSON.parse(raw)
            if (parsed === null || typeof parsed !== 'object' || !Array.isArray(parsed.items)) return []
            return parsed.items.filter(isDraftItem).slice(0, DRAFT_MAX_ITEMS).map(restoreDraftItem)
          })
          if (items === undefined || items.length === 0) return []
          draftSessions.set(sessionId, draftItems(items))
          return items
        }

        /**
         * 会话切换：先把上一会话的草稿存起来，再换入这一会话的草稿。
         * 结果是批注根本进不了消息（或直接抛错）。必须让运行时自己登记草稿附件。
         */
        function adoptSession(sessionId) {
          if (typeof sessionId !== 'string' || sessionId === '') return
          const first = annotationsSession === undefined
          if (!first && annotationsSession === sessionId) return
          if (!first) saveDraft(annotationsSession)
          annotationsSession = sessionId
          // 首次挂载时内存里可能已有批注（测试台或热换前注入的），直接归到这个会话。
          if (first && annotations.length > 0) {
            saveDraft(sessionId)
            return
          }
          annotations = loadDraft(sessionId)
          draftIds = []
          draftSeen = false
          // 换会话时把上一会话的答复卡片清掉；新会话的数据用hydrate 补回来。
          for (const stale of document.querySelectorAll('[data-sa-ui="replies"]')) stale.remove()
          emit()
          scheduleRepaint()
          if (annotations.length > 0) scheduleSync()
          // 本地是空的就当远端有数据：跨端切换会话时靠这一步把记录带回来。
          void hydrateRemoteSession(sessionId)
        }

        function toBase64(bytes) {
          let binary = ''
          const step = 0x8000
          for (let i = 0; i < bytes.length; i += step) {
            binary += String.fromCharCode.apply(null, bytes.subarray(i, i + step))
          }
          return btoa(binary)
        }

        /* ------------------------------------------------------------------ 锚点 */

        /**
         * 选区在根元素内的字符区间（半开 `[start, end)`，与 `textContent` 口径一致）。
         * 这是批注位置的可校验表示：引文可能重复，字符区间不会。
         */
