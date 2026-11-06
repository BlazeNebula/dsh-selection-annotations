        function el(tag, className, text) {
          const created = document.createElement(tag)
          if (className !== undefined) created.className = className
          if (text !== undefined) created.textContent = text
          return created
        }

        function button(className, text, onClick) {
          const created = el('button', className, text)
          created.type = 'button'
          created.addEventListener('click', onClick)
          return created
        }

        /** 面板贴着按钮放，优先在按钮上方；高度按上下可用空间自适应。*/
        function positionPanel() {
          if (!panelOpen || panelAnchor === null) return
          const rect = safe(() => panelAnchor.getBoundingClientRect())
          if (rect === undefined) return
          const width = panelEl.offsetWidth || 360
          const viewport = window.innerHeight
          const spaceAbove = rect.top - 16
          const spaceBelow = viewport - rect.bottom - 16
          // 上方放得下就优先上方；上方太窄时改用下方，两者都窄就取更高的一侧并封顶到 72vh。
          const preferAbove = spaceAbove >= 260 || spaceBelow < 260
          const available = Math.max(200, Math.min(preferAbove ? spaceAbove : spaceBelow, viewport * 0.72))
          panelEl.style.maxHeight = `${Math.round(available)}px`
          const height = panelEl.offsetHeight || 240
          const left = Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8))
          const above = rect.top - height - 8
          const top = above >= 8 ? above : Math.min(rect.bottom + 8, viewport - height - 8)
          panelRoot.style.left = `${left}px`
          panelRoot.style.top = `${Math.max(8, top)}px`
        }

        function renderPanel() {
          panelEl.textContent = ''

          const panelHead = el('div', 'sa-panel-head')
          panelHead.appendChild(el('span', 'sa-panel-title', t('panel.title')))
          const build = el('span', 'sa-build', `@u2a5f/dsh-selection-annotations build.${PLUGIN_BUILD}`)
          build.title = `@u2a5f/dsh-selection-annotations build.${PLUGIN_BUILD}`
          panelHead.appendChild(build)
          const meta = el('div', 'sa-panel-meta')
          const hint = el('span', 'sa-panel-hint', t('panel.foot'))
          hint.title = t('panel.foot')
          meta.appendChild(hint)
          meta.appendChild(el('span', 'sa-panel-count', t('panel.count', { n: annotations.length })))
          if (annotations.length > 0) {
            meta.appendChild(button('sa-foot-action', t('panel.clear'), () => clearAnnotations()))
          }
          panelHead.appendChild(meta)
          panelEl.appendChild(panelHead)
          const panelBody = el('div', 'sa-panel-body')

          if (annotations.length === 0) {
            panelBody.appendChild(el('div', 'sa-panel-empty', t('panel.empty')))
          }

          for (const item of annotations) {
            const row = el('div', 'sa-item')
            row.draggable = true
            row.dataset.id = item.id
            row.addEventListener('dragstart', (event) => {
              event.dataTransfer.setData('text/plain', item.id)
              event.dataTransfer.effectAllowed = 'move'
              row.className = 'sa-item sa-dragging'
            })
            row.addEventListener('dragend', () => {
              for (const node of panelEl.querySelectorAll('.sa-item')) {
                node.className = node.className.replace(' sa-drop-before', '').replace(' sa-dragging', '')
              }
            })
            row.addEventListener('dragover', (event) => {
              event.preventDefault()
              event.dataTransfer.dropEffect = 'move'
              row.className = 'sa-item sa-drop-before'
            })
            row.addEventListener('dragleave', () => {
              row.className = 'sa-item'
            })
            row.addEventListener('drop', (event) => {
              event.preventDefault()
              event.stopPropagation()
              const draggedId = event.dataTransfer.getData('text/plain')
              if (draggedId !== '') moveAnnotation(draggedId, item.id)
            })
            const head = el('div', 'sa-item-head')
            const grip = el('span', 'sa-drag-handle', '⠿')
            grip.title = t('panel.drag')
            grip.setAttribute('aria-label', t('panel.drag'))
            head.appendChild(grip)
            head.appendChild(el('span', 'sa-item-num', String(item.number)))
            const summary = el('span', 'sa-item-src', sourceSummary(item))
            summary.title = summary.textContent
            head.appendChild(summary)
            const actions = el('div', 'sa-item-actions')
            actions.appendChild(button('sa-item-action', t('panel.edit'), () => openEditPopover(item.id, head)))
            actions.appendChild(button('sa-item-action sa-danger', t('panel.delete'), () => removeAnnotation(item.id)))
            head.appendChild(actions)
            row.appendChild(head)
            if (item.quote !== '') {
              const q = el('div', 'sa-item-q')
              q.appendChild(el('div', 'sa-item-label', t('panel.quote')))
              const quote = el('div', 'sa-item-quote', item.quote)
              quote.title = t('expand')
              quote.addEventListener('click', () => {
                quote.className = quote.className.includes('sa-q-open') ? 'sa-item-quote' : 'sa-item-quote sa-q-open'
              })
              q.appendChild(quote)
              row.appendChild(q)
            }
            if (item.note !== '') {
              const a = el('div', 'sa-item-a')
              a.appendChild(el('div', 'sa-item-label', t('panel.note')))
              a.appendChild(el('div', 'sa-item-note', item.note))
              row.appendChild(a)
            }
            if (Array.isArray(item.images) && item.images.length > 0) {
              const gallery = el('div', 'sa-item-images')
              for (const image of item.images) {
                if (typeof image?.url !== 'string' || image.url === '') continue
                const thumb = document.createElement('img')
                thumb.className = 'sa-item-thumb'
                thumb.src = image.url
                thumb.alt = typeof image.name === 'string' ? image.name : t('image.alt')
                thumb.title = t('image.open')
                thumb.style.cursor = 'zoom-in'
                thumb.addEventListener('click', (event) => {
                  event.preventDefault()
                  event.stopPropagation()
                  openImageViewer(image.url, image.name)
                })
                gallery.appendChild(thumb)
              }
              if (gallery.childNodes.length > 0) row.appendChild(gallery)
            }
            if (typeof item.refineReason === 'string' && item.refineReason !== '') {
              const why = el('div', 'sa-item-why', t('panel.refineFailed', { reason: item.refineReason }))
              why.style.fontSize = '11px'
              why.style.lineHeight = '1.5'
              why.style.opacity = '0.8'
              why.style.color = 'var(--dsw-alias-text-tertiary, GrayText)'
              why.style.marginTop = '2px'
              row.appendChild(why)
            }
            panelBody.appendChild(row)
          }

          panelBody.appendChild(imageSettingsRow())
          panelBody.appendChild(instructionSettingsRow())
          panelEl.appendChild(panelBody)
        }

        /** 面板底部的图片设置：压缩开关、JPEG 质量、触发压缩的最短边。 */
        function imageSettingsRow() {
          const settings = imageSettingsOf()
          const box = el('div', 'sa-settings')
          const head = el('div', 'sa-settings-head')
          const toggle = button('sa-link', imageSettingsOpen ? t('settings.imagesOpen') : t('settings.imagesClosed'), () => {
            imageSettingsOpen = !imageSettingsOpen
            refreshPanel()
          })
          head.appendChild(toggle)
          head.appendChild(
            el(
              'span',
              'sa-hint',
              settings.compress
                ? t('settings.imagesOn', { n: Math.round(settings.quality * 100) })
                : t('settings.imagesOff'),
            ),
          )
          box.appendChild(head)
          if (!imageSettingsOpen) return box

          const compressRow = el('label', 'sa-setting')
          const compress = document.createElement('input')
          compress.type = 'checkbox'
          compress.checked = settings.compress
          compress.addEventListener('change', () => {
            imageSettingsOf().compress = compress.checked
            persistImageSettings()
            refreshPanel()
          })
          compressRow.append(compress, document.createTextNode(t('settings.compress')))
          box.appendChild(compressRow)

          const qualityRow = el('label', 'sa-setting')
          const quality = document.createElement('input')
          quality.type = 'range'
          quality.min = '0.5'
          quality.max = '1'
          quality.step = '0.05'
          quality.value = String(settings.quality)
          const qualityText = el('span', 'sa-setting-value', `${Math.round(settings.quality * 100)}%`)
          quality.addEventListener('input', () => {
            imageSettingsOf().quality = Number(quality.value)
            qualityText.textContent = `${Math.round(Number(quality.value) * 100)}%`
            persistImageSettings()
          })
          qualityRow.append(document.createTextNode(t('settings.quality')), quality, qualityText)
          box.appendChild(qualityRow)

          const sizeRow = el('label', 'sa-setting')
          const size = document.createElement('input')
          size.type = 'number'
          size.className = 'sa-setting-number'
          size.min = '0'
          size.max = '4096'
          size.step = '10'
          size.value = String(settings.minSize)
          size.addEventListener('change', () => {
            const next = Number(size.value)
            imageSettingsOf().minSize = Number.isFinite(next)
              ? Math.min(4096, Math.max(0, Math.round(next)))
              : DEFAULT_IMAGE_SETTINGS.minSize
            persistImageSettings()
          })
          sizeRow.append(document.createTextNode(t('settings.minSizeBefore')), size, document.createTextNode(t('settings.minSizeAfter')))
          box.appendChild(sizeRow)

          return box
        }

        /** 面板底部的批注指令设置：可编辑，一键恢复默认。*/
        function instructionSettingsRow() {
          const box = el('div', 'sa-settings')
          const head = el('div', 'sa-settings-head')
          const toggle = button('sa-link', instructionSettingsOpen ? t('settings.instructionOpen') : t('settings.instructionClosed'), () => {
            instructionSettingsOpen = !instructionSettingsOpen
            refreshPanel()
          })
          head.appendChild(toggle)
          head.appendChild(el('span', 'sa-hint', isDefaultInstruction(instructionOf()) ? t('settings.default') : t('settings.customized')))
          box.appendChild(head)
          if (!instructionSettingsOpen) return box

          const area = document.createElement('textarea')
          area.className = 'sa-setting-textarea'
          area.rows = 6
          area.value = instructionOf()
          area.addEventListener('input', () => persistInstructionSettings(area.value))
          box.appendChild(area)

          const actions = el('div', 'sa-settings-actions')
          actions.appendChild(
            button('sa-link', t('settings.restore'), () => {
              persistInstructionSettings(defaultInstruction())
              refreshPanel()
            }),
          )
          actions.appendChild(el('span', 'sa-hint', t('settings.instrHint')))
          box.appendChild(actions)

          return box
        }

        /** 面板内容高度变化时重渲染并重新定位；面板在上方时底边因此保持不动。*/
        function refreshPanel() {
          renderPanel()
          if (panelOpen) positionPanel()
        }

        function openPanel(anchor) {
          panelOpen = true
          panelAnchor = anchor
          if (panelHideTimer !== 0) {
            window.clearTimeout(panelHideTimer)
            panelHideTimer = 0
          }
          panelRoot.style.display = ''
          panelRoot.dataset.open = '0'
          renderPanel()
          positionPanel()
          // 先强制回流，确保从隐藏态开始过渡。
          void panelRoot.offsetHeight
          panelRoot.dataset.open = '1'
          emit()
        }

        function closePanel() {
          if (!panelOpen) return
          panelOpen = false
          panelAnchor = null
          panelRoot.dataset.open = '0'
          if (panelHideTimer !== 0) window.clearTimeout(panelHideTimer)
          panelHideTimer = window.setTimeout(() => {
            panelHideTimer = 0
            if (!panelOpen) panelRoot.style.display = 'none'
          }, 180)
          emit()
        }

        function togglePanel(anchor) {
          if (panelOpen) closePanel()
          else openPanel(anchor)
        }

        document.addEventListener(
          'pointerdown',
          (event) => {
            if (!panelOpen) return
            const target = elementOf(event.target)
            if (target === null) return
            if (target.closest('[data-sa-ui="panel"]') !== null) return
            if (target.closest('[data-sa-ui="popover"]') !== null) return
            if (target.closest('.sa-chip') !== null) return
            closePanel()
          },
          true,
        )
        document.addEventListener('keydown', (event) => {
          if (event.key === 'Escape') closePanel()
        })

        // 批注集合或面板开合变化时重渲染面板正文（订阅由 store 的 emit 驱动）。
        subscribe(() => {
          if (panelOpen) {
            renderPanel()
            positionPanel()
          }
        })

        /** composer 工具行里的触发按钮（紧挨发送按钮），只占一个紧凑控件位。*/
