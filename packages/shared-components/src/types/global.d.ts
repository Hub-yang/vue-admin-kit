// AnyKey 等全局类型的唯一声明处是 shared-utils，
// 这里只做引用，不重复 declare global——ambient 声明不会随依赖关系自动传播，
// 必须显式 reference 才能进入本包的编译范围。
/// <reference path="../../../shared-utils/src/types/index.d.ts" />
