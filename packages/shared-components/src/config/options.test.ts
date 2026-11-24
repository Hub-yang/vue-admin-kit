import { describe, expect, it } from 'vitest'
import { computed, reactive } from 'vue'
import { matchOptionLabel } from './options'

describe('matchOptionLabel', () => {
  it('严格匹配键，先查父节点，再查子树，最后查后续同级', () => {
    const options = [
      { value: 1, label: '父', children: [
        { value: 1, label: '同键子节点' },
        { value: '1', label: '子' },
      ] },
      { value: '1', label: '同键兄弟节点' },
    ]
    expect(matchOptionLabel(options, 1)).toBe('父')
    expect(matchOptionLabel(options, '1')).toBe('子')
    expect(matchOptionLabel(options, 2)).toBe('')
  })

  it('当前层命中空标签立即返回，子树返回空标签时继续查下一棵树', () => {
    const empty = { value: '房间', label: '' }
    const named = { value: '房间', label: '主会场' }
    expect(matchOptionLabel([empty, named], '房间')).toBe('')
    expect(matchOptionLabel([{ children: [empty, named] }, { value: '房间', label: '备用会场' }], '房间')).toBe('备用会场')
  })

  it('自定义字段用于每一层，允许冻结的选项和不完整的只读配置', () => {
    const leaf = Object.freeze({ id: 7, title: '分会场' })
    const options = [Object.freeze({ nodes: Object.freeze([leaf]) })]
    Object.freeze(options)
    expect(matchOptionLabel(options, 7, { value: 'id', label: 'title', children: 'nodes' })).toBe('分会场')

    const partial = Object.freeze({ value: 'id' })
    expect(matchOptionLabel([{ id: 7, label: '主会场' }], 7, partial)).toBe('主会场')
    expect(matchOptionLabel([{ value: 7, label: '主会场' }], 7, { value: '', label: '', children: '' })).toBe('主会场')
  })

  it('响应式字典到达以及已匹配标签原位修改后重新回显', () => {
    const options = reactive<{ value: number, label: string }[]>([])
    const label = computed(() => matchOptionLabel(options, 7))
    expect(label.value).toBe('')
    const option = reactive({ value: 7, label: '旧名' })
    options.push(option)
    expect(label.value).toBe('旧名')
    option.label = '新名'
    expect(label.value).toBe('新名')
  })

  it('递归查找时不读取未命中分支的无关属性', () => {
    let reads = 0
    const options = [{ children: [
      {
        value: 1,
        get metadata() {
          reads++
          return '附加信息'
        },
      },
      { value: 2, label: '会议室' },
    ] }]
    expect(matchOptionLabel(options, 2)).toBe('会议室')
    expect(reads).toBe(0)
  })
})
