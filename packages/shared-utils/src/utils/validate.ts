const HTTP_URL_REGEX = /^https?:\/\/.*/
const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*#?&])[A-Z\d@$!%*#?&]{8,16}$/i

export function isURL(s: string): boolean {
  return HTTP_URL_REGEX.test(s)
}

export function validateNull(val: any): boolean {
  if (typeof val === 'boolean') {
    return false
  }
  if (typeof val === 'number') {
    return false
  }
  if (Array.isArray(val)) {
    if (val.length === 0)
      return true
  }
  else if (val instanceof Object) {
    if (JSON.stringify(val) === '{}')
      return true
  }
  else {
    if (val === 'null' || val == null || val === 'undefined' || val === undefined || val === '')
      return true
    return false
  }
  return false
}

export function validatePassword(_rule: any, value: any, cb: (args?: any) => void): void {
  if (!value) {
    return cb('请输入密码')
  }
  if (value && !PASSWORD_REGEX.test(value)) {
    return cb('密码不符合规则，请重新输入')
  }
  cb()
}

const EMAIL_REGEX = /^[\w.%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i
const MOBILE_REGEX = /^1[3-9]\d{9}$/
const ID_CARD_15_REGEX = /^\d{15}$/
const ID_CARD_18_REGEX = /^\d{17}[\dX]$/i
/** GB 11643-1999 的加权因子与校验码表，下标即「加权和 % 11」 */
const ID_CARD_WEIGHTS = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2]
const ID_CARD_CHECK_CODES = ['1', '0', 'X', '9', '8', '7', '6', '5', '4', '3', '2']

/**
 * 空值分支：`buildFormRules`（shared-components）在列配置带 validator 时，会用它顶掉默认的必填规则，
 * 所以格式校验器必须自己判断必填——依据是 `buildFormRules` 写进 rule 的 `required`。
 * 这样同一个校验器既能用于必填字段，也能用于「选填但填了就要合格式」的字段。
 *
 * 返回 undefined 表示值非空、该继续做格式判断；返回字符串或空串表示已经有结论，
 * 空串即「放行」（调用方要 `cb()` 而不是 `cb('')`，async-validator 把空串也当错误）。
 */
function emptyResult(rule: any, value: any, label: string): string | undefined {
  if (!validateNull(value)) {
    return undefined
  }
  return rule?.required ? `请输入${label}` : ''
}

export function validateEmail(rule: any, value: any, cb: (args?: any) => void): void {
  const empty = emptyResult(rule, value, '邮箱')
  if (empty !== undefined) {
    return empty ? cb(empty) : cb()
  }
  return EMAIL_REGEX.test(String(value)) ? cb() : cb('邮箱格式不正确')
}

export function validateMobile(rule: any, value: any, cb: (args?: any) => void): void {
  const empty = emptyResult(rule, value, '手机号')
  if (empty !== undefined) {
    return empty ? cb(empty) : cb()
  }
  return MOBILE_REGEX.test(String(value)) ? cb() : cb('手机号格式不正确')
}

/** 身份证号格式校验：18 位算到校验位，15 位老证只校验长度与字符 */
export function validateIdCard(rule: any, value: any, cb: (args?: any) => void): void {
  const empty = emptyResult(rule, value, '身份证号')
  if (empty !== undefined) {
    return empty ? cb(empty) : cb()
  }
  const idCard = String(value).toUpperCase()
  if (ID_CARD_15_REGEX.test(idCard)) {
    return cb()
  }
  if (!ID_CARD_18_REGEX.test(idCard)) {
    return cb('身份证号格式不正确')
  }
  const sum = ID_CARD_WEIGHTS.reduce((acc, weight, index) => acc + Number(idCard[index]) * weight, 0)
  return ID_CARD_CHECK_CODES[sum % 11] === idCard[17] ? cb() : cb('身份证号格式不正确')
}
