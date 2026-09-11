<script setup lang='ts'>
import type { ElTable } from 'element-plus'
import type { ColumnOptions, Pagination, TableExpose } from '../../types'
import { cloneDeep, isEmpty, isEqual, isString, merge } from 'lodash-es'
import { computed, ref, toRaw, unref, useAttrs, watch } from 'vue'
import { useRefresh } from '../../composables/useRefresh'
import { BASE_PAGINATION_PROPS, BASE_TABLE_PROPS, default_no_pagination, default_pagination } from '../../config/baseConfig'
import { pickListData } from '../../config/response'
import { compMatchText } from '../../utils/componentApi'
import { BaseSearchBox } from '../BaseSearchBox'
import RenderCell from './RenderCell.vue'

interface ExpandProps {
  label?: string
  width?: number | string
}

interface Props {
  columns: ColumnOptions[]
  selection?: boolean // 是否有勾选列，默认false
  selectable?: (row: AnyKey, index: number) => boolean // el-table selectable属性
  index?: boolean // 是否有索引列，默认true
  expandProps?: ExpandProps // 展开列配置，默认false
  showSearchBar?: boolean // 是否有搜索区域，默认true
  havePagination?: boolean // 是否有分页，默认true
  opColumnWidth?: number | string // 操作栏宽度，默认100
  fetchApi: (params: AnyKey) => any // 列表api
  fetchExtParams?: AnyKey // 列表调用额外参数
  handleParamsCb?: (originParams: AnyKey) => any // 参数处理api
  isTree?: boolean // 是否为树形列表
  treeFilterKey?: string // 树形列表检索key
  paginationParams?: Pagination // 分页参数默认值
  paginationOptions?: AnyKey // 分页配置项
  rowKey?: string // 列表主键
  searchLabelWidth?: string | number // 搜索区域标签宽度
}

defineOptions({
  inheritAttrs: false,
})

const props = withDefaults(defineProps<Props>(), {
  selection: false,
  index: true,
  showSearchBar: true,
  havePagination: true,
  opColumnWidth: 100,
  fetchExtParams: () => ({}),
  isTree: false,
  searchLabelWidth: 60,
  treeFilterKey: '',
  paginationParams: default_pagination as any,
})

const emit = defineEmits<{
  (e: 'refreshChange'): void
  (e: 'onLinkClick', rowData: AnyKey): void
  (e: 'onSearchReset'): void
}>()

defineSlots<{
  topCon?: () => any
  topBtn?: () => any
  default?: () => any
  expand?: (row: AnyKey) => any
  operation?: (props: AnyKey) => any
}>()

// 合并原生组件属性并设置默认值
const $attrs = useAttrs()

const mergedAttrs = computed(() => ({
  ...$attrs,
  'row-key': $attrs['row-key'] || 'id',
}))

const { refresh, refreshKey } = useRefresh()
const pagination = ref<Pagination>({ ...props.paginationParams })
const searchParams = ref<AnyKey>({})
const lastQueryParams = ref<AnyKey>({})
const tableRef = ref<InstanceType<typeof ElTable | any>>()
const searchBarVisible = ref(props.showSearchBar)
const total = ref(0)
const tableData = ref<AnyKey[]>([])
const loading = ref(false)

const paginationOptions = computed(() => {
  const _o_ = props.paginationOptions ?? {}
  return merge({}, BASE_PAGINATION_PROPS, _o_)
})

fetchList()

/**
 * 查询条件变了必须回到第 1 页，两条 watch 都要做。
 *
 * 不做的话，停在第 3 页时改条件会带着 `current=3` 去查一个可能只有 1 页的结果：
 * 先渲染一次空列表，随后 el-pagination 自己发现 `currentPage > pageCount`、把页码夹回来——
 * 而它夹回去走的是内部 `currentPageBridge` 的 setter，那里会 emit `current-change`，
 * 模板上绑的正是 `fetchList()`，于是**同一次筛选发两趟请求**，中间还闪一次空表。
 *
 * 这里从外部赋值 `pagination.current` 不经过那个 setter，不会 emit、不会多发请求。
 */
watch(searchParams, () => {
  pagination.value.current = 1
  fetchList()
}, { deep: true })

watch(() => props.fetchExtParams, (val, oldVal) => {
  if (!isEqual(val, oldVal)) {
    pagination.value.current = 1
    fetchList()
  }
}, { deep: true })

async function fetchList() {
  loading.value = true
  try {
    const temp = toRaw(searchParams.value)
    const _searchParams: AnyKey = {}
    if (!isEmpty(temp)) {
      for (const [key, value] of Object.entries(temp)) {
        if (value || value === 0) {
          _searchParams[key] = value
        }
      }
    }
    const pageParams = props.havePagination ? pagination.value : default_no_pagination
    let queryParams = {
      ..._searchParams,
      ...pageParams,
      ...props.fetchExtParams,
    }

    if (props.handleParamsCb) {
      queryParams = props.handleParamsCb(cloneDeep(queryParams))
    }
    lastQueryParams.value = cloneDeep(queryParams)
    const res = await props.fetchApi(queryParams)
    // 响应形状的解析统一走 config/response.ts，不要在这里就地展开 res.data.data
    const { records: data, total: totalCount } = pickListData(res)
    total.value = totalCount
    if (data.length && props.isTree) {
      initTreeDataLevels(data)
    }
    tableData.value = data
  }
  catch (error) {
    console.error(`${error}`)
  }
  finally {
    loading.value = false
  }
}

const treeSearchKeyWord = computed(() => {
  const key = props.treeFilterKey
  return key ? searchParams.value[key] : ''
})

watch(() => treeSearchKeyWord.value, (val) => {
  tableData.value.forEach((row) => {
    tableRef.value?.toggleRowExpansion(row, !!val)
  })
})

const filteredTreeData = computed(() => {
  const key = props.treeFilterKey
  if (!treeSearchKeyWord.value) {
    return tableData.value
  }

  const filter = (nodes: AnyKey[]): any => {
    if (!nodes) {
      return []
    }
    return nodes.filter((node) => {
      // 检查当前节点是否匹配
      const isMatch = node[key].toLowerCase().includes(treeSearchKeyWord.value.toLowerCase())
      // 如果当前节点匹配,直接包含该节点及其所有子节点
      if (isMatch) {
        return true
      }

      // 如果当前节点不匹配，但子节点有匹配的，也包含该节点
      if (node.children?.length) {
        const filteredChildren = filter(node.children)
        if (filteredChildren.length > 0) {
          return true
        }
      }

      return false
    }).map((node: AnyKey) => {
      // 对匹配的节点处理其子节点
      if (node.children?.length) {
        const filteredChildren = filter(node.children)
        return { ...node, children: filteredChildren }
      }
      return node
    })
  }

  return filter(tableData.value)
})

/**
 *  为树形列表数据添加level属性
 */
function initTreeDataLevels(nodes: AnyKey[], level = 1) {
  if (!nodes) {
    return
  }

  nodes.forEach((node) => {
    node.level = level
    if (node.children) {
      if (isString(node.children)) {
        try {
          node.children = JSON.parse(node.children)
        }
        catch {
          console.warn('[BaseTable] children JSON解析失败', node)
          node.children = []
        }
      }
      initTreeDataLevels(node.children, level + 1)
    }
  })
}

function getRowSelection() {
  return tableRef.value?.getSelectionRows() ?? []
}

function clearRowSelection() {
  tableRef.value?.clearSelection()
}

/**
 * 通知消费方「表格的选中态已经清零」。
 *
 * 下面两条刷新路径都会 bump `refreshKey` 让 el-table 整体重挂，内部选中态随之清空，
 * **但重挂本身不会触发 `selection-change`**。各消费页按约定用 `@selection-change` 自持
 * `selectionList`（见 packages/shared-components/CLAUDE.md 与 apps/gcc-saber3/CLAUDE.md §4.1），
 * 不补发这一下，它们手里就留着一批表格上已看不到勾选的行——批量删除按钮仍然可点，
 * 点下去删的正是用户以为没选中的数据。**两条路径都要调，少一条就是这个缺陷本身。**
 */
function notifySelectionCleared() {
  const onSelectionChange = $attrs.onSelectionChange as ((rows: AnyKey[]) => void) | undefined
  onSelectionChange?.([])
}

function onRefresh() {
  refresh()
  reloadList()
  notifySelectionCleared()
  emit('refreshChange')
}

function onSearchBoxToggle() {
  searchBarVisible.value = !searchBarVisible.value
}

/**
 * 重建表格并按当前查询条件重新拉取。
 *
 * 懒加载树表（lazy + load）展开出来的子节点存在 el-table 内部的 lazyTreeNodeMap 里，
 * fetchList() 只换 :data、清不掉它——删掉一个子节点后它会继续显示在表里。
 * 这里先 bump refreshKey 让表格整体重建，再拉数据，是目前唯一可靠的清缓存方式。
 * 与 reloadList() 的区别：不重置分页与搜索条件。
 */
function refreshTable() {
  refresh()
  notifySelectionCleared()
  return fetchList()
}

function reloadList() {
  pagination.value = { ...props.paginationParams }
  searchParams.value = {}
}

function getParams() {
  return cloneDeep(lastQueryParams.value)
}

function getTotal() {
  return unref(total) || 0
}

function handleSelectable(row: AnyKey, index: number) {
  if (props.selectable) {
    return props.selectable(row, index)
  }
  else {
    return true
  }
}

function onSearchReset() {
  emit('onSearchReset')
  reloadList()
}

function onSizeChange() {
  pagination.value.current = 1
  fetchList()
}

function toggleAllExpansion(nodes: AnyKey[], expanded: boolean) {
  nodes.forEach((node) => {
    tableRef.value?.toggleRowExpansion(node, expanded)
    if (node.children?.length) {
      toggleAllExpansion(node.children, expanded)
    }
  })
}

/**
 * 存在expand列时提供全部展开方法
 */
function expandAll() {
  if (!tableRef.value)
    return false
  const data = (props.isTree && props.treeFilterKey) ? filteredTreeData.value : tableData.value
  toggleAllExpansion(data, true)
}

/**
 * 存在expand列时提供全部折叠方法
 */
function collapseAll() {
  if (!tableRef.value)
    return false
  const data = (props.isTree && props.treeFilterKey) ? filteredTreeData.value : tableData.value
  toggleAllExpansion(data, false)
}

const searchLoading = ref(false)

async function onSearch() {
  searchLoading.value = true
  try {
    await fetchList()
  }
  catch (error) {
    console.error(`${error}`)
  }
  finally {
    searchLoading.value = false
  }
}

defineExpose<TableExpose>({
  tableRef,
  getParams,
  getTotal,
  getRowSelection,
  clearRowSelection,
  fetchList,
  reloadList,
  refreshTable,
  expandAll,
  collapseAll,
})
</script>

<template>
  <div class="sc-base_table_con">
    <slot name="topCon" />
    <!-- 基础搜索。v-if 刻意保留、不改成常驻 DOM + 高度折叠：show-search-bar 的语义是
         「初始是否展开」而非「有没有搜索能力」——传 false 的页面（model/flow-design）
         用户仍可点工具栏那个搜索按钮把它打开。改成常驻，那个页面会一直挂着一份搜索表单 -->
    <el-collapse-transition>
      <BaseSearchBox
        v-if="searchBarVisible"
        v-model:search="searchParams"
        :loading="searchLoading"
        :columns
        :label-width="searchLabelWidth"
        @on-search-reset="onSearchReset"
        @on-search="onSearch"
      />
    </el-collapse-transition>

    <el-card class="base_table_card" shadow="never">
      <div class="top_btn_box">
        <div class="btn_con">
          <slot name="topBtn" />
        </div>
        <div class="btn_con">
          <el-button circle icon="i-ep-refresh" @click="onRefresh" />
          <el-button circle icon="i-ep-search" @click="onSearchBoxToggle" />
        </div>
      </div>

      <div :key="refreshKey" class="table_con" :class="expandProps ? '--with_expand' : ''">
        <el-table
          ref="tableRef"
          v-loading.lock="loading"
          height="100%"
          :data="(isTree && treeFilterKey) ? filteredTreeData : tableData"
          v-bind="{ ...BASE_TABLE_PROPS, ...mergedAttrs }"
        >
          <template #empty>
            <el-empty :image-size="100" />
          </template>

          <el-table-column v-if="selection" type="selection" align="center" :selectable="handleSelectable" />
          <el-table-column v-if="index" type="index" align="center" label="#" fixed />

          <el-table-column v-if="expandProps" type="expand" fixed :label="expandProps?.label || ''" :width="expandProps?.width">
            <template #default="{ row }">
              <slot :row name="expand" />
            </template>
          </el-table-column>

          <template v-for="column in columns" :key="column.prop">
            <el-table-column v-if="column.showInTable !== 0 && column?.renderOptions?.slot !== 1" v-bind="column" :sortable="column.sortable !== 0" show-overflow-tooltip>
              <template #default="scope">
                <RenderCell
                  v-if="column.render"
                  :render="column.render"
                  :row="scope.row"
                  :col="scope.column"
                  @link-click="$emit('onLinkClick', scope.row)"
                />
                <span v-else :class="[column.type === 'link' && !!compMatchText(scope.row, column) ? 'link_row' : '']" @click="column.type === 'link' ? $emit('onLinkClick', scope.row) : null">{{ compMatchText(scope.row, column) || '--' }}</span>
              </template>
            </el-table-column>

            <el-table-column v-if="column?.renderOptions?.slot === 1" v-bind="column" :sortable="column.sortable !== 0" show-overflow-tooltip>
              <template #default="scope">
                <slot :name="column?.renderOptions?.slotName" :scope />
              </template>
            </el-table-column>
          </template>
          <el-table-column v-if="$slots.operation" label="操作" align="center" fixed="right" :width="opColumnWidth">
            <template #default="scope">
              <div class="op_btn_box">
                <slot name="operation" :scope />
              </div>
            </template>
          </el-table-column>
        </el-table>
      </div>
      <el-pagination
        v-if="havePagination"
        v-model:current-page="pagination.current"
        v-model:page-size="pagination.size"
        class="page_con"
        :total
        v-bind="paginationOptions"
        @size-change="onSizeChange"
        @current-change="fetchList()"
      />
    </el-card>
  </div>
</template>

<style lang="scss">
@use '../../styles/common.scss';
</style>
