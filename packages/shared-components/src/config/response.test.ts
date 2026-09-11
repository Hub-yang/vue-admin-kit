import { describe, expect, it } from 'vitest'
import { getResponseMessage, isSuccessResponse, pickListData } from './response'

describe('pickListData', () => {
  it('分页形状取 records 与 total', () => {
    const res = { data: { data: { records: [{ id: 1 }], total: 37 } } }
    expect(pickListData(res)).toEqual({ records: [{ id: 1 }], total: 37 })
  })

  it('不分页的接口直接返回数组，total 回落成数组长度以外的 0', () => {
    // 与收敛前的 `res.data.data.total || 0` 等价：裸数组上没有 total
    const res = { data: { data: [{ id: 1 }, { id: 2 }] } }
    expect(pickListData(res)).toEqual({ records: [{ id: 1 }, { id: 2 }], total: 0 })
  })

  it('data 缺失时给空列表而不是抛错', () => {
    expect(pickListData({ data: {} })).toEqual({ records: [], total: 0 })
    expect(pickListData(undefined)).toEqual({ records: [], total: 0 })
  })

  it('records 为空数组时不回落到外层 data 对象', () => {
    // `??` 而非 `||`：空数组是合法结果，回落会把 { records: [], total: 0 } 整个当成列表
    const res = { data: { data: { records: [], total: 0 } } }
    expect(pickListData(res)).toEqual({ records: [], total: 0 })
  })
})

describe('isSuccessResponse', () => {
  it('code 为 200 判定成功', () => {
    expect(isSuccessResponse({ data: { code: 200 } })).toBe(true)
  })

  it('success 为 true 判定成功', () => {
    expect(isSuccessResponse({ data: { success: true } })).toBe(true)
  })

  it('业务失败与空响应都判定失败', () => {
    expect(isSuccessResponse({ data: { code: 500, success: false } })).toBe(false)
    expect(isSuccessResponse({ data: {} })).toBe(false)
    expect(isSuccessResponse(undefined)).toBe(false)
  })
})

describe('getResponseMessage', () => {
  it('取后端的 msg', () => {
    expect(getResponseMessage({ data: { msg: '文件格式不正确' } }, '导入失败')).toBe('文件格式不正确')
  })

  it('msg 缺失或为空串时用兜底文案', () => {
    expect(getResponseMessage({ data: {} }, '导入失败')).toBe('导入失败')
    expect(getResponseMessage({ data: { msg: '' } }, '导入失败')).toBe('导入失败')
    expect(getResponseMessage(undefined, '导入失败')).toBe('导入失败')
  })
})
