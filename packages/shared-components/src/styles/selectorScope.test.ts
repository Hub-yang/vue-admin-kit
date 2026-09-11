import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * 本包 `styles/` 下的样式是**全局**的（`common.scss` 由各应用整包引入，不带 scoped），
 * 每一条选择器都作用在整个页面上，写宽了不报错、只在无关组件里静默生效。
 *
 * 这条测试是为一个真实 bug 立的桩（条目 20260908d）：`custom_dialog_box` /
 * `custom_drawer_box` 块里曾有一条裸的 `span:nth-child(2)`，本意是给弹窗 header 右上角
 * 那组图标排版，但它没限定父级，于是弹窗内**任意位置**的第 2 个 span 都被设成 flex。
 * el-table 的树形单元格恰好是一串 span（叶子行 `[indent][placeholder][内容]`、有子级行
 * `[expand-icon][内容]`），第 2 个被撑成块级盒子后换到下一行，而缩进靠的是留在上一行
 * inline 流里的空 span `el-table__indent`，它对下一行完全不起作用——子级缩进因此整个
 * 丢失、有子级的行被撑成两行。字典配置弹窗里的三层字典树表就是这么坏的。
 *
 * **判据**：选择器的**最后一个** compound 是裸元素名，且它是被后代组合器（空格，或
 * 前导——即靠外层嵌套关系）命中的。这种形态的作用域是「祖先容器内的任意一个该元素」。
 * 判最后一个而不是判开头，是因为危险的是最终落点：`.el-table tr th .cell` 里的
 * `tr th` 只是路径、最终落在 `.cell` 上，不算过宽；而 `.dialog span:nth-child(2)`
 * 与嵌套写法 `.dialog { span:nth-child(2) }` 是同一件事，都要抓。
 * 用 `>` / `+` / `~` 直连时作用范围是确定的，放行（如 `&:hover > td`）。
 *
 * 确实需要一条兜底的全局元素规则时（`html, body` 这类），把它写成带类或 `:root` 的
 * 形式；真要豁免就在这里加白名单并写清理由，不要直接删这条测试。
 *
 * 扫描器是启发式的：不解析 SCSS 语法，只按 `{` `}` `;` 切块。因此不支持字符串里的
 * `{`、`url()` 里的 `//`（会被当行注释）与 `#{}` 插值——本包目前都没用到，真用上了
 * 这条测试会以「报出一段看不懂的选择器」或「静默漏扫」的形式失真。同理它只扫
 * `styles/` 下的 scss，前提是组件里的非 scoped `<style>` 只做 `@use`（当前如此）。
 *
 * 本包没有 DOM 测试工具，沿用 `classPrefix.test.ts` 的做法直接扫样式源码。
 */

const COMMENT_RE = /\/\*[\s\S]*?\*\/|\/\/[^\n]*/g
/** 裸元素选择器：以字母开头（`.` `#` `&` `>` `+` `~` `*` `:` 开头的都不算） */
const BARE_ELEMENT_RE = /^[a-z]/i
const TIGHT_COMBINATORS = ['>', '+', '~']

/**
 * 取出每个块开始处的选择器组。逐字符扫描而不是用正则整体匹配：
 * 选择器里有 `:nth-child(2)` 这样的括号，`[^(){}]+` 那类写法会从括号处断开
 */
function selectorsOf(source: string): string[] {
  const heads: string[] = []
  let buf = ''
  for (const ch of source.replace(COMMENT_RE, '')) {
    if (ch === '{') {
      heads.push(buf)
      buf = ''
    }
    else if (ch === '}' || ch === ';') {
      buf = ''
    }
    else {
      buf += ch
    }
  }
  return heads
    .flatMap(head => head.split(','))
    .map(selector => selector.trim().replace(/\s+/g, ' '))
    .filter(selector => selector.length > 0 && !selector.startsWith('@'))
}

function isOverlyBroad(selector: string): boolean {
  const parts = selector.split(' ')
  const last = parts.at(-1)
  if (last === undefined || !BARE_ELEMENT_RE.test(last))
    return false
  const combinator = parts.at(-2)
  return combinator === undefined || !TIGHT_COMBINATORS.includes(combinator)
}

function overlyBroadIn(source: string): string[] {
  return selectorsOf(source).filter(isOverlyBroad)
}

const styleDir = import.meta.dirname
const offenders = readdirSync(styleDir)
  .filter(name => name.endsWith('.scss'))
  .flatMap(name => overlyBroadIn(readFileSync(join(styleDir, name), 'utf8'))
    .map(selector => `${name} → ${selector}`))

describe('全局样式的选择器作用域', () => {
  it('本包 styles/ 下没有作用域过宽的选择器', () => {
    expect(offenders).toEqual([])
  })

  it('扫描确实覆盖到了内容', () => {
    expect(selectorsOf(readFileSync(join(styleDir, 'common.scss'), 'utf8')).length).toBeGreaterThan(0)
  })

  it('抓得住 20260908d 那条规则本身', () => {
    expect(overlyBroadIn('.dialog { span:nth-child(2) { display: flex; } }'))
      .toEqual(['span:nth-child(2)'])
  })

  it('抓得住它改写成不嵌套后的等价形态', () => {
    expect(overlyBroadIn('.dialog span:nth-child(2) { display: flex; }'))
      .toEqual(['.dialog span:nth-child(2)'])
  })

  it('放行以 > 直连的裸元素与只把裸元素用作路径的选择器', () => {
    expect(overlyBroadIn('.header > span:nth-child(2) { display: flex; }')).toEqual([])
    expect(overlyBroadIn('.row { &:hover > td { background: inherit; } }')).toEqual([])
    expect(overlyBroadIn('.el-table tr th .cell { line-height: 25px; }')).toEqual([])
  })
})
