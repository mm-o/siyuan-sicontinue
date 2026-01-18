/**
 * 笔记查询能力
 * 基于思源 SQL API
 */
import { sql } from '../../api'

export interface BlockResult {
  id: string
  content: string
  type: string
  subtype?: string
  hpath: string
  updated: string
  root_id?: string
  parent_id?: string
  markdown?: string
}

// 搜索笔记内容
export async function searchNotes(
  keyword: string,
  limit = 20,
  type?: string
): Promise<BlockResult[]> {
  const escaped = keyword.replace(/'/g, "''")
  let query = `
    SELECT id, content, type, subtype, hpath, updated, root_id
    FROM blocks 
    WHERE markdown LIKE '%${escaped}%'
  `
  if (type) query += ` AND type = '${type}'`
  query += ` ORDER BY updated DESC LIMIT ${limit}`
  
  console.log('[Skill SQL]', query)
  const result = await sql(query)
  console.log('[Skill SQL] 结果数量:', result?.length || 0)
  return result || []
}

// 查询反向链接
export async function getBacklinks(blockId: string, limit = 50): Promise<BlockResult[]> {
  return sql(`
    SELECT b.id, b.content, b.type, b.subtype, b.hpath, b.updated
    FROM blocks b
    WHERE b.id IN (
      SELECT block_id FROM refs WHERE def_block_id = '${blockId}'
    )
    ORDER BY b.updated DESC
    LIMIT ${limit}
  `) || []
}

// 查询最近修改的块
export async function getRecentBlocks(
  days = 7,
  limit = 20,
  type?: string
): Promise<BlockResult[]> {
  let query = `
    SELECT id, content, type, subtype, hpath, updated
    FROM blocks 
    WHERE updated > strftime('%Y%m%d%H%M%S', datetime('now', '-${days} day'))
  `
  if (type) query += ` AND type = '${type}'`
  query += ` ORDER BY updated DESC LIMIT ${limit}`
  return sql(query) || []
}

// 查询 Daily Note
export async function getDailyNotes(
  startDate: string,
  endDate: string
): Promise<BlockResult[]> {
  return sql(`
    SELECT DISTINCT B.id, B.content, B.type, B.hpath, B.updated
    FROM blocks AS B 
    JOIN attributes AS A ON B.id = A.block_id
    WHERE A.name LIKE 'custom-dailynote-%' AND B.type = 'd'
    AND A.value >= '${startDate}' AND A.value <= '${endDate}'
    ORDER BY A.value DESC
  `) || []
}

// 查询未完成任务
export async function getUnfinishedTasks(
  days = 7,
  limit = 50
): Promise<BlockResult[]> {
  return sql(`
    SELECT id, content, markdown, type, subtype, hpath, updated
    FROM blocks
    WHERE type = 'l' AND subtype = 't'
    AND markdown LIKE '* [ ] %'
    AND created > strftime('%Y%m%d%H%M%S', datetime('now', '-${days} day'))
    ORDER BY updated DESC
    LIMIT ${limit}
  `) || []
}

// 查询包含标签的块
export async function searchByTag(tag: string, limit = 20): Promise<BlockResult[]> {
  const escaped = tag.replace(/'/g, "''")
  return sql(`
    SELECT id, content, type, subtype, hpath, updated
    FROM blocks
    WHERE content LIKE '%#${escaped}#%'
    ORDER BY updated DESC
    LIMIT ${limit}
  `) || []
}

// 查询文档列表
export async function listDocuments(notebookId?: string, limit = 50): Promise<BlockResult[]> {
  let query = `
    SELECT id, content, type, hpath, updated
    FROM blocks
    WHERE type = 'd'
  `
  if (notebookId) query += ` AND box = '${notebookId}'`
  query += ` ORDER BY updated DESC LIMIT ${limit}`
  return sql(query) || []
}

// 查询文档的子块
export async function getDocumentBlocks(
  rootId: string,
  type?: string,
  limit = 100
): Promise<BlockResult[]> {
  let query = `
    SELECT id, content, type, subtype, parent_id, updated
    FROM blocks
    WHERE root_id = '${rootId}'
  `
  if (type) query += ` AND type = '${type}'`
  query += ` ORDER BY created ASC LIMIT ${limit}`
  return sql(query) || []
}

// 根据多个关键词查询
export async function queryByKeywords(
  keywords: string[],
  limit = 20
): Promise<BlockResult[]> {
  if (!keywords.length) return []
  const conditions = keywords
    .map(k => `markdown LIKE '%${k.replace(/'/g, "''")}%'`)
    .join(' OR ')
  return sql(`
    SELECT id, content, type, subtype, hpath, updated
    FROM blocks
    WHERE ${conditions}
    ORDER BY updated DESC
    LIMIT ${limit}
  `) || []
}
