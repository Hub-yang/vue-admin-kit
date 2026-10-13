import type { Pagination } from '../types'

export const BASE_TABLE_PROPS: AnyKey = {
  'show-header': true,
  'border': true,
  'header-cell-style': { backgroundColor: '#fafafa' },
  'element-loading-text': '加载中...',
  'show-overflow-tooltip': true,
}
export const BASE_PAGINATION_PROPS: AnyKey = {
  'background': true,
  'page-sizes': [20, 50, 100],
  'layout': 'total, prev, pager, next, sizes',
}

export const default_pagination: Pagination = {
  current: 1,
  size: 20,
}
export const default_no_pagination: Pagination = {
  current: 1,
  size: 500,
}

export const default_option_prop: AnyKey = {
  value: 'value',
  label: 'label',
  children: 'children',
}

export const default_date_format = 'YYYY-MM-DD HH:mm:ss'
export const default_time_format = 'YYYY-MM-DD 00:00:00'
export const default_date_format2 = 'YYYY-MM-DD'
export const export_date_format = 'YYYYMMDDHHmm'

export const default_dialog_table_style: AnyKey = { maxHeight: '550px', overflowY: 'scroll' }
