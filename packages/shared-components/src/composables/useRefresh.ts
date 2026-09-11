import type { Ref } from 'vue'
import { ref } from 'vue'

export function useRefresh(): { refreshKey: Ref<number>, refresh: () => void } {
  const refreshKey = ref<number>(0)

  function refresh(): void {
    refreshKey.value += 1
  }

  return {
    refreshKey,
    refresh,
  }
}
