# CLAUDE.md — packages/shared-utils

根目录 `CLAUDE.md` 是全仓库通用规则，这里只放本模块专属的东西。

## `src/utils/` 四个文件的边界

（本包目前只有 `src/utils/` 一个导出目录，由 `src/index.ts` 整体 re-export。`src/config/` 还在，但**已被刻意清空**：它原先放 `rootConfig.title`，那是项目身份不是共享能力，随共享包抽离一并移交给各应用自己的配置入口。别再往这里放应用名、品牌色这类东西。）

- **`common.ts`**：通用杂项，目前只剩 `isNonEmptyArray`。
- **`func.ts`**：一个名为 `func` 的静态方法类（`isEmpty` / `join` / `split` / `toStr` / `truncateString`）。名字容易被当成"函数式工具集"，实际是历史遗留的 Java 风格工具类，和文件名的直觉对不上——新增工具函数时，先确认它该落在这里还是 `common.ts`，不要单纯因为"看起来像通用函数"就塞进 `func`。
- **`util.ts`**：偏业务通用的逻辑——目前只剩 `serialize`（表单序列化）。和 `common.ts` 的区别是这里的函数隐含了对某种业务数据结构或运行环境的假设，不是纯粹的语言层工具。（`getScreen`（窄屏折叠反转）随条目 20260904n 删除响应式一并移除。）
- **`validate.ts`**：校验规则，目前是 `isURL` / `validateNull` / `validatePassword` / `validateEmail` / `validateMobile` / `validateIdCard`，有测试 `validate.test.ts`。

  后三个是 element-plus `FormItemRule.validator` 形态 `(rule, value, cb) => void`，**空值分支由 `rule.required` 决定**：必填时回调「请输入 X」，选填时放行。这不是随便定的——`shared-components` 的 `buildFormRules` 在列配置带 `validator` 时会用它顶掉默认的必填规则，格式校验器不自己处理空值的话，必填就没人管了。消费方（`gcc-saber3` 用户管理页）因此把「选填但要校验格式」的列写成 `validate: 1` + `rule: { required: false, validator }`。

## 本包只保留有真实消费方的导出

本包曾积压过一大批零消费导出（`setTitle` / `getUUID` / `sleep` / `findParent` / `diff` 与十余个
`validate*`），连同它们各自拖着的依赖一起清掉过一轮。

**这条纪律要维持住**：本包是「按源码消费、不构建」的共享层，加一个没人用的导出，成本不只是这几行代码——它会进内网离线包、进每个消费方的构建图，还会让下一个人以为"这里已经有现成能力了"。**新增导出时必须同时有消费方**，不要为"将来可能会用"预留。

⚠️ **重新引入校验函数时，不要照抄 BladeX 那套反语义。** 被清掉的 `cardid()` / `isvalidatemobile()`
返回 `[是否有错误, 消息]`（合法值返回 `[false, '']`），`validatenum()` 合法字符串返回 `false`——
名字与语义相反，曾是本包最容易踩的坑。**新写一律「合法返回 true」。**

当前 9 个导出与它们的消费方：

| 导出 | 消费方 |
|---|---|
| `isNonEmptyArray` | shared-components |
| `func` | gcc-saber3（6 处） |
| `serialize` | gcc-saber3 |
| `isURL` / `validateNull` / `validatePassword` | gcc-saber3 |
| `validateEmail` / `validateMobile` / `validateIdCard` | gcc-saber3（用户管理页；后续用户组 / 部门页复用） |

## AnyKey 的唯一权威来源

`src/types/index.d.ts` 用 `declare global` 收敛声明了 `AnyKey`，是**全仓库唯一权威来源**。其他包/应用需要用时，用 triple-slash reference 显式引入（`shared-components` 已经这么做），不要重新 `declare global` 一份——历史上 `apps/gcc-login` 就本地重复声明过一份 `AnyKey`，已清理，如果又看到类似重复，说明是这个模式的复发。
