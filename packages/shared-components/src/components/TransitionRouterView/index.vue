<template>
  <transition name="sc-page-transition" mode="out-in" appear>
    <slot />
  </transition>
</template>

<style lang="scss" scoped>
.sc-page-transition-enter-active,
.sc-page-transition-leave-active {
  transition: opacity 120ms cubic-bezier(0.2, 0, 0, 1);
}

.sc-page-transition-enter-from,
.sc-page-transition-leave-to {
  opacity: 0;
}

.sc-page-transition-enter-to,
.sc-page-transition-leave-from {
  opacity: 1;
}
</style>
