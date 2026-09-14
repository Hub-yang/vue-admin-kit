import type { VueWrapper } from '@vue/test-utils'
import type { Mock } from 'vitest'
// @vitest-environment happy-dom
import type { ColumnOptions } from '../../types'
import { mount } from '@vue/test-utils'
import ElementPlus from 'element-plus'
import { describe, expect, it, vi } from 'vitest'
import { BaseSearchBox } from '../BaseSearchBox'
import BaseTable from './index.vue'

/**
 * `BaseTable` 取数链路的回归桩。
 *
 * **element-plus 挂真的、不 stub**，这条是被缺陷的机制逼的：`20260910a` 那个「改条件发两趟请求」
 * 的成因在 el-pagination 内部——它发现 `currentPage > pageCount` 时会走 `currentPageBridge` 的
 * setter 把页码夹回来，而那个 setter 会 `emit('current-change')`，模板上绑的正是 `fetchList()`。
 * 把 el-pagination stub 掉，这个桩测的就是假的。
 */

const columns: ColumnOptions[] = [
  { prop: 'name', label: '名称' },
  { prop: 'status', label: '状态' },
]

/** 记录调用参数的 fetchApi，返回 BladeX 形状；total 可变，用来模拟「换条件后只剩一页」 */
function makeFetchApi(total: () => number = () => 0): Mock {
  return vi.fn((params: AnyKey) => Promise.resolve({
    data: { data: { records: [{ id: 1, name: 'a' }], total: total() } },
    // 参数原样回传，断言时直接读 mock.calls 更直观
    params,
  }))
}

function mountTable(props: AnyKey = {}): { wrapper: VueWrapper, fetchApi: Mock } {
  const fetchApi = props.fetchApi ?? makeFetchApi()
  const wrapper = mount(BaseTable, {
    props: { columns, fetchApi, ...props },
    global: { plugins: [ElementPlus] },
  })
  return { wrapper, fetchApi }
}

/** 取第 n 次请求的参数（n 从 0 起） */
function paramsOf(fetchApi: Mock, n: number): AnyKey {
  // noUncheckedIndexedAccess 下索引访问可能是 undefined；调不到就给空对象，让断言去报错
  return fetchApi.mock.calls[n]?.[0] ?? {}
}

describe('baseTable 取数与分页', () => {
  it('挂载即发一次请求，带上默认分页参数', async () => {
    const { fetchApi } = mountTable()
    await vi.waitFor(() => expect(fetchApi).toHaveBeenCalledTimes(1))
    expect(paramsOf(fetchApi, 0)).toMatchObject({ current: 1, size: 20 })
  })

  it('搜索条件剔空，但数字 0 要留下', async () => {
    const { wrapper, fetchApi } = mountTable()
    await vi.waitFor(() => expect(fetchApi).toHaveBeenCalledTimes(1))

    // 走 BaseSearchBox 的 v-model:search，与页面上的真实路径一致
    wrapper.findComponent(BaseSearchBox).vm.$emit('update:search', { name: '', status: 0, code: 'x' })
    await vi.waitFor(() => expect(fetchApi).toHaveBeenCalledTimes(2))

    const params = paramsOf(fetchApi, 1)
    // `if (value || value === 0)` 那条：空串被剔掉，0 是合法筛选值必须留下
    expect(params).toMatchObject({ status: 0, code: 'x' })
    expect(params).not.toHaveProperty('name')
  })

  it('fetchExtParams 不剔空，这是刻意的', async () => {
    // 左栏树「不限分组」这类场景传的就是空串，剔掉会让「不筛选」和「筛选空值」没法区分。
    // 消费方要么按条件不返回该键，要么在自己的 fetchApi 里剔——模型列表页用的是后者。
    // 20260908e 实测：saber3 模型列表 `?layoutId=&current=1` 会让后端 500。
    const { fetchApi } = mountTable({ fetchExtParams: { layoutId: '' } })
    await vi.waitFor(() => expect(fetchApi).toHaveBeenCalledTimes(1))
    expect(paramsOf(fetchApi, 0)).toHaveProperty('layoutId', '')
  })

  it('改搜索条件时回到第 1 页，且只发一次请求', async () => {
    // 20260910a 的回归桩。停在第 3 页改条件，若不主动把 current 重置成 1：
    // 请求会带 current=3 打到一个只有 1 页的结果集，el-pagination 随后发现越界、
    // 自己把页码夹回来，而夹回去那一下会 emit current-change → 再发一趟。
    // 断言「次数」而不是「参数」，因为缺陷的表现正是多出来的那一趟。
    let total = 100
    const fetchApi = makeFetchApi(() => total)
    const { wrapper } = mountTable({ fetchApi })
    await vi.waitFor(() => expect(fetchApi).toHaveBeenCalledTimes(1))

    // 点真实的页码按钮跳到第 3 页，走 el-pagination 完整的内部逻辑
    const pageThree = wrapper.findAll('.el-pager li').find(li => li.text() === '3')
    expect(pageThree, '没找到第 3 页的页码按钮').toBeTruthy()
    await pageThree!.trigger('click')
    await vi.waitFor(() => expect(fetchApi).toHaveBeenCalledTimes(2))
    expect(paramsOf(fetchApi, 1)).toMatchObject({ current: 3 })

    // 换一个只剩一页的条件
    total = 0
    wrapper.findComponent(BaseSearchBox).vm.$emit('update:search', { name: 'x' })
    await vi.waitFor(() => expect(fetchApi).toHaveBeenCalledTimes(3))
    expect(paramsOf(fetchApi, 2)).toMatchObject({ current: 1 })

    // 给 el-pagination 留出「发现越界并夹回页码」的时间——有缺陷时那一下会在这里补发第 4 趟
    await new Promise(resolve => setTimeout(resolve, 50))
    expect(fetchApi).toHaveBeenCalledTimes(3)
  })
})
