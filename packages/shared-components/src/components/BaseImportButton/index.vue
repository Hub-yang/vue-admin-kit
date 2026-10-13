<script setup lang='ts'>
import type { ValidatableFile } from '../../utils'
import { ElMessage } from 'element-plus'
import { computed, ref } from 'vue'
import { getResponseMessage, isSuccessResponse } from '../../config/response'
import { validateImportFile, withConfirm } from '../../utils'

interface Props {
  uploadApi: (formData: FormData) => Promise<any> // 上传接口，由调用方注入已挂 token/拦截器的请求实例
  text?: string // 按钮文本，默认'导入'
  allowedExtensions?: string[] // 允许的文件扩展名，默认['.xls']
}

const props = withDefaults(defineProps<Props>(), {
  allowedExtensions: () => ['.xls'],
})
const emit = defineEmits(['onSuccess'])

const dialogVisible = ref(false)
const loading = ref(false)
const selectedFile = ref(null)
const uploadRef = ref()

const fileConfig = computed(() => ({
  maxSize: 10 * 1024 * 1024, // 10MB
  allowedExtensions: props.allowedExtensions,
}))

const tipText = computed(() => `仅支持 ${props.allowedExtensions.join('、')} 格式文件，文件大小不超过 10MB`)

function validateFile(file: AnyKey = {}, fileList?: AnyKey[]) {
  const result = validateImportFile(file as ValidatableFile, fileConfig.value)
  if (!result.valid) {
    ElMessage.error(result.message)
    if (fileList?.length) {
      const index = fileList.findIndex(item => item.uid === file.uid)
      if (index !== -1) {
        fileList.splice(index, 1)
      }
      selectedFile.value = null
    }
    return false
  }
  return true
}

function onFileChange(file: AnyKey, fileList: AnyKey[]) {
  if (validateFile(file, fileList)) {
    selectedFile.value = file.raw
  }
}

function beforeUpload(file: AnyKey) {
  if (!validateFile(file)) {
    return false
  }

  if (file.size === 0) {
    ElMessage.error('不能上传空文件')
    return false
  }

  return true
}

function onExceed() {
  ElMessage.warning('一次只能导入一个文件，请先移除当前文件')
}

async function onConfirm() {
  withConfirm({
    label: '导入该文件',
    onConfirm: async () => {
      const formData = new FormData()
      formData.append('file', selectedFile.value as any)
      // loading 必须在这里置位：它同时驱动按钮的转圈和 onDialogClose 的「导入中不许关」，
      // 少了这一对赋值，那条守卫永远不触发——用户能在上传途中关掉弹窗
      loading.value = true
      try {
        const res = await props.uploadApi(formData)

        if (isSuccessResponse(res)) {
          ElMessage.success('导入成功')
          dialogVisible.value = false
          emit('onSuccess')
        }
        else {
          ElMessage.error(getResponseMessage(res, '导入失败'))
        }
      }
      finally {
        loading.value = false
      }
    },
  })
}

function onDialogClose() {
  if (loading.value) {
    ElMessage.warning('正在导入中，无法关闭')
    return false
  }
  uploadRef.value?.clearFiles()
  selectedFile.value = null
}
</script>

<template>
  <el-button type="success" icon="i-ep-upload" @click="dialogVisible = true">
    {{ text || '导入' }}
  </el-button>

  <el-dialog
    v-model="dialogVisible"
    :title="text"
    width="500px"
    draggable
    :close-on-click-modal="false"
    @close="onDialogClose"
  >
    <el-upload
      ref="uploadRef"
      :auto-upload="false"
      :on-change="onFileChange"
      :on-remove="() => selectedFile = null"
      :before-upload="beforeUpload"
      :limit="1"
      :on-exceed="onExceed"
      :accept="allowedExtensions.join()"
      drag
    >
      <i class="i-ep-upload-filled icon_upload" />
      <div class="upload_text">
        将文件拖到此处，或<em>点击选择文件</em>
      </div>
      <template #tip>
        <div class="upload_tip">
          {{ tipText }}
        </div>
      </template>
    </el-upload>

    <template #footer>
      <el-button
        type="primary"
        icon="i-ep-check"
        :loading
        :disabled="!selectedFile"
        @click="onConfirm"
      >
        导入
      </el-button>
      <el-button icon="i-ep-close" :disabled="loading" @click="dialogVisible = false">
        取消
      </el-button>
    </template>
  </el-dialog>
</template>

<style lang='scss' scoped>
.icon_upload {
  font-size: 50px;
  color: var(--el-color-primary);
  margin-bottom: 16px;
}

.upload_text {
  font-size: 14px;
  color: #606266;

  em {
    color: var(--el-color-primary);
    font-style: normal;
  }
}

.upload_tip {
  margin-top: 7px;
  font-size: 12px;
  color: #909399;
}
</style>
