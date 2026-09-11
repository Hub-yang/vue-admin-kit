import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * 详情弹窗的值列必须整体套 `detail-info`（黑色加粗），标签列才是灰色——
 * 这条测试为两次真实事故立桩：
 *
 * 1. `5478605` 把 attributify 收紧成 prefixedOnly，裸属性 `<span detail-info>` 静默失效（`37b5c69` 修复）
 * 2. `col.render` 分支从一开始就没套 `detail-info`，用户管理页的「身份证号」「账号有效期」
 *    继承 element-plus 的 `--el-text-color-regular` 显示成灰色细体
 *
 * 两次都不报错、不影响构建，只是样式悄悄不对。本包没有 DOM 测试工具（无 `@vue/test-utils` /
 * `happy-dom`，为一条样式断言引入两个依赖不划算，且会进内网离线包），所以沿用
 * `styles/classPrefix.test.ts` 的做法直接扫模板源码。
 */

const source = readFileSync(join(import.meta.dirname, 'index.vue'), 'utf8')

/** 值列：`<el-col :span="8">`；标签列是 `:span="4"`，不在本测试范围内 */
const valueCell = source.match(/<el-col :span="8">([\s\S]*?)<\/el-col>/)?.[1] ?? ''
const detailInfoBlock = valueCell.match(/<span class="detail-info">[\s\S]*?<\/span>/)?.[0] ?? ''
const RENDER_BRANCH_RE = /RenderCell|compMatchText/

describe('baseDetailDialog 的值列文本样式', () => {
  it('两个渲染分支都在 detail-info 内', () => {
    expect(detailInfoBlock).toContain('RenderCell')
    expect(detailInfoBlock).toContain('compMatchText')
  })

  it('detail-info 之外不残留渲染分支', () => {
    expect(valueCell.replace(detailInfoBlock, '')).not.toMatch(RENDER_BRANCH_RE)
  })
})
