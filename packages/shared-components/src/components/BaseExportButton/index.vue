<script setup lang='ts'>
import { ElMessage } from 'element-plus'
import { ref } from 'vue'
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
  text?: string // 按钮文本，默认'导出数据'
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
})

const loading = ref(false)

async function onExport() {
  withConfirm({
    label: '导出当前数据',
    onConfirm: async () => {
      loading.value = true
      try {
        const res = await props.exportApi(props.params)
        if (!res?.data) {
          ElMessage.error('下载失败，请重试')
          return false
        }
        downloadXls(res.data, props.fileName)
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
  <el-button type="success" icon="i-ep-download" :loading :disabled="disabled" @click="onExport">
    {{ text || '导出数据' }}
  </el-button>
</template>
