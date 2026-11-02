// @vitest-environment happy-dom

import type { VueWrapper } from '@vue/test-utils'
import type { Ref } from 'vue'
import { mount } from '@vue/test-utils'
import ElementPlus from 'element-plus'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, ref } from 'vue'
import BaseDialog from './index.vue'

const wrappers: VueWrapper[] = []

afterEach(() => {
  for (const wrapper of wrappers.splice(0))
    wrapper.unmount()
})

function mountDialog(options: {
  header?: boolean
  allowFullScreen?: boolean
  beforeClose?: (done: () => void) => void
} = {}): { wrapper: VueWrapper, visible: Ref<boolean>, isFullScreen: Ref<boolean>, onClosed: ReturnType<typeof vi.fn> } {
  const visible = ref(true)
  const isFullScreen = ref(false)
  const onClosed = vi.fn()
  const wrapper = mount(defineComponent({
    setup() {
      return () => h(BaseDialog, {
        'title': '默认标题',
        'visible': visible.value,
        'isFullScreen': isFullScreen.value,
        'onUpdate:visible': (value: boolean) => { visible.value = value },
        'onUpdate:isFullScreen': (value: boolean) => { isFullScreen.value = value },
        'allowFullScreen': options.allowFullScreen ?? true,
        'beforeClose': options.beforeClose,
        'onOnClosed': onClosed,
      }, {
        default: () => h('p', { 'data-test': 'content' }, '处置内容'),
        tag: () => h('span', { 'data-test': 'tag' }, '默认标签'),
        footer: () => h('button', { 'data-test': 'footer' }, '确定'),
        ...(options.header ? { header: () => h('strong', { 'data-test': 'header' }, '自定义步骤') } : {}),
      })
    },
  }), {
    attachTo: document.body,
    global: { plugins: [ElementPlus], stubs: { transition: false } },
  })
  wrappers.push(wrapper)
  return { wrapper, visible, isFullScreen, onClosed }
}

describe('baseDialog 头部插槽', () => {
  it('未传 header 时保留默认标题与 tag', async () => {
    const { wrapper } = mountDialog()
    await vi.waitFor(() => expect(wrapper.find('.el-dialog').exists()).toBe(true))

    expect(wrapper.get('.title_con').text()).toBe('默认标题默认标签')
    expect(wrapper.find('[data-test="header"]').exists()).toBe(false)
    expect(wrapper.get('[data-test="content"]').text()).toBe('处置内容')
    expect(wrapper.get('[data-test="footer"]').text()).toBe('确定')
  })

  it('header 替换默认标题与 tag，保留内容、底部及右侧操作', async () => {
    const { wrapper } = mountDialog({ header: true })
    await vi.waitFor(() => expect(wrapper.find('.el-dialog').exists()).toBe(true))

    expect(wrapper.get('.custom_dialog_header [data-test="header"]').text()).toBe('自定义步骤')
    expect(wrapper.find('.title_con').exists()).toBe(false)
    expect(wrapper.find('[data-test="tag"]').exists()).toBe(false)
    expect(wrapper.get('[data-test="content"]').text()).toBe('处置内容')
    expect(wrapper.get('[data-test="footer"]').text()).toBe('确定')
    expect(wrapper.find('.custom_dialog_actions .custom_dialog_fullscreen_icon').exists()).toBe(true)
    expect(wrapper.find('.custom_dialog_actions .custom_dialog_close_icon').exists()).toBe(true)
  })

  it.each([false, true])('header=%s 时全屏切换、关闭复位和重新打开仍有效', async (header) => {
    const { wrapper, visible, isFullScreen, onClosed } = mountDialog({ header })
    await vi.waitFor(() => expect(wrapper.find('.el-dialog').exists()).toBe(true))

    await wrapper.get('.custom_dialog_fullscreen_icon').trigger('click')
    expect(isFullScreen.value).toBe(true)
    expect(wrapper.get('.el-dialog').classes()).toContain('is-fullscreen')
    await wrapper.get('.custom_dialog_fullscreen_icon').trigger('click')
    expect(isFullScreen.value).toBe(false)
    await wrapper.get('.custom_dialog_fullscreen_icon').trigger('click')
    await wrapper.get('.custom_dialog_close_icon').trigger('click')

    await vi.waitFor(() => expect(visible.value).toBe(false))
    await vi.waitFor(() => expect(onClosed).toHaveBeenCalledTimes(1))
    expect(isFullScreen.value).toBe(false)
    expect(wrapper.find('[data-test="content"]').exists()).toBe(false)

    visible.value = true
    await vi.waitFor(() => expect(wrapper.find('[data-test="content"]').exists()).toBe(true))
    expect(wrapper.get('.el-dialog').classes()).not.toContain('is-fullscreen')
    expect(wrapper.find('[data-test="header"]').exists()).toBe(header)
  })

  it.each([false, true])('header=%s 时关闭仍经过 before-close', async (header) => {
    let allowClose: (() => void) | undefined
    const beforeClose = vi.fn((done: () => void) => {
      allowClose = done
    })
    const { wrapper, visible, onClosed } = mountDialog({ header, beforeClose })
    await vi.waitFor(() => expect(wrapper.find('.el-dialog').exists()).toBe(true))

    await wrapper.get('.custom_dialog_close_icon').trigger('click')
    expect(beforeClose).toHaveBeenCalledTimes(1)
    expect(visible.value).toBe(true)
    expect(onClosed).not.toHaveBeenCalled()
    expect(wrapper.find('[data-test="content"]').exists()).toBe(true)

    expect(allowClose).toBeTypeOf('function')
    allowClose!()
    await vi.waitFor(() => expect(visible.value).toBe(false))
    await vi.waitFor(() => expect(onClosed).toHaveBeenCalledTimes(1))
  })

  it('自定义 header 下仍可禁用全屏，关闭按钮保留', async () => {
    const { wrapper } = mountDialog({ header: true, allowFullScreen: false })
    await vi.waitFor(() => expect(wrapper.find('.el-dialog').exists()).toBe(true))

    expect(wrapper.find('.custom_dialog_fullscreen_icon').exists()).toBe(false)
    expect(wrapper.find('.custom_dialog_close_icon').exists()).toBe(true)
  })
})
