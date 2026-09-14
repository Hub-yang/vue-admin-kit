import type { Component } from 'vue'

export interface MenuItem {
  title: string
  icon: Component | string
  id: string
  path?: string
  children?: MenuItem[]
}

export interface BaseMenuProps {
  menus: MenuItem[]
}

export { default as BaseMenu } from './index.vue'
