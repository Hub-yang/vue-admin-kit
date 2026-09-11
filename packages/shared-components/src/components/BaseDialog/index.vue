<script setup lang='ts'>
interface Props {
  title?: string
  width?: string
  allowFullScreen?: boolean
}
const props = withDefaults(defineProps<Props>(), {
  title: '',
  width: '60%',
  allowFullScreen: true,
})

const emit = defineEmits<{
  (e: 'onAddDialogSubmit'): void
  (e: 'onClosed'): void
}>()

const visible = defineModel<boolean>('visible', { default: false })
const isFullScreen = defineModel<boolean>('isFullScreen', { default: false })

function onClosed() {
  isFullScreen.value = false
  emit('onClosed')
}
</script>

<template>
  <el-dialog
    v-model="visible"
    :show-close="false"
    class="sc-custom_dialog_box"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
    :fullscreen="isFullScreen"
    destroy-on-close
    draggable
    lock-scroll
    v-bind="{ ...props, ...$attrs }"
    @closed="onClosed"
  >
    <template #header="{ close }">
      <div class="custom_dialog_header">
        <div class="title_con">
          <span>{{ props.title }}</span>
          <slot name="tag" />
        </div>
        <span class="custom_dialog_actions">
          <i v-if="allowFullScreen" class="i-ep-full-screen custom_dialog_fullscreen_icon" @click="isFullScreen = !isFullScreen" />
          <i class="i-ep-close custom_dialog_close_icon" @click="close" />
        </span>
      </div>
    </template>

    <slot />

    <template v-if="$slots.footer" #footer>
      <slot name="footer" />
    </template>
  </el-dialog>
</template>

<style lang="scss">
@use '../../styles/common.scss';
</style>
