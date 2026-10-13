<script setup lang='ts'>
import { computed } from 'vue'

interface Props {
  /**
   * 主标题（产品族名）。**由接入方传入，包里不持有任何应用的名字**——
   * 这里曾经直接 import `shared-utils` 的 `rootConfig.title`，那是把项目身份焊死在组件里，
   * 拷到别的项目就得改包源码。副标题 `subTitle` 是当前模块名，两者不是一回事
   */
  title: string
  subTitle: string
  /** 是否显示侧边栏折叠按钮。默认关闭，没有侧边栏的接入方（如登录端）不受影响 */
  collapsible?: boolean
  /** logo 图片地址。默认取各应用 public 下的 logo2.png */
  logo?: string
  /**
   * 展开态左区宽度。传了才固定宽度，用于让折叠按钮的左缘与下方侧边栏的右边框对齐
   * （gcc-saber3 传的是 `$sidebar-width` 的同值字面量 230px）。
   * 不传时左区由内容撑开，行为与加这个 prop 之前完全一致
   */
  navWidth?: string
  /**
   * 折叠态左区宽度。仅在传了 navWidth 时生效，语义就是「折叠后侧边栏的宽度」——
   * 折叠按钮在左区之外，所以这个值不含按钮，直接照抄接入方的折叠侧边栏宽度即可。
   * 默认 64px 取自 element-plus 折叠态菜单宽度
   * （`--el-menu-icon-width(24) + --el-menu-base-level-padding(20) * 2`）
   */
  collapsedNavWidth?: string
  /**
   * 标题区（logo + 标题那一列）是否可点击。为真时追加手型、点击 emit `titleClick`，
   * 跳哪儿由接入方决定——三个接入方的「首页」并不相同（saber3 / gcc-template 是
   * `appConfig.app.firstPage`，gcc-login 的 AppsHeader 自己就是门户首页，不传即零回归）
   */
  titleClickable?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  collapsible: false,
  logo: '/logo2.png',
  collapsedNavWidth: '64px',
  titleClickable: false,
})

const emit = defineEmits<{ (e: 'titleClick'): void }>()

function onTitleClick() {
  if (props.titleClickable)
    emit('titleClick')
}

// 折叠态由接入方持有（saber3 是 useLayout().isCollapse），组件只负责切换
const collapsed = defineModel<boolean>('collapsed', { default: false })

/** 展开态左内边距，同时也是不传 navWidth 时的固定值 */
const NAV_PADDING_LEFT = 10
/** logo 边长，与模板里的 `w-32px` 是同一个值，改一处要改两处 */
const LOGO_SIZE = 32

const navStyle = computed(() => {
  // 折叠态把左内边距撑到 (左区宽 - logo 宽) / 2，让 logo 居中于折叠后的左区；
  // 展开态维持 10px。两态都显式给值，padding 才能和 width 走同一条过渡曲线——
  // 靠「有时挂 inline style、有时回落到 class」是过渡不出来的
  const paddingLeft = props.navWidth && collapsed.value
    ? `calc((${props.collapsedNavWidth} - ${LOGO_SIZE}px) / 2)`
    : `${NAV_PADDING_LEFT}px`

  return props.navWidth
    ? { width: collapsed.value ? props.collapsedNavWidth : props.navWidth, paddingLeft }
    : { paddingLeft }
})
</script>

<template>
  <!-- --header-h 只声明在本包 styles/_variables.scss 的 :root 里，而那份样式是靠
       BaseTable/BaseDialog 等组件的非 scoped <style> 间接带进消费方的：接入方若在当前路由
       没加载那几个组件，它取不到值（头部会塌高）。--primary 则**由接入方声明**，包里不再
       持有品牌色。两个都给足 fallback，让 BaseHeader 不依赖任何外部样式即可自洽。 -->
  <header class="box-border h-[var(--header-h,46px)] w-full flex items-center justify-between bg-[var(--primary,var(--el-color-primary))] pr-10px">
    <!-- 左区和折叠按钮必须包一层：折叠按钮若直接做 header 的子元素，
         header 的 justify-between 会把它甩到中间去 -->
    <div class="h-full flex flex-shrink-0 items-center">
      <!-- 左内边距由 navStyle 给（header 只留 pr-10px），左区因此是从 x=0 起算的完整一列，
           宽度等于侧边栏宽度，折叠按钮的左缘与侧边栏右边框对齐。
           ⚠️ 缓动必须写成任意值 `ease-[ease]`：presetWind3 的 ease-* 只认 linear/in/out/in-out，
              裸写 `ease` 不生成任何规则（不报错的死类），曲线与接入方侧边栏的 ease 对不上会抖出错位。
           ⚠️ 只能用 `transition-all`，不要"精确化"成 `transition-[width,padding-left]`：
              presetWind3 的 transition-[] 不接受逗号列表，实测生成空规则，又是个死类。
           ⚠️ 回首页的点击必须挂在这一层：挂外层会被折叠按钮的点击冒泡命中，
              挂 header 根上会连右侧插槽一起命中 -->
      <div
        class="box-border h-full flex flex-shrink-0 items-center overflow-hidden transition-all duration-300 ease-[ease]"
        :class="{ 'cursor-pointer': titleClickable }"
        :style="navStyle"
        @click="onTitleClick"
      >
        <img :src="logo" alt="logo" class="w-32px flex-shrink-0">
        <!-- 折叠时文本靠 max-width + opacity + 外边距一起过渡收起。
             不能用 v-if：那是瞬间消失，没有过渡；间距也不能用父级的 gap，
             gap 无法只对某个子项做过渡，折叠后会留下一段死白 -->
        <div
          class="h-full min-w-0 flex flex-col justify-center gap-4px overflow-hidden whitespace-nowrap color-white transition-all duration-300 ease-[ease]"
          :class="collapsed ? 'mx-0 max-w-0 opacity-0' : 'mx-8px max-w-full opacity-100'"
        >
          <div class="text-14px font-900 line-height-none">
            {{ title }}
          </div>
          <div v-if="subTitle" class="flex justify-between text-16px line-height-none">
            <span v-for="t in subTitle.split('')" :key="t">{{ t }}</span>
          </div>
        </div>
      </div>
      <!-- 排在定宽左区之后，左缘天然贴住左区右缘 = 侧边栏右边框；
           折叠时的位移由左区的宽度过渡逐帧带动，不需要（也不能）再给它单独写 transition -->
      <i
        v-if="collapsible"
        class="flex-shrink-0 cursor-pointer text-22px color-white"
        :class="collapsed ? 'i-ep-expand' : 'i-ep-fold'"
        @click="collapsed = !collapsed"
      />
    </div>
    <div v-if="$slots.center" class="h-full flex flex-1 items-center">
      <slot name="center" />
    </div>
    <div v-if="$slots.right" class="h-full flex items-center">
      <slot name="right" />
    </div>
  </header>
</template>
