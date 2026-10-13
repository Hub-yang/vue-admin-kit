import type { UserConfig } from 'unocss'
import {
  defineConfig,
  mergeConfigs,
  presetAttributify,
  presetIcons,
  presetWind3,
} from 'unocss'

export const baseUnoConfig: UserConfig = defineConfig({
  shortcuts: [
    ['detail-title', 'text-14px color-#606266 whitespace-nowrap'],
    ['detail-info', 'text-14px color-black font-bold text-justify block w-full'],
    ['flex-center', 'flex items-center justify-center'],
    ['flex-col-center', 'flex flex-col items-center justify-center'],
  ],
  presets: [
    presetWind3(),
    // attributify 默认对一批内置关键字（如 `icon`、`text`、`bg`）做免前缀扫描，
    // 和 element-plus 组件自身同名 prop（如 el-button 的 `icon`）撞在一起：
    // `icon="i-ep-circle-check"` 这类值被当成 attributify 简写解析，
    // 还会把同一标签内相邻属性的文本拼进去，拼出 `ep-circle-check-onSubmitForm`
    // 这类不存在的图标名，报 UnoCSS 的 failed to load icon 告警。
    // 仓库里没有任何地方真的用到 attributify 的免前缀写法（`<div flex text-center>`），
    // 收紧成仅认 `un-` 前缀不影响现状，且是 UnoCSS 官方文档给出的组件库撞名解法。
    presetAttributify({ prefixedOnly: true }),
    presetIcons({
      scale: 1,
      warn: true,
      // presetIcons 生成的图标类默认只有 width/height/mask/background-color，不带 display——
      // 裸 <i class="i-ep-xxx"> 若不是 flex/grid 容器的直接子元素，会停留在默认 display:inline，
      // 而 width/height 对行内非替换元素不生效，图标因此渲染成 0 宽度（颜色/mask 都对，肉眼看不到）。
      // 补上 display: inline-block 是 UnoCSS 官方文档给出的标准解法。
      extraProperties: {
        'display': 'inline-block',
        'vertical-align': 'middle',
      },
    }),
  ],
})

/** 走官方 mergeConfigs：shortcuts / presets 等数组字段是拼接，不是覆盖 */
export function createUnoConfig(overrides: UserConfig = {}): UserConfig {
  return mergeConfigs([baseUnoConfig, overrides])
}
