/**
 * 思源笔记 Skill 格式规范
 * 来源：kernel/treenode/node.go + API_zh_CN.md + SKILL.md
 */

// ==================== 格式指南（注入 AI prompt）====================

export const SIYUAN_FORMAT_GUIDE = `
## 思源笔记格式规范

根据内容特点自主选择合适格式，直接输出可插入的内容。

### 文本样式
**粗体** *斜体* ~~删除线~~ ==高亮== \`行内代码\`
^上标^ ~下标~ #标签名#

### 结构元素
# ~ ###### 标题（h1-h6）
- 无序列表
1. 有序列表
* [ ] 待办 / * [x] 完成
> 引述块

### Callout 标注
> [!tip] 提示 / [!warning] 警告 / [!info] 信息
> [!note] 备注 / [!important] 重要 / [!caution] 注意
> 内容...

### 块引用（锚文本融入句子）
((块ID "锚文本"))
✓ 据((ID "史料"))记载，吕布是...
✓ 董卓命((ID "吕布率军"))前往洛阳
✗ 参考 ((ID "链接"))

### 块嵌入
{{块ID}}

### SQL 嵌入（必须 select * from blocks 开头）
{{select * from blocks where content like '%关键词%' limit 5}}

### 表格
| 列1 | 列2 | 列3 |
|-----|-----|-----|
| 值  | 值  | 值  |

### 代码块
\`\`\`语言
代码
\`\`\`

### 数学公式
$行内$ 或 $$块级$$

### 注意
- 块ID格式：20210104091228-xxxxxxx（14位时间戳-7位随机）
- 只用提供的真实块ID，不要编造
- 自定义属性需 custom- 前缀
`

// ==================== 块类型系统 ====================

export const BLOCK_TYPES = {
  d: '文档', h: '标题', l: '列表', i: '列表项',
  c: '代码块', m: '数学公式', t: '表格', b: '引述块',
  s: '超级块', p: '段落', av: '属性视图',
  html: 'HTML块', query_embed: '嵌入块',
  iframe: 'iframe', widget: '挂件', tb: '分隔线',
  video: '视频', audio: '音频', callout: '标注'
} as const

export const LIST_SUBTYPES = { u: '无序列表', o: '有序列表', t: '任务列表' } as const
export const HEADING_SUBTYPES = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'] as const

export type BlockType = keyof typeof BLOCK_TYPES
export type ListSubtype = keyof typeof LIST_SUBTYPES

// ==================== 验证与清理 ====================

// 块ID格式：14位时间戳-7位随机字符
const BLOCK_ID_REGEX = /^\d{14}-[a-z0-9]{7}$/

export function isValidBlockId(id: string): boolean {
  return BLOCK_ID_REGEX.test(id)
}

// 清理无效块引用，保留有效的
export function cleanInvalidRefs(content: string): string {
  // 块引用 ((xxx)) 或 ((xxx "锚文本"))
  content = content.replace(/\(\(([^)\s]+)(?:\s+"[^"]*")?\)\)/g, (match, id) => 
    isValidBlockId(id) ? match : ''
  )
  // 块嵌入 {{xxx}} 保留 SQL {{select...}}
  content = content.replace(/\{\{([^}]+)\}\}/g, (match, inner) => {
    const t = inner.trim().toLowerCase()
    if (t.startsWith('select')) return match
    return isValidBlockId(inner.trim()) ? match : ''
  })
  return content
}

// ==================== 格式化工具 ====================

// 生成块引用
export const blockRef = (id: string, anchor?: string) => 
  anchor ? `((${id} "${anchor}"))` : `((${id}))`

// 生成块嵌入
export const blockEmbed = (id: string) => `{{${id}}}`

// 生成 SQL 嵌入
export const sqlEmbed = (where: string, limit = 5) => 
  `{{select * from blocks where ${where} limit ${limit}}}`

// 生成标签
export const tag = (name: string) => `#${name}#`

// 生成 Callout
export const callout = (type: string, title: string, content: string) =>
  `> [!${type}] ${title}\n> ${content.replace(/\n/g, '\n> ')}`
