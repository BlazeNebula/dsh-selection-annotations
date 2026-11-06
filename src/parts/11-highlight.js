        function rangeFromOffsets(root, start, length) {
          const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
          let offset = 0
          let startNode
          let startOffset = 0
          let endNode
          let endOffset = 0
          let node = walker.nextNode()
          while (node !== null) {
            const size = node.nodeValue === null ? 0 : node.nodeValue.length
            if (startNode === undefined && offset + size >= start) {
              startNode = node
              startOffset = start - offset
            }
            if (startNode !== undefined && offset + size >= start + length) {
              endNode = node
              endOffset = start + length - offset
              break
            }
            offset += size
            node = walker.nextNode()
          }
          if (startNode === undefined || endNode === undefined) return undefined
          return safe(() => {
            const range = document.createRange()
            range.setStart(startNode, Math.max(0, Math.min(startOffset, startNode.nodeValue.length)))
            range.setEnd(endNode, Math.max(0, Math.min(endOffset, endNode.nodeValue.length)))
            return range
          })
        }

        /** 在根元素里定位原文；重复片段用保存时的偏移择优。*/
        function matchInRoot(root, quote, savedOffset) {
          if (typeof quote !== 'string' || quote === '') return undefined
          const text = root.textContent ?? ''
          const positions = []
          let from = 0
          for (;;) {
            const at = text.indexOf(quote, from)
            if (at === -1 || positions.length >= 64) break
            positions.push(at)
            from = at + 1
          }
          if (positions.length === 0) return undefined
          let best = positions[0]
          if (positions.length > 1 && Number.isFinite(savedOffset)) {
            best = positions.reduce((a, b) => (Math.abs(b - savedOffset) < Math.abs(a - savedOffset) ? b : a))
          }
          return rangeFromOffsets(root, best, quote.length)
        }

        function rangeMatchesQuote(range, quote) {
          const current = safe(() => range.toString())
          if (typeof current !== 'string') return false
          const normalize = (value) => value.replace(/\s+/g, ' ').trim()
          return normalize(current) === normalize(quote)
        }

        /** 定位一条批注的当前 Range：活的 Range 优先，失效就按锚点 + 偏移重建。 */
        function locateRange(item) {
          if (item.liveRange !== undefined) {
            const live = item.liveRange
            const usable =
              safe(() => live.startContainer.isConnected === true && live.endContainer.isConnected === true) === true
            if (usable && rangeMatchesQuote(live, item.quote)) return live
            item.liveRange = undefined
          }
          const root = anchorRoot(item.source)
          if (root === null || root === undefined) return undefined
          const range = matchInRoot(root, item.quote, item.source.charStart)
          if (range !== undefined) item.liveRange = range
          return range
        }

        /* ------------------------------------------------------------------ 批注集合 */

        let sequence = 0

        function renumber() {
          annotations = annotations.map((item, index) => (item.number === index + 1 ? item : { ...item, number: index + 1 }))
        }

        function addAnnotation(input) {
          const quote = typeof input.quote === 'string' ? input.quote.trim().slice(0, MAX_QUOTE) : ''
          const note = typeof input.note === 'string' ? input.note.trim().slice(0, MAX_NOTE) : ''
          const source = input.source ?? { kind: 'dom' }
          // 空选区空批注没有意义。
          if (quote === '' && note === '') return undefined
          sequence += 1
          const item = {
            id: `sa-${Date.now().toString(36)}-${sequence}`,
            number: annotations.length + 1,
            quote,
            note,
            images: Array.isArray(input.images) ? input.images.slice() : [],
            source,
            liveRange: input.liveRange,
            createdAt: Date.now(),
          }
          annotations = [...annotations, item]
          emit()
          scheduleSync()
          scheduleRepaint()
          saveDraft(annotationsSession)
          return item
        }

        /** 改写一条既有批注的批注文字与图片；原文与出处不变。*/
        function updateAnnotation(id, note, images) {
          const next = typeof note === 'string' ? note.trim().slice(0, MAX_NOTE) : ''
          const nextImages = Array.isArray(images) ? images.slice() : undefined
          let hit = false
          annotations = annotations.map((item) => {
            if (item.id !== id) return item
            hit = true
            return { ...item, note: next, ...(nextImages === undefined ? {} : { images: nextImages }) }
          })
          if (!hit) return
          emit()
          scheduleSync()
          scheduleRepaint()
          saveDraft(annotationsSession)
        }

        function removeAnnotation(id) {
          annotations = annotations.filter((item) => item.id !== id)
          renumber()
          emit()
          scheduleSync()
          scheduleRepaint()
          saveDraft(annotationsSession)
        }

        /** 把一条批注移到另一条之前；beforeId 为 null 表示移到末尾。*/
        function moveAnnotation(id, beforeId) {
          if (id === beforeId) return
          const moving = annotations.find((item) => item.id === id)
          if (moving === undefined) return
          const rest = annotations.filter((item) => item.id !== id)
          const target = beforeId === null ? rest.length : rest.findIndex((item) => item.id === beforeId)
          rest.splice(target < 0 ? rest.length : target, 0, moving)
          annotations = rest
          renumber()
          emit()
          scheduleSync()
          scheduleRepaint()
          saveDraft(annotationsSession)
          refreshPanel()
        }

        function clearAnnotations() {
          annotations = []
          // 注意：不要在这里清 draftIds —— 交给 syncAttachment 才能把已挂上的附件摘掉。
          emit()
          scheduleSync()
          scheduleRepaint()
          saveDraft(annotationsSession)
        }

        /** 刚发出的负载在页面上等多久；超时就放弃关联（用户可能只是移除了附件）。*/
        const SENT_PENDING_TTL_MS = 60000

        /* ------------------------------------------------- 已提交批注的历史回看 */

