<script setup lang='ts'>
import type { Placement } from 'element-plus'

declare type HelpTipType = 'question' | 'info' | 'success' | 'warning' | 'error'
interface Props {
  content: string
  type?: HelpTipType
  placement?: Placement
}

withDefaults(defineProps<Props>(), {
  type: 'question',
  placement: 'top',
})

const tipPropsMap: Record<HelpTipType, { icon: string, color: string }> = {
  question: { icon: 'i-ep-question-filled', color: 'color-black' },
  info: { icon: 'i-ep-info-filled', color: 'color-[var(--el-color-info)]' },
  success: { icon: 'i-ep-success-filled', color: 'color-[var(--el-color-success)]' },
  warning: { icon: 'i-ep-warning-filled', color: 'color-[var(--el-color-warning)]' },
  error: { icon: 'i-ep-circle-close-filled', color: 'color-[var(--el-color-danger)]' },
}
</script>

<template>
  <el-tooltip :content :placement>
    <span class="relative inline-flex cursor-help align-middle">
      <span class="absolute inset-[15%] rounded-full bg-white" />
      <i class="relative" :class="[tipPropsMap[type].icon, tipPropsMap[type].color]" />
    </span>
  </el-tooltip>
</template>
