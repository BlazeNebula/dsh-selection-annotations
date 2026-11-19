/**
 * 批注备注里的「采纳 / 否决」是两个互相独立的判定：一条备注可以同时含两句。
 * 颜色一律由这两个布尔推导，不引入「采纳 / 否决 / 两者」这种三选一状态字段。
 */

/** 备注是否含各自的预填关键句。 */
export function noteFlags(note, adoptText, rejectText) {
  const text = typeof note === 'string' ? note : ''
  return {
    adopt: typeof adoptText === 'string' && adoptText !== '' && text.includes(adoptText),
    reject: typeof rejectText === 'string' && rejectText !== '' && text.includes(rejectText),
  }
}

function indexFrom(text, phrase, from) {
  if (typeof phrase !== 'string' || phrase === '') return -1
  return text.indexOf(phrase, from)
}

/**
 * 把备注切成「普通文本 / 采纳句 / 否决句」片段，按出现顺序排列。
 * 只给同时命中两句的情况用；单一命中时由容器按整条着色，观感与既有采纳一致。
 */
export function noteSegments(note, adoptText, rejectText) {
  const text = typeof note === 'string' ? note : ''
  const segments = []
  let cursor = 0
  while (cursor < text.length) {
    const adoptAt = indexFrom(text, adoptText, cursor)
    const rejectAt = indexFrom(text, rejectText, cursor)
    const at = adoptAt === -1 ? rejectAt : rejectAt === -1 ? adoptAt : Math.min(adoptAt, rejectAt)
    if (at === -1) {
      segments.push({ text: text.slice(cursor), tone: '' })
      break
    }
    const tone = adoptAt !== -1 && at === adoptAt ? 'adopt' : 'reject'
    const phrase = tone === 'adopt' ? adoptText : rejectText
    if (at > cursor) segments.push({ text: text.slice(cursor, at), tone: '' })
    segments.push({ text: phrase, tone })
    cursor = at + phrase.length
  }
  return segments
}

/** 备注的渲染视图：两个布尔 + 逐句片段（只在两者同时命中时给出片段）。 */
export function noteView(note, adoptText, rejectText) {
  const flags = noteFlags(note, adoptText, rejectText)
  return {
    adopt: flags.adopt,
    reject: flags.reject,
    segments: flags.adopt && flags.reject ? noteSegments(note, adoptText, rejectText) : null,
  }
}

/** 把备注写进一个块：两个布尔落到 data 属性，两句同时出现时逐句着色。 */
export function paintNote(node, text, view) {
  const adopt = view !== null && view !== undefined && view.adopt === true
  const reject = view !== null && view !== undefined && view.reject === true
  node.dataset.adopt = adopt ? '1' : '0'
  node.dataset.reject = reject ? '1' : '0'
  node.textContent = ''
  const segments = view === null || view === undefined ? null : view.segments
  if (!Array.isArray(segments)) {
    node.textContent = text
    return
  }
  for (const segment of segments) {
    if (segment.tone === '') {
      node.appendChild(document.createTextNode(segment.text))
      continue
    }
    const span = document.createElement('span')
    span.className = segment.tone === 'reject' ? 'sa-note-reject' : 'sa-note-adopt'
    span.textContent = segment.text
    node.appendChild(span)
  }
}
