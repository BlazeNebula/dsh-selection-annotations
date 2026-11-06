        function offsetRange(root, range) {
          const measure = (node, offset) =>
            safe(() => {
              const probe = range.cloneRange()
              probe.setStart(root, 0)
              probe.setEnd(node, offset)
              return probe.toString().length
            })
          const start = measure(range.startContainer, range.startOffset)
          const end = measure(range.endContainer, range.endOffset)
          if (start === undefined) return { start: undefined, end: undefined }
          return { start, end: end === undefined || end < start ? start : end }
        }

        function pathFromPreviewUrl(url) {
          // dsh-resource://file/session/<sessionId>/<encoded path>
          const marker = '/session/'
          const at = url.indexOf(marker)
          if (at === -1) return undefined
          const rest = url.slice(at + marker.length)
          const slash = rest.indexOf('/')
          if (slash === -1) return undefined
          const raw = rest.slice(slash + 1)
          return safe(() => decodeURIComponent(raw)) ?? raw
        }

        function lineNumberOf(element) {
          if (element === null) return undefined
          const holder = element.closest('[data-textpreview-line]')
          if (holder === null) return undefined
          const value = Number(holder.getAttribute('data-textpreview-line'))
          return Number.isFinite(value) ? value : undefined
        }

        /**
         * 代码预览没有行号属性，只能按`.line` 的序号推算。
         * 先看选区端点能不能向上找到最近的 `.line`；找不到再退回「第几个 .line 包含它」。
         */
        function codeLineNumberOf(scope, element) {
          if (element === null || scope === null || scope === undefined) return undefined
          const lines = [...scope.querySelectorAll('.line')]
          const own = typeof element.closest === 'function' ? element.closest('.line') : null
          const target = own !== null ? own : lines.find((line) => line.contains(element))
          if (target === null || target === undefined) return undefined
          const index = lines.indexOf(target)
          return index === -1 ? undefined : index + 1
        }

        /** 空白折叠成单个空格，并记下每个规范化字符对应的源文本下标。*/
        function normalizeWithMap(value) {
          const chars = []
          const map = []
          let spaceAt = -1
          for (let i = 0; i < value.length; i += 1) {
            const ch = value[i]
            if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') {
              if (spaceAt === -1) spaceAt = i
              continue
            }
            if (spaceAt !== -1) {
              if (chars.length > 0) {
                chars.push(' ')
                map.push(spaceAt)
              }
              spaceAt = -1
            }
            chars.push(ch)
            map.push(i)
          }
          return { text: chars.join(''), map }
        }

        /**
         * 在*源文件文有*里定位引文。
         *
         * 渲染后的正文与原文并不一样（标题丢了 `#`、强调丢了 `**`、链接只剩文字），而且换行、
         * 缩进也会被重排，所以不能直接 `indexOf`：先把两边都做空白折叠再比，命中后把区间映射回
         * 源文本下标。找不到就返回 undefined —— 那时宁可不要行号，也不要给一个错的。
         * @returns { start, end } 源文本里的半开区间。
         */
        function locateInSource(source, quote) {
          const needle = quote.replace(/\s+/g, ' ').trim()
          if (needle === '') return undefined
          const hay = normalizeWithMap(source)
          const at = hay.text.indexOf(needle)
          if (at === -1) return undefined
          const start = hay.map[at]
          const end = hay.map[at + needle.length - 1]
          if (start === undefined || end === undefined) return undefined
          return { start, end: end + 1 }
        }

        /** 源文本里某个下标所处的 1 基行号。 */
        function lineOfOffset(text, offset) {
          let line = 1
          const limit = Math.max(0, Math.min(offset, text.length))
          for (let i = 0; i < limit; i += 1) if (text.charCodeAt(i) === 10) line += 1
          return line
        }

        /**
         * 给一次远端调用套上超时，并且**不吞掉失败原图* ——
         * 返回 `{ ok: true, value }` 或 `{ ok: false, reason }`，便于把「超时」与「抛错」分开。
         */
        function withTimeout(promise, ms) {
          return new Promise((resolve) => {
            let settled = false
            const settle = (outcome) => {
              if (settled) return
              settled = true
              window.clearTimeout(timer)
              resolve(outcome)
            }
            const timer = window.setTimeout(() => settle({ ok: false, reason: `${ms}ms 内没有返回` }), ms)
            Promise.resolve(promise).then(
              (value) => settle({ ok: true, value }),
              (error) => settle({ ok: false, reason: error instanceof Error ? error.message : String(error) }),
            )
          })
        }

        /** 远端结果可能是裸值，也可能是 { ok, value } 包装。 */
        function unwrapRemote(value) {
          if (value !== null && typeof value === 'object' && 'ok' in value && 'value' in value) {
            return value.ok === true ? value.value : undefined
          }
          return value
        }

        /**
         * 读源文件，把引文折算户*原文坐标**的行号与字符区间。
         *
         * 能拿到原文就用原文坐标（`textOrigin: source`）—— 这样 charStart/charEnd 在任何预览形态下
         * 都与文件一致，Markdown 也能有行号；拿不到就保留渲染坐标（`textOrigin: rendered`）。
         * @returns 覆盖用的字段，或 undefined。
         */

        async function resolveSourcePosition(source, quote, onSkip) {
          try {
            return await resolveSourcePositionInner(source, quote, onSkip)
          } catch (error) {
            // 抛错绝不能无声消失：安静退回渲染坐标，控制台留一行原因。
            log(`[selection-annotations] 位置精修抛错：${error instanceof Error ? error.message : String(error)}`)
            return undefined
          }
        }

        async function resolveSourcePositionInner(source, quote, onSkip) {
          /**
           * 精修失败一律安静退回（退到渲染坐标，绝不阻断创建），但原因要有去处：
           * 控制台一行日志，另外交给 onSkip —— 插件把它显示在面板条目上。
           */
          const skip = (reason) => {
            log(`[selection-annotations] 位置精修跳过（${String(source?.path)}）：${reason}`)
            if (typeof onSkip === 'function') onSkip(reason)
            return undefined
          }
          if (source?.kind !== 'file') return undefined
          if (typeof source.path !== 'string' || source.path === '') return undefined
          const sessionId = currentSessionId()
          if (sessionId === undefined) return skip('拿不到当前会话 id')
          // 读原文要经 remote：客户端上下文只把 inject 里声明过的命名空间挂上去，
          // 所以 `remote.workspaceFiles` 必须先写进 inject（少写就取值即抛）。
          // 而 remote 本身有两种作用域 —— 会话作用域（sessions.scope().remote）与根上下文
          // （ctx.remote）—— 前者不带这个命名空间，因此逐个探测、哪个能用用哪个。
          const candidates = []
          const agent = safe(() => ctx.sessions?.scope?.(sessionId))
          if (agent?.remote !== undefined) candidates.push({ label: 'sessions.scope().remote', remote: agent.remote })
          const direct = safe(() => ctx.remote) ?? safe(() => ctx.get('remote'))
          if (direct !== undefined) candidates.push({ label: 'ctx.remote', remote: direct })
          // 探测放在 safe 里：取不到的候选会抛，而不是返回 undefined。
          let usable
          for (const entry of candidates) {
            const probe = safe(() => typeof entry.remote?.workspaceFiles?.read === 'function')
            if (probe === undefined) {
              continue
            }
            if (probe === true) {
              usable = entry
              break
            }
          }
          if (usable === undefined) {
            return skip(`拿不到 remote.workspaceFiles.read（试过 ${candidates.map((e) => e.label).join(' / ') || '无任何 remote'}）`)
          }
          log(`[selection-annotations] 位置精修：经 ${usable.label} 读 ${source.path}`)
          const outcome = await withTimeout(
            safe(() => usable.remote.workspaceFiles.read(sessionId, source.path, {})),
            SOURCE_LOOKUP_TIMEOUT_MS,
          )
          if (outcome.ok === false) return skip(`读取失败：${outcome.reason}`)
          const file = unwrapRemote(outcome.value)
          const text = typeof file?.text === 'string' ? file.text : undefined
          if (text === undefined) return skip('返回里没有 text（path 可能不被接受）')
          const hit = locateInSource(text, quote)
          if (hit === undefined) {
            return skip(
              file?.eof === false
                ? `引文不在读取窗口内（只拿到 ${text.length} 字符，eof=false）`
                : '引文不在原文里（多半是跨了行内 Markdown 标记）',
            )
          }
          return {
            charStart: hit.start,
            charEnd: hit.end,
            lineStart: lineOfOffset(text, hit.start),
            lineEnd: lineOfOffset(text, Math.max(hit.start, hit.end - 1)),
            textOrigin: 'source',
          }
        }

        /**
         * 行号区间：优先用行自带的 `data-textpreview-line`（纯文本预览有）；
         * 代码预览没有这个属性，退回按 `.line` 序号推算。两者都拿不到就不写行号。
         */
        function lineRangeWithin(root, startEl, endEl) {
          const marked = lineNumberOf(startEl) ?? lineNumberOf(endEl)
          if (marked !== undefined) return { start: marked, end: lineNumberOf(endEl) ?? marked }
          const start = codeLineNumberOf(root, startEl)
          if (start === undefined) return { start: undefined, end: undefined }
          return { start, end: codeLineNumberOf(root, endEl) ?? start }
        }

        /**
         * 记录选区来源：哪条消息 / 哪个文件 / 行号区间 / 字符区间。
         * 字符区间是 `[charStart, charEnd)`，以锚点根元素的 `textContent` 为口径。
         */
        function captureSource(range) {
          const startEl = elementOf(range.startContainer)
          const endEl = elementOf(range.endContainer)
          if (startEl === null) return { kind: 'dom' }

          const replyItem = startEl.closest('.sa-reply-item')
          if (replyItem !== null && replyItem.closest('[data-sa-ui="replies"]') !== null) {
            // 老卡片（本次改动之前渲染的 DOM）没有 data-sa-field，按类名兜底；
            // 批注编号也能从「批注 N」标题里读回来，免得整条只剩一个模糊的“整条答复”。
            const fieldOf = (element) => {
              if (element === null) return null
              const marked = element.closest('[data-sa-field]')
              if (marked !== null) return marked.getAttribute('data-sa-field') ?? 'item'
              for (const name of ['sa-q-quote', 'sa-q-note', 'sa-a-reason', 'sa-a-next']) {
                if (element.closest(`.${name}`) !== null) {
                  return { 'sa-q-quote': 'quote', 'sa-q-note': 'note', 'sa-a-reason': 'reason', 'sa-a-next': 'next' }[name]
                }
              }
              return null
            }
            const startField = fieldOf(startEl)
            const endField = fieldOf(endEl)
            const field = startField !== null && (endField === null || startField === endField) ? startField : 'item'
            const classMap = { quote: 'sa-q-quote', note: 'sa-q-note', reason: 'sa-a-reason', next: 'sa-a-next' }
            let fieldElement = replyItem
            if (field !== 'item') {
              fieldElement =
                startEl.closest(`[data-sa-field="${cssEscape(field)}"]`) ??
                startEl.closest(`.${classMap[field]}`) ??
                replyItem
            }
            const chars = offsetRange(fieldElement, range)
            let index = Number(replyItem.getAttribute('data-sa-reply-index'))
            if (!Number.isFinite(index) || index === 0) {
              const digits = (replyItem.querySelector('.sa-reply-index')?.textContent ?? '').match(/(\d+)/)
              index = digits === null ? 0 : Number(digits[1])
            }
            return {
              kind: 'reply',
              batchAt: Number(replyItem.getAttribute('data-sa-batch-at')) || 0,
              index,
              field,
              charStart: chars.start,
              charEnd: chars.end,
              textOrigin: 'rendered',
            }
          }

          const sentItem = startEl.closest('.sa-sent-item')
          if (sentItem !== null) {
            const sentCard = sentItem.closest('[data-sa-ui="sent"]')
            if (sentCard !== null) {
              const fieldOf = (element) => {
                if (element === null) return null
                const note = element.closest('.sa-sent-note')
                if (note !== null) return { key: 'note', el: note }
                const quote = element.closest('.sa-sent-quote')
                if (quote !== null) return { key: 'quote', el: quote }
                return null
              }
              const startField = fieldOf(startEl)
              const endField = fieldOf(endEl)
              const field =
                startField !== null && (endField === null || endField.key === startField.key) ? startField.key : 'item'
              const fieldEl = field === 'item' ? sentItem : startField.el
              const chars = offsetRange(fieldEl, range)
              let index = Number(sentItem.getAttribute('data-sa-sent-index'))
              if (!Number.isFinite(index) || index === 0) {
                const digits = (sentItem.querySelector('.sa-sent-num')?.textContent ?? '').match(/(\d+)/)
                index = digits === null ? 0 : Number(digits[1])
              }
              return {
                kind: 'sent',
                anchorKey: sentCard.getAttribute('data-anchor') ?? '',
                index,
                field,
                charStart: chars.start,
                charEnd: chars.end,
                textOrigin: 'rendered',
              }
            }
          }

          const row = startEl.closest('[data-chat-anchor-key]')
          if (row !== null) {
            const chars = offsetRange(row, range)
            return {
              kind: 'message',
              role: (row.getAttribute('data-chat-flow-kind') ?? '') === 'user' ? 'user' : 'assistant',
              anchorKey: row.getAttribute('data-chat-anchor-key') ?? '',
              flowKind: row.getAttribute('data-chat-flow-kind') ?? '',
              charStart: chars.start,
              charEnd: chars.end,
            }
          }

          const doc = startEl.closest('[data-textpreview-url]')
          if (doc !== null) {
            const url = doc.getAttribute('data-textpreview-url') ?? ''
            const lines = lineRangeWithin(doc, startEl, endEl)
            const chars = offsetRange(doc, range)
            return {
              kind: 'file',
              path: pathFromPreviewUrl(url),
              sourceUrl: url,
              lineStart: lines.start,
              lineEnd: lines.end,
              charStart: chars.start,
              charEnd: chars.end,
              // 默认口径是渲染后的正文；保存时会再试着读源文件改成 source。
              textOrigin: 'rendered',
            }
          }

          const code = startEl.closest('[data-code-preview]')
          if (code !== null) {
            const lines = lineRangeWithin(code, startEl, endEl)
            const chars = offsetRange(code, range)
            return { kind: 'file', lineStart: lines.start, lineEnd: lines.end, charStart: chars.start, charEnd: chars.end, textOrigin: 'rendered' }
          }

          return { kind: 'dom' }
        }

        /** 锚点根元素：消息行或文件预览外壳。*/
        function anchorRoot(source) {
          if (source === null || source === undefined) return null
          if (source.kind === 'message' && source.anchorKey) {
            return (
              document.querySelector(`[data-chat-anchor-key="${cssEscape(source.anchorKey)}"]`) ??
              document.querySelector(`[data-chat-flow-key="${cssEscape(source.anchorKey)}"]`)
            )
          }
          if (source.kind === 'file' && source.sourceUrl) {
            return document.querySelector(`[data-textpreview-url="${cssEscape(source.sourceUrl)}"]`)
          }
          if (source.kind === 'file') return document.querySelector('[data-code-preview]')
          if (source.kind === 'sent' && source.anchorKey) {
            const card = document.querySelector(`[data-sa-ui="sent"][data-anchor="${cssEscape(source.anchorKey)}"]`)
            if (card !== null) {
              const wanted = Number(source.index)
              for (const item of card.querySelectorAll('.sa-sent-item')) {
                const digits = (item.querySelector('.sa-sent-num')?.textContent ?? '').match(/(\d+)/)
                const index = Number(item.getAttribute('data-sa-sent-index')) || (digits === null ? 0 : Number(digits[1]))
                if (index !== wanted) continue
                if (typeof source.field === 'string' && source.field !== '' && source.field !== 'item') {
                  const field = item.querySelector(`[data-sa-field="${cssEscape(source.field)}"]`)
                  return field ?? item
                }
                return item
              }
            }
          }
          if (source.kind === 'reply') {
            const batchAt = Number(source.batchAt)
            const replyIndex = Number(source.index)
            for (const item of document.querySelectorAll('.sa-reply-item')) {
              if (item.closest('[data-sa-ui="replies"]') === null) continue
              if (Number(item.getAttribute('data-sa-batch-at')) !== batchAt) continue
              if (Number(item.getAttribute('data-sa-reply-index')) !== replyIndex) continue
              if (typeof source.field === 'string' && source.field !== '' && source.field !== 'item') {
                const field = item.querySelector(`[data-sa-field="${cssEscape(source.field)}"]`)
                return field ?? item
              }
              return item
            }
          }
          return null
        }

        function cssEscape(value) {
          return String(value).replace(/["\\]/g, '\\$&')
        }

        /** 按字符偏移在根元素里重建 Range（只走文本节点，偏移口径与 textContent 一致）。 */
