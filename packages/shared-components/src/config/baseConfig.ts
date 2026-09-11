import type { Pagination } from '../types'

// table公共属性
export const BASE_TABLE_PROPS: AnyKey = {
  'show-header': true,
  'border': true,
  'header-cell-style': { backgroundColor: '#fafafa' },
  'element-loading-text': '加载中...',
  'show-overflow-tooltip': true,
}
// pagination公共属性
export const BASE_PAGINATION_PROPS: AnyKey = {
  'background': true,
  'page-sizes': [20, 50, 100],
  'layout': 'total, prev, pager, next, sizes',
}

// 默认分页
export const default_pagination: Pagination = {
  current: 1,
  size: 20,
}
export const default_no_pagination: Pagination = {
  current: 1,
  size: 500,
}

// 默认option prop
export const default_option_prop: AnyKey = {
  value: 'value',
  label: 'label',
  children: 'children',
}

// 默认日期格式
export const default_date_format = 'YYYY-MM-DD HH:mm:ss'
export const default_time_format = 'YYYY-MM-DD 00:00:00'
export const default_date_format2 = 'YYYY-MM-DD'
// 导出文件名日期格式
export const export_date_format = 'YYYYMMDDHHmm'

// 默认弹窗列表样式
export const default_dialog_table_style: AnyKey = { maxHeight: '550px', overflowY: 'scroll' }
