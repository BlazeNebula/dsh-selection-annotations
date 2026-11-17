/**
 * 批注台账的 SQLite 存储（宿主半边）。
 *
 * 替换原先「一个会话一个 JSON 文件、整份读改写」的落盘方式：
 * 数据库固定在 `$DSH_HOME/selection-annotations/annotations.db`，与老台账目录
 * （`selection-annotations/sessions/`）同级。老 JSON 文件不删，迁移后留作回退。
 *
 * 三个层次：
 *   sessions  每个会话一行，记最后更新时间、迁移来源、宿主写入的 rewind 标记；
 *   batches   与会话日志里的「已发送批注」一一对应，排序看 `batch_seq`（会话内单调递增）；
 *   entries   批里的一条批注，答复（verdict/reason/next/replied_at）直接存在这一行上。
 *
 * 所有方法都是同步的：`node:sqlite` 的 DatabaseSync 不返回 Promise，Node 又是单线程，
 * 所以同一进程内不存在并发读写；每个写操作各自包在一个事务里。
 */
import { randomUUID } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'

/** 老接口的 `schemaVersion`：存储换了，对外形状不变。 */
const SNAPSHOT_SCHEMA_VERSION = 1

/** 与宿主旧实现一致：逐条答复最多保留 200 批（这里按 replied_at 分组）。 */
const MAX_REPLY_GROUPS = 200

/** 合法答复类型；工具与 HTTP 两条入口共用。 */
export const REPLY_VERDICTS = ['accepted', 'partial', 'rejected', 'needs_info']

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS sessions (
  session_id TEXT PRIMARY KEY,
  updated_at INTEGER NOT NULL,
  migrated_from TEXT,
  rewind_json TEXT
);
CREATE TABLE IF NOT EXISTS batches (
  batch_uuid TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  turn INTEGER,
  batch_seq INTEGER NOT NULL,
  batch_at INTEGER NOT NULL,
  anchor_key TEXT,
  value_anchor_key TEXT,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS entries (
  uuid TEXT PRIMARY KEY,
  batch_uuid TEXT NOT NULL,
  session_id TEXT NOT NULL,
  index_in_batch INTEGER NOT NULL,
  quote TEXT,
  note TEXT,
  source_json TEXT,
  images_json TEXT,
  verdict TEXT,
  reason TEXT,
  next TEXT,
  replied_at INTEGER,
  replied_session_id TEXT
);
CREATE TABLE IF NOT EXISTS drafts (
  session_id TEXT PRIMARY KEY,
  draft_json TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_entries_session_batch ON entries (session_id, batch_uuid);
CREATE INDEX IF NOT EXISTS idx_entries_session_replied ON entries (session_id, replied_at);
CREATE INDEX IF NOT EXISTS idx_batches_session_seq ON batches (session_id, batch_seq);
CREATE INDEX IF NOT EXISTS idx_batches_uuid ON batches (batch_uuid);
`

/** 记录根目录：与 DSH 的会话目录平级，一个插件一个目录。 */
function annotationHome() {
  const home = process.env.DSH_HOME
  const base = typeof home === 'string' && home !== '' ? home : join(homedir(), '.dsh')
  return join(base, 'selection-annotations')
}

/** 老 JSON 台账目录（只读：迁移时从这里导入）。 */
export function legacySessionsDir() {
  return join(annotationHome(), 'sessions')
}

/** 默认数据库文件路径。 */
export function defaultDbFile() {
  return join(annotationHome(), 'annotations.db')
}

/**
 * 建一个存储实例。默认位置取 `$DSH_HOME`；手工冒烟时传 `root` 指到临时目录即可。
 */
export function createAnnotationsDb(options = {}) {
  return new AnnotationsDb(options)
}

export class AnnotationsDb {
  #db = null

  constructor({ root, file, sessionsDir } = {}) {
    const home = typeof root === 'string' && root !== '' ? root : annotationHome()
    this.root = home
    this.file = typeof file === 'string' && file !== '' ? file : join(home, 'annotations.db')
    this.sessionsDir = typeof sessionsDir === 'string' && sessionsDir !== '' ? sessionsDir : join(home, 'sessions')
    this.migrationErrors = new Map()
  }

  /** 懒开库：模块被 import 时不创建目录、不碰磁盘。 */
  get db() {
    if (this.#db !== null) return this.#db
    mkdirSync(this.root, { recursive: true })
    const db = new DatabaseSync(this.file)
    // 先设 PRAGMA 再建表：WAL 让读写互不阻塞，busy_timeout 给其它进程留 3 秒。
    db.prepare('PRAGMA journal_mode = WAL').get()
    db.exec('PRAGMA busy_timeout = 3000')
    db.exec(SCHEMA_SQL)
    // 老库补列：entries.replied_session_id 记录「这条批注被哪个会话答复」。
    // CREATE TABLE IF NOT EXISTS 不会给已存在的表加列，所以这里单独查一次再 ALTER。
    const entryColumns = db.prepare('PRAGMA table_info(entries)').all()
    if (!entryColumns.some((column) => column.name === 'replied_session_id')) {
      db.exec('ALTER TABLE entries ADD COLUMN replied_session_id TEXT')
    }
    this.#db = db
    return db
  }

  close() {
    if (this.#db === null) return
    try {
      this.#db.close()
    } finally {
      this.#db = null
    }
  }

  /* ------------------------------------------------------------ 对外读取 */

  /**
   * 按老 JSON 形状读一个会话。库里没有这个会话（且没有可迁移的老文件）时返回 undefined，
   * 路由据此回 204 —— 与「文件不存在」时的旧行为一致。
   */
  readSession(sessionId) {
    this.#ensureMigrated(sessionId)
    const db = this.db
    const session = db.prepare('SELECT updated_at, rewind_json FROM sessions WHERE session_id = ?').get(sessionId)
    if (session === undefined) return undefined

    const rewind = parseJsonText(session.rewind_json)
    return {
      schemaVersion: SNAPSHOT_SCHEMA_VERSION,
      sessionId,
      updatedAt: toIso(session.updated_at),
      drafts: this.#readDrafts(sessionId),
      sent: this.#readSent(sessionId),
      replies: this.#readReplies(sessionId),
      ...(isPlainObject(rewind) ? { rewind } : {}),
    }
  }

  /** 宿主写入的 rewind 标记；没有就返回 undefined。 */
  readRewind(sessionId) {
    this.#ensureMigrated(sessionId)
    const row = this.db.prepare('SELECT rewind_json FROM sessions WHERE session_id = ?').get(sessionId)
    const rewind = parseJsonText(row?.rewind_json)
    return isPlainObject(rewind) ? rewind : undefined
  }

  #readDrafts(sessionId) {
    const row = this.db.prepare('SELECT draft_json FROM drafts WHERE session_id = ?').get(sessionId)
    const drafts = parseJsonText(row?.draft_json)
    return Array.isArray(drafts) ? drafts : []
  }

  #readSent(sessionId) {
    const db = this.db
    const batches = db
      .prepare(
        'SELECT batch_uuid, batch_seq, batch_at, turn, anchor_key, value_anchor_key FROM batches WHERE session_id = ? ORDER BY batch_seq ASC',
      )
      .all(sessionId)
    if (batches.length === 0) return {}

    const entries = db
      .prepare(
        'SELECT uuid, batch_uuid, index_in_batch, quote, note, source_json, images_json FROM entries WHERE session_id = ? ORDER BY batch_uuid ASC, index_in_batch ASC',
      )
      .all(sessionId)
    const byBatch = new Map()
    for (const entry of entries) {
      let list = byBatch.get(entry.batch_uuid)
      if (list === undefined) {
        list = []
        byBatch.set(entry.batch_uuid, list)
      }
      list.push(entry)
    }

    const sent = {}
    for (const batch of batches) {
      const items = []
      for (const entry of byBatch.get(batch.batch_uuid) ?? []) {
        items.push(entryToItem(entry))
      }
      const record = { savedAt: Number(batch.batch_at), items }
      if (batch.turn !== null && Number.isFinite(Number(batch.turn))) record.turn = Number(batch.turn)
      const anchorKey = batch.value_anchor_key ?? batch.anchor_key
      if (typeof anchorKey === 'string' && anchorKey !== '') record.anchorKey = anchorKey
      const key = typeof batch.anchor_key === 'string' && batch.anchor_key !== '' ? batch.anchor_key : `time:${batch.batch_at}`
      sent[key] = record
    }
    return sent
  }

  #readReplies(sessionId) {
    // 跨会话答复：条目属于别的会话、但在当前会话被答复过时，当前会话也要读得到，
    // 否则页面换到答复所在的会话就看不到那张答复卡。
    const rows = this.db
      .prepare(
        'SELECT uuid, index_in_batch, quote, note, verdict, reason, next, replied_at FROM entries WHERE (session_id = ? OR replied_session_id = ?) AND replied_at IS NOT NULL ORDER BY replied_at ASC, index_in_batch ASC',
      )
      .all(sessionId, sessionId)
    if (rows.length === 0) return []

    const groups = new Map()
    for (const row of rows) {
      const at = Number(row.replied_at)
      let group = groups.get(at)
      if (group === undefined) {
        group = { at, replies: [], accepted: 0, partial: 0, rejected: 0, needsInfo: 0 }
        groups.set(at, group)
      }
      const reply = { uuid: row.uuid, index: Number(row.index_in_batch), verdict: row.verdict }
      if (row.quote !== null) reply.quote = row.quote
      if (row.note !== null) reply.note = row.note
      if (row.reason !== null) reply.reason = row.reason
      if (row.next !== null) reply.next = row.next
      group.replies.push(reply)
      if (row.verdict === 'accepted') group.accepted += 1
      else if (row.verdict === 'partial') group.partial += 1
      else if (row.verdict === 'rejected') group.rejected += 1
      else if (row.verdict === 'needs_info') group.needsInfo += 1
    }
    const list = [...groups.values()]
    return list.slice(Math.max(0, list.length - MAX_REPLY_GROUPS))
  }

  /* ------------------------------------------------------------ 写入：老快照 */

  /**
   * 老接口 `PUT /session/<id>` 的整份快照落库。
   *
   * 合并规则与旧文件实现一致：`sent` 只增不减（`sentRemoved` 显式删），
   * `replies` 按 `at` 去重后并入，`drafts` 以客户端为准，`rewind` 保留宿主那一份。
   * 已存在的 batch 只更新真正变化的行，重复推送同一份快照不会重写整批。
   */
  saveSession(sessionId, parsed) {
    this.#ensureMigrated(sessionId)
    const db = this.db
    return this.#tx(() => {
      const now = Date.now()
      const updatedAt = parseIsoMs(parsed.updatedAt) ?? now
      const existing = db.prepare('SELECT updated_at FROM sessions WHERE session_id = ?').get(sessionId)
      if (existing === undefined) {
        db.prepare('INSERT INTO sessions (session_id, updated_at, migrated_from, rewind_json) VALUES (?, ?, NULL, NULL)').run(
          sessionId,
          updatedAt,
        )
      } else if (Number(existing.updated_at) !== updatedAt) {
        db.prepare('UPDATE sessions SET updated_at = ? WHERE session_id = ?').run(updatedAt, sessionId)
      }

      if (Array.isArray(parsed.drafts)) this.#writeDrafts(sessionId, parsed.drafts, updatedAt)
      if (isPlainObject(parsed.sent)) {
        const removed = new Set(
          Array.isArray(parsed.sentRemoved) ? parsed.sentRemoved.filter((key) => typeof key === 'string') : [],
        )
        this.#applySentSnapshot(sessionId, parsed.sent, removed, updatedAt)
      }
      if (Array.isArray(parsed.replies)) this.#applyReplySnapshot(sessionId, parsed.replies)
    })
  }

  #writeDrafts(sessionId, drafts, updatedAt) {
    const text = safeStringify(drafts)
    if (text === null) return
    const row = this.db.prepare('SELECT draft_json FROM drafts WHERE session_id = ?').get(sessionId)
    if (row === undefined) {
      this.db
        .prepare('INSERT INTO drafts (session_id, draft_json, updated_at) VALUES (?, ?, ?)')
        .run(sessionId, text, updatedAt)
      return
    }
    if (row.draft_json === text) return
    this.db.prepare('UPDATE drafts SET draft_json = ?, updated_at = ? WHERE session_id = ?').run(text, updatedAt, sessionId)
  }

  #applySentSnapshot(sessionId, sent, removed, fallbackAt) {
    const db = this.db
    const oldBatches = db.prepare('SELECT * FROM batches WHERE session_id = ? ORDER BY batch_seq ASC').all(sessionId)
    const byKey = new Map()
    let maxSeq = 0
    for (const batch of oldBatches) {
      // 没有 anchor_key 的批次在快照里以 `time:<batch_at>` 为键，这里用同一个派生键
      // 对齐，避免整份快照重复插一批。
      const key =
        typeof batch.anchor_key === 'string' && batch.anchor_key !== ''
          ? batch.anchor_key
          : `time:${batch.batch_at}`
      byKey.set(key, batch)
      maxSeq = Math.max(maxSeq, Number(batch.batch_seq))
    }

    // 新键按 savedAt 升序编号；已存在的键只更新内容，不动 batch_seq。
    const incomingKeys = Object.keys(sent).filter((key) => !removed.has(key) && isPlainObject(sent[key]))
    const freshKeys = incomingKeys
      .filter((key) => !byKey.has(key))
      .sort((a, b) => numberOr(sent[a]?.savedAt, 0) - numberOr(sent[b]?.savedAt, 0))

    for (const key of incomingKeys) {
      const value = sent[key]
      const batchAt = numberOr(value.savedAt, fallbackAt)
      const turn = Number.isSafeInteger(value.turn) ? Number(value.turn) : null
      const valueAnchorKey = typeof value.anchorKey === 'string' && value.anchorKey !== '' ? value.anchorKey : null
      const existing = byKey.get(key)
      if (existing === undefined) continue

      if (
        Number(existing.batch_at) !== batchAt ||
        (existing.turn === null ? null : Number(existing.turn)) !== turn ||
        (existing.value_anchor_key ?? null) !== valueAnchorKey
      ) {
        db.prepare('UPDATE batches SET batch_at = ?, turn = ?, value_anchor_key = ? WHERE batch_uuid = ?').run(
          batchAt,
          turn,
          valueAnchorKey,
          existing.batch_uuid,
        )
      }
      this.#syncItems(sessionId, existing.batch_uuid, Array.isArray(value.items) ? value.items : [])
    }

    for (const key of freshKeys) {
      const value = sent[key]
      const batchAt = numberOr(value.savedAt, fallbackAt)
      const turn = Number.isSafeInteger(value.turn) ? Number(value.turn) : null
      const valueAnchorKey = typeof value.anchorKey === 'string' && value.anchorKey !== '' ? value.anchorKey : null
      maxSeq += 1
      const batchUuid = randomUUID()
      db.prepare(
        'INSERT INTO batches (batch_uuid, session_id, turn, batch_seq, batch_at, anchor_key, value_anchor_key, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      ).run(batchUuid, sessionId, turn, maxSeq, batchAt, key, valueAnchorKey, Date.now())
      this.#insertItems(sessionId, batchUuid, Array.isArray(value.items) ? value.items : [])
    }

    for (const key of removed) {
      const batch = byKey.get(key)
      if (batch === undefined) continue
      db.prepare('DELETE FROM entries WHERE session_id = ? AND batch_uuid = ?').run(sessionId, batch.batch_uuid)
      db.prepare('DELETE FROM batches WHERE batch_uuid = ?').run(batch.batch_uuid)
    }
  }

  /**
   * 老快照里同一批的条目按 index_in_batch 对齐：内容变了才写，缺的补，多的删。
   * 已写进去的答复（verdict/reason/next/replied_at）不因客户端重推而丢失。
   */
  #syncItems(sessionId, batchUuid, items) {
    const db = this.db
    const existing = db.prepare('SELECT * FROM entries WHERE session_id = ? AND batch_uuid = ?').all(sessionId, batchUuid)
    const byIndex = new Map()
    for (const entry of existing) byIndex.set(Number(entry.index_in_batch), entry)

    const seen = new Set()
    items.forEach((item, position) => {
      if (!isPlainObject(item)) return
      const index = Number.isSafeInteger(item.index) ? Number(item.index) : position + 1
      if (seen.has(index)) return
      seen.add(index)
      const fields = itemFields(item)
      const current = byIndex.get(index)
      if (current === undefined) {
        // 快照可能先于 POST batch 到达：条目自带客户端 uuid 时用它，让随后的批次创建
        // 按 uuid 认出同一条，避免重复插入。
        const uuid = typeof item.uuid === 'string' && item.uuid !== '' ? item.uuid : undefined
        this.#insertItem(sessionId, batchUuid, index, fields, uuid)
        return
      }
      if (
        current.quote !== fields.quote ||
        current.note !== fields.note ||
        current.source_json !== fields.sourceJson ||
        current.images_json !== fields.imagesJson
      ) {
        db.prepare('UPDATE entries SET quote = ?, note = ?, source_json = ?, images_json = ? WHERE uuid = ?').run(
          fields.quote,
          fields.note,
          fields.sourceJson,
          fields.imagesJson,
          current.uuid,
        )
      }
    })

    for (const [index, entry] of byIndex) {
      if (seen.has(index)) continue
      db.prepare('DELETE FROM entries WHERE uuid = ?').run(entry.uuid)
    }
  }

  /**
   * 老快照里的 `replies` 数组：每批 `at` 对应「该时刻之前最近的一个 batch」，
   * 按 index_in_batch 写到对应条目上。匹配不到就跳过，不报错。
   * 只往后写：客户端推回来的旧答复批次不会覆盖时间更晚的那次答复。
   */
  #applyReplySnapshot(sessionId, batches) {
    const db = this.db
    for (const batch of batches) {
      if (!isPlainObject(batch)) continue
      const at = Number(batch.at)
      if (!Number.isFinite(at)) continue
      const already = db
        .prepare('SELECT 1 AS hit FROM entries WHERE session_id = ? AND replied_at = ? LIMIT 1')
        .get(sessionId, at)
      if (already !== undefined) continue
      const target = db
        .prepare(
          'SELECT batch_uuid FROM batches WHERE session_id = ? AND batch_at <= ? ORDER BY batch_seq DESC LIMIT 1',
        )
        .get(sessionId, at)
      if (target === undefined) continue
      const replies = Array.isArray(batch.replies) ? batch.replies : []
      for (const reply of replies) {
        if (!isPlainObject(reply)) continue
        this.#applyLegacyReply(target.batch_uuid, reply, at)
      }
    }
  }

  /** 把一条老形状答复写到目标批的对应条目上；已有更晚的答复时不覆盖。 */
  #applyLegacyReply(batchUuid, reply, at) {
    const index = Number(reply.index)
    if (!Number.isSafeInteger(index)) return false
    const entry = this.db
      .prepare('SELECT uuid, replied_at FROM entries WHERE batch_uuid = ? AND index_in_batch = ? LIMIT 1')
      .get(batchUuid, index)
    if (entry === undefined) return false
    if (entry.replied_at !== null && Number(entry.replied_at) >= at) return false
    this.db
      .prepare('UPDATE entries SET verdict = ?, reason = ?, next = ?, replied_at = ? WHERE uuid = ?')
      .run(stringOrNull(reply.verdict), stringOrNull(reply.reason), stringOrNull(reply.next), at, entry.uuid)
    return true
  }

  /* ------------------------------------------------------------ 写入：按条 */

  /**
   * 新建一批批注（`POST /session/<id>/batch`）。
   * `batch_seq` 取该会话当前最大值 +1；条目以客户端捕获时生成的 uuid 为主键。
   * 同一 uuid 重复提交视为同一条：整批都已落在同一批里时直接返回原批，不再插空卡。
   */
  createBatch(sessionId, { turn, anchorKey, batchAt, items }) {
    this.#ensureMigrated(sessionId)
    const db = this.db
    return this.#tx(() => {
      const now = Date.now()
      const updatedAt = Number.isFinite(batchAt) ? batchAt : now
      this.#ensureSessionRow(sessionId, now)

      // 先按请求顺序整理；同一次请求里出现重复 uuid 时只留第一条。
      const requested = []
      const seen = new Set()
      for (const item of Array.isArray(items) ? items : []) {
        if (!isPlainObject(item)) continue
        const uuid = typeof item.uuid === 'string' && item.uuid !== '' ? item.uuid : undefined
        if (uuid !== undefined) {
          if (seen.has(uuid)) continue
          seen.add(uuid)
        }
        requested.push({ item, uuid })
      }

      const existing = requested
        .filter((entry) => entry.uuid !== undefined)
        .map((entry) => ({
          uuid: entry.uuid,
          row: db.prepare('SELECT batch_uuid, session_id FROM entries WHERE uuid = ?').get(entry.uuid),
        }))
      const existingRows = existing.filter((entry) => entry.row !== undefined)
      if (
        requested.length > 0 &&
        existingRows.length === requested.length &&
        existingRows.every((entry) => entry.row.batch_uuid === existingRows[0].row.batch_uuid) &&
        existingRows[0].row.session_id === sessionId
      ) {
        const batch = db
          .prepare('SELECT batch_uuid, batch_seq FROM batches WHERE batch_uuid = ?')
          .get(existingRows[0].row.batch_uuid)
        if (batch !== undefined) {
          return {
            batch_uuid: batch.batch_uuid,
            batch_seq: Number(batch.batch_seq),
            items: requested.map((entry) => ({ uuid: entry.uuid })),
            reused: true,
          }
        }
      }

      const maxSeq = Number(
        db.prepare('SELECT COALESCE(MAX(batch_seq), 0) AS seq FROM batches WHERE session_id = ?').get(sessionId).seq,
      )
      const batchSeq = maxSeq + 1
      const batchUuid = randomUUID()
      const safeTurn = Number.isSafeInteger(turn) ? Number(turn) : null
      const anchor = typeof anchorKey === 'string' && anchorKey !== '' ? anchorKey : null
      // turn 与 anchor_key 允许留空，等消息真正入库后再走 patchBatch 回填。
      db.prepare(
        'INSERT INTO batches (batch_uuid, session_id, turn, batch_seq, batch_at, anchor_key, value_anchor_key, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      ).run(batchUuid, sessionId, safeTurn, batchSeq, updatedAt, anchor, anchor, now)

      const inserted = []
      requested.forEach((entry, position) => {
        const index = Number.isSafeInteger(entry.item.index) ? Number(entry.item.index) : position + 1
        const uuid = this.#insertItem(sessionId, batchUuid, index, itemFields(entry.item), entry.uuid)
        if (uuid !== undefined) inserted.push({ uuid })
      })

      db.prepare('UPDATE sessions SET updated_at = ? WHERE session_id = ?').run(now, sessionId)
      return { batch_uuid: batchUuid, batch_seq: batchSeq, items: inserted }
    })
  }

  /**
   * 回填批次里「消息真正入库后」才确定的字段（`PATCH /batch/<batch_uuid>`）。
   * turn 与 anchor_key 只补空值：重复调用不会改已写入的值（幂等，只写一次）。
   */
  patchBatch(batchUuid, { turn, anchorKey } = {}) {
    const db = this.db
    return this.#tx(() => {
      const row = db
        .prepare('SELECT turn, anchor_key, value_anchor_key FROM batches WHERE batch_uuid = ?')
        .get(batchUuid)
      if (row === undefined) return { status: 'not_found' }
      const nextTurn = Number.isSafeInteger(turn) ? Number(turn) : null
      const anchor = typeof anchorKey === 'string' && anchorKey !== '' ? anchorKey : null
      const turnValue = row.turn === null ? nextTurn : Number(row.turn)
      // 创建时可能只留下了 `time:<batch_at>` / `turn:<n>` 派生键；真实锚点到了就换掉。
      const anchorEmpty =
        row.anchor_key === null ||
        row.anchor_key === '' ||
        String(row.anchor_key).startsWith('time:') ||
        String(row.anchor_key).startsWith('turn:')
      const anchorValue = anchorEmpty && anchor !== null ? anchor : row.anchor_key
      const valueAnchorValue =
        row.value_anchor_key === null || row.value_anchor_key === ''
          ? anchor !== null
            ? anchor
            : null
          : row.value_anchor_key
      if (turnValue !== row.turn || anchorValue !== row.anchor_key || valueAnchorValue !== row.value_anchor_key) {
        db.prepare('UPDATE batches SET turn = ?, anchor_key = ?, value_anchor_key = ? WHERE batch_uuid = ?').run(
          turnValue,
          anchorValue,
          valueAnchorValue,
          batchUuid,
        )
      }
      return { status: 'ok', batch_uuid: batchUuid, turn: turnValue, anchor_key: anchorValue }
    })
  }

  /**
   * 给一条批注写答复（`PATCH /entry/<uuid>`）。
   * 不校验条目属于哪个会话：uuid 是全局唯一键，跨会话也能答复。
   * `repliedSessionId` 记下「在哪个会话答复的」，供那个会话读回答复卡。
   * 返回 { status: 'ok' | 'not_found' | 'conflict' }，由路由映射成 200/404/409。
   */
  patchEntry(uuid, { verdict, reason, next, repliedSessionId }) {
    const db = this.db
    return this.#tx(() => {
      const now = Date.now()
      const row = db.prepare('SELECT session_id, replied_at FROM entries WHERE uuid = ?').get(uuid)
      if (row === undefined) return { status: 'not_found' }
      if (row.replied_at !== null) return { status: 'conflict' }
      const replySession =
        typeof repliedSessionId === 'string' && repliedSessionId !== '' ? repliedSessionId : null
      db.prepare(
        'UPDATE entries SET verdict = ?, reason = ?, next = ?, replied_at = ?, replied_session_id = ? WHERE uuid = ?',
      ).run(verdict, reason, stringOrNull(next), now, replySession, uuid)
      db.prepare('UPDATE sessions SET updated_at = ? WHERE session_id = ?').run(now, row.session_id)
      if (replySession !== null && replySession !== row.session_id) {
        db.prepare('UPDATE sessions SET updated_at = ? WHERE session_id = ?').run(now, replySession)
      }
      return { status: 'ok', replied_at: now, replied_session_id: replySession }
    })
  }

  /** 删一条批注（`DELETE /entry/<uuid>`）；返回是否删到。 */
  deleteEntry(uuid) {
    const db = this.db
    return this.#tx(() => {
      const row = db.prepare('SELECT session_id FROM entries WHERE uuid = ?').get(uuid)
      if (row === undefined) return false
      db.prepare('DELETE FROM entries WHERE uuid = ?').run(uuid)
      db.prepare('UPDATE sessions SET updated_at = ? WHERE session_id = ?').run(Date.now(), row.session_id)
      return true
    })
  }

  /* ------------------------------------------------------------ 写入：答复 */

  /**
   * 按条目 uuid 写答复。给「跨会话写入」预留的内部函数：它能写任意会话里的条目，
   * 并记下答复发生在哪个会话。
   */
  writeReplyByUuid(uuid, { verdict, reason, next, repliedSessionId }) {
    const db = this.db
    return this.#tx(() => {
      const now = Date.now()
      const row = db.prepare('SELECT session_id FROM entries WHERE uuid = ?').get(uuid)
      if (row === undefined) return false
      const replySession =
        typeof repliedSessionId === 'string' && repliedSessionId !== '' ? repliedSessionId : null
      db.prepare(
        'UPDATE entries SET verdict = ?, reason = ?, next = ?, replied_at = ?, replied_session_id = ? WHERE uuid = ?',
      ).run(verdict, reason, stringOrNull(next), now, replySession, uuid)
      db.prepare('UPDATE sessions SET updated_at = ? WHERE session_id = ?').run(now, row.session_id)
      return true
    })
  }

  /**
   * `annotation_replies` 工具的落库：逐条答复，uuid 是唯一定位依据。
   *
   * uuid 属于别的会话也照写（跨会话答复），并把答复会话记到 `replied_session_id`。
   * 没有 uuid 时退回老行为：cardKey 命中某批的锚点就用那批，否则用会话里最近的一批，
   * 再按 index 匹配批内条目。返回真实写入与跳过的明细，回执按它报数。
   */
  writeReplyBatch(sessionId, value) {
    this.#ensureMigrated(sessionId)
    const db = this.db
    const replies = Array.isArray(value?.replies) ? value.replies : []
    if (replies.length === 0) return { written: [], skipped: [] }
    return this.#tx(() => {
      const now = Date.now()
      // 替别的会话的批注写答复时，调用会话本身可能还没有台账行；先建一行，
      // 这样它读回时能看到「在我这里答复过」的那些条目。
      this.#ensureSessionRow(sessionId, now)
      const written = []
      const skipped = []
      const touched = new Set()

      for (const reply of replies) {
        if (!isPlainObject(reply)) {
          skipped.push({ reason: 'invalid_reply' })
          continue
        }
        const verdict = stringOrNull(reply.verdict)
        const reason = stringOrNull(reply.reason)
        const next = stringOrNull(reply.next)
        const uuid = typeof reply.uuid === 'string' && reply.uuid !== '' ? reply.uuid : undefined
        if (typeof verdict !== 'string' || !REPLY_VERDICTS.includes(verdict)) {
          skipped.push({ ...(uuid !== undefined ? { uuid } : {}), reason: 'invalid_reply' })
          continue
        }

        if (uuid !== undefined) {
          const row = db
            .prepare('SELECT uuid, index_in_batch, session_id, replied_at FROM entries WHERE uuid = ?')
            .get(uuid)
          if (row === undefined) {
            skipped.push({ uuid, reason: 'uuid_not_found' })
            continue
          }
          if (row.replied_at !== null) {
            skipped.push({ uuid, index: Number(row.index_in_batch), reason: 'already_replied' })
            continue
          }
          db.prepare(
            'UPDATE entries SET verdict = ?, reason = ?, next = ?, replied_at = ?, replied_session_id = ? WHERE uuid = ?',
          ).run(verdict, reason, next, now, sessionId, uuid)
          written.push({ uuid, index: Number(row.index_in_batch), verdict })
          touched.add(String(row.session_id))
          continue
        }

        const index = Number(reply.index)
        if (!Number.isSafeInteger(index)) {
          skipped.push({ reason: 'uuid_required' })
          continue
        }
        let target
        if (typeof reply.cardKey === 'string' && reply.cardKey !== '') {
          target = db
            .prepare(
              'SELECT batch_uuid FROM batches WHERE session_id = ? AND (anchor_key = ? OR value_anchor_key = ?) ORDER BY batch_seq DESC LIMIT 1',
            )
            .get(sessionId, reply.cardKey, reply.cardKey)
        }
        if (target === undefined) {
          target = db
            .prepare('SELECT batch_uuid FROM batches WHERE session_id = ? ORDER BY batch_seq DESC LIMIT 1')
            .get(sessionId)
        }
        if (target === undefined) {
          skipped.push({ index, reason: 'batch_not_found' })
          continue
        }
        const entry = db
          .prepare('SELECT uuid, replied_at FROM entries WHERE batch_uuid = ? AND index_in_batch = ? LIMIT 1')
          .get(target.batch_uuid, index)
        if (entry === undefined) {
          skipped.push({ index, reason: 'index_not_found' })
          continue
        }
        if (entry.replied_at !== null) {
          skipped.push({ uuid: entry.uuid, index, reason: 'already_replied' })
          continue
        }
        db.prepare(
          'UPDATE entries SET verdict = ?, reason = ?, next = ?, replied_at = ?, replied_session_id = ? WHERE uuid = ?',
        ).run(verdict, reason, next, now, sessionId, entry.uuid)
        written.push({ uuid: entry.uuid, index, verdict })
        touched.add(sessionId)
      }
      if (written.length > 0) {
        const touch = db.prepare('UPDATE sessions SET updated_at = ? WHERE session_id = ?')
        touch.run(now, sessionId)
        for (const id of touched) touch.run(now, id)
      }
      return { written, skipped }
    })
  }

  /**
   * 记一次会话回退（dsh-rewind-plugin 触发的撤回）。标记读回时随老形状的 `rewind` 字段返回。
   */
  recordRewind(sessionId, turn) {
    this.#ensureMigrated(sessionId)
    const db = this.db
    return this.#tx(() => {
      const row = db.prepare('SELECT rewind_json FROM sessions WHERE session_id = ?').get(sessionId)
      const previous = parseJsonText(row?.rewind_json)
      const previousAt = Number.isFinite(previous?.at) ? Number(previous.at) : 0
      const mark = { at: Math.max(Date.now(), previousAt + 1), turn: Number.isSafeInteger(turn) ? turn : null }
      if (row === undefined) {
        db.prepare('INSERT INTO sessions (session_id, updated_at, migrated_from, rewind_json) VALUES (?, ?, NULL, ?)').run(
          sessionId,
          Date.now(),
          JSON.stringify(mark),
        )
      } else {
        db.prepare('UPDATE sessions SET rewind_json = ? WHERE session_id = ?').run(JSON.stringify(mark), sessionId)
      }
      return mark
    })
  }

  /* ------------------------------------------------------------ 迁移 */

  /** 该会话在库里第一次出现时，把老 JSON 台账导进来；已有 sessions 行就跳过。 */
  #ensureMigrated(sessionId) {
    const db = this.db
    const exists = db.prepare('SELECT 1 AS ok FROM sessions WHERE session_id = ?').get(sessionId)
    if (exists !== undefined) return
    const legacy = join(this.sessionsDir, `${sessionId}.json`)
    if (!existsSync(legacy)) return

    let parsed
    try {
      parsed = JSON.parse(readFileSync(legacy, 'utf8'))
    } catch (error) {
      // 坏文件不阻塞访问：记一次日志，下次访问再试（不建 sessions 行，保持「未迁移」状态）。
      if (!this.migrationErrors.has(sessionId)) {
        this.migrationErrors.set(sessionId, true)
        console.error('[selection-annotations] 老台账解析失败，暂不迁移：', legacy, error)
      }
      return
    }
    if (!isPlainObject(parsed)) return
    this.#migrate(sessionId, legacy, parsed)
  }

  #migrate(sessionId, legacyPath, parsed) {
    const db = this.db
    this.#tx(() => {
      const updatedAt = parseIsoMs(parsed.updatedAt) ?? Date.now()
      const rewind = isPlainObject(parsed.rewind) ? JSON.stringify(parsed.rewind) : null
      db.prepare('INSERT INTO sessions (session_id, updated_at, migrated_from, rewind_json) VALUES (?, ?, ?, ?)').run(
        sessionId,
        updatedAt,
        legacyPath,
        rewind,
      )

      if (Array.isArray(parsed.drafts) && parsed.drafts.length > 0) {
        const text = safeStringify(parsed.drafts)
        if (text !== null) {
          db.prepare('INSERT INTO drafts (session_id, draft_json, updated_at) VALUES (?, ?, ?)').run(
            sessionId,
            text,
            updatedAt,
          )
        }
      }

      const sent = isPlainObject(parsed.sent) ? parsed.sent : {}
      const keys = Object.keys(sent).filter((key) => isPlainObject(sent[key]))
      // 按 savedAt 升序编号；同一个 savedAt 保持对象里原有顺序（Array.sort 是稳定的）。
      keys.sort((a, b) => numberOr(sent[a].savedAt, 0) - numberOr(sent[b].savedAt, 0))

      let seq = 0
      for (const key of keys) {
        const value = sent[key]
        seq += 1
        const batchUuid = randomUUID()
        const batchAt = numberOr(value.savedAt, updatedAt)
        const turn = Number.isSafeInteger(value.turn) ? Number(value.turn) : null
        const valueAnchorKey = typeof value.anchorKey === 'string' && value.anchorKey !== '' ? value.anchorKey : null
        db.prepare(
          'INSERT INTO batches (batch_uuid, session_id, turn, batch_seq, batch_at, anchor_key, value_anchor_key, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        ).run(batchUuid, sessionId, turn, seq, batchAt, key, valueAnchorKey, Date.now())
        this.#insertItems(sessionId, batchUuid, Array.isArray(value.items) ? value.items : [])
      }

      // 顶层 replies：每批 at → 该时刻之前最近的一个 batch，按 index 落到条目上。
      const replyBatches = Array.isArray(parsed.replies) ? parsed.replies : []
      for (const batch of replyBatches) {
        if (!isPlainObject(batch)) continue
        const at = Number(batch.at)
        if (!Number.isFinite(at)) continue
        const target = db
          .prepare('SELECT batch_uuid FROM batches WHERE session_id = ? AND batch_at <= ? ORDER BY batch_seq DESC LIMIT 1')
          .get(sessionId, at)
        if (target === undefined) continue
        const replies = Array.isArray(batch.replies) ? batch.replies : []
        for (const reply of replies) {
          if (!isPlainObject(reply)) continue
          this.#applyLegacyReply(target.batch_uuid, reply, at)
        }
      }
    })
  }

  /* ------------------------------------------------------------ 工具 */

  #ensureSessionRow(sessionId, updatedAt) {
    const row = this.db.prepare('SELECT 1 AS ok FROM sessions WHERE session_id = ?').get(sessionId)
    if (row !== undefined) return
    this.db
      .prepare('INSERT INTO sessions (session_id, updated_at, migrated_from, rewind_json) VALUES (?, ?, NULL, NULL)')
      .run(sessionId, updatedAt)
  }

  #insertItems(sessionId, batchUuid, items) {
    items.forEach((item, position) => {
      if (!isPlainObject(item)) return
      const index = Number.isSafeInteger(item.index) ? Number(item.index) : position + 1
      // 整份快照里带的条目 uuid 也要沿用：客户端可能先推快照、后补 POST batch，
      // 两条路必须落到同一个主键上，否则同一条批注会变成两行。
      const uuid = typeof item.uuid === 'string' && item.uuid !== '' ? item.uuid : undefined
      this.#insertItem(sessionId, batchUuid, index, itemFields(item), uuid)
    })
  }

  #insertItem(sessionId, batchUuid, index, fields, uuid) {
    const id = typeof uuid === 'string' && uuid !== '' ? uuid : randomUUID()
    // 幂等：同 uuid 重复提交视为同一条，不重复插入，也不改它原来的批次归属。
    const exists = this.db.prepare('SELECT 1 AS ok FROM entries WHERE uuid = ?').get(id)
    if (exists !== undefined) return id
    this.db
      .prepare(
        'INSERT INTO entries (uuid, batch_uuid, session_id, index_in_batch, quote, note, source_json, images_json, verdict, reason, next, replied_at, replied_session_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, NULL, NULL, NULL)',
      )
      .run(id, batchUuid, sessionId, index, fields.quote, fields.note, fields.sourceJson, fields.imagesJson)
    return id
  }

  /** 同步事务：BEGIN IMMEDIATE 立刻拿写锁，避免和其它进程的写互相等成死锁。 */
  #tx(fn) {
    const db = this.db
    db.exec('BEGIN IMMEDIATE')
    try {
      const result = fn()
      db.exec('COMMIT')
      return result
    } catch (error) {
      try {
        db.exec('ROLLBACK')
      } catch {
        /* 回滚失败时保留原始异常 */
      }
      throw error
    }
  }
}

/* ------------------------------------------------------------ 形状转换 */

/** 一行 entry 还原成老 `sent[key].items` 里的条目；空 images 不写，避免凭空多出字段。 */
function entryToItem(entry) {
  const item = { uuid: entry.uuid, index: Number(entry.index_in_batch) }
  if (entry.quote !== null) item.quote = entry.quote
  if (entry.note !== null) item.note = entry.note
  const source = parseJsonText(entry.source_json)
  if (source !== undefined) item.source = source
  const images = parseJsonText(entry.images_json)
  if (Array.isArray(images) && images.length > 0) {
    item.images = images
    const thumbs = thumbsOf(images)
    if (thumbs.length > 0) item.thumbs = thumbs
  }
  return item
}

/** 与客户端 buildSentCard 的取图逻辑一致：images 里带 data URL 的才还原成缩略图。 */
function thumbsOf(images) {
  const thumbs = []
  for (const image of images) {
    if (!isPlainObject(image)) continue
    if (typeof image.thumb !== 'string' || image.thumb === '') continue
    const name = typeof image.name === 'string' ? image.name : ''
    const preview = typeof image.preview === 'string' && image.preview !== '' ? image.preview : image.dataUrl
    thumbs.push({ name, dataUrl: image.thumb, ...(typeof preview === 'string' ? { preview } : {}) })
  }
  return thumbs
}

function itemFields(item) {
  return {
    quote: stringOrNull(item.quote),
    note: stringOrNull(item.note),
    sourceJson: item.source === undefined ? null : safeStringify(item.source),
    imagesJson: item.images === undefined ? null : safeStringify(item.images),
  }
}

function stringOrNull(value) {
  return typeof value === 'string' ? value : null
}

function numberOr(value, fallback) {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function safeStringify(value) {
  try {
    return JSON.stringify(value)
  } catch {
    return null
  }
}

function parseJsonText(text) {
  if (typeof text !== 'string' || text === '') return undefined
  try {
    return JSON.parse(text)
  } catch {
    return undefined
  }
}

function parseIsoMs(text) {
  if (typeof text !== 'string' || text === '') return undefined
  const ms = Date.parse(text)
  return Number.isFinite(ms) ? ms : undefined
}

function toIso(ms) {
  const value = Number(ms)
  return new Date(Number.isFinite(value) ? value : 0).toISOString()
}
