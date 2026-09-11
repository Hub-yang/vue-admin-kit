import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * 本组件的根元素上不能出现会变的 `:key`——这是它与 `BaseTable` 之间的隐式契约。
 *
 * `BaseTable` 用 `<el-collapse-transition>` 包住 `BaseSearchBox` 做搜索区开合过渡。Vue 会把
 * Transition 的 hooks 一路挂到子组件**子树根元素**上（`renderComponentRoot` 里的
 * `if (vnode.transition) setTransitionHooks(child, vnode.transition)`，且每次重渲染都重挂），
 * 而带 transition 的元素被 unmount 时会走完整的 leave 动画（renderer `remove()` 里的
 * `if (vnode.shapeFlag & 1 && transition && !transition.persisted)`）。
 *
 * 于是根元素上任何会变的 key 都会被「升级」成一次 0.3s 折叠收起 + 0.3s 展开：点「重置」时
 * `onSearchReset()` bump 了 refreshKey，搜索区就先消失再出现，且 `el-collapse-transition`
 * 没有 mode、leave 与 enter 并行，两份 DOM 同时占文档流 —— 整个内容区闪烁。
 *
 * 重建控件内部态这件事要保留（`searchForm = {}` 清不掉 el-select / el-date-picker 之类的
 * 内部残留态），所以 key 下移到根元素**内部**：那一层拿不到 transition hooks，仍是同步一帧
 * 完成的重建，与套上过渡之前的表现一致。
 *
 * 本包没有 DOM 测试工具（无 `@vue/test-utils` / `happy-dom`），沿用
 * `BaseHeader/titleClick.test.ts` 的做法直接扫模板源码。
 */

/** 这两个模板的属性值都不含 `>`，按开标签粗切即可 */
const OPEN_TAG_RE = /<[a-z][^>]*>/gi
const HTML_COMMENT_RE = /<!--[\s\S]*?-->/g
const KEY_ATTR_RE = /[:\s]key=/
const COLLAPSE_WRAPS_SEARCH_BOX_RE = /<el-collapse-transition>[\s\S]*?<BaseSearchBox/

function openTagsOf(file: string): string[] {
  const source = readFileSync(file, 'utf8')
  const body = source
    .slice(source.indexOf('<template>') + '<template>'.length)
    .replace(HTML_COMMENT_RE, '')
  return body.match(OPEN_TAG_RE) ?? []
}

const searchBoxTags = openTagsOf(join(import.meta.dirname, 'index.vue'))
const rootTag = searchBoxTags[0] ?? ''
const innerTags = searchBoxTags.slice(1)

const baseTableSource = readFileSync(join(import.meta.dirname, '..', 'BaseTable', 'index.vue'), 'utf8')

describe('baseSearchBox 重置不得触发折叠过渡', () => {
  it('取到的确实是根元素', () => {
    expect(rootTag).toContain('sc-search_box')
  })

  it('根元素不带 key，避免 refreshKey 变化被过渡放大成收起再展开', () => {
    expect(rootTag).not.toMatch(KEY_ATTR_RE)
  })

  it('refreshKey 仍挂在根元素内部，重置照旧重建搜索控件', () => {
    expect(innerTags.some(tag => tag.includes('refreshKey'))).toBe(true)
  })

  it('baseTable 仍用 el-collapse-transition 包着搜索区（本约束的前提）', () => {
    expect(baseTableSource).toMatch(COLLAPSE_WRAPS_SEARCH_BOX_RE)
  })
})
