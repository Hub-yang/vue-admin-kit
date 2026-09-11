import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * 标题区「点击回首页」的事件必须挂在标题列那层 div（`:style="navStyle"`）上。挂错层级不会
 * 报错，只是行为悄悄错：
 *
 * - 挂在外层包裹 div 上 → 折叠按钮是标题列的**兄弟节点**、同在这个包裹里（条目 28 为让按钮
 *   左缘对齐侧边栏右边框而刻意排的），折叠的点击会冒泡上来一并触发跳转
 * - 挂在 `<header>` 根上 → 右侧插槽（下拉菜单、全屏按钮）的点击同样会冒泡命中
 *
 * 本包没有 DOM 测试工具（无 `@vue/test-utils` / `happy-dom`），沿用
 * `BaseDetailDialog/detailText.test.ts` 的做法直接扫模板源码。
 */

const source = readFileSync(join(import.meta.dirname, 'index.vue'), 'utf8')
const template = source.slice(source.indexOf('<template>')).replace(/<!--[\s\S]*?-->/g, '')

/** 本组件模板的属性值都不含 `>`，按开标签粗切即可 */
const openTags = template.match(/<[a-z][^>]*>/gi) ?? []
const navTags = openTags.filter(tag => tag.includes(':style="navStyle"'))
const collapseBtnTag = openTags.find(tag => tag.includes('v-if="collapsible"')) ?? ''
const navDynamicClass = navTags[0]?.match(/:class="([^"]*)"/)?.[1] ?? ''
const navStaticClass = navTags[0]?.match(/\sclass="([^"]*)"/)?.[1] ?? ''

describe('baseHeader 标题区点击回首页', () => {
  it('点击事件只挂在标题列那层，不在外层容器或 header 根上', () => {
    expect(navTags).toHaveLength(1)
    expect(navTags[0]).toContain('@click')
    expect(openTags.filter(tag => tag.includes('titleClick'))).toEqual(navTags)
  })

  it('折叠按钮的点击仍只切换折叠态', () => {
    expect(collapseBtnTag).toContain('@click="collapsed = !collapsed"')
    expect(collapseBtnTag).not.toContain('titleClick')
  })

  it('手型由 titleClickable 决定，不传的接入方（gcc-login）不出现手型', () => {
    expect(navDynamicClass).toContain('titleClickable')
    expect(navDynamicClass).toContain('cursor-pointer')
    expect(navStaticClass).not.toContain('cursor-pointer')
  })
})
