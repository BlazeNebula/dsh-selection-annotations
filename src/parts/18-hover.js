        function cancelHoverOpen() {
          if (hoverOpenTimer !== null) window.clearTimeout(hoverOpenTimer)
          hoverOpenTimer = null
          hoverTargetId = null
        }

        function cancelHoverClose() {
          if (hoverCloseTimer !== null) window.clearTimeout(hoverCloseTimer)
          hoverCloseTimer = null
        }

        /** 没进入交互就自动收起；收起前按确认保存，已输入的内容不会丢。*/
        function scheduleHoverClose() {
          if (popoverSource !== 'hover') return
          if (hoverCloseTimer !== null) return
          if (popoverTouched || popoverHovered) return
          hoverCloseTimer = window.setTimeout(() => {
            hoverCloseTimer = null
            if (popover.dataset.open !== '1') return
            if (popoverSource !== 'hover') return
            if (popoverTouched || popoverHovered) return
            commitPopover(true)
          }, 250)
        }

        function hitHighlight(x, y) {
          for (const entry of highlightHits) {
            for (const rect of entry.rects) {
              if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) return entry
            }
          }
          return undefined
        }

        function onHoverMove(event) {
          const open = popover.dataset.open === '1'
          const hit = highlightHits.length === 0 ? undefined : hitHighlight(event.clientX, event.clientY)
          if (open) {
            // 主动点开的弹层不会被悬停逻辑关掉；只有悬停预览才自动收。
            if (popoverSource !== 'hover') return
            if (popoverTouched || popoverHovered) return
            if (hit !== undefined) return
            scheduleHoverClose()
            return
          }
          if (hit === undefined) {
            cancelHoverOpen()
            return
          }
          if (hoverTargetId === hit.id) return
          cancelHoverOpen()
          hoverTargetId = hit.id
          hoverOpenTimer = window.setTimeout(() => {
            hoverOpenTimer = null
            hoverTargetId = null
            if (popover.dataset.open === '1') return
            const target = annotations.find((item) => item.id === hit.id)
            if (target === undefined) return
            const rect = hit.rects[0]
            openEditPopover(target.id, { getBoundingClientRect: () => rect }, 'hover')
          }, HOVER_OPEN_DELAY_MS)
        }

        popover.addEventListener('mouseenter', () => {
          popoverHovered = true
          cancelHoverClose()
        })
        popover.addEventListener('mouseleave', () => {
          popoverHovered = false
          scheduleHoverClose()
        })
        popover.addEventListener(
          'pointerdown',
          () => {
            popoverTouched = true
            cancelHoverClose()
          },
          true,
        )
        popInput.addEventListener('input', () => {
          popoverTouched = true
        })
        let hoverMoveAt = 0
        document.addEventListener(
          'mousemove',
          (event) => {
            const now = Date.now()
            if (now - hoverMoveAt < 60) return
            hoverMoveAt = now
            onHoverMove(event)
          },
          true,
        )
        document.addEventListener('pointerdown', (event) => {
          if (popover.dataset.open !== '1') return
          const target = elementOf(event.target)
          if (target !== null && target.closest('[data-sa-ui="popover"]') !== null) return
          // 大图查看层是弹层的「子视图」：关它不该连带收起批注框。
          if (target !== null && target.closest('[data-sa-ui="viewer"]') !== null) return
          // 点框外算确认这次编辑：已经写下的内容不能因为一次误点就丢掉，
          // 但一个字都没写、也没加图的新批注属于「划完就反悔」，直接丢掉。
          commitPopover(true)
        }, true)
        document.addEventListener('keydown', (event) => {
          if (event.key !== 'Escape') return
          // 大图开着时 Esc 只收大图，弹层留在原地。
          if (imageViewer.dataset.open === '1') {
            closeImageViewer()
            return
          }
          hideToolbar()
          closePopover()
        })
        /* ------------------------------------------- 批注按钮 + 悬浮批注面板 */

        function sourceSummary(item) {
          const source = item.source
          if (source?.kind === 'message') return source.flowKind === 'user' ? t('source.user') : t('source.assistant')
          if (source?.kind === 'reply') return t('source.replyShort', { n: Number.isFinite(source.index) ? source.index : '-' })
          if (source?.kind === 'sent') return t('source.sentShort', { n: Number.isFinite(source.index) ? source.index : '-' })
          if (source?.kind === 'file') {
            const path = source.path ?? t('source.fileFallback')
            const where = Number.isFinite(source.lineStart) ? `${path}:${source.lineStart}` : path
            // 行号是渲染坐标推出来的，未必等于文件真行发——这一点要让用户看见。
            return source.textOrigin === 'source' ? where : `${where}${t('source.rendered')}`
          }
          return t('source.selection')
        }

        // 面板是挂在 body 上的原生 DOM（position: fixed），**完全不参与布局**：
        // 既不会把输入框顶上去，也不受 composer 行内样式/滚动容器影响。
        // 触发按钮则在 composer 的 input.right 槽位里，紧挨发送按钮。
        const panelRoot = document.createElement('div')
        panelRoot.className = 'sa-float'
        panelRoot.setAttribute('data-sa-ui', 'panel')
        panelRoot.style.display = 'none'
        const panelEl = document.createElement('div')
        panelEl.className = 'sa-panel'
        panelEl.setAttribute('data-sa-ui', 'panel')
        panelRoot.appendChild(panelEl)
        // 拖到列表末尾的空白处时，把批注移到末尾。
        panelEl.addEventListener('dragover', (event) => {
          event.preventDefault()
          event.dataTransfer.dropEffect = 'move'
        })
        panelEl.addEventListener('drop', (event) => {
          if (event.defaultPrevented) return
          const draggedId = event.dataTransfer.getData('text/plain')
          if (draggedId !== '') moveAnnotation(draggedId, null)
        })
        /** 面板尺寸变化时（例如手动拖高设置输入框）重新贴底。*/
        let panelRaf = 0
        let panelObserver = null
        /** 「已完成」收展状态变化后，把答复卡同步收展。*/
        let turnSyncRaf = 0
        // 输入框被手动拖高、或内容增减导致面板尺寸变化时，重新计算位置让底边不动。
        if (typeof ResizeObserver === 'function') {
          panelObserver = new ResizeObserver(() => {
            if (!panelOpen || panelRaf !== 0) return
            panelRaf = window.requestAnimationFrame(() => {
              panelRaf = 0
              positionPanel()
            })
          })
          panelObserver.observe(panelEl)
        }

        let panelOpen = false
        let panelAnchor = null
        /** 关闭动画结束后再隐藏面板，避免过渡被 display:none 打断。*/
        let panelHideTimer = 0
        /** 面板底部的图片设置是否展开。*/
        let imageSettingsOpen = false
        /** 面板底部的批注指令设置是否展开。*/
        let instructionSettingsOpen = false

