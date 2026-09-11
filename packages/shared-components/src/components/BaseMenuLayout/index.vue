<script setup lang='ts'>
import type { BaseMenuLayoutProps } from '.'
import { BASE_MENU_WIDTH } from '.'
import { BaseMenu } from '../BaseMenu'

withDefaults(defineProps<BaseMenuLayoutProps>(), {
  resizable: false,
})
</script>

<template>
  <div class="sc-base_menu_layout_container">
    <el-splitter collapsible>
      <el-splitter-panel collapsible :size="BASE_MENU_WIDTH" :max="BASE_MENU_WIDTH" min="0" :resizable>
        <BaseMenu :menus />
      </el-splitter-panel>
      <el-splitter-panel>
        <div class="sc-base_menu_layout_main">
          <slot />
        </div>
      </el-splitter-panel>
    </el-splitter>
  </div>
</template>

<style lang='scss' scoped>
.sc-base_menu_layout_container {
  width: 100%;
  height: 100%;
  display: flex;

  :deep(.el-splitter-bar__dragger-horizontal::before, .el-splitter-bar__dragger-horizontal::after) {
    width: 1px;
    background-color: transparent;
  }

  .sc-base_menu_layout_main {
    flex: 1;
    height: 100%;
    overflow: hidden;
  }
}
</style>
