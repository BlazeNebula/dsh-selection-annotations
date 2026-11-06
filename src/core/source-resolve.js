import { safe } from './util.js'
import { withTimeout, locateInSource, lineOfOffset } from './source-locate.js'

/**
 * 出处精修：读到工作区源文件时，把引文折算成原文坐标（行号 + 字符区间）。
 * 读不到就安静退回渲染坐标，绝不阻断批注创建；失败原因交给 onSkip 显示在面板上。
 */
export function createSourceResolver({ ctx, getSessionId, log, timeoutMs }) {
  function unwrapRemote(value) {
    if (value !== null && typeof value === 'object' && 'ok' in value && 'value' in value) {
      return value.ok === true ? value.value : undefined
    }
    return value
  }

  async function resolve(source, quote, onSkip) {
    try {
      return await resolveInner(source, quote, onSkip)
    } catch (error) {
      // 抛错绝不能无声消失：安静退回渲染坐标，控制台留一行原因。
      log(`[selection-annotations] 位置精修抛错：${error instanceof Error ? error.message : String(error)}`)
      return undefined
    }
  }

  async function resolveInner(source, quote, onSkip) {
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
    const sessionId = getSessionId()
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
      if (probe === undefined) continue
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
      timeoutMs,
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

  return { resolve }
}
