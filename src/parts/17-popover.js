        function renderPopImages() {
          popImages.textContent = ''
          for (const image of popInputImages) {
            const box = document.createElement('div')
            box.className = 'sa-pop-image'
            if (typeof image.url === 'string' && image.url !== '') {
              const thumb = document.createElement('img')
              thumb.className = 'sa-pop-thumb'
              thumb.src = image.url
              thumb.alt = image.name
              thumb.title = t('image.open')
              thumb.style.cursor = 'zoom-in'
              thumb.addEventListener('click', (event) => {
                event.preventDefault()
                event.stopPropagation()
                openImageViewer(image.url, image.name)
              })
              box.appendChild(thumb)
            } else {
              const fallback = document.createElement('span')
              fallback.className = 'sa-pop-thumb-fallback'
              fallback.textContent = image.name
              box.appendChild(fallback)
            }
            const remove = document.createElement('button')
            remove.type = 'button'
            remove.className = 'sa-pop-image-remove'
            remove.title = t('image.remove')
            remove.textContent = '×'
            remove.addEventListener('click', (event) => {
              event.preventDefault()
              event.stopPropagation()
              removePopImage(image.id)
            })
            box.appendChild(remove)
            popImages.appendChild(box)
          }
          popImages.appendChild(popImagesHint)
        }

        function removePopImage(id) {
          popInputImages = popInputImages.filter((image) => image.id !== id)
          renderPopImages()
        }

        /** 接收一批浏览器文件：压缩、取 data URL、限制条数与体积。 */
        async function addPopImages(files) {
          const picked = []
          for (const file of files) {
            if (file === null || typeof file !== 'object') continue
            if (typeof file.type !== 'string' || !file.type.startsWith('image/')) continue
            if (popInputImages.length + picked.length >= MAX_IMAGES_PER_ANNOTATION) continue
            if (Number(file.size) > MAX_IMAGE_BYTES) continue
            picked.push(file)
          }
          const rejected = files.length > 0 ? files.length - picked.length : 0
          for (const file of picked) {
            const processed = await compressImage(file)
            const dataUrl = await fileToDataUrl(processed)
            const url = safe(() => URL.createObjectURL(processed))
            // 已提交台账只存这张小图：清单里够看清是哪张，点开还能放大。
            const thumb = await downscaleDataUrl(processed, 480, 0.65)
            popInputImages.push({
              id: `img-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
              file: processed,
              name: typeof processed.name === 'string' && processed.name !== '' ? processed.name : t('image.alt'),
              url: typeof url === 'string' ? url : undefined,
              dataUrl,
              thumb,
              bytes: Number(processed.size) || 0,
            })
            renderPopImages()
          }
          if (rejected > 0) log(`[selection-annotations] 已忽略 ${rejected} 张图片（每图最多 ${MAX_IMAGES_PER_ANNOTATION} 张、单张不超过 ${MAX_IMAGE_BYTES} 字节）`)
          return picked.length
        }

        /** 换一条批注编辑时重置图片列表；对象 URL 交给浏览器回收，不主动 revoke 免伤已保存的引用。 */
        function resetPopImages(images) {
          popInputImages = Array.isArray(images) ? images.slice() : []
          renderPopImages()
        }

        /** 每次打开弹层都从「跟随内容」开始，并清掉上一次拖拽留下的固定高度。*/
        function resetPopInputHeight() {
          popInputAutoHeight = true
          popInputAutoValue = 0
          popInput.style.height = ''
        }

        /** 按内容行数长高；用户拖过高度之后这里什么都不做。*/
        function syncPopInputHeight() {
          if (!popInputAutoHeight) return
          const min = 62
          const max = Math.max(min, Math.round(window.innerHeight * 0.6))
          popInput.style.height = 'auto'
          const next = Math.max(min, Math.min(popInput.scrollHeight, max))
          popInput.style.height = `${next}px`
          popInputAutoValue = next
        }

        function showPopover(options) {
          popTitle.textContent = options.title
          popQuote.textContent = options.quote.length > 400 ? `${options.quote.slice(0, 400)}…` : options.quote
          popQuote.style.display = options.quote === '' ? 'none' : ''
          popSource.textContent = options.sourceText
          popInput.value = options.note
          resetPopImages(options.images)
          popoverMode = options.mode
          popoverTargetId = options.targetId ?? null
          popDelete.style.display = options.mode === 'edit' ? '' : 'none'
          hideToolbar()
          resetPopInputHeight()
          popoverTouched = false
          popoverHovered = false
          popoverSource = options.source === 'hover' ? 'hover' : 'manual'
          cancelHoverOpen()
          cancelHoverClose()
          popover.dataset.open = '1'
          if (options.rect !== undefined && options.rect !== null) placeAt(popover, options.rect, 10)
          syncPopInputHeight()
          safe(() => popInput.focus())
          safe(() => popInput.setSelectionRange(popInput.value.length, popInput.value.length))
        }

        function openCreatePopover() {
          const selection = pendingSelection
          if (selection === null) return
          popoverAnchor = { range: selection.range, quote: selection.quote, source: captureSource(selection.range) }
          showPopover({
            title: t('pop.createTitle'),
            quote: selection.quote,
            sourceText: describeSource(popoverAnchor.source),
            note: '',
            images: [],
            rect: safe(() => selection.range.getBoundingClientRect()),
            mode: 'create',
            targetId: null,
          })
        }

        /**
         * 修改一条既有批注。
         * 这是编号角标点击后的默认行为 ——点它是要改这一条，不是打开列表。
         * @param id - 目标批注 id。
         * @param anchor - 用来定位弹层的元素（角标或列表里的「编辑」按钮）。
         */
        function openEditPopover(id, anchor, source = 'manual') {
          const item = annotations.find((candidate) => candidate.id === id)
          if (item === undefined) return
          const measured = safe(() => anchor?.getBoundingClientRect())
          const rect =
            measured ??
            {
              left: window.innerWidth / 2 - 40,
              top: window.innerHeight / 2,
              width: 80,
              height: 0,
              right: window.innerWidth / 2 + 40,
              bottom: window.innerHeight / 2,
            }
          popoverAnchor = null
          showPopover({
            title: t('pop.editTitle', { n: item.number }),
            quote: item.quote,
            sourceText: describeSource(item.source),
            note: item.note,
            images: Array.isArray(item.images) ? item.images : [],
            rect,
            mode: 'edit',
            targetId: id,
            source,
          })
        }

        function closePopover() {
          popover.dataset.open = '0'
          // 页面刷新、关闭或插件卸载前再存一次：只靠状态变更时保存会丢掉最后几秒的编辑。
          safe(() => popInput.blur())
          popoverAnchor = null
          popoverTargetId = null
          popoverMode = 'create'
        }

        /**
         * 位置精修：把渲染坐标升级成文件原文坐标。
         *
         * 刻意与「创建批注」解而——批注先落地，精修只是事后补的。这样任何读取或定位失败都
         * 只会让这条批注停在渲染坐标，而*不会让它根本建不出来**。（教训：上一版把精修放在
         * 创建之前，一次 remote 获取抛错就把整条创建跳过了。）
         * @param id - 要精修的批注 id。
         * @param source - 捕获时的来源（渲染坐标）。
         * @param quote - 引文。
         */
        /** 把精修失败的原因挂到那条批注上，面板会显示出来。*/
        function markRefineReason(id, reason) {
          let hit = false
          annotations = annotations.map((item) => {
            if (item.id !== id) return item
            hit = true
            return { ...item, refineReason: reason }
          })
          if (!hit) return
          emit()
          // 原因只显示在面板里、不进载荷，所以不需要为此重传附件。
          scheduleRepaint()
        }

        function refineSourcePosition(id, source, quote) {
          const task = (async () => {
            const precise = await safe(() =>
              resolveSourcePosition(source, quote, (reason) => markRefineReason(id, reason)),
            )
            if (precise === undefined) return
            let hit = false
            annotations = annotations.map((item) => {
              if (item.id !== id) return item
              hit = true
              return { ...item, source: { ...item.source, ...precise } }
            })
            if (!hit) return
            emit()
            // 上传正在等我们时不必再排一次（它会拿到最新结果）；否则补一次。
            if (!syncing) scheduleSync()
            scheduleRepaint()
          })()
          const guarded = task.catch((err) => {
            warn('[selection-annotations] 位置精修失败（不影响这条批注）：', err)
          })
          pendingRefine = guarded
          void guarded.then(() => {
            if (pendingRefine === guarded) pendingRefine = undefined
          })
          return guarded
        }

        /** 新划出来但既没写文字也没加图：被动确认（点框外、悬停收起）时应当丢弃。*/
        function shouldDiscardEmpty(mode, note, images) {
          if (mode === 'edit') return false
          if (typeof note === 'string' && note.trim() !== '') return false
          return !Array.isArray(images) || images.length === 0
        }

        /**
         * 保存并关闭弹层。
         * @param discardEmpty - 「被动确认」传 true（点框外、悬停收起）：新划出来但既没写文字也没加图的批注直接丢弃，
         *   避免每次误点都留下一条空批注。显式点「保存」时仍然允许空批注（只标记原文）。
         */
        function commitPopover(discardEmpty = false) {
          if (popoverMode === 'edit') {
            const target = popoverTargetId
            const images = popInputImages
            const note = popInput.value
            closePopover()
            if (target !== null) updateAnnotation(target, note, images)
            return
          }
          const anchor = popoverAnchor
          if (anchor === null) return
          const note = popInput.value
          const images = popInputImages
          if (discardEmpty && shouldDiscardEmpty(popoverMode, note, images)) {
            closePopover()
            return
          }
          closePopover()
          // 先创建：这一段绝不能依赖任何可能失败的东西。
          const created = addAnnotation({
            quote: anchor.quote,
            note,
            images,
            source: anchor.source,
            liveRange: anchor.range,
          })
          safe(() => window.getSelection()?.removeAllRanges())
          // 再异步把位置精修到原文坐标；失败只记日志。
          if (created !== undefined) {
            refineSourcePosition(created.id, anchor.source, anchor.quote).catch((err) => {
              warn('[selection-annotations] 位置精修失败（不影响这条批注）：', err)
            })
          }
        }

        function deleteFromPopover() {
          const target = popoverTargetId
          closePopover()
          if (target !== null) removeAnnotation(target)
        }

        annotateButton.addEventListener('mousedown', (event) => {
          // 保住选区：点按钮不应清掉它。
          event.preventDefault()
        })
        annotateButton.addEventListener('click', (event) => {
          event.preventDefault()
          openCreatePopover()
        })
        menuAnnotate.addEventListener('mousedown', (event) => {
          // 和上方按钮一样保住选区。
          event.preventDefault()
        })
        menuAnnotate.addEventListener('click', (event) => {
          event.preventDefault()
          event.stopPropagation()
          const selection = contextMenuSelection ?? pendingSelection
          closeContextMenu()
          if (selection === null) return
          pendingSelection = selection
          openCreatePopover()
        })
        menuCopy.addEventListener('mousedown', (event) => {
          event.preventDefault()
        })
        menuCopy.addEventListener('click', (event) => {
          event.preventDefault()
          const selection = contextMenuSelection ?? pendingSelection
          closeContextMenu()
          if (selection !== null) copyPlainText(selection.quote)
        })
        popCancel.addEventListener('click', () => closePopover())
        popSave.addEventListener('click', () => {
          commitPopover()
        })
        popDelete.addEventListener('click', () => deleteFromPopover())
        popInput.addEventListener('keydown', (event) => {
          if (event.key === 'Escape') closePopover()
          if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) commitPopover()
        })
        popInput.addEventListener('input', () => {
          syncPopInputHeight()
        })
        // 原生 resize 手柄拖过之后，实际高度会与自动值不同 —— 从此不再覆盖用户的选择。
        popInput.addEventListener('pointerup', () => {
          if (!popInputAutoHeight) return
          if (Math.abs(popInput.offsetHeight - popInputAutoValue) > 2) popInputAutoHeight = false
        })
        // 粘贴图片：截图直接进批注，不用先存成文件再拖进来。
        popInput.addEventListener('paste', (event) => {
          const data = event.clipboardData
          if (data === null || data === undefined) return
          const files = [...(data.files ?? [])]
          if (files.length === 0) {
            for (const entry of data.items ?? []) {
              if (entry.kind !== 'file') continue
              const file = safe(() => entry.getAsFile())
              if (file !== null && file !== undefined) files.push(file)
            }
          }
          const images = files.filter((file) => typeof file?.type === 'string' && file.type.startsWith('image/'))
          if (images.length === 0) return
          event.preventDefault()
          void addPopImages(images)
        })
        popover.addEventListener('dragover', (event) => {
          if (event.dataTransfer === null || event.dataTransfer === undefined) return
          event.preventDefault()
        })
        popover.addEventListener('drop', (event) => {
          const files = [...(event.dataTransfer?.files ?? [])]
          if (files.length === 0) return
          event.preventDefault()
          void addPopImages(files)
        })

        /* --------------------------------------------------------------- 悬停预览 */

