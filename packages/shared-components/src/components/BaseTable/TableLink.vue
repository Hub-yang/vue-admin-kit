<script setup lang="ts">
import { computed, shallowRef, useTemplateRef, watch } from 'vue'

const props = defineProps<{
  text?: unknown
  wrapper?: AnyKey
}>()

const emit = defineEmits<{
  activate: []
}>()

const hasText = computed(() => {
  if (typeof props.text === 'string')
    return props.text.trim().length > 0
  return props.wrapper ? props.text != null : !!props.text
})
const outerControl = shallowRef<{ element: HTMLElement, needsKeyboardFallback: boolean } | null>()
const linkContent = useTemplateRef<HTMLElement>('linkContent')
const useOwnButton = computed(() => !props.wrapper || outerControl.value === null)
const wrapperProps = computed(() => {
  const attrs = { ...props.wrapper }
  // 原生 a 的 text 属性会覆盖内部节点，文本由插槽单独渲染。
  if (attrs.el === 'a')
    delete attrs.text
  if (attrs.el === 'button')
    attrs.type = 'button'
  return attrs
})

watch(() => props.wrapper?.el, () => {
  outerControl.value = undefined
}, { flush: 'sync' })

watch(linkContent, (content, _, onCleanup) => {
  const cell = content?.closest('td')
  if (!content || !cell) {
    outerControl.value = undefined
    return
  }

  const updateOuterControl = () => {
    const ancestor = content.parentElement?.closest<HTMLElement>('button, a, summary, [role="button"][tabindex], [role="link"][tabindex]')
    if (!ancestor || !cell.contains(ancestor)) {
      outerControl.value = null
      return
    }
    const needsKeyboardFallback = ancestor instanceof HTMLAnchorElement && !ancestor.hasAttribute('href')
    const previous = outerControl.value
    if (previous?.element !== ancestor || previous.needsKeyboardFallback !== needsKeyboardFallback)
      outerControl.value = { element: ancestor, needsKeyboardFallback }
  }

  // 包装组件可以在自身更新中成为交互控件，需在实际 DOM 更新后判断焦点归属。
  updateOuterControl()
  const observer = new MutationObserver(updateOuterControl)
  observer.observe(cell, { childList: true, subtree: true, attributes: true, attributeFilter: ['href', 'role', 'tabindex'] })
  onCleanup(() => observer.disconnect())
}, { flush: 'post' })

function activate() {
  emit('activate')
}

watch(outerControl, (target, _, onCleanup) => {
  if (!target)
    return
  const { element: control, needsKeyboardFallback } = target

  function onControlClick(event: MouseEvent) {
    const source = event.target
    if (source === control || (source instanceof Node && linkContent.value?.contains(source)))
      activate()
  }

  control.addEventListener('click', onControlClick, true)
  onCleanup(() => control.removeEventListener('click', onControlClick, true))

  if (!needsKeyboardFallback)
    return

  // 无 href 的 a 只是包装标签，不能嵌套按钮，由原节点提供按钮语义和键盘行为。
  const addRole = !control.hasAttribute('role')
  const addTabIndex = !control.hasAttribute('tabindex')
  if (addRole)
    control.setAttribute('role', 'button')
  if (addTabIndex)
    control.tabIndex = 0

  function onKeydown(event: KeyboardEvent) {
    if (event.defaultPrevented || control.hasAttribute('href') || (event.key !== 'Enter' && event.key !== ' '))
      return
    event.preventDefault()
    if (event.key === 'Enter')
      control.click()
  }

  function onKeyup(event: KeyboardEvent) {
    if (event.defaultPrevented || control.hasAttribute('href') || event.key !== ' ')
      return
    event.preventDefault()
    control.click()
  }

  control.addEventListener('keydown', onKeydown)
  control.addEventListener('keyup', onKeyup)
  onCleanup(() => {
    control.removeEventListener('keydown', onKeydown)
    control.removeEventListener('keyup', onKeyup)
    if (addRole && control.getAttribute('role') === 'button' && props.wrapper?.role == null)
      control.removeAttribute('role')
    if (addTabIndex && control.getAttribute('tabindex') === '0' && props.wrapper?.tabindex == null && props.wrapper?.tabIndex == null)
      control.removeAttribute('tabindex')
  })
}, { flush: 'post' })
</script>

<template>
  <component :is="wrapper.el" v-if="wrapper" v-bind="wrapperProps">
    <span v-if="!hasText">--</span>
    <button v-else-if="useOwnButton" ref="linkContent" class="link_row sc-base_table_link" type="button" @click="activate">
      <span class="sc-base_table_link_text">{{ text }}</span>
    </button>
    <span v-else ref="linkContent" class="link_row">{{ text }}</span>
  </component>
  <span v-else-if="!hasText">--</span>
  <button v-else class="link_row sc-base_table_link" type="button" @click="activate">
    <span class="sc-base_table_link_text">{{ text }}</span>
  </button>
</template>

<style scoped>
.sc-base_table_link {
  appearance: none;
  display: inline-block;
  max-width: 100%;
  border: 0;
  padding: 0;
  margin: 0;
  background: none;
  font: inherit;
  text-align: inherit;
  white-space: inherit;
  /* 内层省略容器参与基线计算会增加表格行高。 */
  vertical-align: top;
}

.sc-base_table_link_text {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: inherit;
}

.sc-base_table_link:focus-visible {
  outline: 2px solid var(--el-color-primary);
  outline-offset: -2px;
}
</style>
