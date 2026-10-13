# CLAUDE.md — packages/shared-components

**本文件只有索引，没有规则正文。** 正文在 `.docs/modules/shared-components/`。
**动本包之前先读 [`.docs/architecture/shared-packages.md`](../../.docs/architecture/shared-packages.md) 的三条纪律**——
它管的是"能不能改、能不能删"，下面这张表管的是"怎么改"。

| 要做的事 | 读 | 不读的后果 |
|---|---|---|
| 给 `BaseTable` / 表单校验加功能 | [`.docs/modules/shared-components/api-design.md`](../../.docs/modules/shared-components/api-design.md) | 没看出这套是围绕「CRUD 管理后台列表页」设计的，加出一个与既有取向打架的 API；撞上 `BaseBtn`、搜索框、`BaseSearchBox` 的 `:key` 那几个反直觉行为 |
| 在新项目 / 新应用里接入本包 | [`.docs/modules/shared-components/consuming.md`](../../.docs/modules/shared-components/consuming.md) | 按钮 `icon` 传的是组件名不是类名，接入方没注册 `i-ep-*` 别名，图标全部不显示 |
| 写 / 改本包的测试 | [`.docs/modules/shared-components/testing.md`](../../.docs/modules/shared-components/testing.md) | 违反两条环境契约，测试跑得过但测的不是真实渲染 |
| 碰后端响应解构、改类名前缀 | [`.docs/modules/shared-components/contracts.md`](../../.docs/modules/shared-components/contracts.md) | 在组件里就地写 `res.data.data.records`，换后端得靠 grep 才找得全；`sc-` 是公开 API，改它要 grep 整个仓库 |
| 动样式：变量、边框、留白 | [`.docs/modules/shared-components/styling.md`](../../.docs/modules/shared-components/styling.md) | 以为 `_variables.scss` 的 `:root` 变量全局可用（不是）；把由**消费方容器**裁决的边框画进包里；破掉 `BaseTable` 那 20px 靠四条规则合力维持的留白 |
| 改 `BaseHeader`、用到 `AnyKey` | [`.docs/modules/shared-components/components.md`](../../.docs/modules/shared-components/components.md) | `AnyKey` 的跨包引入方式写错，消费方拿不到类型 |

`README.md` 是**发布出口** [vue-admin-kit](https://github.com/Hub-yang/vue-admin-kit) 的接入文档，
随 `pnpm sync:shared` 同步出去，改接入方式时要同步那份——它不在 `.docs/` 里，是刻意的。
