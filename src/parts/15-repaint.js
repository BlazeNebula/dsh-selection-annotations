        function scheduleRepaint() {
          if (repaintTimer !== null) return
          repaintTimer = window.setTimeout(() => {
            repaintTimer = null
            repaint()
          }, REPAINT_MS)
        }

        function repaint() {
          highlightHits = []
          // 历史回看先于高亮：新消息行刚出现时在这里完成配对，卡片随即补上。
          scanSentMessages()
          renderSentCards()
          renderReplySections()
          const nodes = []
          for (const item of annotations) {
            const range = locateRange(item)
            if (range === undefined) continue
            const rects = safe(() => [...range.getClientRects()]) ?? []
            if (rects.length > 0) highlightHits.push({ id: item.id, rects })
            let badged = false
            for (const rect of rects) {
              if (rect.width <= 0 || rect.height <= 0) continue
              const box = document.createElement('div')
              box.className = 'sa-hl'
              box.style.left = `${rect.left}px`
              box.style.top = `${rect.top}px`
              box.style.width = `${rect.width}px`
              box.style.height = `${rect.height}px`
              nodes.push(box)
              if (!badged) {
                badged = true
                // 角标是唯一的「从正文直接回到这条批注」的入口，必须可点击。
                const badge = document.createElement('button')
                badge.type = 'button'
                badge.className = 'sa-badge'
                badge.textContent = String(item.number)
                badge.style.left = `${rect.left - 11}px`
                badge.style.top = `${rect.top - 8}px`
                badge.title = item.note === '' ? item.quote : `${item.quote}\n\n批注：${item.note}`
                badge.addEventListener('click', (event) => {
                  event.preventDefault()
                  event.stopPropagation()
                  openEditPopover(item.id, badge)
                })
                nodes.push(badge)
              }
            }
          }
          // 一次性换掉整层：先清空再逐个插入会在帧间露出空白，看起来像界面闪了一下。
          if (typeof overlay.replaceChildren === 'function') {
            overlay.replaceChildren(...nodes)
          } else {
            overlay.textContent = ''
            for (const node of nodes) overlay.appendChild(node)
          }
        }

        /* ------------------------------------------------------------------ 选区工具条*/

        const toolbar = document.createElement('div')
        toolbar.className = 'sa-toolbar'
        toolbar.setAttribute('data-sa-ui', 'toolbar')
        const annotateButton = document.createElement('button')
        annotateButton.type = 'button'
        annotateButton.className = 'sa-btn'
        annotateButton.textContent = t('annotate')
        toolbar.appendChild(annotateButton)

        /* ------------------------------------------------------------------ 右键菜单*/

        // DSH 的右键菜单由 Electron 主进程用原生菜单构建，渲染层插件加不进去；
        // 这里在选区上自建一个同形菜单，把「批注」和「复制」放在右键位置。
        const contextMenu = document.createElement('div')
        contextMenu.className = 'sa-menu'
        contextMenu.setAttribute('data-sa-ui', 'menu')
        contextMenu.dataset.open = '0'
        const menuAnnotate = document.createElement('button')
        menuAnnotate.type = 'button'
        menuAnnotate.className = 'sa-menu-item'
        menuAnnotate.textContent = t('menu.annotate')
        const menuCopy = document.createElement('button')
        menuCopy.type = 'button'
        menuCopy.className = 'sa-menu-item'
        menuCopy.textContent = t('menu.copy')
        contextMenu.append(menuAnnotate, menuCopy)
        /** 打开菜单时的那份选区：菜单点下去时 document 的选区可能已经变了。*/
        let contextMenuSelection = null

        const popover = document.createElement('div')
        popover.className = 'sa-popover'
        popover.setAttribute('data-sa-ui', 'popover')
        const popTitle = document.createElement('div')
        popTitle.className = 'sa-pop-title'
        const popQuote = document.createElement('div')
        popQuote.className = 'sa-pop-quote'
        const popSource = document.createElement('div')
        popSource.className = 'sa-pop-src'
        const popInput = document.createElement('textarea')
        popInput.className = 'sa-pop-input'
        popInput.placeholder = t('pop.placeholder')
        /** 输入框默认跟随内容长高；用户一旦手动拖过高度，就不再覆盖他的选择。*/
        let popInputAutoHeight = true
        let popInputAutoValue = 0
        /** 已批注原文的高亮矩形缓存，供鼠标悬停命中检测。*/
        let highlightHits = []
        /** 悬停打开编辑框的定时器与目标。*/
        let hoverOpenTimer = null
        let hoverTargetId = null
        /** 悬停关闭的定时器。*/
        let hoverCloseTimer = null
        /** 鼠标是否停在弹层上。*/
        let popoverHovered = false
        /** 用户是否已经在这条弹层里动过手（点击或输入）——动过就不再自动关。*/
        let popoverTouched = false
        /** 弹层是谁打开的：主动点开，还是悬停预览。只有悬停的会被自动关。*/
        let popoverSource = 'manual'
        const popActions = document.createElement('div')
        popActions.className = 'sa-pop-actions'
        /** 当前正在编辑的这条批注挂的图片；只在内存里（二进制进不了 localStorage）。*/
        let popInputImages = []
        const popImages = document.createElement('div')
        popImages.className = 'sa-pop-images'
        const popImagesHint = document.createElement('div')
        popImagesHint.className = 'sa-pop-images-hint'
        popImagesHint.textContent = t('pop.imagesHint')

        /** 全屏查看批注图片：点缩略图放大，点任意处或 Esc 关闭。 */
        const imageViewer = document.createElement('div')
        imageViewer.className = 'sa-viewer'
        imageViewer.setAttribute('data-sa-ui', 'viewer')
        imageViewer.dataset.open = '0'
        const imageViewerImg = document.createElement('img')
        imageViewerImg.className = 'sa-viewer-img'
        imageViewerImg.alt = t('viewer.alt')
        imageViewer.appendChild(imageViewerImg)

        function openImageViewer(url, name) {
          if (typeof url !== 'string' || url === '') return
          imageViewerImg.src = url
          imageViewerImg.alt = typeof name === 'string' && name !== '' ? name : t('viewer.alt')
          imageViewer.dataset.open = '1'
        }

        function closeImageViewer() {
          if (imageViewer.dataset.open !== '1') return
          imageViewer.dataset.open = '0'
          imageViewerImg.removeAttribute('src')
        }

        imageViewer.addEventListener('click', () => closeImageViewer())
        const popDelete = document.createElement('button')
        popDelete.type = 'button'
        popDelete.className = 'sa-link sa-pop-delete'
        popDelete.textContent = t('pop.delete')
        const popSpacer = document.createElement('span')
        popSpacer.className = 'sa-pop-spacer'
        const popCancel = document.createElement('button')
        popCancel.type = 'button'
        popCancel.className = 'sa-link'
        popCancel.textContent = t('pop.cancel')
        const popSave = document.createElement('button')
        popSave.type = 'button'
        popSave.className = 'sa-btn'
        popSave.textContent = t('pop.save')
        popActions.append(popDelete, popSpacer, popCancel, popSave)
        popover.append(popTitle, popQuote, popSource, popInput, popImages, popActions)

