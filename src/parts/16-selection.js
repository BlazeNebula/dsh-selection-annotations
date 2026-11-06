        function isExcluded(node) {
          const element = elementOf(node)
          if (element === null) return true
          if (element.closest('[data-sa-ui]') !== null && element.closest('[data-sa-ui="replies"]') === null && element.closest('[data-sa-ui="sent"]') === null) return true
          if (element.closest('[data-composer-card],[data-composer-input],[data-input-scroll]') !== null) return true
          if (element.closest('input,textarea,[contenteditable="true"]') !== null) return true
          return false
        }

        function readSelection() {
          const selection = window.getSelection()
          if (selection === null || selection.rangeCount === 0 || selection.isCollapsed) return null
          const range = selection.getRangeAt(0)
          const quote = range.toString()
          if (quote.trim() === '') return null
          if (isExcluded(range.startContainer) || isExcluded(range.endContainer)) return null
          return { range, quote }
        }

        function hideToolbar() {
          toolbar.dataset.open = '0'
        }

        function closeContextMenu() {
          if (contextMenu.dataset.open !== '1') return
          contextMenu.dataset.open = '0'
          contextMenuSelection = null
        }

        function openContextMenu(selection, x, y) {
          contextMenuSelection = selection
          contextMenu.dataset.open = '1'
          const width = contextMenu.offsetWidth || 132
          const height = contextMenu.offsetHeight || 64
          contextMenu.style.left = `${Math.max(8, Math.min(x, window.innerWidth - width - 8))}px`
          contextMenu.style.top = `${Math.max(8, Math.min(y, window.innerHeight - height - 8))}px`
        }

        function copyPlainText(text) {
          if (typeof text !== 'string' || text === '') return
          try {
            if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
              navigator.clipboard.writeText(text).catch(() => {})
              return
            }
          } catch {
            /* 剪贴板接口不可用时走下面的兜底*/
          }
          safe(() => {
            const area = document.createElement('textarea')
            area.value = text
            area.style.position = 'fixed'
            area.style.opacity = '0'
            document.body.appendChild(area)
            area.select()
            document.execCommand('copy')
            area.remove()
          })
        }

        /** 只在正文里已选中文字时接管右键；其余位置保持系统原样。*/
        function onContextMenu(event) {
          const target = elementOf(event.target)
          if (target !== null && target.closest('[data-sa-ui]') !== null && target.closest('[data-sa-ui="replies"]') === null && target.closest('[data-sa-ui="sent"]') === null) return
          const selection = readSelection()
          if (selection === null) return
          event.preventDefault()
          event.stopPropagation()
          pendingSelection = selection
          hideToolbar()
          closeContextMenu()
          openContextMenu(selection, event.clientX, event.clientY)
        }

        function placeAt(element, rect, gap) {
          const width = element.offsetWidth || 80
          const height = element.offsetHeight || 32
          const left = Math.max(8, Math.min(rect.left + rect.width / 2 - width / 2, window.innerWidth - width - 8))
          const above = rect.top - height - gap
          const top = above < 8 ? Math.min(rect.bottom + gap, window.innerHeight - height - 8) : above
          element.style.left = `${left}px`
          element.style.top = `${Math.max(8, top)}px`
        }

        /** DSH 0.2.2 自带的「引用文本」浮层：把批注按钮让到它上方，避免互相遮挡。*/
        function placeAvoidingTextInteraction(element) {
          const surface = document.querySelector('[data-text-interaction-surface]')
          if (surface === null || surface.getAttribute('aria-hidden') === 'true') return false
          const rect = safe(() => surface.getBoundingClientRect())
          if (rect === undefined || rect.width < 2 || rect.height < 2) return false
          const width = element.offsetWidth || 80
          const height = element.offsetHeight || 32
          const left = Math.max(8, Math.min(rect.left + rect.width / 2 - width / 2, window.innerWidth - width - 8))
          const above = rect.top - height - 8
          const top = above >= 8 ? above : Math.min(rect.bottom + 8, window.innerHeight - height - 8)
          element.style.left = `${left}px`
          element.style.top = `${Math.max(8, top)}px`
          return true
        }

        function onSelectionChange() {
          window.clearTimeout(settleTimer)
          settleTimer = window.setTimeout(() => {
            settleTimer = null
            const selection = readSelection()
            if (selection === null) {
              hideToolbar()
              return
            }
            const rect = safe(() => selection.range.getBoundingClientRect())
            if (rect === undefined || (rect.width === 0 && rect.height === 0)) {
              hideToolbar()
              return
            }
            pendingSelection = selection
            toolbar.dataset.open = '1'
            placeAt(toolbar, rect, 8)
            placeAvoidingTextInteraction(toolbar)
            // DSH 的引用浮层可能比我们晚一步挂上，再对齐一次。
            window.clearTimeout(avoidTimer)
            avoidTimer = window.setTimeout(() => {
              avoidTimer = 0
              if (toolbar.dataset.open === '1') placeAvoidingTextInteraction(toolbar)
            }, 140)
          }, SETTLE_MS)
        }

        /** 弹层两种用途：新建（来自当前选区）与修改（某一条既有批注）。*/
        let popoverMode = 'create'
        let popoverAnchor = null
        let popoverTargetId = null

        /** 把当前图片列表画出来：缩略图 + 删除按钮，空列表时只留一行提示。 */
