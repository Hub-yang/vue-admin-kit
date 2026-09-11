import { cloneDeep } from 'lodash-es'
import { default_option_prop } from './baseConfig'

/**
 * 获取选项标题
 */
export function matchOptionLabel(options: AnyKey[], key: string | number, props = default_option_prop): string {
  props.value ||= 'value'
  props.label ||= 'label'
  props.children ||= 'children'
  options = cloneDeep(options)
  if (!options || !options?.length) {
    return ''
  }
  for (const option of options) {
    if (option[props.value] === key) {
      return option[props.label]
    }

    if (option[props.children] && Array.isArray(option[props.children])) {
      const found = matchOptionLabel(option[props.children], key, props)
      if (found) {
        return found
      }
    }
  }
  return ''
}
