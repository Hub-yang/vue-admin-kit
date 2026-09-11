# CLAUDE.md — packages/shared-components

根目录 `CLAUDE.md` 是全仓库通用规则，这里只放本模块专属的东西。

## composables/config/utils 是围绕「CRUD 管理后台列表页」设计的一整套

这几个目录不是零散工具的堆放处，而是同一个心智模型的不同切面：

- `config/baseConfig.ts`：默认分页、表格、日期格式常量
- `config/options.ts`：级联/选项数据的标签匹配逻辑
- `utils/`：文件导出下载、表单确认弹窗这类跨组件工具
- `composables/useEditListPageRender`：把"增删改查列表页"整套状态和操作模式封装成一个 hook

本仓库的消费方：`apps/gcc-saber3` 用整套 CRUD 心智模型；`apps/gcc-login` 是登录/门户页，用不到那一整套，只消费单个组件（`AppsHeader.vue` 用 `BaseHeader` + `withConfirm`，`ProfileDialog.vue` 用 `BaseDialog`）。

### BaseTable / 表单校验：新加功能前先读

- **`BaseTable` 支持懒加载树表，不需要额外代码**：`lazy` / `:load` / `tree-props` 经 `$attrs` → `mergedAttrs`（`BaseTable/index.vue:71-74`）透传到 el-table 即可。但**数据变更后必须调 `refreshTable()`**——`fetchList()` 只换 `:data`，清不掉 el-table 内部的 `lazyTreeNodeMap`，已展开的子节点会残留。
- **必填校验不要只写 `required: true`**：async-validator 在 `rule.type` 缺省时回落成 `'string'` 并断言类型，number 值的必填字段会永远校验不过，且错误被 `rule.message` 覆盖成「请输入 XXX」看不出真因。规则构造统一走 `utils/formRules.ts` 的 `buildFormRules()`，**不要在组件里内联重写**。
- **`fetchExtParams` 里的空值会原样发给后端**：`fetchList()` 只对搜索区的 `searchParams` 剔空
  （`BaseTable/index.vue` 那段 `if (value || value === 0)`），`fetchExtParams` 是直接展开进
  queryParams 的，**不过滤**。左栏树「不限分组」这类「空即表示不筛选」的场景，传出去的是
  `layoutId=''`，后端拿空串转 Long 会**直接 500**（`20260908e` 实测：saber3 模型列表
  `?layoutId=&current=1&size=20` → 500，去掉该参数即正常）。
  消费方要么在 `fetchExtParams` 里按条件不返回该键，要么在自己的 `fetchApi` 里发请求前剔空
  （模型列表用的是后者，因为它同时兜住其它来源）。
- **切换查询条件会自动回到第 1 页，这是刻意的**：`searchParams` 与 `fetchExtParams` 两条 watch
  在 `fetchList()` 前都写了 `pagination.value.current = 1`（`BaseTable/index.vue`）。
  **不要把它当冗余删掉**——不重置的话，停在第 3 页改条件会**发两趟请求**：先带 `current=3`
  查一个可能只有 1 页的结果（渲染出一次空表），随后 el-pagination 发现
  `currentPage > pageCount` 自己把页码夹回来，而它夹回去走的是内部 `currentPageBridge` 的
  setter，那里 `emit('current-change')`，模板上绑的正是 `fetchList()`
  （`element-plus/es/components/pagination/src/pagination.mjs:246,252`）。
  > 两个反直觉点：① **从外部赋值 `pagination.current` 不经过那个 setter**，所以这行修复自己
  > 不会多发请求；别改成走组件内部 API（`handleCurrentChange(1)`）的写法，那会 emit。
  > ② `pageCountBridge` 是 `Math.max(1, Math.ceil(total / size))`，total=0 时 pageCount 是 1
  > 而不是 0——少了这个兜底，重置会引入 `current=0` 的请求。条目 `20260910a`
- **`renderOptions.slot` 是重载字段**：`BaseTable` 当它是「表格单元格插槽」，`MainForm` 当它是「表单控件的内部插槽」（如 el-input 的 `append`）。同一列可能同时用到两种语义，改动前先确认影响面。
- **`useEditListPageRender` 不是必经之路**：它硬编码主键叫 `id`、删除只有两种参数形态（成功与否的判定已收敛到 `config/response.ts`）。标准 CRUD 页用它省事，特殊页（如需要区分行内/批量删除后的刷新方式）直接手写更清楚。
- **`selectedData` 不要照抄 zd 的 `computed(() => tableRef.value?.getRowSelection())`**：`getSelectionRows()` 是 el-table 的命令式读取，computed 没有可追踪的响应式依赖，它在 zd 能工作是靠父组件恰好频繁重渲染。可靠写法是给 `BaseTable` 透传 `@selection-change`。
  > ⚠️ **因此「凡是会清空选中态的路径，组件都必须补发一次空的 `selection-change`」是硬契约**：
  > `refreshTable()` 与工具栏刷新按钮的 `onRefresh()` 都 bump `refreshKey` 让 el-table 整体重挂，
  > 重挂本身**不触发** `selection-change`，页面自持的 `selectionList` 就成了陈旧数据——勾选框已清空、
  > 批量删除按钮却还亮着，点下去删的是用户以为没选中的行。两处统一走 `notifySelectionCleared()`
  > （`BaseTable/index.vue`），**新增第三条刷新路径时记得一并调用**。条目 `20260903q` 之前
  > `onRefresh()` 漏了这一下，九个列表页全中招。

### BaseBtn 与搜索框的两个反直觉行为

- **`BaseBtn` 上不能写 `@click.stop`**：它的模板是 `@click="$emit('click')"`，**emit 不带事件对象**。
  `.stop` 会被编译成 `withModifiers(handler, ['stop'])`，其 stop guard 直接 `event.stopPropagation()`，
  参数是 `undefined` → 运行时抛 TypeError。需要阻止冒泡（例如表格同时绑了 `@row-click`）时，
  要么改用原生 `el-button`，要么把判断挪到接收端——`saber3` 的 `views/system/dict.vue` 用的是后者：
  勾选/序号/操作三种列都没有 `column.property`，`onRowClick` 据此一次挡掉。
- **`renderOptions.props.disabled` 会连搜索框一起禁掉**：`BaseSearchBox/comp/Main.vue:41-42` 是
  `:disabled="false"` 后面再展开 `props`（`v-bind="{ ...getControlProps(...), ...props }"`），
  props 排在最后反超，所以「表单里不可改」的列如果同时可搜，
  搜索框会跟着变灰。想只禁表单控件，走 `formSlot: 1` 自定义槽；`renderOptions.props.disabled`
  只用在 `searchable: 0` 的列上（`saber3` 的 `dept.vue` / `dict.vue` 的 `parentId` 即是）。

所以给它加新功能或改行为之前，**先去 zd-workspace 找成例**（尤其 `apps/zd-digital-base`，它和 `apps/gcc-saber3` 同源自 BladeX，`system/user.vue` / `system/menu.vue` / `system/role.vue` 都有对照版），而不是凭空设计。

**两份组件库是独立维护的**：zd 那份和本份已在 13 个文件上漂移（多数是 `zd-`→`gcc-` 前缀改名）。已决策**不做同步、不设上游**——本文件所在的这份是本仓库的唯一权威，zd 的改动不回流。查成例可以，别去改那边。

已知缺陷与待补能力登记在 `.scratch/roadmap/04-shared-components补齐能力.md`，事实依据在 `03-纵向切片spike.md` 的「决策记录」。

### BaseSearchBox 的根元素不能带会变的 `:key`

`BaseTable` 用 `<el-collapse-transition>` 包着 `BaseSearchBox`（搜索区显示/隐藏的折叠过渡），
**这让「过渡」这件事穿透了组件边界**：Vue 的 `renderComponentRoot` 里有
`if (vnode.transition) setTransitionHooks(child, vnode.transition)`，每次重渲染都把 Transition 的
hooks 重新挂到子组件的**子树根元素**上；而 renderer 的 `remove()` 里
`if (vnode.shapeFlag & 1 && transition && !transition.persisted)` 决定了——**带 hooks 的元素被
unmount 时会走完整的 leave 动画**。

于是根元素上任何会变的 key，都会从「同步一帧重建」被放大成 0.3s 收起 + 0.3s 展开。
`onSearchReset()` 里的 `refresh()` 正是这样一个 key，点「重置」时搜索区先消失再出现、
两份 DOM 同时占文档流（`el-collapse-transition` 没有 mode，leave 与 enter 并行），
表格卡被上下挤压，**整个内容区闪烁**。

**约束**：`refresh()` 要保留（`searchForm = {}` 清不掉 el-select / el-date-picker 之类的内部
残留态），但 `:key="refreshKey"` 必须挂在根元素**内部**——那一层拿不到 transition hooks，
重建仍是同步的。`resetTransition.test.ts` 盯着这条，同时锚定了 `BaseTable` 那边的过渡还在
（前提没了，约束也就不成立）。

**推论：给包层任何组件的根元素加 key 之前，先确认它没有被消费方套进 `<Transition>`。**
反过来，给一个组件套过渡之前，也要先看它根元素上有没有 key——两边单独看都正确，凑到一起才出事。

### 树选择器、排序透传、导入组件

- **树选择器不需要 `BaseTreeSelect` 包装组件**：`MainForm`/`compMatchText`（`utils/componentApi.ts`）/`buildFormRules`（`utils/formRules.ts`）三处早就预留了 `renderOptions.type: 'el-tree-select'` 分支，直接把原生 `el-tree-select` 的 props 塞进 `renderOptions.props` 即可（`data`/`props.label`/`props.value`/`multiple`/`checkStrictly`/`showCheckbox` 全部透传）：

  ```ts
  {
    prop: 'deptId',
    label: '部门',
    renderOptions: {
      type: 'el-tree-select',
      props: {
        data: deptTree,
        props: { label: 'title', value: 'id' }, // 键名跟着源数据走，不强求统一
        checkStrictly: true,
      },
    },
  }
  ```

  表格展示态的回显（`compMatchText`）会用 `renderOptions.props.data` 做树形递归匹配，`renderOptions.props.props`（缺省 `{label:'label', value:'value', children:'children'}`）决定取哪几个键。saber3 15 处树选择器的 `props.label`/`props.value` 键名各不相同（`title`/`realName`/`postName`/`tenantName` 等），这条链路已经能覆盖全部差异，**不需要新建组件去收敛**——15 处配置本来就没有可收敛的公共逻辑。单测见 `utils/componentApi.test.ts`。
- **`BaseTable` 的 `sort-change` 事件已经透传**：`defineOptions({ inheritAttrs: false })` + `v-bind="{ ...BASE_TABLE_PROPS, ...mergedAttrs }"`（`BaseTable/index.vue:372`）把 `$attrs` 整体绑到 el-table 上，`@sort-change="xxx"` 会被 Vue 编译成 `$attrs.onSortChange`，随 `mergedAttrs` 一并 `v-bind` 到 el-table，原生事件正常触发，**不需要额外 emit**。但 `BaseTable` 本身只换 `:data`，排序不会重新请求后端——后端排序场景下，父组件要自己监听 `@sort-change` 并调用 `fetchApi`/`refreshTable()` 重新拉数据。⚠️ 这条尚无消费方验证，第一个用到 `sortable` 的页面留意。
- **`BaseImportButton` 不再绑定 axios**：`uploadApi: (formData: FormData) => Promise<any>` 由调用方注入（对齐 `BaseTable.fetchApi` 的范式），组件内部只管发 `FormData`，不管走哪条 HTTP 客户端；`allowedExtensions` 也改成了 prop（默认 `['.xls']`），文件扩展名/大小校验逻辑抽到了 `utils/fileValidation.ts` 的 `validateImportFile()` 纯函数，方便单测。⚠️ 这两处只有单测覆盖，**没有浏览器端到端验证**，第一个真实接入方要自己核对一遍。

## 后端响应契约只在 `config/response.ts` 里展开

`pickListData` / `isSuccessResponse` / `getResponseMessage` 三个函数是本包解析后端响应的**唯一出口**。
`BaseTable`、`useEditListPageRender`、`BaseImportButton` 原先各自就地写 `res.data.data.records`、
`res.data.code === 200`、`res.data.success`，换后端时得靠 grep 才找得全。

**新增任何要读后端响应的代码，一律走这三个函数，不要在组件里就地展开 `res.data`。**
刻意没做成可注入的适配器（内网各项目共用同一套 BladeX 形状，抽象出来只有一个实现）——
真出现第二种响应形状时，改造入口也是这个文件。

> 收敛时顺带修了一处：`BaseTable` 原来是 `res.data.data.records ?? res.data.data ?? []`，
> 当 `data` 是个既非数组、又没有 `records` 的对象时，会把那个对象整个赋给 `el-table` 的 `:data`。
> 现在只在 `Array.isArray` 成立时才回落。

## 类名前缀 `sc-` 是公开 API，改它要 grep 整个仓库

本包所有自定义类名带 `sc-` 前缀，`styles/classPrefix.test.ts` 守着四条不变量
（不残留旧前缀、模板用到的都有定义、全局样式无死代码、所有类名都带前缀）。

⚠️ **那条测试只扫 `packages/shared-components/src` 以内，守不住包外。**
`styles/common.scss` 里的全局类（`sc-base_table_con` / `sc-search_box` / `sc-custom_dialog_box` /
`sc-custom_drawer_box` / `sc-main_form_grid`）会被消费方直接选中——各应用
`src/styles/element-ui.scss` 给表格卡片借边框的那几条、`gcc-saber3` 的 `subject-select` 都是。
**改前缀必须同时 grep 全仓库**，漏掉包外那几处就是样式静默失效。

## `styles/_variables.scss` 的 `:root` 变量不是全局可用的

`--header-h` / `--primary` 声明在 `styles/_variables.scss` 的 `:root` 里，而这份样式是靠
`BaseTable` / `BaseDialog` / `BaseSearchBox` / `BaseAddEditDialog` 的**非 scoped** `<style>` 里那句
`@use '../../styles/common.scss'` 间接带进消费方的。**没加载上述任何一个组件的路由，这两个变量就不存在。**

实测（条目 25，gcc-saber3 产物）：`--primary:#005bac` 只出现在懒加载的 `BaseTable-*.css` 里，
而 `BaseHeader` 的样式在入口 `index-*.css` —— 头部先于表格渲染，取不到值。

所以**凡是在组件里用这两个变量，必须带 fallback**：`h-[var(--header-h,46px)]`、
`bg-[var(--primary,#005bac)]`。`BaseHeader` 两处都已按此处理，新增组件照办。

## BaseTable 卡片的上/左边框由**消费方容器**裁决，共享包不画

`common.scss` 里 `.sc-base_table_con .el-card` 只写 `border-radius: 0`，**刻意不写 `border-top` / `border-left`**。
两条边各由一个沿 DOM 继承的自定义属性决定，声明在消费方应用的 `src/styles/element-ui.scss`：

| 属性 | 列表页容器（`.page-layout__main` / `__aside`） | 弹窗 / 内缩容器（`.el-dialog` / `.el-drawer` / `.page-inset`） |
|---|---|---|
| `--app-table-card-left-border` | `none`（左缘那条竖线由侧边栏的 `border-right` 画） | `initial`（走兜底 = el-card 自己的边框） |
| `--app-table-card-top-border` | `none`（顶边那条线由标签栏的 `border-bottom` 画） | `initial` |

上边框这条是 `20260903p` 补的。**在那之前这里写死 `border-top: none`**，于是同一套布局在列表页正常、
一塞进弹窗顶边就断了一条（3 个内嵌弹窗 + `model/edit.vue` 的 tab 全中招），**且不报任何错**。
两条边的机制现在完全对称，改一条时把另一条一起看。

⚠️ **新应用消费 BaseTable 时必须把这两条容器声明抄过去**（`gcc-template` 已带），
否则列表页会在标签栏下边框旁边多画一条，变成 2px。

⚠️ 应用侧还有一条 `> .sc-search_box + .el-card { border-top: none }`：搜索卡片与表格卡片上下相邻时，
下面那张的上边框会和上面那张的下边框并排成 2px。这条与容器无关、恒成立，所以不走自定义属性。

⚠️ **这条选择器同时吃「直接子元素」（`>`）与「相邻兄弟」（`+`）两个 DOM 关系，而搜索区在
`BaseTable/index.vue` 里是包在 `<el-collapse-transition>` 里的**（2026-09-07 给搜索区显示/隐藏
加折叠过渡时引入）。两个关系没被破坏，靠的是 **Vue 的 `<Transition>` 无渲染节点、不产生 DOM
包裹层**。把这个过渡换成任何**会产生一层真实 DOM** 的实现（典型如自己写个 div 包一层做
`grid-template-rows: 0fr ↔ 1fr`），那层 div 会同时打断 `>` 和 `+`，表格卡的上边框冒出来、
与搜索卡的下边框并排成 2px——**不报任何错**。
搜索区收起时（`v-if` 为假）Vue 留下的是注释占位节点，CSS 的 `+` 忽略注释，选择器自然不匹配，
表格卡回落到自己那条上边框，这正是没有搜索卡时该有的样子。

## BaseHeader 的可选能力

**`title`（主标题 / 产品族名）是必填 prop，由接入方传。** 它曾经直接 import `shared-utils` 的
`rootConfig.title`，那是把项目身份焊死在组件里；现在三个应用各自持有一份同值副本
（saber3 / template 在 `app.config.ts` 的 `platformTitle`，gcc-login 在 `constants/app.ts` 的
`PLATFORM_TITLE`），改平台名要三处一起改。同理，头部底色读的 `--primary` 也由接入方声明，
包里只给 `var(--el-color-primary)` 作为 fallback。

`collapsible`（默认 `false`）打开后，会在 logo 右侧渲染 `i-ep-fold` / `i-ep-expand` 折叠按钮，
折叠态通过 `v-model:collapsed` 双向绑定给接入方持有（gcc-saber3 接的是 `useLayout().isCollapse`——
条目 20260901c 删掉 `common` store 后已不再是 `useCommonStore`）。
`logo` prop 默认 `/logo2.png`，**三个接入方的 `public/` 下各放了同一份**（gcc-login / gcc-saber3 / gcc-template）。

> ⚠️ **这是包层唯一一处硬编码的应用资源路径，也是一个反复踩的坑。** 应用侧 grep 自己的 `src`
> 会判定 `logo2.png` 零引用——消费方在这里，而接入方大多不传 `logo` prop（gcc-saber3 就没传）。
> 删掉应用 `public/` 下的资源前，**必须先在 `packages/*` 里搜一遍 prop 默认值**。
> 已误删两次：条目 20260901g（gcc-template 侧）、条目 20260903b（gcc-saber3 侧），两次都在核对文档时才发现。

不传这两个 prop 的接入方（gcc-login）行为与改动前完全一致。

条目 28 又加了 `navWidth` / `collapsedNavWidth`（都可选）：传了 `navWidth` 才给左区固定宽度，
两个值就是接入方侧边栏展开态/折叠态的宽度同值字面量（gcc-saber3 传 `230px` / `64px`，即
`$sidebar-width` / `$sidebar-collapse-width`——组件在包层、SCSS 变量在应用层，两者没有通道，
只能各留一份并互相注释指认）。

**折叠按钮排在定宽左区之外**（两者由一层 flex 容器包住），所以它的**左缘**贴住左区右缘，
也就是与侧边栏右边框对齐；展开/折叠两态同一条规则，按钮的位移完全由左区的宽度过渡逐帧带动，
不需要也不应该再给按钮单独写 transition。
⚠️ 包一层不是可选的：按钮若直接做 `<header>` 的子元素，header 的 `justify-between` 会把它甩到中间。
（这条取代了条目 28 「折叠态接受按钮右缘比侧边栏多出 12px」的旧结论——当时假定按钮算在
`pl 10 + logo 32 + icon 22 = 64` 这一列里、塞不下，把按钮挪出这一列后该约束就不存在了。）

折叠时左区宽度切到 `collapsedNavWidth`，同时左内边距由 `navStyle` 撑到
`calc((collapsedNavWidth - 32px) / 2)`，让 logo 居中于折叠后的左区。
padding 必须**两态都显式挂 inline style**（展开态也写 `10px`），靠「有时挂 style、有时回落到
class 的 `pl-*`」是过渡不出来的——所以模板上没有 `pl-10px` 类，缩进值只在 `navStyle` 里有一份。

标题文本靠 `max-width` + `opacity` + 外边距三者一起过渡收起——**不能用 `v-if`**（瞬间消失没有过渡），
间距也**不能用父级的 `gap`**（gap 无法只对某个子项做过渡，折叠后会留一段死白）。
过渡缓动写的是任意值 `ease-[ease]` 而不是 `ease`，理由见 `apps/gcc-saber3/CLAUDE.md` §4.4 最后一条。

条目 20260904h 再加了 `titleClickable`（可选，默认 `false`）：为真时给标题列加手型，点击 emit
`titleClick`。**跳哪儿由接入方决定**——三个接入方的「首页」并不相同（gcc-saber3 / gcc-template 是
`appConfig.app.firstPage`，gcc-login 的 AppsHeader 自己就是门户首页，因此它不传这个 prop）。
这与 `BaseTable.onLinkClick`「可点单元格只报告点击」是同一条范式。

⚠️ **事件挂在 `:style="navStyle"` 那一层 div 上，挂错层级不报错、只是行为悄悄错**：折叠按钮是
标题列的**兄弟节点**（见上一段），挂到外层包裹容器上会被折叠的点击冒泡命中，挂到 `<header>` 根上
还会连右侧插槽（下拉菜单、全屏按钮）一起命中。也不能让接入方自己在 `<BaseHeader @click>` 上绑——
组件是单根节点且没有 `inheritAttrs: false`，原生 click 会 fallthrough 到整条 header。
`BaseHeader/titleClick.test.ts` 为这条层级立了桩（扫模板源码，理由同 `detailText.test.ts`）。

⚠️ 用 `titleClickable` 而不是探测有没有监听器：`defineEmits` 声明过的事件会从 `$attrs` 里摘掉，
组件内部探测不到接入方绑没绑 `@title-click`。

## AnyKey 的跨包引入方式

`types/global.d.ts` 用相对路径 triple-slash reference 显式引入 `shared-utils` 的全局类型声明：

```ts
/// <reference path="../../../shared-utils/src/types/index.d.ts" />
```

这不是随手抄的写法——**ambient 声明不会随 package 依赖关系自动传播**到消费方的类型检查范围，仅仅在 `package.json` 里声明依赖是不够的，必须显式 reference 才会被本包的 `vue-tsc` 纳入编译。声明处那一侧的纪律见 `packages/shared-utils/CLAUDE.md`。

## 条目 20260903o：详情弹窗文本样式与 BaseTable 的 20px 留白

两节记的都是「看着像可以顺手清理、删了就静默坏掉」的写法，动之前先读这里。

### `BaseDetailDialog` 的文字样式靠 `class="detail-*"`，不能写成属性

```html
<span class="detail-title">{{ col.label }}：</span>
<span class="detail-info">
  <RenderCell v-if="col.render" :render="col.render" :row="data" :col="col" />
  <template v-else>{{ compMatchText(data, col) || '--' }}</template>
</span>
```

`detail-title`（灰 `#606266`）/ `detail-info`（黑色加粗）是 `shared-unocss` 里的 shortcut。
**必须写成 `class`**——本仓库的 attributify 是 `prefixedOnly`，裸属性写法生成不出任何规则，
而产物 CSS 里那条同名的 class 规则照样在，肉眼查产物完全看不出问题。完整机制见
`packages/shared-unocss/CLAUDE.md` 的「attributify 是 `prefixedOnly`」。

**`detail-info` 套在两个分支外面，不是分支内部。** 值列不管走 `col.render` 还是走
`compMatchText`，字重字色都由弹窗自己裁决：套进 `v-else` 那一支的话，`render` 分支就得靠
调用方在 render 产物里自己加 class，而**同一个 `render` 还要供 `BaseTable` 渲染表格单元格**
（`RenderCell` 就是从 `BaseTable` 借来的），表格里不该加粗，加不得。
`detailText.test.ts` 盯着这条不变量——它扫模板源码而不是断言 DOM，因为本包没有
`@vue/test-utils` / `happy-dom`，为一条样式断言引两个依赖不划算，做法沿用
`styles/classPrefix.test.ts`。

> **修订（2026-09-04）**：本节此前写着「`col.render` 分支不套 `detail-info`，查看态不加粗是
> 预期而非漏改」——**那句是错的**。saber3 用户管理页的「身份证号」（脱敏）与「账号有效期」
> 是仓库里仅有的两个 `render` 列，用户验收时一眼看出它们在弹窗里是灰色细体、与同排其它字段
> 不同款。判成「预期」的那次没有对照过页面。

### `BaseTable` 的纵向留白是统一的 20px，四条规则合力维持

**设计口径：凡是「内容 → 容器边界」的留白一律 20px。** 具体到 `BaseTable`（含它内嵌的
`BaseSearchBox`）有五处，全都得是 20px：

| # | 位置 | 由谁提供 |
|---|---|---|
| ① | 搜索区上边距（卡片顶 → 搜索控件顶） | 搜索卡片 `el-card` 默认 `padding` |
| ② | 搜索区下边距（搜索控件底 → 卡片下边框） | 同上 |
| ③ | 工具栏按钮顶 → 上方边框 | 表格卡片 `el-card` 默认 `padding` |
| ④ | 工具栏按钮底 → 表格顶 | `.top_btn_box` 的 `margin-bottom` |
| ⑤ | 表格左右边距 | 表格卡片 `el-card` 默认 `padding` |

③④⑤ 是 element-plus / 存量样式自带的，**不用也不要动**。真正需要维护的是让 ①② 也落在 20px
上的四条约束，它们互相咬合，改任一条都要回头核对其余三条：

```scss
// A. 搜索行不写死行高——高度就是控件自身的 32px
.search_left--header { /* 没有 height */ }
.search_right        { /* 同上 */ }

// B. 展开区自成 BFC，并裁掉高度过渡期间的溢出
.search_left--main { overflow: hidden; }

// C. 行间距用 margin-top，不用 margin-bottom
.search_left--main .el-row { margin-top: 8px; }
```

```ts
// D. 展开区高度：每行 40px = 8px 行间距 + 32px 控件
const mainSearchBoxHeight = computed(() => Math.ceil(searchItems.value.slice(4).length / 4) * 40)
```

**A —— 行高写死过 46px（连同 SCSS 变量 `$base-top-height`，删时零消费方）。** 32px 控件在
46px 行里居中，上下各多出 7px，叠在卡片 20px padding 上，肉眼看到的 ①② 就是 27px 而不是 20px。
**这 7px 是三轮返工的根因**：前两轮都以为该砍 padding，砍到 0 之后 ①② 变成 7px、又要在别处
补偿，越补越歪。行高交给内容决定，20px 的 padding 才等于 20px 的留白。

**C —— 方向不能改回 `margin-bottom`。** 那 8px 要出现在 header 与第一行之间、以及行与行之间，
但**不能**出现在最后一行下方：末行的 `margin-bottom` 会叠在卡片的 `padding-bottom` 上，
② 变成 28px。

**B —— `overflow: hidden` 是 C 的前提，不是随手加的。** 少了它，`.el-row` 的 `margin-top` 会与
`.search_left--main` 折叠、跑到容器外面去，**折叠态凭空多出 8px**。它同时替代了原先靠祖先
`.search_main` 兜底的裁剪。

**D —— 40 这个数字跟着 C 走。** 小了展开区裁掉行底，大了末行下方多出空白、② 不再是 20px。
（旧值是 38，配 `margin-bottom` 时就已经差 2px，末行底部一直被裁，只是那 2px 落在空白 margin 上
没人看得出来。）

其它两条老约束仍然成立：

- **别改 `--el-card-padding`**——四边共用，改了会把横向 20px 一起吃掉，而 ⑤ 要靠它
- 覆盖 EP 内部样式的选择器都带容器类，靠特异度赢、不依赖加载顺序
  （同类坑见 `apps/gcc-saber3/CLAUDE.md` §4.4 第三条）

浏览器实测（`getBoundingClientRect`，saber3 用户管理页）：①20 ②20 ③20 ④20 ⑤20；
搜索区折叠 73px / 展开 113px，展开区 `offsetHeight === scrollHeight === 40`（严丝合缝无裁剪），
header 到第一行 8px；隐藏搜索区后表格卡片 `padding-top` 仍是 20px。
