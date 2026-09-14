import type { MenuItem } from '../BaseMenu'

export const BASE_MENU_WIDTH = 200

export interface BaseMenuLayoutProps {
  menus: MenuItem[]
  resizable?: boolean
}

export { default as BaseMenuLayout } from './index.vue'
