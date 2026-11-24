import { default_option_prop } from './baseConfig'

/** 按父节点、子树、后续同级的顺序查找标签，支持只读字典和字段配置。 */
export function matchOptionLabel(options: AnyKey[], key: string | number, props = default_option_prop): string {
  if (!options?.length)
    return ''

  const valueKey = props.value || 'value'
  const labelKey = props.label || 'label'
  const childrenKey = props.children || 'children'

  for (const option of options) {
    if (option[valueKey] === key)
      return option[labelKey]

    const children = option[childrenKey]
    if (Array.isArray(children)) {
      const found = matchOptionLabel(children, key, props)
      if (found)
        return found
    }
  }
  return ''
}
