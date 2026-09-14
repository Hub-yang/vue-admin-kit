# vue-admin-kit

面向「Vue 3 + Element Plus 管理后台」的三个共享包，**按源码消费、拷贝接入**。

```
packages/
├── shared-components/   组件库（Base* 系列 + composables / config / utils）
├── shared-utils/        纯工具函数
└── shared-unocss/       UnoCSS 预设（baseUnoConfig + createUnoConfig）
```

核心是一条约定：**一份 `columns` 配置同时驱动搜索区、表格、新增/编辑表单、详情弹窗四处渲染**，
页面只写数据来源和业务动作。完整用法见 [`packages/shared-components/README.md`](packages/shared-components/README.md)。

## 这个仓库是什么，不是什么

**是**：三个包的源码快照，供各 monorepo 拷进自己的 `packages/` 使用。

**不是**：可独立运行或发布的 npm 包。仓库里没有 `pnpm-workspace.yaml`、没有 eslint 配置、
装不了依赖也跑不了测试（根目录那份 `tsconfig.base.json` 是给接入方拷的，不服务本仓库）
——**这是刻意的**，见下面「为什么不发 npm」。

**开发地不在这里。** 这三个包在上游的业务 monorepo 里开发和验证（那里有真实页面和三个消费方），
到节点单向推送过来打 tag。**请不要直接在本仓库改代码**：改了也不会回流，下一次同步会被整目录覆盖。
发现问题请提 issue，或直接告诉上游维护者。

## 接入步骤

### 1. 拷贝

把 `packages/` 下**三个目录整组**拷进你的 monorepo 的 `packages/`。

⚠️ **三个必须一起拷，且目录名不能改。** `shared-components/src/types/global.d.ts` 里有一句
用相对路径 reference `shared-utils` ambient 声明的 triple-slash：

```ts
/// <reference path="../../../shared-utils/src/types/index.d.ts" />
```

ambient 声明不随 package 依赖关系传播，只在 `package.json` 里声明依赖是不够的，必须显式 reference
才会进入本包的 `vue-tsc` 编译范围。所以目录层级是硬契约——少一个包或改了目录名，
`typecheck` 会报 `File not found`（是响亮失败，不会静默）。

### 2. 放好 `tsconfig.base.json`

三个包的 `tsconfig.json` 都写着 `"extends": "../../tsconfig.base.json"`，指向**你的仓库根目录**。
本仓库根的同名文件就是上游那一份，一并拷到你的仓库根即可。

已经有同名文件的，核对这几个选项——包里的代码是按它们写的，关掉任意一个都会报类型错误：

| 选项 | 为什么必须 |
|---|---|
| `"strict": true` | 全部代码按严格模式写 |
| `"noUncheckedIndexedAccess": true` | 索引访问按可能为 undefined 处理（`PasswordStrength` 里的 `segments[idx]!` 就是为它写的） |
| `"moduleResolution": "bundler"` | 解析 `package.json` 的 `exports` 字段 |
| `"jsx": "preserve"` + `jsxImportSource: "vue"` | Vue SFC 与 tsx |
| `"types": ["vite/client"]` | `shared-components` 还要加 `"node"`（它有用 `node:fs` 扫源码的测试） |

### 3. 合并 catalog 条目

三个包的依赖都写成 `catalog:` 协议，版本由**你的**仓库决定。
把 [`catalog.snippet.yaml`](catalog.snippet.yaml) 里的条目合并进你的 `pnpm-workspace.yaml`，
否则 `pnpm install` 会报 `Cannot resolve catalog protocol` 直接失败。

### 4. 在消费方声明依赖

```jsonc
{
  "dependencies": {
    "@huberyyang/shared-components": "workspace:*",
    "@huberyyang/shared-utils": "workspace:*",
    "@huberyyang/shared-unocss": "workspace:*"
  }
}
```

⚠️ **用到什么就声明什么，别指望 hoisting。** 如果你的仓库用 `node-linker=hoisted`，
没声明的依赖也能 import 成功、本地不报错，但迁出那个包时立刻崩。

### 5. 让你的应用拿到全局类型 `AnyKey`

包的公开类型里用到了全局类型 `AnyKey`（就是 `Record<string, any>`），它声明在
`shared-utils/src/types/index.d.ts` 的 `declare global` 里。**ambient 声明不随依赖关系传播**，
所以每个消费方应用都要自己 reference 一次，否则会撞上一屏 `Cannot find name 'AnyKey'`：

```ts
// apps/<你的应用>/src/types/global.d.ts
/// <reference path="../../../../packages/shared-utils/src/types/index.d.ts" />
```

路径按你的目录深度调整（上例是 `apps/<应用>/src/types/` 这一层）。

### 6. 接上 UnoCSS 预设

```ts
// uno.config.ts
import { createUnoConfig } from '@huberyyang/shared-unocss'

export default createUnoConfig({
  // 你自己的 shortcuts / theme，会与基础配置合并（数组字段是拼接不是覆盖）
})
```

### 7. 确认三个运行前提

这三条都**不会报错**，只会让东西悄悄不对：

| 前提 | 不满足时的表现 |
|---|---|
| 消费方装了 `unplugin-vue-components` + `ElementPlusResolver` | 组件模板里的 `<el-table>` 等全部未注册 |
| `@iconify-json/ep` 装得上 | 所有 `i-ep-*` 图标静默消失 |
| 包**放在 `packages/` 下、不在 `node_modules` 里** | 同第一条，见下 |

第三条需要解释：`unplugin-vue-components` 默认 `exclude: node_modules`。这三个包的组件模板里
直接写 `<el-table>` 而不 import，靠的正是消费方那个插件去解析——一旦包被装进 `node_modules`
（而不是作为 workspace 源码待在 `packages/` 下），插件不处理它，所有 Element Plus 组件都会变成未注册。
**这也正是本项目不发 npm 的原因。**

## 为什么不发 npm

发布成 npm 包要么在包里逐个显式 import Element Plus 组件（同时改掉样式引入方式，改动面很大），
要么让每个消费方去配 `Components({ include })`——两条路都是把接入成本从「拷个目录」推高到
「读懂内部机制」。而这套包的使用场景是**内网、离线、多个已存在的 monorepo 按需取用**，
拷贝反而是最直接的分发方式。

代价是版本管理靠 git tag 而不是 semver，升级靠重新拷贝而不是 `pnpm up`。这是有意的取舍。

⚠️ **包内 `package.json` 的 `version` 字段不维护**（三个都停在 `1.0.0`），它对 `workspace:*` 依赖
没有任何作用。**唯一的版本标识是本仓库的 git tag**，破坏性变更会升 major——查你拷的是哪一版，
看 tag，不要看 `package.json`。

⚠️ **删导出是破坏性变更，门槛很高。** 本仓库服务多个互不知情的 monorepo，某个能力在上游那个
业务仓库里没人用，**不代表别处没人用**——已经因为这个判据误删过一次（v2.0.0，8 分钟后撤回并
删除了那个 tag）。要删，先确认所有已接入的项目都不用它。

## 质量保证在哪

本仓库不跑任何检查。三个包的 `lint` / `typecheck` / 单测都在上游业务仓库里执行，
**同步过来的每一份都是那边全绿的状态**。包内测试主要覆盖纯函数与「用测试守约定」的源码扫描
（类名前缀一致性、模板结构不变量），组件渲染测试目前没有——这是已知缺口，
所以升级后请在自己的页面上实际点一遍。

## 约定速查

- **类名前缀统一 `sc-`**。`styles/common.scss` 里那几个全局类（`sc-base_table_con` /
  `sc-search_box` / `sc-custom_dialog_box` / `sc-custom_drawer_box` / `sc-main_form_grid`）
  是**公开 API**，消费方会直接选中它们做样式微调
- **后端响应契约只在 `config/response.ts` 里展开**。本套包假定 BladeX/Saber 形状
  （`res.data` 里套 `{ code, success, msg, data }`，列表是 `{ records, total }`）。
  换后端改那一个文件，不要去组件里就地改
- **HTTP 客户端由消费方注入**。`BaseTable.fetchApi` / `BaseImportButton.uploadApi` /
  `BaseExportButton.exportApi` 都是同一条范式，包里不依赖 axios
- **包里不持有任何项目身份**。应用名、品牌色都由接入方给（`BaseHeader` 的 `title` prop、
  `--primary` CSS 变量）

## License

MIT
