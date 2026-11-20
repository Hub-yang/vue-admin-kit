<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  text?: unknown
  wrapper?: AnyKey
}>()

const emit = defineEmits<{
  activate: []
}>()

const hasText = computed(() => {
  const text = typeof props.text === 'string' ? props.text.trim() : props.text
  return text != null && text !== '' && text !== '--'
})
const wrapperProps = computed(() => {
  const attrs = { ...props.wrapper }
  // 原生 a 的 text 属性会覆盖内部节点，文本由插槽单独渲染。
  if (attrs.el === 'a')
    delete attrs.text
  if (attrs.el === 'button')
    attrs.type = 'button'
  return attrs
})
</script>

<template>
  <component :is="wrapper.el" v-if="wrapper" v-bind="wrapperProps">
    <span v-if="hasText" class="link_row" @click="emit('activate')">{{ text }}</span>
    <span v-else>--</span>
  </component>
  <span v-else-if="hasText" class="link_row" @click="emit('activate')">{{ text }}</span>
  <span v-else>--</span>
</template>
