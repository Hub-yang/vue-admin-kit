/**
 * 通用工具类。
 *
 * 原 BladeX 模板版有 25 个静态方法，saber3 在条目 06a TS 化时实测只有下面几个有消费方，
 * 其余 19 个（notEmpty / isUndefined / toNumber / toFormData / format / formatDateTime /
 * formatDate / toLocalISOString / isArrayAndNotEmpty / formatUrl / bytesToKB /
 * jsonArrayToKeyValue / keyValueToJsonArray / camelCaseString / strGenerate /
 * generateUUID / filterEmptyObject / getUserTenantId）连同它们之间的互相调用一并删除。
 * 条目 20260901e 把 saber3 的本地副本删掉、统一到本文件，那份副本的结论并入此处。
 */
export class func {
  /**
   * 为空
   * @param val
   */
  static isEmpty(val: any): boolean {
    // 原式第三个条件尾部还有 `&& val !== undefined`，在 val === '' 已成立的分支里恒为真，
    // 是 vue-tsc 抓到的死条件，去掉属等价化简（结论来自 saber3 条目 06a）
    if (val === null || typeof val === 'undefined' || val === '') {
      return true
    }
    return false
  }

  /**
   * 根据逗号联合
   * @param arr
   */
  static join(arr: any): any {
    return Array.isArray(arr) ? arr.join(',') : arr
  }

  /**
   * 根据逗号分隔
   * @param str
   */
  static split(str: any): string[] | string {
    return str ? String(str).split(',') : ''
  }

  /**
   * 转换空字符串
   * @param str
   */
  static toStr(str: any): any {
    if (typeof str === 'undefined' || str === null) {
      return ''
    }
    return str
  }

  /**
   * 截取字符串
   * @param str 字符串
   * @param len 截取长度
   */
  static truncateString(str: string, len = 20): string {
    if (str.length > len) {
      return `${str.slice(0, len)}...`
    }
    return str
  }
}
