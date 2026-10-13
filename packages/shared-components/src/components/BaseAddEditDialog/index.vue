<script setup lang='ts'>
import type { AddEditDialogExpose, ColumnOptions } from '../../types'
import { cloneDeep } from 'lodash-es'
import { computed, ref } from 'vue'
import { BaseDialog } from '../BaseDialog'
import MainForm from './MainForm.vue'

interface Props {
  columns: ColumnOptions[]
  renderType: 'add' | 'edit' | string
  loading?: boolean
  /** 自定义弹窗标题，不传则按 renderType 显示"新增"/"编辑" */
  title?: string
  /**
   * 弹窗模式下把表单排成一列（默认两列）。表单项少的页面两列会显得空，
   * 单列同时要把 width 收窄，否则输入框会被 60% 的默认宽度拉得极长。
   * 抽屉模式本来就是一列，这个开关只对弹窗分支有意义
   */
  singleColumn?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  singleColumn: false,
})

const emit = defineEmits(['onSubmitSuccess', 'onCancel'])
// 「新增 / 编辑」的判据只此一份，标题与提交按钮文案共用，避免两处各写一套后分叉。
// 用 includes 而非 === 'add'：menu 页的 operationType 还有 'addChild' 这个第三态
const isAddMode = computed(() => props.renderType.includes('add'))
const dialogTitle = computed(() => props.title || (isAddMode.value ? '新增' : '编辑'))
const mainFormRef = ref()
const refMap = ref(new Map()) as any

const visible = defineModel<boolean>('visible', { default: false })
const formData = defineModel<AnyKey>('formData', { default: () => ({}) })

const editItems = computed(() => {
  const data = cloneDeep(props.columns).filter(column => column.showInForm !== 0)
  if (props.renderType.includes('add')) {
    return data
  }
  else {
    return data.filter(column => column.editable !== 0) || []
  }
})

function onSubmitForm() {
  const ruleFormRef = mainFormRef.value?.ruleFormRef
  ruleFormRef?.validate?.((valid: any) => {
    if (valid) {
      emit('onSubmitSuccess', () => {
        visible.value = false
        ruleFormRef?.resetFields?.()
        formData.value = {}
      })
    }
    else {
      const isError = document.querySelector('.is-error')
      if (isError) {
        isError.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }
  })
}

function onDialogClose() {
  visible.value = false
}

function onDialogClosed() {
  mainFormRef.value?.ruleFormRef?.resetFields?.()
  formData.value = {}
  refMap.value.clear()
}

function onCancel() {
  visible.value = false
  emit('onCancel')
}

defineExpose<AddEditDialogExpose>({
  refMap,
})
</script>

<template>
  <BaseDialog
    v-if="editItems.length <= 16"
    v-model:visible="visible"
    v-bind="props"
    :title="dialogTitle"
    @on-closed="onDialogClosed"
    @close="onDialogClose"
  >
    <MainForm ref="mainFormRef" v-model:form-data="formData" v-model:ref-map="refMap" :edit-items :single-column mode="dialog">
      <template v-for="(_value, name) in $slots" #[name]="slotProps">
        <slot :name="name" v-bind="slotProps" />
      </template>
    </MainForm>
    <template #footer>
      <div class="custom_dialog_footer">
        <el-button type="primary" icon="i-ep-check" :loading @click="onSubmitForm">
          {{ isAddMode ? '提交' : '保存' }}
        </el-button>
        <el-button icon="i-ep-close" @click="onCancel">
          取消
        </el-button>
      </div>
    </template>
  </BaseDialog>

  <el-drawer
    v-else
    v-model="visible"
    class="sc-custom_drawer_box"
    :show-close="false"
    v-bind="props"
    :title="dialogTitle"
    size="26%"
    resizable
    destroy-on-close
    :close-on-click-modal="false"
    :close-on-press-escape="false"
    @closed="onDialogClosed"
    @close="onDialogClose"
  >
    <template #header="{ close }">
      <div class="custom_dialog_header">
        <div class="title_con">
          <span>{{ dialogTitle }}</span>
          <slot name="tag" />
        </div>
        <span class="custom_dialog_actions">
          <i class="i-ep-close custom_dialog_close_icon" @click="close" />
        </span>
      </div>
    </template>
    <MainForm ref="mainFormRef" v-model:form-data="formData" v-model:ref-map="refMap" :edit-items mode="drawer">
      <template v-for="(_value, name) in $slots" #[name]="slotProps">
        <slot :name="name" v-bind="slotProps" />
      </template>
    </MainForm>
    <template #footer>
      <div class="custom_dialog_footer">
        <el-button type="primary" icon="i-ep-check" :loading @click="onSubmitForm">
          {{ isAddMode ? '提交' : '保存' }}
        </el-button>
        <el-button icon="i-ep-close" @click="onCancel">
          取消
        </el-button>
      </div>
    </template>
  </el-drawer>
</template>

<style lang="scss">
@use '../../styles/common.scss';
</style>
