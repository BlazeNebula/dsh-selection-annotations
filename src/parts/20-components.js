        function AnnotateButton(props) {
          const [local, setLocal] = React.useState(() => ({ items: snapshot(), open: panelOpen }))
          const propSessionId = props?.sessionId
          const propInputActions = props?.inputActions
          if (typeof propSessionId === 'string' && propSessionId !== '') latestSessionId = propSessionId
          if (propInputActions !== undefined && propInputActions !== null) latestInputActions = propInputActions

          React.useEffect(() => subscribe(() => setLocal({ items: snapshot(), open: panelOpen })), [])
          React.useEffect(() => {
            if (typeof propSessionId === 'string' && propSessionId !== '') adoptSession(propSessionId)
          }, [propSessionId])

          const count = local.items.length
          return h(
            'button',
            {
              className: local.open ? 'sa-chip sa-chip-open' : 'sa-chip',
              type: 'button',
              title: count === 0 ? t('chip.emptyTitle') : t('chip.title'),
              onClick: (event) => togglePanel(event.currentTarget),
            },
            count === 0 ? t('chip.label') : t('chip.count', { n: count }),
          )
        }
        /* ------------------------------------------------------------------ 生命周期 */

        ctx.effect(() => {
          const style = document.createElement('style')
          style.setAttribute('data-selection-annotations', '')
          style.textContent = CSS
          document.head.appendChild(style)
          document.body.append(overlay, toolbar, contextMenu, popover, panelRoot, imageViewer)
          // 独立于批注集合：即使现在一条批注都没有，也要能摘掉重载前遗留的孤儿附件。
          orphanTimer = window.setInterval(() => {
            const shell = inputShell()
            if (shell !== undefined) sweepOrphans(shell)
          }, ORPHAN_SWEEP_MS)
          // 页面刷新、关闭或插件卸载前再存一次：只靠状态变更时保存会丢掉最后几秒的编辑。
          const onUnload = () => saveDraft(annotationsSession)
          window.addEventListener('beforeunload', onUnload)
          window.addEventListener('pagehide', onUnload)
          return () => {
            saveDraft(annotationsSession)
            window.removeEventListener('beforeunload', onUnload)
            window.removeEventListener('pagehide', onUnload)
            cancelHoverOpen()
            cancelHoverClose()
            // 历史卡片是我们插进消息行里的节点，插件卸载时要一并摘掉。
            for (const node of document.querySelectorAll('[data-sa-ui="sent"]')) node.remove()
            for (const node of document.querySelectorAll('[data-sa-ui="replies"]')) node.remove()
            style.remove()
            if (orphanTimer !== null) window.clearInterval(orphanTimer)
            orphanTimer = null
            if (watchTimer !== null) window.clearInterval(watchTimer)
            watchTimer = null
            if (consumeTimer !== null) window.clearTimeout(consumeTimer)
            consumeTimer = null
            overlay.remove()
            toolbar.remove()
            contextMenu.remove()
            popover.remove()
            if (panelObserver !== null) {
              panelObserver.disconnect()
              panelObserver = null
            }
            if (panelRaf !== 0) {
              window.cancelAnimationFrame(panelRaf)
              panelRaf = 0
            }
            panelRoot.remove()
            imageViewer.remove()
          }
        })

        // 逐条答复由宿主写进会话文件：轮询本机路由，把新答复挂到历史卡片后面。
        ctx.effect(() => {
            let timer = null
          let disposed = false
          const tick = async () => {
            timer = null
            if (disposed) return
            try {
              if (document.visibilityState !== 'hidden') {
                const sessionId = currentSessionId()
                if (sessionId !== undefined) {
          const remote = await pullRemoteSession(sessionId)
                  if (remote !== null && remote !== undefined && absorbRemoteReplies(sessionId, remote)) {
                    scheduleRepaint()
                  }
                }
              }
            } catch {
              /* 拉取失败：下一轮再话*/
            } finally {
              if (!disposed) {
                timer = window.setTimeout(tick, REPLY_POLL_MS)
                // 测试环境（Node）里要unref，否则轮询定时器会撑住测试进程不退出。
                if (typeof timer?.unref === 'function') timer.unref()
              }
            }
          }
          timer = window.setTimeout(tick, REPLY_POLL_MS)
          if (typeof timer?.unref === 'function') timer.unref()
          return () => {
            disposed = true
              if (timer !== null) window.clearTimeout(timer)
            timer = null
          }
        })

        ctx.effect(() => {
          document.addEventListener('selectionchange', onSelectionChange)
          document.addEventListener('contextmenu', onContextMenu, true)
          // 菜单外的按下与 Escape 都要关掉；菜单内的按下不能关，否则点不到菜单项。
          const onMenuPointerDown = (event) => {
            const target = elementOf(event.target)
            if (target !== null && target.closest('[data-sa-ui="menu"]') !== null) return
            closeContextMenu()
          }
          const onMenuKeydown = (event) => {
            if (event.key === 'Escape') closeContextMenu()
          }
          document.addEventListener('pointerdown', onMenuPointerDown, true)
          document.addEventListener('keydown', onMenuKeydown, true)
          const onViewport = () => {
            scheduleRepaint()
            positionPanel()
            closeContextMenu()
          }
          window.addEventListener('scroll', onViewport, true)
          window.addEventListener('resize', onViewport)
          // 只对「不是我们自己写出来的」DOM 变化重绘：否则 repaint 写 overlay 会再次触发观察器，
          // 形成 120ms 自激循环，把输入卡死。
          const observer = new MutationObserver((records) => {
            for (const record of records) {
              const target = elementOf(record.target)
              if (target !== null && target.closest('[data-sa-ui]') !== null) continue
              scheduleRepaint()
              return
            }
          })
          observer.observe(document.body, { childList: true, subtree: true, characterData: true })
          return () => {
            document.removeEventListener('selectionchange', onSelectionChange)
            document.removeEventListener('contextmenu', onContextMenu, true)
            document.removeEventListener('pointerdown', onMenuPointerDown, true)
            document.removeEventListener('keydown', onMenuKeydown, true)
            window.removeEventListener('scroll', onViewport, true)
            window.removeEventListener('resize', onViewport)
            observer.disconnect()
          }
        })

        ctx.effect(() => {
          const observer = new MutationObserver((records) => {
            let touched = null
            for (const record of records) {
              const element = elementOf(record.target)
              if (element !== null && element.getAttribute('data-turn-process') !== null) {
                touched = element
                break
              }
            }
            if (touched === null || turnSyncRaf !== 0) return
            turnSyncRaf = window.requestAnimationFrame(() => {
              turnSyncRaf = 0
              syncReplyCollapse(touched)
            })
          })
          observer.observe(document.body, { subtree: true, attributes: true, attributeFilter: ['aria-expanded', 'data-open'] })
          return () => {
            observer.disconnect()
            if (turnSyncRaf !== 0) {
              window.cancelAnimationFrame(turnSyncRaf)
              turnSyncRaf = 0
            }
          }
        })

        ctx.slots.inject('conversation.input.right', () =>
          ctx.slots.register({ name: 'conversation.input.right', id: 'selection-annotations', order: 30 }, AnnotateButton),
        )

        /**
         * `annotation_replies` 工具调用的原生卡片：直接读工具参数里的replies。
         *
         * 工具调用本身就在会话里渲染（ToolCallTree 的tool.call.toolview 键位），
         * 不需要宿主再存一份、也不需要客户端轮询路由。
         */
        function AnnotationRepliesCard(props) {
          const phase = props?.phase
          const block = props?.block
          let replies = []
          try {
            const raw = phase === 'result' ? block?.call?.argsRaw : block?.argsRaw
            const parsed = JSON.parse(raw ?? '')
            if (Array.isArray(parsed?.replies)) replies = parsed.replies
          } catch {
            replies = []
          }
          if (replies.length === 0) {
            return h('div', { className: 'sa-replies-card sa-replies-empty' }, t('replies.waiting'))
          }
          return h(
            'div',
            { className: 'sa-replies-card' },
            h('div', { className: 'sa-replies-head' }, t('replies.title', { n: replies.length })),
            ...replies.map((reply) =>
              h(
                'div',
                { className: 'sa-reply', key: `reply-${reply?.index}` },
                h('div', { className: 'sa-reply-line' },
                  h('span', { className: 'sa-reply-index' }, `#${reply?.index ?? '?'}`),
                  h('span', { className: `sa-reply-verdict sa-reply-${reply?.verdict ?? 'unknown'}` },
                    t(VERDICT_LABELS[reply?.verdict]?.[0] ?? 'verdict.unknown')),
                ),
                h('div', { className: 'sa-reply-reason' }, reply?.reason ?? ''),
                reply?.next ? h('div', { className: 'sa-reply-next' }, t('next.prefix', { text: reply.next })) : null,
              ),
            ),
          )
        }

        try {
          ctx.slots.inject('tool.call.toolview', () =>
            ctx.slots.register({ name: 'tool.call.toolview', key: 'annotation_replies', inject: () => ({}) }, AnnotationRepliesCard),
          )
          } catch (error) {
          console.error('[selection-annotations] 批注答复卡片注册失败：', error)
        }

        /** 插件详情页里的标准设置区：和批注面板共用同一份批注指令配置。*/
        function AnnotationInstructionSettings() {
          const [text, setText] = React.useState(() => instructionOf())
          const customized = !isDefaultInstruction(text)
          return h(
            'div',
            { className: 'sa-settings-page' },
            h(
              'div',
              { className: 'sa-settings-page-head' },
              h('strong', null, t('settings.pageTitle')),
              h('span', { className: 'sa-hint' }, customized ? t('settings.customized') : t('settings.default')),
            ),
            h(
              'p',
              { className: 'sa-hint' },
              t('settings.pageHint'),
            ),
            h('textarea', {
              className: 'sa-setting-textarea',
              rows: 8,
              value: text,
              onChange: (event) => {
                setText(event.target.value)
                persistInstructionSettings(event.target.value)
              },
            }),
            h(
              'div',
              { className: 'sa-settings-actions' },
              h(
            'button',
                {
              type: 'button',
                  className: 'sa-link',
                  onClick: () => {
                    setText(defaultInstruction())
                    persistInstructionSettings(defaultInstruction())
                  },
                },
                t('settings.restore'),
              ),
            ),
          )
        }
        try {
          ctx.slots.inject('plugins.bundle.config', () =>
            ctx.slots.register(
              { name: 'plugins.bundle.config', key: '@u2a5f/dsh-selection-annotations', inject: () => ({}) },
              AnnotationInstructionSettings,
            ),
          )
          } catch (error) {
          console.error('[selection-annotations] 插件详情页设置区注册失败：', error)
        }

        // 语言切换后才重绘：此时页面上的按钮、弹出层与面板都已建好，不会碰到声明前的空窗。
        if (localeService !== undefined && localeService !== null && typeof localeService.subscribe === 'function') {
          ctx.effect(() => {
            const off = localeService.subscribe(() => {
              activeLocale = safe(() => localeService.getSnapshot?.().active) ?? activeLocale
              applyLocale()
            })
            return () => {
              safe(off)
            }
          }, 'selection-annotations: locale changes')
        }

        // 便于人工核对与排障：window.__dshSelectionAnnotations.list() 等。
        // `add` 与 `_internals` 同时给无浏览器的测试台用（见 test/client-half.test.mjs）。
        window.__dshSelectionAnnotations = {
          list: () =>
            snapshot().map((item) => ({
              id: item.id,
              number: item.number,
              quote: item.quote,
              note: item.note,
              source: item.source,
            })),
          payload: () => buildPayload(annotations),
          receipt: () => draftIds[0] ?? null,
          drafts: () => [...draftIds],
          session: () => currentSessionId(),
          repaint,
          remove: removeAnnotation,
          clear: clearAnnotations,
          update: (id, note) => updateAnnotation(id, note),
          add: (input) => addAnnotation(input),
          _internals: { buildPayload, payloadSource, describeSource, captureSource, matchInRoot, rangeFromOffsets, offsetRange, anchorRoot, locateInSource, lineOfOffset, resolveSourcePosition, refineSourcePosition, adoptSession, loadDraft, saveDraft, loadSent, saveSent, recordSent, scanSentMessages, buildSentCard, renderSentCards, renderReplySections, buildReplySection, mergeReplyBatches, absorbRemoteReplies, shouldDiscardEmpty, loadImageSettings, syncReplyCollapse, sentCardAnchor, turnOfRow },
        }
