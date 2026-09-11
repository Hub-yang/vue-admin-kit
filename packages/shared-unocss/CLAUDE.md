# CLAUDE.md — packages/shared-unocss

根目录 `CLAUDE.md` 是全仓库通用规则，这里只放本模块专属的东西。

## 两个导出的定位

- **`baseUnoConfig`**：开箱即用的默认预设（`presetWind3` + attributify + icons + 几个 shortcut）。消费方不需要覆盖任何东西时直接用它。
- **`createUnoConfig(overrides)`**：需要在 `baseUnoConfig` 基础上二次扩展时用的合并入口，内部用 UnoCSS 官方 `mergeConfigs` 做深合并（此前审计发现过一个 bug：浅 spread 会让 `presets`/`shortcuts` 这类数组字段被覆盖而不是拼接，导致基础配置静默丢失，已修复为 `mergeConfigs`）。

## 三个消费方，两条路径都在用

- `apps/gcc-login` / `apps/gcc-saber3` 的 `uno.config.ts` 都走 `createUnoConfig(overrides)`，各自叠了 `theme.colors.primary` 和一条 `content.pipeline.include`（放开自己那个存图标字面量的 `.ts` 目录）
- `packages/shared-components` 的 `uno.config.ts` 直接 `export default baseUnoConfig`（仅供本包 lint / 开发期使用，组件的原子类最终由消费方应用扫描生成）

所以 `mergeConfigs` 这条路径已经被真实 override 跑过，但跑过的只有 `theme` 与 `content` 两个字段。**`presets` / `shortcuts` 这类数组字段的拼接仍无消费方验证**（当年浅 spread 覆盖数组的 bug 正出在这里）——第一个要 override 它们的人，改完手工确认一下最终配置，别假设它一定对。

## attributify 是 `prefixedOnly`，shortcut 一律写 `class`

`presetAttributify({ prefixedOnly: true })` 意味着**只有 `un-` 前缀的属性会被扫描**，
裸属性写法（`<div flex>`、`<span detail-info>`）一个规则都生成不了。

**这个失效是完全静默的，而且伪装得很好**：UnoCSS 的提取器从源码里切词时不区分「class 值」还是
「属性名」，`detail-info` 照样会被当成候选、照样生成一条 `.detail-info{...}` 规则进产物 ——
只是标签上写的是**属性**，选择器是**类**，两者永远匹配不上。所以 grep 产物 CSS 能搜到那个名字，
看着像"样式在的"，实际页面上没有任何效果，也没有任何告警。

**新增写法一律用 `class="xxx"`**，不要用属性形态（`un-` 前缀的也别用——仓库里没有任何一处在用，
多一种写法只会让下一个人以为两种都行）。

> ⚠️ 提交 `5478605`（改成 `prefixedOnly` 的那次）的说明里写着「仓库里没有任何地方真的用到
> attributify 的免前缀写法」——**这句话当时就是错的**。`BaseDetailDialog` 的
> `<span detail-title>` / `<span detail-info>` 就是，于是详情弹窗的文字样式从那天起静默失效，
> 表现为标题和内容同色（都退回继承色），到 `20260903o` 才被用户肉眼发现。
> 已扫过全仓库 `.vue` 模板里所有无值的连字符属性，剔除 Vue / element-plus 的布尔 prop 后，
> 命中 shortcut 的只有那两处，现已改成 `class`。
>
> **教训是「改 preset 行为前要扫一遍真实用法」**，别凭印象断言「没人在用」——这类用法不会
> 出现在 import 里，grep 依赖关系看不到它。
