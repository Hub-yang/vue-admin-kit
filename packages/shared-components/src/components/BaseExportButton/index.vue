<script setup lang='ts'>
import { ElMessage } from 'element-plus'
import { onBeforeUnmount, ref } from 'vue'
import { downloadXls, withConfirm } from '../../utils'

interface Props {
  /**
   * 导出接口，**由调用方注入已挂 token / baseURL / 拦截器的请求实例**，
   * 且需自行设置 `responseType: 'blob'`。与 `BaseImportButton.uploadApi`、
   * `BaseTable.fetchApi` 是同一条范式：包里不碰 HTTP 客户端，否则拿不到鉴权头。
   */
  exportApi: (params?: AnyKey) => Promise<any>
  /** 导出文件名，含扩展名 */
  fileName: string
  /** 透传给 exportApi 的查询参数 */
  params?: AnyKey
  /** 省略时使用 params；null 禁用导出，每次有效查询传入一份新的参数对象。 */
  querySnapshot?: AnyKey | null
  text?: string // 按钮文本，默认'导出数据'
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
})

const loading = ref(false)

let unmounted = false
onBeforeUnmount(() => {
  unmounted = true
})

/** 查询快照将用户的确认绑定到点击时的业务和参数，过期确认直接结束。 */
function onExport() {
  const { querySnapshot, exportApi, fileName } = props
  if (props.disabled || querySnapshot === null)
    return

  withConfirm({
    label: '导出当前数据',
    onConfirm: async () => {
      if (querySnapshot !== props.querySnapshot)
        return
      if (querySnapshot && (unmounted || props.disabled || exportApi !== props.exportApi || fileName !== props.fileName))
        return

      loading.value = true
      try {
        const res = await props.exportApi(querySnapshot ?? props.params)
        if (!res?.data) {
          ElMessage.error('下载失败，请重试')
          return false
        }
        downloadXls(res.data, querySnapshot ? fileName : props.fileName)
      }
      catch (error) {
        console.error(`${error}`)
        ElMessage.error('下载失败，请重试')
      }
      finally {
        loading.value = false
      }
    },
  })
}
</script>

<template>
  <el-button type="success" icon="i-ep-download" :loading :disabled="disabled || querySnapshot === null" @click="onExport">
    {{ text || '导出数据' }}
  </el-button>
</template>
