import { isArray, size } from 'lodash-es'

export function isNonEmptyArray(value: any): boolean {
  return isArray(value) && size(value) > 0
}
