        function isSentItem(value) {
          if (value === null || typeof value !== 'object' || Array.isArray(value)) return false
          return typeof value.quote === 'string' || typeof value.note === 'string'
        }

        /** 读一个会话的已提交台账（anchorKey → { savedAt, items }）。 */
        function loadSent(sessionId) {
          const memory = sentBySession.get(sessionId)
          if (memory !== undefined) return memory
          const table = new Map()
          const storage = draftStorage()
          if (storage !== undefined) {
            const parsed = safe(() => JSON.parse(storage.getItem(`${SENT_STORAGE_PREFIX}${sessionId}`) ?? 'null'))
            if (parsed !== null && typeof parsed === 'object' && parsed.entries !== null && typeof parsed.entries === 'object') {
              for (const [key, value] of Object.entries(parsed.entries)) {
                if (typeof key !== 'string' || key === '') continue
                if (value === null || typeof value !== 'object' || !Array.isArray(value.items)) continue
                const items = value.items.filter(isSentItem).slice(0, DRAFT_MAX_ITEMS)
                if (items.length === 0) continue
                const turn = Number.isFinite(value.turn) ? Number(value.turn) : undefined
                table.set(key, { savedAt: Number(value.savedAt) || 0, items, ...(turn !== undefined ? { turn } : {}) })
              }
            }
          }
          sentBySession.set(sessionId, table)
          return table
        }

        function saveSent(sessionId, table) {
          const storage = draftStorage()
          const ordered = [...table.entries()].sort((a, b) => a[1].savedAt - b[1].savedAt)
          // 内存与落盘都保留完整记录；只有localStorage 受配额限制，写进去时按预算裁剪。
          const kept = ordered.slice(Math.max(0, ordered.length - SENT_MAX_ENTRIES))
          sentBySession.set(sessionId, new Map(kept))
          scheduleRemotePush(sessionId)
          if (storage === undefined) return
          let stored = kept
          if (JSON.stringify(Object.fromEntries(kept)).length > SENT_MAX_BYTES) {
            stored = kept.map(([key, value]) => [
              key,
              { ...value, items: value.items.map((item) => ({ ...item, thumbs: [] })) },
            ])
            if (JSON.stringify(Object.fromEntries(stored)).length > SENT_MAX_BYTES) {
              stored = stored.slice(Math.max(0, stored.length - 40))
            }
          }
          const entries = {}
          for (const [key, value] of stored) entries[key] = value
          try {
            storage.setItem(`${SENT_STORAGE_PREFIX}${sessionId}`, JSON.stringify({ version: 1, entries }))
          } catch {
            /* 配额满：本地缓存放弃写入，落盘通道仍有完整记录 */
          }
        }

        /**
         * 页面上所有用户消息行（锚点键）。
         *
         * 不能等附件卡片做锚点：实测会话日志里用户消息**不含 file 块*，页面上也就没有
         * 「批注json」卡片。所以锚点直接取消息行本身。
         */
        /**
         * 页面上可能承载「本次批注」的行，按可信度从高到低：
         *   1. 带批注附件的行（最精确，但纯批注消息在部分视图里不渲染附件行）；
         *   2. 用户消息行；
         *   3. 折叠组 / 过程行 —— 纯批注消息常被收进 `turn-process` 组，只有组行可锚定。
         * 三者取并集、按锚点键去重，避免同一行被重复插入卡片。
         */
        function collectAnchorRows() {
          const rows = []
          const seen = new Set()
          const push = (element, anchorKey) => {
            if (anchorKey === '' || seen.has(anchorKey)) return
            seen.add(anchorKey)
            rows.push({ row: element, anchorKey })
          }

          for (const attachmentRow of document.querySelectorAll('[data-message-attachments]')) {
            if (!/批注\.json/.test(attachmentRow.textContent ?? '')) continue
            const row = attachmentRow.closest('[data-chat-anchor-key]')
            if (row === null) continue
            push(row, row.getAttribute('data-chat-anchor-key') ?? '')
          }

          for (const element of document.querySelectorAll('[data-chat-anchor-key]')) {
            const kind = element.getAttribute('data-chat-flow-kind') ?? ''
            if (kind !== 'user' && kind !== 'steering') continue
            push(element, element.getAttribute('data-chat-anchor-key') ?? '')
          }

          for (const element of document.querySelectorAll('[data-chat-anchor-key]')) {
            const kind = element.getAttribute('data-chat-flow-kind') ?? ''
            const anchorKey = element.getAttribute('data-chat-anchor-key') ?? ''
            if (kind === '' || anchorKey.startsWith('group:')) {
              push(element, anchorKey)
            }
          }
          return rows
        }

        /** 当前页面上已有的候选锚点键。*/
        function captureAnchorKeys() {
          return new Set(collectAnchorRows().map((entry) => entry.anchorKey))
        }

        function recordSent(sessionId, anchorKey, items, turn) {
          const table = loadSent(sessionId)
          table.set(anchorKey, {
            savedAt: Date.now(),
            items,
            ...(Number.isFinite(turn) ? { turn } : {}),
          })
          saveSent(sessionId, table)
        }

        /** 把新出现的候选行与刚发出的批注负载按出现顺序配对。*/
        function scanSentMessages() {
          if (pendingSent.length === 0) return
          const now = Date.now()
          pendingSent = pendingSent.filter((entry) => now - entry.at < SENT_PENDING_TTL_MS)
          if (pendingSent.length === 0) return
          const rows = collectAnchorRows()
          if (rows.length === 0) return
          const pending = pendingSent[0]
          const sessionId =
            typeof pending.sessionId === 'string' && pending.sessionId !== '' ? pending.sessionId : currentSessionId()
          if (sessionId === undefined) return
          // 候选：不在「发送前快照」里、也还没落台账的行；「已完成」尾行不是消息，别拿它当锚点。
          const fresh = rows.filter(
            (entry) =>
              !pending.known.has(entry.anchorKey) &&
              !loadSent(sessionId).has(entry.anchorKey) &&
              entry.row.getAttribute('data-chat-flow-kind') !== 'turn-process',
          )
          // 兜底：纯批注消息可能复用已有的组行（锚点键不变），那就取最后一个还没记账的行。
          const target = fresh.length > 0 ? fresh[fresh.length - 1] : undefined
          if (target === undefined) return
          pendingSent.shift()
          const turn = turnOfRow(target.row)
          recordSent(sessionId, target.anchorKey, pending.items, turn)
          scheduleRepaint()
        }

        function truncateQuote(value) {
          const text = typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : ''
          return text.length > 140 ? `${text.slice(0, 140)}…` : text
        }

        /** 收展头左侧的矢量箭头：开合只转这一个图形。*/
        function sectionChevron() {
          const ns = 'http://www.w3.org/2000/svg'
          const svg = document.createElementNS(ns, 'svg')
          svg.setAttribute('class', 'sa-section-chevron')
          svg.setAttribute('viewBox', '0 0 16 16')
          svg.setAttribute('aria-hidden', 'true')
          const path = document.createElementNS(ns, 'path')
          path.setAttribute('d', 'M6.2 3.6 10.7 8l-4.5 4.4')
          path.setAttribute('fill', 'none')
          path.setAttribute('stroke', 'currentColor')
          path.setAttribute('stroke-width', '1.8')
          path.setAttribute('stroke-linecap', 'round')
          path.setAttribute('stroke-linejoin', 'round')
          svg.appendChild(path)
          return svg
        }

        /** 两个区域共用的收展入口：同一套结构、尺寸与留白。*/
        function buildSectionHead(label, meta) {
          const head = document.createElement('button')
          head.type = 'button'
          head.className = 'sa-section-head'
          head.appendChild(sectionChevron())
          const title = document.createElement('span')
          title.className = 'sa-section-title'
          title.textContent = label
          head.appendChild(title)
          if (typeof meta === 'string' && meta !== '') {
            const metaEl = document.createElement('span')
            metaEl.className = 'sa-section-meta'
            metaEl.textContent = meta
            head.appendChild(metaEl)
          }
          return head
        }

        /** 可折展容器：0fr↔1fr 撑开内容，收起时不占高度。*/
        function collapsible(body, open) {
          const wrap = document.createElement('div')
          wrap.className = 'sa-collapse'
          wrap.dataset.open = open ? '1' : '0'
          const inner = document.createElement('div')
          inner.className = 'sa-collapse-inner'
          inner.appendChild(body)
          wrap.appendChild(inner)
          return wrap
        }

        function applyCollapsed(head, wrap, open) {
          wrap.dataset.open = open ? '1' : '0'
          head.dataset.open = open ? '1' : '0'
          head.setAttribute('aria-expanded', String(open))
        }

        /** 一条已提交批注在历史里的卡片：默认收起，点开看引文与批注文字。*/
        function buildSentCard(record, anchorKey) {
          const card = document.createElement('div')
          card.className = 'sa-sent'
          card.setAttribute('data-sa-ui', 'sent')
          // 记下锚点键：卡片现在插在消息行外，判重要靠它而不是「行内有没有卡片」。
          if (typeof anchorKey === 'string' && anchorKey !== '') card.setAttribute('data-anchor', anchorKey)
          const head = buildSectionHead(t('sent.title', { n: record.items.length }))
          const body = document.createElement('div')
          body.className = 'sa-sent-body'
          const wrap = collapsible(body, false)
          applyCollapsed(head, wrap, false)
          for (const item of record.items) {
            const line = document.createElement('div')
            line.className = 'sa-sent-item'
            line.setAttribute('data-sa-sent-index', Number.isFinite(item.index) ? String(item.index) : '')
            const num = document.createElement('span')
            num.className = 'sa-sent-num'
            num.textContent = Number.isFinite(item.index) ? String(item.index) : ''
            const text = document.createElement('div')
            text.className = 'sa-sent-text'
            const quote = document.createElement('div')
            quote.className = 'sa-sent-quote'
            quote.setAttribute('data-sa-field', 'quote')
            quote.textContent = truncateQuote(item.quote)
            text.appendChild(quote)
            if (typeof item.note === 'string' && item.note.trim() !== '') {
              const note = document.createElement('div')
              note.className = 'sa-sent-note'
              note.setAttribute('data-sa-field', 'note')
              note.textContent = item.note
              text.appendChild(note)
            }
            const thumbs = Array.isArray(item.thumbs) ? item.thumbs : []
            if (thumbs.length > 0) {
              const gallery = document.createElement('div')
              gallery.className = 'sa-sent-thumbs'
              for (const thumb of thumbs) {
                if (typeof thumb?.dataUrl !== 'string' || thumb.dataUrl === '') continue
                const img = document.createElement('img')
                img.className = 'sa-sent-thumb'
                img.src = thumb.dataUrl
                img.alt = typeof thumb.name === 'string' ? thumb.name : t('image.alt')
                img.title = t('image.open')
                img.addEventListener('click', (event) => {
                  event.preventDefault()
                  event.stopPropagation()
                  openImageViewer(thumb.dataUrl, thumb.name)
                })
                gallery.appendChild(img)
              }
              if (gallery.childNodes.length > 0) text.appendChild(gallery)
            }
            line.append(num, text)
            body.appendChild(line)
          }
          head.addEventListener('click', (event) => {
            event.preventDefault()
            event.stopPropagation()
            applyCollapsed(head, wrap, wrap.dataset.open !== '1')
          })
          card.append(head, wrap)
          return card
        }

        /** 这一轮记录行（「已完成」按钮）之后最近的轮次尾行；没有就返回 null。*/
        function footerAfter(row) {
          for (const button of document.querySelectorAll('[data-turn-process]')) {
            if (button === row || button.contains(row)) continue
            if ((row.compareDocumentPosition(button) & 4) === 0) continue
            return button
          }
          return null
        }

        /** 批注行所属的轮次块：行可能就在过程块内部（指向助手的答复或过程文字）。*/
        function turnBlockOf(row) {
          const block = typeof row.closest === 'function' ? row.closest('[data-chat-flow-kind="turn-process"]') : null
          if (block !== null && block !== undefined) return block
          const footer = footerAfter(row)
          if (footer === null) return null
          return footer.closest('[data-chat-flow-kind="turn-process"]') ?? footer
        }

        /** 0.2.2 起每个 flow 项都带 data-chat-turn；老结构再退回过程块/尾行推断。*/
        function turnOfRow(row) {
          const holder = typeof row.closest === 'function' ? row.closest('[data-chat-turn]') : null
          if (holder !== null && holder !== undefined) {
            const raw = holder.getAttribute('data-chat-turn')
            const turn = Number(raw)
            if (Number.isFinite(turn) && turn > 0) return turn
          }
          const block = turnBlockOf(row)
          if (block === null) return undefined
          const button = typeof block.querySelector === 'function' ? block.querySelector('[data-turn-process]') : null
          const raw = button === null ? null : button.getAttribute('data-turn-process')
          const turn = Number(raw)
          return Number.isFinite(turn) && turn > 0 ? turn : undefined
        }

        /** 这一轮里第一条内容项（跳过用户消息）：轮次进行中还没有「已完成」按钮时用它当锚点。*/
        function turnContentItem(turn) {
          if (!Number.isFinite(turn)) return null
          for (const item of document.querySelectorAll(`[data-chat-turn="${turn}"]`)) {
            const kind = item.getAttribute('data-chat-flow-kind') ?? ''
            if (kind === 'user' || kind === 'steering') continue
            if (item.parentElement === null) continue
            return item
          }
          return null
        }

        /** 「已完成」按钮所在的整条 flow 项：0.2.2 里按钮内联在消息体，插到项前才是轮次上方。*/
        function turnDisclosureItem(turn) {
          if (!Number.isFinite(turn)) return null
          const button = document.querySelector(`[data-turn-process="${turn}"]`)
          if (button === null) return null
          const flow = typeof button.closest === 'function' ? button.closest('[data-chat-flow-kind]') : null
          return flow ?? button
        }

        /** 卡片固定贴在所属轮次内容的上方；轮次进行中或已结束都按轮次标记定位。*/
        function sentCardAnchor(row) {
          const turn = turnOfRow(row)
          const item = turnContentItem(turn) ?? turnDisclosureItem(turn)
          if (item !== null && item.parentElement !== null && item.parentElement !== document.body) {
            return { parent: item.parentElement, before: item }
          }
          const block = turnBlockOf(row)
          if (block !== null) {
            const parent = block.parentElement
            if (parent !== null && parent !== document.body) return { parent, before: block }
          }
          const flow =
            row.getAttribute?.('data-chat-flow-kind') !== null
              ? row
              : (typeof row.closest === 'function' ? (row.closest('[data-chat-flow-kind]') ?? row) : row)
          const parent = flow.parentElement
          if (parent === null || parent === document.body) return { parent: row.parentElement, before: row.nextSibling }
          return { parent, before: flow.nextElementSibling }
        }

        /** 旧台账可能把「已完成」尾行当锚点，渲染时改认这一轮里真正的批注消息行。*/
        function isTurnProcessAnchor(anchorKey) {
          return typeof anchorKey === 'string' && /:turn-process\d+$/.test(anchorKey)
        }

        function annotationRowBefore(footerRow) {
          let best = null
          for (const element of document.querySelectorAll('[data-chat-anchor-key]')) {
            const kind = element.getAttribute('data-chat-flow-kind') ?? ''
            if (kind === 'turn-process') continue
            if ((element.compareDocumentPosition(footerRow) & 4) === 0) continue
            const selfAttach = element.getAttribute('data-message-attachments')
            const nested = typeof element.querySelector === 'function' ? element.querySelector('[data-message-attachments]') : null
            if (selfAttach === null && nested === null) continue
            const text = (selfAttach !== null ? element.textContent : nested.textContent) ?? ''
            if (!/批注\.json/.test(text)) continue
            best = element
          }
          return best
        }

        function resolveLegacyAnchor(anchorKey) {
          if (!isTurnProcessAnchor(anchorKey)) return anchorKey
          const footerRow = document.querySelector(`[data-chat-anchor-key="${cssEscape(anchorKey)}"]`)
          if (footerRow === null) return anchorKey
          const resolved = annotationRowBefore(footerRow)
          return resolved?.getAttribute('data-chat-anchor-key') ?? anchorKey
        }

        /** 记录里记下的轮次号：新记录直接存；旧记录从 turn-process 锚点里取。*/
        function turnOfRecord(record, storedKey) {
          if (Number.isFinite(record.turn)) return record.turn
          const legacy = /:turn-process(\d+)$/.exec(storedKey)
          return legacy === null ? null : Number(legacy[1])
        }

        /** 「已完成」所在的 flow 项；还没出现按钮（轮次进行中）时退回这一轮的第一条内容项。*/
        function footerBlockForTurn(turn) {
          const item = turnDisclosureItem(turn)
          if (item !== null) return item
          const content = turnContentItem(turn)
          if (content !== null) return content
          if (!Number.isFinite(turn)) return null
          const button = document.querySelector(`[data-turn-process="${turn}"]`)
          if (button === null) return null
          return button.closest('[data-chat-flow-kind="turn-process"]') ?? button
        }

        /** 在所属轮次的「已完成」之前补出已提交批注卡片；按轮次定位，不依赖消息行是否已加载。*/
        function renderSentCards() {
          const sessionId = currentSessionId()
          if (sessionId === undefined) return
          const table = loadSent(sessionId)
          if (table.size === 0) return
          // 卡片身份取台账键；锚点只用来挂答复卡。
          for (const stale of document.querySelectorAll('[data-sa-ui="sent"]')) {
            const key = stale.getAttribute('data-sa-key')
            if (key === null || !table.has(key)) stale.remove()
          }
          let learnedTurn = false
          for (const [storedKey, record] of table) {
            if (record.items.length === 0) continue
            const anchorKey = resolveLegacyAnchor(storedKey)
            const row = document.querySelector(`[data-chat-anchor-key="${cssEscape(anchorKey)}"]`)
            let turn = turnOfRecord(record, storedKey)
            // 旧记录第一次看到「已完成」时把轮次记下来，之后即使消息行没加载也能定位。
            if (!Number.isFinite(turn) && row !== null) {
              const found = turnOfRow(row)
              if (Number.isFinite(found)) {
                turn = found
                record.turn = turn
                learnedTurn = true
              }
            }
            const footer = footerBlockForTurn(turn)
            if (row === null && footer === null) continue
            const existing = document.querySelector(`[data-sa-ui="sent"][data-sa-key="${cssEscape(storedKey)}"]`)
            const card = existing ?? buildSentCard(record, anchorKey)
            card.setAttribute('data-sa-key', storedKey)
            card.setAttribute('data-anchor', anchorKey)
            // 位置固定在轮次尾行之前；与消息在折叠组里、是否懒加载无关。
            if (footer !== null) {
              if (footer.parentElement !== null) footer.parentElement.insertBefore(card, footer)
              continue
            }
            const target = sentCardAnchor(row)
            if (target.parent !== null) {
              if (card.parentElement !== target.parent || card.nextSibling !== target.before) target.parent.insertBefore(card, target.before)
            } else if (existing === null) {
              row.appendChild(card)
            }
          }
          if (learnedTurn) saveSent(sessionId, table)
        }

        /** 逐条答复的判定文案与样式类。*/
        const VERDICT_LABELS = {
          accepted: ['verdict.accepted', 'accepted'],
          partial: ['verdict.partial', 'partial'],
          rejected: ['verdict.rejected', 'rejected'],
          needs_info: ['verdict.needs_info', 'needs_info'],
        }

        /** 一批答复里的每条答复按 index 去重：同一 index 以最后一批为准。*/
