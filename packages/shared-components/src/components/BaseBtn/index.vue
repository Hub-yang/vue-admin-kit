<script setup lang='ts'>
import type { ButtonType } from 'element-plus'

declare type BtnType = 'add' | 'delete' | 'op-detail' | 'op-delete' | 'op-edit' | 'op-add'
interface Props {
  btnType: BtnType
  disabled?: boolean
  text?: string
}

withDefaults(defineProps<Props>(), {
  disabled: false,
})
defineEmits(['click'])

const btnPropsMap: Record<BtnType, {
  type: ButtonType
  text: string
  icon: string
  link?: boolean
}> = {
  'add': {
    type: 'primary',
    text: '新增',
    icon: 'i-ep-plus',
  },
  'delete': {
    type: 'danger',
    text: '删除',
    icon: 'i-ep-delete',
  },
  'op-add': {
    type: 'primary',
    text: '新增',
    icon: 'i-ep-plus',
    link: true,
  },
  'op-detail': {
    type: 'primary',
    text: '详情',
    icon: 'i-ep-view',
    link: true,
  },
  'op-edit': {
    type: 'primary',
    text: '编辑',
    icon: 'i-ep-edit',
    link: true,
  },
  'op-delete': {
    type: 'danger',
    text: '删除',
    icon: 'i-ep-delete',
    link: true,
  },
}
</script>

<template>
  <el-button
    :type="btnPropsMap[btnType].type"
    :icon="btnPropsMap[btnType].icon"
    :link="!!btnPropsMap[btnType].link"
    :disabled
    @click="$emit('click')"
  >
    {{ text || btnPropsMap[btnType].text }}
  </el-button>
</template>
