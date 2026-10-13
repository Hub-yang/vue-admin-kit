<script setup lang="ts">
import type { BaseMenuProps } from '.'
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const props = defineProps<BaseMenuProps>()

const route = useRoute()
const router = useRouter()
const menuRef = ref()

const activeIndex = computed(() => route.path)

function onMenuSelect(path: string) {
  router.push(path)
}

function getParentIds(path: string): string[] {
  return props.menus
    .filter(menu => menu.children?.some(child => child.path === path))
    .map(menu => menu.id)
}

watch(
  () => route.path,
  (path) => {
    getParentIds(path).forEach(id => menuRef.value?.open(id))
  },
  { immediate: true },
)
</script>

<template>
  <nav class="sc-base_menu_wrapper">
    <el-menu
      ref="menuRef"
      :default-active="activeIndex"
      unique-opened
      @select="onMenuSelect"
    >
      <template v-for="({ title, icon, id, path, children = [] }) in menus" :key="id">
        <el-menu-item
          v-if="!children.length"
          :index="path ?? id"
        >
          <el-icon><component :is="icon" /></el-icon>
          <span>{{ title }}</span>
        </el-menu-item>

        <el-sub-menu v-else :index="id">
          <template #title>
            <el-icon><component :is="icon" /></el-icon>
            <span>{{ title }}</span>
          </template>
          <el-menu-item
            v-for="child in children"
            :key="child.id"
            :index="child.path ?? child.id"
          >
            <el-icon><component :is="child.icon" /></el-icon>
            <span>{{ child.title }}</span>
          </el-menu-item>
        </el-sub-menu>
      </template>
    </el-menu>
  </nav>
</template>

<style lang="scss" scoped>
$base-menu-w: 200px;
$base-menu-item-h: 48px;
$base-menu-subitem-h: 42px;

.sc-base_menu_wrapper {
  width: $base-menu-w;
  height: 100%;
  overflow-y: auto;
  background: #eee;

  :deep(.el-menu) {
    border: none !important;
    background: #eee;

    .el-sub-menu__title {
      height: $base-menu-item-h;
      line-height: $base-menu-item-h;
      &:hover {
        background: var(--el-color-primary-light-7);
      }
    }

    .el-menu-item {
      height: $base-menu-subitem-h;
      line-height: $base-menu-subitem-h;
      &.is-active,
      &:hover {
        background: var(--el-color-primary-light-7);
      }
    }
  }
}
</style>
