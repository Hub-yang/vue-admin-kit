import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * 本包所有自定义类名统一带 `sc-` 前缀（shared-components），组件模板里用的名字
 * 必须能在「全局样式（styles/*.scss）」或「该组件自己的 <style> 块」里找到定义。
 *
 * 这条测试是为一个真实 bug 立的桩：包从 zd-workspace 初始化过来后做过一次前缀改名，
 * `BaseSearchBox` 被漏掉，模板里仍写着 `zd-workspace-...`，而 scss 定义的是 `gcc-workspace-...`，
 * 结果搜索框那 80 多行样式变成死代码——不报错、不影响构建，只是样式静默失效。
 *
 * ⚠️ **它守不住包外的引用。** `styles/common.scss` 里那几个全局类是本包的公开 API，
 * 消费方会直接选中它们（如各应用 `src/styles/element-ui.scss` 里给表格卡片借边框的那几条）。
 * 改前缀时**必须同时 grep 整个仓库**，本测试只覆盖 `packages/shared-components/src` 以内。
 */

const PREFIX = 'sc-'
/** 历次改名留下的旧前缀，出现即说明有地方漏改 */
const STALE_PREFIXES = [
  'gcc-workspace-shared-components-',
  'zd-workspace-shared-components-',
]
const CLASS_RE = /\bsc-[a-z0-9_-]+/g
const STALE_RE = /\b[a-z]+-workspace-shared-components-[a-z_]+/g

function collectFiles(dir: string, ext: string[]): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name)
    if (statSync(full).isDirectory())
      return collectFiles(full, ext)
    return ext.some(e => name.endsWith(e)) ? [full] : []
  })
}

function matchAll(text: string, re: RegExp): Set<string> {
  return new Set(text.match(re) ?? [])
}

/** 取 .vue 里 `<style>` 之外的部分——模板与脚本，也就是「用到类名」的地方 */
function splitVue(source: string): { markup: string, styles: string } {
  const styleBlocks = [...source.matchAll(/<style[\s\S]*?<\/style>/g)].map(m => m[0])
  let markup = source
  for (const block of styleBlocks)
    markup = markup.replace(block, '')
  return { markup, styles: styleBlocks.join('\n') }
}

/**
 * 类名是否已被定义。除了完全相同，还认「以它为前缀的派生类」——
 * `<transition name="sc-page-transition">` 在样式里只会出现 `sc-page-transition-enter-active`
 * 这类由 Vue 拼出来的派生名，裸名本身不作为选择器存在。
 */
function isDefined(cls: string, defined: Set<string>): boolean {
  return defined.has(cls) || [...defined].some(d => d.startsWith(`${cls}-`))
}

/**
 * 把 SCSS 的 `&__elem` / `&--mod` 嵌套展开成完整类名。
 *
 * 根 CLAUDE.md 要求样式块内部用嵌套写而不是平铺完整 BEM 类名，于是
 * `.sc-pwd-strength { &__bar {} }` 这样的定义在源码里找不到 `sc-pwd-strength__bar` 字面量。
 * 这里对块名与后缀做笛卡尔拼接——**故意放宽**：本测试要抓的是「模板里写了、样式里压根没有」，
 * 不是精确的作用域分析，宁可多认几个也不要为嵌套写法误报。
 */
function expandNested(source: string, classes: Set<string>): Set<string> {
  const suffixes = [...source.matchAll(/&(__[a-z0-9-]+|--[a-z0-9-]+)/g)].map(m => m[1])
  const expanded = new Set(classes)
  for (const cls of classes) {
    for (const suffix of suffixes) expanded.add(cls + suffix)
  }
  return expanded
}

const root = join(import.meta.dirname, '..')
const componentFiles = collectFiles(join(root, 'components'), ['.vue'])

const usedInMarkup = new Set<string>()
const definedLocally = new Set<string>()
for (const file of componentFiles) {
  const { markup, styles } = splitVue(readFileSync(file, 'utf8'))
  for (const cls of matchAll(markup, CLASS_RE)) usedInMarkup.add(cls)
  for (const cls of expandNested(styles, matchAll(styles, CLASS_RE))) definedLocally.add(cls)
}

const globalSource = collectFiles(join(root, 'styles'), ['.scss'])
  .map(f => readFileSync(f, 'utf8'))
  .join('\n')
/** 无嵌套展开的那一份，用于「无死样式」断言——展开产物不是真的选择器，不该被要求有消费方 */
const definedGloballyLiteral = matchAll(globalSource, CLASS_RE)
const definedGlobally = expandNested(globalSource, definedGloballyLiteral)

describe('共享组件的类名前缀', () => {
  it('不残留任何旧仓库前缀', () => {
    const all = [...componentFiles, ...collectFiles(join(root, 'styles'), ['.scss'])]
    const stale = all.flatMap((file) => {
      const hits = [...matchAll(readFileSync(file, 'utf8'), STALE_RE)]
        .filter(cls => STALE_PREFIXES.some(p => cls.startsWith(p)))
      return hits.map(cls => `${file}: ${cls}`)
    })
    expect(stale).toEqual([])
  })

  it('模板里用到的类名都有定义（全局样式或组件自己的 style 块）', () => {
    const missing = [...usedInMarkup].filter(
      cls => !isDefined(cls, definedGlobally) && !isDefined(cls, definedLocally),
    )
    expect(missing).toEqual([])
  })

  it('全局样式里定义的类名都被组件用到（无死样式）', () => {
    const unused = [...definedGloballyLiteral].filter(cls => !usedInMarkup.has(cls))
    expect(unused).toEqual([])
  })

  it('扫描确实覆盖到了内容，且所有类名都带统一前缀', () => {
    expect(usedInMarkup.size).toBeGreaterThan(0)
    expect(definedGloballyLiteral.size).toBeGreaterThan(0)
    for (const cls of [...usedInMarkup, ...definedGlobally, ...definedLocally])
      expect(cls.startsWith(PREFIX)).toBe(true)
  })
})
