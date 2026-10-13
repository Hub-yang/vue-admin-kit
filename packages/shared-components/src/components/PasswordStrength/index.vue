<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{ score: number }>()

const segments = [
  { min: 1, color: 'var(--el-color-danger)', label: '弱' },
  { min: 2, color: 'var(--el-color-warning)', label: '一般' },
  { min: 3, color: 'var(--el-color-success)', label: '强' },
  { min: 4, color: '#0F6E56', label: '非常强' },
]

// score 超出 segments 范围（<1 或 >4）时兜底到最近的一档，避免索引越界
const activeSegment = computed(() => {
  const idx = Math.min(Math.max(props.score, 1), segments.length) - 1
  return segments[idx]!
})
</script>

<template>
  <div v-if="score > 0" class="sc-pwd-strength">
    <div class="sc-pwd-strength__bars">
      <span
        v-for="(_, i) in segments"
        :key="i"
        class="sc-pwd-strength__bar"
        :style="{ background: score > i ? activeSegment.color : undefined }"
      />
    </div>
    <span class="sc-pwd-strength__label" :style="{ color: activeSegment.color }">
      {{ activeSegment.label }}
    </span>
  </div>
</template>

<style lang="scss" scoped>
.sc-pwd-strength {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 14px;

  &__bars {
    display: flex;
    flex: 1;
    gap: 4px;
  }

  &__bar {
    flex: 1;
    height: 3px;
    border-radius: 2px;
    background: var(--el-border-color);
    transition: background 0.25s ease;
  }

  &__label {
    // 下面两条别删：本组件都放在弹窗 / 抽屉里，删了 12px 文字在这个 14px 高的条里
    // 不再垂直居中（原先是 common.scss 一条裸 `span:nth-child(2)` 顺手给的，条目 20260908d）
    display: flex;
    align-items: center;
    height: 100%;
    font-size: 12px;
    white-space: nowrap;
    transition: color 0.25s ease;
  }
}
</style>
