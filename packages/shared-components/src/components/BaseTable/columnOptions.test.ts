// @vitest-environment happy-dom
import type { ColumnOptions, Options, TableExpose } from '../../types'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import ElementPlus, { ElSelect, ElTable } from 'element-plus'
import { afterEach, expect, it, vi } from 'vitest'
import { computed, defineComponent, h, shallowRef } from 'vue'
import BaseTable from './index.vue'

enableAutoUnmount(afterEach)

it.each([
  { scenario: '字典晚到', initialName: '', updatedName: '服务类型', searchName: '' },
  { scenario: '字典改名', initialName: '原服务类型', updatedName: '新服务类型', searchName: '' },
  { scenario: '同字段有独立的筛选配置', initialName: '表格标签', updatedName: '新表格标签', searchName: '筛选标签' },
])('$scenario时更新默认单元格并保留已选行', async ({ initialName, updatedName, searchName }) => {
  const records = [{ id: 1, serviceTypeCode: 'service-type' }]
  const fetchApi = vi.fn(async () => ({ data: { data: { records, total: 1 } } }))
  const options = shallowRef<Options[]>(initialName ? [{ value: 'service-type', label: initialName }] : [])
  const tableRef = shallowRef<TableExpose>()
  const Page = defineComponent(() => {
    const columns = computed<ColumnOptions[]>(() => {
      const visibleColumn: ColumnOptions = {
        prop: 'serviceTypeCode',
        label: '所属服务类型',
        renderOptions: { type: 'el-select', options: options.value },
      }
      if (!searchName)
        return [visibleColumn]
      return [
        { ...visibleColumn, searchable: 0 },
        {
          prop: 'serviceTypeCode',
          label: '筛选服务类型',
          showInTable: 0,
          renderOptions: { type: 'el-select', options: [{ value: 'service-type', label: searchName }] },
        },
      ]
    })
    return () => h(BaseTable, { ref: tableRef, columns: columns.value, fetchApi, selection: true })
  })
  const wrapper = mount(Page, { global: { plugins: [ElementPlus] } })
  const label = () => wrapper.get('.el-table__body-wrapper tbody tr td:last-child .cell').text()
  const checkbox = () => wrapper.get<HTMLInputElement>('.el-table__body-wrapper tbody tr input[type="checkbox"]')
  const selectedRows = () => tableRef.value?.getRowSelection()

  await vi.waitFor(() => expect(label()).toBe(initialName || '--'))
  await checkbox().setValue(true)
  await flushPromises()
  expect(checkbox().element.checked).toBe(true)
  expect(selectedRows()).toEqual(records)
  const table = wrapper.getComponent(ElTable).element

  options.value = [{ value: 'service-type', label: updatedName }]
  await flushPromises()

  const searchOptions = searchName ? [{ value: 'service-type', label: searchName }] : options.value
  expect(wrapper.getComponent(ElSelect).props('options')).toEqual(searchOptions)
  expect(label()).toBe(updatedName)
  expect(wrapper.getComponent(ElTable).element).toBe(table)
  expect(checkbox().element.checked).toBe(true)
  expect(selectedRows()).toEqual(records)
  expect(fetchApi).toHaveBeenCalledTimes(1)
})
