import type { VueWrapper } from '@vue/test-utils'
import type { Mock } from 'vitest'
// @vitest-environment happy-dom
import type { ColumnOptions } from '../../types'
import { mount } from '@vue/test-utils'
import ElementPlus from 'element-plus'
import { describe, expect, it, vi } from 'vitest'
import BaseTable from './index.vue'

/**
 * 「凡是会清空选中态的路径，都必须补发一次空 `selection-change`」这条契约的回归桩。
 *
 * 两条刷新路径都会 bump `refreshKey` 让 el-table 整体重挂，内部选中态随之清空，
 * **但重挂本身不触发 `selection-change`**。各消费页按约定用 `@selection-change` 自持
 * `selectionList`，不补发这一下，它们手里就留着一批表格上已看不到勾选的行——
 * 批量删除按钮仍然可点，点下去删的正是用户以为没选中的数据。
 *
 * 条目 `20260903q`：`onRefresh()` 当初漏了这一下，九个列表页同时中招。
 */

const columns: ColumnOptions[] = [
  { prop: 'name', label: '名称' },
]

function mountTable(): { wrapper: VueWrapper, fetchApi: Mock, onSelectionChange: Mock } {
  const fetchApi = vi.fn(() => Promise.resolve({
    data: { data: { records: [{ id: 1, name: 'a' }, { id: 2, name: 'b' }], total: 2 } },
  }))
  const onSelectionChange = vi.fn()
  const wrapper = mount(BaseTable, {
    // onSelectionChange 没在 defineProps 里声明，会落进 $attrs——
    // 组件正是从 $attrs 里取它来补发的
    props: { columns, fetchApi, selection: true, onSelectionChange },
    global: { plugins: [ElementPlus] },
  })
  return { wrapper, fetchApi, onSelectionChange }
}

describe('baseTable 选中态清零契约', () => {
  it('工具栏刷新按钮补发一次空 selection-change', async () => {
    const { wrapper, fetchApi, onSelectionChange } = mountTable()
    await vi.waitFor(() => expect(fetchApi).toHaveBeenCalledTimes(1))
    onSelectionChange.mockClear()

    // 按位置定位而不是按图标：工具栏右侧只有刷新、搜索两个 circle 按钮，刷新在前。
    // 不能用 `.i-ep-refresh` 找——`icon="i-ep-refresh"` 是组件名而非类名，element-plus 把它
    // 交给 `<component :is>` 解析，真实应用里靠各自 main.ts 注册的 `i-ep-*` 别名才渲染成图标，
    // 测试环境没注册，这里渲染出来的是 `<i-ep-refresh>` 未知元素
    const circleButtons = wrapper.findAll('.el-button.is-circle')
    expect(circleButtons.length, '工具栏应有刷新与搜索两个 circle 按钮').toBe(2)
    await circleButtons[0]!.trigger('click')

    expect(onSelectionChange).toHaveBeenCalledWith([])
  })

  it('refreshTable() 补发一次空 selection-change', async () => {
    // 懒加载树表删完子节点走的是这条，与上面那条是两个入口，都要补发
    const { wrapper, fetchApi, onSelectionChange } = mountTable()
    await vi.waitFor(() => expect(fetchApi).toHaveBeenCalledTimes(1))
    onSelectionChange.mockClear()

    await (wrapper.vm as any).refreshTable()

    expect(onSelectionChange).toHaveBeenCalledWith([])
  })
})
