import type { ColumnOptions, Options } from '../types'
import { ElMessageBox } from 'element-plus'
import { describe, expect, it, vi } from 'vitest'
import { compMatchText, getControlProps, withConfirm } from './componentApi'

vi.mock('element-plus', () => ({
  ElMessageBox: { confirm: vi.fn(() => Promise.resolve('confirm')) },
}))

/**
 * 树选择器刻意复用 `renderOptions.type: 'el-tree-select'` 链路、不新建 BaseTreeSelect 组件
 * （条目 04）。MainForm 已把 `type` 透给 `<component :is>`，这里立的是表格展示态
 * compMatchText 那一半的桩——树形数据递归查找 + 自定义 props 键名。
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
 * 能力表按 element-plus 2.14.5 的组件 d.ts 逐个核对过（条目 52）；
 * 为什么必须按类型裁剪见 `getControlProps` 的 JSDoc。
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

/**
 * 按 element-plus 2.14.5 message-box 的真实时序造一个假弹窗：点按钮先改写 `state.action`
 * 再调 beforeClose；`done` 只关一次，按关闭那一刻的 action 决定 resolve / reject。
 * 原测试把 confirm 整个 mock 成 resolve，beforeClose 一次都没执行过。
 */
interface FakeBox {
  state: { action: string, confirmButtonLoading: boolean }
  readonly closed: boolean
  click: (action: 'confirm' | 'cancel' | 'close') => void
}

function mountFakeBox(): FakeBox {
  const confirm = vi.mocked(ElMessageBox.confirm)
  const state = { action: '' as string, confirmButtonLoading: false }
  let closed = false
  let options: any
  confirm.mockImplementationOnce((_message, _title, opts) => new Promise((resolve, reject) => {
    options = opts
    const done = (): void => {
      if (closed)
        return
      closed = true
      if (state.action === 'confirm')
        resolve('confirm')
      else
        reject(state.action)
    }
    ;(state as any).done = done
  }) as any)
  return {
    state,
    get closed() { return closed },
    click(action: 'confirm' | 'cancel' | 'close') {
      state.action = action
      options.beforeClose(action, state, (state as any).done)
    },
  }
}

function deferred(): { promise: Promise<void>, resolve: () => void, reject: (reason?: unknown) => void } {
  let resolve!: () => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<void>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

describe('withConfirm - 异步 onConfirm', () => {
  it('onConfirm 未结束前确认框保持打开，确认按钮处于 loading', async () => {
    const box = mountFakeBox()
    const task = deferred()
    void withConfirm({ label: '删除', onConfirm: () => task.promise })
    box.click('confirm')
    await Promise.resolve()

    expect(box.state.confirmButtonLoading).toBe(true)
    expect(box.closed).toBe(false)

    task.resolve()
    await vi.waitFor(() => expect(box.closed).toBe(true))
    expect(box.state.confirmButtonLoading).toBe(false)
  })

  it('onConfirm reject 时照样关框、复位 loading，失败不逃逸成 unhandled rejection', async () => {
    const box = mountFakeBox()
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const result = withConfirm({ label: '删除', onConfirm: () => Promise.reject(new Error('504')) })
    box.click('confirm')

    await result
    expect(box.closed).toBe(true)
    expect(box.state.confirmButtonLoading).toBe(false)
    expect(error).toHaveBeenCalledWith(expect.stringContaining('504'))
    error.mockRestore()
  })

  it('请求在飞时点取消或右上角关闭被忽略，结束后仍按「确认」收尾', async () => {
    const box = mountFakeBox()
    const task = deferred()
    const onCancel = vi.fn()
    const onCatch = vi.fn()
    const result = withConfirm({ label: '删除', onConfirm: () => task.promise, onCancel, onCatch })
    box.click('confirm')
    await Promise.resolve()

    box.click('cancel')
    box.click('close')
    expect(box.closed).toBe(false)
    expect(onCancel).not.toHaveBeenCalled()

    task.resolve()
    await expect(result).resolves.toBe('confirm')
    expect(onCatch).not.toHaveBeenCalled()
  })

  it('同步 onConfirm 照常执行后关框', async () => {
    const box = mountFakeBox()
    const onConfirm = vi.fn()
    const result = withConfirm({ label: '删除', onConfirm })
    box.click('confirm')

    await expect(result).resolves.toBe('confirm')
    expect(onConfirm).toHaveBeenCalledOnce()
    expect(box.closed).toBe(true)
  })

  it('未点确认就取消时只走 onCancel / onCatch', async () => {
    const box = mountFakeBox()
    const onConfirm = vi.fn()
    const onCancel = vi.fn()
    const onCatch = vi.fn()
    const result = withConfirm({ label: '删除', onConfirm, onCancel, onCatch })
    box.click('cancel')

    await result
    expect(onConfirm).not.toHaveBeenCalled()
    expect(onCancel).toHaveBeenCalledOnce()
    expect(onCatch).toHaveBeenCalledOnce()
  })
})
