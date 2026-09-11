<script setup lang='ts'>
import type { ColumnOptions, Options } from '../../../types'
import { getControlProps } from '../../../utils/componentApi'

interface Props {
  searchItems: ColumnOptions[]
  labelWidth?: string | number
}

withDefaults(defineProps<Props>(), {
  labelWidth: 60, // 标签宽度，默认60px，与 BaseTable 的 searchLabelWidth 默认值保持一致
})
const searchForm = defineModel<AnyKey>('search', { default: () => ({}) })

function matchPlaceholder(type: string) {
  switch (type) {
    case 'el-input':
      return '请输入'
    case 'el-select':
      return '请选择'
    case 'el-cascader':
      return '请选择'
    case 'el-date-picker':
      return '请选择'
    default:
      return '请输入'
  }
}
</script>

<template>
  <template v-for="i in Math.ceil(searchItems.length / 4)" :key="i">
    <el-row>
      <el-col v-for="{ prop, label, renderOptions: { type = 'el-input', props = {}, options = [], searchLabel = '' } = {} } in searchItems.slice((i - 1) * 4, i * 4)" :key="prop" :span="6">
        <span class="left-title" :style="{ minWidth: `${+labelWidth}px` }">{{ searchLabel || label }}</span>
        <component
          :is="type"
          v-model.trim.lazy="searchForm[prop]"
          :placeholder="matchPlaceholder(type as string)"
          clearable
          :disabled="false"
          v-bind="{ ...getControlProps(type as string, options as Options[]), ...props }"
        />
      </el-col>
    </el-row>
  </template>
</template>
