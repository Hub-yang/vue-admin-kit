import { describe, expect, it, vi } from 'vitest'
import { isURL, validateEmail, validateIdCard, validateMobile, validateNull, validatePassword } from './validate'

describe('isURL', () => {
  it('接受 http(s) 开头的地址', () => {
    expect(isURL('http://a.com')).toBe(true)
  })
  it('拒绝非 http(s) 开头的地址', () => {
    expect(isURL('ftp://a.com')).toBe(false)
  })
})

describe('validateNull', () => {
  it('空字符串 / 空数组 / 空对象视为空', () => {
    expect(validateNull('')).toBe(true)
    expect(validateNull([])).toBe(true)
    expect(validateNull({})).toBe(true)
  })
  it('0 / false / 非空字符串不视为空', () => {
    expect(validateNull(0)).toBe(false)
    expect(validateNull(false)).toBe(false)
    expect(validateNull('x')).toBe(false)
  })
})

describe('validatePassword', () => {
  it('空值回调错误信息', () => {
    const cb = vi.fn()
    validatePassword(null, '', cb)
    expect(cb).toHaveBeenCalledWith('请输入密码')
  })
  it('格式不符回调错误信息', () => {
    const cb = vi.fn()
    validatePassword(null, 'abc', cb)
    expect(cb).toHaveBeenCalledWith('密码不符合规则，请重新输入')
  })
  it('合法密码回调无参数', () => {
    const cb = vi.fn()
    validatePassword(null, 'Abcd123!', cb)
    expect(cb).toHaveBeenCalledWith()
  })
})

describe('validateEmail', () => {
  it('必填时空值报「请输入邮箱」', () => {
    const cb = vi.fn()
    validateEmail({ required: true }, '', cb)
    expect(cb).toHaveBeenCalledWith('请输入邮箱')
  })
  it('选填时空值放行', () => {
    const cb = vi.fn()
    validateEmail({ required: false }, '', cb)
    expect(cb).toHaveBeenCalledWith()
  })
  it('格式不符回调错误信息', () => {
    const cb = vi.fn()
    validateEmail({ required: true }, 'abc@', cb)
    expect(cb).toHaveBeenCalledWith('邮箱格式不正确')
  })
  it('合法邮箱回调无参数', () => {
    const cb = vi.fn()
    validateEmail({ required: true }, 'zhang.san_01@itc.cr', cb)
    expect(cb).toHaveBeenCalledWith()
  })
})

describe('validateMobile', () => {
  it('必填时空值报「请输入手机号」', () => {
    const cb = vi.fn()
    validateMobile({ required: true }, '', cb)
    expect(cb).toHaveBeenCalledWith('请输入手机号')
  })
  it('选填时空值放行', () => {
    const cb = vi.fn()
    validateMobile({ required: false }, '', cb)
    expect(cb).toHaveBeenCalledWith()
  })
  it('位数不足或号段非法回调错误信息', () => {
    const cb = vi.fn()
    validateMobile({}, '1381234567', cb)
    expect(cb).toHaveBeenCalledWith('手机号格式不正确')
    validateMobile({}, '12812345678', cb)
    expect(cb).toHaveBeenCalledWith('手机号格式不正确')
  })
  it('合法手机号回调无参数', () => {
    const cb = vi.fn()
    validateMobile({}, '13812345678', cb)
    expect(cb).toHaveBeenCalledWith()
  })
})

describe('validateIdCard', () => {
  it('选填时空值放行', () => {
    const cb = vi.fn()
    validateIdCard({ required: false }, '', cb)
    expect(cb).toHaveBeenCalledWith()
  })
  it('必填时空值报「请输入身份证号」', () => {
    const cb = vi.fn()
    validateIdCard({ required: true }, '', cb)
    expect(cb).toHaveBeenCalledWith('请输入身份证号')
  })
  it('长度不对回调错误信息', () => {
    const cb = vi.fn()
    validateIdCard({}, '11010119900307', cb)
    expect(cb).toHaveBeenCalledWith('身份证号格式不正确')
  })
  it('18 位但校验位算错时也拒绝', () => {
    const cb = vi.fn()
    validateIdCard({}, '110101199003075518', cb)
    expect(cb).toHaveBeenCalledWith('身份证号格式不正确')
  })
  it('合法 18 位身份证回调无参数', () => {
    const cb = vi.fn()
    validateIdCard({}, '110101199003075517', cb)
    expect(cb).toHaveBeenCalledWith()
  })
  it('兼容 15 位老身份证', () => {
    const cb = vi.fn()
    validateIdCard({}, '110101900307551', cb)
    expect(cb).toHaveBeenCalledWith()
  })
})
