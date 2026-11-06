        function mergeReplyBatches(batches) {
          const byIndex = new Map()
          for (const batch of batches) {
            for (const reply of batch.replies) {
              if (reply === null || typeof reply !== 'object') continue
              const index = Number(reply.index)
              if (!Number.isFinite(index)) continue
              byIndex.set(index, { ...reply, index, at: Number(batch.at) || 0 })
            }
          }
          return [...byIndex.values()].sort((a, b) => a.index - b.index)
        }

        /**
         * 结果是批注根本进不了消息（或直接抛错）。必须让运行时自己登记草稿附件。
         *
         * 引文与批注文字来自已提交记录（按 index 对应）；拿不到时只显示答复块。
         * 版式按「引用块 + 答复块」：批注块左侧竖线、次级字号，答复块给判定与理由。
         */
        function buildReplySection(batches, items = []) {
          const replies = mergeReplyBatches(batches)
          const byIndex = new Map()
          for (const item of Array.isArray(items) ? items : []) {
            if (Number.isFinite(item?.index)) byIndex.set(item.index, item)
          }
          const card = document.createElement('div')
          card.className = 'sa-replies'
          card.setAttribute('data-sa-ui', 'replies')

          const counts = { accepted: 0, partial: 0, rejected: 0, needs_info: 0 }
          for (const reply of replies) {
            if (Object.hasOwn(counts, reply.verdict)) counts[reply.verdict] += 1
          }
          const parts = []
          if (counts.accepted) parts.push(t('summary.accepted', { n: counts.accepted }))
          if (counts.partial) parts.push(t('summary.partial', { n: counts.partial }))
          if (counts.rejected) parts.push(t('summary.rejected', { n: counts.rejected }))
          if (counts.needs_info) parts.push(t('summary.needsInfo', { n: counts.needs_info }))
          const head = buildSectionHead(t('replies.title', { n: replies.length }), parts.join(' · '))
          card.appendChild(head)

          const body = document.createElement('div')
          body.className = 'sa-replies-body'
          for (const reply of replies) {
            const item = byIndex.get(reply.index)
            const [labelKey, tone] = VERDICT_LABELS[reply.verdict] ?? ['verdict.fallback', 'accepted']
            const group = document.createElement('div')
            group.className = `sa-reply-item sa-tone-${tone}`
            group.setAttribute('data-sa-batch-at', String(Number.isFinite(reply.at) ? reply.at : 0))
            group.setAttribute('data-sa-reply-index', String(reply.index))

            const cardHead = document.createElement('div')
            cardHead.className = 'sa-reply-head'
            const index = document.createElement('span')
            index.className = 'sa-reply-index'
            index.textContent = t('reply.index', { n: reply.index })
            const verdict = document.createElement('span')
            verdict.className = `sa-a-verdict sa-reply-${tone}`
            verdict.textContent = t(labelKey)
            cardHead.append(index, verdict)
            group.appendChild(cardHead)

            const content = document.createElement('div')
            content.className = 'sa-reply-body'

            if (item !== undefined) {
              const q = document.createElement('div')
              q.className = 'sa-q'
              const quoteText = typeof item.quote === 'string' ? item.quote.trim() : ''
              if (quoteText !== '') {
                const qLabel = document.createElement('div')
                qLabel.className = 'sa-q-label'
                qLabel.textContent = t('label.quote')
                q.appendChild(qLabel)
                const quote = document.createElement('div')
                quote.className = 'sa-q-quote'
                quote.setAttribute('data-sa-field', 'quote')
                quote.textContent = quoteText
                quote.title = t('expand')
                // 超过三行时折叠；点一下展开，再点收回。
                quote.addEventListener('click', () => {
                  quote.className = quote.className.includes('sa-q-open') ? 'sa-q-quote' : 'sa-q-quote sa-q-open'
                })
                q.appendChild(quote)
              }
              if (typeof item.note === 'string' && item.note.trim() !== '') {
                const noteLabel = document.createElement('div')
                noteLabel.className = 'sa-q-label'
                noteLabel.textContent = t('label.note')
                q.appendChild(noteLabel)
                const note = document.createElement('div')
                note.className = 'sa-q-note'
                note.setAttribute('data-sa-field', 'note')
                note.textContent = item.note
                q.appendChild(note)
              }
              content.appendChild(q)
            }

            const a = document.createElement('div')
            a.className = 'sa-a'
            const aHead = document.createElement('div')
            aHead.className = 'sa-a-head'
            const aLabel = document.createElement('span')
            aLabel.className = 'sa-a-label'
            aLabel.textContent = item !== undefined ? t('label.answer') : t('reply.fallbackLabel', { n: reply.index })
            aHead.appendChild(aLabel)
            a.appendChild(aHead)
            const reason = document.createElement('div')
            reason.className = 'sa-a-reason'
            reason.setAttribute('data-sa-field', 'reason')
            reason.textContent = typeof reply.reason === 'string' ? reply.reason : ''
            a.appendChild(reason)
            if (typeof reply.next === 'string' && reply.next.trim() !== '') {
              const next = document.createElement('div')
              next.className = 'sa-a-next'
              next.setAttribute('data-sa-field', 'next')
              next.textContent = t('next.prefix', { text: reply.next })
              a.appendChild(next)
            }
            content.appendChild(a)
            group.appendChild(content)
            body.appendChild(group)
          }
          const wrap = collapsible(body, true)
          applyCollapsed(head, wrap, true)
          card.dataset.open = '1'
          head.addEventListener('click', (event) => {
            event.preventDefault()
            event.stopPropagation()
            applyCollapsed(head, wrap, wrap.dataset.open !== '1')
            card.dataset.open = wrap.dataset.open
          })
          card.append(wrap)
          return card
        }

        /** 跟着「已完成」一起收展：只同步答复卡片里的内容，卡片本身与标题始终留在外面。*/
        function syncReplyCollapse(origin) {
          for (const section of document.querySelectorAll('[data-sa-ui="replies"]')) {
            let node = section.previousElementSibling ?? null
            let footer = null
            while (node !== null) {
              if (node.getAttribute?.('data-sa-ui') === 'replies') {
                node = node.previousElementSibling ?? null
                continue
              }
              if (node.getAttribute?.('data-chat-flow-kind') === 'turn-process' || node.matches?.('[data-turn-process]')) footer = node
              break
            }
            const button = footer === null ? null : footer.matches?.('[data-turn-process]') ? footer : footer.querySelector?.('[data-turn-process]')
            // 只响应用户亲手点开/收起的那一下：同一状态不重复套用，之后答复区可以自己开合。
            if (button !== null && origin !== undefined && button !== origin) continue
            const head = typeof section.querySelector === 'function' ? section.querySelector('.sa-section-head') : null
            const wrap = typeof section.querySelector === 'function' ? section.querySelector('.sa-collapse') : null
            if (head === null || wrap === null) continue
            const open = button === null || button.getAttribute('aria-expanded') !== 'false'
            const seen = section.dataset.saFooterOpen
            if (seen !== undefined && seen === (open ? '1' : '0')) continue
            section.dataset.saFooterOpen = open ? '1' : '0'
            applyCollapsed(head, wrap, open)
            section.dataset.open = wrap.dataset.open
          }
        }

        /** 答复卡留在「已完成」之下：有轮次号时按轮次尾行定位，否则退回相邻节点查找。*/
        function placeReplyAfterTurnProcess(section, turn) {
          const parent = section.parentElement
          if (parent === null) return
          const block = footerBlockForTurn(turn)
          if (block !== null && block.parentElement !== null) {
            let cursor = block
            while (cursor.nextElementSibling !== null && cursor.nextElementSibling.getAttribute?.('data-sa-ui') === 'replies') {
              cursor = cursor.nextElementSibling
            }
            block.parentElement.insertBefore(section, cursor.nextSibling)
            return
          }
          let sibling = typeof section.nextElementSibling === 'undefined' ? null : section.nextElementSibling
          while (sibling !== null && (typeof sibling.getAttribute !== 'function' || sibling.getAttribute('data-chat-flow-kind') !== 'turn-process')) {
            sibling = sibling.nextElementSibling ?? null
          }
          if (sibling === null) return
          let cursor = sibling
          while (cursor.nextElementSibling !== null && (cursor.nextElementSibling.getAttribute?.('data-sa-ui') === 'replies')) {
            cursor = cursor.nextElementSibling
          }
          parent.insertBefore(section, cursor.nextSibling)
        }

        /**
         * 界面语言切换后：静态控件换文案，已提交卡片与面板按新语言重建。
         * 正在编辑的草稿仍留在输入框里，不会因为换语言丢掉。
         */
        function applyLocale() {
          safe(() => {
            annotateButton.textContent = t('annotate')
          })
          safe(() => {
            menuAnnotate.textContent = t('menu.annotate')
            menuCopy.textContent = t('menu.copy')
          })
          safe(() => {
            popInput.placeholder = t('pop.placeholder')
          })
          safe(() => {
            popImagesHint.textContent = t('pop.imagesHint')
          })
          safe(() => {
            popDelete.textContent = t('pop.delete')
            popCancel.textContent = t('pop.cancel')
            popSave.textContent = t('pop.save')
          })
          for (const node of document.querySelectorAll('[data-sa-ui="sent"]')) node.remove()
          for (const node of document.querySelectorAll('[data-sa-ui="replies"]')) node.remove()
          safe(() => renderSentCards())
          safe(() => renderReplySections())
          if (panelOpen) refreshPanel()
        }

        /**
         * 把答复挂到对应的「已发送的批注」卡片后面。
         *
         * 台账按「批注消息行」的锚点存；旧版本还可能把「已完成」尾行写进台账，
         * 渲染时先用 resolveLegacyAnchor 改认那一轮的批注消息行，再按 savedAt 分给批次。
         */
        function renderReplySections() {
          const sessionId = currentSessionId()
          if (sessionId === undefined) return
          const table = loadSent(sessionId)
          if (table.size === 0) return
          const batches = remoteReplyCache.get(sessionId) ?? []
          if (batches.length === 0) return
          for (const stale of document.querySelectorAll('[data-sa-ui="replies"]')) {
            const anchorKey = stale.getAttribute('data-anchor')
            const known = [...table.keys()].some((storedKey) => resolveLegacyAnchor(storedKey) === anchorKey)
            if (!known) stale.remove()
          }
          const byAnchor = new Map()
          for (const [storedKey, record] of table) {
            const anchorKey = resolveLegacyAnchor(storedKey)
            const current = byAnchor.get(anchorKey)
            if (current === undefined || current.record.savedAt < record.savedAt) {
              byAnchor.set(anchorKey, { record, turn: turnOfRecord(record, storedKey) })
            }
          }
          const records = [...byAnchor.entries()].sort((a, b) => a[1].record.savedAt - b[1].record.savedAt)
          const grouped = new Map()
          for (const batch of batches) {
            let target
            for (const [key, entry] of records) {
              if (entry.record.savedAt <= batch.at) target = key
            }
            if (target === undefined) continue
            const list = grouped.get(target) ?? []
            list.push(batch)
            grouped.set(target, list)
          }
          for (const [anchorKey, list] of grouped) {
            const escaped = cssEscape(anchorKey)
            const sentCards = document.querySelectorAll(`[data-sa-ui="sent"][data-anchor="${escaped}"]`)
            const sentCard = sentCards[sentCards.length - 1]
            if (sentCard === undefined) continue
            const items = byAnchor.get(anchorKey)?.record.items ?? []
            const turn = byAnchor.get(anchorKey)?.turn ?? null
            const signature = `${list.map((batch) => String(batch.at)).join('|')}#${items.length}`
            const existing = document.querySelector(`[data-sa-ui="replies"][data-anchor="${escaped}"]`)
            if (existing !== null) {
              if (existing.dataset.signature === signature) continue
              const fresh = buildReplySection(list, items)
              fresh.setAttribute('data-anchor', anchorKey)
              fresh.dataset.signature = signature
              existing.replaceWith(fresh)
              placeReplyAfterTurnProcess(fresh, turn)
              continue
            }
            const section = buildReplySection(list, items)
            section.setAttribute('data-anchor', anchorKey)
            section.dataset.signature = signature
            sentCard.parentElement?.insertBefore(section, sentCard.nextSibling)
            placeReplyAfterTurnProcess(section, turn)
          }
          syncReplyCollapse()
        }

        /* ------------------------------------------------------- 原生附件块（随消息发送） */

