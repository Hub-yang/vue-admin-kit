// @vitest-environment happy-dom
import type { ColumnOptions } from '../../types'
import { enableAutoUnmount, mount } from '@vue/test-utils'
import ElementPlus from 'element-plus'
import { afterEach, expect, it, vi } from 'vitest'
import { defineComponent, h, ref } from 'vue'
import BaseTable from './index.vue'

enableAutoUnmount(afterEach)

const columns: ColumnOptions[] = [
  { prop: 'orderCode', label: '服务单号', type: 'link' },
  {
    prop: 'sourceCode',
    label: '来源单号',
    render: row => ({ el: 'span', type: 'link', text: row.sourceCode }),
  },
]

it.each([
  { text: 'ORD-01', property: 'orderCode', label: '服务单号' },
  { text: 'SRC-01', property: 'sourceCode', label: '来源单号' },
])('点击$label时发出该行和 Element Plus 列对象', async ({ text, property, label }) => {
  const row = { id: 1, orderCode: 'ORD-01', sourceCode: 'SRC-01' }
  const fetchApi = async () => ({ data: { data: { records: [row], total: 1 } } })
  const wrapper = mount(BaseTable, {
    props: { columns, fetchApi, showSearchBar: false },
    global: { plugins: [ElementPlus] },
  })
  const linkSelector = '.el-table__body-wrapper tbody td .link_row'
  await vi.waitFor(() => expect(wrapper.findAll(linkSelector)).toHaveLength(2))

  const link = wrapper.findAll(linkSelector).find(cell => cell.text() === text)
  expect(link).toBeDefined()
  expect(link!.element.tagName).toBe('BUTTON')
  expect(link!.attributes('type')).toBe('button')
  await link!.trigger('click')

  expect(wrapper.emitted('onLinkClick')).toEqual([[row, expect.objectContaining({ property, label })]])
})

it.each([undefined, '', '  '])('空白值 %j 只显示占位符', async (value) => {
  const row = { id: 1, orderCode: value, sourceCode: value }
  const fetchApi = async () => ({ data: { data: { records: [row], total: 1 } } })
  const wrapper = mount(BaseTable, {
    props: { columns, fetchApi, showSearchBar: false, index: false },
    global: { plugins: [ElementPlus] },
  })
  const cells = '.el-table__body-wrapper tbody td .cell'
  await vi.waitFor(() => expect(wrapper.findAll(cells)).toHaveLength(2))

  for (const cell of wrapper.findAll(cells)) {
    expect(cell.text()).toBe('--')
    expect(cell.find('button, .link_row, [tabindex]').exists()).toBe(false)
    await cell.get('span').trigger('click')
  }
  expect(wrapper.emitted('onLinkClick')).toBeUndefined()
})

it('自定义组件已经提供按钮时沿用该按钮触发列事件', async () => {
  const CustomButton = defineComponent({
    inheritAttrs: false,
    setup(_, { slots }) {
      return () => h('button', { type: 'button' }, slots.default?.())
    },
  })
  const row = { id: 1, sourceCode: 'SRC-01' }
  const fetchApi = async () => ({ data: { data: { records: [row], total: 1 } } })
  const wrapper = mount(BaseTable, {
    props: {
      columns: [{ prop: 'sourceCode', label: '来源单号', render: record => ({ el: CustomButton, type: 'link', text: record.sourceCode }) }],
      fetchApi,
      showSearchBar: false,
    },
    global: { plugins: [ElementPlus] },
  })
  const cell = '.el-table__body-wrapper tbody td:last-child'
  await vi.waitFor(() => expect(wrapper.get(cell).text()).toBe('SRC-01'))

  expect(wrapper.get(cell).findAll('button, [tabindex="0"]')).toHaveLength(1)
  await wrapper.get(`${cell} button`).trigger('click')
  expect(wrapper.emitted('onLinkClick')).toEqual([[row, expect.objectContaining({ property: 'sourceCode' })]])
})

it('无 href 的外层 a 作为单一可聚焦动作，保留自定义数值文字', async () => {
  const row = { id: 1, sourceCode: 0 }
  const fetchApi = async () => ({ data: { data: { records: [row], total: 1 } } })
  const wrapper = mount(BaseTable, {
    props: {
      columns: [{ prop: 'sourceCode', label: '来源单号', render: record => ({ el: 'a', type: 'link', text: record.sourceCode }) }],
      fetchApi,
      showSearchBar: false,
    },
    global: { plugins: [ElementPlus] },
  })
  const cell = '.el-table__body-wrapper tbody td:last-child'
  await vi.waitFor(() => expect(wrapper.get(cell).text()).toBe('0'))

  const anchor = wrapper.get(`${cell} a`)
  expect(anchor.find('button').exists()).toBe(false)
  expect(anchor.attributes()).toMatchObject({ role: 'button', tabindex: '0' })
  await anchor.trigger('keydown', { key: 'Enter' })
  await anchor.trigger('keydown', { key: ' ' })
  await anchor.trigger('keyup', { key: ' ' })
  expect(wrapper.emitted('onLinkClick')).toEqual([
    [row, expect.objectContaining({ property: 'sourceCode' })],
    [row, expect.objectContaining({ property: 'sourceCode' })],
  ])
})

it('空链接文本保留自带操作的包装按钮', async () => {
  const onClick = vi.fn()
  const fetchApi = async () => ({ data: { data: { records: [{ id: 1 }], total: 1 } } })
  const wrapper = mount(BaseTable, {
    props: {
      columns: [{ prop: 'code', label: '单号', render: () => ({ 'el': 'button', 'type': 'link', 'text': '', 'aria-label': '自定义操作', onClick }) }],
      fetchApi,
      showSearchBar: false,
    },
    global: { plugins: [ElementPlus] },
  })
  const button = 'td button[aria-label="自定义操作"]'
  await vi.waitFor(() => expect(wrapper.get(button).text()).toBe('--'))

  await wrapper.get(button).trigger('click')
  expect(onClick).toHaveBeenCalledTimes(1)
  expect(wrapper.emitted('onLinkClick')).toBeUndefined()
})

it('包装组件内的独立操作不触发链接事件', async () => {
  const onClick = vi.fn()
  const Wrapper = defineComponent({
    setup(_, { slots }) {
      return () => h('div', { role: 'button', tabindex: 0 }, [
        h('button', { type: 'button', onClick }, '独立操作'),
        slots.default?.(),
      ])
    },
  })
  const row = { id: 1, code: 'ZD-01' }
  const fetchApi = async () => ({ data: { data: { records: [row], total: 1 } } })
  const wrapper = mount(BaseTable, {
    props: {
      columns: [{ prop: 'code', label: '单号', render: record => ({ el: Wrapper, type: 'link', text: record.code }) }],
      fetchApi,
      showSearchBar: false,
    },
    global: { plugins: [ElementPlus] },
  })
  const cell = 'td:last-child .cell'
  await vi.waitFor(() => expect(wrapper.get(`${cell} button`).text()).toBe('独立操作'))

  await wrapper.get(`${cell} button`).trigger('click')
  expect(onClick).toHaveBeenCalledTimes(1)
  expect(wrapper.emitted('onLinkClick')).toBeUndefined()
  await wrapper.get(`${cell} .link_row`).trigger('click')
  expect(wrapper.emitted('onLinkClick')).toEqual([[row, expect.objectContaining({ property: 'code' })]])
})

it('包装组件成为可聚焦的控件后移除内部按钮', async () => {
  const enabled = ref(false)
  const Wrapper = defineComponent({
    setup(_, { slots }) {
      return () => h('div', enabled.value ? { role: 'button', tabindex: 0 } : {}, slots.default?.())
    },
  })
  const row = { id: 1, code: 'ZD-01' }
  const fetchApi = async () => ({ data: { data: { records: [row], total: 1 } } })
  const wrapper = mount(BaseTable, {
    props: {
      columns: [{ prop: 'code', label: '单号', render: record => ({ el: Wrapper, type: 'link', text: record.code }) }],
      fetchApi,
      showSearchBar: false,
    },
    global: { plugins: [ElementPlus] },
  })
  const cell = 'td:last-child .cell'
  await vi.waitFor(() => expect(wrapper.get(`${cell} button`).text()).toBe('ZD-01'))

  enabled.value = true
  await vi.waitFor(() => expect(wrapper.get(cell).find('button').exists()).toBe(false))
  await wrapper.get(`${cell} [role="button"]`).trigger('click')
  expect(wrapper.emitted('onLinkClick')).toEqual([[row, expect.objectContaining({ property: 'code' })]])
})

it('包装节点获得 href 后保留调用方的新属性及原生行为', async () => {
  const href = ref('')
  const row = { id: 1, code: 'ZD-01' }
  const fetchApi = async () => ({ data: { data: { records: [row], total: 1 } } })
  const wrapper = mount(BaseTable, {
    props: {
      columns: [{
        prop: 'code',
        label: '单号',
        render: record => ({ el: 'a', type: 'link', text: record.code, ...(href.value ? { href: href.value, role: 'link', tabindex: 3 } : {}) }),
      }],
      fetchApi,
      showSearchBar: false,
    },
    global: { plugins: [ElementPlus] },
  })
  const selector = 'td:last-child .cell a'
  await vi.waitFor(() => expect(wrapper.get(selector).attributes('role')).toBe('button'))

  href.value = '#detail'
  await vi.waitFor(() => expect(wrapper.get(selector).attributes()).toMatchObject({ href: '#detail', role: 'link', tabindex: '3' }))
  await wrapper.get(selector).trigger('keydown', { key: 'Enter' })
  expect(wrapper.emitted('onLinkClick')).toBeUndefined()
})
