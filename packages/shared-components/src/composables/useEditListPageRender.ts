import type { ComputedRef, Ref } from 'vue'
import type { TableExpose } from '../types'
import { ElMessage } from 'element-plus'
import { cloneDeep } from 'lodash-es'
import { computed, ref } from 'vue'
import { isSuccessResponse } from '../config/response'
import { withConfirm } from '../utils'

interface Params {
  deleteApi: (params: AnyKey) => Promise<any>
  deleteApiType?: number // 1-ids 2-数组
}

interface UseEditListPageRenderReturn {
  dialogViewVisible: Ref<boolean>
  dialogAddEditVisible: Ref<boolean>
  addEditForm: Ref<AnyKey>
  currentRow: Ref<AnyKey>
  tableRef: Ref<TableExpose | undefined>
  operationType: Ref<'add' | 'edit'>
  loading: Ref<boolean>
  selectedData: ComputedRef<AnyKey[]>
  onView: (row: AnyKey) => void
  onAdd: () => void
  onDelete: (row: AnyKey, successCb?: () => void) => void
  onBatchDelete: (successCb?: () => void) => void
  onEdit: (row: AnyKey) => void
}

export function useEditListPageRender({ deleteApi, deleteApiType = 1 }: Params): UseEditListPageRenderReturn {
  const dialogViewVisible = ref(false)
  const dialogAddEditVisible = ref(false)
  const addEditForm = ref<AnyKey>({})
  const currentRow = ref<AnyKey>({})
  const tableRef = ref<TableExpose>()
  const operationType = ref<'add' | 'edit'>('add')
  const loading = ref(false)

  const selectedData = computed(() => tableRef.value?.getRowSelection() ?? [])

  function onView(row: AnyKey): void {
    currentRow.value = cloneDeep(row)
    dialogViewVisible.value = true
  }

  function onDelete({ id = '' }: AnyKey, successCb?: () => void): void {
    withConfirm({
      label: '删除当前数据',
      onConfirm: async () => {
        const params = deleteApiType === 1 ? { ids: id } : [id]
        const res = await deleteApi(params)
        if (isSuccessResponse(res)) {
          ElMessage.success('删除成功！')
          tableRef.value?.reloadList()
          successCb && successCb()
        }
      },
    })
  }

  function onBatchDelete(successCb?: () => void): void {
    withConfirm({
      label: `删除选中的 ${selectedData.value.length} 条数据`,
      onConfirm: async () => {
        const ids = selectedData.value.map(({ id }) => id)
        const params = deleteApiType === 1 ? { ids } : ids
        const res = await deleteApi(params)
        if (isSuccessResponse(res)) {
          ElMessage.success('删除成功！')
          tableRef.value?.reloadList()
          successCb && successCb()
        }
      },
      onFinally: () => {
        tableRef.value?.clearRowSelection()
      },
    })
  }

  function onAdd(): void {
    operationType.value = 'add'
    dialogAddEditVisible.value = true
  }

  function onEdit(row: AnyKey): void {
    operationType.value = 'edit'
    currentRow.value = cloneDeep(row)
    addEditForm.value = cloneDeep(row)
    dialogAddEditVisible.value = true
  }

  return {
    dialogViewVisible,
    dialogAddEditVisible,
    addEditForm,
    currentRow,
    tableRef,
    operationType,
    loading,
    selectedData,
    onView,
    onAdd,
    onDelete,
    onBatchDelete,
    onEdit,
  }
}
