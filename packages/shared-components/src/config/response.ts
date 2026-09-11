/**
 * 后端响应契约的唯一收敛点。
 *
 * 本包假定后端是 BladeX/Saber 形状：axios 的 `res.data` 里再套一层
 * `{ code, success, msg, data }`，列表接口的 `data` 是 `{ records, total }`。
 * 这套形状原先散在 `BaseTable`、`useEditListPageRender`、`BaseImportButton` 三个文件里，
 * 换后端时得靠 grep 才找得全——**包里所有解析后端响应的地方一律走这里，不要就地再写一份**。
 *
 * 刻意不做成可注入的适配器：内网各项目目前共用同一套后端，抽象出来只会有一个实现。
 * 真出现第二种响应形状时，改造的入口也是本文件。
 */

/** 列表接口的解析结果 */
export interface ListPayload {
  records: AnyKey[]
  total: number
}

/**
 * 取列表数据与总数。
 *
 * `records` 用 `??` 而不是 `||` 回落到外层 `data`：空数组是合法的查询结果，
 * 用 `||` 会在「查无数据」时把 `{ records: [], total: 0 }` 这个对象整个当成列表。
 */
export function pickListData(res: AnyKey | undefined): ListPayload {
  const payload = res?.data?.data
  return {
    records: payload?.records ?? (Array.isArray(payload) ? payload : []),
    total: payload?.total || 0,
  }
}

/**
 * 业务是否成功。
 *
 * 两个判据都认：`code === 200` 是 `useEditListPageRender` 原先的写法，
 * `success === true` 是 `BaseImportButton` 原先的写法。BladeX 里两者等价，
 * 这里取并集，免得消费方还要记住哪个组件用哪种。
 */
export function isSuccessResponse(res: AnyKey | undefined): boolean {
  return res?.data?.code === 200 || res?.data?.success === true
}

/** 取后端返回的提示语，缺失或为空串时用兜底文案 */
export function getResponseMessage(res: AnyKey | undefined, fallback: string): string {
  return res?.data?.msg || fallback
}
