import type { ColumnOptions, Options } from '../types'
import { ElMessageBox } from 'element-plus'
import { describe, expect, it, vi } from 'vitest'
import { compMatchText, getControlProps, withConfirm } from './componentApi'

vi.mock('element-plus', () => ({
  ElMessageBox: { confirm: vi.fn(() => Promise.resolve('confirm')) },
}))

/**
 * 条目 04 验证：saber3 15 处树选择器（avue `type:'tree'`）能否直接用现有的
 * `renderOptions.type: 'el-tree-select'` 链路覆盖，而不必新建 BaseTreeSelect 组件。
 * MainForm 已经把 `type` 当动态组件名透传给 `<component :is>`，这里补的是
 * 表格展示态 compMatchText 那一半——树形数据递归查找 + 自定义 props 键名。
 */

const treeData = [
  {
    id: 1,
    title: '系统管理',
    children: [
      { id: 2, title: '菜单管理' },
      { id: 3, title: '角色管理' },
    ],
  },
  { id: 4, title: '流程中心' },
]

describe('compMatchText - el-tree-select', () => {
  it('用默认 label/value 键在树形数据里递归匹配', () => {
    const column: ColumnOptions = {
      prop: 'parentId',
      label: '上级菜单',
      renderOptions: {
        type: 'el-tree-select',
        props: {
          data: treeData.map(item => ({ ...item, label: item.title, value: item.id, children: item.children?.map(c => ({ ...c, label: c.title, value: c.id })) })),
        },
      },
    }
    expect(compMatchText({ parentId: 3 }, column)).toBe('角色管理')
  })

  it('saber3 侧字段名各不相同，靠 renderOptions.props.props 显式指定 label/value 键', () => {
    // saber3 部门树用 title/id，与 avue props:{label:'title', value:'id'} 同构
    const column: ColumnOptions = {
      prop: 'deptId',
      label: '部门',
      renderOptions: {
        type: 'el-tree-select',
        props: {
          data: treeData,
          props: { label: 'title', value: 'id' },
        },
      },
    }
    expect(compMatchText({ deptId: 2 }, column)).toBe('菜单管理')
    expect(compMatchText({ deptId: 4 }, column)).toBe('流程中心')
  })

  it('匹配不到时返回空字符串，不抛异常', () => {
    const column: ColumnOptions = {
      prop: 'deptId',
      label: '部门',
      renderOptions: {
        type: 'el-tree-select',
        props: { data: treeData, props: { label: 'title', value: 'id' } },
      },
    }
    expect(compMatchText({ deptId: 999 }, column)).toBe('')
  })
})

/**
 * 条目 52 第 3 条：搜索区把列配置的 `renderOptions.type` 直接透给 `<component :is>`，
 * 但 `options` / `filterable` / `fit-input-width` 并不是每个控件都认——
 * 无条件下发时，日期、数字输入这类控件会把它们当成无效 DOM 属性渲染出来。
 * 能力表按 element-plus 2.14.5 的组件 d.ts 逐个核对过。
 */
describe('getControlProps', () => {
  const options: Options[] = [{ label: '启用', value: 1 }]

  it('el-select 系拿到 options + filterable + fitInputWidth', () => {
    for (const type of ['el-select', 'el-select-v2', 'el-tree-select', 'el-cascader']) {
      expect(getControlProps(type, options)).toEqual({
        options,
        filterable: true,
        fitInputWidth: true,
      })
    }
  })

  it('el-radio-group / el-checkbox-group / el-segmented 只拿 options，不拿筛选相关的两项', () => {
    // el-segmented 也吃 options，但它没有下拉面板——给了 filterable 是无效属性
    for (const type of ['el-radio-group', 'el-checkbox-group', 'el-segmented']) {
      expect(getControlProps(type, options)).toEqual({ options })
    }
  })

  it('输入型控件三项都不下发', () => {
    for (const type of ['el-input', 'el-input-number', 'el-date-picker', 'el-time-picker']) {
      expect(getControlProps(type, options)).toEqual({})
    }
  })

  it('未知类型按输入型处理，不下发任何额外 props', () => {
    expect(getControlProps('el-something-new', options)).toEqual({})
  })

  it('options 为空数组时仍按类型如实下发，不做额外裁剪', () => {
    expect(getControlProps('el-select', [])).toEqual({
      options: [],
      filterable: true,
      fitInputWidth: true,
    })
  })
})

/**
 * message 是给「整句提示语」用的旁路：默认句式「是否确认{label}？」装不下
 * 「当前修改尚未保存，是否返回？」这类不以动作名收尾的提示。
 */
describe('withConfirm', () => {
  const confirm = vi.mocked(ElMessageBox.confirm)

  it('只给 label 时套用默认句式', async () => {
    confirm.mockClear()
    await withConfirm({ label: '删除该记录', onConfirm: () => {} })
    expect(confirm).toHaveBeenCalledWith('是否确认删除该记录？', '提示', expect.anything())
  })

  it('给了 message 就整句替换，不再拼 label', async () => {
    confirm.mockClear()
    await withConfirm({ message: '当前修改尚未保存，是否返回？', onConfirm: () => {} })
    expect(confirm).toHaveBeenCalledWith('当前修改尚未保存，是否返回？', '提示', expect.anything())
  })
})
