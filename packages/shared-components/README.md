# @huberyyang/shared-components

面向「CRUD 管理后台」的 Vue 3 组件库。核心是一条约定：**一份 `columns` 配置同时驱动搜索区、表格、新增/编辑表单、详情弹窗四处渲染**，页面只写数据来源和业务动作。

> 本文档讲**怎么用**。改这个包本身要知道的坑点、样式契约与历史决策在同目录的 `CLAUDE.md`，两份刻意不重复：用的时候会撞上的事这里放一行提示并给出链接，机制细节去那边看。

## 目录

- [快速开始](#快速开始)
- [核心心智：一份 columns 驱动四处渲染](#核心心智一份-columns-驱动四处渲染)
- [组件速查](#组件速查)
- [完整示例：一个标准列表页](#完整示例一个标准列表页)
- [组件](#组件)
  - [BaseTable](#basetable) · [BaseSearchBox](#basesearchbox) · [BaseAddEditDialog](#baseaddeditdialog) · [BaseDetailDialog](#basedetaildialog) · [BaseDialog](#basedialog)
  - [BaseBtn](#basebtn) · [BaseHelpTip](#basehelptip) · [BaseHeader](#baseheader) · [BaseExportButton](#baseexportbutton) · [BaseImportButton](#baseimportbutton)
  - [BaseMenu / BaseMenuLayout](#basemenu--basemenulayout) · [PasswordStrength](#passwordstrength) · [TransitionRouterView](#transitionrouterview)
- [Composables](#composables)
- [工具函数](#工具函数)
- [配置常量](#配置常量)
- [类型](#类型)
- [约定与边界](#约定与边界)

## 快速开始

### 安装

包**按源码消费、不构建**（`main` / `types` 直接指向 `src/index.ts`，由消费方的 Vite 编译），改动立即生效，不需要 build。应用侧声明依赖后 `pnpm install` 即可：

```jsonc
{
  "dependencies": {
    "@huberyyang/shared-components": "workspace:*"
  }
}
```

`peerDependencies` 有 6 个，消费方必须自己显式声明：`vue`、`vue-router`、`element-plus`、`@element-plus/icons-vue`、`lodash-es`、`sass`。（**不含 axios**——HTTP 客户端一律由消费方注入，见 `BaseTable.fetchApi` / `BaseImportButton.uploadApi` / `BaseExportButton.exportApi`。）

⚠️ **`sass` 是构建时的硬依赖，漏了会让消费方的 `vite build` 直接失败**（`Preprocessor dependency "sass-embedded" not found`）。本包有 14 个文件写着 `<style lang="scss">`，而预处理器由**消费方的 vite** 加载——包自己不 import 它，所以是 peer 而不是 dependency。仓库是 hoisted 模式，不声明也能 import 成功、本地不报错，**迁出该应用时立刻崩**。

### 引入

**本包不在任何应用的自动导入范围内**（`unplugin-auto-import` / `unplugin-vue-components` 都没有配它），一律具名 import：

```ts
import type { ColumnOptions } from '@huberyyang/shared-components'
import { BaseAddEditDialog, BaseBtn, BaseTable, withConfirm } from '@huberyyang/shared-components'
```

### 样式

**不需要手动引入任何 CSS。** `BaseTable` / `BaseDialog` / `BaseSearchBox` / `BaseAddEditDialog` 的非 scoped `<style>` 里 `@use` 了 `styles/common.scss`，样式随组件一起进产物。

⚠️ 由此带来一条会静默出问题的推论：`styles/_variables.scss` 里的 `:root { --header-h; --primary }` 也只随上面那几个组件加载。**当前路由一个都没加载时，这两个变量不存在**（实测：`--primary` 只出现在懒加载的 `BaseTable-*.css` 里）。所以用它们必须带 fallback：

```html
<div class="h-[var(--header-h,46px)] bg-[var(--primary,#005bac)]" />
```

包另外导出了 `./styles/*` 子路径（可以 `@use '@huberyyang/shared-components/styles/common.scss'`），当前没有任何消费方——正常接入用不到它。

### 用 BaseTable 的应用必须提供两条容器声明

表格卡片的上、左边框**由消费方容器裁决，共享包不画**，契约是两个沿 DOM 继承的自定义属性。应用的 `src/styles/element-ui.scss` 里要有：

```scss
// 列表页容器：左缘竖线由侧边栏的 border-right 画，顶边由标签栏的 border-bottom 画
.page-layout__main,
.page-layout__aside {
  --app-table-card-left-border: none;
  --app-table-card-top-border: none;
}

// 弹窗 / 内缩容器：回落到 el-card 自己的边框
.el-dialog,
.el-drawer,
.page-inset {
  --app-table-card-left-border: initial;
  --app-table-card-top-border: initial;
}
```

`gcc-saber3` 与 `gcc-template` 都已带这两段，**从 `gcc-template` 起步的新模块不用管**。从零接入的应用漏了它，列表页会在标签栏下边框旁边多画一条、变成 2px，且不报任何错。机制见 `CLAUDE.md`「BaseTable 卡片的上/左边框由消费方容器裁决」。

## 核心心智：一份 columns 驱动四处渲染

一个页面只维护一份 `ColumnOptions[]`，四个组件各取所需：

```
                         ┌── BaseSearchBox ──► 搜索控件（searchable / renderOptions.searchOrder）
                         │
ColumnOptions[] ─────────┼── BaseTable ──────► 表格列（showInTable / render / renderOptions.slot）
   （页面里的 columns）    │
                         ├── BaseAddEditDialog ─► 表单项（showInForm / editable / validate / span / formSlot）
                         │
                         └── BaseDetailDialog ──► 详情项（render；不过滤，全量渲染）
```

控制「这一列出现在哪里、长什么样」的开关全在 `ColumnOptions` 上：

| 字段 | 默认 | 作用 |
| --- | --- | --- |
| `prop` / `label` | 必填 | 字段名与中文名，四处共用 |
| `searchable` | `1` | `0` = 不出现在搜索区 |
| `showInTable` | `1` | `0` = 不出现在表格。⚠️ 详情弹窗**不读**这个开关，见 [BaseDetailDialog](#basedetaildialog) |
| `showInForm` | `1` | `0` = 不出现在新增/编辑表单 |
| `editable` | `1` | `0` = **编辑态**剔除该项（新增态仍在）；`2` = 表单里显示为只读文本 |
| `validate` | `0` | `1` = 生成必填规则（走 `buildFormRules`） |
| `sortable` | `1` | `0` = 关闭该列排序。注意默认是**开**的 |
| `span` | `1` | `2` = 表单项跨两列（弹窗两列网格下独占一行；单列模式自动失效） |
| `width` / `fixed` / `align` | — | 原样透传给 `el-table-column` |
| `type` | — | 目前只有 `'link'`：单元格变成可点文本，点击 emit `onLinkClick` |
| `render` | — | 自定义渲染函数，**表格与详情弹窗共用** |
| `formSlot` / `formSlotName` | `0` / `prop` | `1` = 该表单项整体交给具名插槽自己渲染 |
| `renderOptions` | — | 搜索 / 表单控件的配置，见下 |

`renderOptions`（`ColumnRenderOptions`）：

| 字段 | 默认 | 作用 |
| --- | --- | --- |
| `type` | `'el-input'` | 控件标签名，搜索区与表单共用，如 `el-select` / `el-tree-select` / `el-cascader` / `el-date-picker` / `el-input-number` |
| `options` | — | `type` 为选择类控件时的数据源，同时被 `compMatchText` 用于表格回显 |
| `props` | — | 透传给控件的其余属性 |
| `rule` | — | element-plus 的 `FormItemRule`，与 `validate: 1` 配合 |
| `searchLabel` | `label` | 搜索框里的别名 |
| `searchOrder` | 声明顺序 | 搜索框排序，从 1 起。**搜索区只有前 4 项常显**，其余收在「展开」里 |
| `needMatch` | `1` | `0` = `el-cascader` 列不做标签回显 |
| `slot` / `slotName` | `0` / `default` | 见下方警告 |
| `slotRender` | — | 表单控件内部插槽的渲染函数（如 el-input 的 `append`） |
| `ref` | — | 给表单控件起引用名，可从 `BaseAddEditDialog` 的 `refMap` 取到 |

⚠️ **`renderOptions.slot` 是重载字段**：`BaseTable` 把它当「表格单元格插槽」，`BaseAddEditDialog` 的表单把它当「表单控件的内部插槽」。同一列可能同时用到两种语义，改之前先确认影响面。

⚠️ **`renderOptions.props.disabled` 会连搜索框一起禁掉**（搜索控件的 `:disabled="false"` 排在 `v-bind` 的 `props` 展开之前，被反超）。只想禁表单控件就走 `formSlot: 1` 自己渲染；`renderOptions.props.disabled` 只用在 `searchable: 0` 的列上。

## 组件速查

| 组件 | 一句话 | 什么时候用 |
| --- | --- | --- |
| [`BaseTable`](#basetable) | 搜索区 + 工具栏 + 表格 + 分页的整页骨架，自带取数与分页 | 任何列表页，几乎是本包的入口 |
| [`BaseSearchBox`](#basesearchbox) | 只要搜索区那一张卡片 | 需要搜索但表格不是 `BaseTable` 时；`BaseTable` 内部已内嵌 |
| [`BaseAddEditDialog`](#baseaddeditdialog) | 由 columns 生成的新增/编辑表单弹窗，表单项 >16 自动换抽屉 | 标准新增/编辑 |
| [`BaseDetailDialog`](#basedetaildialog) | 由 columns 生成的只读详情弹窗，两列排布 | 「查看」 |
| [`BaseDialog`](#basedialog) | 统一样式的弹窗壳（自定义头、全屏切换、禁点遮罩关闭） | 内容自定义的弹窗，一律用它而不是裸 `el-dialog` |
| [`BaseBtn`](#basebtn) | 六种预设按钮（新增/删除/详情/编辑…），文案与图标内置 | 工具栏与表格行内操作 |
| [`BaseHelpTip`](#basehelptip) | 带 tooltip 的问号/提示图标 | 表单项、开关旁边的说明 |
| [`BaseHeader`](#baseheader) | 应用顶栏：logo + 标题 + 折叠按钮 + 中/右插槽 | 应用底座，业务页用不到 |
| [`BaseExportButton`](#baseexportbutton) | 二次确认 → 拉文件流 → 下载 xls | 导出。请求实例由消费方注入 |
| [`BaseImportButton`](#baseimportbutton) | 拖拽上传弹窗 + 扩展名/大小校验 | Excel 导入 |
| [`BaseMenu`](#basemenu--basemenulayout) / `BaseMenuLayout` | 路由驱动的两级菜单，及「左菜单 + 右内容」可拖分栏布局 | 页内二级导航 |
| [`PasswordStrength`](#passwordstrength) | 四段密码强度条 | 改密码、新建用户 |
| [`TransitionRouterView`](#transitionrouterview) | 120ms 淡入淡出的路由过渡包装 | 路由出口 |

## 完整示例：一个标准列表页

下面是 `apps/gcc-saber3/src/views/system/post.vue`（岗位管理）的骨架，删掉了权限判断和租户分支。**新写列表页照着这份抄**，四个组件共用同一份 `columns`：

```vue
<script setup lang="ts">
import type { ColumnOptions } from '@huberyyang/shared-components'
import { BaseAddEditDialog, BaseBtn, BaseDetailDialog, BaseTable, withConfirm } from '@huberyyang/shared-components'
import { ElMessage } from 'element-plus'
import { add, getDetail, getList, remove, update } from '~/api/system/post'

const tableRef = ref()
const loading = ref(false)
const operationType = ref<'add' | 'edit'>('add')
const dialogAddEditVisible = ref(false)
const dialogViewVisible = ref(false)
const addEditForm = ref<AnyKey>({})
const currentRow = ref<AnyKey>({})
// 选中态自持，不要用 computed 读 getRowSelection()，理由见 BaseTable 一节
const selectionList = ref<AnyKey[]>([])

const columns = computed<ColumnOptions[]>(() => [
  {
    prop: 'category',
    label: '岗位类型',
    validate: 1,
    renderOptions: {
      type: 'el-select',
      options: categoryOptions.value,
      // 搜索用 type/options，表格单元格用 slot——两种语义互不干扰
      slot: 1,
      slotName: 'categoryCol',
    },
  },
  { prop: 'postCode', label: '岗位编号', validate: 1 },
  { prop: 'postName', label: '岗位名称', validate: 1 },
  {
    prop: 'sort',
    label: '岗位排序',
    searchable: 0,
    validate: 1,
    renderOptions: { type: 'el-input-number', props: { controlsPosition: 'right' } },
  },
  {
    prop: 'remark',
    label: '岗位描述',
    searchable: 0,
    showInTable: 0,
    renderOptions: { type: 'el-input', props: { type: 'textarea', rows: 6 } },
  },
])

// BaseTable 把分页与搜索条件合成一个对象交过来，这里拆成后端要的形状
function fetchApi(params: AnyKey) {
  const { current, size, ...rest } = params
  return getList(current, size, rest)
}

function onAdd() {
  operationType.value = 'add'
  addEditForm.value = {}
  dialogAddEditVisible.value = true
}

async function onEdit(row: AnyKey) {
  operationType.value = 'edit'
  const res = await getDetail(row.id)
  currentRow.value = { ...row }
  addEditForm.value = { ...(res?.data?.data ?? {}) }
  dialogAddEditVisible.value = true
}

function onDelete(row: AnyKey) {
  withConfirm({
    label: '删除当前数据',
    onConfirm: async () => {
      const res = await remove(row.id)
      if (res?.data?.code === 200) {
        ElMessage.success('操作成功!')
        tableRef.value?.refreshTable()
      }
    },
  })
}

// done() 由弹窗提供：调用后才关闭弹窗、重置表单
async function onAddEditSubmit(done: () => void) {
  loading.value = true
  try {
    const fetchSubmit = operationType.value === 'edit' ? update : add
    const res = await fetchSubmit({ ...addEditForm.value })
    if (res?.data?.code === 200) {
      ElMessage.success('操作成功!')
      tableRef.value?.refreshTable()
      done()
    }
  }
  finally {
    loading.value = false
  }
}
</script>

<template>
  <page-layout>
    <BaseTable
      ref="tableRef"
      :columns="columns"
      :fetch-api="fetchApi"
      selection
      op-column-width="220"
      @selection-change="(list: AnyKey[]) => selectionList = list"
    >
      <template #topBtn>
        <BaseBtn btn-type="add" @click="onAdd" />
        <BaseBtn btn-type="delete" :disabled="!selectionList.length" @click="onBatchDelete" />
      </template>

      <!-- renderOptions.slot=1 的列，插槽名就是 slotName -->
      <template #categoryCol="{ scope: { row } }">
        <el-tag>{{ row.categoryName }}</el-tag>
      </template>

      <template #operation="{ scope: { row } }">
        <BaseBtn btn-type="op-detail" @click="onView(row)" />
        <BaseBtn btn-type="op-edit" @click="onEdit(row)" />
        <BaseBtn btn-type="op-delete" @click="onDelete(row)" />
      </template>
    </BaseTable>

    <BaseDetailDialog v-model:visible="dialogViewVisible" :columns="columns" :data="currentRow" />

    <BaseAddEditDialog
      v-model:visible="dialogAddEditVisible"
      v-model:form-data="addEditForm"
      :render-type="operationType"
      :columns="columns"
      :loading="loading"
      @on-submit-success="onAddEditSubmit"
    />
  </page-layout>
</template>
```

更多现成参照：`apps/gcc-saber3/src/views/system/` 下的 `dept` / `dict` / `menu` / `role` / `user` / `user-group`，以及 `apps/gcc-template/src/views/system/menu.vue`。

## 组件

### BaseTable

列表页的整页骨架：搜索卡片 + 工具栏（新建/删除按钮区 + 刷新/搜索开关）+ 表格 + 分页。**取数、分页、搜索条件收集都在组件内部**，页面只提供 `columns` 和一个 `fetchApi`。

```vue
<BaseTable
  ref="tableRef"
  :columns="columns"
  :fetch-api="fetchApi"
  selection
  op-column-width="220"
  @selection-change="(list) => selectionList = list"
>
  <template #topBtn>
    <BaseBtn btn-type="add" @click="onAdd" />
  </template>
  <template #operation="{ scope: { row } }">
    <BaseBtn btn-type="op-edit" @click="onEdit(row)" />
  </template>
</BaseTable>
```

#### Props

| 名称 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `columns` | `ColumnOptions[]` | **必填** | 列配置，同时驱动搜索区与表格列 |
| `fetchApi` | `(params: AnyKey) => any` | **必填** | 取数函数，见下方「取数契约」 |
| `fetchExtParams` | `AnyKey` | `{}` | 额外固定参数，合并进请求；**深度变化会自动重新取数**（左栏树切换节点就靠它） |
| `handleParamsCb` | `(originParams: AnyKey) => any` | — | 请求前最后一道参数改写，拿到的是深拷贝 |
| `selection` | `boolean` | `false` | 是否有勾选列 |
| `selectable` | `(row, index) => boolean` | — | 逐行控制能否勾选 |
| `index` | `boolean` | `true` | 是否有序号列 |
| `expandProps` | `{ label?, width? }` | — | 传了才渲染展开列，配合 `#expand` 插槽 |
| `showSearchBar` | `boolean` | `true` | **初始**是否展开搜索区；传 `false` 用户仍可点工具栏的搜索按钮打开 |
| `havePagination` | `boolean` | `true` | 关掉后按 `{ current: 1, size: 500 }` 一次取回 |
| `paginationParams` | `Pagination` | `{ current: 1, size: 20 }` | 分页初值，也是 `reloadList()` 重置的目标 |
| `paginationOptions` | `AnyKey` | — | 覆盖 `BASE_PAGINATION_PROPS`（深合并） |
| `opColumnWidth` | `number \| string` | `100` | 操作列宽度。三个按钮通常要 `220`，更多要 `380` |
| `isTree` | `boolean` | `false` | 树形数据：递归写入 `level`，`children` 是 JSON 字符串时自动解析 |
| `treeFilterKey` | `string` | `''` | 指定字段后，搜索该字段变成**前端递归过滤**并自动展开/收起 |
| `searchLabelWidth` | `string \| number` | `60` | 搜索区标签宽度 |
| `rowKey` | `string` | — | ⚠️ **当前不生效**，见下方说明 |

⚠️ **`rowKey` 传了不起作用，行主键恒为 `id`。** 组件内部读的是 `$attrs['row-key']`，而 `rowKey` 已被声明成 prop——Vue 会把 `row-key` 属性提取进 props、从 `$attrs` 里摘掉，那个读取永远拿不到值。主键不叫 `id` 的表先按 `id` 归一，或改这个包。

#### 透传：没列在上面的都会落到 el-table 上

组件是 `inheritAttrs: false` + `v-bind="{ ...BASE_TABLE_PROPS, ...$attrs }"`，所以 **el-table 的原生属性和事件直接写在 `<BaseTable>` 上就行**，不需要本包再包一层：

```vue
<!-- 懒加载树表：lazy / load / tree-props 全是透传，不需要额外代码 -->
<BaseTable is-tree lazy :load="onTreeLoad" :have-pagination="false" ... />
<!-- 排序、行点击同理 -->
<BaseTable @sort-change="onSortChange" @row-click="onRowClick" ... />
```

⚠️ `@sort-change` 只是把事件透传出来，**组件自己不会因排序重新取数**。后端排序要在父组件监听后自己调 `refreshTable()`。

#### 取数契约

`fetchApi` 收到的参数 = 「非空的搜索条件」+ 分页（`current` / `size`）+ `fetchExtParams`，再过一遍 `handleParamsCb`。**空字符串、`null`、`undefined` 会被剔除，`0` 会保留。**

返回值按这个形状解析（对齐 BladeX 后端）：

```ts
total = res?.data?.data?.total || 0
data = res?.data?.data?.records ?? res?.data?.data ?? []
```

即：分页接口返回 `{ data: { data: { records, total } } }`，不分页接口返回 `{ data: { data: [...] } }` 也能直接吃。取数失败只 `console.error`，不弹提示、不抛出。

**组件挂载时立即取一次数**；此后搜索条件变化（深度）、`fetchExtParams` 变化都会自动重新取。

#### Emits

| 事件 | 参数 | 触发时机 |
| --- | --- | --- |
| `refreshChange` | — | 用户点了工具栏的刷新按钮 |
| `onLinkClick` | `rowData` | 点了 `type: 'link'` 的单元格（或 `render` 产物里 `type: 'link'` 的节点） |
| `onSearchReset` | — | 用户点了搜索区的「重置」 |

#### Slots

| 插槽 | 作用域参数 | 说明 |
| --- | --- | --- |
| `topCon` | — | 搜索卡片**上方**的自由区域 |
| `topBtn` | — | 工具栏左侧按钮区（新建、批量删除、导入导出都放这里） |
| `operation` | `{ scope }` | 操作列。**传了这个插槽才会渲染操作列** |
| `expand` | `{ row }` | 展开行内容，需同时传 `expandProps` |
| 列配置的 `slotName` | `{ scope }` | `renderOptions.slot === 1` 的列，用它自定义单元格 |

作用域参数是 el-table 原生 scope 再包一层，所以写法是 `#operation="{ scope: { row } }"`，展开行是 `#expand="{ row }"`。

> `defineSlots` 里还声明了一个 `default`，但模板中没有对应的渲染点，传了不会显示。

#### Expose（`TableExpose`）

`ref="tableRef"` 后可调用：

| 方法 | 说明 |
| --- | --- |
| `refreshTable()` | **最常用**。重建表格 + 按当前条件重新取数，**不重置**分页与搜索条件 |
| `fetchList()` | 只按当前条件重新取数，不重建表格 |
| `reloadList()` | 重置分页与搜索条件（会触发重新取数），相当于回到初始状态 |
| `getRowSelection()` | 当前勾选行（命令式读取，见下方警告） |
| `clearRowSelection()` | 清空勾选 |
| `getParams()` | 上一次实际发出的请求参数（深拷贝） |
| `getTotal()` | 当前总条数 |
| `expandAll()` / `collapseAll()` | 全部展开 / 折叠（树表与展开列都适用） |
| `tableRef` | 内部 el-table 实例，需要原生方法时用 |

⚠️ **增删改之后一律用 `refreshTable()`，不要用 `fetchList()`。** 懒加载树表展开出来的子节点缓存在 el-table 内部的 `lazyTreeNodeMap` 里，`fetchList()` 只换 `:data`，清不掉它——删掉的子节点会继续显示在表里。

#### 勾选态：必须用 `@selection-change` 自持

```ts
// ✅ 正确
const selectionList = ref<AnyKey[]>([])
function onSelectionChange(list: AnyKey[]) { selectionList.value = list }

// ❌ 错误：getSelectionRows() 是命令式读取，computed 没有可追踪的响应式依赖
const selectedData = computed(() => tableRef.value?.getRowSelection())
```

组件侧配套的硬契约：`refreshTable()` 与工具栏刷新按钮都会**补发一次空的 `selection-change`**，因为重建表格本身不触发该事件，不补发的话页面手里就留着一批表格上已看不到勾选的行，批量删除按钮仍然亮着。

#### 其它常见坑

- **`BaseBtn` 上不能写 `@click.stop`**（它 emit 不带事件对象，`.stop` 会抛 TypeError）。表格同时绑了 `@row-click` 时，把判断挪到接收端——勾选/序号/操作三种列都没有 `column.property`，据此一次挡掉。
- 表格默认**开启排序**（`sortable !== 0`），不想要排序图标的列要显式写 `sortable: 0`。

---

### BaseSearchBox

`BaseTable` 内部已经内嵌了它，**只有在「要搜索但表格不是 BaseTable」时才单独用**。

```vue
<BaseSearchBox
  v-model:search="searchForm"
  :columns="columns"
  :loading="loading"
  @on-search="fetchList"
  @on-search-reset="onReset"
/>
```

| 名称 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `columns` | `ColumnOptions[]` | **必填** | 自动过滤掉 `searchable: 0` 的列 |
| `card` | `boolean` | `true` | `false` 时不套 `el-card`，直接嵌进已有容器 |
| `labelWidth` | `string \| number` | `60` | 标签最小宽度 |
| `loading` | `boolean` | `false` | 查询按钮的 loading |

- `v-model:search` —— 搜索条件对象，键是 `prop`；「重置」会把它整个清成 `{}`。
- Emits：`onSearch`、`onSearchReset`。
- **只有前 4 项常显**，多出来的收在「展开」里；想调整哪几项常显，用 `renderOptions.searchOrder`（从 1 起）。
- 搜索区不渲染 textarea：列上写了 `props.type === 'textarea'` 时，`props` 会在搜索区被整体丢弃。
- 控件的额外属性按类型裁剪（`getControlProps`）：只有选择类控件才会拿到 `options`，只有带下拉面板的才会拿到 `filterable` / `fit-input-width`。

---

### BaseAddEditDialog

由 `columns` 生成的新增 / 编辑表单弹窗。**新建、编辑弹窗一律用它**，不要自己写一份 footer——文案、图标、左右顺序都已按全站规范内置。

```vue
<BaseAddEditDialog
  v-model:visible="dialogAddEditVisible"
  v-model:form-data="addEditForm"
  :render-type="operationType"
  :columns="columns"
  :loading="loading"
  @on-submit-success="onAddEditSubmit"
>
  <!-- formSlot: 1 的列在这里自己渲染，插槽名默认就是 prop -->
  <template #roleId>
    <el-tree-select v-model="addEditForm.roleId" :data="roleTree" multiple />
  </template>
</BaseAddEditDialog>
```

#### Props

| 名称 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `columns` | `ColumnOptions[]` | **必填** | 自动过滤 `showInForm: 0`；编辑态再过滤掉 `editable: 0` |
| `renderType` | `'add' \| 'edit' \| string` | **必填** | 判据是 `includes('add')`，所以 `'addChild'` 也算新增 |
| `loading` | `boolean` | `false` | 提交按钮的 loading |
| `title` | `string` | — | 不传则按模式显示「新增」/「编辑」 |
| `singleColumn` | `boolean` | `false` | 弹窗模式下表单排成一列（默认两列）；抽屉模式本来就是一列，对它无影响 |

`v-model:visible`（`boolean`）、`v-model:formData`（`AnyKey`，表单数据）。**没有声明的属性会继续透传**给内部的 `BaseDialog` / `el-drawer`，`width="520px"` 就是这么传下去的。

#### 弹窗还是抽屉：按表单项数量自动切

**过滤后的表单项 ≤ 16 用居中弹窗，> 16 自动换成右侧抽屉**（`size="26%"`，可拖拽调宽）。这条不可配置。

#### Emits

| 事件 | 参数 | 说明 |
| --- | --- | --- |
| `onSubmitSuccess` | `done: () => void` | **表单校验通过后**触发。提交成功了才调 `done()`，它负责关闭弹窗、`resetFields()`、清空 `formData` |
| `onCancel` | — | 点了「取消」（弹窗已同步关闭） |

校验不通过时不 emit，页面会自动滚动到第一个报错项。关闭弹窗（`closed`）时会重置表单、清空 `formData` 和 `refMap`。

#### Slots

- **`formSlot: 1` 的列** —— 插槽名是 `formSlotName || prop`，整个表单项的控件由你自己渲染。搜索区仍然按 `renderOptions` 渲染，两边互不干扰（用户管理页的「所属部门」正是这么做的）。
- **`tag`** —— 标题右侧的附加内容。
- 其余插槽会原样转发给内部表单，用于 `renderOptions.slot` 那条链路。

#### Expose

`refMap: Map<string, VNodeRef>` —— 列上写了 `renderOptions.ref: 'xxx'` 的控件实例，通过 `dialogRef.value.refMap.get('xxx')` 取。

#### 按钮文案与图标（全站唯一一套，别在别处另写）

| 场景 | 文案 | 图标 |
| --- | --- | --- |
| 新增 | **提交** | `i-ep-check` |
| 编辑 | **保存** | `i-ep-check` |
| 取消 | 取消 | `i-ep-close` |

主操作在左、取消在右；对钩和叉用裸系 `i-ep-check` / `i-ep-close`，不用圆圈系；按钮文案里不写空格。

⚠️ 单列模式要**同时收窄 `width`**（如 `520px`），否则输入框会被默认的 60% 宽度拉到七八百像素。

---

### BaseDetailDialog

只读详情弹窗。固定标题「查看」、宽 50%，每行两个字段（标签 + 值），值为空显示 `--`。

```vue
<BaseDetailDialog v-model:visible="dialogViewVisible" :columns="viewColumns" :data="currentRow" />
```

| 名称 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `columns` | `ColumnOptions[]` | **必填** | 见下方警告：**不做任何过滤** |
| `data` | `AnyKey` | `{}` | 要展示的一行数据 |

`v-model:visible`（`boolean`）。没有 emits，没有可配置的标题和宽度。

⚠️ **它按传进来的 `columns` 全量渲染，`showInTable: 0` 在这里不生效。** 想让详情少显示几列（密码、驱动表单的 id 数组等），要自己传一份裁剪过的列——`apps/gcc-saber3/src/views/system/components/userColumns.ts` 就单独导出了一份「查看态列」给详情弹窗和只读表格共用。

取值优先走 `column.render`，否则走 `compMatchText`（`el-select` / `el-tree-select` / `el-cascader` / `el-radio-group` 的值会被换成标签文本）。`render` 的产物在这里同样是加粗黑字——字重由弹窗裁决，不要在 `render` 里自己加样式，那个函数还要供表格单元格用。

---

### BaseDialog

统一样式的弹窗壳。**内容自定义的弹窗一律用它，不要裸用 `el-dialog`**——自绘头部、全屏切换、禁止点遮罩/ESC 关闭都在里面。

```vue
<BaseDialog
  v-model:visible="visible"
  v-model:is-full-screen="isFullScreen"
  title="选择对象"
  width="1200px"
  append-to-body
>
  <div>...</div>
  <template #footer>
    <el-button type="primary" icon="i-ep-check" @click="onConfirm">确定</el-button>
    <el-button icon="i-ep-close" @click="visible = false">取消</el-button>
  </template>
</BaseDialog>
```

| 名称 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `title` | `string` | `''` | 标题 |
| `width` | `string` | `'60%'` | 宽度 |
| `allowFullScreen` | `boolean` | `true` | 是否显示头部的全屏切换图标 |

- `v-model:visible`、`v-model:isFullScreen`（关闭后自动复位为 `false`）。
- Emits：`onClosed`（关闭动画结束）。
- Slots：默认插槽是内容区；`tag` 在标题右侧；**`footer` 传了才渲染底部栏**。
- 内置行为：`destroy-on-close`、`draggable`、`lock-scroll`、不响应点遮罩与 ESC。其余未声明属性透传给 `el-dialog`（`append-to-body`、`@open` 等）。

> `defineEmits` 里还声明了 `onAddDialogSubmit`，但组件从不触发它，监听了也不会有回调。

---

### BaseBtn

六种预设按钮，类型、文案、图标一次配好。**表格行内操作与工具栏按钮一律用它**，保证同一个动作在所有页面长得一样。

```vue
<BaseBtn btn-type="add" @click="onAdd" />
<BaseBtn btn-type="delete" :disabled="!selectionList.length" @click="onBatchDelete" />
<BaseBtn btn-type="op-edit" @click="onEdit(row)" />
<BaseBtn btn-type="op-delete" text="移除" @click="onRemove(row)" />
```

| `btnType` | 默认文案 | 样式 | 图标 |
| --- | --- | --- | --- |
| `add` | 新增 | primary 实心 | `i-ep-plus` |
| `delete` | 删除 | danger 实心 | `i-ep-delete` |
| `op-add` | 新增 | primary 文字链接 | `i-ep-plus` |
| `op-detail` | 详情 | primary 文字链接 | `i-ep-view` |
| `op-edit` | 编辑 | primary 文字链接 | `i-ep-edit` |
| `op-delete` | 删除 | danger 文字链接 | `i-ep-delete` |

`op-` 前缀的是表格行内操作（文字链接样式），无前缀的是工具栏按钮（实心）。另有 `disabled`（默认 `false`）与 `text`（覆盖文案，图标不变）。

⚠️ **不能写 `@click.stop`。** 组件模板是 `@click="$emit('click')"`，emit 不带事件对象，而 `.stop` 编译出来的 guard 会直接 `event.stopPropagation()` → 运行时 TypeError。需要阻止冒泡就改用原生 `el-button`，或把判断挪到接收端。

---

### BaseHelpTip

带 tooltip 的提示图标，用于表单项、开关旁边的说明。

```vue
<span>父子联动 <BaseHelpTip content="开启后勾选父节点会自动勾选所有子节点" /></span>
<BaseHelpTip type="warning" placement="right" content="该操作不可撤销" />
```

| 名称 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `content` | `string` | **必填** | 提示文案 |
| `type` | `'question' \| 'info' \| 'success' \| 'warning' \| 'error'` | `'question'` | 决定图标与颜色 |
| `placement` | element-plus 的 `Placement` | `'top'` | 弹出方向 |

---

### BaseHeader

应用顶栏：logo + 主标题 + 副标题 + 可选的侧边栏折叠按钮 + 中/右插槽。**业务页用不到，只有应用底座会用**（`apps/*/src/page/index/header/index.vue`）。

```vue
<BaseHeader
  v-model:collapsed="isCollapse"
  :sub-title="appConfig.app.subTitle"
  :collapsible="appConfig.app.setting.collapse"
  nav-width="230px"
  collapsed-nav-width="64px"
  title-clickable
  @title-click="toDashboard"
>
  <template #right>
    <MenuSearch class="mr-16px" />
  </template>
</BaseHeader>
```

| 名称 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `title` | `string` | **必填** | 主标题（产品族名）。**包里不持有任何应用的名字**，由接入方传 |
| `subTitle` | `string` | **必填** | 副标题，当前模块名 |
| `collapsible` | `boolean` | `false` | 显示折叠按钮。没有侧边栏的接入方（登录端）不用开 |
| `logo` | `string` | `'/logo2.png'` | logo 图片地址 |
| `navWidth` | `string` | — | 展开态左区宽度。**传了才定宽**，值就是接入方侧边栏的展开宽度 |
| `collapsedNavWidth` | `string` | `'64px'` | 折叠态左区宽度，仅在传了 `navWidth` 时生效 |
| `titleClickable` | `boolean` | `false` | 标题区可点击（加手型并触发 `titleClick`） |

- `v-model:collapsed`（`boolean`）—— 折叠态由接入方持有，组件只负责切换。
- Emits：`titleClick`（**跳哪儿由接入方决定**，各应用的「首页」并不相同）。
- Slots：`center`、`right`（都是传了才渲染）。

⚠️ **`logo` 的默认值 `/logo2.png` 是包里唯一硬编码的应用资源路径，而多数接入方不传这个 prop。** 应用侧 grep 自己的 `src` 会判定 `logo2.png` 零引用——删掉 `public/` 下的资源前，必须先在 `packages/*` 里搜一遍 prop 默认值。已经误删过两次。

⚠️ `titleClickable` 存在的原因：`defineEmits` 声明过的事件会从 `$attrs` 里被摘掉，组件内部探测不到接入方绑没绑 `@title-click`，所以必须显式开。也不要在 `<BaseHeader @click>` 上自己绑——组件是单根节点，原生 click 会落到整条 header 上。

---

### BaseExportButton

「导出数据」按钮：二次确认 → 拉文件流 → 下载为 xls。

```vue
<BaseExportButton :export-api="exportPost" :params="query" file-name="岗位数据.xls" />
```

```ts
// 消费方自己的 api 层，用应用的 request 实例，responseType 必须是 blob
export function exportPost(params) {
  return request({ url: '/blade-system/post/export', method: 'get', params, responseType: 'blob' })
}
```

| 名称 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `exportApi` | `(params?: AnyKey) => Promise<any>` | **必填** | 由调用方注入已挂 token / 拦截器的请求，**需自行设置 `responseType: 'blob'`** |
| `fileName` | `string` | **必填** | 下载后的文件名，含扩展名 |
| `params` | `AnyKey` | — | 透传给 `exportApi` |
| `text` | `string` | `'导出数据'` | 按钮文案 |
| `disabled` | `boolean` | `false` | — |

与 `BaseImportButton.uploadApi`、`BaseTable.fetchApi` 是同一条范式：**HTTP 客户端由消费方注入，包里不碰**。

> 早先它是 `exportOption.url` + 包内裸 axios 直发，拿不到鉴权头，在任何需要登录的后端上都下载不下来——这正是它长期零消费的原因。同批把 `exportBlob` 删掉后，`shared-components` 已不再依赖 axios。

> 当前仓库里没有任何页面在用这个组件，上面的行为来自源码，未经端到端验证。

---

### BaseImportButton

「导入」按钮 + 拖拽上传弹窗，带扩展名与大小校验、二次确认。

```vue
<BaseImportButton
  :upload-api="importUser"
  :allowed-extensions="['.xls', '.xlsx']"
  text="导入用户"
  @on-success="tableRef?.refreshTable()"
/>
```

| 名称 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `uploadApi` | `(formData: FormData) => Promise<any>` | **必填** | **由调用方注入**已挂 token / 拦截器的请求函数；组件只负责组装 `FormData`（字段名 `file`） |
| `text` | `string` | `'导入'` | 按钮文案，同时是弹窗标题 |
| `allowedExtensions` | `string[]` | `['.xls']` | 允许的扩展名，同时用于生成提示语和 `accept` |

- Emits：`onSuccess`（导入成功后，通常在这里刷新表格）。
- 文件大小上限 **10MB，硬编码**，不可配置。
- 响应契约：成功判据是 `res.data.success` 为真，失败时读 `res.data.msg` 作为提示。

> 同样没有页面消费，行为出自源码与单测（`utils/fileValidation.test.ts`），未经端到端验证。

---

### BaseMenu / BaseMenuLayout

`BaseMenu` 是路由驱动的两级菜单：以 `route.path` 作为选中项，点击 `router.push`，路由变化时自动展开对应父菜单（`unique-opened`，同时只展开一个）。

`BaseMenuLayout` 是「左菜单 + 右内容」的可拖拽分栏布局，左栏宽度取常量 `BASE_MENU_WIDTH`（200）。

```vue
<BaseMenuLayout :menus="menus" resizable>
  <router-view />
</BaseMenuLayout>
```

```ts
import type { MenuItem } from '@huberyyang/shared-components'

const menus: MenuItem[] = [
  { id: 'base', title: '基本信息', icon: 'i-ep-document', path: '/model/base' },
  {
    id: 'flow',
    title: '流程配置',
    icon: 'i-ep-share',
    children: [{ id: 'flow-design', title: '流程设计', icon: 'i-ep-set-up', path: '/model/flow' }],
  },
]
```

| 组件 | Props | 说明 |
| --- | --- | --- |
| `BaseMenu` | `menus: MenuItem[]` | 只有这一个 prop，无 emits、无插槽 |
| `BaseMenuLayout` | `menus: MenuItem[]`、`resizable?: boolean`（默认 `false`） | 默认插槽是右侧主区 |

`MenuItem`：`{ title, icon, id, path?, children? }`。`icon` 可以是组件也可以是图标类名字符串；叶子节点的 `index` 取 `path ?? id`，**没有 `path` 的叶子点了不会跳转**。

> 两个组件当前都没有消费方。

---

### PasswordStrength

四段式密码强度条，`score` 为 `0` 时整体不渲染。

```vue
<PasswordStrength :score="strength" class="mt-4px w-100%" />
```

| 名称 | 类型 | 说明 |
| --- | --- | --- |
| `score` | `number` | **必填**。`0` 隐藏；`1` 弱（红）/ `2` 一般（橙）/ `3` 强（绿）/ `4` 非常强（深绿）。超出范围会夹到最近一档 |

组件只负责显示，**分值怎么算由页面决定**（现有三处消费方各自算：`user.vue`、两个应用的 `password-dialog.vue`）。

---

### TransitionRouterView

给路由出口套一层 120ms 淡入淡出（`mode="out-in"` + `appear`）。无 props、无 emits，只有默认插槽。

```vue
<TransitionRouterView>
  <component :is="Component" :key="route.path" />
</TransitionRouterView>
```

> 当前没有消费方——两个带主布局的应用用的是各自底座里的过渡实现。

## Composables

### useEditListPageRender

把「增删改查列表页」的一整套状态和操作打包成一个 hook：弹窗开关、当前行、操作类型、删除确认与批量删除。

```ts
import { useEditListPageRender } from '@huberyyang/shared-components'
import { remove } from '~/api/system/post'

const {
  tableRef, loading, operationType,
  dialogViewVisible, dialogAddEditVisible, addEditForm, currentRow, selectedData,
  onView, onAdd, onEdit, onDelete, onBatchDelete,
} = useEditListPageRender({ deleteApi: remove })
```

| 入参 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `deleteApi` | `(params: AnyKey) => Promise<any>` | **必填** | 删除接口 |
| `deleteApiType` | `1 \| 2` | `1` | `1` 传 `{ ids }`，`2` 传数组 `[id]` |

返回：`dialogViewVisible` / `dialogAddEditVisible` / `addEditForm` / `currentRow` / `tableRef` / `operationType` / `loading` / `selectedData` / `onView` / `onAdd` / `onEdit` / `onDelete` / `onBatchDelete`。

**它不是必经之路**，用之前先看这几条硬编码能不能接受：

- 主键固定叫 `id`，成功码固定 `200`；
- 删除成功后调的是 `reloadList()`（**会重置分页与搜索条件**），不是 `refreshTable()`；
- `selectedData` 是 `computed(() => tableRef.value?.getRowSelection())`——命令式读取套 computed，**没有可追踪的响应式依赖**，只在父组件恰好频繁重渲染时才像是能用的。可靠写法仍然是给 `BaseTable` 绑 `@selection-change` 自持。

需要区分行内删除与批量删除的刷新方式、或者主键不叫 `id` 的页面，直接手写更清楚——[完整示例](#完整示例一个标准列表页)里那份就是手写的。

> 当前仓库里所有列表页都是手写的，这个 hook 没有消费方。

### useRefresh

强制重挂子树的最小工具：把 `refreshKey` 绑到 `:key` 上，调 `refresh()` 就重建。

```ts
const { refreshKey, refresh } = useRefresh()
```

`BaseTable`（重建表格清懒加载缓存）和 `BaseSearchBox`（重置后重建控件）内部都在用。

## 工具函数

### withConfirm

统一的二次确认弹窗，本仓库**所有删除 / 导出 / 危险操作都走它**，不要自己拼 `ElMessageBox.confirm`。

```ts
withConfirm({
  label: '删除当前数据', // 拼成「是否确认删除当前数据？」
  onConfirm: async () => {
    const res = await remove(row.id)
    if (res?.data?.code === 200) {
      ElMessage.success('操作成功!')
      tableRef.value?.refreshTable()
    }
  },
})
```

| 选项 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `onConfirm` | `() => void` | **必填** | 点确认后执行 |
| `label` | `string` | `''` | 动作描述，拼成「是否确认{label}？」 |
| `message` | `string` | `''` | 完整提示语，给了就不再套上面那个句式 |
| `title` | `string` | `'提示'` | 弹窗标题 |
| `type` | element-plus 的 `MessageType` | `'warning'` | 图标类型 |
| `onCancel` / `onCatch` / `onFinally` | `() => void` | — | 点取消 / 关闭走 `onCancel` + `onCatch`，`onFinally` 总会执行 |

⚠️ **`onConfirm` 是 async 函数时，弹窗不会等它跑完。** 组件内部是同步调用 `onConfirm()`，确认按钮的 loading 和弹窗关闭在同一轮就结束了，异步请求在后台继续。所以成功提示要写在 `onConfirm` 内部（现有页面都是这么做的），别指望「弹窗关掉 = 请求完成」。

### compMatchText

按列配置把原始值换成展示文本，`BaseTable` 的单元格和 `BaseDetailDialog` 都在用它。

```ts
compMatchText(row, column) // => string
```

匹配规则按 `renderOptions.type` 分支：`el-select` 用 `renderOptions.options`；`el-tree-select` 用 `renderOptions.props.data` 做树形递归匹配；`el-cascader`（`needMatch !== 0`）与 `el-radio-group` 用 `props.options || options`。键名由 `renderOptions.props.props` 决定，缺省 `{ label, value, children }`。其它类型原样返回，数字 `-1` 视为空。

⚠️ **不支持数组值**，多选字段没法既当选择器又当文本列——用户管理页的做法是拆成两列（`roleId` 驱动表单、`roleName` 只显示）。

### buildFormRules

由 `columns` 生成 el-form 的校验规则，只处理 `validate: 1` 的列。`BaseAddEditDialog` 内部已经调了，**页面通常不用直接调**。

```ts
const rules = buildFormRules(columns)
```

⚠️ **必填校验不要自己写 `required: true` 了事。** async-validator 在 `rule.type` 缺省时会回落成 `'string'` 并断言类型，number 值的必填字段（单选的 1/2、`el-input-number` 的排序值）永远校验不过，而且报错被替换成「请输入 XXX」，看不出真因。这个函数给的是显式 `validator`，自己定义「空」、完全不做类型断言。列上写了 `renderOptions.rule.validator` 时以你的为准。

⚠️ `validate: 0`（默认）的列会被**整条过滤掉**，挂在上面的自定义 `validator` 根本不会执行。

### 选项与控件

| 函数 | 签名 | 说明 |
| --- | --- | --- |
| `matchOptionLabel` | `(options, key, props?) => string` | 在选项树里递归找 `value === key` 的 `label`，找不到返回 `''` |
| `handleOptionDisabled` | `(data, id) => void` | 递归禁用 `id` 命中的节点及其子树（**就地修改**）。常用于「上级节点不能选自己」 |
| `setOptionDisabled` | `(data, isDisabled) => void` | 递归批量设置/重置 `disabled`（**就地修改**） |
| `getControlProps` | `(type, options) => AnyKey` | 按控件类型裁剪要下发的属性：只有选择类拿到 `options`，只有带下拉面板的拿到 `filterable` / `fit-input-width` |

⚠️ 两个 `*OptionDisabled` 递归靠的是 `item.hasChildren`（不是 `children`），数据源没有这个字段就只会处理第一层。

### 下载

| 函数 | 签名 | 说明 |
| --- | --- | --- |
| `downloadFile` | `(blob, filename, mimeType?) => void` | 通用下载，默认 `application/octet-stream` |
| `downloadXls` | `(blob, filename) => void` | 下载为 Excel |
| `downloadJson` | `(blob, filename) => void` | 下载为 JSON |

拿到的 blob 来自哪里不重要——**用应用自己的请求实例取流，再交给 `downloadFile` 系列**。包里不再提供任何发请求的工具（`exportBlob` 那个裸 axios 实现已删除）。

### validateImportFile

纯函数，校验待上传文件的扩展名与大小，不依赖浏览器环境。

```ts
const result = validateImportFile(file, { allowedExtensions: ['.xls'], maxSize: 10 * 1024 * 1024 })
if (!result.valid)
  ElMessage.error(result.message)
```

返回 `{ valid: true }` 或 `{ valid: false, message: string }`。`BaseImportButton` 内部就是用它 + `ElMessage` 组合出来的。

## 配置常量

从 `config/` 导出，主要给组件内部用；页面偶尔会拿日期格式那几个。

| 常量 | 值 / 说明 |
| --- | --- |
| `BASE_TABLE_PROPS` | el-table 的公共属性：带边框、表头灰底 `#fafafa`、`show-overflow-tooltip` |
| `BASE_PAGINATION_PROPS` | 分页公共属性：`page-sizes: [20, 50, 100]`、`layout: 'total, prev, pager, next, sizes'` |
| `default_pagination` | `{ current: 1, size: 20 }` |
| `default_no_pagination` | `{ current: 1, size: 500 }`——`have-pagination=false` 时用的 |
| `default_option_prop` | `{ value: 'value', label: 'label', children: 'children' }` |
| `default_date_format` | `'YYYY-MM-DD HH:mm:ss'` |
| `default_time_format` | `'YYYY-MM-DD 00:00:00'` |
| `default_date_format2` | `'YYYY-MM-DD'` |
| `export_date_format` | `'YYYYMMDDHHmm'`——导出文件名用 |
| `default_dialog_table_style` | `{ maxHeight: '550px', overflowY: 'scroll' }` |
| `BASE_MENU_WIDTH` | `200`，`BaseMenuLayout` 的左栏宽度 |

## 类型

全部从包根导出，用 `import type { ... } from '@huberyyang/shared-components'`。

| 类型 | 用途 |
| --- | --- |
| `ColumnOptions` | **最常用**。列配置，见[核心心智](#核心心智一份-columns-驱动四处渲染) |
| `ColumnRenderOptions` | `ColumnOptions.renderOptions` 的形状 |
| `Options` | 选项项：`{ label, value, children?, key?, color? }` |
| `Pagination` | `{ current, size }`——请求侧分页 |
| `Page` | `{ pageSize, currentPage, total }`——展示侧分页，本包内无人使用 |
| `TableExpose` | `BaseTable` 暴露的方法集，给 `ref` 标类型用 |
| `AddEditDialogExpose` | `{ refMap: Map<string, VNodeRef> }` |
| `MenuItem` / `BaseMenuProps` / `BaseMenuLayoutProps` | 菜单相关 |
| `FileValidationConfig` / `ValidatableFile` / `FileValidationResult` | `validateImportFile` 的入参与返回 |

`AnyKey` 是全局 ambient 类型（声明在 `shared-utils`），不需要 import。

## 约定与边界

**不构建、不发布。** 没有 `build` 脚本、没有 `dist`，`main` / `types` 直接指向 `src/index.ts`。代价是这个包**只能被 Vite 消费**（barrel 里含 `.vue` SFC），也不可独立发布。

**所有自定义类名统一带 `sc-` 前缀**，且有测试（`styles/classPrefix.test.ts`）守着：不残留旧仓库前缀、模板用到的类名都有定义（全局样式或组件自己的 style 块）、全局样式里定义的类名都被用到（无死样式）。改类名时跑一次单测就知道有没有漏。

⚠️ **`styles/common.scss` 里那几个全局类是本包的公开 API**——消费方会直接选中它们（各应用 `src/styles/element-ui.scss` 给表格卡片借边框的那几条就是）。而上面那条测试只扫本包以内，**改前缀时必须同时 grep 整个仓库**。

```bash
# 单测。⚠️ 必须在仓库根跑：vitest 配置在根目录，它的 include 是 `{apps,packages}/*/src/**/*.test.ts`
# 这条跨包 glob，在包目录里跑 `pnpm --filter ... exec vitest run` 会「No test files found」
pnpm exec vitest run packages/shared-components

pnpm --filter @huberyyang/shared-components lint       # 代码风格
pnpm --filter @huberyyang/shared-components typecheck  # vue-tsc --noEmit
```

**测试覆盖分两类，知道哪里有网、哪里没有**：

| 类型 | 覆盖到什么 |
| --- | --- |
| 纯函数 | `validate` / `formRules` / `response` / `fileValidation` / `componentApi` |
| 源码扫描（守形态不变量） | `classPrefix` / `selectorScope` / `detailText` / `titleClick` / `resetTransition` |
| **渲染测试**（真挂载组件） | **只有 `BaseTable`**：取数与分页、选中态清零契约 |

⚠️ **`BaseAddEditDialog` / `BaseSearchBox` / 其余组件是零渲染覆盖**，这是已知且接受的状态
（`20260911b` 拍板：用到有问题再补）。改它们时静态检查全绿**不代表行为没坏**，
要在真实页面上点一遍。

⚠️ 写新的渲染测试前，先读同目录 `CLAUDE.md` 的「组件渲染测试：两条环境契约」——
element-plus 必须被 vitest inline 编译，否则连 `el-button` 都挂不上，而报错完全看不出真因。

**当前没有消费方的能力**（可以用，但仓库里没有活的参照，接入时请自行验证）：

> ⚠️ **这张表不是删除清单。** 「没有消费方」指的是**上游这一个仓库**里没有活参照，而本包是
> 面向多个 monorepo 分发的——别的项目正在用、或即将用其中的能力。**判断一个导出该不该留，
> 不能只看上游有没有人用**，删掉会让下一个同步共享库的项目直接报错。
> 真要删，先确认所有已接入的项目都不用它。

| 能力 | 状态 |
| --- | --- |
| `BaseExportButton` / `BaseImportButton` | 无消费方，行为仅有单测覆盖、未经端到端验证 |
| `BaseMenu` / `BaseMenuLayout` / `TransitionRouterView` | 无消费方 |
| `useEditListPageRender` | 无消费方，列表页都是手写的 |
| `BaseTable` 的 `sortable` 排序链路 | 事件已透传，但没有页面开过排序 |
| `./styles/*` 子路径导出 | 无消费方，样式都是随组件带进去的 |
| `rowKey` prop | 见 [BaseTable](#basetable)：传了不生效 |

**要改这个包的时候**，先读同目录的 `CLAUDE.md`——那里记着样式契约（表格卡片的边框由谁画、搜索区那五处 20px 留白靠哪四条规则维持）、几次返工的根因，以及「成例先在本仓库找，zd-workspace 那份要用户点头才去翻、且绝不回改」这条纪律。本文档不重复那些内容。
