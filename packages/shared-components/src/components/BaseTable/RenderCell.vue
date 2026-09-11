<script setup lang='ts'>
import { computed } from 'vue'

const props = defineProps<{
  render: (row: AnyKey, column?: AnyKey) => AnyKey
  row: AnyKey
  col: AnyKey
}>()

const emit = defineEmits(['linkClick'])
const result = computed(() => props.render(props.row, props.col))
</script>

<template>
  <component :is="result.el" v-bind="result">
    <span
      :class="result.type === 'link' ? 'link_row' : ''"
      @click="result.type === 'link' ? emit('linkClick') : null"
    >{{ result.text }}</span>
  </component>
</template>
