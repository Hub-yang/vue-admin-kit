import type { FormItemRule } from 'element-plus'
import type { VNodeRef } from 'vue'

export interface Page {
  pageSize: number
  currentPage: number
  total: number
}

export interface Pagination {
  current: number
  size: number
}

export interface Options { label: string, value: any, children?: Options[], key?: any, color?: string }

export interface ColumnOptions {
  prop: string
  label: string
  width?: number | string
  fixed?: 'left' | 'right'
  align?: 'left' | 'center' | 'right'
  validate?: 0 | 1 // 0非必填 1必填 默认0
  sortable?: 0 | 1 // 0关闭排序 1打开排序 默认1
  type?: 'link' // 特殊列，目前包含link类型，可点击，暴露on-link-click事件
  editable?: 0 | 1 | 2 // 0编辑框不可见 1可编辑 2不可编辑 默认1
  formSlot?: 0 | 1 // formSlot设置为1，即可自定义表单项
  formSlotName?: string // 自定义表单项插槽名，默认default
  span?: 1 | 2 // 表单项跨列数，配合 MainForm 两列网格布局，默认1；传2让该表单项独占一行
  searchable?: 0 | 1 // 0不可搜索 1可搜索 默认1
  showInTable?: 0 | 1 // 0不显示在列表、详情中 1反之 默认1
  showInForm?: 0 | 1 // 0不显示在表单中 1反之 默认1
  renderOptions?: ColumnRenderOptions // 搜索/编辑配置项
  render?: (row: AnyKey, column?: AnyKey) => AnyKey // 自定义节点渲染函数
}

export interface ColumnRenderOptions {
  needMatch?: 0 | 1 // 0无需格式化处理 1反之 默认1
  searchLabel?: string // 搜索框别名，默认为label
  searchOrder?: number // 搜索框排序，从1开始，默认为配置项的声明顺序,
  rule?: FormItemRule
  type?: string // 搜索组件类型，同element标签名
  options?: Options[] | AnyKey[] // type为el-select时提供选项
  props?: AnyKey // 其他组件属性
  ref?: string // 组件引用名称
  slot?: 0 | 1 // 是否有插槽（对应prop），默认0
  slotName?: string // 插槽名，默认default
  slotRender?: () => AnyKey
}

export interface TableExpose {
  tableRef: any
  getRowSelection: () => AnyKey[]
  clearRowSelection: () => void
  fetchList: () => Promise<void>
  reloadList: () => void
  /** 重建表格并按当前条件重拉；懒加载树表变更数据后必须用它，fetchList 清不掉 el-table 的懒加载缓存 */
  refreshTable: () => Promise<void>
  getParams: () => AnyKey
  getTotal: () => number
  expandAll: () => void
  collapseAll: () => void
}
export interface AddEditDialogExpose {
  refMap: Map<string, VNodeRef>
}
