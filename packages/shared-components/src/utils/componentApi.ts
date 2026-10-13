import type { MessageType } from 'element-plus'
import type { ColumnOptions, Options } from '../types'
import { ElMessageBox } from 'element-plus'
import { isNumber } from 'lodash-es'
import { default_option_prop } from '../config/baseConfig'
import { matchOptionLabel } from '../config/options'

interface WithConfirmOptions {
  /** 动作描述，拼成「是否确认{label}？」；整句自定义时改用 message */
  label?: string
  /** 完整提示语，给定时不再套用「是否确认…？」句式 */
  message?: string
  title?: string
  type?: MessageType
  /** 返回 Promise 时，确认按钮保持 loading 直到它 settle 才关框 */
  onConfirm: () => unknown
  onCancel?: () => void
  onCatch?: () => void
  onFinally?: () => void
}

export function compMatchText(row: AnyKey, column: ColumnOptions): string {
  const value = row[column.prop]
  if (column?.renderOptions?.type === 'el-select') {
    const matchProps = column?.renderOptions?.props?.props || default_option_prop
    return matchOptionLabel(column.renderOptions.options as Options[], value, matchProps)
  }
  if (column?.renderOptions?.type === 'el-tree-select') {
    const matchProps = column?.renderOptions?.props?.props || default_option_prop
    return matchOptionLabel(column.renderOptions.props?.data as Options[], value, matchProps)
  }
  else if ((column?.renderOptions?.type === 'el-cascader' && column?.renderOptions?.needMatch !== 0) || column?.renderOptions?.type === 'el-radio-group') {
    const matchProps = column?.renderOptions?.props?.props || default_option_prop
    // props.options 是历史写法；顶层 options 与 el-select 分支保持一致，两处都认
    const options = (column.renderOptions?.props?.options || column.renderOptions?.options) as Options[]
    return matchOptionLabel(options, value, matchProps)
  }
  else {
    return (isNumber(value) && value === -1) ? '' : value
  }
}

export function handleOptionDisabled(data: AnyKey[], id: string): void {
  data.forEach((item: AnyKey) => {
    if ((item.id === id)) {
      item.disabled = true
      if (item.hasChildren) {
        setOptionDisabled(item.children, true)
      }
    }

    if (item.hasChildren) {
      handleOptionDisabled(item.children, id)
    }
  })
}

export function setOptionDisabled(data: AnyKey[], isDisabled: boolean): void {
  data.forEach((item: AnyKey) => {
    item.disabled = isDisabled
    if (item.hasChildren) {
      setOptionDisabled(item.children, isDisabled)
    }
  })
}

export async function withConfirm(options: WithConfirmOptions): Promise<any> {
  const {
    label = '',
    message = '',
    title = '提示',
    type = 'warning',
    onConfirm,
    onCancel,
    onCatch,
    onFinally,
  } = options
  try {
    return await ElMessageBox.confirm(message || `是否确认${label}？`, title, {
      type,
      closeOnClickModal: false,
      closeOnPressEscape: false,
      customClass: 'custom-confirm-dialog',
      beforeClose: async (actionType, instance, done) => {
        if (actionType === 'confirm') {
          instance.confirmButtonLoading = true
          try {
            await onConfirm()
          }
          catch (error) {
            console.error(`${error}`)
          }
          finally {
            instance.confirmButtonLoading = false
            // 请求在飞时点过取消/关闭会改写 action（见下方分支），不改回来就会按「取消」收尾
            instance.action = 'confirm'
            done()
          }
        }
        else {
          // 在飞的请求取消不了，此时关框只会丢掉 loading 反馈、让用户误以为操作已撤销
          if (instance.confirmButtonLoading)
            return
          if (onCancel)
            onCancel()
          done()
        }
      },
    })
  }
  catch {
    // 点「取消」或右上角关闭走的是 reject，不是异常
    if (onCatch)
      onCatch()
  }
  finally {
    if (onFinally)
      onFinally()
  }
}

/**
 * 支持 `options` 数据源 prop 的控件（element-plus 2.14.5 起 radio/checkbox 组也支持）
 */
const OPTIONS_CONTROLS = ['el-select', 'el-select-v2', 'el-tree-select', 'el-cascader', 'el-radio-group', 'el-checkbox-group', 'el-segmented']
/**
 * 支持 `filterable` 与 `fit-input-width` 的控件——都是带下拉面板的选择器
 */
const FILTERABLE_CONTROLS = ['el-select', 'el-select-v2', 'el-tree-select', 'el-cascader']

/**
 * 按列配置的 type 动态渲染控件时，取该类型真正支持的额外 props。
 * 不做裁剪的话，`options` / `filterable` / `fit-input-width` 会下发给 el-date-picker、
 * el-input-number 这类根本不认它们的控件，作为无效属性落到 DOM 上。
 *
 * **搜索区（`BaseSearchBox/comp/Main.vue`）与表单区（`BaseAddEditDialog/MainForm.vue`）共用这一份。**
 * 曾经只有搜索区裁剪、表单区无条件下发三个属性，同一个包里两套标准——新增控件类型时
 * 只改一处就会让两边再次分叉。
 */
export function getControlProps(type: string, options: Options[]): AnyKey {
  const props: AnyKey = {}
  if (OPTIONS_CONTROLS.includes(type)) {
    props.options = options
  }
  if (FILTERABLE_CONTROLS.includes(type)) {
    props.filterable = true
    props.fitInputWidth = true
  }
  return props
}
