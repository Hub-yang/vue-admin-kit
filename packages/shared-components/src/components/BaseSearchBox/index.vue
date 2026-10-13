<script setup lang='ts'>
import type { ColumnOptions } from '../../types'
import { isNonEmptyArray } from '@huberyyang/shared-utils'
import { cloneDeep } from 'lodash-es'
import { computed, ref, watch } from 'vue'
import { useRefresh } from '../../composables/useRefresh'
import Main from './comp/Main.vue'

interface Props {
  columns: ColumnOptions[]
  card?: boolean
  labelWidth?: string | number
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  card: true,
  loading: false,
})

const emit = defineEmits<{
  (e: 'onSearch'): void
  (e: 'onSearchReset'): void
}>()

const { refresh, refreshKey } = useRefresh()

const isCollapsed = ref(false)
const searchForm = defineModel<AnyKey>('search', { default: () => ({}) })

function onSearchReset() {
  searchForm.value = {}
  refresh()
  emit('onSearchReset')
}

function onCollapseToggle() {
  isCollapsed.value = !isCollapsed.value
}

const searchItems = ref<ColumnOptions[]>([])
const showMore = computed(() => searchItems.value.length > 4)
// 每行 40px = 8px 行间距（common.scss 里 .search_left--main .el-row 的 margin-top）+ 32px 控件。
// 这两个数字必须跟着那条样式走：小了展开区裁掉行底，大了末行下方多出空白、搜索区下边距不再是 20px
const mainSearchBoxHeight = computed(() => Math.ceil(searchItems.value.slice(4).length / 4) * 40)

watch(() => props.columns, (val) => {
  if (isNonEmptyArray(val)) {
    let items = cloneDeep(val).filter(column => column.searchable !== 0)?.map((column) => {
      // 搜索区域不出现textarea
      if (column?.renderOptions?.props?.type === 'textarea') {
        delete column.renderOptions.props
      }
      return column
    })
    if (items.some(column => column.renderOptions?.searchOrder)) {
      items = items.map((column) => {
        column.renderOptions ||= {}
        column.renderOptions.searchOrder ||= 999
        return column
      }).sort((a: any, b: any) => {
        return a.renderOptions.searchOrder - b.renderOptions.searchOrder
      })
    }
    searchItems.value = items
  }
}, { immediate: true })
</script>

<template>
  <!-- refreshKey 挂在这一层而不是根元素上：根元素是 BaseTable 那个 el-collapse-transition 的
       过渡子树根，带着 transition hooks，key 一变就会被放大成「收起再展开」——见 resetTransition.test.ts -->
  <div class="sc-search_box">
    <component :is="card ? 'el-card' : 'div'" :key="refreshKey" v-bind="card ? { shadow: 'never' } : {}">
      <div class="search_main">
        <div class="search_left">
          <div class="search_left--header">
            <div class="header-left">
              <Main v-model:search="searchForm" :search-items="searchItems.slice(0, 4)" :label-width />
            </div>
            <div v-if="showMore" class="header-right" @click="onCollapseToggle">
              <span>{{ isCollapsed ? '收起' : '展开' }}</span>
              <i
                class="i-ep-arrow-right"
                :style="{ transform: isCollapsed ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'all ease-in-out .3s' }"
              />
            </div>
          </div>
          <div
            class="search_left--main"
            :style="{ height: isCollapsed ? `${mainSearchBoxHeight}px` : '0', opacity: isCollapsed ? '1' : '0', transition: 'all ease-in-out .3s' }"
          >
            <Main v-model:search="searchForm" :search-items="searchItems.slice(4)" :label-width />
          </div>
        </div>
        <div class="search_right">
          <el-button type="primary" icon="i-ep-search" :loading @click="$emit('onSearch')">
            查询
          </el-button>
          <el-button icon="i-ep-refresh-left" @click="onSearchReset">
            重置
          </el-button>
        </div>
      </div>
    </component>
  </div>
</template>

<style lang="scss">
@use '../../styles/common.scss';
</style>
