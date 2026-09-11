import { isArray, size } from 'lodash-es'

/**
 * 校验是否为非空数组
 * @param {any} value - 校验值
 * @returns {boolean} 返回校验结果
 */
export function isNonEmptyArray(value: any): boolean {
  return isArray(value) && size(value) > 0
}
