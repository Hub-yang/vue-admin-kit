/**
 * 原 BladeX 版有 25 个静态方法，其余 19 个 TS 化时实测零消费已删（条目 20260901e）。
 * 不要照原版补回来。
 */
export class func {
  static isEmpty(val: any): boolean {
    if (val === null || typeof val === 'undefined' || val === '') {
      return true
    }
    return false
  }

  static join(arr: any): any {
    return Array.isArray(arr) ? arr.join(',') : arr
  }

  static split(str: any): string[] | string {
    return str ? String(str).split(',') : ''
  }

  static toStr(str: any): any {
    if (typeof str === 'undefined' || str === null) {
      return ''
    }
    return str
  }

  static truncateString(str: string, len = 20): string {
    if (str.length > len) {
      return `${str.slice(0, len)}...`
    }
    return str
  }
}
