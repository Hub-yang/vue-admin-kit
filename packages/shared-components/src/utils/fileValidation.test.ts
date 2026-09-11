import { describe, expect, it } from 'vitest'
import { validateImportFile } from './fileValidation'

const config = { allowedExtensions: ['.xls'], maxSize: 10 * 1024 * 1024 }

describe('validateImportFile', () => {
  it('扩展名匹配、大小达标时校验通过', () => {
    expect(validateImportFile({ name: 'a.xls', size: 1024 }, config)).toEqual({ valid: true })
  })

  it('扩展名比较不区分大小写', () => {
    expect(validateImportFile({ name: 'A.XLS', size: 1024 }, config)).toEqual({ valid: true })
  })

  it('扩展名不匹配时给出格式提示', () => {
    const result = validateImportFile({ name: 'a.png', size: 1024 }, config)
    expect(result).toEqual({ valid: false, message: '仅支持 .xls 格式的文件' })
  })

  it('超过大小上限时给出大小提示', () => {
    const result = validateImportFile({ name: 'a.xls', size: 11 * 1024 * 1024 }, config)
    expect(result).toEqual({ valid: false, message: '文件大小不能超过 10MB' })
  })

  it('可配置多个允许的扩展名（BaseImportButton 缺陷 #6 的修复点）', () => {
    const multiConfig = { allowedExtensions: ['.xls', '.xlsx'], maxSize: config.maxSize }
    expect(validateImportFile({ name: 'a.xlsx', size: 1024 }, multiConfig)).toEqual({ valid: true })
    expect(validateImportFile({ name: 'a.csv', size: 1024 }, multiConfig)).toEqual({ valid: false, message: '仅支持 .xls、.xlsx 格式的文件' })
  })
})
