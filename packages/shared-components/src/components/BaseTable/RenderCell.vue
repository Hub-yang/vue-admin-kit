<script setup lang='ts'>
import { computed } from 'vue'
import TableLink from './TableLink.vue'

const props = defineProps<{
  render: (row: AnyKey, column?: AnyKey) => AnyKey
  row: AnyKey
  col: AnyKey
  tableLink?: boolean
}>()

const emit = defineEmits(['linkClick'])
const result = computed(() => props.render(props.row, props.col))
</script>

<template>
  <TableLink v-if="tableLink && result.type === 'link'" :text="result.text" :wrapper="result" @activate="emit('linkClick')" />
  <component :is="result.el" v-else v-bind="result">
    <span
      :class="result.type === 'link' ? 'link_row' : ''"
      @click="result.type === 'link' ? emit('linkClick') : null"
    >{{ result.text }}</span>
  </component>
</template>
