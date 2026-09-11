<script setup lang='ts'>
import type { ColumnOptions } from '../../types'
import { computed } from 'vue'
import { compMatchText } from '../../utils/componentApi'
import { BaseDialog } from '../BaseDialog'
import RenderCell from '../BaseTable/RenderCell.vue'

interface Props {
  columns: ColumnOptions[]
  data?: AnyKey
}
const props = withDefaults(defineProps<Props>(), {
  data: () => ({}),
})

const visible = defineModel<boolean>('visible', { default: false })

const rows = computed(() => {
  const result: ColumnOptions[][] = []
  for (let i = 0; i < props.columns.length; i += 2)
    result.push(props.columns.slice(i, i + 2))
  return result
})
</script>

<template>
  <BaseDialog v-model:visible="visible" title="查看" width="50%">
    <template v-for="(row, idx) in rows" :key="idx">
      <el-row :gutter="20">
        <template v-for="col in row" :key="col.prop">
          <el-col :span="4">
            <span class="detail-title">{{ col.label }}：</span>
          </el-col>
          <el-col :span="8">
            <!--
              detail-info 套在分支外面而不是各分支内部：render 分支的产物由调用方决定，
              套在里面就得每个 render 自己加 class，而同一个 render 还要供 BaseTable 的
              表格单元格用（那里不该加粗），加不得——查看态的字重该由弹窗自己裁决
            -->
            <span class="detail-info">
              <!-- 与 BaseTable 一致地支持 column.render，否则图标之类的列在查看态只能显示原始值 -->
              <RenderCell v-if="col.render" :render="col.render" :row="data" :col="col" />
              <template v-else>{{ compMatchText(data, col) || '--' }}</template>
            </span>
          </el-col>
        </template>
      </el-row>
      <br>
    </template>
  </BaseDialog>
</template>
