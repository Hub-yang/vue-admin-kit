import type { ColumnOptions } from '../types'
import Schema from 'async-validator'
import { describe, expect, it } from 'vitest'
import { buildFormRules } from './formRules'

/**
 * 这组测试为一个真实缺陷立桩：MainForm 生成的必填规则原先不带 `type`，
 * async-validator 的 getType() 会把缺省 type 回落成 'string' 并断言 typeof value === 'string'，
 * 于是 number 值的必填字段（单选的 1/2、排序数字）永远校验不过；
 * 断言失败的错误又被 rule.message 覆盖成「请输入 XXX」，看不出真实原因。
 * saber3 的菜单页有三个 number 必填字段，是第一个撞上它的消费方。
 */

function validate(rules: AnyKey, model: AnyKey): Promise<string[]> {
  return new Promise((resolve) => {
    new Schema(rules as any).validate(model, (errors: any) => {
      resolve((errors ?? []).map((e: any) => e.message))
    })
  })
}

const columns: ColumnOptions[] = [
  { prop: 'name', label: '菜单名称', validate: 1 },
  { prop: 'category', label: '菜单类型', validate: 1 },
  { prop: 'sort', label: '菜单排序', validate: 1, renderOptions: { type: 'el-input-number' } },
  { prop: 'parentId', label: '上级菜单', validate: 1, renderOptions: { type: 'el-tree-select' } },
  { prop: 'remark', label: '菜单备注' },
]

describe('buildFormRules', () => {
  it('只为 validate === 1 的列建规则', () => {
    const rules = buildFormRules(columns)
    expect(Object.keys(rules).sort()).toEqual(['category', 'name', 'parentId', 'sort'])
  })

  it('number 值的必填字段能通过校验（原缺陷的回归点）', async () => {
    const rules = buildFormRules(columns)
    const errors = await validate(rules, {
      name: '切片测试菜单',
      category: 1,
      sort: 999,
      parentId: 0,
    })
    expect(errors).toEqual([])
  })

  it('空值仍然被拦住，并给出按控件类型区分的提示', async () => {
    const rules = buildFormRules(columns)
    const errors = await validate(rules, {
      name: '',
      category: undefined,
      sort: null,
      parentId: '',
    })
    expect(errors).toContain('请输入菜单名称')
    expect(errors).toContain('请输入菜单类型')
    expect(errors).toContain('请输入菜单排序')
    // el-tree-select 走「请选择」而不是「请输入」
    expect(errors).toContain('请选择上级菜单')
  })

  it('自定义 validator 生效，且不被 message 覆盖', async () => {
    const rules = buildFormRules([
      {
        prop: 'sort',
        label: '菜单排序',
        validate: 1,
        renderOptions: {
          rule: {
            required: true,
            validator: (_rule: any, value: any, cb: any) => (value > 0 ? cb() : cb('排序必须大于 0')),
          },
        },
      },
    ])
    expect(await validate(rules, { sort: 5 })).toEqual([])
    expect(await validate(rules, { sort: 0 })).toEqual(['排序必须大于 0'])
  })

  it('调用方显式指定 type 时以调用方为准', () => {
    const rules = buildFormRules([
      { prop: 'tags', label: '标签', validate: 1, renderOptions: { rule: { type: 'array' } } },
    ]) as AnyKey
    expect(rules.tags[0].type).toBe('array')
  })

  it('缺省必填走自定义 validator，不留给 async-validator 的默认 string 断言', () => {
    const rules = buildFormRules([{ prop: 'category', label: '菜单类型', validate: 1 }]) as AnyKey
    const rule = rules.category[0]
    expect(typeof rule.validator).toBe('function')
    // required 保留是为了 el-form-item 的必填星号
    expect(rule.required).toBe(true)
    // 不能留 message：async-validator 会用它覆盖 validator 给出的提示
    expect(rule.message).toBeUndefined()
    expect(rule.type).toBeUndefined()
  })

  it('空数组也算未填（多选场景）', async () => {
    const rules = buildFormRules([
      { prop: 'roles', label: '角色', validate: 1, renderOptions: { type: 'el-select' } },
    ])
    expect(await validate(rules, { roles: [] })).toEqual(['请选择角色'])
    expect(await validate(rules, { roles: ['admin'] })).toEqual([])
  })

  it('0 与 false 是有效值，不能当成未填', async () => {
    const rules = buildFormRules([
      { prop: 'sort', label: '菜单排序', validate: 1 },
      { prop: 'enabled', label: '是否启用', validate: 1 },
    ])
    expect(await validate(rules, { sort: 0, enabled: false })).toEqual([])
  })
})
