// @vitest-environment happy-dom
import { enableAutoUnmount, mount } from '@vue/test-utils'
import { ElButton } from 'element-plus'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { downloadXls, withConfirm } from '../../utils'
import BaseExportButton from './index.vue'

vi.mock('../../utils', () => ({ downloadXls: vi.fn(), withConfirm: vi.fn() }))
enableAutoUnmount(afterEach)
beforeEach(() => vi.clearAllMocks())

const file = new Blob(['模拟导出'])

function mountButton(props: { params?: AnyKey, querySnapshot?: AnyKey | null, disabled?: boolean } = {}) {
  const exportApi = vi.fn(async (_params?: AnyKey) => ({ data: file }))
  const wrapper = mount(BaseExportButton, {
    props: { exportApi, fileName: '工单.xls', ...props },
    global: { components: { ElButton } },
  })
  return { wrapper, exportApi }
}

async function openConfirm(wrapper: ReturnType<typeof mountButton>['wrapper']) {
  await wrapper.get('button').trigger('click')
  expect(withConfirm).toHaveBeenCalledOnce()
  return vi.mocked(withConfirm).mock.calls[0]![0].onConfirm
}

it.each([{}, { params: { status: 1 } }])('普通独立导出允许省略查询快照：%j', async (props) => {
  const { wrapper, exportApi } = mountButton(props)
  const confirm = await openConfirm(wrapper)
  await confirm()
  expect(exportApi).toHaveBeenCalledExactlyOnceWith('params' in props ? props.params : undefined)
  expect(downloadXls).toHaveBeenCalledExactlyOnceWith(file, '工单.xls')
})

it('无有效查询时禁用按钮，新快照可用后按该快照导出', async () => {
  const { wrapper, exportApi } = mountButton({ querySnapshot: null, params: { status: 0 } })
  expect(wrapper.get('button').element.disabled).toBe(true)
  wrapper.get('button').element.click()
  expect(withConfirm).not.toHaveBeenCalled()
  const snapshot = { status: 1 }
  await wrapper.setProps({ querySnapshot: snapshot })
  expect(wrapper.get('button').element.disabled).toBe(false)
  const confirm = await openConfirm(wrapper)
  await confirm()
  expect(exportApi).toHaveBeenCalledExactlyOnceWith(snapshot)
  expect(downloadXls).toHaveBeenCalledExactlyOnceWith(file, '工单.xls')
})

const replacementApi = vi.fn()

it.each([
  ['查询失效', { querySnapshot: null }],
  ['同条件重新查询', { querySnapshot: { status: 1 } }],
  ['按钮禁用', { disabled: true }],
  ['更换接口', { exportApi: replacementApi }],
  ['更换文件名', { fileName: '会议.xls' }],
] as const)('%s后旧确认不再发起导出', async (_change, props) => {
  const { wrapper, exportApi } = mountButton({ querySnapshot: { status: 1 } })
  const confirm = await openConfirm(wrapper)
  await wrapper.setProps(props)
  await confirm()
  expect(exportApi).not.toHaveBeenCalled()
  expect(replacementApi).not.toHaveBeenCalled()
  expect(downloadXls).not.toHaveBeenCalled()
})

it('组件卸载后旧确认不再发起导出', async () => {
  const { wrapper, exportApi } = mountButton({ querySnapshot: { status: 1 } })
  const confirm = await openConfirm(wrapper)
  wrapper.unmount()
  await confirm()
  expect(exportApi).not.toHaveBeenCalled()
  expect(downloadXls).not.toHaveBeenCalled()
})

it('确认后切换业务，已发出的请求仍以原文件名下载', async () => {
  const { wrapper, exportApi } = mountButton({ querySnapshot: { status: 1 } })
  const response = Promise.withResolvers<{ data: Blob }>()
  exportApi.mockReturnValueOnce(response.promise)
  const confirm = await openConfirm(wrapper)
  const pending = confirm()
  expect(exportApi).toHaveBeenCalledExactlyOnceWith({ status: 1 })
  await wrapper.setProps({ querySnapshot: null, fileName: '会议.xls' })
  response.resolve({ data: file })
  await pending
  expect(downloadXls).toHaveBeenCalledExactlyOnceWith(file, '工单.xls')
})
