        function absorbRemoteReplies(sessionId, remote) {
          if (!Array.isArray(remote?.replies)) return false
          const batches = remote.replies.filter(
            (batch) => batch !== null && typeof batch === 'object' && Array.isArray(batch.replies),
          )
          if (batches.length === 0) return false
          const previous = remoteReplyCache.get(sessionId) ?? []
          const signature = (list) => list.map((batch) => `${batch.at}:${batch.replies.length}`).join('|')
          if (signature(previous) === signature(batches)) return false
          remoteReplyCache.set(sessionId, batches)
          return true
        }

        function storeUrl(sessionId) {
          return `/selection-annotations/session/${encodeURIComponent(sessionId)}`
        }

        /** 读一个会话的落盘记录；连不上或格式不对都返回 undefined（调用方退回本地）。 */
        async function pullRemoteSession(sessionId) {
          if (typeof fetch !== 'function') {
            remoteStoreState = false
            return undefined
          }
          try {
            const response = await fetch(storeUrl(sessionId), { method: 'GET', headers: { accept: 'application/json' } })
            if (response.status === 204) {
              remoteStoreState = true
              return null
            }
            if (!response.ok) {
              remoteStoreState = false
              return undefined
            }
            const data = await response.json()
            remoteStoreState = true
            return data !== null && typeof data === 'object' && !Array.isArray(data) ? data : null
          } catch {
            remoteStoreState = false
            return undefined
          }
        }

        /** 当前会话的可落盘快照：草稿与已提交台账（落盘不做体积裁剪）。*/
        function sessionSnapshot(sessionId) {
          const drafts =
            annotationsSession === sessionId ? draftItems(annotations) : draftSessions.get(sessionId) ?? []
          const sent = {}
          for (const [key, value] of sentBySession.get(sessionId) ?? []) sent[key] = value
          return { schemaVersion: 1, sessionId, updatedAt: new Date().toISOString(), drafts, sent }
        }

        async function pushRemoteSession(sessionId) {
          if (typeof fetch !== 'function') return
          try {
            const response = await fetch(storeUrl(sessionId), {
              method: 'PUT',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify(sessionSnapshot(sessionId)),
            })
            remoteStoreState = response.ok
          } catch {
            remoteStoreState = false
          }
        }

        let remotePushTimer = null
        const remotePushQueue = new Set()

        /** 合并 600ms 内的写入，避免每敲一个字就发一次请求。 */
        function scheduleRemotePush(sessionId) {
          if (typeof sessionId !== 'string' || sessionId === '') return
          remotePushQueue.add(sessionId)
          if (remotePushTimer !== null) return
          remotePushTimer = window.setTimeout(() => {
            remotePushTimer = null
            const ids = [...remotePushQueue]
            remotePushQueue.clear()
            for (const id of ids) void pushRemoteSession(id)
          }, 600)
        }

        /** 把落盘记录并入内存：本地为空时用远端，本地有内容时保留本地并推上去。*/
        async function hydrateRemoteSession(sessionId) {
          const remote = await pullRemoteSession(sessionId)
          if (remote === null || remote === undefined) return
          let touched = absorbRemoteReplies(sessionId, remote)
          if (Array.isArray(remote.drafts) && remote.drafts.length > 0) {
            const items = remote.drafts.filter(isDraftItem).slice(0, DRAFT_MAX_ITEMS).map(restoreDraftItem)
            if (annotationsSession === sessionId && annotations.length === 0 && items.length > 0) {
              annotations = items
              emit()
              scheduleRepaint()
              scheduleSync()
            }
            if ((draftSessions.get(sessionId) ?? []).length === 0) draftSessions.set(sessionId, remote.drafts)
            touched = true
          }
          if (remote.sent !== null && typeof remote.sent === 'object') {
            const table = new Map()
            for (const [key, value] of Object.entries(remote.sent)) {
              if (typeof key !== 'string' || key === '') continue
              if (value === null || typeof value !== 'object' || !Array.isArray(value.items)) continue
              const items = value.items.filter(isSentItem).slice(0, DRAFT_MAX_ITEMS)
              if (items.length === 0) continue
              const turn = Number.isFinite(value.turn) ? Number(value.turn) : undefined
              table.set(key, { savedAt: Number(value.savedAt) || 0, items, ...(turn !== undefined ? { turn } : {}) })
            }
            if (table.size > 0) {
              const localTable = sentBySession.get(sessionId) ?? new Map()
              let merged = false
              for (const [key, value] of table) {
                const current = localTable.get(key)
                if (current === undefined || value.savedAt > current.savedAt) {
                  localTable.set(key, value)
                  merged = true
                }
              }
              if (merged) {
                sentBySession.set(sessionId, localTable)
                // 合并结果写回本地并重新推送，避免下一次推送把远端补回来的记录冲掉。
                saveSent(sessionId, localTable)
                touched = true
              }
            }
          }
          if (touched) scheduleRepaint()
        }

        /** localStorage 在受限上下文里可能不可用：取不到就退回纯内存，绝不让保存路径抛错。*/
