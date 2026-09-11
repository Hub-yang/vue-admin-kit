<script setup lang='ts'>
import type { FormInstance, FormRules } from 'element-plus'
import type { VNodeRef } from 'vue'
import type { ColumnOptions, Options } from '../../types'
import { computed, ref } from 'vue'
import { getControlProps } from '../../utils/componentApi'
import { buildFormRules } from '../../utils/formRules'

interface Props {
  editItems: ColumnOptions[]
  mode: 'dialog' | 'drawer'
  /** 弹窗模式下强制单列；抽屉模式本来就是单列，这个开关对它没有影响 */
  singleColumn?: boolean
}

export interface MainFormExpose {
  ruleFormRef: VNodeRef
}

const props = defineProps<Props>()

// 单列下必须把 span: 2 一并失效：grid-template-columns 只有 1 条轨道时，
// grid-column: span 2 会让浏览器再造一条隐式轨道，那一项直接跑出容器
const isSingle = computed(() => props.mode === 'drawer' || props.singleColumn)

const ruleFormRef = ref<FormInstance>()
const formData = defineModel<AnyKey>('formData', { default: () => ({}) })
const refMap = defineModel<AnyKey>('refMap', { default: () => (new Map()) })

function matchPlaceholder(type: string) {
  switch (type) {
    case 'el-select':
    case 'el-tree-select':
    case 'el-cascader':
    case 'el-date-picker':
      return '请选择'
    default:
      return '请输入'
  }
}

// 规则构造抽到 utils/formRules.ts，便于单测；不要在这里内联重写
const rules = computed<FormRules<AnyKey>>(() => buildFormRules(props.editItems))

function setFormItemRef(el: VNodeRef, refName: string) {
  if (!refName) {
    return false
  }
  refMap.value.set(refName, el)
}

defineExpose<MainFormExpose>({
  ruleFormRef,
})
</script>

<template>
  <el-form
    ref="ruleFormRef"
    :model="formData"
    :rules="rules"
    label-width="auto"
    class="sc-main_form_grid"
    :class="[
      { 'sc-main_form_grid--single': isSingle },
    ]"
  >
    <el-form-item
      v-for="{
        prop,
        label,
        editable,
        span = 1,
        formSlot = 0,
        formSlotName = '',
        renderOptions: { type = 'el-input', props: compProps = {}, options = [], ref: itemRef = '', slot = 0, slotName = 'default', slotRender } = {} } in editItems"
      :key="prop"
      :label
      :prop
      :style="span === 2 && !isSingle ? { gridColumn: 'span 2' } : undefined"
    >
      <div class="w-full">
        <slot v-if="formSlot === 1" :name="formSlotName || prop" />
        <template v-else>
          <span v-if="editable === 2">{{ formData[prop] || '--' }}</span>
          <component
            :is="type"
            v-else
            :ref="(el:VNodeRef) => setFormItemRef(el, itemRef)"
            v-model.trim="formData[prop]"
            clearable
            :placeholder="matchPlaceholder(type as string)"
            v-bind="{ ...getControlProps(type as string, options as Options[]), ...compProps }"
          >
            <template v-if="slot === 1" #[slotName]>
              <component :is="slotRender().el" v-if="slotRender" v-bind="slotRender()">
                <span v-if="slotRender().text">{{ slotRender().text }}</span>
              </component>
            </template>
          </component>
        </template>
      </div>
    </el-form-item>
  </el-form>
</template>

<style lang='scss' scoped></style>
