import type { FormItemRule, FormRules } from 'element-plus'
import type { ColumnOptions } from '../types'

function matchPlaceholder(type?: string): string {
  switch (type) {
    case 'el-select':
    case 'el-tree-select':
    case 'el-cascader':
    case 'el-date-picker':
      return '请选择'
    default:
      return '请输入'
  }
}

function isEmptyInput(value: unknown): boolean {
  if (value === undefined || value === null || value === '') {
    return true
  }
  return Array.isArray(value) && value.length === 0
}

/**
 * 由 ColumnOptions 生成 el-form 的校验规则。
 *
 * 必填不能只写 `required: true` 交给 async-validator 兜底：它的 getType() 在 rule.type 缺省时
 * 一律回落成 'string'，而 string 校验器会断言 typeof value === 'string'
 * （见 async-validator/dist-web/index.js 的 getType 与 string 实现）。
 * 于是 number 值的必填字段（单选的 1/2、el-input-number 的排序值）永远校验不过，
 * 且断言失败的错误会被 rule.message 整个替换，报出来的是「请输入 XXX」，看不出真实原因。
 *
 * 换成 `type: 'any'` 同样不行——它让空字符串不再算空值，必填就形同虚设。
 * 所以这里给出显式 validator：自己定义「空」，完全不做类型断言。
 * `required: true` 保留，是为了让 el-form-item 显示必填星号。
 */
export function buildFormRules(columns: ColumnOptions[]): FormRules<AnyKey> {
  return columns
    .filter(column => column.validate === 1)
    .reduce((acc, { prop, label, renderOptions = {} }) => {
      const rule = renderOptions.rule
      const item: FormItemRule = {
        ...rule,
        required: rule?.required ?? true,
        trigger: rule?.trigger || 'change',
      }
      if (!rule?.validator) {
        const message = rule?.message || `${matchPlaceholder(renderOptions.type)}${label}`
        // 用 validator 而不是 message + required，避免 async-validator 的默认 string 断言
        item.validator = (_rule, value, callback) => {
          callback(isEmptyInput(value) ? new Error(message as string) : undefined)
        }
        delete item.message
      }
      acc[prop] = [item]
      return acc
    }, {} as AnyKey)
}
